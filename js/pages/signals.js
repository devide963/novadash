const SignalsPage = (() => {
  // Sample signals (will be replaced by AI bot data)
  const demoSignals = [
    { symbol: 'BTC/USDT', type: 'buy',  entry: 66200, tp: 68500, sl: 65100, progress: 38, strength: 82, time: '15:20', active: true  },
    { symbol: 'ETH/USDT', type: 'buy',  entry: 3490,  tp: 3720,  sl: 3380,  progress: 24, strength: 74, time: '14:55', active: true  },
    { symbol: 'AAPL',     type: 'sell', entry: 194.50, tp: 188.00, sl: 197.00, progress: 55, strength: 68, time: '13:40', active: false },
    { symbol: 'SOL/USDT', type: 'buy',  entry: 168.00, tp: 182.00, sl: 162.00, progress: 18, strength: 79, time: '12:30', active: true  },
    { symbol: 'BNB/USDT', type: 'sell', entry: 598.00, tp: 575.00, sl: 610.00, progress: 70, strength: 61, time: '11:15', active: false },
    { symbol: 'XRP/USDT', type: 'buy',  entry: 0.510,  tp: 0.560,  sl: 0.490,  progress: 10, strength: 71, time: '10:40', active: true  },
  ];

  let currentFilter = 'Все';

  function render() {
    const page = Utils.el('page-signals');
    const isPro = Subscription.isPro();

    page.innerHTML = `
      <div class="flex-between mb-12">
        <div class="section-title">Торговые сигналы</div>
        ${Subscription.renderProBadge()}
      </div>

      ${!isPro ? renderLockedBanner() : ''}

      <div class="filter-tabs">
        ${['Все','Покупка','Продажа','Активные'].map((f, i) =>
          `<button class="filter-tab${i === 0 ? ' active' : ''}" data-filter="${f}">${f}</button>`
        ).join('')}
      </div>

      <div id="signals-list">
        ${renderSignalList(demoSignals, isPro)}
      </div>
    `;

    Utils.qsa('.filter-tab', page).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.filter-tab', page).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        const list = Utils.el('signals-list');
        if (list) list.innerHTML = renderSignalList(getFiltered(), isPro);
        bindUpgradeButtons(page);
      });
    });

    bindUpgradeButtons(page);
  }

  function getFiltered() {
    return demoSignals.filter(s => {
      if (currentFilter === 'Все') return true;
      if (currentFilter === 'Покупка') return s.type === 'buy';
      if (currentFilter === 'Продажа') return s.type === 'sell';
      if (currentFilter === 'Активные') return s.active;
      return true;
    });
  }

  function renderLockedBanner() {
    return `
      <div class="glass-card mb-12" style="padding:20px 16px">
        <div class="flex-center gap-8 mb-12">
          <div style="width:36px;height:36px;border-radius:10px;background:var(--blue-dark);border:1px solid rgba(59,158,255,0.2);display:flex;align-items:center;justify-content:color:var(--blue-primary);font-size:16px;justify-content:center;align-items:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B9EFF" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:700">Сигналы от AI-бота</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Требуется NOVA Pro</div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.55;margin-bottom:14px">
          Ниже показаны демо-сигналы. Реальные сигналы генерируются AI-анализом вашего бота и доступны только подписчикам.
        </div>
        ${Subscription.renderUpgradeBanner()}
      </div>
    `;
  }

  function renderSignalList(signals, isPro) {
    if (!signals.length) {
      return `<div style="padding:30px;text-align:center;color:var(--text-muted);font-size:13px">Нет сигналов</div>`;
    }

    return signals.map((s, idx) => {
      const isBlurred = !isPro && idx > 1;
      return `
        <div class="glass-card signal-card${isBlurred ? ' signal-locked' : ''}" style="position:relative">
          ${isBlurred ? `
            <div class="lock-overlay" style="border-radius:16px">
              <div class="lock-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B9EFF" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="lock-title">NOVA Pro</div>
              <div class="lock-desc">Полный доступ к сигналам</div>
              <button class="btn-primary" id="lock-upgrade-btn" style="padding:10px 20px;font-size:13px;width:auto">
                ${Subscription.trialUsed() ? 'Подключить Pro' : 'Пробный период 3 дня'}
              </button>
            </div>
          ` : ''}
          <div class="signal-header">
            <div>
              <div class="signal-symbol">${s.symbol}</div>
              <div class="text-secondary fs-12 mt-4">${s.time} · Сила: ${s.strength}%</div>
            </div>
            <div class="flex-col" style="align-items:flex-end;gap:6px">
              <span class="signal-type ${s.type}">${s.type === 'buy' ? 'ПОКУПКА' : 'ПРОДАЖА'}</span>
              <span class="tag${s.active ? ' green' : ''}">${s.active ? 'Активный' : 'Завершён'}</span>
            </div>
          </div>
          <div class="signal-levels">
            <div class="signal-level">
              <div class="signal-level-label">Вход</div>
              <div class="signal-level-value">${formatLevel(s.entry)}</div>
            </div>
            <div class="signal-level">
              <div class="signal-level-label">Тейк</div>
              <div class="signal-level-value" style="color:var(--green)">${formatLevel(s.tp)}</div>
            </div>
            <div class="signal-level">
              <div class="signal-level-label">Стоп</div>
              <div class="signal-level-value" style="color:var(--red)">${formatLevel(s.sl)}</div>
            </div>
          </div>
          <div class="flex-between fs-12 text-secondary" style="margin-bottom:6px">
            <span>Прогресс к тейку</span>
            <span>${s.progress}%</span>
          </div>
          <div class="signal-progress">
            <div class="signal-progress-fill" style="width:${s.progress}%;background:${
              s.type === 'buy'
                ? 'linear-gradient(90deg,var(--blue-primary),var(--green))'
                : 'linear-gradient(90deg,var(--red),#FFAAAA)'
            }"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function formatLevel(n) {
    if (n >= 100) return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n.toFixed(3);
  }

  function bindUpgradeButtons(page) {
    // Trial activate
    const trialBtn = page.querySelector('#btn-trial-activate');
    if (trialBtn) {
      trialBtn.addEventListener('click', () => {
        const ok = Subscription.activateTrial();
        if (ok) {
          Utils.toast('Пробный период на 3 дня активирован! 🎉', 'success');
          render();
        }
      });
    }
    // Buy pro
    const proBtn = page.querySelector('#btn-buy-pro');
    if (proBtn) {
      proBtn.addEventListener('click', () => showPaymentModal());
    }
    // Lock overlay upgrade
    const lockBtn = page.querySelector('#lock-upgrade-btn');
    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        if (!Subscription.trialUsed()) {
          const ok = Subscription.activateTrial();
          if (ok) {
            Utils.toast('Пробный период на 3 дня активирован! 🎉', 'success');
            render();
          }
        } else {
          showPaymentModal();
        }
      });
    }
  }

  function showPaymentModal() {
    App.showModal('Подключить NOVA Pro', `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:36px;font-weight:800;margin-bottom:4px">990 ₽<span style="font-size:16px;font-weight:400;color:var(--text-secondary)">/мес</span></div>
        <div style="font-size:13px;color:var(--text-secondary)">Отмена в любое время</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        ${['AI-сигналы в реальном времени','Аналитика портфеля','Приоритетная поддержка','Все будущие обновления'].map(f => `
          <div style="display:flex;align-items:center;gap:10px;font-size:14px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            ${f}
          </div>
        `).join('')}
      </div>
      <button class="btn-primary" id="confirm-pay-btn">Оплатить через Telegram</button>
      <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:12px">Безопасный платёж через Telegram Stars</div>
    `, () => {
      // Payment confirm — simulate for now
      const btn = Utils.el('confirm-pay-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          Subscription.activatePro();
          App.hideModal();
          Utils.toast('NOVA Pro активирован! 🚀', 'success');
          render();
        });
      }
    });
  }

  return { render };
})();