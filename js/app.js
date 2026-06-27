const App = (() => {
  let currentPage = 'overview';
  const pages = ['overview', 'markets', 'signals', 'portfolio', 'profile'];
  const renderFns = {
    overview:  () => OverviewPage.render(),
    markets:   () => MarketsPage.render(),
    signals:   () => SignalsPage.render(),
    portfolio: () => PortfolioPage.render(),
    profile:   () => ProfilePage.render(),
  };

  function init() {
    // Telegram WebApp init
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#050d1a');
      tg.setBackgroundColor('#050d1a');
    }

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    // Nav
    Utils.qsa('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.page));
    });

    // Notification panel button
    Utils.el('notification-btn')?.addEventListener('click', showNotifications);

    // Render initial page
    navigate('overview');
  }

  function navigate(pageId) {
    if (!pages.includes(pageId)) return;

    // Update nav
    Utils.qsa('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    // Switch pages
    Utils.qsa('.page').forEach(p => p.classList.remove('active'));
    const pageEl = Utils.el(`page-${pageId}`);
    if (pageEl) {
      pageEl.classList.add('active');
      // Re-render on each visit for live data
      renderFns[pageId]?.();
    }

    currentPage = pageId;
  }

  function updateClock() {
    const el = Utils.el('header-time');
    if (el) {
      const now = new Date();
      el.textContent = Utils.formatTime(now) + ' UTC+3';
    }
  }

  function showNotifications() {
    let panel = Utils.el('notif-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'notif-panel';
      panel.className = 'notif-panel';
      panel.innerHTML = `
        <div class="notif-panel-header">
          <span class="notif-panel-title">Уведомления</span>
          <button class="close-btn" id="close-notif">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style="padding:16px;overflow-y:auto;flex:1">
          ${[
            { title: 'BTC/USDT', desc: 'Цена выше 66,500 USDT', time: '15:41' },
            { title: 'AAPL',     desc: 'Изменение цены более 1%',  time: '15:40' },
            { title: 'ETH/USDT', desc: 'Новый сигнал: ПОКУПКА',    time: '15:20' },
            { title: 'SOL/USDT', desc: 'TP достигнут +8.3%',       time: '14:30' },
          ].map((n, i) => `
            <div class="glass-card" style="padding:14px 16px;margin-bottom:10px">
              <div class="flex-between">
                <div class="alert-symbol">${n.title}</div>
                <div class="fs-12" style="color:var(--text-muted)">${n.time}</div>
              </div>
              <div class="text-secondary fs-13 mt-4">${n.desc}</div>
            </div>
          `).join('')}
        </div>
      `;
      document.getElementById('app').appendChild(panel);
      panel.querySelector('#close-notif').addEventListener('click', () => {
        panel.classList.remove('open');
        Utils.el('notif-badge').style.display = 'none';
      });
    }
    panel.classList.add('open');
  }

  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', () => App.init());