
import { Asset, CandlestickData, SMAData, TrendingAsset } from './types';

// Mock Assets Data
export const mockAssets: Asset[] = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    price: 182.52,
    change: 1.75,
    marketCap: 2850000000000,
    volume: 58900000,
    rating: 8,
    trend: 'RISING',
    analysis: 'Apple shows strong momentum with recent product announcements and services growth. The technical indicators suggest a bullish trend with strong support levels around $175.',
    recommendation: 'BUY'
  },
  {
    id: '2',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    type: 'stock',
    price: 417.88,
    change: -0.42,
    marketCap: 3110000000000,
    volume: 22100000,
    rating: 9,
    trend: 'NEUTRAL',
    analysis: 'Microsoft continues to benefit from cloud growth and AI integration. Despite recent pullback, the long-term trend remains bullish with potential resistance at $425.',
    recommendation: 'BUY'
  },
  {
    id: '3',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    price: 67341.22,
    change: 2.34,
    marketCap: 1320000000000,
    volume: 29800000000,
    rating: 7,
    trend: 'RISING',
    analysis: 'Bitcoin is showing strength after the recent halving event. On-chain metrics indicate accumulation by long-term holders, which is typically bullish.',
    recommendation: 'BUY'
  },
  {
    id: '4',
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto',
    price: 3421.87,
    change: -1.21,
    marketCap: 411000000000,
    volume: 15600000000,
    rating: 8,
    trend: 'FALLING',
    analysis: 'Ethereum is experiencing a short-term correction after the recent surge. The upcoming protocol upgrades and growing DeFi ecosystem provide strong fundamentals.',
    recommendation: 'HOLD'
  },
  {
    id: '5',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    type: 'stock',
    price: 177.82,
    change: 3.45,
    marketCap: 565000000000,
    volume: 124500000,
    rating: 6,
    trend: 'RISING',
    analysis: 'Tesla is showing a potential reversal pattern after prolonged consolidation. Recent production numbers and expanding market share in China are positive catalysts.',
    recommendation: 'BUY'
  },
  {
    id: '6',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    type: 'stock',
    price: 182.50,
    change: 0.23,
    marketCap: 1890000000000,
    volume: 41300000,
    rating: 8,
    trend: 'NEUTRAL',
    analysis: 'Amazon continues to show strength in cloud services and e-commerce. The stock is trading in a tight range with potential breakout on the horizon.',
    recommendation: 'BUY'
  },
  {
    id: '7',
    symbol: 'SOL',
    name: 'Solana',
    type: 'crypto',
    price: 142.17,
    change: 5.72,
    marketCap: 61500000000,
    volume: 3750000000,
    rating: 7,
    trend: 'RISING',
    analysis: 'Solana has been outperforming major cryptocurrencies with growing ecosystem adoption. Technical indicators suggest continued momentum.',
    recommendation: 'BUY'
  },
  {
    id: '8',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    type: 'stock',
    price: 938.15,
    change: 2.18,
    marketCap: 2310000000000,
    volume: 38700000,
    rating: 9,
    trend: 'RISING',
    analysis: 'NVIDIA continues to benefit from AI demand and maintains leadership in GPU technology. The stock is showing strong momentum with potential for further upside.',
    recommendation: 'BUY'
  },
];

// Generate mock candlestick data for a given asset
export const generateMockCandlestickData = (assetId: string, days = 90): CandlestickData[] => {
  const data: CandlestickData[] = [];
  const asset = mockAssets.find(a => a.id === assetId);
  
  if (!asset) return data;
  
  let basePrice = asset.price * 0.8; // Start from 80% of current price
  const volatility = asset.type === 'crypto' ? 0.04 : 0.02; // Higher volatility for crypto
  
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    // Random price movement with slight bias based on trend
    const trendBias = asset.trend === 'RISING' ? 0.003 : asset.trend === 'FALLING' ? -0.003 : 0;
    const dailyChange = (Math.random() - 0.5) * volatility * basePrice + basePrice * trendBias;
    
    const open = basePrice;
    const close = basePrice + dailyChange;
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    const volume = asset.volume * (0.8 + Math.random() * 0.4);
    
    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });
    
    basePrice = close; // Next day starts from previous close
  }
  
  return data;
};

// Generate mock SMA data based on candlestick data
export const generateMockSMAData = (candlestickData: CandlestickData[]): SMAData[] => {
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
  
  candlestickData.forEach((candle, index) => {
    const sma10 = calculateSMA(closes, 10, index);
    const sma30 = calculateSMA(closes, 30, index);
    const sma50 = calculateSMA(closes, 50, index);
    
    if (index >= 49) { // Only add when all SMAs are available
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

// Mock trending assets data
export const trendingAssets: TrendingAsset[] = [
  {
    id: '8',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    type: 'stock',
    change: 2.18,
    signal: 'BUY',
    confidence: 0.92
  },
  {
    id: '7',
    symbol: 'SOL',
    name: 'Solana',
    type: 'crypto',
    change: 5.72,
    signal: 'BUY',
    confidence: 0.85
  },
  {
    id: '3',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    change: 2.34,
    signal: 'BUY',
    confidence: 0.78
  }
];

// Search function to filter assets
export const searchAssets = (query: string) => {
  if (!query) return [];
  
  const lowercasedQuery = query.toLowerCase();
  return mockAssets.filter(asset => 
    asset.symbol.toLowerCase().includes(lowercasedQuery) || 
    asset.name.toLowerCase().includes(lowercasedQuery)
  );
};
