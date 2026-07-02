const MarketsPage = (() => {
  const FINNHUB_KEY = 'd934s4pr01qpou39j2ggd934s4pr01qpou39j2h0';
  let currentTab = 'crypto';
  let searchQuery = '';

  // --- Получение иконки ---
  function getIconHtml(symbol, type) {
    const base = 'https://s3-symbol-logo.tradingview.com';
    if (type === 'crypto') {
      const cryptoUrl = `${base}/crypto/XTVC${symbol}.svg`;
      return `<img src="${cryptoUrl}" alt="${symbol}" width="24" height="24" loading="lazy" style="border-radius:50%;background:rgba(255,255,255,0.05);object-fit:contain" onerror="this.style.display='none'">`;
    } else if (type === 'stocks') {
      const stockUrl = `https://finnhub.io/api/logo?symbol=${symbol}&token=${FINNHUB_KEY}`;
      return `<img src="${stockUrl}" alt="${symbol}" width="24" height="24" loading="lazy" style="border-radius:50%;background:rgba(255,255,255,0.05);object-fit:contain" onerror="this.style.display='none'">`;
    } else {
      return `<div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#3B9EFF,#7B5FFF);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px">${symbol.slice(0,3)}</div>`;
    }
  }

  // --- Рендер ---
  async function render() {
    const page = Utils.el('page-markets');
    page.innerHTML = `
      <div class="section-title mb-12">Рынки</div>
      
      <div class="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Поиск актива..." id="market-search" autocomplete="off" />
      </div>

      <div class="filter-tabs">
        ${['crypto', 'stocks', 'forex'].map(tab => `
          <button class="filter-tab ${tab === currentTab ? 'active' : ''}" data-tab="${tab}">
            ${tab === 'crypto' ? '🪙 Криптовалюта' : tab === 'stocks' ? '📈 Акции' : '💱 Валюта'}
          </button>
        `).join('')}
      </div>

      <div id="markets-list">Загрузка...</div>
    `;

    // Переключение вкладок
    Utils.qsa('.filter-tab', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.filter-tab', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        searchQuery = '';
        const searchInput = Utils.el('market-search');
        if (searchInput) searchInput.value = '';
        renderTab();
      });
    });

    // Поиск
    const searchInput = Utils.el('market-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        searchQuery = e.target.value.trim().toUpperCase();
        renderTab();
      }, 300));
    }

    await renderTab();
  }

  async function renderTab() {
    const list = Utils.el('markets-list');
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

    try {
      const data = await Backend.getMarkets();
      if (!Array.isArray(data)) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных</div>';
        return;
      }

      // Фильтруем по типу (заглушка, т.к. бекенд пока не возвращает тип)
      let filtered = data;
      if (currentTab === 'crypto') {
        filtered = data.filter(item => ['BTC','ETH','SOL','BNB','ADA','DOGE','XRP','AVAX','DOT','LINK','MATIC','UNI','ATOM','FTM','NEAR','ARB','OP','INJ','SEI','APT','SUI','RNDR','GRT','AAVE'].includes(item.symbol));
      } else if (currentTab === 'stocks') {
        filtered = data.filter(item => ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','BRK.B','JPM','V','JNJ','WMT','PG','MA','UNH','HD','DIS','NFLX','PYPL','ADBE','CRM','ORCL','IBM','CSCO','KO','PEP','MCD','NKE','SBUX','T','VZ','SPY','QQQ','GLD','SLV'].includes(item.symbol));
      } else {
        // Валюты
        filtered = data.filter(item => ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD','EURGBP'].includes(item.symbol));
      }

      // Поиск
      if (searchQuery) {
        filtered = filtered.filter(item => item.symbol.toUpperCase().includes(searchQuery));
      }

      if (filtered.length === 0) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Ничего не найдено</div>';
        return;
      }

      list.innerHTML = filtered.map(item => `
        <div class="market-row">
          <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${getIconHtml(item.symbol, currentTab)}
          </div>
          <div class="market-info">
            <div class="market-name">${item.symbol}</div>
            <div class="market-full">${item.symbol}</div>
          </div>
          <div class="market-price-col">
            <div class="market-price">$${Utils.formatPrice(item.price)}</div>
            <div class="market-change ${Utils.changeClass(item.change || 0)}">${Utils.formatChange(item.change || 0)}</div>
          </div>
        </div>
      `).join('');

    } catch (e) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Ошибка загрузки</div>';
    }
  }

  return { render };
})();