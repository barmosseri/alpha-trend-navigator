
import axios from 'axios';
import { Asset, CandlestickData, SMAData, TrendingAsset } from '@/lib/types';

// Normally, you would store this in an environment variable
const API_KEY = 'demo'; // Replace with your Alpha Vantage API key

// Alpha Vantage API base URL
const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Fetches stock or crypto data from Alpha Vantage API
 */
export const fetchAssetData = async (symbol: string, isStock = true): Promise<Asset | null> => {
  try {
    // Different endpoint based on asset type
    const function_name = isStock ? 'GLOBAL_QUOTE' : 'DIGITAL_CURRENCY_DAILY';
    
    const response = await axios.get(BASE_URL, {
      params: {
        function: function_name,
        symbol: symbol,
        market: 'USD', // Only needed for crypto
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
    
    console.error('Unable to parse API response:', response.data);
    return null;
  } catch (error) {
    console.error('Error fetching asset data:', error);
    return null;
  }
};

/**
 * Fetches candlestick data for the given asset
 */
export const fetchCandlestickData = async (
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
    console.error('Error fetching candlestick data:', error);
    return [];
  }
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
  
  // Adjust to use SMA 20 to match image (instead of 30)
  const periods = [10, 30, 50];
  const minPeriod = Math.min(...periods);
  
  candlestickData.forEach((candle, index) => {
    const sma10 = calculateSMA(closes, 10, index);
    const sma30 = calculateSMA(closes, 30, index);
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
 * Fetches trending assets based on volume and price change
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
    
    return trendingAssets;
  } catch (error) {
    console.error('Error fetching trending assets:', error);
    return [];
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
