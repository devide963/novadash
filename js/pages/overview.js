const OverviewPage = (() => {
  const priceCards = [
    { symbol: 'BTC', pair: 'BTC/USDT' },
    { symbol: 'AAPL', pair: 'AAPL' },
  ];

  function getIconHtml(symbol) {
    const base = 'https://s3-symbol-logo.tradingview.com';
    const cryptoUrl = `${base}/crypto/XTVC${symbol}.svg`;
    const stockUrl = `${base}/indices/${symbol.toLowerCase()}.svg`;

    return `
      <img src="${cryptoUrl}" 
           alt="${symbol}" 
           width="24" 
           height="24" 
           loading="lazy"
           style="border-radius:50%;background:rgba(255,255,255,0.05)"
           onerror="this.onerror=null; this.src='${stockUrl}'; this.onerror=function(){this.style.display='none'}">
    `;
  }

  async function render() {
    const page = Utils.el('page-overview');
    page.innerHTML = `
      <div class="scroll-x mb-12">
        ${priceCards.map((c) => `
          <div class="glass-card price-card" id="pcard-${c.symbol}">
            <div class="price-card-header">
              <div class="price-card-symbol">
                ${getIconHtml(c.symbol)}
                ${c.pair}
              </div>
            </div>
            <div class="price-value text-mono" id="pcard-val-${c.symbol}">⏳</div>
            <div class="price-change" id="pcard-chg-${c.symbol}"></div>
          </div>
        `).join('')}
      </div>

      <div class="glass-card mb-12" style="padding:16px">
        <div id="overview-tv-chart" style="height:280px;width:100%"></div>
      </div>

      <div class="glass-card" style="padding:16px">
        <div class="section-header">
          <span class="section-title">🔔 Мои оповещения</span>
          <button class="section-link" id="alerts-refresh-btn">Обновить</button>
        </div>
        <div id="alerts-list">Загрузка...</div>
      </div>
    `;

    // Загружаем цены
    for (const c of priceCards) {
      try {
        let data = await Backend.getPrice(c.symbol);
        if (!data || !data.price) {
          data = await Backend.getStock(c.symbol);
        }
        const el = Utils.el(`pcard-val-${c.symbol}`);
        if (data && data.price) {
          el.textContent = `$${Utils.formatPrice(data.price)}`;
        } else {
          el.textContent = '❌ Нет данных';
        }
      } catch {
        const el = Utils.el(`pcard-val-${c.symbol}`);
        el.textContent = '❌ Ошибка';
      }
    }

    // График
    new TradingView.widget({
      autosize: true,
      symbol: 'BINANCE:BTCUSDT',
      interval: '60',
      timezone: 'Europe/Moscow',
      theme: 'dark',
      style: '1',
      locale: 'ru',
      container_id: 'overview-tv-chart',
      backgroundColor: 'rgba(0,0,0,0)',
      gridColor: 'rgba(255,255,255,0.04)',
    });

    // Загружаем оповещения
    await loadAlerts();

    // Кнопка обновления
    Utils.el('alerts-refresh-btn')?.addEventListener('click', loadAlerts);
  }

  async function loadAlerts() {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const list = Utils.el('alerts-list');
    if (!userId) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Войдите в Telegram</div>';
      return;
    }
    try {
      const data = await Backend.getAlerts(userId);
      const alerts = data.price || [];
      if (!alerts.length) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Нет активных оповещений</div>';
        return;
      }
      list.innerHTML = alerts.map(a => {
        const sym = a.symbol.toUpperCase();
        const iconHtml = getIconHtml(sym);
        return `
          <div class="alert-item">
            <div class="alert-icon" style="background:transparent;border:none;padding:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
              ${iconHtml}
            </div>
            <div class="alert-body">
              <div class="alert-symbol">${a.symbol}</div>
              <div class="alert-desc">${a.condition === 'above' ? 'Выше' : 'Ниже'} $${a.price}</div>
            </div>
            <div class="alert-meta">
              <div class="alert-time">${a.interval ? a.interval + 'с' : 'одноразово'}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Ошибка загрузки</div>';
    }
  }

  return { render };
})();