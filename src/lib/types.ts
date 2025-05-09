
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
