(() => {
  'use strict';

  const webApp = window.Telegram?.WebApp;
  const endpoint = 'https://koouhdzacvupkoicepod.supabase.co/functions/v1/dino-progress';
  const initData = webApp?.initData || '';
  const userId = webApp?.initDataUnsafe?.user?.id;

  async function request(action, payload = {}) {
    if (!initData) return null;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action, ...payload })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Не удалось синхронизировать прогресс');
    return result.progress || null;
  }

  window.DinoCloud = {
    enabled: Boolean(initData && userId),
    userId,
    load: () => request('load'),
    leaderboard: () => request('leaderboard'),
    startRun: () => request('startRun'),
    finishRun: (runToken, score, earnedCoins) => request('finishRun', { runToken, score, earnedCoins }),
    purchaseSkin: skinId => request('purchaseSkin', { skinId }),
    selectSkin: skinId => request('selectSkin', { skinId }),
    save: progress => request('save', { progress })
  };
})();
