const MarketsPage = (() => {
  const FINNHUB_KEY = 'd934s4pr01qpou39j2ggd934s4pr01qpou39j2h0';
  let currentTab = 'crypto';
  let currentSubTab = 'usa';
  let searchQuery = '';
  let priceCache = {};
  let isLoading = false;

  // ... (getIconHtml, fetchPrice, fetchPrices, searchTV, POPULAR — без изменений) ...

  function renderTabs() {
    const page = Utils.el('page-markets');
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
    // Обновляем только блок с вкладками, не трогая остальное
    const tabsContainer = page.querySelector('.tabs-container');
    if (tabsContainer) {
      tabsContainer.innerHTML = tabsHtml;
      bindTabEvents();
    }
  }

  function bindTabEvents() {
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
        renderTabs();
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
        renderTabs();
        renderTab();
      });
    });
  }

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

      <div class="tabs-container">
        <!-- Сюда будем рендерить вкладки -->
      </div>

      <div id="markets-list">Загрузка...</div>
    `;

    // Инициализация поиска
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

    renderTabs();
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