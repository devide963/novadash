const MarketsPage = (() => {
  const assets = [
    { symbol: 'BTC',  full: 'Bitcoin',       icon: '₿',  iconClass: 'btc',  pair: 'BTC/USDT' },
    { symbol: 'ETH',  full: 'Ethereum',       icon: 'Ξ',  iconClass: 'eth',  pair: 'ETH/USDT' },
    { symbol: 'AAPL', full: 'Apple Inc.',     icon: '🍎', iconClass: 'aapl', pair: 'AAPL' },
    { symbol: 'GOLD', full: 'Gold Spot',      icon: '🥇', iconClass: 'gold', pair: 'XAU/USD' },
    { symbol: 'SOL',  full: 'Solana',         icon: '◎',  iconClass: 'eth',  pair: 'SOL/USDT' },
    { symbol: 'BNB',  full: 'BNB Chain',      icon: 'B',  iconClass: 'btc',  pair: 'BNB/USDT' },
  ];

  let currentFilter = 'Все';

  function render() {
    const page = Utils.el('page-markets');
    page.innerHTML = `
      <div class="section-title mb-16">Рынки</div>
      
      <div class="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Поиск активов..." id="market-search" />
      </div>

      <div class="filter-tabs">
        ${['Все','Крипто','Акции','Форекс','Металлы'].map(f => 
          `<button class="filter-tab${f===currentFilter?' active':''}" data-filter="${f}">${f}</button>`
        ).join('')}
      </div>

      <div class="glass-card" style="padding:0 16px" id="markets-list">
        ${renderList(assets)}
      </div>
    `;

    // Filter tabs
    Utils.qsa('.filter-tab', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.filter-tab', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        updateList();
      });
    });

    // Search
    const searchEl = Utils.el('market-search');
    searchEl?.addEventListener('input', updateList);

    // Live updates
    assets.forEach(a => {
      MarketAPI.subscribe(a.symbol, (data) => {
        const row = page.querySelector(`[data-market="${a.symbol}"]`);
        if (!row) return;
        row.querySelector('.market-price').textContent = Utils.formatPrice(data.price, a.symbol === 'BTC' ? 2 : 2);
        const chgEl = row.querySelector('.market-change');
        chgEl.textContent = Utils.formatChange(data.change);
        chgEl.className = `market-change ${Utils.changeClass(data.change)}`;
      });
    });

    function updateList() {
      const q = Utils.el('market-search')?.value.toLowerCase() || '';
      const filterMap = { 'Крипто': ['BTC','ETH','SOL','BNB'], 'Акции': ['AAPL'], 'Металлы': ['GOLD'] };
      const allowed = filterMap[currentFilter];
      const filtered = assets.filter(a => {
        const matchFilter = !allowed || allowed.includes(a.symbol);
        const matchSearch = !q || a.symbol.toLowerCase().includes(q) || a.full.toLowerCase().includes(q);
        return matchFilter && matchSearch;
      });
      Utils.el('markets-list').innerHTML = renderList(filtered);
    }
  }

  function renderList(list) {
    if (!list.length) return '<div style="padding:30px;text-align:center;color:var(--text-muted)">Ничего не найдено</div>';
    return list.map((a, i) => {
      const d = MarketAPI.getPrice(a.symbol) || { price: 0, change: 0 };
      return `
        <div>
          ${i > 0 ? '<div class="divider" style="margin:0"></div>' : ''}
          <div class="market-row" data-market="${a.symbol}">
            <div class="market-icon ${a.iconClass}">${a.icon}</div>
            <div class="market-info">
              <div class="market-name">${a.pair}</div>
              <div class="market-full">${a.full}</div>
            </div>
            <div class="market-price-col">
              <div class="market-price">${Utils.formatPrice(d.price)}</div>
              <div class="market-change ${Utils.changeClass(d.change)}">${Utils.formatChange(d.change)}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  return { render };
})();