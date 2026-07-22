(() => {
  'use strict';

  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const wrap = document.querySelector('#gameWrap');
  const startScreen = document.querySelector('#startScreen');
  const overScreen = document.querySelector('#gameOverScreen');
  const startButton = document.querySelector('#startButton');
  const restartButton = document.querySelector('#restartButton');
  const menuButton = document.querySelector('#menuButton');
  const pauseButton = document.querySelector('#pauseButton');
  const pauseScreen = document.querySelector('#pauseScreen');
  const resumeButton = document.querySelector('#resumeButton');
  const pauseMenuButton = document.querySelector('#pauseMenuButton');
  const jumpButton = document.querySelector('#jumpButton');
  const duckButton = document.querySelector('#duckButton');
  const soundButton = document.querySelector('#soundButton');
  const finalScore = document.querySelector('#finalScore');
  const finalCoins = document.querySelector('#finalCoins');
  const finalHighScore = document.querySelector('#finalHighScore');
  const menuCoins = document.querySelector('#menuCoins');
  const menuHighScore = document.querySelector('#menuHighScore');
  const skinWalletCoins = document.querySelector('#skinWalletCoins');
  const skinGrid = document.querySelector('#skinGrid');
  const devDistanceButtons = document.querySelector('#devDistanceButtons');
  const devJumpControls = document.querySelector('#devJumpControls');
  const mainMenuScreen = document.querySelector('#mainMenuScreen');
  const skinsMenuScreen = document.querySelector('#skinsMenuScreen');
  const leaderboardMenuScreen = document.querySelector('#leaderboardMenuScreen');
  const settingsMenuScreen = document.querySelector('#settingsMenuScreen');
  const characterMenuButton = document.querySelector('#characterMenuButton');
  const leaderboardMenuButton = document.querySelector('#leaderboardMenuButton');
  const developerMenuButton = document.querySelector('#developerMenuButton');
  const menuSoundToggle = document.querySelector('#menuSoundToggle');
  const menuSoundLabel = document.querySelector('#menuSoundLabel');
  const leaderboardList = document.querySelector('#leaderboardList');
  const leaderboardStatus = document.querySelector('#leaderboardStatus');
  const menuCharacterPreview = document.querySelector('#menuCharacterPreview');

  const C = { ink: '#2f414b', muted: '#83a6b8', cloud: '#ffffff', accent: '#ee5d43', paper: '#dff3ff', platform: '#5f8fa8', platformTop: '#315b70' };
  let width = 0, height = 0, scale = 1, groundY = 0;
  let running = false, paused = false, gameOver = false, lastTime = 0, elapsed = 0, score = 0, speed = 430;
  let rafId = 0, devStartDistance = 0, devObstacleFree = false;
  let runSessionPromise = null;
  let spawnTimer = 0, nextSpawn = 1.25, coinTimer = 0, nextCoin = 1.8, platformTimer = 0, nextPlatform = 6, animTime = 0, milestone = 0, coinCount = 0;
  let soundOn = localStorage.getItem('dino-sound') !== 'off';
  let audio = null;
  let menuMusicTimer = null, menuMusicStep = 0, activeMenuSection = 'main';
  let highScore = Number(localStorage.getItem('dino-high-score') || 0);
  let totalCoins = Number(localStorage.getItem('dino-total-coins') || 0);
  const SKINS = [
    { id: 'classic', name: 'КЛАССИЧЕСКИЙ', price: 0, color: '#07977e', accent: '#52c66d', image: 'assets/skins/classic.jpg', gameSprites: ['assets/game-skins/classic-run-4.png', 'assets/game-skins/classic-run-8.png'] },
    { id: 'desert', name: 'ПУСТЫННЫЙ', price: 0, color: '#b87529', accent: '#e1a54e', image: 'assets/skins/desert.jpg', gameSprites: ['assets/game-skins/desert.png', 'assets/game-skins/desert-run-2.png'] },
    { id: 'ice', name: 'ЛЕДЯНОЙ', price: 0, color: '#54cbe5', accent: '#d9f8ff', image: 'assets/skins/ice.jpg' },
    { id: 'fire', name: 'ОГНЕННЫЙ', price: 0, color: '#302e34', accent: '#ff5a19', image: 'assets/skins/fire.jpg' },
    { id: 'jungle', name: 'ДЖУНГЛЕВЫЙ', price: 0, color: '#4b9d2f', accent: '#a9d530', image: 'assets/skins/jungle.jpg' },
    { id: 'twilight', name: 'СУМЕРЕЧНЫЙ', price: 0, color: '#433278', accent: '#bd4cff', image: 'assets/skins/twilight.jpg' },
    { id: 'gold', name: 'ЗОЛОТОЙ', price: 0, color: '#e8ad19', accent: '#fff06a', image: 'assets/skins/skeleton.jpg' },
    { id: 'skeleton', name: 'СКЕЛЕТ', price: 0, color: '#d8ccb0', accent: '#493f38', image: 'assets/skins/gold.jpg' },
    { id: 'rainbow', name: 'РАДУЖНЫЙ', price: 0, color: '#e25445', accent: '#ffcf3d', image: 'assets/skins/rainbow.jpg' },
    { id: 'cosmic', name: 'КОСМИЧЕСКИЙ', price: 0, color: '#172b66', accent: '#24e6ff', image: 'assets/skins/cosmic.jpg' }
  ];
  const skinSprites = new Map(SKINS.filter(skin => skin.gameSprites).map(skin => {
    const images = skin.gameSprites.map(source => {
      const image = new Image();
      image.src = source;
      image.addEventListener('load', draw);
      return image;
    });
    return [skin.id, images];
  }));
  const groundTexture = new Image();
  groundTexture.src = 'assets/desert-ground.png';
  groundTexture.addEventListener('load', draw);
  const daySkyTexture = new Image();
  daySkyTexture.src = 'assets/desert-sky-day.png';
  daySkyTexture.addEventListener('load', draw);
  const sunTexture = new Image();
  sunTexture.src = 'assets/voxel-sun.png';
  sunTexture.addEventListener('load', draw);
  const CACTUS_VARIANTS = [
    { source: 'assets/obstacles/cactus-1.png', w: 26, h: 40 },
    { source: 'assets/obstacles/cactus-2.png', w: 37, h: 60 },
    { source: 'assets/obstacles/cactus-3.png', w: 46, h: 42 },
    { source: 'assets/obstacles/cactus-4.png', w: 51, h: 46 },
    { source: 'assets/obstacles/cactus-5.png', w: 46, h: 64 },
    { source: 'assets/obstacles/cactus-6.png', w: 33, h: 60 }
  ].map(variant => {
    const image = new Image();
    image.src = variant.source;
    image.addEventListener('load', draw);
    return { ...variant, image };
  });
  let ownedSkins;
  try { ownedSkins = JSON.parse(localStorage.getItem('dino-owned-skins') || '["classic"]'); } catch { ownedSkins = ['classic']; }
  ownedSkins = Array.isArray(ownedSkins) ? ownedSkins.filter(id => SKINS.some(skin => skin.id === id)) : [];
  if (!ownedSkins.includes('classic')) ownedSkins.unshift('classic');
  let selectedSkin = localStorage.getItem('dino-selected-skin') || 'classic';
  if (!ownedSkins.includes(selectedSkin) || selectedSkin !== 'classic') selectedSkin = 'classic';
  const obstacles = [], coins = [], platforms = [], dust = [], clouds = [];
  let spriteColor = C.ink;
  let isNight = false, nightAmount = 0;

  const dino = { x: 90, y: 0, w: 46, h: 50, vy: 0, grounded: true, ducking: false, support: null, surfaceY: 0 };

  function resize() {
    const previousWidth = width;
    const previousGroundY = groundY;
    const rect = wrap.getBoundingClientRect();
    scale = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    groundY = Math.min(height * .72, height - 90);
    dino.x = Math.max(42, Math.min(110, width * .1));
    if (dino.grounded && !dino.support) { dino.surfaceY = groundY; dino.y = groundY - dino.h; }
    if (!clouds.length) {
      for (let i = 0; i < 5; i++) clouds.push({ x: Math.random() * width, y: 40 + Math.random() * Math.max(20, groundY - 115), s: .6 + Math.random() * .8 });
    } else {
      const oldSkyBottom = Math.max(60, previousGroundY - 65);
      const newSkyBottom = Math.max(60, groundY - 65);
      for (const cloud of clouds) {
        if (previousWidth > 0) cloud.x = cloud.x / previousWidth * width;
        const verticalRatio = Math.max(0, Math.min(1, (cloud.y - 35) / Math.max(1, oldSkyBottom - 35)));
        cloud.y = 35 + verticalRatio * (newSkyBottom - 35);
      }
    }
    draw();
  }

  function reset() {
    obstacles.length = 0; coins.length = 0; platforms.length = 0; dust.length = 0; elapsed = 0; score = 0; speed = 430; coinCount = 0;
    spawnTimer = 0; nextSpawn = 1.15; coinTimer = 0; nextCoin = 1.5; platformTimer = 0; nextPlatform = 5 + Math.random() * 3; milestone = 0; gameOver = false; paused = false;
    Object.assign(dino, { y: groundY - 50, h: 50, vy: 0, grounded: true, ducking: false, support: null, surfaceY: groundY });
    setNight(false, true);
  }

  function start() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    stopMenuMusic();
    reset(); score = devStartDistance; speed = devObstacleFree ? 890 : Math.min(890, 430 + score * .095);
    runSessionPromise = !isDeveloperRun() && window.DinoCloud?.enabled
      ? window.DinoCloud.startRun()
      : null;
    updateDayNight(true);
    running = true; lastTime = performance.now();
    document.body.classList.remove('menu-open');
    devJumpControls.classList.toggle('hidden', !devObstacleFree);
    startScreen.classList.add('hidden'); overScreen.classList.add('hidden'); pauseScreen.classList.add('hidden');
    initAudio(); beep(330, .05, .025); requestNextFrame();
  }

  function updateMenuStats() {
    menuCoins.textContent = String(totalCoins).padStart(3, '0');
    skinWalletCoins.textContent = String(totalCoins).padStart(3, '0');
    menuHighScore.textContent = formatScore(highScore);
    renderSkinShop();
  }

  function renderSkinShop() {
    skinGrid.innerHTML = SKINS.map(skin => {
      const comingSoon = skin.id !== 'classic';
      const owned = ownedSkins.includes(skin.id), selected = selectedSkin === skin.id;
      const action = comingSoon ? 'СКОРО' : selected ? 'ВЫБРАН' : 'ВЫБРАТЬ';
      return `<button class="skin-card skin-${skin.id}${selected ? ' selected' : ''}${comingSoon ? ' coming-soon' : ''}" type="button" data-skin="${skin.id}" aria-pressed="${selected}"${comingSoon ? ' disabled aria-disabled="true"' : ''}><img class="skin-card-art" src="${skin.image}" alt="${skin.name}" loading="lazy"><span class="skin-name">${skin.name}</span><span class="skin-action">${action}</span>${selected ? '<span class="skin-check" aria-hidden="true">✓</span>' : ''}</button>`;
    }).join('');
    drawMenuCharacter();
  }

  function drawMenuCharacter() {
    const preview = menuCharacterPreview.getContext('2d');
    const skin = SKINS.find(item => item.id === selectedSkin) || SKINS[0];
    preview.clearRect(0, 0, menuCharacterPreview.width, menuCharacterPreview.height);
    const block = (x, y, w, h, color = skin.color) => { preview.fillStyle = color; preview.fillRect(x, y, w, h); };
    const ink = skin.color, eye = '#dff3ff';

    if (skin.id === 'slime') {
      block(22, 45, 68, 25, ink); block(30, 36, 52, 13, ink); block(41, 28, 30, 10, ink);
      block(42, 42, 8, 9, eye); block(64, 42, 8, 9, eye); block(46, 46, 4, 5, '#2f414b'); block(64, 46, 4, 5, '#2f414b');
      block(31, 69, 12, 5, ink); block(70, 69, 12, 5, ink);
      return;
    }

    if (skin.id === 'robot') {
      block(31, 18, 51, 45, ink); block(24, 30, 8, 26, ink); block(82, 30, 8, 26, ink);
      block(40, 29, 10, 9, '#b7f4ff'); block(64, 29, 10, 9, '#b7f4ff'); block(42, 62, 11, 12, ink); block(62, 62, 11, 12, ink);
      block(48, 10, 18, 8, ink); block(55, 5, 5, 7, '#ee5d43');
      return;
    }

    block(43, 31, 33, 31, ink); block(59, 12, 40, 27, ink); block(91, 35, 14, 7, ink);
    block(30, 43, 20, 17, ink); block(20, 39, 14, 13, ink); block(12, 35, 11, 9, ink);
    block(38, 59, 11, 15, ink); block(65, 58, 11, 16, ink);
    block(69, 19, 6, 6, eye); block(72, 21, 3, 3, '#2f414b');
    block(78, 33, 21, 5, eye); block(48, 42, 7, 12, eye);
  }

  async function chooseOrBuySkin(id) {
    const skin = SKINS.find(item => item.id === id);
    if (!skin || skin.id !== 'classic') return;
    if (window.DinoCloud?.enabled) {
      try {
        const wasOwned = ownedSkins.includes(id);
        const cloud = wasOwned
          ? await window.DinoCloud.selectSkin(id)
          : await window.DinoCloud.purchaseSkin(id);
        applyCloudProgress(cloud);
        beep(wasOwned ? 440 : 720, .08, .025);
      } catch (error) {
        beep(130, .12, .025);
        console.warn('Dino skin purchase:', error.message);
      }
      return;
    }
    if (!ownedSkins.includes(id)) {
      if (totalCoins < skin.price) { beep(130, .12, .025); return; }
      totalCoins -= skin.price; ownedSkins.push(id);
      localStorage.setItem('dino-total-coins', String(totalCoins));
      localStorage.setItem('dino-owned-skins', JSON.stringify(ownedSkins));
      beep(720, .12, .03);
    } else beep(440, .05, .015);
    selectedSkin = id; localStorage.setItem('dino-selected-skin', selectedSkin); updateMenuStats(); draw();
  }

  function showMenu() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    running = false; paused = false; gameOver = false; setNight(false, true);
    devJumpControls.classList.add('hidden');
    document.body.classList.add('menu-open');
    overScreen.classList.add('hidden'); pauseScreen.classList.add('hidden'); startScreen.classList.remove('hidden');
    showMenuSection('main'); updateMenuStats(); draw();
  }

  function showMenuSection(section) {
    activeMenuSection = section;
    document.body.classList.toggle('skins-open', section === 'skins');
    mainMenuScreen.classList.toggle('hidden', section !== 'main');
    skinsMenuScreen.classList.toggle('hidden', section !== 'skins');
    leaderboardMenuScreen.classList.toggle('hidden', section !== 'leaderboard');
    settingsMenuScreen.classList.toggle('hidden', section !== 'settings');
    if (section === 'leaderboard') loadLeaderboard();
    if (section === 'main') startMenuMusic(); else stopMenuMusic();
    startScreen.scrollTop = 0;
    requestAnimationFrame(() => { startScreen.scrollTop = 0; });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  async function loadLeaderboard() {
    leaderboardList.innerHTML = '';
    leaderboardStatus.textContent = window.DinoCloud?.enabled ? 'ЗАГРУЗКА...' : 'ОТКРОЙ ИГРУ В TELEGRAM';
    if (!window.DinoCloud?.enabled) return;

    try {
      const entries = await window.DinoCloud.leaderboard();
      leaderboardStatus.textContent = entries.length ? '' : 'ПОКА НЕТ РЕЗУЛЬТАТОВ';
      leaderboardList.innerHTML = entries.map(entry => `
        <li class="leaderboard-row${entry.isCurrent ? ' current' : ''}">
          <strong class="leaderboard-rank">${entry.rank}</strong>
          <span class="leaderboard-player">${escapeHtml(entry.name)}${entry.isCurrent ? '<small>ВЫ</small>' : ''}</span>
          <strong class="leaderboard-score">${formatScore(entry.highScore)}</strong>
        </li>`).join('');
    } catch (error) {
      leaderboardStatus.textContent = 'НЕ УДАЛОСЬ ЗАГРУЗИТЬ';
      console.warn('Dino leaderboard:', error.message);
    }
  }

  function pauseGame() {
    if (!running || paused || gameOver) return;
    paused = true; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    pauseScreen.classList.remove('hidden'); beep(240, .04, .012); draw();
  }

  function resumeGame() {
    if (!running || !paused) return;
    paused = false; pauseScreen.classList.add('hidden'); lastTime = performance.now(); beep(380, .04, .012); requestNextFrame();
  }

  function setNight(active, instant = false) {
    isNight = active; document.body.classList.toggle('night', active);
    if (instant) nightAmount = active ? 1 : 0;
  }

  function isDeveloperRun() {
    return devStartDistance > 0 || devObstacleFree;
  }

  function smoothstep(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  }

  function updateDayNight(instant = false) {
    const target = smoothstep((score - 1700) / 400);
    isNight = target >= .55;
    document.body.classList.toggle('night', isNight);
    if (instant) nightAmount = target;
    return target;
  }

  function jump() {
    if (!running) {
      if (!gameOver && !startScreen.classList.contains('hidden') && !mainMenuScreen.classList.contains('hidden')) { devStartDistance = 0; devObstacleFree = false; start(); }
      return;
    }
    if (dino.grounded) {
      dino.ducking = false; dino.h = 50; dino.y = dino.surfaceY - 50;
      dino.vy = -780; dino.grounded = false; dino.support = null; beep(520, .055, .018);
    }
  }

  function setDuck(active) {
    if (!running) return;
    dino.ducking = active;
    if (!dino.grounded && active) dino.vy += 620;
    if (dino.grounded) { dino.h = active ? 30 : 50; dino.y = dino.surfaceY - dino.h; }
  }

  function spawnObstacle() {
    const birdAllowed = score > 350 && Math.random() < .28;
    if (birdAllowed) {
      const levels = [groundY - 42, groundY - 72, groundY - 102];
      obstacles.push({ type: 'bird', x: width + 30, y: levels[Math.floor(Math.random() * levels.length)], w: 48, h: 28, frame: 0 });
    } else {
      const variant = CACTUS_VARIANTS[Math.floor(Math.random() * CACTUS_VARIANTS.length)];
      obstacles.push({ type: 'cactus', x: width + 30, y: groundY - variant.h, w: variant.w, h: variant.h, variant });
    }
  }

  function spawnCoins() {
    const amount = 1 + Math.floor(Math.random() * 3);
    const levels = [groundY - 36, groundY - 78, groundY - 122];
    const baseY = levels[Math.floor(Math.random() * levels.length)];
    for (let i = 0; i < amount; i++) {
      coins.push({ x: width + 35 + i * 34, y: baseY - (amount === 3 && i === 1 ? 15 : 0), size: 18, phase: Math.random() * Math.PI * 2 });
    }
  }

  function spawnPlatformRoute() {
    const count = 2 + Math.floor(Math.random() * 3);
    let x = width + 90;
    const levels = [groundY - 82, groundY - 125, groundY - 165];
    let level = Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      if (i) level = Math.max(0, Math.min(2, level + (Math.random() < .5 ? -1 : 1)));
      const w = 150 + Math.random() * 100;
      const platform = { x, y: levels[level], w, h: 14 };
      platforms.push(platform);
      const coinAmount = 2 + Math.floor(w / 70);
      for (let c = 0; c < coinAmount; c++) coins.push({ x: x + 28 + c * 34, y: platform.y - 30, size: 18, phase: c * .8 });
      x += w + 65 + Math.random() * 45;
    }
  }

  function update(dt) {
    elapsed += dt; animTime += dt; score += dt * speed * .025;
    speed = devObstacleFree ? 890 : Math.min(890, 430 + score * .095);
    const nightTarget = updateDayNight();
    nightAmount += (nightTarget - nightAmount) * Math.min(1, dt * 2.2);
    const currentMilestone = Math.floor(score / 500);
    if (currentMilestone > milestone) { milestone = currentMilestone; beep(760, .08, .025); }

    for (let i = platforms.length - 1; i >= 0; i--) {
      const platform = platforms[i]; platform.x -= speed * dt;
      if (platform.x + platform.w < -20) platforms.splice(i, 1);
    }

    if (dino.grounded && dino.support) {
      const stillSupported = dino.x + dino.w > dino.support.x && dino.x < dino.support.x + dino.support.w;
      if (!stillSupported) { dino.grounded = false; dino.support = null; dino.vy = 60; }
    }

    if (!dino.grounded) {
      const previousBottom = dino.y + dino.h;
      dino.vy += 2100 * dt; dino.y += dino.vy * dt;
      let landing = null;
      if (dino.vy >= 0) {
        for (const platform of platforms) {
          const overlaps = dino.x + dino.w - 6 > platform.x && dino.x + 6 < platform.x + platform.w;
          if (overlaps && previousBottom <= platform.y + 4 && dino.y + dino.h >= platform.y && (!landing || platform.y < landing.y)) landing = platform;
        }
      }
      if (landing) {
        if (dino.ducking) dino.h = 30;
        dino.surfaceY = landing.y; dino.y = landing.y - dino.h; dino.vy = 0; dino.grounded = true; dino.support = landing; makeDust(4); beep(280, .035, .01);
      } else if (dino.y >= groundY - dino.h) {
        if (dino.ducking) dino.h = 30;
        dino.surfaceY = groundY; dino.y = groundY - dino.h; dino.vy = 0; dino.grounded = true; dino.support = null; makeDust(5);
      }
    }

    if (!devObstacleFree) {
      spawnTimer += dt;
      if (spawnTimer >= nextSpawn) {
        spawnTimer = 0; spawnObstacle();
        const minGap = Math.max(.68, 1.08 - speed / 2600);
        nextSpawn = minGap + Math.random() * .72;
      }

      coinTimer += dt;
      if (coinTimer >= nextCoin) {
        coinTimer = 0; spawnCoins(); nextCoin = 1.8 + Math.random() * 2.1;
      }

      platformTimer += dt;
      if (platformTimer >= nextPlatform) {
        platformTimer = 0; spawnPlatformRoute(); nextPlatform = 9 + Math.random() * 5;
      }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i]; o.x -= (speed + (o.type === 'bird' ? 145 : 0)) * dt; o.frame += dt;
      if (o.x + o.w < -10) obstacles.splice(i, 1);
      else if (collides(o)) { endGame(); return; }
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i]; coin.x -= speed * dt; coin.phase += dt * 9;
      if (coin.x + coin.size < -10) coins.splice(i, 1);
      else if (collectsCoin(coin)) {
        coinCount++; coins.splice(i, 1); beep(880 + (coinCount % 3) * 110, .07, .022);
      }
    }
    for (const c of clouds) { c.x -= speed * .035 * c.s * dt; if (c.x < -80) { c.x = width + Math.random() * 150; c.y = 40 + Math.random() * Math.max(20, groundY - 115); } }
    for (let i = dust.length - 1; i >= 0; i--) { const p = dust[i]; p.x -= (speed * .25 + p.vx) * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) dust.splice(i, 1); }
    if (dino.grounded && !dino.ducking && Math.random() < dt * 5) makeDust(1);
  }

  function collides(o) {
    const padX = dino.ducking ? 7 : 9, padY = 6;
    const dx = dino.x + padX, dy = dino.y + padY, dw = dino.w - padX * 2, dh = dino.h - padY - 2;
    const op = o.type === 'bird' ? 5 : 3;
    return dx < o.x + o.w - op && dx + dw > o.x + op && dy < o.y + o.h - 3 && dy + dh > o.y + 3;
  }

  function collectsCoin(coin) {
    const dx = dino.x + 5, dy = dino.y + 3;
    return dx < coin.x + coin.size && dx + dino.w - 10 > coin.x && dy < coin.y + coin.size && dy + dino.h - 6 > coin.y;
  }

  function endGame() {
    if (!running) return;
    running = false; paused = false; gameOver = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    makeDust(9); beep(115, .25, .05);
    if (!isDeveloperRun()) {
      highScore = Math.max(highScore, Math.floor(score));
      totalCoins += coinCount;
      storeProgressLocally();
    }
    updateMenuStats();
    finalScore.textContent = formatScore(score); finalCoins.textContent = String(coinCount).padStart(3, '0'); finalHighScore.textContent = formatScore(highScore);
    overScreen.classList.remove('hidden');
    if (!isDeveloperRun()) finishCloudRun(Math.floor(score), coinCount);
  }

  function storeProgressLocally() {
    localStorage.setItem('dino-high-score', String(highScore));
    localStorage.setItem('dino-total-coins', String(totalCoins));
    localStorage.setItem('dino-owned-skins', JSON.stringify(ownedSkins));
    localStorage.setItem('dino-selected-skin', selectedSkin);
  }

  function applyCloudProgress(cloud) {
    if (!cloud) return;
    highScore = Number(cloud.high_score) || 0;
    totalCoins = Number(cloud.total_coins) || 0;
    const cloudOwned = Array.isArray(cloud.owned_skins) ? cloud.owned_skins : ['classic'];
    ownedSkins = [...new Set([...cloudOwned.filter(id => SKINS.some(skin => skin.id === id)), 'classic'])];
    selectedSkin = ownedSkins.includes(cloud.selected_skin) ? cloud.selected_skin : 'classic';
    storeProgressLocally();
    updateMenuStats();
    finalHighScore.textContent = formatScore(highScore);
    draw();
  }

  async function finishCloudRun(runScore, runCoins) {
    if (!window.DinoCloud?.enabled || !runSessionPromise) return;
    try {
      const session = await runSessionPromise;
      if (!session?.runToken) throw new Error('Run session was not created');
      const cloud = await window.DinoCloud.finishRun(session.runToken, runScore, runCoins);
      applyCloudProgress(cloud);
    } catch (error) {
      console.warn('Dino cloud result:', error.message);
      await loadCloudProgress();
    } finally {
      runSessionPromise = null;
    }
  }

  async function loadCloudProgress() {
    if (!window.DinoCloud?.enabled) return;

    try {
      const cloud = await window.DinoCloud.load();
      if (!cloud) return;

      applyCloudProgress(cloud);
    } catch (error) {
      console.warn('Dino cloud load:', error.message);
    }
  }

  function makeDust(n) { for (let i = 0; i < n; i++) dust.push({ x: dino.x + 8 + Math.random() * 22, y: dino.surfaceY - Math.random() * 5, vx: Math.random() * 40, vy: -8 - Math.random() * 22, life: .18 + Math.random() * .25 }); }
  const formatScore = n => String(Math.floor(n)).padStart(5, '0').slice(-5);

  function rect(x, y, w, h, color = spriteColor) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); }

  function drawSkinDetails(x, y, ducking, skin) {
    const a = skin.accent;
    if (skin.id === 'classic') {
      rect(x + (ducking ? 10 : 16), y + (ducking ? 19 : 29), ducking ? 18 : 11, 4, a);
    } else if (skin.id === 'desert') {
      rect(x + 16, y + (ducking ? 13 : 21), 6, 5, a); rect(x + 26, y + (ducking ? 8 : 9), 8, 4, a);
      rect(x + 8, y + (ducking ? 19 : 28), 5, 3, '#71471e');
    } else if (skin.id === 'ice') {
      rect(x + 10, y + (ducking ? 5 : 12), 5, 5, a); rect(x + 17, y + (ducking ? 2 : 9), 5, 6, a);
      rect(x + 24, y + (ducking ? 1 : 6), 5, 6, a); rect(x + 30, y + (ducking ? 1 : 0), 5, 5, a);
      rect(x + 17, y + (ducking ? 18 : 29), 12, 4, '#8feaff');
    } else if (skin.id === 'fire') {
      rect(x + 9, y + (ducking ? 9 : 19), 4, 8, a); rect(x + 13, y + (ducking ? 7 : 16), 4, 4, '#ff9c22');
      rect(x + 20, y + (ducking ? 17 : 27), 4, 8, a); rect(x + 24, y + (ducking ? 21 : 31), 7, 3, a);
      rect(x + 31, y + (ducking ? 5 : 8), 4, 5, '#ff9c22');
    } else if (skin.id === 'jungle') {
      rect(x + 11, y + (ducking ? 5 : 13), 5, 5, a); rect(x + 18, y + (ducking ? 2 : 9), 5, 5, a);
      rect(x + 25, y + (ducking ? 1 : 6), 5, 5, a); rect(x + 18, y + (ducking ? 18 : 28), 8, 5, '#286b2c');
    } else if (skin.id === 'twilight') {
      rect(x + 11, y + (ducking ? 6 : 14), 4, 4, a); rect(x + 17, y + (ducking ? 3 : 10), 4, 4, a);
      rect(x + 23, y + (ducking ? 1 : 7), 4, 4, a); rect(x + 17, y + (ducking ? 19 : 29), 13, 4, '#7654bd');
    } else if (skin.id === 'gold') {
      rect(x + 15, y + (ducking ? 8 : 17), 5, 12, a); rect(x + 27, y + (ducking ? 4 : 7), 11, 4, a);
      rect(x + 5, y + (ducking ? 15 : 25), 4, 4, '#fff5a6');
    } else if (skin.id === 'skeleton') {
      rect(x + 17, y + (ducking ? 12 : 21), 15, 4, a); rect(x + 19, y + (ducking ? 8 : 17), 3, 12, a);
      rect(x + 25, y + (ducking ? 8 : 17), 3, 12, a); rect(x + 31, y + (ducking ? 8 : 17), 3, 12, a);
      rect(x + 31, y + (ducking ? 6 : 5), 5, 5, '#17191d');
    } else if (skin.id === 'rainbow') {
      const sy = y + (ducking ? 9 : 17);
      rect(x + 13, sy, 20, 4, '#ffcf3d'); rect(x + 13, sy + 4, 20, 4, '#53cf62'); rect(x + 13, sy + 8, 20, 4, '#438bea');
      rect(x + 5, y + (ducking ? 18 : 28), 7, 4, '#a95bdc');
    } else if (skin.id === 'cosmic') {
      ctx.shadowColor = a; ctx.shadowBlur = 7;
      rect(x + 13, y + (ducking ? 8 : 16), 4, 4, a); rect(x + 25, y + (ducking ? 17 : 28), 3, 3, '#8cf6ff');
      rect(x + 36, y + (ducking ? 6 : 8), 5, 3, a); ctx.shadowBlur = 0;
    }
  }

  function mixColor(day, night, amount) {
    const a = day.match(/\w\w/g).map(v => parseInt(v, 16)), b = night.match(/\w\w/g).map(v => parseInt(v, 16));
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * amount)).join(',')})`;
  }

  function drawDino() {
    const x = Math.round(dino.x), y = Math.round(dino.y), dead = gameOver;
    const skin = SKINS.find(item => item.id === selectedSkin) || SKINS[0];
    const rasterFrames = skinSprites.get(skin.id);
    const runningFrame = dino.grounded && !dino.ducking ? Math.floor(animTime * 7) % (rasterFrames?.length || 1) : 0;
    const rasterSprite = rasterFrames?.[runningFrame] || rasterFrames?.[0];
    if (rasterSprite?.complete && rasterSprite.naturalWidth) {
      const ducking = dino.ducking && dino.grounded;
      const spriteW = ducking ? 104 : 112;
      const spriteH = ducking ? 70 : 106;
      const spriteX = x - 28;
      // Generated frames have equal transparent padding below the feet.
      // Keep that padding outside the collision box so both poses touch the ground.
      const spriteY = y + dino.h - spriteH + 13;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      if (dead) ctx.globalAlpha = .62;
      ctx.drawImage(rasterSprite, spriteX, spriteY, spriteW, spriteH);
      ctx.restore();
      return;
    }
    spriteColor = skin.id === 'dino' ? C.ink : skin.color;
    ctx.save(); ctx.fillStyle = C.ink;
    if (skin.id === 'slime') {
      const bodyH = dino.ducking && dino.grounded ? 22 : 32, bodyY = y + dino.h - bodyH;
      rect(x + 3, bodyY + 9, 43, bodyH - 9); rect(x + 9, bodyY + 4, 31, 9); rect(x + 17, bodyY, 17, 7);
      rect(x + 17, bodyY + 9, 4, 5, C.paper); rect(x + 31, bodyY + 9, 4, 5, C.paper);
      rect(x + 19, bodyY + 11, 2, 3, C.ink); rect(x + 31, bodyY + 11, 2, 3, C.ink);
      if (dead) rect(x + 12, bodyY + bodyH - 7, 26, 3, C.accent);
      ctx.restore(); spriteColor = C.ink; return;
    }
    if (skin.id === 'robot') {
      const bodyY = y + (dino.ducking && dino.grounded ? 4 : 6);
      rect(x + 7, bodyY, 34, dino.h - 10); rect(x + 2, bodyY + 11, 7, 19); rect(x + 40, bodyY + 11, 7, 19);
      rect(x + 13, bodyY + 7, 7, 6, dead ? C.accent : '#b7f4ff'); rect(x + 29, bodyY + 7, 7, 6, dead ? C.accent : '#b7f4ff');
      rect(x + 14, bodyY + dino.h - 10, 8, 7); rect(x + 28, bodyY + dino.h - 10, 8, 7);
      ctx.restore(); spriteColor = C.ink; return;
    }
    if (dino.ducking && dino.grounded) {
      rect(x + 4, y + 8, 31, 19); rect(x + 29, y + 3, 18, 17); rect(x, y + 12, 10, 10);
      rect(x + 38, y + 7, 4, 4, C.paper);
      const phase = Math.floor(animTime * 12) % 2; rect(x + (phase ? 9 : 19), y + 25, 8, 5);
      drawSkinDetails(x, y, true, skin);
    } else {
      rect(x + 13, y + 15, 22, 27); rect(x + 25, y, 23, 24); rect(x + 42, y + 18, 8, 5);
      rect(x + 4, y + 25, 15, 9); rect(x, y + 20, 7, 7); rect(x + 10, y + 38, 8, 7);
      rect(x + 31, y + 5, 4, 4, dead ? C.accent : C.paper);
      if (dead) { rect(x + 30, y + 6, 7, 2); rect(x + 33, y + 3, 2, 7); }
      if (!dino.grounded) { rect(x + 12, y + 43, 8, 6); rect(x + 27, y + 40, 7, 6); }
      else { const phase = Math.floor(animTime * 12) % 2; rect(x + (phase ? 11 : 27), y + 42, 8, 8); }
      drawSkinDetails(x, y, false, skin);
    }
    ctx.restore(); spriteColor = C.ink;
  }

  function drawCactus(o) {
    if (o.variant?.image.complete && o.variant.image.naturalWidth) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(o.variant.image, o.x, groundY - o.h, o.w, o.h);
      ctx.restore();
      return;
    }
    rect(o.x + o.w * .34, groundY - o.h, o.w * .34, o.h);
  }

  function drawBird(o) {
    const up = Math.floor(o.frame * 9) % 2 === 0;
    spriteColor = C.ink;
    ctx.save(); ctx.translate(o.x * 2 + 56, 0); ctx.scale(-1, 1);
    rect(o.x + 13, o.y + 10, 29, 12); rect(o.x + 36, o.y + 6, 13, 13); rect(o.x + 47, o.y + 10, 9, 4);
    rect(o.x + 3, o.y + 13, 15, 6); rect(o.x, o.y + 10, 7, 4); rect(o.x + 40, o.y + 9, 3, 3, C.paper);
    if (up) {
      rect(o.x + 14, o.y + 4, 23, 8); rect(o.x + 18, o.y, 17, 5); rect(o.x + 22, o.y - 4, 11, 5);
    } else {
      rect(o.x + 12, o.y + 20, 26, 7); rect(o.x + 17, o.y + 27, 20, 5); rect(o.x + 24, o.y + 32, 12, 4);
    }
    ctx.restore();
  }

  function drawCoin(coin) {
    const squash = .35 + Math.abs(Math.cos(coin.phase)) * .65;
    const w = Math.max(5, coin.size * squash), x = coin.x + (coin.size - w) / 2;
    ctx.fillStyle = '#f2a93b'; ctx.fillRect(Math.round(x), Math.round(coin.y), Math.round(w), coin.size);
    if (w > 9) { ctx.fillStyle = '#ffd36b'; ctx.fillRect(Math.round(x + 4), Math.round(coin.y + 3), Math.max(2, Math.round(w - 8)), coin.size - 6); }
  }

  function drawPlatform(platform) {
    rect(platform.x, platform.y, platform.w, 5, C.platformTop);
    rect(platform.x + 3, platform.y + 5, platform.w - 6, platform.h - 5, C.platform);
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    for (let x = platform.x + 14; x < platform.x + platform.w - 8; x += 28) ctx.fillRect(Math.round(x), Math.round(platform.y + 8), 12, 2);
  }

  function drawCloud(c) {
    ctx.strokeStyle = C.cloud; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(c.x, c.y + 13 * c.s); ctx.lineTo(c.x + 12 * c.s, c.y + 13 * c.s);
    ctx.arc(c.x + 21 * c.s, c.y + 10 * c.s, 9 * c.s, Math.PI, 0);
    ctx.arc(c.x + 38 * c.s, c.y + 8 * c.s, 13 * c.s, Math.PI, 0);
    ctx.arc(c.x + 54 * c.s, c.y + 12 * c.s, 8 * c.s, Math.PI, 0); ctx.lineTo(c.x + 70 * c.s, c.y + 13 * c.s); ctx.stroke();
  }

  function drawSkyBackground() {
    if (!daySkyTexture.complete || !daySkyTexture.naturalWidth) return;
    const sourceHeight = Math.round(daySkyTexture.naturalHeight * .95);
    const skyHeight = groundY + 2;
    const tileWidth = daySkyTexture.naturalWidth * skyHeight / sourceHeight;
    const offset = running ? (elapsed * speed * .035) % tileWidth : 0;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (let x = -offset; x < width; x += tileWidth) {
      ctx.drawImage(daySkyTexture, 0, 0, daySkyTexture.naturalWidth, sourceHeight, x, 0, tileWidth + 1, skyHeight);
    }
    ctx.restore();
  }

  function drawSun() {
    if (!sunTexture.complete || !sunTexture.naturalWidth) return;
    const journey = smoothstep(score / 2000);
    const size = Math.min(116, Math.max(72, width * .18));
    const x = width * (.1 + journey * .45) - size / 2;
    const startCenterY = groundY * .52;
    const highCenterY = Math.max(size * .62, 72);
    const endCenterY = groundY * .76;
    const inverseJourney = 1 - journey;
    const centerY = inverseJourney * inverseJourney * startCenterY
      + 2 * inverseJourney * journey * highCenterY
      + journey * journey * endCenterY;
    const y = centerY - size / 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - nightAmount * 1.15);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sunTexture, x, y, size, size);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const sky = mixColor('#dff3ff', '#15233d', nightAmount);
    C.paper = sky; C.ink = mixColor('#2f414b', '#e8f0ff', nightAmount); C.muted = mixColor('#83a6b8', '#7185a9', nightAmount);
    spriteColor = C.ink; rect(0, 0, width, height, sky);
    drawSkyBackground();
    drawSun();
    if (nightAmount > 0) {
      ctx.fillStyle = `rgba(7, 18, 40, ${nightAmount * .72})`;
      ctx.fillRect(0, 0, width, groundY);
    }
    if (nightAmount > .05) {
      ctx.globalAlpha = nightAmount;
      for (let i = 0; i < 28; i++) rect((i * 97 + 41) % Math.max(width, 1), 48 + (i * 53) % Math.max(80, groundY - 100), i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2, '#dce8ff');
      ctx.beginPath(); ctx.fillStyle = '#f5edbd'; ctx.arc(width * .78, 95, 24, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = sky; ctx.arc(width * .78 + 10, 87, 23, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const c of clouds) drawCloud(c);
    const groundHeight = height - groundY;
    if (groundTexture.complete && groundTexture.naturalWidth) {
      const sourceY = 500;
      const sourceHeight = groundTexture.naturalHeight - sourceY;
      const tileWidth = groundTexture.naturalWidth * groundHeight / sourceHeight;
      const groundOffset = running ? (elapsed * speed) % tileWidth : 0;
      ctx.imageSmoothingEnabled = true;
      for (let x = -groundOffset; x < width; x += tileWidth) {
        ctx.drawImage(groundTexture, 0, sourceY, groundTexture.naturalWidth, sourceHeight, x, groundY, tileWidth + 1, groundHeight);
      }
      if (nightAmount > 0) {
        ctx.fillStyle = `rgba(10, 21, 38, ${nightAmount * .58})`;
        ctx.fillRect(0, groundY, width, groundHeight);
      }
    } else {
      rect(0, groundY, width, groundHeight, mixColor('#e7c987', '#584b3a', nightAmount));
    }
    for (const platform of platforms) drawPlatform(platform);
    for (const p of dust) rect(p.x, p.y, 3, 3, C.muted);
    for (const coin of coins) drawCoin(coin);
    for (const o of obstacles) o.type === 'cactus' ? drawCactus(o) : drawBird(o);
    drawDino();

    ctx.textAlign = 'right'; ctx.font = '700 16px "Courier New"'; ctx.fillStyle = C.ink;
    const hs = highScore ? `HI ${formatScore(highScore)}  ` : '';
    ctx.fillText(`${hs}${formatScore(score)}`, width - 22, 30);
    if (isDeveloperRun() && running) { ctx.font = '700 10px "Courier New"'; ctx.fillStyle = C.accent; ctx.fillText(devObstacleFree ? 'DEV · БЕЗ ПРЕГРАД' : 'DEV', width - 22, 47); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#d98a22'; ctx.fillText(`● ${String(coinCount).padStart(3, '0')}`, width / 2, 30);
    if (running) { ctx.textAlign = 'left'; ctx.font = '10px "Courier New"'; ctx.fillStyle = C.muted; ctx.fillText(`${Math.round(speed)} PX/S`, 22, 30); }
  }

  function requestNextFrame() {
    if (!rafId && running && !paused) rafId = requestAnimationFrame(loop);
  }

  function loop(now) {
    rafId = 0;
    if (!running) { draw(); return; }
    if (paused) { draw(); return; }
    const dt = Math.min((now - lastTime) / 1000, .035); lastTime = now;
    update(dt); draw(); requestNextFrame();
  }

  function initAudio() { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); }
  const MENU_MELODY = [659, 784, 880, 784, 659, 587, 523, 587, 659, 784, 880, 988, 880, 784, 659, 587, 523, 659, 784, 659, 587, 523, 494, 523, 587, 659, 784, 659, 587, 523, 494, 440];
  const MENU_BASS = [131, 131, 110, 110, 98, 98, 110, 110];

  function playMusicTone(frequency, type, volume, duration) {
    if (!audio || !soundOn) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now); oscillator.stop(now + duration + .02);
  }

  function playMenuMusicStep() {
    if (!soundOn || running || activeMenuSection !== 'main' || !document.body.classList.contains('menu-open')) { stopMenuMusic(); return; }
    const melody = MENU_MELODY[menuMusicStep % MENU_MELODY.length];
    playMusicTone(melody, 'square', .007, .26);
    if (menuMusicStep % 4 === 0) playMusicTone(MENU_BASS[Math.floor(menuMusicStep / 4) % MENU_BASS.length], 'triangle', .018, 1.05);
    menuMusicStep = (menuMusicStep + 1) % MENU_MELODY.length;
  }

  function startMenuMusic() {
    if (!soundOn || menuMusicTimer || running || activeMenuSection !== 'main' || !document.body.classList.contains('menu-open')) return;
    initAudio(); playMenuMusicStep();
    menuMusicTimer = window.setInterval(playMenuMusicStep, 320);
  }

  function stopMenuMusic() {
    if (menuMusicTimer) window.clearInterval(menuMusicTimer);
    menuMusicTimer = null; menuMusicStep = 0;
  }

  function updateSoundControls() {
    soundButton.setAttribute('aria-pressed', String(soundOn));
    soundButton.setAttribute('aria-label', soundOn ? 'Выключить звук' : 'Включить звук');
    menuSoundToggle.setAttribute('aria-pressed', String(soundOn));
    menuSoundLabel.textContent = `ЗВУК И МУЗЫКА: ${soundOn ? 'ВКЛ' : 'ВЫКЛ'}`;
  }

  function toggleSound() {
    soundOn = !soundOn;
    localStorage.setItem('dino-sound', soundOn ? 'on' : 'off');
    updateSoundControls();
    if (soundOn) { beep(440, .06, .02); if (activeMenuSection === 'main') startMenuMusic(); }
    else stopMenuMusic();
  }

  function beep(freq, duration, volume) {
    if (!soundOn) return; initAudio();
    const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'square'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
  }

  document.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight', 'Escape', 'KeyP'].includes(e.code)) e.preventDefault();
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { paused ? resumeGame() : pauseGame(); return; }
    if (paused) return;
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !e.repeat) jump();
    if (e.code === 'ArrowDown' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') setDuck(true);
    if (e.code === 'KeyR' && gameOver) start();
  });
  document.addEventListener('keyup', e => { if (e.code === 'ArrowDown' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') setDuck(false); });
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
  jumpButton.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
  duckButton.addEventListener('pointerdown', e => { e.preventDefault(); setDuck(true); });
  for (const event of ['pointerup', 'pointercancel', 'pointerleave']) duckButton.addEventListener(event, () => setDuck(false));
  startButton.addEventListener('click', () => { devStartDistance = 0; devObstacleFree = false; start(); }); restartButton.addEventListener('click', start); menuButton.addEventListener('click', showMenu);
  pauseButton.addEventListener('click', () => paused ? resumeGame() : pauseGame()); resumeButton.addEventListener('click', resumeGame); pauseMenuButton.addEventListener('click', showMenu);
  skinGrid.addEventListener('click', e => { const card = e.target.closest('[data-skin]'); if (card) chooseOrBuySkin(card.dataset.skin); });
  devDistanceButtons.addEventListener('click', e => {
    const button = e.target.closest('[data-distance], [data-obstacle-free]'); if (!button) return;
    devObstacleFree = button.hasAttribute('data-obstacle-free');
    devStartDistance = devObstacleFree ? 0 : Number(button.dataset.distance);
    beep(560, .05, .015); start();
  });
  devJumpControls.addEventListener('click', e => {
    const button = e.target.closest('[data-jump-distance]');
    if (!button || !devObstacleFree || !running) return;
    score = Number(button.dataset.jumpDistance);
    speed = 890;
    milestone = Math.floor(score / 500);
    updateDayNight(true);
    beep(640, .045, .014);
    draw();
  });
  characterMenuButton.addEventListener('click', () => { showMenuSection('skins'); beep(420, .035, .01); });
  leaderboardMenuButton.addEventListener('click', () => { showMenuSection('leaderboard'); beep(470, .035, .01); });
  developerMenuButton.addEventListener('click', () => { showMenuSection('settings'); beep(390, .035, .01); });
  for (const button of document.querySelectorAll('[data-menu-back]')) button.addEventListener('click', () => { showMenuSection('main'); beep(320, .035, .01); });
  soundButton.addEventListener('click', toggleSound);
  menuSoundToggle.addEventListener('click', toggleSound);
  document.addEventListener('pointerdown', () => startMenuMusic(), { once: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopMenuMusic(); if (running && !paused) pauseGame(); }
    else if (!running && activeMenuSection === 'main') startMenuMusic();
  });
  updateSoundControls(); updateMenuStats(); resize(); loadCloudProgress();
})();
