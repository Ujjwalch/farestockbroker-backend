const yahooFinance = require('yahoo-finance2').default;

(async () => {
    try {
        console.log("Fetching Nifty 50...");
        const quote = await yahooFinance.quote('^NSEI');
        console.log("Success:", quote);
    } catch (error) {
        console.error("Error:", error);
    }
})();
