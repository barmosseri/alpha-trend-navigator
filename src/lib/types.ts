
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
  patterns?: PatternResult[]; // Add patterns property
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
  symbol?: string; // Add optional symbol property
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
  startIndex?: number;
  endIndex?: number;
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

// Add missing types mentioned in errors
export interface AIPrediction {
  direction: 'up' | 'down' | 'neutral';
  probability: number;
  targetPrice: number;
  timeframe: string;
  explanation: string[];
  expectedMove: number; // Added missing property
  supportLevels: number[]; // Added missing property
  resistanceLevels: number[]; // Added missing property
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface DataSource {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  type: 'api' | 'rss' | 'webscraper' | 'stock' | 'crypto' | 'both'; // Updated to include all used types
  costPerRequest?: number;
  apiKey?: string; // Added missing property
  description?: string; // Added missing property
}

export interface PortfolioAsset extends Asset {
  quantity: number;
  totalValue: number;
  allocationPercentage: number;
  profitLoss: number;
  allocation?: number;
  risk?: number;
  expectedReturn?: number;
  correlation?: Record<string, number>;
}

export interface OnChainData {
  activeAddresses: number;
  networkHashRate?: number;
  transactionVolume: number;
  averageFee: number;
  transactionCount?: number; // Added missing property
  difficulty?: number; // Added missing property
  fees?: number; // Added missing property
  mempool?: {
    pending: number;
    size: string;
  };
  marketMetrics: {
    supply: number;
    circulatingSupply: number;
    marketCap: number;
    realizedCap?: number;
    nvtRatio?: number;
  };
  sentiment: {
    socialVolume: number;
    socialSentiment: number;
    developerActivity: number;
  };
}
