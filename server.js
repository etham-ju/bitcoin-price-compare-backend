// server.js
import express from 'express';
import fetch from 'node-fetch';
import Big from 'big.js';
import cors from 'cors';  // Import cors

const app = express();
const PORT = process.env.PORT || 3000;

// Use CORS middleware
app.use(cors({ origin: [
    'https://bitcoin-price-compare-frontend.vercel.app'
    ] })); // Allow requests from localhost:3000

app.get('/api/prices', async (req, res) => {
    try {
        const upbitRes = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC');
        const bithumbRes = await fetch('https://api.bithumb.com/v1/ticker?markets=KRW-BTC');
        const binanceRes = await fetch('https://api4.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const coinbaseRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
        const exchangeRateRes = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json');

        const [upbitData, bithumbData, binanceData, coinbaseData, exchangeRateData] = await Promise.all([
            upbitRes.json(),
            bithumbRes.json(),
            binanceRes.json(),
            coinbaseRes.json(),
            exchangeRateRes.json(),
        ]);

        // Log the data to inspect their values
        // console.log('Upbit Data:', upbitData);
        // console.log('Bithumb Data:', bithumbData);
        // console.log('Binance Data:', binanceData);
        // console.log('Coinbase Data:', coinbaseData);
        // console.log('Exchange Rate Data:', exchangeRateData);

        const usdToKrw = new Big(exchangeRateData.usd.krw);

        // Extract current prices from Upbit and Bithumb in KRW
        const upbitPriceKrw = new Big(upbitData[0].trade_price);
        const bithumbPriceKrw = new Big(bithumbData[0].trade_price);

        // Convert KRW prices to USD using big.js and limit to 2 decimal places
        const upbitPriceUsd = upbitPriceKrw.div(usdToKrw).toFixed(2);
        const bithumbPriceUsd = bithumbPriceKrw.div(usdToKrw).toFixed(2);

        // Limit Binance and Coinbase prices to 2 decimal places
        const binancePriceUsd = new Big(binanceData.price).toFixed(2);
        const coinbasePriceUsd = new Big(coinbaseData.data.amount).toFixed(2);

        // Calculate percentage differences relative to Binance price
        const upbitDiff = new Big(upbitPriceUsd).minus(binancePriceUsd).div(binancePriceUsd).times(100).toFixed(2);
        const bithumbDiff = new Big(bithumbPriceUsd).minus(binancePriceUsd).div(binancePriceUsd).times(100).toFixed(2);
        const coinbaseDiff = new Big(coinbasePriceUsd).minus(binancePriceUsd).div(binancePriceUsd).times(100).toFixed(2);

        // Structure the JSON response with differences included in each price object
        res.status(200).json({
            prices: {
                upbit: {
                    krw: upbitPriceKrw.toString(),
                    usd: upbitPriceUsd,
                    difference: upbitDiff
                },
                bithumb: {
                    krw: bithumbPriceKrw.toString(),
                    usd: bithumbPriceUsd,
                    difference: bithumbDiff
                },
                binance: {
                    usd: binancePriceUsd,
                    difference: "0.00" // Binance is the standard, so difference is 0
                },
                coinbase: {
                    usd: coinbasePriceUsd,
                    difference: coinbaseDiff
                }
            }
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Error fetching data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
