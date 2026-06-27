const Utils = {
  formatPrice(n, decimals) {
    if (n === undefined || n === null || isNaN(n)) return '—';
    if (decimals === undefined) {
      if (n >= 1000) decimals = 2;
      else if (n >= 10) decimals = 2;
      else if (n >= 1) decimals = 3;
      else decimals = 4;
    }
    return n.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  formatChange(n) {
    if (n === undefined || n === null || isNaN(n)) return '0.00%';
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  },

  formatPnl(n) {
    if (n === undefined || n === null || isNaN(n)) return '$0.00';
    const sign = n >= 0 ? '+$' : '-$';
    return `${sign}${Math.abs(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  changeClass(n) {
    if (!n && n !== 0) return '';
    return n >= 0 ? 'change-positive' : 'change-negative';
  },

  formatTime(date) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },

  el(id) { return document.getElementById(id); },
  qs(sel, parent = document) { return parent.querySelector(sel); },
  qsa(sel, parent = document) { return [...parent.querySelectorAll(sel)]; },

  debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  // localStorage helpers
  storage: {
    get(key, def = null) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : def;
      } catch { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch {}
    },
  },

  // Simple toast
  toast(msg, type = 'info') {
    const existing = document.querySelector('.nova-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'nova-toast';
    t.textContent = msg;
    const colors = { info: '#3B9EFF', success: '#34D399', error: '#F87171' };
    t.style.cssText = `
      position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
      background:${colors[type] || colors.info}; color:#fff;
      padding:10px 20px; border-radius:12px; font-size:13px; font-weight:600;
      z-index:9999; animation:fadeIn .2s ease;
      font-family:'Inter',sans-serif; max-width:280px; text-align:center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  },
};