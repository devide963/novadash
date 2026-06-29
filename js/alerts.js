// js/alerts.js
const AlertsManager = {
    async load(userId) {
        const data = await Backend.getAlerts(userId);
        return data;
    },

    renderPriceAlerts(alerts) {
        if (!alerts || alerts.length === 0) return '<div style="text-align:center;color:var(--text-muted);padding:20px">Нет ценовых оповещений</div>';
        return alerts.map(a => `
            <div class="alert-item">
                <div class="alert-icon">💰</div>
                <div class="alert-body">
                    <div class="alert-symbol">${a.symbol}</div>
                    <div class="alert-desc">${a.condition === 'above' ? 'Выше' : 'Ниже'} $${a.price}</div>
                </div>
                <div class="alert-meta">
                    <div class="alert-time">${a.interval ? 'каждые '+a.interval+'с' : 'одноразово'}</div>
                </div>
            </div>
        `).join('');
    },

    renderVolumeAlerts(alerts) {
        if (!alerts || alerts.length === 0) return '<div style="text-align:center;color:var(--text-muted);padding:20px">Нет объёмных оповещений</div>';
        return alerts.map(a => `
            <div class="alert-item">
                <div class="alert-icon">📊</div>
                <div class="alert-body">
                    <div class="alert-symbol">${a.symbol}</div>
                    <div class="alert-desc">${a.condition === 'above' ? 'Больше' : 'Меньше'} $${a.volume}</div>
                </div>
                <div class="alert-meta">
                    <div class="alert-time">${a.freq === 'once' ? 'одноразово' : 'каждый раз'}</div>
                </div>
            </div>
        `).join('');
    }
};