import { Asset, CandlestickData, AIPrediction, TechnicalIndicator, NewsItem } from '@/lib/types';

/**
 * Machine Learning Service
 * 
 * This service provides AI/ML-based analysis of financial data.
 * In a production app, this would connect to a backend ML service.
 * For now, we'll implement simplified algorithms.
 */

/**
 * Generates price prediction using simplified ML algorithms
 */
export const generatePricePrediction = (
  asset: Asset, 
  candlestickData: CandlestickData[]
): AIPrediction => {
  if (!candlestickData.length) {
    return getDefaultPrediction(asset.price);
  }
  
  // Extract closing prices
  const closingPrices = candlestickData.map(d => d.close);
  
  // Calculate trend using linear regression
  const trend = calculateLinearRegression(closingPrices);
  
  // Calculate volatility
  const volatility = calculateVolatility(closingPrices);
  
  // Calculate support and resistance levels
  const levels = calculateSupportResistanceLevels(candlestickData);
  
  // Calculate target price (linear projection + mean reversion)
  const lastPrice = closingPrices[closingPrices.length - 1];
  const targetPrice = lastPrice * (1 + trend.slope * 0.1); // Simplified projection
  
  // Calculate expected percentage move
  const expectedMove = ((targetPrice - lastPrice) / lastPrice) * 100;
  
  // Determine confidence based on R-squared of regression and volatility
  const confidence = Math.max(0, Math.min(1, trend.rSquared * (1 - volatility)));
  
  return {
    targetPrice,
    timeframe: '1m', // Default to 1 month prediction
    probability: confidence,
    expectedMove,
    supportLevels: levels.support,
    resistanceLevels: levels.resistance
  };
};

/**
 * Default prediction when no data available
 */
const getDefaultPrediction = (currentPrice: number): AIPrediction => {
  return {
    targetPrice: currentPrice,
    timeframe: '1m',
    probability: 0.5,
    expectedMove: 0,
    supportLevels: [currentPrice * 0.9],
    resistanceLevels: [currentPrice * 1.1]
  };
};

/**
 * Calculate linear regression on price data
 * Returns slope and R-squared
 */
const calculateLinearRegression = (prices: number[]): { slope: number, rSquared: number } => {
  const n = prices.length;
  
  // X values are just the indices (time steps)
  const x = Array.from({ length: n }, (_, i) => i);
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = prices.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate slope
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (prices[i] - meanY);
    denominator += (x[i] - meanX) ** 2;
  }
  
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  // Calculate R-squared
  let totalSS = 0;
  let residualSS = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * x[i];
    totalSS += (prices[i] - meanY) ** 2;
    residualSS += (prices[i] - predicted) ** 2;
  }
  
  const rSquared = 1 - residualSS / totalSS;
  
  return { slope, rSquared };
};

/**
 * Calculate price volatility
 */
const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const variance = returns.reduce((sum, val) => sum + (val - mean) ** 2, 0) / returns.length;
  
  return Math.sqrt(variance);
};

/**
 * Calculate support and resistance levels from candlestick data
 */
const calculateSupportResistanceLevels = (
  candlestickData: CandlestickData[]
): { support: number[], resistance: number[] } => {
  const prices = candlestickData.map(d => ({ high: d.high, low: d.low }));
  const lastPrice = candlestickData[candlestickData.length - 1].close;
  
  // Find local minima (support) and maxima (resistance)
  const support: number[] = [];
  const resistance: number[] = [];
  
  // Simplified algorithm - in real-world would use more sophisticated approach
  for (let i = 5; i < prices.length - 5; i++) {
    // Check for local minima (support)
    if (
      prices[i].low < prices[i-1].low && 
      prices[i].low < prices[i-2].low &&
      prices[i].low < prices[i+1].low && 
      prices[i].low < prices[i+2].low
    ) {
      support.push(prices[i].low);
    }
    
    // Check for local maxima (resistance)
    if (
      prices[i].high > prices[i-1].high && 
      prices[i].high > prices[i-2].high &&
      prices[i].high > prices[i+1].high && 
      prices[i].high > prices[i+2].high
    ) {
      resistance.push(prices[i].high);
    }
  }
  
  // Filter to most relevant levels (closest to current price)
  const relevantSupport = support
    .filter(level => level < lastPrice)
    .sort((a, b) => b - a) // Descending order (closest first)
    .slice(0, 3);
    
  const relevantResistance = resistance
    .filter(level => level > lastPrice)
    .sort((a, b) => a - b) // Ascending order (closest first)
    .slice(0, 3);
  
  return { 
    support: relevantSupport, 
    resistance: relevantResistance 
  };
};

/**
 * Generates technical indicators for an asset
 */
export const generateTechnicalIndicators = (
  candlestickData: CandlestickData[]
): TechnicalIndicator[] => {
  if (candlestickData.length < 30) {
    return [];
  }
  
  const closingPrices = candlestickData.map(d => d.close);
  const indicators: TechnicalIndicator[] = [];
  
  // RSI (Relative Strength Index)
  const rsi = calculateRSI(closingPrices);
  indicators.push({
    name: 'RSI',
    value: rsi,
    signal: rsi > 70 ? 'bearish' : rsi < 30 ? 'bullish' : 'neutral',
    description: 'Relative Strength Index measures momentum and overbought/oversold conditions'
  });
  
  // MACD (Moving Average Convergence Divergence)
  const macd = calculateMACD(closingPrices);
  indicators.push({
    name: 'MACD',
    value: macd.value,
    signal: macd.signal,
    description: 'MACD shows the relationship between two moving averages of a security\'s price'
  });
  
  // Bollinger Bands
  const bollingerBands = calculateBollingerBands(closingPrices);
  indicators.push({
    name: 'Bollinger Bands',
    value: bollingerBands.percentB,
    signal: bollingerBands.signal,
    description: 'Bollinger Bands measure volatility and relative price levels'
  });
  
  return indicators;
};

/**
 * Calculate RSI (Relative Strength Index) - simplified
 */
const calculateRSI = (prices: number[], period = 14): number => {
  if (prices.length < period + 1) return 50; // Default when not enough data
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i-1]);
  }
  
  const recentChanges = changes.slice(-period);
  
  const gains = recentChanges.filter(change => change > 0);
  const losses = recentChanges.filter(change => change < 0).map(loss => Math.abs(loss));
  
  const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
  
  if (avgLoss === 0) return 100; // Avoid division by zero
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return rsi;
};

/**
 * Calculate MACD (Moving Average Convergence Divergence) - simplified
 */
const calculateMACD = (prices: number[]): { value: number, signal: 'bullish' | 'bearish' | 'neutral' } => {
  if (prices.length < 26) {
    return { value: 0, signal: 'neutral' };
  }
  
  // Calculate EMA12 and EMA26
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  // MACD line = EMA12 - EMA26
  const macdLine = ema12 - ema26;
  
  // Calculate recent MACD line values for signal
  const recentPrices = prices.slice(-30);
  const recentEma12 = calculateEMA(recentPrices, 12);
  const recentEma26 = calculateEMA(recentPrices, 26);
  const previousMacdLine = recentEma12 - recentEma26;
  
  // Determine signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (macdLine > 0 && previousMacdLine < 0) {
    signal = 'bullish'; // Crossed above zero
  } else if (macdLine < 0 && previousMacdLine > 0) {
    signal = 'bearish'; // Crossed below zero
  } else if (macdLine > previousMacdLine) {
    signal = 'bullish'; // Upward momentum
  } else if (macdLine < previousMacdLine) {
    signal = 'bearish'; // Downward momentum
  }
  
  return { value: macdLine, signal };
};

/**
 * Calculate Exponential Moving Average (EMA)
 */
const calculateEMA = (prices: number[], period: number): number => {
  const k = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }
  
  return ema;
};

/**
 * Calculate Bollinger Bands - simplified
 */
const calculateBollingerBands = (
  prices: number[]
): { percentB: number, signal: 'bullish' | 'bearish' | 'neutral' } => {
  if (prices.length < 20) {
    return { percentB: 0.5, signal: 'neutral' };
  }
  
  const period = 20;
  const recentPrices = prices.slice(-period);
  
  // Calculate SMA
  const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
  
  // Calculate Standard Deviation
  const squaredDifferences = recentPrices.map(price => Math.pow(price - sma, 2));
  const variance = squaredDifferences.reduce((sum, sqDiff) => sum + sqDiff, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  // Calculate Bollinger Bands
  const upperBand = sma + (2 * stdDev);
  const lowerBand = sma - (2 * stdDev);
  
  // Calculate %B (percent B)
  const currentPrice = prices[prices.length - 1];
  const percentB = (currentPrice - lowerBand) / (upperBand - lowerBand);
  
  // Determine signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (percentB > 1) {
    signal = 'bearish'; // Price above upper band (potentially overbought)
  } else if (percentB < 0) {
    signal = 'bullish'; // Price below lower band (potentially oversold)
  } else if (percentB > 0.8) {
    signal = 'bearish'; // Approaching upper band
  } else if (percentB < 0.2) {
    signal = 'bullish'; // Approaching lower band
  }
  
  return { percentB, signal };
};

/**
 * Analyzes news sentiment for a given asset
 */
export const analyzeNewsSentiment = (newsItems: NewsItem[]): {
  overallSentiment: 'positive' | 'negative' | 'neutral',
  sentimentScore: number, // -1 to 1
  topPositive: NewsItem | null,
  topNegative: NewsItem | null
} => {
  if (!newsItems.length) {
    return {
      overallSentiment: 'neutral',
      sentimentScore: 0,
      topPositive: null,
      topNegative: null
    };
  }
  
  // Count sentiment types
  const sentimentCounts = {
    positive: newsItems.filter(item => item.sentiment === 'positive').length,
    negative: newsItems.filter(item => item.sentiment === 'negative').length,
    neutral: newsItems.filter(item => item.sentiment === 'neutral').length
  };
  
  // Calculate overall sentiment score (-1 to 1)
  const totalItems = newsItems.length;
  const sentimentScore = (sentimentCounts.positive - sentimentCounts.negative) / totalItems;
  
  // Determine overall sentiment
  let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (sentimentScore > 0.2) overallSentiment = 'positive';
  if (sentimentScore < -0.2) overallSentiment = 'negative';
  
  // Find most important articles
  const positiveItems = newsItems.filter(item => item.sentiment === 'positive');
  const negativeItems = newsItems.filter(item => item.sentiment === 'negative');
  
  const topPositive = positiveItems.length ? positiveItems[0] : null;
  const topNegative = negativeItems.length ? negativeItems[0] : null;
  
  return {
    overallSentiment,
    sentimentScore,
    topPositive,
    topNegative
  };
};

/**
 * Online learning function - updates model weights
 * This is a mock implementation. In a real app, this would update actual ML models.
 */
export const updateModelWeights = (
  symbol: string, 
  predictionAccuracy: number, 
  userFeedback: 'accurate' | 'inaccurate'
): void => {
  // In a real implementation, this would:
  // 1. Store the feedback in a database
  // 2. Periodically retrain the model with new data
  // 3. Adjust model weights based on accuracy
  
  // For now, just log that we received feedback
  console.log(`Received feedback for ${symbol}: Prediction was ${userFeedback}`);
  console.log(`Prediction accuracy was ${predictionAccuracy.toFixed(2)}`);
  
  // In a real app, we would save this to persistent storage
  const modelAdjustment = {
    symbol,
    timestamp: new Date().toISOString(),
    accuracy: predictionAccuracy,
    feedback: userFeedback,
    // We would store more details in a real implementation
  };
  
  // Store in localStorage as a simple demonstration
  const storedAdjustments = localStorage.getItem('modelAdjustments') || '[]';
  const adjustments = JSON.parse(storedAdjustments);
  adjustments.push(modelAdjustment);
  localStorage.setItem('modelAdjustments', JSON.stringify(adjustments));
}; 