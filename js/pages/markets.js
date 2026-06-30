const MarketsPage = (() => {
  let marketData = [];

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
      marketData = data;
      list.innerHTML = data.map((d) => {
        const icon = {
          BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: 'B', ADA: '₳', DOGE: 'Ð', XRP: '✕',
          AAPL: '🍎', TSLA: '⚡', NVDA: 'N', MSFT: '⬛', GOOGL: 'G', AMZN: '📦', META: 'M', SPY: 'S'
        };
        const pair = d.symbol;
        return `
          <div class="market-row">
            <div class="market-icon">${icon[d.symbol] || '📊'}</div>
            <div class="market-info">
              <div class="market-name">${pair}</div>
            </div>
            <div class="market-price-col">
              <div class="market-price">$${Utils.formatPrice(d.price)}</div>
              <div class="market-change">${Utils.formatChange(d.change || 0)}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Ошибка загрузки данных</div>';
    }
  }

  return { render };
})();