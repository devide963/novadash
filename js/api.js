const MarketAPI = (() => {
  // Simulated price state — seeded with realistic prices, then random-walked
  const state = {
    BTC:   { price: 66842.15, change: 2.45,  name: 'Bitcoin',       type: 'crypto' },
    ETH:   { price: 3524.80,  change: 1.87,  name: 'Ethereum',      type: 'crypto' },
    SOL:   { price: 172.30,   change: 3.21,  name: 'Solana',        type: 'crypto' },
    BNB:   { price: 594.20,   change: 0.87,  name: 'BNB',           type: 'crypto' },
    ADA:   { price: 0.4520,   change: -1.23, name: 'Cardano',       type: 'crypto' },
    DOGE:  { price: 0.1542,   change: 5.41,  name: 'Dogecoin',      type: 'crypto' },
    XRP:   { price: 0.5182,   change: 2.10,  name: 'XRP',           type: 'crypto' },
    AVAX:  { price: 36.40,    change: -0.78, name: 'Avalanche',     type: 'crypto' },
    DOT:   { price: 7.24,     change: 1.44,  name: 'Polkadot',      type: 'crypto' },
    LINK:  { price: 14.80,    change: 3.02,  name: 'Chainlink',     type: 'crypto' },
    AAPL:  { price: 193.42,   change: 1.32,  name: 'Apple Inc.',    type: 'stock'  },
    TSLA:  { price: 248.10,   change: -2.40, name: 'Tesla',         type: 'stock'  },
    NVDA:  { price: 875.40,   change: 4.20,  name: 'NVIDIA',        type: 'stock'  },
    MSFT:  { price: 415.30,   change: 0.84,  name: 'Microsoft',     type: 'stock'  },
    GOOGL: { price: 174.90,   change: 1.12,  name: 'Alphabet',      type: 'stock'  },
    AMZN:  { price: 184.70,   change: 2.30,  name: 'Amazon',        type: 'stock'  },
    META:  { price: 505.20,   change: -0.55, name: 'Meta',          type: 'stock'  },
    SPY:   { price: 534.80,   change: 0.62,  name: 'S&P 500 ETF',  type: 'stock'  },
    GOLD:  { price: 2318.50,  change: -0.44, name: 'Gold Spot',     type: 'metal'  },
    SILVER:{ price: 27.42,    change: 0.88,  name: 'Silver Spot',   type: 'metal'  },
    EURUSD:{ price: 1.0842,   change: -0.12, name: 'EUR/USD',       type: 'forex'  },
    GBPUSD:{ price: 1.2640,   change: 0.08,  name: 'GBP/USD',       type: 'forex'  },
    USDJPY:{ price: 154.72,   change: 0.30,  name: 'USD/JPY',       type: 'forex'  },
  };

  const subscribers = {};
  const intervals   = {};

  // Start background price simulation
  function startSimulation() {
    Object.keys(state).forEach(sym => {
      if (intervals[sym]) return;
      intervals[sym] = setInterval(() => {
        const s = state[sym];
        const volatility = s.type === 'crypto' ? 0.0012 : s.type === 'forex' ? 0.0003 : 0.0006;
        const drift = (Math.random() - 0.488) * s.price * volatility;
        s.price = Math.max(s.price + drift, s.price * 0.9);
        s.change += (Math.random() - 0.5) * 0.08;
        s.change = Math.max(-20, Math.min(20, s.change));
        (subscribers[sym] || []).forEach(fn => fn({ ...s, symbol: sym }));
      }, 1800 + Math.random() * 600);
    });
  }

  function subscribe(symbol, cb) {
    if (!subscribers[symbol]) subscribers[symbol] = [];
    subscribers[symbol].push(cb);
    return () => {
      if (subscribers[symbol]) {
        subscribers[symbol] = subscribers[symbol].filter(fn => fn !== cb);
      }
    };
  }

  function getPrice(symbol) {
    const s = state[symbol];
    if (!s) return null;
    return { ...s, symbol };
  }

  function getAllByType(type) {
    return Object.entries(state)
      .filter(([, v]) => !type || v.type === type)
      .map(([k, v]) => ({ symbol: k, ...v }));
  }

  // Try to fetch real crypto prices from CoinGecko (best-effort)
  const coinGeckoMap = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
    ADA: 'cardano', DOGE: 'dogecoin', XRP: 'ripple', AVAX: 'avalanche-2',
    DOT: 'polkadot', LINK: 'chainlink',
  };

  async function fetchRealPrices() {
    try {
      const ids = Object.values(coinGeckoMap).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) return;
      const data = await resp.json();
      Object.entries(coinGeckoMap).forEach(([sym, id]) => {
        if (data[id]) {
          state[sym].price  = data[id].usd;
          state[sym].change = data[id].usd_24h_change || state[sym].change;
        }
      });
    } catch {
      // Silent fail — simulation continues
    }
  }

  // Generate candle data for mini charts
  function generateLineData(symbol, count = 50) {
    const s = state[symbol];
    if (!s) return [];
    const data = [];
    let price = s.price * (1 - Math.abs(s.change) / 100);
    const now = Math.floor(Date.now() / 1000);
    for (let i = count; i >= 0; i--) {
      const vol = s.type === 'crypto' ? 0.005 : 0.002;
      price *= 1 + (Math.random() - 0.48) * vol;
      data.push({ time: now - i * 900, value: parseFloat(price.toFixed(4)) });
    }
    return data;
  }

  // TradingView symbol mapping
  const tvSymbols = {
    BTC:   'BINANCE:BTCUSDT',
    ETH:   'BINANCE:ETHUSDT',
    SOL:   'BINANCE:SOLUSDT',
    BNB:   'BINANCE:BNBUSDT',
    ADA:   'BINANCE:ADAUSDT',
    DOGE:  'BINANCE:DOGEUSDT',
    XRP:   'BINANCE:XRPUSDT',
    AVAX:  'BINANCE:AVAXUSDT',
    DOT:   'BINANCE:DOTUSDT',
    LINK:  'BINANCE:LINKUSDT',
    AAPL:  'NASDAQ:AAPL',
    TSLA:  'NASDAQ:TSLA',
    NVDA:  'NASDAQ:NVDA',
    MSFT:  'NASDAQ:MSFT',
    GOOGL: 'NASDAQ:GOOGL',
    AMZN:  'NASDAQ:AMZN',
    META:  'NASDAQ:META',
    SPY:   'AMEX:SPY',
    GOLD:  'TVC:GOLD',
    SILVER:'TVC:SILVER',
    EURUSD:'FX:EURUSD',
    GBPUSD:'FX:GBPUSD',
    USDJPY:'FX:USDJPY',
  };

  function getTVSymbol(symbol) {
    return tvSymbols[symbol] || symbol;
  }

  return {
    startSimulation,
    subscribe,
    getPrice,
    getAllByType,
    fetchRealPrices,
    generateLineData,
    getTVSymbol,
    state,
  };
})();