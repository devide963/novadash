const MarketAPI = (() => {
    let subscribers = {};
    let intervals = {};

    async function fetchPrice(symbol) {
        const data = await Backend.getPrice(symbol);
        if (data.price) {
            return { price: data.price, change: 0, name: symbol, type: 'crypto' };
        }
        // Если не крипта, пробуем акцию
        const stockData = await Backend.getStock(symbol);
        if (stockData.price) {
            return { price: stockData.price, change: 0, name: symbol, type: 'stock' };
        }
        return null;
    }

    function subscribe(symbol, cb) {
        if (!subscribers[symbol]) subscribers[symbol] = [];
        subscribers[symbol].push(cb);
        // Обновляем каждые 3 секунды (имитация real-time)
        if (!intervals[symbol]) {
            intervals[symbol] = setInterval(async () => {
                const data = await fetchPrice(symbol);
                if (data) {
                    subscribers[symbol].forEach(fn => fn(data));
                }
            }, 3000);
        }
        return () => {
            if (subscribers[symbol]) {
                subscribers[symbol] = subscribers[symbol].filter(fn => fn !== cb);
            }
        };
    }

    function getPrice(symbol) {
        // Возвращаем заглушку, реальные данные подгружаются через subscribe
        return { price: 0, change: 0, name: symbol, type: 'crypto' };
    }

    function getAllByType(type) {
        return [];
    }

    function getTVSymbol(symbol) {
        return symbol;
    }

    return {
        subscribe,
        getPrice,
        getAllByType,
        getTVSymbol,
        fetchPrice,
    };
})();