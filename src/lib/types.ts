export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  price: number;
  change: number;
  marketCap: number;
  volume: number;
  rating: number; // 1-10
  trend: 'RISING' | 'FALLING' | 'NEUTRAL';
  analysis: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  aiPrediction?: AIPrediction;
  newsItems?: NewsItem[];
  patterns?: PatternResult[];
}

export interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMAData {
  date: string;
  sma10: number;
  sma30: number;
  sma50: number;
}

export interface TrendingAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  change: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

export interface AIPrediction {
  targetPrice: number;
  timeframe: '1d' | '1w' | '1m' | '3m';
  probability: number;
  expectedMove: number;
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface OnChainData {
  activeAddresses?: number;
  averageTransactionValue?: number;
  transactionCount?: number;
  networkHashRate?: number;
  difficulty?: number;
  fees?: number;
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface PortfolioAsset extends Asset {
  quantity: number;
  totalValue: number;
  allocationPercentage: number;
  profitLoss: number;
}

export type PatternType = 
  | 'HEAD_AND_SHOULDERS' 
  | 'DOUBLE_TOP' 
  | 'DOUBLE_BOTTOM' 
  | 'ASCENDING_TRIANGLE' 
  | 'DESCENDING_TRIANGLE' 
  | 'SYMMETRICAL_TRIANGLE' 
  | 'FLAG' 
  | 'PENNANT' 
  | 'WEDGE' 
  | 'CUP_AND_HANDLE'
  | 'SUPPORT'
  | 'RESISTANCE';

export interface PatternResult {
  patternType: PatternType;
  startIndex: number;
  endIndex: number;
  startDate: string;
  endDate: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  description: string;
  level?: number;
}

export interface DataSource {
  name: string;
  url: string;
  apiKey?: string;
  type: 'stock' | 'crypto' | 'both';
  description: string;
}

export interface HistoricalDataParams {
  symbol: string;
  from: string;
  to: string;
  interval: '1d' | '1w' | '1m';
}

export interface PatternLearningModel {
  modelId: string;
  patternType: PatternType;
  accuracy: number;
  lastTrainedDate: string;
  parameters: Record<string, number>;
  weights: number[];
}
