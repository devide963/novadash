const NewsManager = (() => {
  const STORAGE_KEY = 'nova_news_cache';
  let cachedNews = [];
  let currentFilter = 'all';
  let isRefreshing = false;

  // === ИСТОЧНИКИ НОВОСТЕЙ ===
  const NEWS_SOURCES = [
    // === РОССИЙСКИЕ ИСТОЧНИКИ (ПРИОРИТЕТ) ===
    {
      url: 'https://www.rbc.ru/rss/',
      tag: 'ru',
      source: 'РБК',
    },
    {
      url: 'https://www.vedomosti.ru/rss/news/',
      tag: 'ru',
      source: 'Ведомости',
    },
    {
      url: 'https://www.kommersant.ru/RSS/news.xml',
      tag: 'ru',
      source: 'Коммерсантъ',
    },
    {
      url: 'https://www.interfax.ru/rss.asp?sec=1',
      tag: 'ru',
      source: 'Интерфакс',
    },
    // === КРИПТО (английские) ===
    {
      url: 'https://cointelegraph.com/rss',
      tag: 'crypto',
      source: 'Cointelegraph',
    },
    // === АКЦИИ США (английские) ===
    {
      url: 'https://feeds.marketwatch.com/marketwatch/topstories/',
      tag: 'us',
      source: 'MarketWatch',
    },
  ];

  // === ЗАГРУЗКА ЧЕРЕЗ БЕКЕНД ===
  async function fetchViaBackend(url, sourceName) {
    try {
      console.log(`🔄 ${sourceName}: загружаем через бекенд...`);
      const response = await fetch(
        `https://worker-production-d2239.up.railway.app/api/news-proxy?url=${encodeURIComponent(url)}`,
        {
          signal: AbortSignal.timeout(15000),
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      console.log(`✅ ${sourceName}: загружено через бекенд`);
      return text;
      
    } catch (e) {
      console.warn(`❌ ${sourceName}: ошибка загрузки через бекенд (${e.message})`);
      throw e;
    }
  }

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
        
        const fullText = title + ' ' + description;
        const tag = guessTag(fullText);
        
        // Пропускаем только: крипта, Россия, США
        if (tag === 'crypto' || tag === 'ru' || tag === 'us') {
          results.push({
            title: cleanTitle(title),
            link: link || '',
            tag: tag,
            source: sourceName || defaultTag,
            pubDate: new Date(pubDate || Date.now()),
          });
        }
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

  // === ФИЛЬТРАЦИЯ: РОССИЯ (приоритет), КРИПТА, США ===
  function guessTag(text) {
    const t = text.toUpperCase();
    
    // === 1. РОССИЯ (есть русские буквы) ===
    if (/[А-Яа-я]/.test(text)) {
      // Ключевые слова для российских новостей
      const ruWords = /\b(РФ|РОССИЯ|RUSSIA|RUSSIAN|МОСКВА|MOSCOW|РУБЛЬ|RUBLE|СБЕР|СБЕРБАНК|ГАЗПРОМ|РОСНЕФТЬ|ЛУКОЙЛ|ЯНДЕКС|ВТБ|СОВКОМБАНК|ТИНЬКОФФ|ММВБ|RTS|MOEX|РУБ|ПУТИН|КРЕМЛЬ|ДУМА|ПРАВИТЕЛЬСТВО|ЦБ|МИНФИН|ИНДЕКС МОСБИРЖИ|АКЦИЯ|РЫНОК|НОВАТЭК|СУРГУТНЕФТЕГАЗ|ТАТНЕФТЬ|АЛРОСА|МАГНИТ|МТС|МЕГАФОН|РОСТЕЛЕКОМ|АЭРОФЛОТ|СЕВЕРСТАЛЬ|НЛМК|ММК|РУСАЛ|НЕФТЬ|ГАЗ|ЭНЕРГЕТИКА|МЕТАЛЛУРГИЯ|ЭКОНОМИКА|ФИНАНСЫ|БАНК|КРЕДИТ|ИПОТЕКА|СТАВКА|КЛЮЧЕВАЯ СТАВКА|ИНФЛЯЦИЯ|БЮДЖЕТ|ЗОЛОТО|ТРАНСПОРТ|ЛОГИСТИКА|СВЯЗЬ|ТЕЛЕКОМ|ЦИФРОВИЗАЦИЯ|ИИ|ДРОНЫ|ЭЛЕКТРОМОБИЛИ|СПГ|ГАЗПРОВОД|НЕФТЕПРОВОД|ЭЛЕКТРОЭНЕРГИЯ|ТАРИФЫ|СУБСИДИИ|ПЕНСИИ|ЗАРПЛАТА|НАЛОГИ|НДС|НДФЛ|ПРИБЫЛЬ|АКТИВЫ|ИНВЕСТИЦИИ|ДИВИДЕНДЫ|КУРС|БИРЖА|ТОРГИ|ЛИКВИДНОСТЬ|ВОЛАТИЛЬНОСТЬ|КРИЗИС|РЕЦЕССИЯ|РОСТ|ПАДЕНИЕ|ТРЕНД|ПРОГНОЗ|АНАЛИЗ|ОТЧЁТ|СТАТИСТИКА|ИНДЕКСЫ|МОСБИРЖА|СПБ БИРЖА|ФОНДОВЫЙ РЫНОК|РЫНОК АКЦИЙ|РЫНОК ОБЛИГАЦИЙ|ДОЛЛАР|ЕВРО|ЮАНЬ|КИТАЙ|САНКЦИИ|ИМПОРТ|ЭКСПОРТ|ГОСДОЛГ|ФНБ|ЗОЛОТОВАЛЮТНЫЕ РЕЗЕРВЫ)\b/i;
      if (ruWords.test(t)) {
        return 'ru';
      }
      return 'other';
    }
    
    // === 2. КРИПТОВАЛЮТЫ ===
    const cryptoWords = /\b(BTC|BITCOIN|ETH|ETHEREUM|SOL|SOLANA|XRP|DOGE|DOGECOIN|ADA|CARDANO|POLKADOT|DOT|LINK|CHAINLINK|AVAX|AVALANCHE|MATIC|POLYGON|UNI|UNISWAP|ATOM|COSMOS|LTC|LITECOIN|BCH|XLM|STELLAR|ALGO|ALGORAND|VET|ICP|FIL|ETC|AAVE|MKR|COMP|YFI|CRV|SUSHI|CAKE|1INCH|ENJ|CHZ|MANA|SAND|AXS|SHIB|FLOKI|PEPE|BONK|NOT|TON|NEAR|ARB|OP|BASE|BLAST|STRK|ZKSYNC|APT|SUI|SEI|INJ|TIA|PENDLE|RNDR|FET|WLD|ARKM|TAO|CRYPTO|CRYPTOCURRENCY|BLOCKCHAIN|WEB3|DEFI|NFT|TOKEN|ALTCOIN|STABLECOIN|METAVERSE|COINBASE|BINANCE|BYBIT|OKX|KRAKEN|HALVING|MINING|STAKING|AIRDROP|MARKETCAP|LIQUIDITY|LEVERAGE|FUTURES|SWAP|BRIDGE|LAYER2|RESTAKING|BITCOINETF|ETHETF|BULLRUN|BEARMARKET|PUMP|DUMP|MOON|WHALE|ATH|ATL|WALLET|EXCHANGE|TRADING|HODL|REKT|GAS|YIELD|FARMING|POOL|VALIDATOR|NODE|MAINNET|UPGRADE|FORK|AIRDROP|IDO|IEO|NFTCOLLECTION|OPENSEA|BLUR|BAYC|PUNKS|AZUKI|DEX|CEX|AMM|KYC)\b/i;
    if (cryptoWords.test(t)) {
      return 'crypto';
    }
    
    // === 3. АКЦИИ США ===
    const usWords = /\b(APPLE|AAPL|MICROSOFT|MSFT|NVIDIA|NVDA|GOOGLE|GOOGL|AMAZON|AMZN|META|TESLA|TSLA|NETFLIX|NFLX|WALL STREET|S&P|SPY|DOW|NASDAQ|FED|FOMC|JPMORGAN|JPM|GOLDMAN|GS|BANK OF AMERICA|BAC|CITI|WELLS FARGO|WFC|BOEING|BA|FORD|F|GM|DISNEY|DIS|ADOBE|ADBE|SALESFORCE|CRM|ORACLE|ORCL|IBM|INTEL|INTC|AMD|QUALCOMM|QCOM|BROADCOM|AVGO|CISCO|CSCO|EARNINGS|DIVIDEND|RUSSELL2000|VIX|INFLATION|UNEMPLOYMENT|CPI|PPI|GDP|ECONOMY|RECESSION|BEARMARKET|BULLMARKET|INTERESTRATE|MORTGAGE|HOUSING|RETAILSALES|CONSUMER|MANUFACTURING|SERVICES|PMI|ISM|USD|DOLLAR|COMMODITIES|OIL|GOLD|SILVER|TECHNOLOGY|SOFTWARE|CLOUD|SEMICONDUCTOR|CHIP|TSM|ASML|TXN|MU|LRCX|KLAC|AMAT|NXPI|ON|SWKS|MPWR|SMCI|DELL|HP|WDC|SEAGATE|UBER|LYFT|AIRBNB|STARBUCKS|SBUX|COCACOLA|KO|PEPSICO|PEP|MCDONALDS|MCD|PFIZER|PFE|MERCK|MRK|JOHNSON|JNJ|ELILILLY|LLY|NOVARTIS|NVS|GE|HONEYWELL|RAYTHEON|LOCKHEED|LMT|NORTHROP|NOC|SPACEX|STARLINK|AEROSPACE|DEFENSE|HEALTHCARE|PHARMACEUTICAL|BIOTECH|VACCINE)\b/i;
    if (usWords.test(t)) {
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

  // === СОРТИРОВКА: СНАЧАЛА РУССКИЕ, ПОТОМ АНГЛИЙСКИЕ ===
  function sortNewsByPriority(news) {
    const priority = { ru: 0, crypto: 1, us: 2 };
    return news.sort((a, b) => {
      // Сначала по приоритету (ru > crypto > us)
      const priorityDiff = (priority[a.tag] ?? 3) - (priority[b.tag] ?? 3);
      if (priorityDiff !== 0) return priorityDiff;
      // Затем по дате (свежие сверху)
      return b.pubDate - a.pubDate;
    });
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
          const text = await fetchViaBackend(source.url, source.source);
          const parsed = parseRSS(text, source.tag, source.source);
          if (parsed.length > 0) {
            console.log(`✅ ${source.source}: ${parsed.length} новостей`);
          }
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

      if (!all.length) {
        console.log('⚠️ Новости не загрузились');
        isRefreshing = false;
        if (cachedNews.length) {
          return cachedNews;
        }
        return [];
      }

      // === СОРТИРУЕМ: СНАЧАЛА РУССКИЕ ===
      all = sortNewsByPriority(all);
      
      // Дедупликация
      const seen = new Set();
      all = all.filter(n => {
        const key = n.title.slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Оставляем до 50 новостей (но стараемся сохранить все русские)
      const ruNews = all.filter(n => n.tag === 'ru');
      const otherNews = all.filter(n => n.tag !== 'ru');
      
      // Сначала все русские, потом остальные (до 50 всего)
      let finalNews = [...ruNews];
      const remainingSlots = 50 - ruNews.length;
      if (remainingSlots > 0) {
        finalNews = finalNews.concat(otherNews.slice(0, remainingSlots));
      }

      if (finalNews.length) {
        cachedNews = finalNews;
        saveToCache(finalNews);
        console.log(`✅ Сохранено ${finalNews.length} новостей в кэш (${ruNews.length} русских)`);
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
    }, 60 * 1000);
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