const OverviewPage = (() => {
  const priceCards = [
    { symbol: 'BTC', pair: 'BTC/USDT', iconClass: 'btc', icon: '₿' },
    { symbol: 'AAPL', pair: 'AAPL', iconClass: 'aapl', icon: '🍎' },
  ];

  const news = [
    { time: '15:30', title: 'Биткоин обновил месячный максимум на фоне роста институционального спроса', tag: 'BTC' },
    { time: '14:45', title: 'Apple представила отчёт за квартал: выручка выше ожиданий', tag: 'AAPL' },
    { time: '13:20', title: 'Ethereum готовится к обновлению сети: что ожидать инвесторам', tag: 'ETH' },
  ];

  let unsubFns = [];
  let priceData = {};

  async function loadPrices() {
    for (const c of priceCards) {
      const data = await Backend.getPrice(c.symbol);
      if (data.price) {
        priceData[c.symbol] = { price: data.price, change: 0 };
      } else {
        const stockData = await Backend.getStock(c.symbol);
        if (stockData.price) {
          priceData[c.symbol] = { price: stockData.price, change: 0 };
        }
      }
    }
  }

  async function render() {
    unsubFns.forEach(fn => fn());
    unsubFns = [];

    await loadPrices();

    const page = Utils.el('page-overview');
    page.innerHTML = `
      <!-- Top price cards -->
      <div class="scroll-x mb-12">
        ${priceCards.map((c, i) => {
          const d = priceData[c.symbol] || { price: 0, change: 0 };
          return `
          <div class="glass-card price-card slide-up stagger-${i+1}" id="pcard-${c.symbol}" data-symbol="${c.symbol}">
            <div class="price-card-header">
              <div class="price-card-symbol">
                <div class="price-card-icon ${c.iconClass}">${c.icon}</div>
                ${c.pair}
              </div>
              <button class="ext-link-btn" data-chart="${c.symbol}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>
            </div>
            <div class="price-value text-mono" id="pcard-val-${c.symbol}">${Utils.formatPrice(d.price)}</div>
            <div class="price-change ${Utils.changeClass(d.change)}" id="pcard-chg-${c.symbol}">${Utils.formatChange(d.change)}</div>
            <div class="mini-chart-wrap" id="mini-tv-${c.symbol}"></div>
          </div>`;
        }).join('')}
      </div>

      <!-- Main Chart (TradingView) -->
      <div class="glass-card mb-12 slide-up stagger-2" style="overflow:hidden">
        <div class="chart-header">
          <button class="chart-symbol-select" id="chart-sym-btn">BTC/USDT</button>
          <div class="flex gap-8" style="align-items:center">
            <div class="timeframe-tabs" id="tf-tabs">
              ${[['1м','1'],['5м','5'],['15м','15'],['1Ч','60'],['4Ч','240'],['1Д','D']].map(([label, tf]) =>
                `<button class="tf-btn${label==='1Ч'?' active':''}" data-tf="${tf}">${label}</button>`
              ).join('')}
            </div>
          </div>
        </div>
        <div id="overview-tv-chart" style="height:280px;width:100%"></div>
      </div>

      <!-- News -->
      <div class="glass-card mb-12 slide-up stagger-3" style="padding:14px 16px">
        <div class="section-header">
          <span class="section-title">Новости</span>
          <button class="section-link" id="news-see-all">Смотреть все</button>
        </div>
        ${news.map((n, i) => `
          <div>
            ${i > 0 ? '<div class="divider"></div>' : ''}
            <div class="news-item">
              <span class="news-time">${n.time}</span>
              <div class="news-body">
                <div class="news-title">${n.title}</div>
              </div>
              <span class="tag">${n.tag}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Alerts -->
      <div class="glass-card slide-up stagger-4" style="padding:14px 16px">
        <div class="section-header">
          <span class="section-title">Оповещения</span>
          <button class="section-link" id="alerts-see-all">Все оповещения</button>
        </div>
        <div id="alerts-list">Загрузка...</div>
      </div>
    `;

    // Init TradingView
    setTimeout(() => {
      initMainChart('BTC', '60');
      bindEvents(page);
    }, 100);
  }

  function initMainChart(symbol, interval) {
    const container = Utils.el('overview-tv-chart');
    if (!container) return;
    container.innerHTML = '';

    new TradingView.widget({
      autosize: true,
      symbol: 'BINANCE:BTCUSDT',
      interval: interval,
      timezone: 'Europe/Moscow',
      theme: 'dark',
      style: '1',
      locale: 'ru',
      toolbar_bg: 'transparent',
      enable_publishing: false,
      allow_symbol_change: false,
      container_id: 'overview-tv-chart',
      hide_top_toolbar: true,
      hide_legend: false,
      save_image: false,
      backgroundColor: 'rgba(0,0,0,0)',
      gridColor: 'rgba(255,255,255,0.04)',
    });
  }

  function bindEvents(page) {
    // Timeframe buttons
    Utils.qsa('.tf-btn', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.tf-btn', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initMainChart('BTC', btn.dataset.tf);
      });
    });

    // Price card click -> markets
    Utils.qsa('.price-card', page).forEach(card => {
      card.addEventListener('click', () => App.navigate('markets'));
    });

    // News "Смотреть все"
    Utils.el('news-see-all')?.addEventListener('click', () => {
      const panel = Utils.el('news-panel');
      if (panel) panel.classList.add('open');
    });

    // Alerts "Все оповещения"
    Utils.el('alerts-see-all')?.addEventListener('click', () => {
      const panel = Utils.el('notif-panel');
      if (panel) panel.classList.add('open');
    });

    // Закрытие панелей
    Utils.el('close-news')?.addEventListener('click', () => {
      Utils.el('news-panel')?.classList.remove('open');
    });
    Utils.el('close-notif')?.addEventListener('click', () => {
      Utils.el('notif-panel')?.classList.remove('open');
    });

    // Загружаем оповещения
    loadAlerts();
  }

  async function loadAlerts() {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!userId) {
      Utils.el('alerts-list').innerHTML = '<div style="color:var(--text-muted);font-size:13px">Войдите в Telegram</div>';
      return;
    }
    const data = await Backend.getAlerts(userId);
    const alerts = data.price || [];
    if (!alerts.length) {
      Utils.el('alerts-list').innerHTML = '<div style="color:var(--text-muted);font-size:13px">Нет активных оповещений</div>';
      return;
    }
    Utils.el('alerts-list').innerHTML = alerts.map(a => `
      <div class="alert-item">
        <div class="alert-icon">💰</div>
        <div class="alert-body">
          <div class="alert-symbol">${a.symbol}</div>
          <div class="alert-desc">${a.condition === 'above' ? 'Выше' : 'Ниже'} $${a.price}</div>
        </div>
        <div class="alert-meta">
          <div class="alert-time">${a.interval ? 'каждые '+a.interval+'с' : 'одноразово'}</div>
        </div>
      </div>
    `).join('');
  }

  return { render };
})();