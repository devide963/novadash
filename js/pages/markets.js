const MarketsPage = (() => {
  function getIconHtml(symbol) {
    const base = 'https://s3-symbol-logo.tradingview.com';
    // Пробуем крипто-путь
    const cryptoUrl = `${base}/crypto/XTVC${symbol}.svg`;
    // Если не загрузится — пробуем акции
    const stockUrl = `${base}/${symbol}.svg`;

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
    const page = Utils.el('page-markets');
    page.innerHTML = `
      <div class="section-title mb-12">Рынки</div>
      <div id="markets-list">Загрузка...</div>
    `;

    const list = Utils.el('markets-list');
    try {
      const data = await Backend.getMarkets();
      if (!Array.isArray(data) || data.length === 0) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных</div>';
        return;
      }
      list.innerHTML = data.map(d => `
        <div class="market-row">
          <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${getIconHtml(d.symbol)}
          </div>
          <div class="market-info">
            <div class="market-name">${d.symbol}</div>
          </div>
          <div class="market-price-col">
            <div class="market-price">$${Utils.formatPrice(d.price)}</div>
            <div class="market-change">${Utils.formatChange(d.change || 0)}</div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Ошибка загрузки</div>';
    }
  }

  return { render };
})();