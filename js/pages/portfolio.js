const PortfolioPage = (() => {
  const STORAGE_KEY = 'nova_portfolio';
  let currentTab = 'crypto'; // 'crypto' | 'stocks' | 'analytics'
  let unsubFns = [];

  function getPortfolio() {
    return Utils.storage.get(STORAGE_KEY, { crypto: [], stocks: [] });
  }

  function savePortfolio(data) {
    Utils.storage.set(STORAGE_KEY, data);
  }

  // ---- Получение реальной цены из бота ----
  async function getRealPrice(symbol) {
    const data = await Backend.getPrice(symbol);
    if (data && data.price) return data.price;
    const stock = await Backend.getStock(symbol);
    if (stock && stock.price) return stock.price;
    return null;
  }

  // ---- Получение цены из кэша или запрос ----
  function getCurrentPrice(asset) {
    return asset._currentPrice || asset.buyPrice;
  }

  function getPnlPct(asset) {
    const cp = getCurrentPrice(asset);
    return ((cp - asset.buyPrice) / asset.buyPrice) * 100;
  }

  // ---- Рендер ----
  function render() {
    unsubFns.forEach(fn => fn());
    unsubFns = [];

    const page = Utils.el('page-portfolio');
    page.innerHTML = `
      <div class="glass-card mb-12" style="padding:0 16px 16px">
        <div class="portfolio-total-card" style="padding-bottom:0">
          <div class="portfolio-label">Общая стоимость</div>
          <div class="portfolio-value" id="ptotal">$—</div>
          <div class="portfolio-change" id="ppnl">—</div>
        </div>
        <div class="portfolio-actions" style="margin-top:14px">
          <button class="portfolio-btn primary" id="btn-add-asset">+ Добавить актив</button>
          <button class="portfolio-btn secondary" id="btn-clear-portfolio">Очистить</button>
        </div>
      </div>

      <div class="tab-switcher">
        <button class="tab-btn${currentTab === 'crypto' ? ' active' : ''}" data-tab="crypto">Крипто</button>
        <button class="tab-btn${currentTab === 'stocks' ? ' active' : ''}" data-tab="stocks">Акции</button>
        <button class="tab-btn${currentTab === 'analytics' ? ' active' : ''}" data-tab="analytics">Аналитика</button>
      </div>

      <div id="portfolio-tab-content"></div>
    `;

    Utils.qsa('.tab-btn', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.tab-btn', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        renderTabContent();
        updateTotals();
      });
    });

    Utils.el('btn-add-asset')?.addEventListener('click', () => showAddModal());
    Utils.el('btn-clear-portfolio')?.addEventListener('click', () => {
      if (confirm('Очистить весь портфель?')) {
        savePortfolio({ crypto: [], stocks: [] });
        render();
        Utils.toast('Портфель очищен', 'info');
      }
    });

    renderTabContent();
    updateTotals();
    startLiveUpdates();
  }

  function renderTabContent() {
    const content = Utils.el('portfolio-tab-content');
    if (!content) return;

    if (currentTab === 'analytics') {
      renderAnalytics(content);
      return;
    }

    const pf = getPortfolio();
    const assets = pf[currentTab] || [];

    if (!assets.length) {
      content.innerHTML = `
        <div class="glass-card" style="padding:16px">
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <div class="empty-title">Портфель пуст</div>
            <div class="empty-desc">Добавьте ${currentTab === 'crypto' ? 'криптовалюты' : 'акции'}, которые вы купили, и отслеживайте прибыль</div>
          </div>
          <button class="add-btn" id="add-first-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Добавить ${currentTab === 'crypto' ? 'криптовалюту' : 'акцию'}
          </button>
        </div>
      `;
      Utils.el('add-first-btn')?.addEventListener('click', () => showAddModal());
      return;
    }

    // Обновляем цены перед рендером
    assets.forEach(a => {
      getRealPrice(a.symbol).then(price => {
        if (price) a._currentPrice = price;
      });
    });

    content.innerHTML = `
      <div class="glass-card" style="padding:0 16px">
        ${assets.map((asset, i) => renderAssetRow(asset, i, assets.length)).join('')}
      </div>
      <button class="add-btn mt-8" id="add-more-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Добавить ещё
      </button>
    `;

    Utils.el('add-more-btn')?.addEventListener('click', () => showAddModal());
    Utils.qsa('.asset-row', content).forEach((row, i) => {
      let longPress;
      row.addEventListener('touchstart', () => {
        longPress = setTimeout(() => showDeleteAsset(i), 600);
      });
      row.addEventListener('touchend', () => clearTimeout(longPress));
    });
  }

  function renderAssetRow(asset, i, total) {
    const currentPrice = getCurrentPrice(asset);
    const value = currentPrice * asset.amount;
    const pnl = (currentPrice - asset.buyPrice) * asset.amount;
    const pnlPct = ((currentPrice - asset.buyPrice) / asset.buyPrice) * 100;
    const iconConfig = getIconConfig(asset.symbol, asset.type);

    return `
      <div>
        ${i > 0 ? '<div class="divider"></div>' : ''}
        <div class="asset-row" data-idx="${i}">
          <div class="market-icon ${iconConfig.iconClass}">${iconConfig.icon}</div>
          <div class="asset-info">
            <div class="asset-name">${asset.symbol}</div>
            <div class="asset-amount">${asset.amount} × $${Utils.formatPrice(asset.buyPrice)}</div>
          </div>
          <div class="asset-value-col">
            <div class="asset-value" id="av-${asset.symbol}-${i}">$${Utils.formatPrice(value)}</div>
            <div class="asset-change ${Utils.changeClass(pnlPct)}" id="ac-${asset.symbol}-${i}">
              ${pnl >= 0 ? '+' : ''}$${Utils.formatPrice(Math.abs(pnl))} (${Utils.formatChange(pnlPct)})
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---- Аналитика портфеля ----
  function renderAnalytics(content) {
    const pf = getPortfolio();
    const allAssets = [...(pf.crypto || []), ...(pf.stocks || [])];

    if (!allAssets.length) {
      content.innerHTML = `
        <div class="glass-card" style="padding:20px;text-align:center">
          <div style="color:var(--text-secondary);font-size:13px">Добавьте активы для аналитики</div>
        </div>`;
      return;
    }

    // Показываем загрузку
    content.innerHTML = `
      <div class="glass-card" style="padding:20px;text-align:center">
        <div class="spinner" style="margin:0 auto"></div>
        <div style="color:var(--text-secondary);margin-top:10px">Анализирую портфель...</div>
      </div>
    `;

    const portfolioData = allAssets.map(a => ({
      symbol: a.symbol,
      amount: a.amount,
      buyPrice: a.buyPrice
    }));

    Backend.analyzePortfolio(portfolioData).then(result => {
      if (result.error) {
        content.innerHTML = `
          <div class="glass-card" style="padding:20px;text-align:center">
            <div style="color:var(--red)">❌ ${result.error}</div>
            <div style="color:var(--text-secondary);font-size:13px;margin-top:8px">Попробуйте позже</div>
          </div>`;
        return;
      }

      const analysis = result.analysis || 'Анализ не получен.';
      content.innerHTML = `
        <div class="glass-card" style="padding:16px">
          <div class="section-title mb-12">Аналитика портфеля</div>
          <div style="font-size:14px;line-height:1.7;color:var(--text-primary);white-space:pre-wrap">
            ${analysis}
          </div>
        </div>
        <button class="btn-secondary mt-12" onclick="PortfolioPage.render()" style="width:100%;padding:12px;border-radius:12px">
          🔄 Обновить
        </button>
      `;
    }).catch(() => {
      content.innerHTML = `
        <div class="glass-card" style="padding:20px;text-align:center">
          <div style="color:var(--red)">❌ Ошибка подключения к AI</div>
          <div style="color:var(--text-secondary);font-size:13px;margin-top:8px">Проверьте соединение с ботом</div>
        </div>`;
    });
  }

  function renderDonut(slices) {
    const r = 65, cx = 80, cy = 80, sw = 20;
    let angle = -Math.PI / 2;
    const arcs = slices.map(s => {
      const da = s.pct * 2 * Math.PI;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += da;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const large = da > Math.PI ? 1 : 0;
      return `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}"
        fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-linecap="butt"/>`;
    });
    return `<svg width="160" height="160" viewBox="0 0 160 160">
      ${arcs.join('')}
      <text x="80" y="76" text-anchor="middle" fill="#fff" font-size="12" font-family="Inter" font-weight="600">Портфель</text>
      <text x="80" y="92" text-anchor="middle" fill="#8FA3BC" font-size="11" font-family="JetBrains Mono">${slices.length} акт.</text>
    </svg>`;
  }

  async function updateTotals() {
    const pf = getPortfolio();
    const all = [...(pf.crypto || []), ...(pf.stocks || [])];

    for (const asset of all) {
      const price = await getRealPrice(asset.symbol);
      if (price) asset._currentPrice = price;
    }

    if (!all.length) {
      const tel = Utils.el('ptotal');
      const pel = Utils.el('ppnl');
      if (tel) tel.textContent = '$0.00';
      if (pel) { pel.textContent = 'Портфель пуст'; pel.className = 'portfolio-change text-secondary'; }
      return;
    }

    const total = all.reduce((s, a) => s + (a._currentPrice || a.buyPrice) * a.amount, 0);
    const pnl = all.reduce((s, a) => s + ((a._currentPrice || a.buyPrice) - a.buyPrice) * a.amount, 0);
    const pct = total > 0 ? (pnl / (total - pnl)) * 100 : 0;

    const tel = Utils.el('ptotal');
    const pel = Utils.el('ppnl');
    if (tel) tel.textContent = `$${Utils.formatPrice(total)}`;
    if (pel) {
      pel.textContent = `${pnl >= 0 ? '+' : ''}$${Utils.formatPrice(Math.abs(pnl))} (${Utils.formatChange(pct)})`;
      pel.className = `portfolio-change ${Utils.changeClass(pnl)}`;
    }
  }

  function startLiveUpdates() {
    setInterval(() => {
      updateTotals();
      const pf = getPortfolio();
      const list = pf[currentTab] || [];
      list.forEach((a, i) => {
        const price = a._currentPrice || a.buyPrice;
        const val = price * a.amount;
        const pnl = (price - a.buyPrice) * a.amount;
        const pct = ((price - a.buyPrice) / a.buyPrice) * 100;
        const vEl = Utils.el(`av-${a.symbol}-${i}`);
        const cEl = Utils.el(`ac-${a.symbol}-${i}`);
        if (vEl) vEl.textContent = `$${Utils.formatPrice(val)}`;
        if (cEl) {
          cEl.textContent = `${pnl >= 0 ? '+' : ''}$${Utils.formatPrice(Math.abs(pnl))} (${Utils.formatChange(pct)})`;
          cEl.className = `asset-change ${Utils.changeClass(pct)}`;
        }
      });
    }, 3000);
  }

  function showAddModal() {
    const type = currentTab === 'stocks' ? 'stock' : 'crypto';
    const quickPicks = type === 'crypto'
      ? ['BTC','ETH','SOL','BNB','ADA','DOGE','XRP','AVAX']
      : ['AAPL','TSLA','NVDA','MSFT','GOOGL','AMZN','META','SPY'];

    App.showModal(`Добавить ${type === 'crypto' ? 'криптовалюту' : 'акцию'}`, `
      <div class="form-group">
        <label class="form-label">Быстрый выбор</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">
          ${quickPicks.map(s => `
            <button class="filter-tab quick-pick" data-sym="${s}" style="border-radius:10px;font-size:12px;padding:6px 10px">${s}</button>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Символ (тикер)</label>
        <input class="form-input" id="inp-symbol" placeholder="напр. BTC, AAPL" autocomplete="off" autocapitalize="characters"/>
      </div>
      <div class="form-group">
        <label class="form-label">Количество</label>
        <input class="form-input" id="inp-amount" type="number" placeholder="0.0" min="0" step="any"/>
      </div>
      <div class="form-group">
        <label class="form-label">Цена покупки ($)</label>
        <input class="form-input" id="inp-price" type="number" placeholder="0.00" min="0" step="any"/>
      </div>
      <button class="btn-primary" id="btn-save-asset">Добавить в портфель</button>
    `, () => {
      Utils.qsa('.quick-pick').forEach(btn => {
        btn.addEventListener('click', () => {
          Utils.qsa('.quick-pick').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const symInput = Utils.el('inp-symbol');
          if (symInput) symInput.value = btn.dataset.sym;
        });
      });

      Utils.el('btn-save-asset')?.addEventListener('click', () => {
        const symbol = (Utils.el('inp-symbol')?.value || '').trim().toUpperCase();
        const amount = parseFloat(Utils.el('inp-amount')?.value || '0');
        const price  = parseFloat(Utils.el('inp-price')?.value || '0');

        if (!symbol) { Utils.toast('Введите символ', 'error'); return; }
        if (!amount || amount <= 0) { Utils.toast('Введите количество', 'error'); return; }
        if (!price  || price <= 0)  { Utils.toast('Введите цену покупки', 'error'); return; }

        const pf = getPortfolio();
        const key = type === 'crypto' ? 'crypto' : 'stocks';
        pf[key].push({ symbol, amount, buyPrice: price, type, addedAt: Date.now() });
        savePortfolio(pf);
        App.hideModal();
        Utils.toast(`${symbol} добавлен в портфель`, 'success');
        render();
      });
    });
  }

  function showDeleteAsset(idx) {
    const pf = getPortfolio();
    const key = currentTab === 'stocks' ? 'stocks' : 'crypto';
    const asset = pf[key][idx];
    if (!asset) return;
    if (confirm(`Удалить ${asset.symbol} из портфеля?`)) {
      pf[key].splice(idx, 1);
      savePortfolio(pf);
      render();
    }
  }

  function getIconConfig(symbol, type) {
    const map = {
      BTC: { iconClass: 'btc', icon: '₿' }, ETH: { iconClass: 'eth', icon: 'Ξ' },
      SOL: { iconClass: 'sol', icon: '◎' }, BNB: { iconClass: 'bnb', icon: 'B' },
      ADA: { iconClass: 'eth', icon: '₳' }, DOGE:{ iconClass: 'btc', icon: 'Ð' },
      XRP: { iconClass: 'eth', icon: '✕' }, AVAX:{ iconClass: 'sol', icon: 'A' },
      AAPL:{ iconClass: 'aapl',icon: '🍎'},TSLA:{ iconClass: 'tsla',icon: '⚡'},
      NVDA:{ iconClass: 'sol', icon: 'N' }, MSFT:{ iconClass: 'spy', icon: '⬛'},
      GOOGL:{iconClass: 'spy', icon: 'G' },AMZN:{ iconClass: 'btc', icon: '📦'},
      META:{ iconClass: 'spy', icon: 'M' }, SPY: { iconClass: 'spy', icon: 'S' },
    };
    return map[symbol] || { iconClass: type === 'stock' ? 'spy' : 'eth', icon: symbol[0] };
  }

  return { render };
})();