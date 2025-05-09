import React, { useState, useEffect } from 'react';
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

// Custom candlestick renderer component
const CandlestickBar = (props: any) => {
  const { x, y, width, height, open, close, low, high } = props;
  
  const isIncreasing = close > open;
  const color = isIncreasing ? "#33B894" : "#EA384C"; // Green for increasing, Red for decreasing
  
  const bodyHeight = Math.abs(y - (isIncreasing ? open : close));
  const bodyY = isIncreasing ? y : y - bodyHeight;
  
  const wickY1 = Math.min(y - open, y - close);
  const wickY2 = Math.max(y - open, y - close);
  const wickHeight1 = wickY1 - (y - high);
  const wickHeight2 = (y - low) - wickY2;
  
  // Calculate body width based on chart (can be dynamically adjusted)
  const bodyWidth = width * 0.8;
  const bodyX = x + (width - bodyWidth) / 2;

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
      />
      
      {/* Lower wick */}
      <line 
        x1={x + width / 2} 
        y1={wickY2} 
        x2={x + width / 2} 
        y2={y - low} 
        stroke={color} 
        strokeWidth={1} 
      />
      
      {/* Candle body */}
      <rect
        x={bodyX}
        y={bodyY}
        width={bodyWidth}
        height={bodyHeight || 1} // Ensure height is at least 1px for flat candles
        fill={isIncreasing ? color : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

// Volume bar renderer component
const VolumeBar = (props: any) => {
  const { x, y, width, height, open, close } = props;
  
  const isIncreasing = close >= open;
  const color = isIncreasing ? "rgba(51, 184, 148, 0.7)" : "rgba(234, 56, 76, 0.7)"; // Green for up, Red for down
  
  return (
    <Rectangle
      x={x}
      y={y}
      width={width * 0.8}
      height={height}
      fill={color}
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
  
  // Log the data we're receiving to check if it's real or mock
  useEffect(() => {
    console.log('CandlestickChart received data:', {
      candles: candlestickData.length,
      firstCandle: candlestickData[0],
      lastCandle: candlestickData[candlestickData.length - 1],
      sma: smaData.length
    });
  }, [candlestickData, smaData]);
  
  useEffect(() => {
    // Process the data for better visualization
    if (candlestickData.length) {
      // Get max volume for scaling
      const maxVol = Math.max(...candlestickData.map(d => d.volume));
      setVolumeMax(maxVol);
      
      // Enhanced data processing
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
          // OHLC data
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          // For candlestick visualization
          highLowRange: candle.high - candle.low,
          // Volume data
          volume: candle.volume,
          // Scaled volume for combined chart (15% of chart height)
          volumeScaled: (candle.volume / maxVol) * (Math.max(...candlestickData.map(d => d.high)) - Math.min(...candlestickData.map(d => d.low))) * 0.15,
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
                stroke={selectedPattern.signal === 'bullish' ? "#33b894" : 
                        selectedPattern.signal === 'bearish' ? "#EA384C" : "#f59e0b"}
                strokeDasharray="3 3"
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
                  stroke="#33b894" 
                  strokeWidth={1.5} 
                  dot={false}
                  name="SMA10"
                  activeDot={false}
                  animationDuration={1000}
                />
                <Line 
                  type="monotone" 
                  dataKey="sma30" 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  dot={false}
                  name="SMA30"
                  activeDot={false}
                  animationDuration={1000}
                />
                <Line 
                  type="monotone" 
                  dataKey="sma50" 
                  stroke="#EA384C" 
                  strokeWidth={1.5} 
                  dot={false}
                  name="SMA50"
                  activeDot={false}
                  animationDuration={1000}
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
              />
            )}
            
            {/* Candlesticks */}
            <Bar
              dataKey="highLowRange"
              shape={<CandlestickBar />}
              name="OHLC"
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
                width={40}
              />
              
              <Tooltip content={renderTooltip} />
              
              <Bar 
                dataKey="volume" 
                shape={<VolumeBar />} 
                barSize={6}
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

