(() => {
  'use strict';

  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;

  webApp.ready();
  webApp.expand();
  webApp.disableVerticalSwipes?.();
  webApp.lockOrientation?.();

  const syncTelegramChrome = () => {
    const isNight = document.body.classList.contains('night');
    const color = isNight ? '#15233d' : '#dff3ff';

    try {
      webApp.setHeaderColor(color);
      webApp.setBackgroundColor(color);
      webApp.setBottomBarColor?.(color);
    } catch {
      // Старые версии Telegram могут не поддерживать часть цветовых API.
    }
  };

  syncTelegramChrome();

  new MutationObserver(syncTelegramChrome).observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  window.addEventListener('beforeunload', () => {
    webApp.enableVerticalSwipes?.();
    webApp.unlockOrientation?.();
  });
})();
