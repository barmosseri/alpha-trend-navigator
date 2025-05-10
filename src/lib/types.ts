
// Asset types
export type AssetType = 'stock' | 'crypto';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  change: number;
  marketCap: number;
  volume: number;
  rating: number;
  trend: 'RISING' | 'FALLING' | 'NEUTRAL';
  analysis?: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
}

export interface TrendingAsset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  change: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

// Candlestick chart data
export interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// SMA data structure
export interface SMAData {
  date: string;
  sma10: number;
  sma30: number;
  sma50: number;
}

// Pattern detection types
export type PatternType = 
  'HEAD_AND_SHOULDERS' | 
  'DOUBLE_TOP' | 
  'DOUBLE_BOTTOM' | 
  'TRIPLE_TOP' | 
  'TRIPLE_BOTTOM' | 
  'ASCENDING_TRIANGLE' | 
  'DESCENDING_TRIANGLE' | 
  'SYMMETRICAL_TRIANGLE' | 
  'FLAG' | 
  'PENNANT' | 
  'WEDGE' | 
  'CUP_AND_HANDLE' | 
  'SUPPORT' | 
  'RESISTANCE';

export interface PatternResult {
  patternType: PatternType;
  startDate: string;
  endDate: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  description: string;
  level?: number;
}

// News item
export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  content?: string;
}

// User portfolio
export interface PortfolioItem {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  averageCost: number;
  currentPrice?: number;
}

// Watchlist
export type WatchlistItem = Asset;
