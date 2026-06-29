
const Backend = {
    baseUrl: 'https://railway.com/project/e235088a-9562-4ba3-929a-9477b5b1daa5?environmentId=5fbe6a08-c4db-44e8-8147-0741f725bc53', // ЗАМЕНИ НА РЕАЛЬНЫЙ URL ТВОЕГО БОТА



    async getAlerts(userId) {
        const resp = await fetch(`${this.baseUrl}/api/alerts?user_id=${userId}`);
        return resp.json();
    },
    async getPrice(symbol) {
        const resp = await fetch(`${this.baseUrl}/api/price/${symbol}`);
        return resp.json();
    },
    async getStock(symbol) {
        const resp = await fetch(`${this.baseUrl}/api/stock/${symbol}`);
        return resp.json();
    },
    async getMarkets() {
        const resp = await fetch(`${this.baseUrl}/api/markets`);
        return resp.json();
    },
    async analyzePortfolio(portfolio) {
        const resp = await fetch(`${this.baseUrl}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portfolio })
        });
        return resp.json();
    }
};
    