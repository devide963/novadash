const NewsManager = (() => {
  // Cache
  let cachedNews  = [];
  let lastFetched = 0;
  const CACHE_TTL = 5 * 60 * 1000; // 5 min

  // RSS-to-JSON proxies (free, no key required)
  const FEEDS = [
    {
      // CoinTelegraph via rss2json
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss&count=15',
      tag: 'Крипто', parse: parseRss2json,
    },
    {
      // Decrypt
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdecrypt.co%2Ffeed&count=10',
      tag: 'Крипто', parse: parseRss2json,
    },
    {
      // MarketWatch
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.marketwatch.com%2Fmarketwatch%2Ftopstories%2F&count=10',
      tag: 'Акции', parse: parseRss2json,
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
    })).filter(n => n.title.length > 10);
  }

  function cleanTitle(t) {
    return t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
  }

  function guessTag(title, def) {
    const t = (title || '').toUpperCase();
    if (/BTC|BITCOIN/i.test(t)) return 'BTC';
    if (/ETH|ETHEREUM/i.test(t)) return 'ETH';
    if (/SOL|SOLANA/i.test(t)) return 'SOL';
    if (/XRP|RIPPLE/i.test(t)) return 'XRP';
    if (/DOGE|DOGECOIN/i.test(t)) return 'DOGE';
    if (/APPLE|AAPL/i.test(t)) return 'AAPL';
    if (/NVIDIA|NVDA/i.test(t)) return 'NVDA';
    if (/TESLA|TSLA/i.test(t)) return 'TSLA';
    if (/S&P|SPY|DOW|NASDAQ/i.test(t)) return 'SPX';
    if (/CRYPTO|BLOCKCHAIN|DEFI|NFT/i.test(t)) return 'Крипто';
    if (/STOCK|MARKET|SHARE|FED|RATE/i.test(t)) return 'Рынки';
    return def;
  }

  function formatNewsTime(dateStr) {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = (now - d) / 1000;
      if (diff < 3600)    return `${Math.floor(diff / 60)}м назад`;
      if (diff < 86400)   return `${Math.floor(diff / 3600)}ч назад`;
      return d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
    } catch { return 'недавно'; }
  }

  async function fetchAll() {
    const now = Date.now();
    if (cachedNews.length && (now - lastFetched) < CACHE_TTL) {
      return cachedNews;
    }

    const results = await Promise.allSettled(
      FEEDS.map(f =>
        fetch(f.url, { signal: AbortSignal.timeout(6000) })
          .then(r => r.json())
          .then(data => f.parse(data, f.tag))
      )
    );

    let all = [];
    results.forEach(r => {
      if (r.status === 'fulfilled') all = all.concat(r.value);
    });

    if (!all.length) {
      // Fallback: static demo news if all feeds failed
      all = getFallbackNews();
    }

    // Sort by date desc, dedupe
    all.sort((a, b) => b.pubDate - a.pubDate);
    const seen = new Set();
    all = all.filter(n => {
      const key = n.title.slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    cachedNews  = all;
    lastFetched = now;
    return all;
  }

  function getFallbackNews() {
    const now = new Date();
    const ago = (m) => new Date(now - m * 60000);
    return [
      { title: 'Bitcoin holds above $66,000 as institutional demand grows',       tag: 'BTC',    time: formatNewsTime(ago(15)),  link: '', source: 'Markets', pubDate: ago(15)  },
      { title: 'Ethereum network upgrade scheduled: what investors need to know', tag: 'ETH',    time: formatNewsTime(ago(42)),  link: '', source: 'Markets', pubDate: ago(42)  },
      { title: 'NVIDIA posts record earnings driven by AI chip demand',            tag: 'NVDA',   time: formatNewsTime(ago(78)),  link: '', source: 'Markets', pubDate: ago(78)  },
      { title: 'Fed holds rates steady, signals caution on future cuts',           tag: 'Рынки',  time: formatNewsTime(ago(130)), link: '', source: 'Markets', pubDate: ago(130) },
      { title: 'Solana ecosystem sees surge in DeFi activity',                     tag: 'SOL',    time: formatNewsTime(ago(195)), link: '', source: 'Markets', pubDate: ago(195) },
      { title: 'Apple quarterly revenue beats expectations despite market headwinds', tag:'AAPL', time: formatNewsTime(ago(260)), link: '', source: 'Markets', pubDate: ago(260) },
      { title: 'XRP gains 5% as Ripple lawsuit developments emerge',               tag: 'XRP',    time: formatNewsTime(ago(310)), link: '', source: 'Markets', pubDate: ago(310) },
      { title: 'Gold hits 3-month high amid global uncertainty',                   tag: 'GOLD',   time: formatNewsTime(ago(380)), link: '', source: 'Markets', pubDate: ago(380) },
      { title: 'Tesla stock recovers after strong delivery numbers',                tag: 'TSLA',   time: formatNewsTime(ago(445)), link: '', source: 'Markets', pubDate: ago(445) },
      { title: 'Crypto market cap crosses $2.5 trillion milestone',                tag: 'Крипто', time: formatNewsTime(ago(510)), link: '', source: 'Markets', pubDate: ago(510) },
    ];
  }

  // Refresh time labels every minute
  function refreshTimestamps() {
    setInterval(() => {
      if (cachedNews.length) {
        cachedNews = cachedNews.map(n => ({
          ...n,
          time: formatNewsTime(n.pubDate),
        }));
      }
    }, 60000);
  }

  // Poll for new news every 5 min
  function startPolling(onUpdate) {
    refreshTimestamps();
    setInterval(async () => {
      const old = cachedNews.length;
      lastFetched = 0; // force refresh
      const fresh = await fetchAll();
      if (fresh.length !== old || (fresh[0]?.title !== cachedNews[0]?.title)) {
        if (typeof onUpdate === 'function') onUpdate(fresh);
      }
    }, CACHE_TTL);
  }

  function getLatest(n = 3) {
    return cachedNews.slice(0, n);
  }

  return { fetchAll, getLatest, startPolling };
})();