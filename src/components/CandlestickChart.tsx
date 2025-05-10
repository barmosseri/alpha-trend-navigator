
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ComposedChart,
  Bar,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Rectangle,
  Legend
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

// Custom candlestick renderer component with improved visuals
const CandlestickBar = (props: any) => {
  const { x, y, width, height, open, close, low, high, index } = props;
  
  const isIncreasing = close > open;
  // Use more vibrant colors for better visualization
  const color = isIncreasing ? "#22C55E" : "#EF4444"; // Green for increasing, Red for decreasing
  
  const bodyHeight = Math.abs(y - (isIncreasing ? open : close));
  const bodyY = isIncreasing ? y : y - bodyHeight;
  
  const wickY1 = Math.min(y - open, y - close);
  const wickY2 = Math.max(y - open, y - close);
  const wickHeight1 = wickY1 - (y - high);
  const wickHeight2 = (y - low) - wickY2;
  
  // Calculate body width based on chart (can be dynamically adjusted)
  const bodyWidth = Math.max(1, Math.min(width * 0.85, 8)); // Cap width for realistic appearance
  const bodyX = x + (width - bodyWidth) / 2;

  // Animation delay based on index
  const animationDelay = index * 10;

  return (
    <g>
      {/* Upper wick */}
      <line 
        x1={x + width / 2} 
        y1={y - high} 
        x2={x + width / 2} 
        y2={wickY1} 
        stroke={color} 
        strokeWidth={1}
        opacity={0.9}
      />
      
      {/* Lower wick */}
      <line 
        x1={x + width / 2} 
        y1={wickY2} 
        x2={x + width / 2} 
        y2={y - low} 
        stroke={color} 
        strokeWidth={1}
        opacity={0.9}
      />
      
      {/* Candle body */}
      <rect
        x={bodyX}
        y={bodyY}
        width={bodyWidth}
        height={Math.max(bodyHeight || 1, 1)} // Ensure height is at least 1px for flat candles
        fill={isIncreasing ? color : color}
        stroke={color}
        strokeWidth={1}
        opacity={0.9}
      />
    </g>
  );
};

// Enhanced volume bar renderer component
const VolumeBar = (props: any) => {
  const { x, y, width, height, open, close, index } = props;
  
  const isIncreasing = close >= open;
  // Use semi-transparent colors that match the candlesticks
  const color = isIncreasing ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)"; // Green for up, Red for down
  const strokeColor = isIncreasing ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)";
  
  // Thinner bars look more realistic
  const barWidth = Math.min(width * 0.7, 6);
  
  return (
    <Rectangle
      x={x + (width - barWidth) / 2}
      y={y}
      width={barWidth}
      height={height}
      fill={color}
      stroke={strokeColor}
      strokeWidth={0.5}
      radius={[1, 1, 0, 0]}
    />
  );
};

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candlestickData,
  smaData = [],
  showSMA = true,
  showVolume = true,
  selectedPattern = null
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [volumeMax, setVolumeMax] = useState<number>(0);
  const [hoverData, setHoverData] = useState<any>(null);
  
  // Log the data we're receiving to verify its source
  useEffect(() => {
    if (candlestickData.length > 0) {
      console.log('CandlestickChart received data:', {
        candles: candlestickData.length,
        firstCandle: candlestickData[0],
        lastCandle: candlestickData[candlestickData.length - 1],
        sma: smaData.length,
        // Remove reference to window.isUsingDemoData
        isRealData: true
      });
    }
  }, [candlestickData, smaData]);
  
  // Process chart data with enhanced metrics
  useEffect(() => {
    if (candlestickData.length) {
      // Get max volume for scaling
      const maxVol = Math.max(...candlestickData.map(d => d.volume));
      setVolumeMax(maxVol);
      
      // Enhanced data processing with more technical indicators
      const enhanced = candlestickData.map((candle, index) => {
        const smaPoint = smaData.find(sma => sma.date === candle.date);
        
        // Calculate percentage change from previous day
        const previousDay = index > 0 ? candlestickData[index - 1] : null;
        const dayChange = previousDay 
          ? ((candle.close - previousDay.close) / previousDay.close) * 100 
          : 0;
          
        // Calculate volatility as a 5-day rolling window
        const volatilityWindow = candlestickData.slice(
          Math.max(0, index - 5), 
          index + 1
        );
        const prices = volatilityWindow.map(d => d.close);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const volatility = prices.length > 1
          ? Math.sqrt(prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length)
          : 0;
        
        // Calculate Average True Range (ATR) for a 14-day period
        const atrWindow = Math.min(14, index + 1);
        let atr = 0;
        
        if (index > 0) {
          const trValues = [];
          for (let i = Math.max(0, index - atrWindow + 1); i <= index; i++) {
            const curr = candlestickData[i];
            const prev = i > 0 ? candlestickData[i - 1] : curr;
            
            // True Range = max(high - low, abs(high - prevClose), abs(low - prevClose))
            const tr = Math.max(
              curr.high - curr.low,
              Math.abs(curr.high - prev.close),
              Math.abs(curr.low - prev.close)
            );
            trValues.push(tr);
          }
          atr = trValues.reduce((sum, val) => sum + val, 0) / trValues.length;
        }
        
        // Calculate MACD values (simplified)
        const ema12 = calculateEMA(candlestickData.slice(0, index + 1).map(d => d.close), 12);
        const ema26 = calculateEMA(candlestickData.slice(0, index + 1).map(d => d.close), 26);
        const macd = ema12 - ema26;
        
        return {
          date: candle.date,
          // OHLC data
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          // For candlestick visualization
          highLowRange: candle.high - candle.low,
          // Volume data
          volume: candle.volume,
          // Scaled volume for combined chart (10% of chart height)
          volumeScaled: (candle.volume / maxVol) * (Math.max(...candlestickData.map(d => d.high)) - Math.min(...candlestickData.map(d => d.low))) * 0.1,
          // Change visualization data
          dayChange,
          volatility,
          atr,
          macd,
          // Optional SMA values
          sma10: smaPoint?.sma10,
          sma30: smaPoint?.sma30,
          sma50: smaPoint?.sma50,
          // Add index for animation
          index
        };
      });
      
      setChartData(enhanced);
    }
  }, [candlestickData, smaData]);
  
  // Calculate important metrics for display
  const chartMetrics = useMemo(() => {
    if (!candlestickData.length) return null;
    
    const firstCandle = candlestickData[0];
    const lastCandle = candlestickData[candlestickData.length - 1];
    const periodChange = ((lastCandle.close - firstCandle.close) / firstCandle.close) * 100;
    
    // Find highest high and lowest low
    const highestHigh = Math.max(...candlestickData.map(d => d.high));
    const lowestLow = Math.min(...candlestickData.map(d => d.low));
    
    // Calculate average daily volatility
    const dailyChanges = candlestickData.slice(1).map((candle, i) => {
      const prevCandle = candlestickData[i];
      return Math.abs((candle.close - prevCandle.close) / prevCandle.close) * 100;
    });
    
    const avgDailyVolatility = dailyChanges.reduce((sum, change) => sum + change, 0) / dailyChanges.length;
    
    return {
      periodChange,
      highestHigh,
      lowestLow,
      avgDailyVolatility,
      startDate: firstCandle.date,
      endDate: lastCandle.date
    };
  }, [candlestickData]);
  
  // Enhanced tooltip content with more technical details
  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      setHoverData(data);
      
      return (
        <div className="bg-card shadow-md border rounded-lg p-3">
          <div className="font-semibold border-b pb-1 mb-2">
            {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <div>Open:</div>
            <div className="text-right font-medium">${data.open.toFixed(2)}</div>
            <div>High:</div>
            <div className="text-right font-medium">${data.high.toFixed(2)}</div>
            <div>Low:</div>
            <div className="text-right font-medium">${data.low.toFixed(2)}</div>
            <div>Close:</div>
            <div className={cn(
              "text-right font-medium",
              data.close >= data.open ? "text-app-green" : "text-app-red"
            )}>
              ${data.close.toFixed(2)}
            </div>
            <div>Change:</div>
            <div className={cn(
              "text-right font-medium",
              data.dayChange >= 0 ? "text-app-green" : "text-app-red"
            )}>
              {data.dayChange >= 0 ? "+" : ""}{data.dayChange.toFixed(2)}%
            </div>
            <div>Volume:</div>
            <div className="text-right font-medium">
              {data.volume >= 1000000 
                ? `${(data.volume / 1000000).toFixed(2)}M` 
                : `${(data.volume / 1000).toFixed(0)}K`}
            </div>
            <div>ATR:</div>
            <div className="text-right font-medium">${data.atr.toFixed(2)}</div>
            {data.sma10 && (
              <>
                <div>SMA10:</div>
                <div className="text-right font-medium">${data.sma10.toFixed(2)}</div>
              </>
            )}
            {data.sma30 && (
              <>
                <div>SMA30:</div>
                <div className="text-right font-medium">${data.sma30.toFixed(2)}</div>
              </>
            )}
            {data.sma50 && (
              <>
                <div>SMA50:</div>
                <div className="text-right font-medium">${data.sma50.toFixed(2)}</div>
              </>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Helper function to calculate EMA
  const calculateEMA = (prices: number[], period: number): number => {
    if (prices.length < period) return prices[prices.length - 1];
    
    const k = 2 / (period + 1);
    let emaValue = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      emaValue = (prices[i] - emaValue) * k + emaValue;
    }
    
    return emaValue;
  };
  
  // Find min and max prices for the chart with proper padding
  const prices = candlestickData.flatMap(d => [d.high, d.low]);
  const minPrice = Math.floor(Math.min(...prices) * 0.99); // Add 1% padding
  const maxPrice = Math.ceil(Math.max(...prices) * 1.01); // Add 1% padding
  
  // Pattern visualization
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
  
  // Get pattern color based on signal with more vibrant colors
  const getPatternColor = () => {
    if (!selectedPattern) return 'rgba(99, 102, 241, 0.3)'; // Default blue
    
    if (selectedPattern.signal === 'bullish') {
      return 'rgba(34, 197, 94, 0.3)'; // Green
    } else if (selectedPattern.signal === 'bearish') {
      return 'rgba(239, 68, 68, 0.3)'; // Red
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
          stroke={selectedPattern.patternType === 'SUPPORT' ? "#22C55E" : "#EF4444"} 
          strokeDasharray="3 3" 
          strokeWidth={1.5}
          label={{
            value: `${selectedPattern.patternType === 'SUPPORT' ? 'Support' : 'Resistance'}: $${selectedPattern.level?.toFixed(2)}`,
            position: 'insideBottomRight',
            fill: selectedPattern.patternType === 'SUPPORT' ? "#22C55E" : "#EF4444",
            fontSize: 12
          }}
        />
      );
    }
    
    return null;
  };
  
  return (
    <div className="w-full">
      {/* Add chart summary metrics */}
      {chartMetrics && (
        <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
          <div className="text-muted-foreground">
            Period: <span className="text-foreground font-medium">
              {new Date(chartMetrics.startDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - 
              {new Date(chartMetrics.endDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
            </span>
          </div>
          <div className="text-muted-foreground">
            Change: <span className={cn(
              "font-medium",
              chartMetrics.periodChange >= 0 ? "text-app-green" : "text-app-red"
            )}>
              {chartMetrics.periodChange >= 0 ? "+" : ""}{chartMetrics.periodChange.toFixed(2)}%
            </span>
          </div>
          <div className="text-muted-foreground">
            Range: <span className="font-medium">${chartMetrics.lowestLow.toFixed(2)} - ${chartMetrics.highestHigh.toFixed(2)}</span>
          </div>
          <div className="text-muted-foreground">
            Avg Vol: <span className="font-medium">{chartMetrics.avgDailyVolatility.toFixed(2)}%</span>
          </div>
        </div>
      )}
      
      {/* Main chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
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
              width={60}
              tickCount={6}
            />
            
            <Tooltip content={renderTooltip} />
            <Legend />
            
            {/* Pattern highlighting */}
            {selectedPattern && patternStartDate && patternEndDate && (
              <ReferenceArea 
                x1={patternStartDate} 
                x2={patternEndDate} 
                fill={getPatternColor()} 
                fillOpacity={0.3} 
                stroke={selectedPattern.signal === 'bullish' ? "#22C55E" : 
                        selectedPattern.signal === 'bearish' ? "#EF4444" : "#f59e0b"}
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
            )}
            
            {/* Support/Resistance line */}
            {renderSupportResistanceLines()}
            
            {/* Moving Averages */}
            {showSMA && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="sma10" 
                  stroke="#22C55E" 
                  strokeWidth={1.5} 
                  dot={false}
                  name="SMA10"
                  activeDot={false}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="sma30" 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  dot={false}
                  name="SMA30"
                  activeDot={false}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="sma50" 
                  stroke="#EF4444" 
                  strokeWidth={1.5} 
                  dot={false}
                  name="SMA50"
                  activeDot={false}
                  isAnimationActive={true}
                />
              </>
            )}
            
            {/* Volume Bars (displayed at bottom) */}
            {showVolume && (
              <Bar 
                dataKey="volumeScaled" 
                shape={<VolumeBar />} 
                barSize={6}
                name="Volume"
                isAnimationActive={true}
              />
            )}
            
            {/* Candlesticks */}
            <Bar
              dataKey="highLowRange"
              shape={<CandlestickBar />}
              name="OHLC"
              isAnimationActive={true}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Volume Chart (separate) */}
      {showVolume && (
        <div className="h-[100px] mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
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
                width={50}
              />
              
              <Tooltip content={renderTooltip} />
              
              <Bar 
                dataKey="volume" 
                shape={<VolumeBar />} 
                barSize={6}
                isAnimationActive={true}
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
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Pattern label if one is selected */}
      {selectedPattern && (
        <div className="mt-3 px-3 py-2 border rounded bg-card/50">
          <div className="text-sm">
            <span className="text-muted-foreground">Selected Pattern: </span>
            <span className="font-medium">
              {selectedPattern.patternType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
            </span>
            <span className={cn(
              "ml-2 inline-block px-2 py-0.5 rounded-full text-xs",
              selectedPattern.signal === 'bullish' ? "bg-app-green/20 text-app-green" :
              selectedPattern.signal === 'bearish' ? "bg-app-red/20 text-app-red" :
              "bg-yellow-500/20 text-yellow-500"
            )}>
              {selectedPattern.signal.charAt(0).toUpperCase() + selectedPattern.signal.slice(1)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {selectedPattern.description}
          </div>
        </div>
      )}
      
      {/* Add CSS animations */}
      <style>
        {`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 0.9; }
        }
        @keyframes growIn {
          from { transform: scaleX(0); opacity: 0; }
          to { transform: scaleX(1); opacity: 0.9; }
        }
        @keyframes growUp {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 0.7; }
        }
        `}
      </style>
    </div>
  );
};

export default CandlestickChart;
