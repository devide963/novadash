const MarketsPage = (() => {
  const assetConfig = {
    BTC:   { iconClass: 'btc',  icon: '₿',  pair: 'BTC/USDT' },
    ETH:   { iconClass: 'eth',  icon: 'Ξ',  pair: 'ETH/USDT' },
    SOL:   { iconClass: 'sol',  icon: '◎',  pair: 'SOL/USDT' },
    BNB:   { iconClass: 'bnb',  icon: 'B',  pair: 'BNB/USDT' },
    ADA:   { iconClass: 'eth',  icon: '₳',  pair: 'ADA/USDT' },
    DOGE:  { iconClass: 'btc',  icon: 'Ð',  pair: 'DOGE/USDT' },
    XRP:   { iconClass: 'eth',  icon: '✕',  pair: 'XRP/USDT' },
    AVAX:  { iconClass: 'sol',  icon: 'A',  pair: 'AVAX/USDT' },
    DOT:   { iconClass: 'eth',  icon: '●',  pair: 'DOT/USDT' },
    LINK:  { iconClass: 'sol',  icon: '⬡',  pair: 'LINK/USDT' },
    AAPL:  { iconClass: 'aapl', icon: '🍎', pair: 'AAPL' },
    TSLA:  { iconClass: 'tsla', icon: '⚡', pair: 'TSLA' },
    NVDA:  { iconClass: 'sol',  icon: 'N',  pair: 'NVDA' },
    MSFT:  { iconClass: 'spy',  icon: '⬛', pair: 'MSFT' },
    GOOGL: { iconClass: 'spy',  icon: 'G',  pair: 'GOOGL' },
    AMZN:  { iconClass: 'btc',  icon: '📦', pair: 'AMZN' },
    META:  { iconClass: 'spy',  icon: 'M',  pair: 'META' },
    SPY:   { iconClass: 'spy',  icon: 'S',  pair: 'SPY' },
    GOLD:  { iconClass: 'gold', icon: '🥇', pair: 'XAU/USD' },
    SILVER:{ iconClass: 'gold', icon: '🥈', pair: 'XAG/USD' },
    EURUSD:{ iconClass: 'eth',  icon: '€',  pair: 'EUR/USD' },
    GBPUSD:{ iconClass: 'eth',  icon: '£',  pair: 'GBP/USD' },
    USDJPY:{ iconClass: 'aapl', icon: '¥',  pair: 'USD/JPY' },
  };

  let currentFilter = 'Все';
  let searchQuery   = '';
  let unsubFns      = [];

  function render() {
    unsubFns.forEach(fn => fn());
    unsubFns = [];

    const page = Utils.el('page-markets');
    page.innerHTML = `
      <div class="section-title mb-12">Рынки</div>

      <div class="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Поиск активов..." id="market-search" value="${searchQuery}" autocomplete="off"/>
      </div>

      <div class="filter-tabs">
        ${['Все','Крипто','Акции','Металлы','Форекс'].map(f =>
          `<button class="filter-tab${f === currentFilter ? ' active' : ''}" data-filter="${f}">${f}</button>`
        ).join('')}
      </div>

      <div class="glass-card" style="padding:0 16px" id="markets-list">
        <div style="padding:20px;text-align:center">
          <div class="spinner" style="margin:0 auto"></div>
        </div>
      </div>
    `;

    // Bind filters
    Utils.qsa('.filter-tab', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.filter-tab', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        updateList();
      });
    });

    // Bind search
    const searchEl = Utils.el('market-search');
    if (searchEl) {
      searchEl.addEventListener('input', Utils.debounce(() => {
        searchQuery = searchEl.value.toLowerCase();
        updateList();
      }, 200));
    }

    setTimeout(() => {
      updateList();
      startLiveUpdates(page);
    }, 80);
  }

  function getFilteredAssets() {
    const typeMap = {
      'Крипто': 'crypto',
      'Акции':  'stock',
      'Металлы':'metal',
      'Форекс': 'forex',
    };

    return Object.entries(assetConfig).filter(([sym]) => {
      const d = MarketAPI.getPrice(sym);
      if (!d) return false;
      if (currentFilter !== 'Все') {
        if (d.type !== typeMap[currentFilter]) return false;
      }
      if (searchQuery) {
        const cfg = assetConfig[sym];
        const fullName = (d.name || '').toLowerCase();
        if (!sym.toLowerCase().includes(searchQuery) &&
            !fullName.includes(searchQuery) &&
            !cfg.pair.toLowerCase().includes(searchQuery)) {
          return false;
        }
      }
      return true;
    });
  }

  function updateList() {
    const list = Utils.el('markets-list');
    if (!list) return;
    const filtered = getFilteredAssets();
    if (!filtered.length) {
      list.innerHTML = `
        <div style="padding:30px;text-align:center;color:var(--text-muted);font-size:13px">
          Ничего не найдено
        </div>`;
      return;
    }
    list.innerHTML = filtered.map(([sym, cfg], i) => {
      const d = MarketAPI.getPrice(sym) || { price: 0, change: 0 };
      return `
        <div>
          ${i > 0 ? '<div class="divider"></div>' : ''}
          <div class="market-row" data-symbol="${sym}">
            <div class="market-icon ${cfg.iconClass}">${cfg.icon}</div>
            <div class="market-info">
              <div class="market-name">${cfg.pair}</div>
              <div class="market-full">${d.name || sym}</div>
            </div>
            <div class="market-price-col">
              <div class="market-price" id="mp-${sym}">${Utils.formatPrice(d.price)}</div>
              <div class="market-change ${Utils.changeClass(d.change)}" id="mc-${sym}">${Utils.formatChange(d.change)}</div>
            </div>
          </div>
        </div>`;
    }).join('');

    // Bind row clicks
    Utils.qsa('.market-row', list).forEach(row => {
      row.addEventListener('click', () => {
        App.openChartModal(row.dataset.symbol);
      });
    });
  }

  function startLiveUpdates(page) {
    Object.keys(assetConfig).forEach(sym => {
      const unsub = MarketAPI.subscribe(sym, (data) => {
        const priceEl  = Utils.el(`mp-${sym}`);
        const changeEl = Utils.el(`mc-${sym}`);
        if (priceEl)  priceEl.textContent  = Utils.formatPrice(data.price);
        if (changeEl) {
          changeEl.textContent = Utils.formatChange(data.change);
          changeEl.className   = `market-change ${Utils.changeClass(data.change)}`;
        }
      });
      unsubFns.push(unsub);
    });
  }

  return { render };
})();