(() => {
  'use strict';

  const webApp = window.Telegram?.WebApp;
  const endpoint = 'https://koouhdzacvupkoicepod.supabase.co/functions/v1/dino-progress';
  const initData = webApp?.initData || '';
  const userId = webApp?.initDataUnsafe?.user?.id;

  async function request(action, progress) {
    if (!initData) return null;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action, progress })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Не удалось синхронизировать прогресс');
    return result.progress || null;
  }

  window.DinoCloud = {
    enabled: Boolean(initData && userId),
    userId,
    load: () => request('load'),
    save: progress => request('save', progress)
  };
})();
