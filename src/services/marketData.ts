import axios from 'axios';
import { Asset, CandlestickData, SMAData, TrendingAsset } from '@/lib/types';
import { mockAssets, trendingAssets as mockTrendingAssets } from '@/lib/mockData';

// Flag to track if we're using demo data
export let isUsingDemoData = false;

// Normally, you would store this in an environment variable
const API_KEY = 'PM0MHLNXNSCGBM5K'; // Alpha Vantage API key

// Alpha Vantage API base URL
const BASE_URL = 'https://www.alphavantage.co/query';
// Stooq API URL for historical data CSV format
const STOOQ_BASE_URL = 'https://stooq.com/q/d/l';

// Additional API base URLs
const FINANCIAL_MODELING_PREP_URL = 'https://financialmodelingprep.com/api/v3';
const NEWS_API_URL = 'https://newsapi.org/v2';
const CRYPTO_COMPARE_URL = 'https://min-api.cryptocompare.com/data';

// Add your API keys here (in a real app, these would be environment variables)
const FMP_API_KEY = '25ce4547da1aacf286c7c1f5178f3d4d';
const NEWS_API_KEY = '967f84cca9e944b6869989e0b32ee951';
const CRYPTO_COMPARE_API_KEY = '26d7b71f0f39e0a3d961c89e984eb494ec9bd964b947ad1159f01c2b53261bd8';

/**
 * Fetches stock or crypto data from Alpha Vantage API
 */
export const fetchAssetData = async (symbol: string, isStock = true): Promise<Asset | null> => {
  try {
    console.log(`Fetching data for ${symbol}, isStock: ${isStock}`);
    
    // First try to use the API
    let asset = await fetchAlphaVantageData(symbol, isStock);
    
    // If API fails or returns null, fall back to scraping
    if (!asset) {
      console.log('API call failed, falling back to web scraping');
      asset = await scrapeFinancialData(symbol, isStock);
      if (asset) {
        console.log('Successfully retrieved data via scraping');
      }
    }
    
    // If all methods fail, return null
    if (!asset) {
      console.error('All data fetching methods failed');
      isUsingDemoData = true;
      return null;
    }
    
    isUsingDemoData = false;
    return asset;
  } catch (error) {
    console.error('Error in fetchAssetData:', error);
    isUsingDemoData = true;
    return null;
  }
};

/**
 * Attempts to fetch asset data from Alpha Vantage API
 */
const fetchAlphaVantageData = async (symbol: string, isStock = true): Promise<Asset | null> => {
  try {
    const endpoint = isStock ? 'GLOBAL_QUOTE' : 'DIGITAL_CURRENCY_DAILY';
    
    const response = await axios.get(BASE_URL, {
      params: {
        function: endpoint,
        symbol: symbol,
        market: 'USD',
        apikey: API_KEY
      }
    });
    
    if (isStock && response.data['Global Quote']) {
      const quote = response.data['Global Quote'];
      const price = parseFloat(quote['05. price']);
      const prevClose = parseFloat(quote['08. previous close']);
      const change = ((price - prevClose) / prevClose) * 100;
      
      return {
        id: symbol,
        symbol: symbol,
        name: symbol, // We'd need another API call to get the full name
        type: 'stock',
        price: price,
        change: change,
        marketCap: 0, // Would need additional API call
        volume: parseFloat(quote['06. volume']),
        rating: 5, // This would be from your AI analysis
        trend: change > 0 ? 'RISING' : change < 0 ? 'FALLING' : 'NEUTRAL',
        analysis: 'Analysis to be provided by AI component',
        recommendation: 'HOLD' // Default
      };
    }
    
    if (!isStock && response.data['Time Series (Digital Currency Daily)']) {
      const timeSeries = response.data['Time Series (Digital Currency Daily)'];
      const dates = Object.keys(timeSeries);
      
      if (dates.length > 1) {
        const latestData = timeSeries[dates[0]];
        const previousData = timeSeries[dates[1]];
        
        const price = parseFloat(latestData['4a. close (USD)']);
        const prevPrice = parseFloat(previousData['4a. close (USD)']);
        const change = ((price - prevPrice) / prevPrice) * 100;
        
        return {
          id: symbol,
          symbol: symbol,
          name: symbol, // We'd need another API call for the full name
          type: 'crypto',
          price: price,
          change: change,
          marketCap: 0, // Would need additional API call
          volume: parseFloat(latestData['5. volume']),
          rating: 5, // This would be from your AI analysis
          trend: change > 0 ? 'RISING' : change < 0 ? 'FALLING' : 'NEUTRAL',
          analysis: 'Analysis to be provided by AI component',
          recommendation: 'HOLD' // Default
        };
      }
    }
    
    // If we got here, the response format wasn't as expected
    console.error('Could not parse Alpha Vantage API response format:', response.data);
    return null;
  } catch (error) {
    console.error('Error fetching from Alpha Vantage:', error);
    return null;
  }
};

/**
 * Scrapes financial data from public sources when APIs fail
 */
const scrapeFinancialData = async (symbol: string, isStock = true): Promise<Asset | null> => {
  try {
    // Target a public financial data source based on asset type
    const url = isStock 
      ? `https://finance.yahoo.com/quote/${symbol}`
      : `https://finance.yahoo.com/quote/${symbol}-USD`;
    
    console.log(`Scraping data for ${symbol} from ${url}`);
    
    // In a real implementation, you would:
    // 1. Make a GET request to the URL
    // 2. Parse the HTML response
    // 3. Extract price, change, volume etc. from specific HTML elements
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // This is a simplified implementation - in reality you would use a proper HTML parser
    const html = response.data;
    
    // Basic regex patterns to extract data (note: this is fragile and would need more robust parsing)
    const priceMatch = html.match(/"regularMarketPrice":{"raw":([\d\.]+)/);
    const changePercentMatch = html.match(/"regularMarketChangePercent":{"raw":([-\d\.]+)/);
    const volumeMatch = html.match(/"regularMarketVolume":{"raw":([\d\.]+)/);
    const prevCloseMatch = html.match(/"regularMarketPreviousClose":{"raw":([\d\.]+)/);
    
    if (!priceMatch) {
      throw new Error('Could not extract price from scraped content');
    }
    
    const price = parseFloat(priceMatch[1]);
    const changePercent = changePercentMatch ? parseFloat(changePercentMatch[1]) : 0;
    const volume = volumeMatch ? parseInt(volumeMatch[1]) : 0;
    const prevClose = prevCloseMatch ? parseFloat(prevCloseMatch[1]) : 0;
    
    // Generate a unique ID
    const id = `${symbol.toLowerCase()}-${Date.now()}`;
    
    // Define recommendation based on change percent
    let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (changePercent > 1.5) recommendation = 'BUY';
    else if (changePercent < -1.5) recommendation = 'SELL';
    
    // Define trend based on change percent
    let trend: 'RISING' | 'FALLING' | 'NEUTRAL' = 'NEUTRAL';
    if (changePercent > 0) trend = 'RISING';
    else if (changePercent < 0) trend = 'FALLING';
    
    return {
      id,
      name: symbol,
      symbol,
      price,
      change: changePercent,
      volume,
      marketCap: price * volume,
      type: isStock ? 'stock' : 'crypto',
      recommendation,
      trend,
      rating: 5, // Default rating on a scale of 1-10
      analysis: 'Analysis based on real-time market data'
    };
  } catch (error) {
    console.error(`Scraping error for ${symbol}:`, error);
    return null;
  }
};

/**
 * Helper function to find a mock asset when API calls fail
 */
const fallbackToMockAsset = (symbol: string): Asset | null => {
  // Find the mock asset with the matching symbol
  const mockAsset = mockAssets.find(asset => 
    asset.symbol.toLowerCase() === symbol.toLowerCase()
  );
  
  if (mockAsset) {
    console.log(`Using mock data for ${symbol}`);
    return mockAsset;
  }
  
  // If no matching mock asset, create a basic one
  return {
    id: symbol,
    symbol: symbol,
    name: `${symbol} (Demo)`,
    type: symbol.length <= 4 ? 'crypto' : 'stock',
    price: 100 + Math.random() * 50,
    change: (Math.random() * 6) - 3, // Random change between -3% and 3%
    marketCap: 1000000000,
    volume: 10000000,
    rating: 5,
    trend: Math.random() > 0.5 ? 'RISING' : 'FALLING',
    analysis: 'Demo analysis - real data not available',
    recommendation: Math.random() > 0.7 ? 'BUY' : Math.random() > 0.4 ? 'HOLD' : 'SELL'
  };
};

/**
 * Fetches candlestick data from Stooq for the given asset
 */
export const fetchCandlestickData = async (
  symbol: string, 
  isStock = true,
  timeframe: '30d' | '90d' | '1y' = '90d'
): Promise<CandlestickData[]> => {
  try {
    // Try Alpha Vantage first
    const alphaVantageData = await fetchAlphaVantageCandlestickData(symbol, isStock, timeframe);
    if (alphaVantageData.length > 0) {
      return alphaVantageData;
    }
    
    // If Alpha Vantage fails, try scraping alternatives
    console.log('Alpha Vantage candlestick data failed, trying alternative sources...');
    const scrapedCandlestickData = await scrapeCandlestickData(symbol, isStock, timeframe);
    if (scrapedCandlestickData.length > 0) {
      return scrapedCandlestickData;
    }
    
    // As a last resort, use mock data
    console.log('No real candlestick data available, falling back to demo data');
    isUsingDemoData = true;
    
    // Generate mock candlestick data based on the symbol
    return generateMockCandlestickData(symbol, timeframe);
  } catch (error) {
    console.error('Error fetching candlestick data:', error);
    isUsingDemoData = true;
    return generateMockCandlestickData(symbol, timeframe);
  }
};

/**
 * Fallback function to fetch candlestick data from Alpha Vantage
 */
const fetchAlphaVantageCandlestickData = async (
  symbol: string,
  isStock = true,
  timeframe: '30d' | '90d' | '1y' = '90d'
): Promise<CandlestickData[]> => {
  try {
    // Determine the API function to use
    const function_name = isStock ? 'TIME_SERIES_DAILY' : 'DIGITAL_CURRENCY_DAILY';
    
    const response = await axios.get(BASE_URL, {
      params: {
        function: function_name,
        symbol: symbol,
        market: 'USD', // Only needed for crypto
        outputsize: 'full',
        apikey: API_KEY
      }
    });
    
    const candlestickData: CandlestickData[] = [];
    
    // Parse the time series data (different format for stock vs crypto)
    const timeSeries = isStock 
      ? response.data['Time Series (Daily)']
      : response.data['Time Series (Digital Currency Daily)'];
    
    if (!timeSeries) {
      console.error('No time series data found:', response.data);
      return [];
    }
    
    // Filter dates based on timeframe
    const dates = Object.keys(timeSeries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const daysToFetch = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const filteredDates = dates.slice(0, daysToFetch);
    
    filteredDates.forEach(date => {
      const data = timeSeries[date];
      
      if (isStock) {
        candlestickData.push({
          date: date,
          open: parseFloat(data['1. open']),
          high: parseFloat(data['2. high']),
          low: parseFloat(data['3. low']),
          close: parseFloat(data['4. close']),
          volume: parseFloat(data['5. volume'])
        });
      } else {
        candlestickData.push({
          date: date,
          open: parseFloat(data['1b. open (USD)']),
          high: parseFloat(data['2b. high (USD)']),
          low: parseFloat(data['3b. low (USD)']),
          close: parseFloat(data['4b. close (USD)']),
          volume: parseFloat(data['5. volume'])
        });
      }
    });
    
    return candlestickData.reverse(); // Sort chronologically
  } catch (error) {
    console.error('Error fetching candlestick data from Alpha Vantage:', error);
    return [];
  }
};

/**
 * Parse Stooq CSV response into candlestick data
 */
const parseStooqCSV = (csv: string): CandlestickData[] => {
  const lines = csv.split('\n');
  const candlestickData: CandlestickData[] = [];
  
  // Skip header line and process the rest
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    if (values.length < 6) continue;
    
    const [date, open, high, low, close, volume] = values;
    
    candlestickData.push({
      date,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume)
    });
  }
  
  return candlestickData;
};

/**
 * Format symbol for Stooq API (e.g. AAPL -> AAPL.US)
 */
const formatSymbolForStooq = (symbol: string): string => {
  // Map common stock exchanges
  if (symbol.includes('.')) return symbol; // Already has an exchange
  
  // Default to US market
  return `${symbol}.US`;
};

/**
 * Calculate start date for historical data
 */
const calculateStartDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
};

/**
 * Format date to YYYY-MM-DD for API
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generates SMA data based on candlestick data
 */
export const generateSMAData = (candlestickData: CandlestickData[]): SMAData[] => {
  const calculateSMA = (data: number[], period: number, index: number): number => {
    if (index < period - 1) return 0;
    
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[index - i];
    }
    return sum / period;
  };
  
  const closes = candlestickData.map(d => d.close);
  const smaData: SMAData[] = [];
  
  // Use SMA 20 instead of 30 to match the image
  const periods = [10, 20, 50];
  const minPeriod = Math.min(...periods);
  
  candlestickData.forEach((candle, index) => {
    const sma10 = calculateSMA(closes, 10, index);
    const sma30 = calculateSMA(closes, 20, index); // Now 20 instead of 30
    const sma50 = calculateSMA(closes, 50, index);
    
    if (index >= minPeriod - 1) {
      smaData.push({
        date: candle.date,
        sma10,
        sma30,
        sma50
      });
    }
  });
  
  return smaData;
};

/**
 * Fetches trending assets (top performing/most popular)
 */
export const fetchTrendingAssets = async (): Promise<TrendingAsset[]> => {
  // In a real implementation, you would fetch top performing assets
  // For this demo, we'll just use a few hardcoded symbols
  const symbols = [
    { symbol: 'NVDA', isStock: true },
    { symbol: 'BTC', isStock: false },
    { symbol: 'MSFT', isStock: true }
  ];
  
  try {
    const trendingAssets: TrendingAsset[] = [];
    
    for (const item of symbols) {
      const asset = await fetchAssetData(item.symbol, item.isStock);
      if (asset) {
        trendingAssets.push({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          change: asset.change,
          signal: asset.change > 2 ? 'BUY' : asset.change < -2 ? 'SELL' : 'HOLD',
          confidence: Math.min(0.5 + Math.abs(asset.change) / 20, 0.95)  // Simple model
        });
      }
    }
    
    if (trendingAssets.length === 0) {
      // If we couldn't fetch any real trending assets, use mock data
      isUsingDemoData = true;
      console.log("Using mock trending assets data");
      return mockTrendingAssets;
    }
    
    return trendingAssets;
  } catch (error) {
    console.error('Error fetching trending assets:', error);
    isUsingDemoData = true;
    console.log("Using mock trending assets data due to error");
    return mockTrendingAssets;
  }
};

/**
 * Search assets by name or symbol
 */
export const searchAssets = async (query: string): Promise<Asset[]> => {
  if (!query) return [];
  
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords: query,
        apikey: API_KEY
      }
    });
    
    const matches = response.data.bestMatches || [];
    
    // Convert to our Asset format
    const assets: Asset[] = await Promise.all(
      matches.slice(0, 5).map(async (match: any) => {
        const symbol = match['1. symbol'];
        const isStock = match['3. type'].toLowerCase() !== 'crypto';
        
        // Fetch current price data
        const asset = await fetchAssetData(symbol, isStock);
        
        if (asset) return asset;
        
        // Fallback if we couldn't get price data
        return {
          id: symbol,
          symbol: symbol,
          name: match['2. name'],
          type: isStock ? 'stock' : 'crypto',
          price: 0,
          change: 0,
          marketCap: 0,
          volume: 0,
          rating: 5,
          trend: 'NEUTRAL',
          analysis: 'No analysis available',
          recommendation: 'HOLD'
        };
      })
    );
    
    return assets.filter(a => a !== null) as Asset[];
  } catch (error) {
    console.error('Error searching assets:', error);
    return [];
  }
};

/**
 * Fetches financial news for a specific asset
 */
export const fetchAssetNews = async (symbol: string): Promise<any[]> => {
  try {
    const response = await axios.get(`${NEWS_API_URL}/everything`, {
      params: {
        q: symbol,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 10,
        apiKey: NEWS_API_KEY
      }
    });
    
    if (response.data.articles) {
      return response.data.articles.map((article: any) => ({
        title: article.title,
        source: article.source.name,
        url: article.url,
        publishedAt: article.publishedAt,
        sentiment: analyzeSentiment(article.title), // We'll implement this function
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};

/**
 * Fetches financial ratios and metrics for a stock
 */
export const fetchFinancialMetrics = async (symbol: string): Promise<any> => {
  try {
    const response = await axios.get(`${FINANCIAL_MODELING_PREP_URL}/ratios/${symbol}`, {
      params: {
        apikey: FMP_API_KEY
      }
    });
    
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching financial metrics:', error);
    return null;
  }
};

/**
 * Analyzes sentiment of text (simple implementation)
 * In a real app, this would use a proper NLP model
 */
const analyzeSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
  const positiveWords = ['surge', 'gain', 'rise', 'up', 'grow', 'improve', 'bullish', 'outperform'];
  const negativeWords = ['drop', 'fall', 'decline', 'down', 'crash', 'bearish', 'underperform'];
  
  const lowerText = text.toLowerCase();
  
  let positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
  let negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
};

/**
 * Fetches on-chain data for cryptocurrencies
 */
export const fetchOnChainData = async (symbol: string): Promise<any> => {
  if (symbol !== 'BTC' && symbol !== 'ETH') return null;
  
  try {
    const endpoint = symbol === 'BTC' ? 'blockchain/latest' : 'stats';
    const response = await axios.get(`${CRYPTO_COMPARE_URL}/${endpoint}`, {
      params: {
        fsym: symbol,
        tsym: 'USD',
        api_key: CRYPTO_COMPARE_API_KEY
      }
    });
    
    if (response.data) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching on-chain data:', error);
    return null;
  }
};

/**
 * Augments asset data with AI-powered analysis and prediction
 */
export const generateAIAnalysis = (asset: Asset, candlestickData: CandlestickData[]): Asset => {
  // Extract recent price data
  const recentPrices = candlestickData.slice(-30).map(d => d.close);
  
  // Calculate simple momentum
  const momentum = calculateMomentum(recentPrices);
  
  // Calculate volatility
  const volatility = calculateVolatility(recentPrices);
  
  // Determine trend strength (1-10)
  const trendStrength = Math.min(10, Math.max(1, Math.round((Math.abs(momentum) / 0.01) * (1 - volatility / 0.2))));
  
  // Generate rating (1-10)
  let rating = 5; // Neutral starting point
  
  if (momentum > 0) {
    // Positive momentum
    rating = Math.min(10, 5 + Math.round(trendStrength / 2));
  } else {
    // Negative momentum
    rating = Math.max(1, 5 - Math.round(trendStrength / 2));
  }
  
  // Generate recommendation
  let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  if (rating >= 7) recommendation = 'BUY';
  if (rating <= 3) recommendation = 'SELL';
  
  // Generate analysis text
  const analysisText = generateAnalysisText(asset, momentum, volatility, trendStrength);
  
  return {
    ...asset,
    rating,
    trend: momentum > 0 ? 'RISING' : 'FALLING',
    analysis: analysisText,
    recommendation
  };
};

/**
 * Calculates price momentum (percentage change)
 */
const calculateMomentum = (prices: number[]): number => {
  if (prices.length < 10) return 0;
  
  const recent = prices.slice(-5);
  const earlier = prices.slice(-10, -5);
  
  const recentAvg = recent.reduce((sum, price) => sum + price, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, price) => sum + price, 0) / earlier.length;
  
  return (recentAvg - earlierAvg) / earlierAvg;
};

/**
 * Calculates price volatility
 */
const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(Math.abs((prices[i] - prices[i-1]) / prices[i-1]));
  }
  
  return changes.reduce((sum, change) => sum + change, 0) / changes.length;
};

/**
 * Generates analysis text based on calculated metrics
 */
const generateAnalysisText = (asset: Asset, momentum: number, volatility: number, trendStrength: number): string => {
  const direction = momentum > 0 ? 'positive' : 'negative';
  const strength = trendStrength >= 7 ? 'strong' : trendStrength >= 4 ? 'moderate' : 'weak';
  const volatilityLevel = volatility > 0.03 ? 'high' : volatility > 0.01 ? 'moderate' : 'low';
  
  return `${asset.name} is showing a ${strength} ${direction} trend with ${volatilityLevel} volatility. ${
    asset.recommendation === 'BUY' 
      ? 'Technical indicators suggest this could be a good buying opportunity.'
      : asset.recommendation === 'SELL'
        ? 'Technical indicators suggest it might be wise to reduce exposure.'
        : 'Technical indicators suggest maintaining current positions.'
  }`;
};

/**
 * Scrapes candlestick data from alternative sources
 */
const scrapeCandlestickData = async (
  symbol: string,
  isStock = true,
  timeframe: '30d' | '90d' | '1y' = '90d'
): Promise<CandlestickData[]> => {
  try {
    const daysToFetch = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    
    if (isStock) {
      // Use Yahoo Finance for stocks
      const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        params: {
          interval: '1d',
          range: timeframe === '30d' ? '1mo' : timeframe === '90d' ? '3mo' : '1y'
        }
      });
      
      if (response.data && response.data.chart && response.data.chart.result) {
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const quote = result.indicators.quote[0];
        
        const candlestickData: CandlestickData[] = [];
        
        for (let i = 0; i < timestamps.length; i++) {
          // Skip entries with missing data
          if (!quote.open[i] || !quote.high[i] || !quote.low[i] || !quote.close[i]) {
            continue;
          }
          
          // Convert timestamp to date
          const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
          
          candlestickData.push({
            date: date,
            open: quote.open[i],
            high: quote.high[i],
            low: quote.low[i],
            close: quote.close[i],
            volume: quote.volume[i] || 0
          });
        }
        
        console.log(`Successfully scraped Yahoo Finance chart data for ${symbol} (${candlestickData.length} candles)`);
        return candlestickData;
      }
    } else {
      // For crypto, use CryptoCompare
      const response = await axios.get(`${CRYPTO_COMPARE_URL}/v2/histoday`, {
        params: {
          fsym: symbol,
          tsym: 'USD',
          limit: daysToFetch,
          api_key: CRYPTO_COMPARE_API_KEY
        }
      });
      
      if (response.data && response.data.Data && response.data.Data.Data) {
        const historyData = response.data.Data.Data;
        const candlestickData: CandlestickData[] = [];
        
        for (const data of historyData) {
          // Convert timestamp to date
          const date = new Date(data.time * 1000).toISOString().split('T')[0];
          
          candlestickData.push({
            date: date,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            volume: data.volumefrom || 0
          });
        }
        
        console.log(`Successfully scraped CryptoCompare chart data for ${symbol} (${candlestickData.length} candles)`);
        return candlestickData;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error scraping candlestick data:', error);
    return [];
  }
};

/**
 * Helper function to generate mock candlestick data based on a symbol
 */
const generateMockCandlestickData = (symbol: string, timeframe: '30d' | '90d' | '1y' = '90d'): CandlestickData[] => {
  console.log(`Generating mock candlestick data for ${symbol}`);
  isUsingDemoData = true;
  
  const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  const candlestickData: CandlestickData[] = [];
  
  // Starting price - use the symbol characters to generate a deterministic starting point
  const symbolSum = symbol.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  let basePrice = (symbolSum % 1000) + 50; // Between 50 and 1050
  
  // Volatility - some symbols should be more volatile
  const volatility = (symbolSum % 10) / 100 + 0.01; // Between 0.01 and 0.11
  
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Introduce some randomness but with a trend
    const trend = Math.sin(i / 15) * volatility * 5;
    const dailyChange = (Math.random() - 0.5) * volatility * basePrice + trend;
    
    // Don't let price go below 1
    basePrice = Math.max(1, basePrice + dailyChange);
    
    // Calculate high and low with some randomness
    const amplitude = basePrice * volatility * (Math.random() + 0.5);
    const high = basePrice + amplitude / 2;
    const low = Math.max(1, basePrice - amplitude / 2);
    
    // Open and close 
    const open = low + Math.random() * (high - low);
    const close = low + Math.random() * (high - low);
    
    // Volume with some randomness
    const volume = Math.round(basePrice * 10000 * (0.5 + Math.random()));
    
    candlestickData.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });
  }
  
  return candlestickData;
};

/**
 * Scrapes historical candlestick data when API access is not available
 */
export const scrapeHistoricalData = async (symbol: string, isStock = true): Promise<CandlestickData[]> => {
  try {
    // Target URL for historical data
    const url = isStock 
      ? `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`
      : `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}-USD?interval=1d&range=3mo`;
    
    console.log(`Scraping historical data for ${symbol} from ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const data = response.data;
    const quotes = data.chart.result[0].indicators.quote[0];
    const timestamps = data.chart.result[0].timestamp;
    
    if (!quotes || !timestamps) {
      throw new Error('Invalid response format for historical data');
    }
    
    return timestamps.map((timestamp: number, index: number) => {
      const date = new Date(timestamp * 1000).toISOString().split('T')[0];
      return {
        date,
        open: quotes.open[index] || 0,
        high: quotes.high[index] || 0,
        low: quotes.low[index] || 0,
        close: quotes.close[index] || 0,
        volume: quotes.volume[index] || 0
      };
    }).filter((candle: CandlestickData) => 
      candle.open && candle.high && candle.low && candle.close
    );
  } catch (error) {
    console.error(`Error scraping historical data for ${symbol}:`, error);
    return [];
  }
};

