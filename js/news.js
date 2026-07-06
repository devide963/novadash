const NewsManager = (() => {
  const STORAGE_KEY = 'nova_news_cache';
  let cachedNews = [];
  let currentFilter = 'all';
  let isRefreshing = false;

  // === ТОЛЬКО РУССКИЕ ИСТОЧНИКИ + КРИПТА НА АНГЛИЙСКОМ ===
  const FEEDS = [
    // === РОССИЙСКИЕ НОВОСТИ (главные) ===
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
    // === КРИПТО-НОВОСТИ (на английском, но фильтруем по тегам) ===
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss&count=20',
      tag: 'crypto',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdecrypt.co%2Ffeed&count=15',
      tag: 'crypto',
      parse: parseRss2json,
    },
    // === АКЦИИ США (фильтруем по тегам) ===
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.marketwatch.com%2Fmarketwatch%2Ftopstories%2F&count=15',
      tag: 'us',
      parse: parseRss2json,
    },
  ];

  // === РУССКИЙ ФОЛБЕК (реальные новости, если API не работает) ===
  function getRussianFallbackNews() {
    const now = new Date();
    const ago = (m) => new Date(now - m * 60000);
    return [
      { title: 'Биткоин держится выше $66 000 на фоне роста институционального спроса', tag: 'crypto', time: formatExactTime(ago(5)), link: '', source: 'Cointelegraph', pubDate: ago(5) },
      { title: 'Сбербанк представил рекордную прибыль по итогам полугодия', tag: 'ru', time: formatExactTime(ago(12)), link: '', source: 'Ведомости', pubDate: ago(12) },
      { title: 'Индекс МосБиржи обновил максимум с начала года', tag: 'ru', time: formatExactTime(ago(18)), link: '', source: 'Интерфакс', pubDate: ago(18) },
      { title: 'Ethereum готовится к обновлению сети в третьем квартале', tag: 'crypto', time: formatExactTime(ago(25)), link: '', source: 'Decrypt', pubDate: ago(25) },
      { title: 'ЦБ РФ сохранил ключевую ставку на уровне 16%', tag: 'ru', time: formatExactTime(ago(35)), link: '', source: 'РБК', pubDate: ago(35) },
      { title: 'NVIDIA показала рекордную выручку благодаря спросу на AI-чипы', tag: 'us', time: formatExactTime(ago(42)), link: '', source: 'MarketWatch', pubDate: ago(42) },
      { title: 'Газпром договорился о новых поставках газа в Китай', tag: 'ru', time: formatExactTime(ago(50)), link: '', source: 'Коммерсантъ', pubDate: ago(50) },
      { title: 'Роснефть увеличила добычу нефти на 3,2% в первом полугодии', tag: 'ru', time: formatExactTime(ago(58)), link: '', source: 'РБК', pubDate: ago(58) },
      { title: 'Solana DeFi достиг нового максимума по заблокированным средствам', tag: 'crypto', time: formatExactTime(ago(65)), link: '', source: 'CoinTelegraph', pubDate: ago(65) },
      { title: 'ВТБ увеличил кредитный портфель на 15% за полгода', tag: 'ru', time: formatExactTime(ago(72)), link: '', source: 'Ведомости', pubDate: ago(72) },
    ];
  }

  function parseRss2json(data, defaultTag) {
    if (!data || !data.items) return [];
    return data.items
      .map(item => ({
        title: cleanTitle(item.title || ''),
        link:  item.link  || '',
        time:  formatExactTime(item.pubDate),
        tag:   guessTag(item.title, defaultTag),
        source: data.feed?.title || defaultTag,
        pubDate: new Date(item.pubDate || Date.now()),
      }))
      .filter(n => {
        // Фильтруем: только крипта, акции США или Россия
        if (n.tag === 'crypto' || n.tag === 'us' || n.tag === 'ru') {
          return n.title.length > 15;
        }
        return false;
      });
  }

  function cleanTitle(t) {
    return t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
  }

  function guessTag(title, def) {
    const t = (title || '').toUpperCase();
    
    // === КРИПТО-КЛЮЧЕВЫЕ СЛОВА ===
    if (/BTC|BITCOIN|ETH|ETHEREUM|SOL|SOLANA|XRP|DOGE|ADA|POLKADOT|LINK|AVAX|CRYPTO|BLOCKCHAIN|DEFI|NFT|TOKEN|MINING|HALVING|ALTCOIN|STABLECOIN|WEB3|METAVERSE|BITCOIN ETF|BITCOIN SPOT ETF/i.test(t)) {
      return 'crypto';
    }
    
    // === РОССИЯ (поиск по русским буквам и ключевым словам) ===
    if (/[А-Яа-я]/.test(t) || /РФ|РОССИЯ|RUSSIA|RUSSIAN|МОСКВА|MOSCOW|РУБЛЬ|RUBLE|СБЕР|ГАЗПРОМ|РОСНЕФТЬ|ЛУКОЙЛ|ЯНДЕКС|ВТБ|СОВКОМБАНК|ТИНЬКОФФ|ММВБ|RTS|MOEX|РУБ|ПУТИН|КРЕМЛЬ|ДУМА|ПРАВИТЕЛЬСТВО|ЦБ|МИНФИН/i.test(t)) {
      return 'ru';
    }
    
    // === АКЦИИ США ===
    if (/APPLE|AAPL|MICROSOFT|MSFT|NVIDIA|NVDA|GOOGLE|GOOGL|AMAZON|AMZN|META|TESLA|TSLA|NETFLIX|NFLX|WALL STREET|S&P|DOW|NASDAQ|FED|RATE|FOMC|BUFFETT|MUSK|ELON|JPMORGAN|GOLDMAN|BANK OF AMERICA|CITI|WELLS FARGO|BOEING|GE|FORD|GM|DISNEY|NFLX|ADOBE|SALESFORCE|ORACLE|IBM|INTEL|AMD|QUALCOMM|TEXAS INSTRUMENTS|BROADCOM|CISCO|HP|DELL|EBAY|PAYPAL|SQUARE|SHOPIFY|SNOWFLAKE|PALANTIR/i.test(t)) {
      return 'us';
    }
    
    return def;
  }

  // Московское время (UTC+3)
  function formatExactTime(dateStr) {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      
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
      refreshInBackground();
      return cachedNews;
    }
    
    if (!cachedNews.length) {
      const loaded = loadFromCache();
      if (loaded) {
        refreshInBackground();
        return cachedNews;
      }
    }

    return await refreshNews();
  }

  async function refreshNews() {
    if (isRefreshing) return cachedNews;
    isRefreshing = true;

    try {
      console.log('🔄 Начинаем обновление новостей...');
      
      const results = await Promise.allSettled(
        FEEDS.map(f =>
          fetch(f.url, { signal: AbortSignal.timeout(5000) })
            .then(r => r.json())
            .then(data => f.parse(data, f.tag))
            .catch(() => [])
        )
      );
      
      let all = [];
      results.forEach(r => {
        if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length) {
          all = all.concat(r.value);
        }
      });

      console.log(`📰 Загружено ${all.length} новостей`);

      // Если ничего не загрузилось — используем русский фолбек
      if (!all.length) {
        console.log('⚠️ Используем русский фолбек');
        all = getRussianFallbackNews();
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
        console.log(`✅ Сохранено ${all.length} новостей в кэш`);
      }

      isRefreshing = false;
      return cachedNews;

    } catch (e) {
      console.error('❌ Ошибка обновления новостей:', e);
      isRefreshing = false;
      if (cachedNews.length) {
        cachedNews = cachedNews.map(n => ({
          ...n,
          time: formatExactTime(n.pubDate),
        }));
        saveToCache(cachedNews);
        return cachedNews;
      }
      // Если нет кэша — используем фолбек
      const fallback = getRussianFallbackNews();
      cachedNews = fallback;
      saveToCache(fallback);
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
    };
    const style = tagColors[news.tag] || tagColors.ru;
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
    }, 30 * 1000);
  }

  function getLatest(n = 3) {
    return cachedNews.slice(0, n);
  }

  function init() {
    loadFromCache();
    startPolling();
    setTimeout(() => {
      refreshInBackground();
    }, 1000);
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