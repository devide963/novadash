const MarketsPage = (() => {
  const FINNHUB_KEY = 'd934s4pr01qpou39j2ggd934s4pr01qpou39j2h0';
  let currentTab = 'crypto';
  let currentSubTab = 'usa';
  let searchQuery = '';
  let priceCache = {};
  let isLoading = false;

  // === КЭШ ===
  const CACHE_KEY_PREFIX = 'nova_markets_cache_';
  let isUpdating = false;

  function getCacheKey() {
    if (currentTab === 'stocks') {
      return `${CACHE_KEY_PREFIX}${currentTab}_${currentSubTab}`;
    }
    return `${CACHE_KEY_PREFIX}${currentTab}`;
  }

  function loadMarketsCache() {
    try {
      const key = getCacheKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.markets && data.markets.length) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Ошибка загрузки кэша рынков:', e);
    }
    return null;
  }

  function saveMarketsCache(markets) {
    try {
      const key = getCacheKey();
      localStorage.setItem(key, JSON.stringify({
        markets: markets,
        tab: currentTab,
        subTab: currentSubTab,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('Ошибка сохранения кэша рынков:', e);
    }
  }

  // === ОЧИСТКА КЭША ПРИ ПЕРЕКЛЮЧЕНИИ ВКЛАДКИ ===
  function clearPriceCache() {
    priceCache = {};
  }

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
    } catch (e) {
      console.warn(`Ошибка получения цены для ${symbol}:`, e);
      priceCache[symbol] = { price: 0, change: null };
      return priceCache[symbol];
    }
  }

  async function fetchPrices(symbols) {
    const results = {};
    if (!symbols || symbols.length === 0) return results;
    const batchSize = 10;
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
    } catch (e) {
      console.warn('Ошибка поиска TV:', e);
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
      
      <div id="markets-update-status" style="text-align:right;font-size:11px;color:var(--text-muted);padding:4px 0;margin-bottom:4px;">
        ⏳ Загрузка...
      </div>
      
      <div class="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Поиск актива (BTC, AAPL, SBER...)" id="market-search" autocomplete="off" />
        <div id="search-spinner" style="display:none;width:16px;height:16px;border:2px solid var(--glass-border);border-top-color:var(--blue-primary);border-radius:50%;animation:spin .7s linear infinite"></div>
      </div>

      <div class="tabs-container" id="tabs-container"></div>
      <div id="markets-list">Загрузка...</div>
    `;

    renderTabs();

    // Сразу показываем кэш
    const cache = loadMarketsCache();
    const list = Utils.el('markets-list');
    if (cache && cache.markets && cache.markets.length && list) {
      list.innerHTML = renderMarketsList(cache.markets);
    }

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

    // Принудительно обновляем при открытии
    await refreshMarkets(true);

    if (window.marketsUpdateInterval) clearInterval(window.marketsUpdateInterval);
    window.marketsUpdateInterval = setInterval(() => {
      refreshMarkets(false);
    }, 30000);
  }

  function renderTabs() {
    const container = Utils.el('tabs-container');
    if (!container) return;

    const tabsHtml = `
      <div class="filter-tabs">
        ${[
          { id: 'crypto', label: '🪙 Криптовалюта' },
          { id: 'stocks', label: '📈 Акции' },
          { id: 'forex', label: '💱 Валюта' }
        ].map(tab => `
          <button class="filter-tab ${tab.id === currentTab ? 'active' : ''}" data-tab="${tab.id}">
            ${tab.label}
          </button>
        `).join('')}
      </div>
      ${currentTab === 'stocks' ? `
        <div class="filter-tabs mt-8" style="gap:4px;margin-bottom:12px;display:flex;flex-wrap:wrap">
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
    `;

    container.innerHTML = tabsHtml;

    const page = Utils.el('page-markets');
    
    Utils.qsa('.filter-tab[data-tab]', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.filter-tab[data-tab]', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        currentSubTab = 'usa';
        searchQuery = '';
        const searchInput = Utils.el('market-search');
        if (searchInput) searchInput.value = '';
        clearPriceCache();
        renderTabs();
        // При переключении вкладки - принудительно обновляем
        refreshMarkets(true);
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
        clearPriceCache();
        renderTabs();
        // При переключении подвкладки - принудительно обновляем
        refreshMarkets(true);
      });
    });
  }

  function renderMarketsList(results) {
    if (!results || results.length === 0) {
      return '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных для отображения</div>';
    }

    const isRuStocks = currentTab === 'stocks' && currentSubTab === 'ru';
    const currencySymbol = isRuStocks ? '₽' : '$';

    return results.slice(0, 300).map(item => {
      const changeValue = item.change;
      const changeColor = changeValue !== null && changeValue !== undefined && changeValue > 0 ? 'change-positive' : 
                         changeValue !== null && changeValue !== undefined && changeValue < 0 ? 'change-negative' : '';
      const changeText = changeValue !== null && changeValue !== undefined ? (changeValue > 0 ? '+' : '') + changeValue.toFixed(2) + '%' : '—';
      
      let priceText = '—';
      if (item.price > 0) {
        if (isRuStocks) {
          priceText = currencySymbol + Math.round(item.price).toLocaleString('ru-RU');
        } else {
          priceText = currencySymbol + Utils.formatPrice(item.price);
        }
      }
      
      let type = currentTab;
      if (currentTab === 'stocks') type = 'stocks';
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
  }

  async function refreshMarkets(force = false) {
    if (isUpdating) return;
    isUpdating = true;

    const statusEl = Utils.el('markets-update-status');
    const list = Utils.el('markets-list');
    
    try {
      if (statusEl) {
        statusEl.innerHTML = '🔄 Обновление цен...';
        statusEl.style.color = 'var(--blue-primary)';
      }

      const symbols = getCurrentSymbols();
      if (symbols && symbols.length > 0) {
        // Проверяем кэш
        const cacheData = loadMarketsCache();
        const cacheAge = cacheData?.timestamp ? Date.now() - cacheData.timestamp : Infinity;
        
        // Если кэш свежий (менее 30 сек) и не принудительно — используем его
        if (!force && cacheData && cacheData.markets && cacheData.markets.length && cacheAge < 30000) {
          if (list) {
            list.innerHTML = renderMarketsList(cacheData.markets);
          }
          const now = new Date();
          const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (statusEl) {
            statusEl.innerHTML = `📊 Данные из кэша (${timeStr})`;
            statusEl.style.color = 'var(--text-muted)';
          }
          isUpdating = false;
          return;
        }

        // Загружаем свежие данные
        clearPriceCache();
        const prices = await fetchPrices(symbols);
        const results = symbols.map(sym => ({
          symbol: sym,
          fullName: sym,
          price: prices[sym]?.price || 0,
          change: prices[sym]?.change || null,
          type: currentTab
        }));

        results.sort((a, b) => {
          if (a.price > 0 && b.price === 0) return -1;
          if (a.price === 0 && b.price > 0) return 1;
          return a.symbol.localeCompare(b.symbol);
        });

        saveMarketsCache(results);

        if (list) {
          list.innerHTML = renderMarketsList(results);
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (statusEl) {
          statusEl.innerHTML = `✅ Обновлено в ${timeStr}`;
          statusEl.style.color = 'var(--text-muted)';
        }
      }
    } catch (e) {
      console.warn('Ошибка обновления рынков:', e);
      if (statusEl) {
        statusEl.innerHTML = '⚠️ Ошибка обновления, показываем кэш';
        statusEl.style.color = 'var(--red)';
      }
      const cache = loadMarketsCache();
      if (cache && cache.markets && cache.markets.length && list) {
        list.innerHTML = renderMarketsList(cache.markets);
      }
    }

    isUpdating = false;
  }

  function getCurrentSymbols() {
    if (currentTab === 'crypto') return POPULAR.crypto;
    if (currentTab === 'stocks') {
      return currentSubTab === 'usa' ? POPULAR.usa_stocks : POPULAR.ru_stocks;
    }
    return POPULAR.forex;
  }

  async function renderTab() {
    await refreshMarkets(true);
  }

  return { render };
})();