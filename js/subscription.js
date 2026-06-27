const Subscription = (() => {
  const STORAGE_KEY = 'nova_subscription';

  // Sub data structure
  // { type: 'none' | 'trial' | 'pro', expiresAt: timestamp, trialUsed: bool }

  function get() {
    return Utils.storage.get(STORAGE_KEY, {
      type: 'none',
      expiresAt: null,
      trialUsed: false,
    });
  }

  function isPro() {
    const sub = get();
    if (sub.type === 'none') return false;
    if (!sub.expiresAt) return false;
    return Date.now() < sub.expiresAt;
  }

  function isTrial() {
    const sub = get();
    return sub.type === 'trial' && Date.now() < sub.expiresAt;
  }

  function trialUsed() {
    return get().trialUsed;
  }

  function activateTrial() {
    const sub = get();
    if (sub.trialUsed) return false;
    const newSub = {
      type: 'trial',
      expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days
      trialUsed: true,
    };
    Utils.storage.set(STORAGE_KEY, newSub);
    return true;
  }

  // Called after successful payment (stub)
  function activatePro() {
    const newSub = {
      type: 'pro',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      trialUsed: true,
    };
    Utils.storage.set(STORAGE_KEY, newSub);
  }

  function getDaysLeft() {
    const sub = get();
    if (!sub.expiresAt) return 0;
    const ms = sub.expiresAt - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }

  function getStatus() {
    if (isPro()) {
      const sub = get();
      return sub.type === 'trial' ? 'trial' : 'pro';
    }
    return 'none';
  }

  // Render upgrade gate UI
  function renderUpgradeBanner(onActivateTrial, onBuyPro) {
    const used = trialUsed();
    return `
      <div class="upgrade-banner">
        <div style="font-size:28px;margin-bottom:10px">🔒</div>
        <div class="upgrade-title">Только для NOVA Pro</div>
        <div class="upgrade-desc">
          Получите доступ к расширенной аналитике портфеля, AI-сигналам и персональным рекомендациям
        </div>
        ${!used ? `
          <button class="btn-primary" id="btn-trial-activate" style="max-width:280px;margin:0 auto">
            Попробовать бесплатно 3 дня
          </button>
          <div class="upgrade-price">затем 990 ₽/мес</div>
        ` : `
          <button class="btn-primary" id="btn-buy-pro" style="max-width:280px;margin:0 auto">
            Подключить NOVA Pro — 990 ₽/мес
          </button>
        `}
      </div>
    `;
  }

  function renderProBadge() {
    const status = getStatus();
    if (status === 'pro') return `<span class="pro-badge">✦ PRO</span>`;
    if (status === 'trial') return `<span class="pro-badge" style="background:rgba(52,211,153,0.15);border-color:rgba(52,211,153,0.3);color:#34D399">TRIAL ${getDaysLeft()}д</span>`;
    return '';
  }

  return {
    get, isPro, isTrial, trialUsed,
    activateTrial, activatePro,
    getDaysLeft, getStatus,
    renderUpgradeBanner, renderProBadge,
  };
})();