const ProfilePage = (() => {
  function render() {
    const tg   = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    const name = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Трейдер';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const sub     = Subscription.get();
    const isPro   = Subscription.isPro();
    const status  = Subscription.getStatus();
    const daysLeft= Subscription.getDaysLeft();

    const page = Utils.el('page-profile');
    page.innerHTML = `
      <!-- Avatar -->
      <div class="glass-card mb-12" style="padding:24px 16px 20px">
        <div class="profile-avatar">${initials}</div>
        <div class="profile-name">${name}</div>
        <div class="profile-level" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px">
          <span>Pro Трейдер</span>
          ${Subscription.renderProBadge()}
        </div>
        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-val change-positive">+24.8%</div>
            <div class="profile-stat-label">Доходность</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-val">142</div>
            <div class="profile-stat-label">Сделки</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-val">68%</div>
            <div class="profile-stat-label">Точность</div>
          </div>
        </div>
      </div>

      <!-- Subscription card -->
      <div class="glass-card mb-12" style="padding:16px;${isPro ? 'background:linear-gradient(135deg,rgba(59,158,255,0.12),rgba(123,95,255,0.1));border-color:rgba(59,158,255,0.25)' : ''}">
        ${isPro ? renderProCard(status, daysLeft) : renderFreeCard()}
      </div>

      <!-- Settings -->
      <div class="glass-card mb-12" style="padding:8px 0">
        ${[
          { icon: '🔔', label: 'Уведомления', id: 'notif' },
          { icon: '🔒', label: 'Безопасность', id: 'security' },
          { icon: '💳', label: 'Способы оплаты', id: 'payment' },
          { icon: '📊', label: 'Настройки графиков', id: 'charts' },
          { icon: '🌍', label: 'Язык и регион', id: 'lang' },
          { icon: '❓', label: 'Помощь и поддержка', id: 'help' },
        ].map((item, i, arr) => `
          ${i > 0 ? '<div class="divider"></div>' : ''}
          <div class="settings-item" id="setting-${item.id}">
            <div class="settings-icon">${item.icon}</div>
            <div class="settings-label">${item.label}</div>
            <div class="settings-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Logout -->
      <div style="text-align:center;margin-bottom:8px">
        <button id="logout-btn" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);color:#F87171;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;font-family:var(--font-main);cursor:pointer">
          Выйти из аккаунта
        </button>
      </div>
      <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-bottom:4px">NOVA Trading v2.5.0</div>
    `;

    // Bind logout
    Utils.el('logout-btn')?.addEventListener('click', () => {
      Utils.toast('Функция выхода будет доступна в полной версии', 'info');
    });

    // Bind settings
    Utils.el('setting-help')?.addEventListener('click', () => {
      Utils.toast('Поддержка: @nova_support', 'info');
    });

    // Subscription buttons
    if (!isPro) {
      Utils.el('btn-profile-trial')?.addEventListener('click', () => {
        const ok = Subscription.activateTrial();
        if (ok) {
          Utils.toast('Пробный период активирован!', 'success');
          render();
        } else {
          Utils.toast('Пробный период уже использован', 'error');
        }
      });

      Utils.el('btn-profile-pro')?.addEventListener('click', () => {
        Subscription.activatePro();
        Utils.toast('NOVA Pro активирован! 🚀', 'success');
        render();
      });
    }
  }

  function renderProCard(status, daysLeft) {
    return `
      <div class="flex-between">
        <div>
          <div style="font-size:15px;font-weight:700;margin-bottom:4px">NOVA Pro ${status === 'trial' ? '(Пробный)' : ''}</div>
          <div style="font-size:12px;color:var(--text-secondary)">
            ${daysLeft > 0 ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}` : 'Истекает скоро'}
          </div>
        </div>
        <button class="portfolio-btn primary" style="flex:0;padding:9px 16px;font-size:13px">
          ${status === 'trial' ? 'Продлить' : 'Управление'}
        </button>
      </div>
    `;
  }

  function renderFreeCard() {
    const trialUsed = Subscription.trialUsed();
    return `
      <div style="margin-bottom:12px">
        <div style="font-size:15px;font-weight:700;margin-bottom:4px">Бесплатный план</div>
        <div style="font-size:12px;color:var(--text-secondary)">Ограниченный доступ к функциям</div>
      </div>
      ${!trialUsed ? `
        <button class="btn-secondary mb-8" id="btn-profile-trial" style="margin-bottom:10px;border-radius:12px;font-size:14px">
          Попробовать NOVA Pro бесплатно (3 дня)
        </button>
      ` : ''}
      <button class="btn-primary" id="btn-profile-pro" style="font-size:14px">
        Подключить NOVA Pro — 990 ₽/мес
      </button>
    `;
  }

  return { render };
})();