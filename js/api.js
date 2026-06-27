// Simulated real-time market data engine
const MarketAPI = (() => {
  const state = {
    BTC:  { price: 66842.15, change: 2.45, volume: 28400000000 },
    ETH:  { price: 3524.80,  change: 1.87, volume: 14200000000 },
    AAPL: { price: 193.42,   change: 1.32, volume: 51200000 },
    GOLD: { price: 2318.50,  change: -0.44, volume: 0 },
    SOL:  { price: 172.30,   change: 3.21, volume: 4100000000 },
    BNB:  { price: 594.20,   change: 0.87, volume: 1800000000 },
  };

  const subscribers = {};
  let intervals = {};

  function subscribe(symbol, cb) {
    if (!subscribers[symbol]) subscribers[symbol] = [];
    subscribers[symbol].push(cb);
    if (!intervals[symbol]) {
      intervals[symbol] = setInterval(() => {
        const s = state[symbol];
        const drift = (Math.random() - 0.485) * s.price * 0.0008;
        s.price = Math.max(s.price + drift, s.price * 0.95);
        s.change += (Math.random() - 0.5) * 0.05;
        s.change = Math.max(-15, Math.min(15, s.change));
        subscribers[symbol]?.forEach(fn => fn({ ...s }));
      }, 1500);
    }
    return () => {
      subscribers[symbol] = subscribers[symbol].filter(fn => fn !== cb);
    };
  }

  function getPrice(symbol) { return { ...state[symbol] }; }

  function generateCandles(symbol, tf, count = 60) {
    const base = state[symbol].price;
    const volatMap = { '1m': 0.001, '5m': 0.002, '15m': 0.003, '1H': 0.005, '4H': 0.01, '1D': 0.02 };
    const vol = volatMap[tf] || 0.005;
    const candles = [];
    let price = base * (1 - vol * count / 2);
    const now = Math.floor(Date.now() / 1000);
    const tfSeconds = { '1m': 60, '5m': 300, '15m': 900, '1H': 3600, '4H': 14400, '1D': 86400 };
    const step = tfSeconds[tf] || 3600;

    for (let i = count; i >= 0; i--) {
      const open = price;
      const change = (Math.random() - 0.49) * price * vol;
      const close = open + change;
      const high = Math.max(open, close) * (1 + Math.random() * vol * 0.5);
      const low  = Math.min(open, close) * (1 - Math.random() * vol * 0.5);
      candles.push({
        time: now - i * step,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low:  parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
      });
      price = close;
    }
    return candles;
  }

  function generateLineData(symbol, count = 80) {
    const base = state[symbol].price;
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    let price = base * 0.97;
    for (let i = count; i >= 0; i--) {
      price = price * (1 + (Math.random() - 0.48) * 0.004);
      data.push({ time: now - i * 900, value: parseFloat(price.toFixed(2)) });
    }
    return data;
  }

  return { subscribe, getPrice, generateCandles, generateLineData, state };
})();