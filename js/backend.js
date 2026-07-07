// js/backend.js
const Backend = {
    baseUrl: 'https://worker-production-d2239.up.railway.app',

    async getAlerts(userId) {
        try {
            const resp = await fetch(`${this.baseUrl}/api/alerts?user_id=${userId}`);
            return resp.json();
        } catch {
            return { price: [], volume: [] };
        }
    },

    async getPrice(symbol) {
        try {
            const resp = await fetch(`${this.baseUrl}/api/price/${symbol}`);
            return resp.json();
        } catch {
            return { error: 'not found' };
        }
    },

    async getStock(symbol) {
        try {
            const resp = await fetch(`${this.baseUrl}/api/stock/${symbol}`);
            return resp.json();
        } catch {
            return { error: 'not found' };
        }
    },

    async getMarkets() {
        try {
            const resp = await fetch(`${this.baseUrl}/api/markets`);
            return resp.json();
        } catch {
            return [];
        }
    },

    async analyzePortfolio(portfolio) {
        try {
            const resp = await fetch(`${this.baseUrl}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portfolio })
            });
            return resp.json();
        } catch {
            return { error: 'AI analysis failed' };
        }
    },

    // === НОВЫЙ МЕТОД ДЛЯ НОВОСТЕЙ ===
    async getNewsRSS(url) {
        try {
            const resp = await fetch(`${this.baseUrl}/api/news-proxy?url=${encodeURIComponent(url)}`);
            if (resp.ok) {
                return await resp.text();
            }
            return null;
        } catch {
            return null;
        }
    }
};