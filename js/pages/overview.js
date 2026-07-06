const OverviewPage = (() => {
  const priceCards = [
    { symbol: 'BTC', pair: 'BTC/USDT' },
    { symbol: 'AAPL', pair: 'AAPL' },
  ];

  // Finnhub API key
  const FINNHUB_KEY = 'd934s4pr01qpou39j2ggd934s4pr01qpou39j2h0';

  let newsInterval = null;

  function getIconHtml(symbol) {
    const base = 'https://s3-symbol-logo.tradingview.com';
    const cryptoUrl = `${base}/crypto/XTVC${symbol}.svg`;
    const stockUrl = `https://finnhub.io/api/logo?symbol=${symbol}&token=${FINNHUB_KEY}`;

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

      <!-- БЛОК НОВОСТЕЙ -->
      <div class="glass-card mb-12" style="padding:12px 16px;">
        <div class="section-header">
          <span class="section-title">📰 Новости рынка</span>
          <button class="section-link" id="news-show-all-btn">Все новости →</button>
        </div>
        <div id="news-preview-list">
          ${renderNewsPreview()}
        </div>
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

    // Кнопка обновления оповещений
    Utils.el('alerts-refresh-btn')?.addEventListener('click', loadAlerts);

    // === НОВОСТИ ===
    // Инициализируем NewsManager (загружает кэш и стартует фоновое обновление)
    NewsManager.init();

    // Кнопка "Все новости"
    Utils.el('news-show-all-btn')?.addEventListener('click', showNewsPanel);

    // Обновляем отображение новостей каждые 30 секунд
    if (newsInterval) clearInterval(newsInterval);
    newsInterval = setInterval(() => {
      updateNewsPreview();
    }, 30 * 1000);
  }

  function renderNewsPreview() {
    let news = NewsManager.getLatest(3);
    
    if (!news || !news.length) {
      try {
        const raw = localStorage.getItem('nova_news_cache');
        if (raw) {
          const data = JSON.parse(raw);
          if (data && Array.isArray(data.news) && data.news.length) {
            news = data.news.slice(0, 3).map(n => ({
              ...n,
              pubDate: new Date(n.pubDate),
              time: formatExactTime(new Date(n.pubDate)),
            }));
          }
        }
      } catch (e) {}
    }

    if (!news || !news.length) {
      return '<div style="text-align:center;color:var(--text-muted);padding:12px 0;font-size:13px;">Новости загружаются...</div>';
    }

    return news.map((n, i) => {
      const tagLabels = {
        crypto: '🪙 Крипто',
        us: '🇺🇸 США',
        ru: '🇷🇺 Россия',
        stocks: '📊 Акции',
      };
      const tagLabel = tagLabels[n.tag] || '📰 Новости';
      const tagColors = {
        crypto: 'rgba(247,147,26,0.15)',
        us: 'rgba(37,99,235,0.15)',
        ru: 'rgba(220,38,38,0.15)',
        stocks: 'rgba(59,158,255,0.15)',
      };
      const tagColor = tagColors[n.tag] || 'rgba(59,158,255,0.12)';
      const tagTextColor = {
        crypto: '#F7931A',
        us: '#3B82F6',
        ru: '#EF4444',
        stocks: '#3B9EFF',
      }[n.tag] || '#3B9EFF';

      const timeDisplay = n.time || formatExactTime(n.pubDate);

      return `
        <div class="news-item" onclick="window.open('${n.link || '#'}', '_blank')" style="${i > 0 ? 'border-top:1px solid var(--glass-border);' : ''}">
          <div class="news-time" style="min-width:50px;font-size:11px;">${timeDisplay}</div>
          <div class="news-body">
            <div class="news-title" style="font-size:13px;line-height:1.4;">${n.title}</div>
            <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
              <span style="font-size:9px;padding:2px 8px;border-radius:4px;background:${tagColor};color:${tagTextColor};font-weight:600;">${tagLabel}</span>
              <span style="font-size:10px;color:var(--text-muted);">${n.source || 'Новости'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Московское время (UTC+3)
  function formatExactTime(date) {
    try {
      const d = new Date(date);
      const now = new Date();
      
      // Переводим в московское время (UTC+3)
      const mskOffset = 3 * 60 * 60 * 1000;
      const mskTime = new Date(d.getTime() + mskOffset);
      const nowMsk = new Date(now.getTime() + mskOffset);
      
      const today = new Date(nowMsk.getFullYear(), nowMsk.getMonth(), nowMsk.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const hours = String(mskTime.getHours()).padStart(2, '0');
      const minutes = String(mskTime.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      if (mskTime >= today) {
        return `Сегодня ${timeStr}`;
      } else if (mskTime >= yesterday) {
        return `Вчера ${timeStr}`;
      } else {
        const day = String(mskTime.getDate()).padStart(2, '0');
        const month = String(mskTime.getMonth() + 1).padStart(2, '0');
        return `${day}.${month} ${timeStr}`;
      }
    } catch {
      return 'недавно';
    }
  }

  function updateNewsPreview() {
    const container = Utils.el('news-preview-list');
    if (container) {
      container.innerHTML = renderNewsPreview();
    }
  }

  function showNewsPanel() {
    const panel = Utils.el('news-panel');
    if (!panel) return;

    // Добавляем фильтры в панель (если их нет)
    let filterContainer = panel.querySelector('.news-filter-tabs');
    if (!filterContainer) {
      const header = panel.querySelector('.notif-panel-header');
      if (header) {
        const filters = document.createElement('div');
        filters.className = 'news-filter-tabs';
        filters.style.cssText = 'padding:12px 16px 0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;';
        filters.innerHTML = `
          <button class="filter-tab active" data-filter="all">Все</button>
          <button class="filter-tab" data-filter="crypto">🪙 Крипто</button>
          <button class="filter-tab" data-filter="stocks">📊 Акции</button>
          <button class="filter-tab" data-filter="us">🇺🇸 США</button>
          <button class="filter-tab" data-filter="ru">🇷🇺 Россия</button>
        `;
        header.parentNode.insertBefore(filters, header.nextSibling);

        // Фильтры
        filters.querySelectorAll('.filter-tab').forEach(btn => {
          btn.addEventListener('click', () => {
            filters.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            const list = panel.querySelector('#news-list-all');
            if (list) {
              list.innerHTML = NewsManager.renderNewsList(filter);
            }
          });
        });
      }
    }

    // Обновляем список при открытии
    const list = panel.querySelector('#news-list-all');
    if (list) {
      const activeFilter = panel.querySelector('.filter-tab.active')?.dataset.filter || 'all';
      list.innerHTML = NewsManager.renderNewsList(activeFilter);
    }

    // Открываем панель
    panel.classList.add('open');

    // Крестик уже есть в index.html с id="close-news"
    // Он уже должен работать, так как в index.html есть обработчик?
    // Добавим обработчик на случай, если его нет
    const closeBtn = panel.querySelector('#close-news');
    if (closeBtn) {
      // Удаляем старые обработчики, чтобы не дублировать
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener('click', () => {
        panel.classList.remove('open');
      });
    }
  }

  // === ОПОВЕЩЕНИЯ ===
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