const NewsManager = (() => {
  const STORAGE_KEY = 'nova_news_cache';
  let cachedNews = [];
  let currentFilter = 'all';
  let isRefreshing = false;

  const FEEDS = [
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
      time:  formatExactTime(item.pubDate),
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

  function formatExactTime(dateStr) {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      if (d >= today) {
        return `Сегодня ${timeStr}`;
      } else if (d >= yesterday) {
        return `Вчера ${timeStr}`;
      } else {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}.${month} ${timeStr}`;
      }
    } catch { return 'недавно'; }
  }

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.news) && data.news.length) {
          cachedNews = data.news.map(n => ({
            ...n,
            pubDate: new Date(n.pubDate),
            time: formatExactTime(n.pubDate),
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
          time: formatExactTime(n.pubDate),
        })),
        updatedAt: Date.now(),
      }));
    } catch (e) {
      console.warn('Ошибка сохранения кэша новостей:', e);
    }
  }

  async function fetchAll(force = false) {
    if (!force && cachedNews.length) {
      return cachedNews;
    }

    if (!cachedNews.length) {
      const loaded = loadFromCache();
      if (loaded) return cachedNews;
    }

    if (cachedNews.length && !force) {
      refreshInBackground();
      return cachedNews;
    }

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

      if (!all.length) {
        isRefreshing = false;
        if (cachedNews.length) return cachedNews;
        const loaded = loadFromCache();
        if (loaded) return cachedNews;
        return [];
      }

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
      if (cachedNews.length) return cachedNews;
      loadFromCache();
      return cachedNews;
    }
  }

  async function refreshInBackground() {
    if (isRefreshing) return;
    try {
      await refreshNews();
    } catch (e) {}
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
    const timeDisplay = news.time || formatExactTime(news.pubDate);
    return `
      <div class="news-item" onclick="window.open('${news.link || '#'}', '_blank')">
        <div class="news-time" style="min-width:50px;font-size:11px;">${timeDisplay}</div>
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

  function startPolling() {
    setInterval(() => {
      refreshInBackground();
    }, 3 * 60 * 1000);
  }

  function getLatest(n = 4) {
    return cachedNews.slice(0, n);
  }

  function init() {
    loadFromCache();
    startPolling();
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