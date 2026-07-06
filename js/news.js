const NewsManager = (() => {
  const STORAGE_KEY = 'nova_news_cache';
  let cachedNews = [];
  let currentFilter = 'all';
  let isRefreshing = false;

  const NEWS_SOURCES = [
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.rbc.ru%2Frss%2F',
      tag: 'ru',
      source: 'РБК',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.vedomosti.ru%2Frss%2Fnews%2F',
      tag: 'ru',
      source: 'Ведомости',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.kommersant.ru%2FRSS%2Fnews.xml',
      tag: 'ru',
      source: 'Коммерсантъ',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.interfax.ru%2Frss.asp%3Fsec%3D1',
      tag: 'ru',
      source: 'Интерфакс',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fcointelegraph.com%2Frss',
      tag: 'crypto',
      source: 'Cointelegraph',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Ffeeds.marketwatch.com%2Fmarketwatch%2Ftopstories%2F',
      tag: 'us',
      source: 'MarketWatch',
    },
  ];

  // === БЕЗ ФОЛБЕКА! ТОЛЬКО РЕАЛЬНЫЕ НОВОСТИ ===

  function parseRSS(xmlText, defaultTag, sourceName) {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'text/xml');
      
      if (xml.querySelector('parsererror')) {
        return [];
      }
      
      const items = xml.querySelectorAll('item');
      const results = [];
      
      items.forEach(item => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        
        if (title.length < 15) return;
        
        const tag = guessTag(title + ' ' + description, defaultTag);
        
        // ТОЛЬКО КРИПТА И АКЦИИ (США + РОССИЯ)
        if (tag !== 'crypto' && tag !== 'us' && tag !== 'ru') {
          return;
        }
        
        results.push({
          title: cleanTitle(title),
          link: link || '',
          tag: tag,
          source: sourceName || defaultTag,
          pubDate: new Date(pubDate || Date.now()),
        });
      });
      
      return results;
    } catch (e) {
      console.warn('Ошибка парсинга RSS:', e);
      return [];
    }
  }

  function cleanTitle(t) {
    return t
      .replace(/&amp;/g,'&')
      .replace(/&lt;/g,'<')
      .replace(/&gt;/g,'>')
      .replace(/&#39;/g,"'")
      .replace(/&quot;/g,'"')
      .replace(/\[.*?\]/g, '')
      .trim();
  }

  function guessTag(title, def) {
    const t = (title || '').toUpperCase();
    
    // === КРИПТО ===
    if (/BTC|BITCOIN|ETH|ETHEREUM|SOL|SOLANA|XRP|DOGE|ADA|POLKADOT|DOT|LINK|CHAINLINK|AVAX|CRYPTO|BLOCKCHAIN|DEFI|NFT|TOKEN|MINING|HALVING|ALTCOIN|STABLECOIN|WEB3|METAVERSE|BITCOIN ETF|COINBASE|BINANCE|CRYPTO/i.test(t)) {
      return 'crypto';
    }
    
    // === РОССИЯ ===
    if (/[А-Яа-я]/.test(t)) {
      if (/РФ|РОССИЯ|RUSSIA|RUSSIAN|МОСКВА|MOSCOW|РУБЛЬ|RUBLE|СБЕР|СБЕРБАНК|ГАЗПРОМ|РОСНЕФТЬ|ЛУКОЙЛ|ЯНДЕКС|ВТБ|СОВКОМБАНК|ТИНЬКОФФ|ММВБ|RTS|MOEX|РУБ|ПУТИН|КРЕМЛЬ|ДУМА|ПРАВИТЕЛЬСТВО|ЦБ|МИНФИН|ИНДЕКС МОСБИРЖИ|АКЦИЯ|РЫНОК/i.test(t)) {
        return 'ru';
      }
    }
    
    // === США ===
    if (/APPLE|AAPL|MICROSOFT|MSFT|NVIDIA|NVDA|GOOGLE|GOOGL|AMAZON|AMZN|META|TESLA|TSLA|NETFLIX|NFLX|WALL STREET|S&P|SPY|DOW|NASDAQ|FED|FOMC|RATE|BUFFETT|MUSK|ELON|JPMORGAN|GOLDMAN|BANK OF AMERICA|CITI|WELLS FARGO|BOEING|FORD|GM|DISNEY|ADOBE|SALESFORCE|ORACLE|IBM|INTEL|AMD|QUALCOMM|BROADCOM|CISCO|STOCK|SHARES|EARNINGS|DIVIDEND/i.test(t)) {
      return 'us';
    }
    
    return 'other';
  }

  function formatExactTime(date) {
    try {
      const d = new Date(date);
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
    } catch { 
      return 'недавно'; 
    }
  }

  // === КЭШ ===
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
      const newsWithTime = news.map(n => ({
        ...n,
        pubDate: n.pubDate.toISOString ? n.pubDate.toISOString() : n.pubDate,
        time: formatExactTime(n.pubDate),
      }));
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        news: newsWithTime,
        updatedAt: Date.now(),
      }));
    } catch (e) {
      console.warn('Ошибка сохранения кэша новостей:', e);
    }
  }

  // === ОСНОВНЫЕ ФУНКЦИИ ===
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
      
      const promises = NEWS_SOURCES.map(async (source) => {
        try {
          const response = await fetch(source.url, {
            signal: AbortSignal.timeout(8000),
          });
          
          if (!response.ok) {
            console.warn(`❌ ${source.source}: HTTP ${response.status}`);
            return [];
          }
          
          const text = await response.text();
          const parsed = parseRSS(text, source.tag, source.source);
          console.log(`✅ ${source.source}: ${parsed.length} новостей`);
          return parsed;
          
        } catch (e) {
          console.warn(`❌ ${source.source}: ${e.message}`);
          return [];
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      let all = [];
      results.forEach(r => {
        if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length) {
          all = all.concat(r.value);
        }
      });

      console.log(`📰 Всего загружено ${all.length} новостей`);

      // === НЕТ ФОЛБЕКА! ЕСЛИ НЕТ НОВОСТЕЙ — ВОЗВРАЩАЕМ ПУСТОЙ МАССИВ ===
      if (!all.length) {
        console.log('⚠️ Новости не загрузились');
        isRefreshing = false;
        // Если есть кэш — возвращаем его
        if (cachedNews.length) {
          return cachedNews;
        }
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
        console.log(`✅ Сохранено ${all.length} новостей в кэш`);
      }

      isRefreshing = false;
      return cachedNews;

    } catch (e) {
      console.error('❌ Ошибка обновления новостей:', e);
      isRefreshing = false;
      
      if (cachedNews.length) {
        return cachedNews;
      }
      
      return [];
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
    const link = news.link || '#';
    
    return `
      <div class="news-item" onclick="window.open('${link}', '_blank')" style="cursor:pointer;">
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