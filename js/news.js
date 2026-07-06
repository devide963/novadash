const NewsManager = (() => {
  // Кэш в localStorage
  const STORAGE_KEY = 'nova_news_cache';
  let cachedNews = [];
  let currentFilter = 'all';
  let isRefreshing = false;

  // RSS-to-JSON proxies
  const FEEDS = [
    // Крипто-новости
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss&count=12',
      tag: 'crypto',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdecrypt.co%2Ffeed&count=8',
      tag: 'crypto',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coindesk.com%2Farc%2Foutboundfeeds%2Frss%2F&count=8',
      tag: 'crypto',
      parse: parseRss2json,
    },
    // Американские акции
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.marketwatch.com%2Fmarketwatch%2Ftopstories%2F&count=10',
      tag: 'us',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.cnbc.com%2Fid%2F100003114%2Fdevice%2Frss%2Frss.html&count=8',
      tag: 'us',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffinance.yahoo.com%2Fnews%2Frss%2F&count=8',
      tag: 'us',
      parse: parseRss2json,
    },
    // Российские новости
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.rbc.ru%2Frss%2F',
      tag: 'ru',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.vedomosti.ru%2Frss%2Fnews%2F',
      tag: 'ru',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.kommersant.ru%2FRSS%2Fnews.xml',
      tag: 'ru',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.interfax.ru%2Frss.asp%3Fsec%3D1',
      tag: 'ru',
      parse: parseRss2json,
    },
  ];

  function parseRss2json(data, defaultTag) {
    if (!data || !data.items) return [];
    return data.items.map(item => ({
      title: cleanTitle(item.title || ''),
      link:  item.link  || '',
      time:  formatNewsTime(item.pubDate),
      tag:   guessTag(item.title, defaultTag),
      source: data.feed?.title || defaultTag,
      pubDate: new Date(item.pubDate || Date.now()),
    })).filter(n => n.title.length > 15);
  }

  function cleanTitle(t) {
    return t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
  }

  function guessTag(title, def) {
    const t = (title || '').toUpperCase();
    if (/BTC|BITCOIN|ETH|ETHEREUM|SOL|SOLANA|XRP|DOGE|ADA|POLKADOT|LINK|AVAX|CRYPTO|BLOCKCHAIN|DEFI|NFT|TOKEN|MINING|HALVING|ALTCOIN|STABLECOIN/i.test(t)) {
      return 'crypto';
    }
    if (/РФ|РОССИЯ|RUSSIA|RUSSIAN|МОСКВА|MOSCOW|РУБЛЬ|RUBLE|СБЕР|ГАЗПРОМ|РОСНЕФТЬ|ЛУКОЙЛ|ЯНДЕКС|ВТБ|СОВКОМБАНК|ТИНЬКОФФ|ММВБ|RTS|MOEX|РУБ/i.test(t)) {
      return 'ru';
    }
    if (/APPLE|AAPL|MICROSOFT|MSFT|NVIDIA|NVDA|GOOGLE|GOOGL|AMAZON|AMZN|META|TESLA|TSLA|NETFLIX|NFLX|WALL STREET|S&P|DOW|NASDAQ|FED|RATE|FOMC|BUFFETT|MUSK|ELON/i.test(t)) {
      return 'us';
    }
    if (/STOCK|SHARE|MARKET|INDEX|TRADING|INVESTOR|BANK|FED|RATE|ECONOMY|EARNINGS/i.test(t)) {
      return 'stocks';
    }
    return def;
  }

  function formatNewsTime(dateStr) {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = (now - d) / 1000;
      if (diff < 60) return 'только что';
      if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
      if (diff < 172800) return 'вчера';
      return d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
    } catch { return 'недавно'; }
  }

  // === КЭШ В localStorage ===
  function loadFromCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.news) && data.news.length) {
          cachedNews = data.news.map(n => ({
            ...n,
            pubDate: new Date(n.pubDate),
          }));
          cachedNews = cachedNews.map(n => ({
            ...n,
            time: formatNewsTime(n.pubDate),
          }));
          return true;
        }
      }
    } catch (e) {
      console.warn('Ошибка загрузки кэша новостей:', e);
    }
    return false;
  }

  function saveToCache(news) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        news: news.map(n => ({
          ...n,
          pubDate: n.pubDate.toISOString ? n.pubDate.toISOString() : n.pubDate,
        })),
        updatedAt: Date.now(),
      }));
    } catch (e) {
      console.warn('Ошибка сохранения кэша новостей:', e);
    }
  }

  // === Основные функции ===
  async function fetchAll(force = false) {
    // Если есть кэш в памяти — сразу возвращаем
    if (!force && cachedNews.length) {
      return cachedNews;
    }

    // Если нет в памяти — пробуем загрузить из localStorage
    if (!cachedNews.length) {
      const loaded = loadFromCache();
      if (loaded) return cachedNews;
    }

    // Если есть кэш, но нужно обновить в фоне — возвращаем кэш
    if (cachedNews.length && !force) {
      refreshInBackground();
      return cachedNews;
    }

    // Принудительная загрузка (нет кэша или force=true)
    return await refreshNews();
  }

  async function refreshNews() {
    if (isRefreshing) return cachedNews;
    isRefreshing = true;

    try {
      const results = await Promise.allSettled(
        FEEDS.map(f =>
          fetch(f.url, { signal: AbortSignal.timeout(6000) })
            .then(r => r.json())
            .then(data => f.parse(data, f.tag))
            .catch(() => [])
        )
      );

      let all = [];
      results.forEach(r => {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          all = all.concat(r.value);
        }
      });

      // Если ничего не загрузилось — возвращаем то, что есть в кэше (или пустой массив)
      if (!all.length) {
        isRefreshing = false;
        if (cachedNews.length) {
          return cachedNews;
        }
        // Пробуем загрузить из localStorage
        const loaded = loadFromCache();
        if (loaded) {
          return cachedNews;
        }
        return [];
      }

      // Сортировка и дедупликация
      all.sort((a, b) => b.pubDate - a.pubDate);
      const seen = new Set();
      all = all.filter(n => {
        const key = n.title.slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      all = all.slice(0, 50);

      if (all.length) {
        cachedNews = all;
        saveToCache(all);
      }

      isRefreshing = false;
      return cachedNews;

    } catch (e) {
      console.warn('Ошибка обновления новостей:', e);
      isRefreshing = false;
      // Возвращаем кэш, если есть
      if (cachedNews.length) return cachedNews;
      loadFromCache();
      return cachedNews;
    }
  }

  async function refreshInBackground() {
    if (isRefreshing) return;
    try {
      await refreshNews();
    } catch (e) {
      // Игнорируем ошибки в фоне
    }
  }

  function getFilteredNews(filter = 'all') {
    if (filter === 'all') return cachedNews;
    return cachedNews.filter(n => n.tag === filter);
  }

  function renderNewsItem(news) {
    const tagColors = {
      crypto: { bg: 'rgba(247,147,26,0.15)', color: '#F7931A', label: '🪙 Крипто' },
      us:     { bg: 'rgba(37,99,235,0.15)', color: '#3B82F6', label: '🇺🇸 США' },
      ru:     { bg: 'rgba(220,38,38,0.15)', color: '#EF4444', label: '🇷🇺 Россия' },
      stocks: { bg: 'rgba(59,158,255,0.15)', color: '#3B9EFF', label: '📊 Акции' },
    };
    const style = tagColors[news.tag] || tagColors.stocks;
    return `
      <div class="news-item" onclick="window.open('${news.link || '#'}', '_blank')">
        <div class="news-time">${news.time}</div>
        <div class="news-body">
          <div class="news-title">${news.title}</div>
          <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
            <span style="font-size:9px;padding:2px 8px;border-radius:4px;background:${style.bg};color:${style.color};font-weight:600;">${style.label}</span>
            <span style="font-size:10px;color:var(--text-muted);">${news.source}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderNewsList(filter = 'all') {
    const filtered = getFilteredNews(filter);
    if (!filtered.length) {
      return `<div style="text-align:center;color:var(--text-muted);padding:30px 0;">Нет новостей</div>`;
    }
    return filtered.map(renderNewsItem).join('');
  }

  // Обновление времени каждую минуту
  function refreshTimestamps() {
    setInterval(() => {
      if (cachedNews.length) {
        cachedNews = cachedNews.map(n => ({
          ...n,
          time: formatNewsTime(n.pubDate),
        }));
        saveToCache(cachedNews);
      }
    }, 60000);
  }

  // Периодическое обновление в фоне (каждые 3 минуты)
  function startPolling() {
    refreshTimestamps();
    setInterval(() => {
      refreshInBackground();
    }, 3 * 60 * 1000);
  }

  function getLatest(n = 4) {
    return cachedNews.slice(0, n);
  }

  // === ИНИЦИАЛИЗАЦИЯ ===
  function init() {
    loadFromCache();
    startPolling();
    // Первое обновление через 2 секунды (если есть интернет)
    setTimeout(() => {
      refreshInBackground();
    }, 2000);
  }

  return {
    init,
    fetchAll,
    refreshNews,
    getLatest,
    startPolling,
    getFilteredNews,
    renderNewsList,
    renderNewsItem,
    setFilter: (f) => { currentFilter = f; },
    getFilter: () => currentFilter,
    getCacheSize: () => cachedNews.length,
  };
})();