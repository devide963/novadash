const OverviewPage = (() => {
  let initialized = false;
  const priceCards = [
    { symbol: 'BTC', pair: 'BTC/USDT', iconClass: 'btc', icon: '₿', color: '#F7931A', chartColor: '#4A9EFF' },
    { symbol: 'AAPL', pair: 'AAPL',    iconClass: 'aapl', icon: '🍎', color: '#888', chartColor: '#3DD68C' },
  ];

  const news = [
    { time: '15:30', title: 'Биткоин обновил месячный максимум на фоне роста институционального спроса', tag: 'BTC' },
    { time: '14:45', title: 'Apple представила отчёт за квартал: выручка выше ожиданий', tag: 'AAPL' },
    { time: '13:20', title: 'Ethereum готовится к обновлению сети: что ожидать инвесторам', tag: 'ETH' },
  ];

  const alerts = [
    { symbol: 'BTC/USDT', desc: 'Цена выше 66,500 USDT', time: '15:41', active: true },
    { symbol: 'AAPL',      desc: 'Изменение цены более 1%',  time: '15:40', active: true },
  ];

  function render() {
    const page = Utils.el('page-overview');
    page.innerHTML = `
      <!-- Top price cards -->
      <div class="scroll-x mb-16" style="gap:10px">
        ${priceCards.map((c, i) => {
          const d = MarketAPI.getPrice(c.symbol);
          return `
          <div class="glass-card price-card slide-up stagger-${i+1}" id="pcard-${c.symbol}" style="min-width:160px;flex:1" data-symbol="${c.symbol}">
            <div class="price-card-header">
              <div class="price-card-symbol">
                <div class="price-card-icon ${c.iconClass}">${c.icon}</div>
                ${c.pair}
              </div>
              <button class="ext-link-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>
            </div>
            <div class="price-value text-mono" id="pcard-val-${c.symbol}">${Utils.formatPrice(d.price)}</div>
            <div class="price-change ${Utils.changeClass(d.change)}" id="pcard-chg-${c.symbol}">${Utils.formatChange(d.change)}</div>
            <div class="mini-chart" id="mini-chart-${c.symbol}"></div>
          </div>`;
        }).join('')}
      </div>

      <!-- Main Chart -->
      <div class="glass-card chart-section slide-up stagger-2 mb-16">
        <div style="padding:14px 14px 0">
          <div class="chart-header">
            <button class="chart-symbol-select" id="chart-sym-btn">
              BTC/USDT
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="flex gap-8 align-center">
              <div class="timeframe-tabs" id="tf-tabs">
                ${['1м','5м','15м','1Ч','4Ч','1Д'].map(tf => `<button class="tf-btn${tf==='1Ч'?' active':''}" data-tf="${tf==='1Ч'?'1H':tf==='4Ч'?'4H':tf==='1Д'?'1D':tf==='15м'?'15m':tf==='5м'?'5m':'1m'}">${tf}</button>`).join('')}
              </div>
              <button class="chart-settings-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div id="main-chart-container" style="height:260px;padding:0 8px 8px"></div>
      </div>

      <!-- News -->
      <div class="glass-card slide-up stagger-3 mb-16" style="padding:14px 16px">
        <div class="section-header">
          <span class="section-title">Новости</span>
          <button class="section-link" onclick="App.navigate('markets')">Смотреть все</button>
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
          <button class="section-link" onclick="App.navigate('profile')">Все оповещения</button>
        </div>
        ${alerts.map((a, i) => `
          <div>
            ${i > 0 ? '<div class="divider"></div>' : ''}
            <div class="alert-item">
              <div class="alert-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
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

    // Init charts after DOM ready
    setTimeout(() => {
      ChartManager.createMainChart('main-chart-container');
      priceCards.forEach(c => {
        ChartManager.createMiniChart(`mini-chart-${c.symbol}`, c.symbol, c.chartColor);
      });

      // Timeframe buttons
      Utils.qsa('.tf-btn', page).forEach(btn => {
        btn.addEventListener('click', () => {
          Utils.qsa('.tf-btn', page).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          ChartManager.setTimeframe(btn.dataset.tf);
        });
      });

      // Price card click → navigate to markets
      Utils.qsa('.price-card', page).forEach(card => {
        card.addEventListener('click', () => App.navigate('markets'));
      });

      // Live price updates
      priceCards.forEach(c => {
        MarketAPI.subscribe(c.symbol, (data) => {
          const valEl = Utils.el(`pcard-val-${c.symbol}`);
          const chgEl = Utils.el(`pcard-chg-${c.symbol}`);
          if (valEl) valEl.textContent = Utils.formatPrice(data.price);
          if (chgEl) {
            chgEl.textContent = Utils.formatChange(data.change);
            chgEl.className = `price-change ${Utils.changeClass(data.change)}`;
          }
        });
      });
    }, 50);

    initialized = true;
  }

  return { render };
})();