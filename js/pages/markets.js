const MarketsPage = (() => {
  const FINNHUB_KEY = 'd934s4pr01qpou39j2ggd934s4pr01qpou39j2h0';
  let currentTab = 'crypto';
  let currentSubTab = 'usa';
  let searchQuery = '';
  let priceCache = {};
  let isLoading = false;

  function getIconHtml(symbol, type) {
    const base = 'https://s3-symbol-logo.tradingview.com';
    if (type === 'crypto') {
      return `<img src="${base}/crypto/XTVC${symbol}.svg" alt="${symbol}" width="24" height="24" loading="lazy" style="border-radius:50%;background:rgba(255,255,255,0.05);object-fit:contain" onerror="this.style.display='none'">`;
    } else if (type === 'stocks' || type === 'stocks_usa' || type === 'stocks_ru') {
      return `<img src="https://finnhub.io/api/logo?symbol=${symbol}&token=${FINNHUB_KEY}" alt="${symbol}" width="24" height="24" loading="lazy" style="border-radius:50%;background:rgba(255,255,255,0.05);object-fit:contain" onerror="this.style.display='none'">`;
    } else {
      return `<div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#3B9EFF,#7B5FFF);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px">${symbol.slice(0,3)}</div>`;
    }
  }

  async function fetchPrice(symbol) {
    if (priceCache[symbol]) return priceCache[symbol];
    try {
      let data = await Backend.getPrice(symbol);
      if (data && data.price) {
        const change = data.change !== undefined && data.change !== null ? data.change : null;
        priceCache[symbol] = { price: data.price, change: change };
        return priceCache[symbol];
      }
      data = await Backend.getStock(symbol);
      if (data && data.price) {
        const change = data.change !== undefined && data.change !== null ? data.change : null;
        priceCache[symbol] = { price: data.price, change: change };
        return priceCache[symbol];
      }
      priceCache[symbol] = { price: 0, change: null };
      return priceCache[symbol];
    } catch {
      priceCache[symbol] = { price: 0, change: null };
      return priceCache[symbol];
    }
  }

  async function fetchPrices(symbols) {
    const batchSize = 10;
    const results = {};
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(sym => fetchPrice(sym));
      const prices = await Promise.all(promises);
      batch.forEach((sym, idx) => {
        results[sym] = prices[idx];
      });
    }
    return results;
  }

  async function searchTV(query, type) {
    if (!query || query.length < 1) return [];
    try {
      const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(query)}&lang=ru&type=${type}`;
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.map(item => ({
        symbol: item.symbol.replace('BINANCE:', '').replace('NASDAQ:', '').replace('AMEX:', '').replace('MOEX:', ''),
        fullName: item.description,
        type: item.type
      }));
    } catch {
      return [];
    }
  }

  const POPULAR = {
    crypto: ['BTC','ETH','SOL','BNB','ADA','DOGE','XRP','AVAX','DOT','LINK','MATIC','UNI','ATOM','FTM','NEAR','ARB','OP','INJ','SEI','APT','SUI','RNDR','GRT','AAVE','MKR','CRV','ICP','FIL','VET','EOS','NEO','XLM','ALGO','HBAR','KAS','ETC','LTC','BCH','BSV','ZEC','XMR','DASH','XTZ','ZIL','EGLD','FLOW','THETA','HNT','KSM','WAVES','NEXO','CRO','LEO','OKB','BTT','HOT','ONE','ENJ','CHR','SAND','MANA','AXS','YFI','COMP','SUSHI','CAKE','BAKE','LRC','ZRX','BAT','KAVA','SCRT','ROSE','CFX','CKB','ONT','IOST','ALGO','HBAR','XDC','QNT','DGB','SC','BTM','NANO','RVN','DCR','ZEN','XZC','PIVX','PART','QTUM','STEEM','LISK','ARDR','WAN','VET','VTHO'],
    usa_stocks: ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','BRK.B','JPM','V','JNJ','WMT','PG','MA','UNH','HD','DIS','NFLX','PYPL','ADBE','CRM','ORCL','IBM','CSCO','KO','PEP','MCD','NKE','SBUX','T','VZ','SPY','QQQ','GLD','SLV','BA','CAT','CVX','XOM','GE','GS','HON','INTC','MMM','MRK','PFE','RTX','TMO','UNP','UPS','WBA','WFC','ABT','AMGN','AXP','BLK','C','COP','DE','F','GM','JCI','LMT','LOW','MDT','MET','MS','NEE','NOV','PM','QCOM','SBUX','TGT','TMUS','UNH','UNP','USB','XOM','ZTS'],
    ru_stocks: ['SBER','GAZP','ROSN','LKOH','NVTK','MGNT','YNDX','TCS','PLZL','CHMF','NLMK','SNGS','TATN','SURG','IRAO','FEES','RUAL','NORN','TRNFP','RTKM','MOEX','BSPB','MRKV','MSNG','MRKP','VKCO','OZON','FIVE','MAGN','FLOT','ASTR','GLTR','DSKY','RBCM','SMLT','LENT','MTS','MVID','YPRO','PASH','TECH'],
    forex: ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD','EURGBP','EURJPY','GBPJPY','AUDJPY','CADJPY','CHFJPY','EURAUD','EURCAD','EURCHF','GBPAUD','GBPCAD','GBPCHF','AUDCAD','AUDCHF','CADCHF','NZDJPY','NZDCAD','NZDCHF','EURTRY','USDTRY','USDMXN','USDZAR','USDSEK','USDNOK','USDSGD','USDHKD']
  };

  async function render() {
    const page = Utils.el('page-markets');
    page.innerHTML = `
      <div class="section-title mb-12">Рынки</div>
      
      <div class="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Поиск актива (BTC, AAPL, SBER...)" id="market-search" autocomplete="off" />
        <div id="search-spinner" style="display:none;width:16px;height:16px;border:2px solid var(--glass-border);border-top-color:var(--blue-primary);border-radius:50%;animation:spin .7s linear infinite"></div>
      </div>

      <div class="filter-tabs">
        ${['crypto', 'stocks', 'forex'].map(tab => `
          <button class="filter-tab ${tab === currentTab ? 'active' : ''}" data-tab="${tab}">
            ${tab === 'crypto' ? '🪙 Криптовалюта' : tab === 'stocks' ? '📈 Акции' : '💱 Валюта'}
          </button>
        `).join('')}
      </div>

      ${currentTab === 'stocks' ? `
        <div class="filter-tabs mt-8" style="gap:4px;margin-bottom:12px">
          ${[
            { id: 'usa', label: '🇺🇸 Американские' },
            { id: 'ru', label: '🇷🇺 Российские' }
          ].map(sub => `
            <button class="filter-tab ${sub.id === currentSubTab ? 'active' : ''}" data-subtab="${sub.id}" style="font-size:12px;padding:4px 12px">
              ${sub.label}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div id="markets-list">Загрузка...</div>
    `;

    Utils.qsa('.filter-tab[data-tab]', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.filter-tab[data-tab]', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        currentSubTab = 'usa';
        searchQuery = '';
        const searchInput = Utils.el('market-search');
        if (searchInput) searchInput.value = '';
        renderTab();
      });
    });

    Utils.qsa('.filter-tab[data-subtab]', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.filter-tab[data-subtab]', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSubTab = btn.dataset.subtab;
        searchQuery = '';
        const searchInput = Utils.el('market-search');
        if (searchInput) searchInput.value = '';
        renderTab();
      });
    });

    const searchInput = Utils.el('market-search');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value.trim().toUpperCase();
        if (val.length < 1) {
          searchQuery = '';
          renderTab();
          return;
        }
        debounceTimer = setTimeout(() => {
          searchQuery = val;
          renderTab();
        }, 300);
      });
    }

    await renderTab();
  }

  async function renderTab() {
    if (isLoading) return;
    isLoading = true;

    const list = Utils.el('markets-list');
    const spinner = Utils.el('search-spinner');
    if (spinner) spinner.style.display = 'none';

    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

    try {
      let results = [];

      if (searchQuery && searchQuery.length >= 1) {
        if (spinner) spinner.style.display = 'block';
        const priceData = await fetchPrice(searchQuery);
        if (spinner) spinner.style.display = 'none';

        if (priceData.price > 0) {
          results = [{
            symbol: searchQuery,
            fullName: searchQuery,
            price: priceData.price,
            change: priceData.change,
            type: currentTab
          }];
        } else {
          const tvResults = await searchTV(searchQuery, currentTab === 'crypto' ? 'crypto' : 'stock');
          if (tvResults.length > 0) {
            const prices = await fetchPrices(tvResults.map(item => item.symbol));
            results = tvResults.map(item => ({
              symbol: item.symbol,
              fullName: item.fullName || item.symbol,
              price: prices[item.symbol]?.price || 0,
              change: prices[item.symbol]?.change || null,
              type: currentTab
            }));
          }
        }

        if (results.length === 0) {
          list.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-muted)">Ничего не найдено для "${searchQuery}"</div>`;
          isLoading = false;
          return;
        }

      } else {
        let symbols = [];
        if (currentTab === 'crypto') {
          symbols = POPULAR.crypto;
        } else if (currentTab === 'stocks') {
          symbols = currentSubTab === 'usa' ? POPULAR.usa_stocks : POPULAR.ru_stocks;
        } else {
          symbols = POPULAR.forex;
        }

        const prices = await fetchPrices(symbols);
        results = symbols.map(sym => ({
          symbol: sym,
          fullName: sym,
          price: prices[sym]?.price || 0,
          change: prices[sym]?.change || null,
          type: currentTab
        }));
      }

      results.sort((a, b) => {
        if (a.price > 0 && b.price === 0) return -1;
        if (a.price === 0 && b.price > 0) return 1;
        return a.symbol.localeCompare(b.symbol);
      });

      const displayResults = results.slice(0, 300);

      list.innerHTML = displayResults.map(item => {
        const changeValue = item.change;
        const changeColor = changeValue !== null && changeValue !== undefined && changeValue > 0 ? 'change-positive' : 
                           changeValue !== null && changeValue !== undefined && changeValue < 0 ? 'change-negative' : '';
        const changeText = changeValue !== null && changeValue !== undefined ? (changeValue > 0 ? '+' : '') + changeValue.toFixed(2) + '%' : '—';
        const priceText = item.price > 0 ? '$' + Utils.formatPrice(item.price) : '—';
        let type = currentTab;
        if (currentTab === 'stocks') {
          type = 'stocks';
        }
        return `
          <div class="market-row">
            <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${getIconHtml(item.symbol, type)}
            </div>
            <div class="market-info">
              <div class="market-name">${item.symbol}</div>
              <div class="market-full">${item.fullName || item.symbol}</div>
            </div>
            <div class="market-price-col">
              <div class="market-price">${priceText}</div>
              <div class="market-change ${changeColor}">${changeText}</div>
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      console.error('Ошибка рендера рынков:', e);
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Ошибка загрузки данных</div>';
    }

    isLoading = false;
  }

  return { render };
})();