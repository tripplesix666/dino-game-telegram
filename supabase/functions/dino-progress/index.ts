import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://tripplesix666.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SKIN_PRICES: Record<string, number> = {
  classic: 0, desert: 0, ice: 0, fire: 0, jungle: 0,
  twilight: 0, gold: 0, skeleton: 0, rainbow: 0, cosmic: 0,
};
const RUN_TTL_SECONDS = 2 * 60 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function base64UrlEncode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return atob(padded);
}

async function hmacHex(value: string) {
  const secret = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!secret) throw new Error("Server is not configured");
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function createRunToken(payload: Record<string, unknown>) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return encoded + "." + await hmacHex(encoded);
}

async function readRunToken(token: unknown) {
  if (typeof token !== "string") throw new Error("Run session is missing");
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) throw new Error("Invalid run session");
  const expected = await hmacHex(encoded);
  if (!safeEqual(signature, expected)) throw new Error("Invalid run session");
  try {
    return JSON.parse(decoder.decode(Uint8Array.from(base64UrlDecode(encoded), (c) => c.charCodeAt(0))));
  } catch {
    throw new Error("Invalid run session");
  }
}

async function validateTelegram(initData: string) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) throw new Error("Server is not configured");

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value)
    .join("\n");

  const secretKeyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const secretKey = await crypto.subtle.sign("HMAC", secretKeyMaterial, encoder.encode(botToken));
  const validationKey = await crypto.subtle.importKey(
    "raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const calculatedHash = toHex(await crypto.subtle.sign("HMAC", validationKey, encoder.encode(dataCheckString)));
  if (!safeEqual(receivedHash, calculatedHash)) throw new Error("Invalid Telegram signature");

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) throw new Error("Telegram session expired");
  const user = JSON.parse(params.get("user") || "null");
  if (!user?.id) throw new Error("Telegram user is missing");
  return user;
}

function sanitizeOwned(value: unknown) {
  const source = Array.isArray(value) ? value.map((id) => id === "dino" ? "classic" : id) : [];
  const skins = source.filter((id) => typeof id === "string" && id in SKIN_PRICES);
  return [...new Set(["classic", ...skins])] as string[];
}

function progressFields() {
  return "high_score,total_coins,owned_skins,selected_skin,updated_at";
}

function maximumScoreForDuration(seconds: number) {
  const acceleration = 0.025 * 0.095;
  const thresholdSeconds = Math.log(890 / 430) / acceleration;
  const thresholdScore = (430 / 0.095) * (Math.exp(acceleration * thresholdSeconds) - 1);
  const expected = seconds <= thresholdSeconds
    ? (430 / 0.095) * (Math.exp(acceleration * seconds) - 1)
    : thresholdScore + (seconds - thresholdSeconds) * 890 * 0.025;
  return Math.floor(expected * 1.1 + 35);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { initData, action, progress, runToken, score, earnedCoins, skinId } = await req.json();
    if (typeof initData !== "string" || !initData) return json({ error: "Open the game in Telegram" }, 401);
    const user = await validateTelegram(initData);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "load") {
      const { data, error } = await supabase.from("player_progress").select(progressFields()).eq("telegram_id", user.id).maybeSingle();
      if (error) throw error;
      if (data) return json({ progress: data });
      const { data: created, error: insertError } = await supabase.from("player_progress").insert({
        telegram_id: user.id, username: user.username || null, first_name: user.first_name || null,
      }).select(progressFields()).single();
      if (insertError) throw insertError;
      return json({ progress: created });
    }

    if (action === "leaderboard") {
      await supabase.from("player_progress").update({ high_score: 0 }).gt("high_score", 50_000);
      const { data, error } = await supabase.from("player_progress")
        .select("telegram_id,username,first_name,high_score").gt("high_score", 0)
        .order("high_score", { ascending: false }).limit(50);
      if (error) throw error;
      return json({ progress: (data || []).map((player, index) => ({
        rank: index + 1,
        name: player.username ? "@" + player.username : player.first_name || "Игрок",
        highScore: player.high_score,
        isCurrent: String(player.telegram_id) === String(user.id),
      })) });
    }

    if (action === "startRun") {
      const startedAt = Date.now();
      const version = new Date(startedAt).toISOString();
      const { data, error } = await supabase.from("player_progress").upsert({
        telegram_id: user.id, updated_at: version,
        username: user.username || null, first_name: user.first_name || null,
      }, { onConflict: "telegram_id" }).select(progressFields()).single();
      if (error) throw error;
      const token = await createRunToken({ uid: String(user.id), startedAt, version, nonce: crypto.randomUUID() });
      return json({ progress: { runToken: token, ...data } });
    }

    if (action === "finishRun") {
      const session = await readRunToken(runToken);
      if (String(session.uid) !== String(user.id)) throw new Error("Run session belongs to another player");
      const duration = (Date.now() - Number(session.startedAt)) / 1000;
      if (!Number.isFinite(duration) || duration < 0 || duration > RUN_TTL_SECONDS) throw new Error("Run session expired");

      const submittedScore = Math.max(0, Math.floor(Number(score) || 0));
      const submittedCoins = Math.max(0, Math.floor(Number(earnedCoins) || 0));
      const maxScore = maximumScoreForDuration(duration);
      const maxCoins = Math.ceil(duration / 1.5) * 4 + 10;
      if (submittedScore > maxScore) throw new Error("Result rejected: impossible score");
      if (submittedCoins > maxCoins) throw new Error("Result rejected: impossible coin count");

      const { data: current, error: currentError } = await supabase.from("player_progress")
        .select(progressFields()).eq("telegram_id", user.id).single();
      if (currentError) throw currentError;
      if (current.updated_at !== session.version) throw new Error("Run result was already used or replaced");

      const owned = sanitizeOwned(current.owned_skins);
      const selected = owned.includes(current.selected_skin) ? current.selected_skin : "classic";
      const { data, error } = await supabase.from("player_progress").update({
        high_score: Math.max(current.high_score || 0, submittedScore),
        total_coins: Math.max(0, current.total_coins || 0) + submittedCoins,
        owned_skins: owned,
        selected_skin: selected,
        updated_at: new Date().toISOString(),
      }).eq("telegram_id", user.id).eq("updated_at", session.version).select(progressFields()).single();
      if (error) throw error;
      return json({ progress: data });
    }

    if (action === "purchaseSkin") {
      if (typeof skinId !== "string" || !(skinId in SKIN_PRICES) || skinId === "classic") throw new Error("Unknown skin");
      const { data: current, error: currentError } = await supabase.from("player_progress").select(progressFields()).eq("telegram_id", user.id).single();
      if (currentError) throw currentError;
      const owned = sanitizeOwned(current.owned_skins);
      if (!owned.includes(skinId)) {
        const price = SKIN_PRICES[skinId];
        if ((current.total_coins || 0) < price) throw new Error("Not enough coins");
        owned.push(skinId);
        current.total_coins -= price;
      }
      const { data, error } = await supabase.from("player_progress").update({
        total_coins: current.total_coins, owned_skins: owned, selected_skin: skinId, updated_at: new Date().toISOString(),
      }).eq("telegram_id", user.id).select(progressFields()).single();
      if (error) throw error;
      return json({ progress: data });
    }

    if (action === "selectSkin" || action === "save") {
      const requestedSkin = action === "selectSkin" ? skinId : progress?.selectedSkin;
      const { data: current, error: currentError } = await supabase.from("player_progress").select(progressFields()).eq("telegram_id", user.id).single();
      if (currentError) throw currentError;
      const owned = sanitizeOwned(current.owned_skins);
      const selected = typeof requestedSkin === "string" && owned.includes(requestedSkin) ? requestedSkin : current.selected_skin;
      const { data, error } = await supabase.from("player_progress").update({
        selected_skin: selected, owned_skins: owned, updated_at: new Date().toISOString(),
      }).eq("telegram_id", user.id).select(progressFields()).single();
      if (error) throw error;
      return json({ progress: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 401);
  }
});
