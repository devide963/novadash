const NewsManager = (() => {
  const STORAGE_KEY = 'nova_news_cache';
  let cachedNews = [];
  let currentFilter = 'all';
  let isRefreshing = false;

  // === МНОГО ИСТОЧНИКОВ (с запасными) ===
  const FEEDS = [
    // Крипто
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss&count=15',
      tag: 'crypto',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdecrypt.co%2Ffeed&count=10',
      tag: 'crypto',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coindesk.com%2Farc%2Foutboundfeeds%2Frss%2F&count=10',
      tag: 'crypto',
      parse: parseRss2json,
    },
    // США
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.marketwatch.com%2Fmarketwatch%2Ftopstories%2F&count=12',
      tag: 'us',
      parse: parseRss2json,
    },
    {
      url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.cnbc.com%2Fid%2F100003114%2Fdevice%2Frss%2Frss.html&count=10',
      tag: 'us',
      parse: parseRss2json,
    },
    // РОССИЯ (основные)
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
    // === ЗАПАСНЫЕ ИСТОЧНИКИ (если rss2json не работает) ===
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.rbc.ru%2Frss%2F',
      tag: 'ru',
      parse: parseRSSFromText,
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.kommersant.ru%2FRSS%2Fnews.xml',
      tag: 'ru',
      parse: parseRSSFromText,
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

  // Парсинг RSS из обычного текста (запасной вариант)
  function parseRSSFromText(text, defaultTag) {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const items = xml.querySelectorAll('item');
      const results = [];
      
      items.forEach(item => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        results.push({
          title: cleanTitle(title),
          link: link,
          time: formatExactTime(pubDate),
          tag: guessTag(title, defaultTag),
          source: defaultTag,
          pubDate: new Date(pubDate || Date.now()),
        });
      });
      
      return results.filter(n => n.title.length > 15);
    } catch (e) {
      return [];
    }
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
      // В фоне обновляем, но не ждём
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

    // Принудительная загрузка
    return await refreshNews();
  }

  async function refreshNews() {
    if (isRefreshing) {
      // Ждём пока завершится текущее обновление
      return cachedNews;
    }
    isRefreshing = true;

    try {
      console.log('🔄 Начинаем обновление новостей...');
      
      // Пробуем все источники с таймаутом
      const fetchPromises = FEEDS.map(f =>
        fetch(f.url, { 
          signal: AbortSignal.timeout(5000),
          headers: {
            'Accept': 'application/json',
          }
        })
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then(data => {
            // Если это allorigins, то data - это текст RSS
            if (typeof data === 'string') {
              return f.parse(data, f.tag);
            }
            return f.parse(data, f.tag);
          })
          .catch(() => [])
      );

      const results = await Promise.allSettled(fetchPromises);
      
      let all = [];
      results.forEach(r => {
        if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length) {
          all = all.concat(r.value);
        }
      });

      console.log(`📰 Загружено ${all.length} новостей`);

      // Если ничего не загрузилось, пробуем запасной вариант через allorigins
      if (!all.length) {
        console.log('⚠️ Основные источники не дали новостей, пробуем запасные...');
        try {
          const backupResults = await Promise.allSettled([
            fetch('https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.rbc.ru%2Frss%2F', { signal: AbortSignal.timeout(5000) })
              .then(r => r.text())
              .then(text => parseRSSFromText(text, 'ru'))
              .catch(() => []),
            fetch('https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.kommersant.ru%2FRSS%2Fnews.xml', { signal: AbortSignal.timeout(5000) })
              .then(r => r.text())
              .then(text => parseRSSFromText(text, 'ru'))
              .catch(() => [])
          ]);
          
          backupResults.forEach(r => {
            if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length) {
              all = all.concat(r.value);
            }
          });
        } catch (e) {
          console.warn('Запасные источники не сработали:', e);
        }
      }

      if (!all.length) {
        console.warn('❌ Новости не загрузились, используем кэш');
        isRefreshing = false;
        if (cachedNews.length) {
          // Обновляем время в кэше
          cachedNews = cachedNews.map(n => ({
            ...n,
            time: formatExactTime(n.pubDate),
          }));
          saveToCache(cachedNews);
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
        console.log(`✅ Сохранено ${all.length} новостей в кэш`);
      }

      isRefreshing = false;
      return cachedNews;

    } catch (e) {
      console.error('❌ Ошибка обновления новостей:', e);
      isRefreshing = false;
      if (cachedNews.length) {
        // Обновляем время в кэше
        cachedNews = cachedNews.map(n => ({
          ...n,
          time: formatExactTime(n.pubDate),
        }));
        saveToCache(cachedNews);
        return cachedNews;
      }
      loadFromCache();
      return cachedNews;
    }
  }

  async function refreshInBackground() {
    if (isRefreshing) return;
    try {
      await refreshNews();
    } catch (e) {
      console.warn('Фоновая загрузка новостей:', e);
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
    // Обновляем каждые 30 секунд
    setInterval(() => {
      refreshInBackground();
    }, 30 * 1000);
  }

  function getLatest(n = 4) {
    return cachedNews.slice(0, n);
  }

  function init() {
    loadFromCache();
    startPolling();
    // Первое обновление через 1 секунду
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