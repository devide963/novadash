const PortfolioPage = (() => {
  const holdings = [
    { symbol: 'BTC',  name: 'Bitcoin',   iconClass: 'btc',  icon: '₿', amount: 0.4821, buyPrice: 58000 },
    { symbol: 'ETH',  name: 'Ethereum',  iconClass: 'eth',  icon: 'Ξ', amount: 3.25,   buyPrice: 3100  },
    { symbol: 'AAPL', name: 'Apple',     iconClass: 'aapl', icon: '🍎', amount: 10,     buyPrice: 180   },
    { symbol: 'SOL',  name: 'Solana',    iconClass: 'eth',  icon: '◎', amount: 12.5,   buyPrice: 150   },
  ];

  function render() {
    const page = Utils.el('page-portfolio');
    const total = holdings.reduce((sum, h) => {
      const d = MarketAPI.getPrice(h.symbol) || { price: h.buyPrice };
      return sum + d.price * h.amount;
    }, 0);

    const pnl = holdings.reduce((sum, h) => {
      const d = MarketAPI.getPrice(h.symbol) || { price: h.buyPrice };
      return sum + (d.price - h.buyPrice) * h.amount;
    }, 0);

    const pnlPct = (pnl / (total - pnl)) * 100;

    page.innerHTML = `
      <!-- Total -->
      <div class="glass-card mb-16" style="padding:20px 16px">
        <div class="portfolio-total" style="padding:8px 0 0">
          <div class="portfolio-label">Общая стоимость</div>
          <div class="portfolio-value" id="ptotal">$${Utils.formatPrice(total)}</div>
          <div class="portfolio-change ${Utils.changeClass(pnl)}" id="ppnl">
            ${pnl >= 0 ? '+' : ''}$${Utils.formatPrice(Math.abs(pnl))} (${Utils.formatChange(pnlPct)})
          </div>
        </div>
        <div class="portfolio-actions">
          <button class="portfolio-btn primary">Пополнить</button>
          <button class="portfolio-btn secondary">Вывести</button>
        </div>
      </div>

      <!-- Donut chart -->
      <div class="glass-card mb-16" style="padding:16px">
        <div class="section-header"><span class="section-title">Распределение</span></div>
        <div class="donut-wrapper">
          ${renderDonut()}
        </div>
        <div class="flex" style="gap:12px;flex-wrap:wrap;margin-top:8px">
          ${[['BTC','#4A9EFF'],['ETH','#7B5FFF'],['AAPL','#3DD68C'],['SOL','#FF9E3D']].map(([s,c]) => `
            <div class="flex gap-8" style="align-items:center;font-size:12px">
              <div style="width:10px;height:10px;border-radius:50%;background:${c}"></div>
              <span style="color:var(--text-secondary)">${s}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Holdings list -->
      <div class="glass-card" style="padding:0 16px">
        <div style="padding:14px 0 0"><div class="section-title">Активы</div></div>
        ${holdings.map((h, i) => {
          const d = MarketAPI.getPrice(h.symbol) || { price: h.buyPrice, change: 0 };
          const val = d.price * h.amount;
          const chg = ((d.price - h.buyPrice) / h.buyPrice) * 100;
          return `
            <div>
              ${i > 0 ? '<div class="divider" style="margin:0"></div>' : ''}
              <div class="asset-row" data-asset="${h.symbol}">
                <div class="market-icon ${h.iconClass}">${h.icon}</div>
                <div class="asset-info">
                  <div class="asset-name">${h.name}</div>
                  <div class="asset-amount">${h.amount} ${h.symbol}</div>
                </div>
                <div class="asset-value-col">
                  <div class="asset-value">$${Utils.formatPrice(val)}</div>
                  <div class="asset-change ${Utils.changeClass(chg)}">${Utils.formatChange(chg)}</div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Live update total
    setInterval(() => {
      const t = holdings.reduce((s, h) => {
        const d = MarketAPI.getPrice(h.symbol) || { price: h.buyPrice };
        return s + d.price * h.amount;
      }, 0);
      const p = holdings.reduce((s, h) => {
        const d = MarketAPI.getPrice(h.symbol) || { price: h.buyPrice };
        return s + (d.price - h.buyPrice) * h.amount;
      }, 0);
      const pct = (p / (t - p)) * 100;
      const tel = Utils.el('ptotal');
      const pel = Utils.el('ppnl');
      if (tel) tel.textContent = '$' + Utils.formatPrice(t);
      if (pel) {
        pel.textContent = `${p >= 0 ? '+' : ''}$${Utils.formatPrice(Math.abs(p))} (${Utils.formatChange(pct)})`;
        pel.className = `portfolio-change ${Utils.changeClass(p)}`;
      }
    }, 2000);
  }

  function renderDonut() {
    const slices = [
      { pct: 0.52, color: '#4A9EFF' },
      { pct: 0.24, color: '#7B5FFF' },
      { pct: 0.14, color: '#3DD68C' },
      { pct: 0.10, color: '#FF9E3D' },
    ];
    const r = 70, cx = 90, cy = 90, sw = 22;
    let startAngle = -Math.PI / 2;
    const arcs = slices.map(s => {
      const angle = s.pct * 2 * Math.PI;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      startAngle += angle;
      const x2 = cx + r * Math.cos(startAngle);
      const y2 = cy + r * Math.sin(startAngle);
      const large = angle > Math.PI ? 1 : 0;
      return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-linecap="round"/>`;
    });
    return `<svg width="180" height="180" viewBox="0 0 180 180">${arcs.join('')}
      <text x="90" y="85" text-anchor="middle" fill="#fff" font-size="13" font-family="Inter" font-weight="600">Портфель</text>
      <text x="90" y="103" text-anchor="middle" fill="#8899AA" font-size="11" font-family="JetBrains Mono">4 актива</text>
    </svg>`;
  }

  return { render };
})();