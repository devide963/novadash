const SignalsPage = (() => {
  const signals = [
    { symbol: 'BTC/USDT', type: 'buy',  entry: 66200, tp: 68500, sl: 65100, progress: 38, strength: 82, time: '15:20' },
    { symbol: 'ETH/USDT', type: 'buy',  entry: 3490,  tp: 3720,  sl: 3380,  progress: 24, strength: 74, time: '14:55' },
    { symbol: 'AAPL',     type: 'sell', entry: 194.50, tp: 188.00, sl: 197.00, progress: 55, strength: 68, time: '13:40' },
    { symbol: 'SOL/USDT', type: 'buy',  entry: 168.00, tp: 182.00, sl: 162.00, progress: 18, strength: 79, time: '12:30' },
    { symbol: 'BNB/USDT', type: 'sell', entry: 598.00, tp: 575.00, sl: 610.00, progress: 70, strength: 61, time: '11:15' },
  ];

  function render() {
    const page = Utils.el('page-signals');
    page.innerHTML = `
      <div class="section-title mb-16">Торговые сигналы</div>

      <div class="filter-tabs mb-16" style="margin-bottom:16px">
        ${['Все','Покупка','Продажа','Активные'].map((f, i) =>
          `<button class="filter-tab${i===0?' active':''}">${f}</button>`
        ).join('')}
      </div>

      ${signals.map(s => `
        <div class="glass-card signal-card">
          <div class="signal-header">
            <div>
              <div class="signal-symbol">${s.symbol}</div>
              <div class="text-secondary fs-12 mt-4">${s.time} · Сила: ${s.strength}%</div>
            </div>
            <div>
              <span class="signal-type ${s.type}">${s.type === 'buy' ? 'ПОКУПКА' : 'ПРОДАЖА'}</span>
            </div>
          </div>
          <div class="signal-levels">
            <div class="signal-level">
              <div class="signal-level-label">Вход</div>
              <div class="signal-level-value">${s.entry.toLocaleString()}</div>
            </div>
            <div class="signal-level">
              <div class="signal-level-label">Тейк</div>
              <div class="signal-level-value" style="color:var(--green)">${s.tp.toLocaleString()}</div>
            </div>
            <div class="signal-level">
              <div class="signal-level-label">Стоп</div>
              <div class="signal-level-value" style="color:var(--red)">${s.sl.toLocaleString()}</div>
            </div>
          </div>
          <div class="flex-between fs-12 text-secondary mb-4">
            <span>Прогресс</span><span>${s.progress}%</span>
          </div>
          <div class="signal-progress">
            <div class="signal-progress-fill" style="width:${s.progress}%;background:${s.type==='buy'?'linear-gradient(90deg,var(--blue-primary),var(--green))':'linear-gradient(90deg,var(--red),#FF8A8A)'}"></div>
          </div>
        </div>
      `).join('')}
    `;

    // Filter tabs
    Utils.qsa('.filter-tab', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.filter-tab', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  return { render };
})();
