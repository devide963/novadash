const Utils = {
  formatPrice(n, decimals = 2) {
    if (n >= 1000) return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return n.toFixed(decimals);
  },
  formatChange(n) {
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  },
  changeClass(n) { return n >= 0 ? 'change-positive' : 'change-negative'; },
  formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },
  randomBetween(min, max) { return Math.random() * (max - min) + min; },
  randomWalk(base, volatility = 0.002) {
    return base * (1 + (Math.random() - 0.5) * 2 * volatility);
  },
  el(id) { return document.getElementById(id); },
  qs(sel, parent = document) { return parent.querySelector(sel); },
  qsa(sel, parent = document) { return [...parent.querySelectorAll(sel)]; },
};