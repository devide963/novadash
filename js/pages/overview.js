const OverviewPage = (() => {
  const priceCards = [
    { symbol: 'BTC',  pair: 'BTC/USDT', iconClass: 'btc',  icon: '₿', tvSym: '1H' },
    { symbol: 'AAPL', pair: 'AAPL',     iconClass: 'aapl', icon: '🍎', tvSym: '1H' },
  ];

  const news = [
    { time: '15:30', title: 'Биткоин обновил месячный максимум на фоне роста институционального спроса', tag: 'BTC' },
    { time: '14:45', title: 'Apple представила отчёт за квартал: выручка выше ожиданий', tag: 'AAPL' },
    { time: '13:20', title: 'Ethereum готовится к обновлению сети: что ожидать инвесторам', tag: 'ETH' },
  ];

  const alertsData = [
    { symbol: 'BTC/USDT', desc: 'Цена выше 66 500 USDT', time: '15:41', active: true },
    { symbol: 'AAPL',     desc: 'Изменение цены более 1%', time: '15:40', active: true },
  ];

  let unsubFns = [];
  let currentTF = '1H';

  function render() {
    unsubFns.forEach(fn => fn());
    unsubFns = [];

    const page = Utils.el('page-overview');
    const btc  = MarketAPI.getPrice('BTC');
    const aapl = MarketAPI.getPrice('AAPL');

    page.innerHTML = `
      <!-- Top price cards -->
      <div class="scroll-x mb-12">
        ${priceCards.map((c, i) => {
          const d = MarketAPI.getPrice(c.symbol);
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
            <div class="price-value text-mono" id="pcard-val-${c.symbol}">${Utils.formatPrice(d ? d.price : 0)}</div>
            <div class="price-change ${Utils.changeClass(d ? d.change : 0)}" id="pcard-chg-${c.symbol}">${Utils.formatChange(d ? d.change : 0)}</div>
            <div class="mini-chart-wrap" id="mini-tv-${c.symbol}"></div>
          </div>`;
        }).join('')}
      </div>

      <!-- Main Chart (TradingView widget) -->
      <div class="glass-card mb-12 slide-up stagger-2" style="overflow:hidden">
        <div class="chart-header">
          <button class="chart-symbol-select" id="chart-sym-btn">
            BTC/USDT
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="flex gap-8" style="align-items:center">
            <div class="timeframe-tabs" id="tf-tabs">
              ${[['1м','1'],['5м','5'],['15м','15'],['1Ч','60'],['4Ч','240'],['1Д','D']].map(([label, tf]) =>
                `<button class="tf-btn${label==='1Ч'?' active':''}" data-tf="${tf}">${label}</button>`
              ).join('')}
            </div>
            <button class="chart-settings-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div id="overview-tv-chart" style="height:280px;width:100%"></div>
      </div>

      <!-- News -->
      <div class="glass-card mb-12 slide-up stagger-3" style="padding:14px 16px">
        <div class="section-header">
          <span class="section-title">Новости</span>
          <button class="section-link">Смотреть все</button>
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
          <button class="section-link">Все оповещения</button>
        </div>
        ${alertsData.map((a, i) => `
          <div>
            ${i > 0 ? '<div class="divider"></div>' : ''}
            <div class="alert-item">
              <div class="alert-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              <div class="alert-body">
                <div class="alert-symbol">${a.symbol}</div>
                <div class="alert-desc">${a.desc}</div>
              </div>
              <div class="alert-meta">
                <div class="alert-time">${a.time}</div>
                ${a.active ? '<div class="alert-dot"></div>' : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Init TradingView main chart
    setTimeout(() => {
      initMainChart('BTC', '60');
      initMiniCharts();
      bindEvents(page);
    }, 60);
  }

  function initMainChart(symbol, interval) {
    const container = Utils.el('overview-tv-chart');
    if (!container) return;
    container.innerHTML = '';

    new TradingView.widget({
      autosize: true,
      symbol: MarketAPI.getTVSymbol(symbol),
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

  function initMiniCharts() {
    // Mini sparklines as inline SVG (lightweight, no external dep)
    priceCards.forEach(c => {
      const data = MarketAPI.generateLineData(c.symbol, 30);
      const wrap = Utils.el(`mini-tv-${c.symbol}`);
      if (!wrap || data.length < 2) return;
      wrap.innerHTML = renderSparkline(data, c.symbol);
    });
  }

  function renderSparkline(data, symbol) {
    const vals = data.map(d => d.value);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const range = max - min || 1;
    const W = 150, H = 44;
    const pts = vals.map((v, i) =>
      `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * H}`
    ).join(' ');
    const d = MarketAPI.getPrice(symbol);
    const isUp = d && d.change >= 0;
    const color = isUp ? '#34D399' : '#F87171';
    return `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sg-${symbol}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="0,${H} ${pts} ${W},${H}" fill="url(#sg-${symbol})"/>
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
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

    // Ext link buttons open TV chart modal
    Utils.qsa('[data-chart]', page).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.openChartModal(btn.dataset.chart);
      });
    });

    // Price card click
    Utils.qsa('.price-card', page).forEach(card => {
      card.addEventListener('click', () => App.navigate('markets'));
    });

    // Live price update
    priceCards.forEach(c => {
      const unsub = MarketAPI.subscribe(c.symbol, (data) => {
        const valEl = Utils.el(`pcard-val-${c.symbol}`);
        const chgEl = Utils.el(`pcard-chg-${c.symbol}`);
        if (valEl) valEl.textContent = Utils.formatPrice(data.price);
        if (chgEl) {
          chgEl.textContent = Utils.formatChange(data.change);
          chgEl.className = `price-change ${Utils.changeClass(data.change)}`;
        }
      });
      unsubFns.push(unsub);
    });
  }

  return { render };
})();