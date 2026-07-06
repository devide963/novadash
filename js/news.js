const NewsManager = (() => {
  const STORAGE_KEY = 'nova_news_cache';
  let cachedNews = [];
  let currentFilter = 'all';
  let isRefreshing = false;
  let retryCount = 0;

  // === ИСТОЧНИКИ С ЗАПАСНЫМИ ПРОКСИ ===
  const NEWS_SOURCES = [
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.rbc.ru%2Frss%2F',
      backup: 'https://corsproxy.io/?https://www.rbc.ru/rss/',
      tag: 'ru',
      source: 'РБК',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.vedomosti.ru%2Frss%2Fnews%2F',
      backup: 'https://corsproxy.io/?https://www.vedomosti.ru/rss/news/',
      tag: 'ru',
      source: 'Ведомости',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.kommersant.ru%2FRSS%2Fnews.xml',
      backup: 'https://corsproxy.io/?https://www.kommersant.ru/RSS/news.xml',
      tag: 'ru',
      source: 'Коммерсантъ',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.interfax.ru%2Frss.asp%3Fsec%3D1',
      backup: 'https://corsproxy.io/?https://www.interfax.ru/rss.asp?sec=1',
      tag: 'ru',
      source: 'Интерфакс',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Fcointelegraph.com%2Frss',
      backup: 'https://corsproxy.io/?https://cointelegraph.com/rss',
      tag: 'crypto',
      source: 'Cointelegraph',
    },
    {
      url: 'https://api.allorigins.win/raw?url=https%3A%2F%2Ffeeds.marketwatch.com%2Fmarketwatch%2Ftopstories%2F',
      backup: 'https://corsproxy.io/?https://feeds.marketwatch.com/marketwatch/topstories/',
      tag: 'us',
      source: 'MarketWatch',
    },
  ];

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
        
        if (tag === 'crypto' || tag === 'us' || tag === 'ru') {
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

  // === ЗАГРУЗКА С ПОВТОРНЫМИ ПОПЫТКАМИ ===
  async function fetchWithRetry(url, backupUrl, sourceName, attempt = 0) {
    const timeout = 15000;
    
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      return text;
      
    } catch (e) {
      console.warn(`⚠️ ${sourceName}: основной URL не работает (${e.message})`);
      
      if (backupUrl && attempt === 0) {
        console.log(`🔄 ${sourceName}: пробуем запасной URL...`);
        try {
          const response = await fetch(backupUrl, {
            signal: AbortSignal.timeout(timeout),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const text = await response.text();
          console.log(`✅ ${sourceName}: запасной URL сработал`);
          return text;
          
        } catch (e2) {
          console.warn(`❌ ${sourceName}: запасной URL тоже не работает (${e2.message})`);
          throw e2;
        }
      }
      
      throw e;
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

  // === ВСЕ КРИПТОВАЛЮТЫ, АКЦИИ США И РОССИИ ===
  function guessTag(text) {
    const t = text.toUpperCase();
    
    // === ВСЕ КРИПТОВАЛЮТЫ ===
    const cryptoWords = /\b(BTC|BITCOIN|ETH|ETHEREUM|SOL|SOLANA|XRP|DOGE|DOGECOIN|ADA|CARDANO|POLKADOT|DOT|LINK|CHAINLINK|AVAX|AVALANCHE|MATIC|POLYGON|UNI|UNISWAP|ATOM|COSMOS|LTC|LITECOIN|BCH|BITCOINCASH|XLM|STELLAR|ALGO|ALGORAND|VET|VEHICLE|ICP|INTERNETCOMPUTER|FIL|FILEIO|ETC|ETHCLASSIC|AAVE|MKR|MAKER|COMP|COMPOUND|YFI|YEARN|CRV|CURVE|SUSHI|SUSHISWAP|CAKE|PANCAKE|BAKE|BAKERY|1INCH|ENJ|ENJIN|CHZ|CHILIZ|MANA|DECENTRALAND|SAND|THESANDBOX|AXS|AXIEINFINITY|SHIB|SHIBAINU|FLOKI|PEPE|BONK|WIF|NOT|TON|NEAR|ARB|ARBITRUM|OP|OPTIMISM|BASE|BLAST|MODE|STRK|STARKNET|ZKSYNC|ZK|APT|APOS|SUI|SEI|INJ|INJECTIVE|TIA|CELESTIA|DYM|DYMENSION|PENDLE|RNDR|RENDER|FET|OCEAN|AGIX|FETCH|AI|WLD|WORLDCOIN|ARKM|TAO|CRYPTO|BLOCKCHAIN|WEB3|DEFI|NFT|TOKEN|ALTCOIN|STABLECOIN|METAVERSE|COINBASE|BINANCE|BYBIT|OKX|KRAKEN|GEMINI|HALVING|MINING|STAKING|AIRDROP|WHITELIST|IDO|IEO|LAUNCHPAD|LAUNCHPOOL|BULL|BEAR|PUMP|DUMP|MOON|LAMBO|WHALE|SHILL|FUD|ATH|ALLTIMEHIGH|ATL|ALLTIMELOW|MARKETCAP|LIQUIDITY|LIQUIDATION|LEVERAGE|MARGIN|FUTURES|OPTIONS|PERPETUAL|SWAP|BRIDGE|LAYER2|LAYERZERO|ZKSYNCERA|STARKWARE|ARBITRUMONE|OPTIMISM|BASENETWORK|BLASTNETWORK|MODENETWORK|SCROLL|LINEA|MANTA|MANTLE|MNT|METH|EIGEN|EIGENLAYER|RESTAKING|LIQUIDRESTAKING|REZ|PENDLEFINANCE|EETH|WEETH|RSWETH|EZETH|PUFETH)\b/i;
    if (cryptoWords.test(t)) {
      return 'crypto';
    }
    
    // === ВСЕ РОССИЙСКИЕ АКЦИИ ===
    if (/[А-Яа-я]/.test(text)) {
      const ruWords = /\b(РФ|РОССИЯ|RUSSIA|RUSSIAN|МОСКВА|MOSCOW|РУБЛЬ|RUBLE|СБЕР|СБЕРБАНК|ГАЗПРОМ|РОСНЕФТЬ|ЛУКОЙЛ|ЯНДЕКС|ВТБ|СОВКОМБАНК|ТИНЬКОФФ|ММВБ|RTS|MOEX|РУБ|ПУТИН|КРЕМЛЬ|ДУМА|ПРАВИТЕЛЬСТВО|ЦБ|МИНФИН|ИНДЕКС МОСБИРЖИ|АКЦИЯ|РЫНОК|НОВАТЭК|СУРГУТНЕФТЕГАЗ|ТАТНЕФТЬ|БАШНЕФТЬ|ГМК НОРИЛЬСКИЙ НИКЕЛЬ|АЛРОСА|МАГНИТ|МТС|МЕГАФОН|РОСТЕЛЕКОМ|АЭРОФЛОТ|СОВКОМФЛОТ|РЖД|ТРАНСНЕФТЬ|ИНТЕР РАО|РУСГИДРО|ЮНИПРО|ФСК ЕЭС|РОССЕТИ|МОСЭНЕРГО|ЛЕНЭНЕРГО|РАСПАДСКАЯ|МЕЧЕЛ|СЕВЕРСТАЛЬ|НЛМК|ММК|ТМК|ОМК|СИБУР|УРАЛКАЛИЙ|АКРОН|ФОСАГРО|РУСАЛ|ПОЛИМЕТАЛЛ|СЕЛИГДАР|ЗОЛОТО|СЕРЕБРО|ПЛАТИНА|АЛМАЗЫ|ИНДЕКС ММВБ|ИНДЕКС РТС|МОСБИРЖА|СПБ БИРЖА|ДИВИДЕНДЫ|КУРС РУБЛЯ|КЛЮЧЕВАЯ СТАВКА|ИНФЛЯЦИЯ|САНКЦИИ|ИМПОРТОЗАМЕЩЕНИЕ|ГОСДОЛГ|БЮДЖЕТ|ФНБ|ЗОЛОТОВАЛЮТНЫЕ РЕЗЕРВЫ|НЕФТЬ|ГАЗ|НЕФТЕГАЗ|ЭНЕРГЕТИКА|ТЭК|ЭЛЕКТРОЭНЕРГЕТИКА|МЕТАЛЛУРГИЯ|ХИМИЧЕСКАЯ ПРОМЫШЛЕННОСТЬ|МАШИНОСТРОЕНИЕ|ОПК|ВПК|АВИАПРОМ|СУДОСТРОЕНИЕ|АПК|СЕЛЬСКОЕ ХОЗЯЙСТВО|ПИЩЕВАЯ ПРОМЫШЛЕННОСТЬ|РИТЕЙЛ|ТОРГОВЛЯ|СТРОИТЕЛЬСТВО|НЕДВИЖИМОСТЬ|ИПОТЕКА|ЖКХ|ТРАНСПОРТ|ЛОГИСТИКА|СВЯЗЬ|ТЕЛЕКОМ|ИНФОРМАЦИОННЫЕ ТЕХНОЛОГИИ|ИТ|ЦИФРОВИЗАЦИЯ|ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ|РОБОТЫ|АВТОМАТИЗАЦИЯ|ДРОНЫ|БЕСПИЛОТНИКИ|ЭЛЕКТРОМОБИЛИ|ЗЕЛЕНАЯ ЭНЕРГЕТИКА|ВИЭ|СОЛНЕЧНАЯ ЭНЕРГЕТИКА|ВЕТРОЭНЕРГЕТИКА|ГИДРОЭНЕРГЕТИКА|АТОМНАЯ ЭНЕРГЕТИКА|РОСАТОМ|МОСКОВСКАЯ БИРЖА)\b/i;
      if (ruWords.test(t)) {
        return 'ru';
      }
    }
    
    // === ВСЕ АМЕРИКАНСКИЕ АКЦИИ ===
    const usWords = /\b(APPLE|AAPL|MICROSOFT|MSFT|NVIDIA|NVDA|GOOGLE|GOOGL|AMAZON|AMZN|META|TESLA|TSLA|NETFLIX|NFLX|WALL STREET|S&P|SPY|DOW|NASDAQ|FED|FOMC|RATE|BUFFETT|MUSK|ELON|JPMORGAN|JPM|GOLDMAN|GS|BANK OF AMERICA|BAC|CITI|C|WELLS FARGO|WFC|BOEING|BA|FORD|F|GM|DISNEY|DIS|ADOBE|ADBE|SALESFORCE|CRM|ORACLE|ORCL|IBM|INTEL|INTC|AMD|QUALCOMM|QCOM|BROADCOM|AVGO|CISCO|CSCO|STOCK|SHARES|EARNINGS|DIVIDEND|S&P 500|DOW JONES|NASDAQ COMPOSITE|RUSSELL 2000|VIX|VOLATILITY|TREASURY|BOND|YIELD|INFLATION|UNEMPLOYMENT|JOBS|PAYROLL|CPI|PPI|GDP|ECONOMY|RECESSION|BEAR MARKET|BULL MARKET|FED RATE|FOMC MEETING|JEROME POWELL|INTEREST RATE|MORTGAGE RATE|HOUSING MARKET|RETAIL SALES|CONSUMER SPENDING|CONSUMER CONFIDENCE|BUSINESS INVESTMENT|MANUFACTURING|SERVICES|PMI|ISM|FACTORY ORDERS|DURABLE GOODS|TRADE BALANCE|CURRENT ACCOUNT|FOREIGN EXCHANGE|FOREX|USD|DOLLAR|CURRENCY|COMMODITIES|OIL|GOLD|SILVER|COPPER|WHEAT|CORN|SOYBEANS|NATURAL GAS|GASOLINE|CRUDE OIL|BRENT|WTI|TECHNOLOGY|SOFTWARE|CLOUD|MACHINE LEARNING|DATA CENTER|SEMICONDUCTOR|CHIP|CHIPS|FAB|FOUNDRY|TSM|ASML|TXN|TEXAS INSTRUMENTS|MU|MICRON|LRCX|LAM RESEARCH|KLAC|KLA|AMAT|APPLIED MATERIALS|ADI|ANALOG DEVICES|NXPI|NXP|ON|ONSEMI|SWKS|SKYWORKS|QRVO|QORVO|MPWR|MONOLITHIC POWER|MCHP|MICROCHIP|SMCI|SUPER MICRO|DELL|HP|HPE|NTAP|NETAPP|PSTG|PURE STORAGE|WDC|WESTERN DIGITAL|STX|SEAGATE|SAMSUNG|SK HYNIX|TOSHIBA|MICRON|RENESAS|ST MICROELECTRONICS|INFINEON|MEDIATEK|UBER|LYFT|DOORDASH|AIRBNB|BOOKING|EXPEDIA|TRIPADVISOR|CARNIVAL|ROYAL CARIBBEAN|NORWEGIAN|DELTA|UNITED|AMERICAN|SOUTHWEST|JETBLUE|SPIRIT|FRONTIER|CRUISE|TOURISM|TRAVEL|HOSPITALITY|RESTAURANT|MCDONALDS|MCD|YUM|YUM BRANDS|KFC|TACO BELL|PIZZA HUT|DOMINO|DPZ|PAPA JOHNS|PZZA|WENDY|WEN|SHAKE SHACK|SHAK|CHIPOTLE|CMG|STARBUCKS|SBUX|COCA COLA|KO|PEPSICO|PEP|MONSTER|MNST|DR PEPPER|KDP|KEURIG|GREEN MOUNTAIN|GMCR|NESTLE|NSRGY|UNILEVER|UL|PROCTER|PG|JOHNSON|JNJ|PFIZER|PFE|MERCK|MRK|ABBVIE|ABBV|ELI LILLY|LLY|NOVARTIS|NVS|ROCHE|RHHBY|GSK|ASTRAZENECA|AZN|BRISTOL|BMY|SANOFI|SNY|REGENERON|REGN|VERTEX|VRTX|AMGEN|AMGN|GILEAD|GILD|CELGENE|CELG|BIOGEN|BIIB|ILLUMINA|ILMN|THERMO FISHER|TMO|DANAHER|DHR|IQVIA|IQV|CHARLES RIVER|CRL|LABORATORY|LH|QUEST|DGX|MEDTRONIC|MDT|ABBOTT|ABT|BOSTON SCIENTIFIC|BSX|STRYKER|SYK|INTUITIVE|ISRG|EDWARDS|EW|ZOLL|MASIMO|MASI|RESMED|RMD|PHILIPS|PHG|SIEMENS|SIEGY|GE|GENERAL ELECTRIC|HONEYWELL|HON|UNITED TECHNOLOGIES|UTX|RAYTHEON|RTN|LOCKHEED|LMT|NORTHROP|NOC|GENERAL DYNAMICS|GD|L3HARRIS|LHX|TEXTRON|TXT|HUNTINGTON|HII|SPACEX|STARLINK|STARSHIP|ROCKET|LAUNCH|SATELLITE|SPACE|AEROSPACE|DEFENSE|MILITARY|PENTAGON|DOD|HEALTHCARE|PHARMACEUTICAL|BIOTECH|GENETICS|CRISPR|GENE|RNA|DNA|CANCER|IMMUNOLOGY|VACCINE|COVID|PANDEMIC|VIRUS|BACTERIA|ANTIBIOTIC|ANTIVIRAL|INSULIN|DIABETES|OBESITY|WEIGHT LOSS|OZEMPIC|WEGOVY|MOUNJARO|ZEPBOUND|NOVO|NOVO NORDISK|NVO|VIKING|VKTX|ALTRA|ALT|MEDI|AMERICAN|UNITED|STATES|US|USA|AMERICA|NEW YORK|NYC|MANHATTAN|BROOKLYN|QUEENS|BRONX|STATEN ISLAND|LONG ISLAND|ALBANY|BUFFALO|ROCHESTER|SYRACUSE|BINGHAMTON|ITHACA|SARATOGA|LAKE GEORGE|NIAGARA|ERIE|ONTARIO|CHAMPLAIN|HUDSON|MOHAWK|ADIRONDACK|CATSKILL|POCONO|BERKSHIRE|ROCKY MOUNTAINS|APPALACHIAN|SMOKY MOUNTAINS|OZARK|SIERRA NEVADA|CASCADES|COAST RANGE|ALLEGHENY|BLUE RIDGE|SHENANDOAH|ACADIA|GLACIER|YELLOWSTONE|YOSEMITE|ZION|ARCHES|BRYCE|CANYONLANDS|GRAND CANYON|MOUNT RUSHMORE|BADLANDS|BLACK HILLS)\b/i;
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
          const text = await fetchWithRetry(source.url, source.backup, source.source);
          const parsed = parseRSS(text, source.tag, source.source);
          if (parsed.length > 0) {
            console.log(`✅ ${source.source}: ${parsed.length} новостей (только крипта/акции)`);
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

      console.log(`📰 Всего отфильтровано ${all.length} новостей (только крипта и акции)`);

      if (!all.length) {
        console.log('⚠️ Новости не загрузились');
        isRefreshing = false;
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