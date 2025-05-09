import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { CandlestickData, SMAData, PatternResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CandlestickChartProps {
  candlestickData: CandlestickData[];
  smaData?: SMAData[];
  showSMA?: boolean;
  showVolume?: boolean;
  selectedPattern?: PatternResult | null;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candlestickData,
  smaData = [],
  showSMA = true,
  showVolume = true,
  selectedPattern = null
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    // Process the data for better visualization
    if (candlestickData.length) {
      // Instead of just mapping, let's enhance the data with additional calculations
      const enhanced = candlestickData.map((candle, index) => {
        const smaPoint = smaData.find(sma => sma.date === candle.date);
        
        // Calculate percentage change from previous day
        const previousDay = index > 0 ? candlestickData[index - 1] : null;
        const dayChange = previousDay 
          ? ((candle.close - previousDay.close) / previousDay.close) * 100 
          : 0;
          
        // Calculate volatility as a simple 5-day rolling window
        const volatilityWindow = candlestickData.slice(
          Math.max(0, index - 5), 
          index + 1
        );
        const prices = volatilityWindow.map(d => d.close);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const volatility = prices.length > 1
          ? Math.sqrt(prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length)
          : 0;
          
        return {
          date: candle.date,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          // Change visualization data
          dayChange,
          volatility,
          // Optional SMA values
          sma10: smaPoint?.sma10,
          sma30: smaPoint?.sma30,
          sma50: smaPoint?.sma50
        };
      });
      
      setChartData(enhanced);
    }
  }, [candlestickData, smaData]);
  
  // Custom tooltip content with enhanced information
  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-card shadow-md border rounded-lg p-3">
          <div className="font-semibold">{new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <div>Open:</div>
            <div className="text-right">${data.open.toFixed(2)}</div>
            <div>High:</div>
            <div className="text-right">${data.high.toFixed(2)}</div>
            <div>Low:</div>
            <div className="text-right">${data.low.toFixed(2)}</div>
            <div>Close:</div>
            <div className={cn(
              "text-right",
              data.close >= data.open ? "text-app-green" : "text-app-red"
            )}>
              ${data.close.toFixed(2)}
            </div>
            <div>Change:</div>
            <div className={cn(
              "text-right",
              data.dayChange >= 0 ? "text-app-green" : "text-app-red"
            )}>
              {data.dayChange >= 0 ? "+" : ""}{data.dayChange.toFixed(2)}%
            </div>
            <div>Volume:</div>
            <div className="text-right">{(data.volume / 1000000).toFixed(2)}M</div>
            {data.sma10 && (
              <>
                <div>SMA10:</div>
                <div className="text-right">${data.sma10.toFixed(2)}</div>
              </>
            )}
            {data.sma30 && (
              <>
                <div>SMA30:</div>
                <div className="text-right">${data.sma30.toFixed(2)}</div>
              </>
            )}
            {data.sma50 && (
              <>
                <div>SMA50:</div>
                <div className="text-right">${data.sma50.toFixed(2)}</div>
              </>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Find min and max prices for the chart
  const prices = candlestickData.flatMap(d => [d.high, d.low]);
  const minPrice = Math.floor(Math.min(...prices) * 0.99); // Add small padding
  const maxPrice = Math.ceil(Math.max(...prices) * 1.01);
  
  // Handle pattern visualization
  const patternStartIndex = selectedPattern 
    ? candlestickData.findIndex(d => d.date === selectedPattern.startDate)
    : -1;
    
  const patternEndIndex = selectedPattern 
    ? candlestickData.findIndex(d => d.date === selectedPattern.endDate)
    : -1;
    
  const patternStartDate = patternStartIndex >= 0 
    ? candlestickData[patternStartIndex].date
    : '';
    
  const patternEndDate = patternEndIndex >= 0 
    ? candlestickData[patternEndIndex].date
    : '';
  
  // Get pattern color based on signal
  const getPatternColor = () => {
    if (!selectedPattern) return 'rgba(99, 102, 241, 0.2)'; // Default blue
    
    if (selectedPattern.signal === 'bullish') {
      return 'rgba(51, 184, 148, 0.3)'; // Green
    } else if (selectedPattern.signal === 'bearish') {
      return 'rgba(234, 56, 76, 0.3)'; // Red
    } else {
      return 'rgba(245, 158, 11, 0.3)'; // Yellow/orange
    }
  };
  
  // Generate support/resistance lines if applicable
  const renderSupportResistanceLines = () => {
    if (!selectedPattern) return null;
    
    if (selectedPattern.patternType === 'SUPPORT' || selectedPattern.patternType === 'RESISTANCE') {
      return (
        <ReferenceLine 
          y={selectedPattern.level} 
          stroke={selectedPattern.patternType === 'SUPPORT' ? "#33b894" : "#EA384C"} 
          strokeDasharray="3 3" 
          label={{
            value: `${selectedPattern.patternType === 'SUPPORT' ? 'Support' : 'Resistance'}: $${selectedPattern.level?.toFixed(2)}`,
            position: 'insideBottomRight',
            fill: selectedPattern.patternType === 'SUPPORT' ? "#33b894" : "#EA384C",
            fontSize: 12
          }}
        />
      );
    }
    
    return null;
  };
  
  return (
    <div className="w-full">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              {/* Define gradients for the areas */}
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              minTickGap={30}
            />
            
            <YAxis 
              domain={[minPrice, maxPrice]} 
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(value) => `$${value}`}
              orientation="right"
            />
            
            <Tooltip content={renderTooltip} />
            
            {/* Pattern highlighting */}
            {selectedPattern && patternStartDate && patternEndDate && (
              <ReferenceArea 
                x1={patternStartDate} 
                x2={patternEndDate} 
                fill={getPatternColor()} 
                fillOpacity={0.3} 
                stroke={selectedPattern.signal === 'bullish' ? "#33b894" : 
                        selectedPattern.signal === 'bearish' ? "#EA384C" : "#f59e0b"}
                strokeDasharray="3 3"
              />
            )}
            
            {/* Support/Resistance line */}
            {renderSupportResistanceLines()}
            
            {/* Closing prices area */}
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke="#6366F1" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#colorClose)" 
              animationDuration={1000}
            />
            
            {/* Moving Averages */}
            {showSMA && (
              <>
                <Area 
                  type="monotone" 
                  dataKey="sma10" 
                  stroke="#33b894" 
                  strokeWidth={1.5} 
                  dot={false}
                  activeDot={false}
                  fill="none"
                  animationDuration={1000}
                />
                <Area 
                  type="monotone" 
                  dataKey="sma30" 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  dot={false}
                  activeDot={false}
                  fill="none"
                  animationDuration={1000}
                />
                <Area 
                  type="monotone" 
                  dataKey="sma50" 
                  stroke="#EA384C" 
                  strokeWidth={1.5} 
                  dot={false}
                  activeDot={false}
                  fill="none"
                  animationDuration={1000}
                />
              </>
            )}
            
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Volume Chart */}
      {showVolume && (
        <div className="h-[100px] mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                minTickGap={50}
                height={20}
              />
              <YAxis 
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : `${(value / 1000).toFixed(0)}K`}
                orientation="right"
                width={40}
              />
              <Area 
                type="monotone" 
                dataKey="volume" 
                stroke="#818CF8" 
                fillOpacity={1} 
                fill="url(#colorVolume)" 
              />
              
              {/* Highlight pattern area in volume chart too */}
              {selectedPattern && patternStartDate && patternEndDate && (
                <ReferenceArea 
                  x1={patternStartDate} 
                  x2={patternEndDate} 
                  fillOpacity={0.3}
                  fill={getPatternColor()}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Pattern label if one is selected */}
      {selectedPattern && (
        <div className={cn(
          "mt-2 text-xs text-center py-1 rounded",
          selectedPattern.signal === 'bullish' ? "bg-app-green/20 text-app-green" :
          selectedPattern.signal === 'bearish' ? "bg-app-red/20 text-app-red" :
          "bg-yellow-500/20 text-yellow-500"
        )}>
          {selectedPattern.patternType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')} pattern detected
          {selectedPattern.level ? ` (${selectedPattern.patternType.toLowerCase()} at $${selectedPattern.level.toFixed(2)})` : ''}
        </div>
      )}
    </div>
  );
};

export default CandlestickChart;

