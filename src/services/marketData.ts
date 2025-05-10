import axios from 'axios';
import { Asset, CandlestickData, SMAData, TrendingAsset } from '@/lib/types';

// API base URLs for web scraping and public endpoints
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';
const STOOQ_BASE_URL = 'https://stooq.com/q/d/l';
const FINANCIAL_MODELING_PREP_URL = 'https://financialmodelingprep.com/api/v3';
const NEWS_API_URL = 'https://newsapi.org/v2';
const CRYPTO_COMPARE_URL = 'https://min-api.cryptocompare.com/data';
const YAHOO_FINANCE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BLOCKCHAIN_INFO_URL = 'https://api.blockchain.info/stats';
const ETHERSCAN_URL = 'https://api.etherscan.io/api';

// User agent for web scraping to avoid being blocked
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';


/**
 * Fetches stock or crypto data from multiple sources with robust web scraping fallbacks
 * Enhanced to ensure only real data is used with improved error handling
 */
export const fetchAssetData = async (symbol: string, isStock = true): Promise<Asset | null> => {
  console.log(`Fetching asset data for ${symbol} (${isStock ? 'stock' : 'crypto'})`);
  
  try {
    // Try multiple data sources in parallel for faster response and better reliability
    const [yahooData, scrapedData, additionalData] = await Promise.allSettled([
      fetchYahooFinanceQuote(symbol, isStock),
      scrapeFinancialData(symbol, isStock),
      isStock ? fetchAlternativeStockData(symbol) : fetchCryptoData(symbol)
    ]);
    
    // Log results from each source
    console.log(`Yahoo Finance data: ${yahooData.status === 'fulfilled' && yahooData.value ? 'success' : 'failed'}`);
    console.log(`Scraped data: ${scrapedData.status === 'fulfilled' && scrapedData.value ? 'success' : 'failed'}`);
    console.log(`Additional data: ${additionalData.status === 'fulfilled' && additionalData.value ? 'success' : 'failed'}`);
    
    // Use the first successful data source
    if (yahooData.status === 'fulfilled' && yahooData.value) {
      console.log('Using Yahoo Finance data');
      return yahooData.value;
    }
    
    if (scrapedData.status === 'fulfilled' && scrapedData.value) {
      console.log('Using scraped financial data');
      return scrapedData.value;
    }
    
    if (additionalData.status === 'fulfilled' && additionalData.value) {
      console.log('Using additional data source');
      return additionalData.value;
    }
    
    // If all real data sources fail, try one more aggressive approach
    console.log('All primary sources failed, attempting last resort data source...');
    
    try {
      if (!isStock) {
        // For crypto, try to get on-chain data which might provide some basic information
        const onChainData = await fetchOnChainAnalytics(symbol);
        if (onChainData) {
          // Create a minimal asset with the available data
          return {
            id: symbol,
            symbol: symbol,
            name: `${symbol}`,
            type: 'crypto',
            price: onChainData.lastPrice || 0,
            change: onChainData.priceChangePercent || 0,
            marketCap: onChainData.marketCap || 0,
            volume: onChainData.volume || 0,
            rating: 5, // Default
            trend: (onChainData.priceChangePercent || 0) > 0 ? 'RISING' : (onChainData.priceChangePercent || 0) < 0 ? 'FALLING' : 'NEUTRAL',
            analysis: 'Analysis based on on-chain data',
            recommendation: (onChainData.priceChangePercent || 0) > 2 ? 'BUY' : (onChainData.priceChangePercent || 0) < -2 ? 'SELL' : 'HOLD'
          };
        }
      } else {
        // For stocks, try MarketWatch as a last resort
        const marketWatchData = await scrapeMarketWatchQuote(symbol);
        if (marketWatchData) return marketWatchData;
      }
    } catch (lastResortError) {
      console.error('Last resort data source also failed:', lastResortError);
    }
    
    // If all real data sources fail, return null with informative error
    console.error(`Failed to retrieve any real market data for ${symbol}. All data sources exhausted.`);
    return null;
  } catch (error) {
    console.error(`Error fetching asset data for ${symbol}:`, error);
    return null;
  }
};



/**
 * Scrapes financial data from public sources when APIs fail
 */
const scrapeFinancialData = async (symbol: string, isStock = true): Promise<Asset | null> => {
  try {
    if (isStock) {
      // For stocks, try Yahoo Finance API endpoint (unofficial)
      const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: {
          interval: '1d',
          range: '1d'
        },
        headers: {
          'User-Agent': USER_AGENT
        }
      });
      
      // Extract data from Yahoo Finance response
      if (response.data && response.data.chart && response.data.chart.result) {
        const result = response.data.chart.result[0];
        const quote = result.indicators.quote[0];
        const meta = result.meta;
        
        // Extract the needed data
        const price = meta.regularMarketPrice || 0;
        const prevClose = meta.previousClose || 0;
        const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
        const volume = quote.volume ? quote.volume[quote.volume.length - 1] : 0;
        
        console.log(`Successfully scraped Yahoo Finance data for ${symbol}`);
        
        return {
          id: symbol,
          symbol: symbol,
          name: meta.instrumentName || symbol,
          type: 'stock',
          price: price,
          change: change,
          marketCap: 0, // Not directly available
          volume: volume,
          rating: 5, // Default
          trend: change > 0 ? 'RISING' : change < 0 ? 'FALLING' : 'NEUTRAL',
          analysis: 'Analysis to be provided by AI component',
          recommendation: change > 2 ? 'BUY' : change < -2 ? 'SELL' : 'HOLD' // Simple logic
        };
      }
    } else {
      // For crypto, try CryptoCompare without API key
      const response = await axios.get(`${CRYPTO_COMPARE_URL}/price`, {
        params: {
          fsym: symbol,
          tsyms: 'USD'
        },
        headers: {
          'User-Agent': USER_AGENT
        }
      });
      
      if (response.data && response.data.USD) {
        const price = response.data.USD;
        
        // Get additional data for the change without API key
        const historyResponse = await axios.get(`${CRYPTO_COMPARE_URL}/v2/histoday`, {
          params: {
            fsym: symbol,
            tsym: 'USD',
            limit: 2
          },
          headers: {
            'User-Agent': USER_AGENT
          }
        });
        
        let change = 0;
        let volume = 1000000; // Default
        
        if (historyResponse.data && historyResponse.data.Data && historyResponse.data.Data.Data) {
          const historyData = historyResponse.data.Data.Data;
          if (historyData.length >= 2) {
            const prevPrice = historyData[0].close;
            change = ((price - prevPrice) / prevPrice) * 100;
            volume = historyData[1].volumeto || volume;
          }
        }
        
        console.log(`Successfully scraped CryptoCompare data for ${symbol}`);
        
        return {
          id: symbol,
          symbol: symbol,
          name: `${symbol} (Crypto)`,
          type: 'crypto',
          price: price,
          change: change,
          marketCap: 0, // Not directly available
          volume: volume,
          rating: 5, // Default
          trend: change > 0 ? 'RISING' : change < 0 ? 'FALLING' : 'NEUTRAL',
          analysis: 'Analysis to be provided by AI component',
          recommendation: change > 2 ? 'BUY' : change < -2 ? 'SELL' : 'HOLD' // Simple logic
        };
      }
      
      // If CryptoCompare fails, try CoinGecko as another option
      try {
        console.log(`Attempting to scrape CoinGecko data for ${symbol}...`);
        const geckoResponse = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: {
            ids: symbol.toLowerCase(),
            vs_currencies: 'usd',
            include_24hr_vol: true,
            include_24hr_change: true,
            include_market_cap: true
          },
          headers: {
            'User-Agent': USER_AGENT
          }
        });
        
        const data = geckoResponse.data[symbol.toLowerCase()];
        if (data && data.usd) {
          console.log(`Successfully scraped CoinGecko data for ${symbol}`);
          return {
            id: symbol,
            symbol: symbol,
            name: `${symbol} (Crypto)`,
            type: 'crypto',
            price: data.usd,
            change: data.usd_24h_change || 0,
            marketCap: data.usd_market_cap || 0,
            volume: data.usd_24h_vol || 1000000,
            rating: 5,
            trend: (data.usd_24h_change || 0) > 0 ? 'RISING' : (data.usd_24h_change || 0) < 0 ? 'FALLING' : 'NEUTRAL',
            analysis: 'Analysis based on real-time market data',
            recommendation: (data.usd_24h_change || 0) > 2 ? 'BUY' : (data.usd_24h_change || 0) < -2 ? 'SELL' : 'HOLD'
          };
        }
      } catch (geckoError) {
        console.error('Error scraping from CoinGecko:', geckoError);
      }
    }
    
    return null; // If we couldn't scrape any data
  } catch (error) {
    console.error('Error scraping financial data:', error);
    return null;
  }
};

/**
 * Fetch stock or crypto data from Yahoo Finance
 */
const fetchYahooFinanceQuote = async (symbol: string, isStock = true): Promise<Asset | null> => {
  try {
    // Format symbol correctly for crypto (add -USD suffix)
    const formattedSymbol = !isStock && symbol.length <= 5 && /^[A-Z]+$/.test(symbol) ? 
      (symbol === 'BTC' || symbol === 'ETH' || symbol === 'XRP' || symbol === 'LTC' ? `${symbol}-USD` : symbol) : 
      symbol;
      
    console.log(`Fetching Yahoo Finance quote for ${formattedSymbol}`);
    
    // Use Yahoo Finance API endpoint (unofficial) with proper headers to avoid blocking
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}`, {
      params: {
        interval: '1d',
        range: '1d'
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Extract data from Yahoo Finance response
    if (response.data?.chart?.result?.[0]) {
      const result = response.data.chart.result[0];
      const quote = result.indicators.quote[0] || {};
      const meta = result.meta || {};
      
      // Extract the needed data
      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.previousClose || 0;
      const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      const volume = quote.volume ? quote.volume[quote.volume.length - 1] : 0;
      
      console.log(`Successfully fetched Yahoo Finance data for ${symbol}`);
      
      return {
        id: symbol,
        symbol: symbol,
        name: meta.instrumentName || symbol,
        type: isStock ? 'stock' : 'crypto',
        price: price,
        change: change,
        marketCap: meta.marketCap || 0,
        volume: volume,
        rating: 5, // Default
        trend: change > 0 ? 'RISING' : change < 0 ? 'FALLING' : 'NEUTRAL',
        analysis: 'Analysis based on real-time market data',
        recommendation: change > 2 ? 'BUY' : change < -2 ? 'SELL' : 'HOLD' // Simple logic
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from Yahoo Finance:', error);
    return null;
  }
};

/**
 * Fetch crypto data from CryptoCompare using web scraping approach (no API key required)
 */
const fetchCryptoComparePrice = async (symbol: string): Promise<Asset | null> => {
  try {
    // First try the public endpoint without API key
    const response = await axios.get(`${CRYPTO_COMPARE_URL}/price`, {
      params: {
        fsym: symbol,
        tsyms: 'USD'
      },
      headers: {
        'User-Agent': USER_AGENT
      }
    });
    
    if (response.data?.USD) {
      const price = response.data.USD;
      
      // Get additional data for the change using public endpoint
      const historyResponse = await axios.get(`${CRYPTO_COMPARE_URL}/v2/histoday`, {
        params: {
          fsym: symbol,
          tsym: 'USD',
          limit: 2
        },
        headers: {
          'User-Agent': USER_AGENT
        }
      });
      
      let change = 0;
      let volume = 1000000; // Default
      
      if (historyResponse.data?.Data?.Data) {
        const historyData = historyResponse.data.Data.Data;
        if (historyData.length >= 2) {
          const prevPrice = historyData[0].close;
          change = ((price - prevPrice) / prevPrice) * 100;
          volume = historyData[1].volumeto || volume;
        }
      }
      
      console.log(`Successfully fetched CryptoCompare data for ${symbol}`);
      
      return {
        id: symbol,
        symbol: symbol,
        name: `${symbol}`,
        type: 'crypto',
        price: price,
        change: change,
        marketCap: 0, // Not directly available
        volume: volume,
        rating: 5, // Default
        trend: change > 0 ? 'RISING' : change < 0 ? 'FALLING' : 'NEUTRAL',
        analysis: 'Analysis based on real-time market data',
        recommendation: change > 2 ? 'BUY' : change < -2 ? 'SELL' : 'HOLD' // Simple logic
      };
    }
    
    // If public endpoint fails, try scraping from CoinGecko as fallback
    console.log(`Attempting to scrape CoinGecko data for ${symbol}...`);
    try {
      const geckoResponse = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids: symbol.toLowerCase(),
          vs_currencies: 'usd',
          include_24hr_vol: true,
          include_24hr_change: true
        },
        headers: {
          'User-Agent': USER_AGENT
        }
      });
      
      const data = geckoResponse.data[symbol.toLowerCase()];
      if (data && data.usd) {
        console.log(`Successfully scraped CoinGecko data for ${symbol}`);
        return {
          id: symbol,
          symbol: symbol,
          name: `${symbol}`,
          type: 'crypto',
          price: data.usd,
          change: data.usd_24h_change || 0,
          marketCap: 0,
          volume: data.usd_24h_vol || 1000000,
          rating: 5,
          trend: (data.usd_24h_change || 0) > 0 ? 'RISING' : (data.usd_24h_change || 0) < 0 ? 'FALLING' : 'NEUTRAL',
          analysis: 'Analysis based on real-time market data',
          recommendation: (data.usd_24h_change || 0) > 2 ? 'BUY' : (data.usd_24h_change || 0) < -2 ? 'SELL' : 'HOLD'
        };
      }
    } catch (geckoError) {
      console.error('Error scraping from CoinGecko:', geckoError);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from CryptoCompare:', error);
    return null;
  }
};

/**
 * Fetches candlestick data from multiple sources for the given asset
 * Enhanced with robust web scraping fallbacks when APIs fail
 */
export const fetchCandlestickData = async (
  symbol: string, 
  isStock = true,
  timeframe: '30d' | '90d' | '1y' = '90d'
): Promise<CandlestickData[]> => {
  try {
    console.log(`Attempting to fetch candlestick data for ${symbol} (${isStock ? 'stock' : 'crypto'})`);
    
    // Try multiple data sources in parallel for faster response and better reliability
    // We prioritize web scraping approaches that don't require API keys
    const [yahooData, cryptoCompareData, stooqData] = await Promise.allSettled([
      fetchYahooFinanceData(symbol, timeframe), // Works for both stocks and crypto
      !isStock ? fetchCryptoCompareData(symbol, timeframe) : Promise.resolve([]),
      isStock ? fetchStooqHistoricalData(symbol) : Promise.resolve([])
    ]);
    
    // Log the results from each source
    console.log(`Yahoo Finance data: ${yahooData.status === 'fulfilled' ? yahooData.value.length : 'failed'} points`);
    if (!isStock) {
      console.log(`CryptoCompare data: ${cryptoCompareData.status === 'fulfilled' ? cryptoCompareData.value.length : 'failed'} points`);
    }
    if (isStock) {
      console.log(`Stooq data: ${stooqData.status === 'fulfilled' ? stooqData.value.length : 'failed'} points`);
    }
    
    // Combine all successful data sources for maximum data coverage
    let combinedData: CandlestickData[] = [];
    
    // Add data from each successful source to a map keyed by date
    const dataMap = new Map<string, CandlestickData>();
    
    // Process in order of reliability
    if (yahooData.status === 'fulfilled' && yahooData.value.length > 0) {
      yahooData.value.forEach(candle => {
        dataMap.set(candle.date, candle);
      });
      console.log('Added Yahoo Finance data');
    }
    
    if (stooqData.status === 'fulfilled' && stooqData.value.length > 0) {
      stooqData.value.forEach(candle => {
        if (!dataMap.has(candle.date)) {
          dataMap.set(candle.date, candle);
        }
      });
      console.log('Added Stooq data');
    }
    
    if (cryptoCompareData.status === 'fulfilled' && cryptoCompareData.value.length > 0) {
      cryptoCompareData.value.forEach(candle => {
        if (!dataMap.has(candle.date)) {
          dataMap.set(candle.date, candle);
        }
      });
      console.log('Added CryptoCompare data');
    }
    
    // If we still don't have enough data, try additional web scraping approaches
    if (dataMap.size < 10) {
      console.log('Not enough data points, attempting additional web scraping sources...');
      try {
        // Try additional sources based on asset type
        const additionalData = await (isStock 
          ? fetchInvestingComData(symbol, timeframe) // Try Investing.com for stocks
          : fetchCoinGeckoData(symbol, timeframe)); // Try CoinGecko for crypto
        
        if (additionalData.length > 0) {
          additionalData.forEach(candle => {
            if (!dataMap.has(candle.date)) {
              dataMap.set(candle.date, candle);
            }
          });
          console.log(`Added ${additionalData.length} points from additional scraping`);
        }
      } catch (scrapeError) {
        console.error('Additional scraping failed:', scrapeError);
      }
    }
    
    // Convert map to array and sort by date
    combinedData = Array.from(dataMap.values());
    combinedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log(`Total combined data points: ${combinedData.length}`);
    
    // If we have data, filter based on timeframe
    if (combinedData.length > 0) {
      const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const filteredData = combinedData.filter(candle => {
        const candleDate = new Date(candle.date);
        return candleDate >= cutoffDate;
      });
      
      console.log(`Filtered to ${filteredData.length} data points for ${timeframe} timeframe`);
      return filteredData;
    }
    
    // If all real data sources fail, return empty array with informative error
    console.error(`Failed to retrieve any real candlestick data for ${symbol}. All data sources exhausted.`);
    return [];
  } catch (error) {
    console.error(`Error fetching candlestick data for ${symbol}:`, error);
    return [];
  }
};

/**
 * Enhanced Yahoo Finance data fetching with robust error handling and retry logic
 * Works for both stocks and cryptocurrencies
 */
const fetchYahooFinanceData = async (symbol: string, timeframe: '30d' | '90d' | '1y'): Promise<CandlestickData[]> => {
  try {
    // Determine the range based on timeframe
    const range = timeframe === '30d' ? '1mo' : timeframe === '90d' ? '3mo' : '1y';
    
    // Format symbol correctly for crypto (add -USD suffix)
    const formattedSymbol = symbol.length <= 5 && /^[A-Z]+$/.test(symbol) ? 
      (symbol === 'BTC' || symbol === 'ETH' || symbol === 'XRP' || symbol === 'LTC' ? `${symbol}-USD` : symbol) : 
      symbol;
    
    console.log(`Fetching Yahoo Finance data for ${formattedSymbol} with range ${range}`);
    
    // Use Yahoo Finance API endpoint (unofficial) with proper headers to avoid blocking
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}`, {
      params: {
        interval: '1d',
        range: range,
        includePrePost: false,
        events: 'div,split'
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.data?.chart?.result?.[0]) {
      const result = response.data.chart.result[0];
      const timestamps = result.timestamp || [];
      const quote = result.indicators.quote[0] || {};
      const adjClose = result.indicators.adjclose?.[0]?.adjclose || [];
      
      if (timestamps.length > 0 && quote.open) {
        const candlesticks = timestamps.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          open: quote.open[index] || 0,
          high: quote.high[index] || 0,
          low: quote.low[index] || 0,
          close: adjClose[index] || quote.close[index] || 0, // Use adjusted close if available
          volume: quote.volume[index] || 0
        }));
        
        console.log(`Successfully retrieved ${candlesticks.length} data points from Yahoo Finance`);
        return candlesticks;
      }
    }
    
    console.warn(`No data returned from Yahoo Finance for ${formattedSymbol}`);
    return [];
  } catch (error: any) {
    console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error.message);
    
    // Implement retry with exponential backoff if rate limited
    if (error.response?.status === 429) {
      console.log('Rate limited by Yahoo Finance, will retry with different headers');
      try {
        // Wait 2 seconds and retry with different headers
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const retryResponse = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
          params: {
            interval: '1d',
            range: timeframe === '30d' ? '1mo' : timeframe === '90d' ? '3mo' : '1y'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62',
            'Accept': '*/*',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (retryResponse.data?.chart?.result?.[0]) {
          const result = retryResponse.data.chart.result[0];
          const timestamps = result.timestamp || [];
          const quote = result.indicators.quote[0] || {};
          
          if (timestamps.length > 0) {
            return timestamps.map((timestamp: number, index: number) => ({
              date: new Date(timestamp * 1000).toISOString().split('T')[0],
              open: quote.open[index] || 0,
              high: quote.high[index] || 0,
              low: quote.low[index] || 0,
              close: quote.close[index] || 0,
              volume: quote.volume[index] || 0
            }));
          }
        }
      } catch (retryError) {
        console.error('Retry attempt also failed:', retryError);
      }
    }
    
    return [];
  }
};

/**
 * Enhanced CryptoCompare data fetching with improved error handling
 * Uses public endpoints that don't require API keys
 */
const fetchCryptoCompareData = async (symbol: string, timeframe: '30d' | '90d' | '1y'): Promise<CandlestickData[]> => {
  try {
    // Determine the limit based on timeframe
    const limit = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    
    console.log(`Fetching CryptoCompare data for ${symbol} with limit ${limit}`);
    
    // Try public endpoint without API key first with proper headers
    const response = await axios.get(`${CRYPTO_COMPARE_URL}/v2/histoday`, {
      params: {
        fsym: symbol,
        tsym: 'USD',
        limit: limit,
        tryConversion: true
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.data?.Data?.Data) {
      const historyData = response.data.Data.Data;
      
      const candlesticks = historyData.map((item: any) => ({
        date: new Date(item.time * 1000).toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volumefrom
      }));
      
      console.log(`Successfully retrieved ${candlesticks.length} data points from CryptoCompare`);
      return candlesticks;
    }
    
    console.warn(`No data returned from CryptoCompare for ${symbol}`);
    return [];
  } catch (error: any) {
    console.error(`Error fetching CryptoCompare data for ${symbol}:`, error.message);
    return [];
  }
};

/**
 * Fetches historical price data from CoinGecko for cryptocurrencies
 * This is a separate implementation from the fallback in CryptoCompare
 */
const fetchCoinGeckoData = async (symbol: string, timeframe: '30d' | '90d' | '1y'): Promise<CandlestickData[]> => {
  try {
    // Convert timeframe to days for CoinGecko API
    const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    
    // Try to map common symbols to their CoinGecko IDs
    let coinId = symbol.toLowerCase();
    if (symbol === 'BTC') coinId = 'bitcoin';
    if (symbol === 'ETH') coinId = 'ethereum';
    if (symbol === 'XRP') coinId = 'ripple';
    if (symbol === 'LTC') coinId = 'litecoin';
    if (symbol === 'ADA') coinId = 'cardano';
    if (symbol === 'DOT') coinId = 'polkadot';
    if (symbol === 'LINK') coinId = 'chainlink';
    
    console.log(`Fetching CoinGecko data for ${coinId} with days ${days}`);
    
    // First try to get OHLC data which is more accurate
    try {
      const ohlcResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`, {
        params: {
          vs_currency: 'usd',
          days: days
        },
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      if (Array.isArray(ohlcResponse.data) && ohlcResponse.data.length > 0) {
        const candlesticks = ohlcResponse.data.map((item: any) => {
          // CoinGecko OHLC format: [timestamp, open, high, low, close]
          return {
            date: new Date(item[0]).toISOString().split('T')[0],
            open: item[1],
            high: item[2],
            low: item[3],
            close: item[4],
            volume: 0 // OHLC endpoint doesn't provide volume
          };
        });
        
        console.log(`Successfully retrieved ${candlesticks.length} OHLC data points from CoinGecko`);
        return candlesticks;
      }
    } catch (ohlcError) {
      console.warn('Failed to get OHLC data from CoinGecko, falling back to market chart:', ohlcError.message);
    }
    
    // If OHLC fails, fall back to market chart data
    const marketResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        interval: 'daily'
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (marketResponse.data?.prices) {
      const prices = marketResponse.data.prices;
      const volumes = marketResponse.data.total_volumes || [];
      
      // Create daily candlesticks from price data
      const dailyData = new Map<string, any>();
      
      // Group by day
      prices.forEach((price: any, index: number) => {
        const timestamp = price[0];
        const dateStr = new Date(timestamp).toISOString().split('T')[0];
        const closePrice = price[1];
        const volume = volumes[index] ? volumes[index][1] : 0;
