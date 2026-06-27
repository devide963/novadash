const ChartManager = (() => {
  let mainChart = null;
  let candleSeries = null;
  let volumeSeries = null;
  let currentSymbol = 'BTC';
  let currentTF = '1H';
  let unsub = null;
  let lastCandle = null;

  const miniCharts = {};

  function createMainChart(containerId) {
    const container = Utils.el(containerId);
    if (!container) return;
    if (mainChart) { mainChart.remove(); mainChart = null; }

    mainChart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 260,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#8899AA',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: 'rgba(74,158,255,0.5)', width: 1, style: 2 },
        horzLine: { color: 'rgba(74,158,255,0.5)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        textColor: '#8899AA',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale:  { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    candleSeries = mainChart.addCandlestickSeries({
      upColor:          '#3DD68C',
      downColor:        '#FF5C5C',
      borderUpColor:    '#3DD68C',
      borderDownColor:  '#FF5C5C',
      wickUpColor:      '#3DD68C',
      wickDownColor:    '#FF5C5C',
    });

    volumeSeries = mainChart.addHistogramSeries({
      color: 'rgba(74,158,255,0.2)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    mainChart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    window.addEventListener('resize', () => {
      if (mainChart && container) {
        mainChart.applyOptions({ width: container.clientWidth });
      }
    });

    loadMainChartData();
  }

  function loadMainChartData() {
    if (!candleSeries) return;
    const candles = MarketAPI.generateCandles(currentSymbol, currentTF, 80);
    candleSeries.setData(candles);

    const volData = candles.map(c => ({
      time: c.time,
      value: Math.abs(c.close - c.open) * Utils.randomBetween(50, 200),
      color: c.close >= c.open ? 'rgba(61,214,140,0.2)' : 'rgba(255,92,92,0.15)',
    }));
    volumeSeries.setData(volData);
    mainChart.timeScale().fitContent();

    lastCandle = candles[candles.length - 1];

    if (unsub) unsub();
    unsub = MarketAPI.subscribe(currentSymbol, (data) => {
      if (!candleSeries) return;
      const now = Math.floor(Date.now() / 1000);
      if (lastCandle && now - lastCandle.time < 60) {
        const updated = {
          ...lastCandle,
          close: parseFloat(data.price.toFixed(2)),
          high:  Math.max(lastCandle.high, data.price),
          low:   Math.min(lastCandle.low,  data.price),
        };
        candleSeries.update(updated);
        lastCandle = updated;
      } else {
        const nc = {
          time:  now,
          open:  lastCandle ? lastCandle.close : data.price,
          high:  data.price,
          low:   data.price,
          close: parseFloat(data.price.toFixed(2)),
        };
        candleSeries.update(nc);
        lastCandle = nc;
      }
    });
  }

  function setSymbol(sym) { currentSymbol = sym; loadMainChartData(); }
  function setTimeframe(tf) { currentTF = tf; loadMainChartData(); }

  function createMiniChart(containerId, symbol, color = '#4A9EFF') {
    const container = document.getElementById(containerId);
    if (!container || miniCharts[containerId]) return;

    const chart = LightweightCharts.createChart(container, {
      width:  container.clientWidth || 140,
      height: 44,
      layout:     { background: { type: 'solid', color: 'transparent' }, textColor: 'transparent' },
      grid:       { vertLines: { visible: false }, horzLines: { visible: false } },
      crosshair:  { vertLine: { visible: false }, horzLine: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale:  { visible: false },
      timeScale:  { visible: false },
      handleScroll: false, handleScale: false,
    });

    const lineSeries = chart.addAreaSeries({
      lineColor: color,
      topColor:  color.replace(')', ', 0.3)').replace('rgb', 'rgba'),
      bottomColor: 'rgba(0,0,0,0)',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
    });

    const data = MarketAPI.generateLineData(symbol, 40);
    lineSeries.setData(data);
    chart.timeScale().fitContent();

    miniCharts[containerId] = { chart, lineSeries, symbol };

    MarketAPI.subscribe(symbol, (d) => {
      const existing = miniCharts[containerId];
      if (!existing) return;
      const now = Math.floor(Date.now() / 1000);
      existing.lineSeries.update({ time: now, value: d.price });
    });
  }

  function destroyMainChart() {
    if (unsub) unsub();
    if (mainChart) { mainChart.remove(); mainChart = null; candleSeries = null; volumeSeries = null; }
  }

  return { createMainChart, createMiniChart, setSymbol, setTimeframe, destroyMainChart, get currentSymbol() { return currentSymbol; }, get currentTF() { return currentTF; } };
})();