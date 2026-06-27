const ProfilePage = (() => {
  const settingsItems = [
    { icon: '🔔', label: 'Уведомления' },
    { icon: '🔒', label: 'Безопасность' },
    { icon: '💳', label: 'Способы оплаты' },
    { icon: '🌍', label: 'Язык и регион' },
    { icon: '📊', label: 'Настройки графиков' },
    { icon: '❓', label: 'Помощь и поддержка' },
    { icon: '📄', label: 'Условия использования' },
  ];

  function render() {
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    const name = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Трейдер';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const page = Utils.el('page-profile');
    page.innerHTML = `
      <!-- Avatar & Info -->
      <div class="glass-card mb-16" style="padding:24px 16px 20px">
        <div class="profile-avatar">${initials}</div>
        <div class="profile-name">${name}</div>
        <div class="profile-level">Pro Трейдер · с марта 2023</div>
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

      <!-- Subscription -->
      <div class="glass-card mb-16" style="padding:16px;background:linear-gradient(135deg,rgba(74,158,255,0.15),rgba(123,95,255,0.1));border-color:rgba(74,158,255,0.25)">
        <div class="flex-between">
          <div>
            <div style="font-size:14px;font-weight:700">NOVA Pro</div>
            <div class="text-secondary fs-12 mt-4">Действует до 01.08.2025</div>
          </div>
          <button class="portfolio-btn primary" style="flex:0;padding:8px 16px;font-size:13px">Продлить</button>
        </div>
      </div>

      <!-- Settings -->
      <div class="glass-card" style="padding:8px 0">
        <div class="settings-list">
          ${settingsItems.map((item, i) => `
            ${i > 0 ? '<div class="settings-divider"></div>' : ''}
            <div class="settings-item">
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
      </div>

      <div style="text-align:center;margin-top:24px;margin-bottom:8px">
        <button style="background:rgba(255,92,92,0.1);border:1px solid rgba(255,92,92,0.2);color:#FF5C5C;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;font-family:var(--font-main);cursor:pointer">
          Выйти из аккаунта
        </button>
      </div>
      <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:8px">NOVA v2.4.1</div>
    `;
  }

  return { render };
})();