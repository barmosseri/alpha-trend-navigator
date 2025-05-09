import axios from 'axios';
import { CandlestickData, PatternResult, PatternType, Asset } from '@/lib/types';

// APIs
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'YOUR_FINNHUB_API_KEY';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const STOOQ_BASE_URL = 'https://stooq.com/q/d/l';

// Cache for pattern detection results
const patternCache = new Map<string, {timestamp: number, results: PatternResult[]}>();
const CACHE_EXPIRY = 3600000; // 1 hour

/**
 * Fetches historical data from Stooq
 */
export const fetchStooqHistoricalData = async (
  symbol: string,
  days: number = 365
): Promise<CandlestickData[]> => {
  try {
    // Format the symbol for Stooq (e.g. AAPL.US)
    const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.US`;
    
    const response = await axios.get(STOOQ_BASE_URL, {
      params: {
        s: formattedSymbol,
        i: 'd', // daily data
        d1: calculateStartDate(days),
        d2: formatDate(new Date()), // today
        f: 'csv', // CSV format
      },
      responseType: 'text'
    });
    
    return parseStooqCSV(response.data);
  } catch (error) {
    console.error('Error fetching Stooq historical data:', error);
    return [];
  }
};

/**
 * Fetches data from Finnhub
 */
export const fetchFinnhubData = async (
  symbol: string,
  resolution: string = 'D',
  from: number = Math.floor(Date.now() / 1000) - 31536000, // 1 year ago
  to: number = Math.floor(Date.now() / 1000)
): Promise<CandlestickData[]> => {
  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/candle`, {
      params: {
        symbol,
        resolution,
        from,
        to,
        token: FINNHUB_API_KEY
      }
    });
    
    if (response.data.s === 'ok' && response.data.t) {
      return response.data.t.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: response.data.o[index],
        high: response.data.h[index],
        low: response.data.l[index],
        close: response.data.c[index],
        volume: response.data.v[index]
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Finnhub data:', error);
    return [];
  }
};

/**
 * Fetches crypto historical data from multiple sources
 */
export const fetchCryptoHistoricalData = async (
  symbol: string
): Promise<CandlestickData[]> => {
  try {
    // For Bitcoin and Ethereum we'll use Finnhub's crypto endpoint
    // In a real app, we'd implement fallbacks to other sources like Investing.com
    const response = await axios.get(`${FINNHUB_BASE_URL}/crypto/candle`, {
      params: {
        symbol: `BINANCE:${symbol}USD`,
        resolution: 'D', // daily data
        from: Math.floor(Date.now() / 1000) - 31536000, // 1 year ago
        to: Math.floor(Date.now() / 1000),
        token: FINNHUB_API_KEY
      }
    });
    
    if (response.data.s === 'ok' && response.data.t) {
      return response.data.t.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: response.data.o[index],
        high: response.data.h[index],
        low: response.data.l[index],
        close: response.data.c[index],
        volume: response.data.v[index]
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching crypto historical data:', error);
    return [];
  }
};

/**
 * Fetches news data from multiple sources, combining them into a single feed
 */
export const fetchMultiSourceNews = async (symbol: string): Promise<any[]> => {
  const newsItems = [];
  
  try {
    // Finnhub company news
    const finnhubNews = await axios.get(`${FINNHUB_BASE_URL}/company-news`, {
      params: {
        symbol,
        from: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 days ago
        to: formatDate(new Date()),
        token: FINNHUB_API_KEY
      }
    });
    
    if (Array.isArray(finnhubNews.data)) {
      newsItems.push(...finnhubNews.data.map(item => ({
        title: item.headline,
        source: item.source,
        url: item.url,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        summary: item.summary,
        // We'll calculate sentiment later
        sentiment: 'neutral'
      })));
    }
    
    // For crypto, add additional news sources in a real implementation
    if (symbol === 'BTC' || symbol === 'ETH') {
      // This would be RSS parsing from the sources mentioned
      // For now just log that we would fetch from these sources
      console.log('Would fetch crypto news from:');
      console.log('- https://www.marketwatch.com/site/rss');
      console.log('- https://www.nasdaq.com/nasdaq-RSS-Feeds');
      console.log('- https://cointelegraph.com/rss-feeds');
      console.log('- https://www.coindesk.com/arc/outboundfeeds/rss/');
    }
    
    return newsItems;
  } catch (error) {
    console.error('Error fetching multi-source news:', error);
    return [];
  }
};

/**
 * Analyze price data to detect common chart patterns
 */
export const detectPatterns = async (
  asset: Asset,
  candlestickData: CandlestickData[]
): Promise<PatternResult[]> => {
  // Check cache first
  const cacheKey = `${asset.symbol}-${candlestickData.length}`;
  const cachedResult = patternCache.get(cacheKey);
  
  if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_EXPIRY)) {
    return cachedResult.results;
  }
  
  // Not in cache or expired, so detect patterns
  const patterns: PatternResult[] = [];
  
  // We need enough data to detect patterns
  if (candlestickData.length < 30) {
    return patterns;
  }
  
  // Get recent prices for pattern detection
  const prices = candlestickData.map(d => ({
    date: d.date,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume
  }));
  
  // Detect Head and Shoulders pattern
  const headAndShoulders = detectHeadAndShoulders(prices);
  if (headAndShoulders) {
    patterns.push(headAndShoulders);
  }
  
  // Detect Double Top pattern
  const doubleTop = detectDoubleTop(prices);
  if (doubleTop) {
    patterns.push(doubleTop);
  }
  
  // Detect Double Bottom pattern
  const doubleBottom = detectDoubleBottom(prices);
  if (doubleBottom) {
    patterns.push(doubleBottom);
  }
  
  // Detect Triangle patterns
  const triangles = detectTriangles(prices);
  patterns.push(...triangles);
  
  // Detect Support and Resistance levels
  const supportResistance = detectSupportResistance(prices);
  patterns.push(...supportResistance);
  
  try {
    // Import the RSS enhancement function
    const { enhancePatternDetectionWithRSS } = await import('./rssParsingService');
    
    // Enhance patterns with RSS data if available
    const enhancedPatterns = await enhancePatternDetectionWithRSS(asset.symbol, patterns);
    
    // Cache the enhanced results
    patternCache.set(cacheKey, {
      timestamp: Date.now(),
      results: enhancedPatterns
    });
    
    return enhancedPatterns;
  } catch (error) {
    console.warn('Could not enhance patterns with RSS data:', error);
    
    // Cache the original results if RSS enhancement fails
    patternCache.set(cacheKey, {
      timestamp: Date.now(),
      results: patterns
    });
    
    return patterns;
  }
};

/**
 * Detect Head and Shoulders pattern
 * This is a bearish reversal pattern
 */
const detectHeadAndShoulders = (prices: CandlestickData[]): PatternResult | null => {
  const windowSize = Math.min(prices.length, 60); // Look at last 60 candles
  const recentPrices = prices.slice(-windowSize);
  
  // Algorithm to detect head and shoulders pattern:
  // 1. Find 3 peaks (left shoulder, head, right shoulder)
  // 2. Head should be higher than both shoulders
  // 3. Left and right shoulders should be at similar height
  // 4. Neckline should connect the lows between shoulders and head
  
  // This is a simplified implementation
  const peaks = findPeaks(recentPrices, 5);
  
  if (peaks.length >= 3) {
    // Need at least 3 peaks for H&S
    for (let i = 0; i < peaks.length - 2; i++) {
      const leftShoulder = peaks[i];
      const head = peaks[i + 1];
      const rightShoulder = peaks[i + 2];
      
      // Check if middle peak (head) is higher than both shoulders
      if (recentPrices[head].high > recentPrices[leftShoulder].high &&
          recentPrices[head].high > recentPrices[rightShoulder].high) {
        
        // Check if shoulders are at similar heights (within 10%)
        const leftHeight = recentPrices[leftShoulder].high;
        const rightHeight = recentPrices[rightShoulder].high;
        
        if (Math.abs(leftHeight - rightHeight) / leftHeight < 0.1) {
          // Found a head and shoulders pattern
          return {
            patternType: 'HEAD_AND_SHOULDERS',
            startIndex: leftShoulder,
            endIndex: rightShoulder,
            startDate: recentPrices[leftShoulder].date,
            endDate: recentPrices[rightShoulder].date,
            signal: 'bearish',
            strength: 0.8,
            description: 'Head and Shoulders pattern detected, suggesting a potential bearish reversal'
          };
        }
      }
    }
  }
  
  return null;
};

/**
 * Detect Double Top pattern (bearish reversal)
 */
const detectDoubleTop = (prices: CandlestickData[]): PatternResult | null => {
  const windowSize = Math.min(prices.length, 40); // Look at last 40 candles
  const recentPrices = prices.slice(-windowSize);
  
  const peaks = findPeaks(recentPrices, 3);
  
  if (peaks.length >= 2) {
    for (let i = 0; i < peaks.length - 1; i++) {
      const firstPeak = peaks[i];
      const secondPeak = peaks[i + 1];
      
      // Peaks should be separated by at least 5 candles
      if (secondPeak - firstPeak >= 5) {
        const firstHeight = recentPrices[firstPeak].high;
        const secondHeight = recentPrices[secondPeak].high;
        
        // Heights should be similar (within 3%)
        if (Math.abs(firstHeight - secondHeight) / firstHeight < 0.03) {
          // Found a double top
          return {
            patternType: 'DOUBLE_TOP',
            startIndex: firstPeak,
            endIndex: secondPeak,
            startDate: recentPrices[firstPeak].date,
            endDate: recentPrices[secondPeak].date,
            signal: 'bearish',
            strength: 0.75,
            description: 'Double Top pattern detected, suggesting a potential bearish reversal'
          };
        }
      }
    }
  }
  
  return null;
};

/**
 * Detect Double Bottom pattern (bullish reversal)
 */
const detectDoubleBottom = (prices: CandlestickData[]): PatternResult | null => {
  const windowSize = Math.min(prices.length, 40); // Look at last 40 candles
  const recentPrices = prices.slice(-windowSize);
  
  const troughs = findTroughs(recentPrices, 3);
  
  if (troughs.length >= 2) {
    for (let i = 0; i < troughs.length - 1; i++) {
      const firstTrough = troughs[i];
      const secondTrough = troughs[i + 1];
      
      // Troughs should be separated by at least 5 candles
      if (secondTrough - firstTrough >= 5) {
        const firstLow = recentPrices[firstTrough].low;
        const secondLow = recentPrices[secondTrough].low;
        
        // Lows should be similar (within 3%)
        if (Math.abs(firstLow - secondLow) / firstLow < 0.03) {
          // Found a double bottom
          return {
            patternType: 'DOUBLE_BOTTOM',
            startIndex: firstTrough,
            endIndex: secondTrough,
            startDate: recentPrices[firstTrough].date,
            endDate: recentPrices[secondTrough].date,
            signal: 'bullish',
            strength: 0.75,
            description: 'Double Bottom pattern detected, suggesting a potential bullish reversal'
          };
        }
      }
    }
  }
  
  return null;
};

/**
 * Detect Triangle patterns (symmetrical, ascending, descending)
 */
const detectTriangles = (prices: CandlestickData[]): PatternResult[] => {
  const patterns: PatternResult[] = [];
  const windowSize = Math.min(prices.length, 30); // Look at last 30 candles
  const recentPrices = prices.slice(-windowSize);
  
  // Find potential triangle patterns through trend lines
  const highPoints = findSignificantHighs(recentPrices, 4);
  const lowPoints = findSignificantLows(recentPrices, 4);
  
  if (highPoints.length >= 2 && lowPoints.length >= 2) {
    // Check for descending triangle (bearish)
    if (isHorizontalTrend(lowPoints, recentPrices) && isDescendingTrend(highPoints, recentPrices)) {
      patterns.push({
        patternType: 'DESCENDING_TRIANGLE',
        startIndex: Math.min(highPoints[0], lowPoints[0]),
        endIndex: prices.length - 1,
        startDate: recentPrices[Math.min(highPoints[0], lowPoints[0])].date,
        endDate: recentPrices[recentPrices.length - 1].date,
        signal: 'bearish',
        strength: 0.7,
        description: 'Descending Triangle pattern detected, suggesting a continuation of bearish trend'
      });
    }
    
    // Check for ascending triangle (bullish)
    if (isHorizontalTrend(highPoints, recentPrices) && isAscendingTrend(lowPoints, recentPrices)) {
      patterns.push({
        patternType: 'ASCENDING_TRIANGLE',
        startIndex: Math.min(highPoints[0], lowPoints[0]),
        endIndex: prices.length - 1,
        startDate: recentPrices[Math.min(highPoints[0], lowPoints[0])].date,
        endDate: recentPrices[recentPrices.length - 1].date,
        signal: 'bullish',
        strength: 0.7,
        description: 'Ascending Triangle pattern detected, suggesting a continuation of bullish trend'
      });
    }
    
    // Check for symmetrical triangle
    if (isDescendingTrend(highPoints, recentPrices) && isAscendingTrend(lowPoints, recentPrices)) {
      patterns.push({
        patternType: 'SYMMETRICAL_TRIANGLE',
        startIndex: Math.min(highPoints[0], lowPoints[0]),
        endIndex: prices.length - 1,
        startDate: recentPrices[Math.min(highPoints[0], lowPoints[0])].date,
        endDate: recentPrices[recentPrices.length - 1].date,
        signal: 'neutral',
        strength: 0.6,
        description: 'Symmetrical Triangle pattern detected, suggesting a potential breakout in either direction'
      });
    }
  }
  
  return patterns;
};

/**
 * Detect Support and Resistance levels
 */
const detectSupportResistance = (prices: CandlestickData[]): PatternResult[] => {
  const patterns: PatternResult[] = [];
  const windowSize = Math.min(prices.length, 90); // Look at last 90 candles
  const recentPrices = prices.slice(-windowSize);
  
  const significantHighs = findSignificantHighs(recentPrices, 5);
  const significantLows = findSignificantLows(recentPrices, 5);
  
  // Cluster analysis to find support/resistance zones
  const highClusters = clusterLevels(significantHighs.map(i => recentPrices[i].high));
  const lowClusters = clusterLevels(significantLows.map(i => recentPrices[i].low));
  
  // Current price for determining if we're at support/resistance
  const currentPrice = recentPrices[recentPrices.length - 1].close;
  
  // Add resistance levels
  highClusters.forEach(level => {
    const strength = calculateLevelStrength(level, recentPrices, true);
    // Check if price is near resistance
    const isNearResistance = Math.abs(currentPrice - level) / level < 0.03;
    
    patterns.push({
      patternType: 'RESISTANCE',
      startIndex: 0,
      endIndex: recentPrices.length - 1,
      startDate: recentPrices[0].date,
      endDate: recentPrices[recentPrices.length - 1].date,
      level,
      signal: isNearResistance ? 'bearish' : 'neutral',
      strength,
      description: `Resistance level detected at $${level.toFixed(2)}${isNearResistance ? ' (price at resistance)' : ''}`
    });
  });
  
  // Add support levels
  lowClusters.forEach(level => {
    const strength = calculateLevelStrength(level, recentPrices, false);
    // Check if price is near support
    const isNearSupport = Math.abs(currentPrice - level) / level < 0.03;
    
    patterns.push({
      patternType: 'SUPPORT',
      startIndex: 0,
      endIndex: recentPrices.length - 1,
      startDate: recentPrices[0].date,
      endDate: recentPrices[recentPrices.length - 1].date,
      level,
      signal: isNearSupport ? 'bullish' : 'neutral',
      strength,
      description: `Support level detected at $${level.toFixed(2)}${isNearSupport ? ' (price at support)' : ''}`
    });
  });
  
  return patterns;
};

/**
 * Calculate the strength of a support/resistance level
 */
const calculateLevelStrength = (
  level: number,
  prices: CandlestickData[],
  isResistance: boolean
): number => {
  // Count how many times price approached the level
  let touchCount = 0;
  const threshold = level * 0.01; // 1% threshold
  
  for (const price of prices) {
    if (isResistance) {
      if (Math.abs(price.high - level) < threshold) {
        touchCount++;
      }
    } else {
      if (Math.abs(price.low - level) < threshold) {
        touchCount++;
      }
    }
  }
  
  // Normalize to 0-1 range
  return Math.min(0.95, 0.4 + (touchCount / 10) * 0.5);
};

/**
 * Cluster price levels that are close to each other
 */
const clusterLevels = (levels: number[]): number[] => {
  if (levels.length === 0) return [];
  
  // Sort levels
  const sortedLevels = [...levels].sort((a, b) => a - b);
  
  const clusters: number[] = [];
  let currentCluster: number[] = [sortedLevels[0]];
  
  for (let i = 1; i < sortedLevels.length; i++) {
    const lastInCluster = currentCluster[currentCluster.length - 1];
    // If this level is within 2% of the last one, add to current cluster
    if ((sortedLevels[i] - lastInCluster) / lastInCluster < 0.02) {
      currentCluster.push(sortedLevels[i]);
    } else {
      // Average the current cluster and start a new one
      clusters.push(
        currentCluster.reduce((sum, val) => sum + val, 0) / currentCluster.length
      );
      currentCluster = [sortedLevels[i]];
    }
  }
  
  // Add the last cluster
  if (currentCluster.length > 0) {
    clusters.push(
      currentCluster.reduce((sum, val) => sum + val, 0) / currentCluster.length
    );
  }
  
  return clusters;
};

/**
 * Find significant price peaks
 */
const findPeaks = (prices: CandlestickData[], minDistance: number = 5): number[] => {
  const peaks: number[] = [];
  
  for (let i = minDistance; i < prices.length - minDistance; i++) {
    let isPeak = true;
    
    // Check if this point is higher than all points in the window before and after
    for (let j = i - minDistance; j < i; j++) {
      if (prices[j].high >= prices[i].high) {
        isPeak = false;
        break;
      }
    }
    
    if (isPeak) {
      for (let j = i + 1; j <= i + minDistance; j++) {
        if (prices[j].high >= prices[i].high) {
          isPeak = false;
          break;
        }
      }
    }
    
    if (isPeak) {
      peaks.push(i);
    }
  }
  
  return peaks;
};

/**
 * Find significant price troughs
 */
const findTroughs = (prices: CandlestickData[], minDistance: number = 5): number[] => {
  const troughs: number[] = [];
  
  for (let i = minDistance; i < prices.length - minDistance; i++) {
    let isTrough = true;
    
    // Check if this point is lower than all points in the window before and after
    for (let j = i - minDistance; j < i; j++) {
      if (prices[j].low <= prices[i].low) {
        isTrough = false;
        break;
      }
    }
    
    if (isTrough) {
      for (let j = i + 1; j <= i + minDistance; j++) {
        if (prices[j].low <= prices[i].low) {
          isTrough = false;
          break;
        }
      }
    }
    
    if (isTrough) {
      troughs.push(i);
    }
  }
  
  return troughs;
};

/**
 * Find significant high points for triangle patterns
 */
const findSignificantHighs = (prices: CandlestickData[], minCount: number = 3): number[] => {
  // Similar to findPeaks but with flexible parameters
  const peaks = findPeaks(prices, 3);
  return peaks.slice(-minCount);
};

/**
 * Find significant low points for triangle patterns
 */
const findSignificantLows = (prices: CandlestickData[], minCount: number = 3): number[] => {
  // Similar to findTroughs but with flexible parameters
  const troughs = findTroughs(prices, 3);
  return troughs.slice(-minCount);
};

/**
 * Check if the trend of high points is descending
 */
const isDescendingTrend = (indices: number[], prices: CandlestickData[]): boolean => {
  if (indices.length < 2) return false;
  
  // Simple linear regression
  const highs = indices.map(i => prices[i].high);
  
  // Check if the slope is negative
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < indices.length; i++) {
    sumX += i;
    sumY += highs[i];
    sumXY += i * highs[i];
    sumX2 += i * i;
  }
  
  const n = indices.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  return slope < 0;
};

/**
 * Check if the trend of low points is ascending
 */
const isAscendingTrend = (indices: number[], prices: CandlestickData[]): boolean => {
  if (indices.length < 2) return false;
  
  // Simple linear regression
  const lows = indices.map(i => prices[i].low);
  
  // Check if the slope is positive
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < indices.length; i++) {
    sumX += i;
    sumY += lows[i];
    sumXY += i * lows[i];
    sumX2 += i * i;
  }
  
  const n = indices.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  return slope > 0;
};

/**
 * Check if the trend is horizontal (flat)
 */
const isHorizontalTrend = (indices: number[], prices: CandlestickData[]): boolean => {
  if (indices.length < 2) return false;
  
  // For horizontal trend, we check if the points are within a small range
  const values = indices.map(i => prices[i].high);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const maxDeviation = Math.max(...values.map(v => Math.abs(v - mean) / mean));
  
  return maxDeviation < 0.02; // Less than 2% deviation
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
 * Combine data from multiple sources for learning/fine-tuning
 */
export const combineHistoricalData = async (
  symbol: string,
  isStock: boolean
): Promise<CandlestickData[]> => {
  let combinedData: CandlestickData[] = [];
  
  try {
    // Get data from primary and secondary sources
    let primaryData: CandlestickData[] = [];
    let secondaryData: CandlestickData[] = [];
    
    if (isStock) {
      // For stocks, use Stooq as primary and Finnhub as secondary
      primaryData = await fetchStooqHistoricalData(symbol);
      secondaryData = await fetchFinnhubData(symbol);
    } else {
      // For crypto, use Finnhub as primary 
      primaryData = await fetchCryptoHistoricalData(symbol);
      // Secondary sources would be implemented in a full solution
    }
    
    // If both sources have data, merge them with preference to primary source
    if (primaryData.length > 0 && secondaryData.length > 0) {
      // Create a map for fast lookup
      const primaryDataMap = new Map<string, CandlestickData>();
      primaryData.forEach(candle => {
        primaryDataMap.set(candle.date, candle);
      });
      
      // Add all primary data
      combinedData = [...primaryData];
      
      // Add secondary data only for dates not in primary
      secondaryData.forEach(candle => {
        if (!primaryDataMap.has(candle.date)) {
          combinedData.push(candle);
        }
      });
      
      // Sort by date
      combinedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (primaryData.length > 0) {
      // Just use primary if that's all we have
      combinedData = primaryData;
    } else if (secondaryData.length > 0) {
      // Fall back to secondary if primary fails
      combinedData = secondaryData;
    }
  } catch (error) {
    console.error('Error combining historical data:', error);
  }
  
  return combinedData;
}; 