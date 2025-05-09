
import React, { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Line,
  Legend,
  ReferenceLine,
  Label
} from 'recharts';
import { CandlestickData, SMAData } from '@/lib/types';

interface CandlestickChartProps {
  candlestickData: CandlestickData[];
  smaData?: SMAData[];
  showVolume?: boolean;
  showSMA?: boolean;
}

interface CombinedData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume?: number;
  sma10?: number;
  sma20?: number;
  sma50?: number;
  isRealTime?: boolean;
}

const CandlestickChart = ({
  candlestickData,
  smaData,
  showVolume = true,
  showSMA = true,
}: CandlestickChartProps) => {
  const [combinedData, setCombinedData] = useState<CombinedData[]>([]);
  const [dataRange, setDataRange] = useState<{min: number, max: number}>({min: 0, max: 0});
  
  useEffect(() => {
    if (!candlestickData.length) return;
    
    // Create combined dataset
    const combined = candlestickData.map((candle, index) => {
      const matchingSMA = smaData?.find(sma => sma.date === candle.date);
      
      // Mark the most recent data points as real-time
      const isRealTime = index > candlestickData.length - 5;
      
      return {
        date: candle.date,
        open: candle.open,
        close: candle.close,
        high: candle.high,
        low: candle.low,
        volume: showVolume ? candle.volume : undefined,
        sma10: showSMA && matchingSMA ? matchingSMA.sma10 : undefined,
        // Use sma20 instead of sma30 to match the image
        sma20: showSMA && matchingSMA ? matchingSMA.sma30 : undefined,
        sma50: showSMA && matchingSMA ? matchingSMA.sma50 : undefined,
        isRealTime,
      };
    });
    
    // Find min and max values for better domain scaling
    const lows = candlestickData.map(d => d.low);
    const highs = candlestickData.map(d => d.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    
    // Calculate rounded values for better visual representation
    const range = max - min;
    const step = Math.pow(10, Math.floor(Math.log10(range)));
    const roundedMin = Math.floor(min / step) * step;
    const roundedMax = Math.ceil(max / step) * step;
    
    setDataRange({min: roundedMin, max: roundedMax});
    setCombinedData(combined);
  }, [candlestickData, smaData, showVolume, showSMA]);
  
  // Custom tooltip formatter
  const formatTooltip = (value: number) => {
    return `$${value.toFixed(2)}`;
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };
  
  // Format the domain for Y-axis based on data range
  const formatYAxis = (): [number, number] => {
    if (!dataRange.min || !dataRange.max) return [0, 100];
    
    const range = dataRange.max - dataRange.min;
    const padding = range * 0.1;
    return [dataRange.min - padding, dataRange.max + padding];
  };
  
  // Find significant price levels (support/resistance) for horizontal lines
  const findKeyLevels = (): number[] => {
    if (combinedData.length < 30 || !dataRange.max || !dataRange.min) return [];
    
    const range = dataRange.max - dataRange.min;
    const step = range / 4;
    
    // Create evenly spaced levels
    return [
      dataRange.min + step,
      dataRange.min + step * 2,
      dataRange.min + step * 3
    ];
  };
  
  const keyLevels = findKeyLevels();

  // Custom renderer for candlestick bars
  const renderCandlestickBar = (props: any) => {
    const { x, y, width, height, open, close, isRealTime } = props;
    
    const isRising = close >= open;
    const color = isRising ? "#33b894" : "#ea384c"; // Using green/red from the image
    const className = isRising ? "up" : "down";
    
    // Add a subtle glow effect to real-time data
    const filter = isRealTime ? "drop-shadow(0 0 2px rgba(255,255,255,0.7))" : "none";
    
    return (
      <g style={{ filter }}>
        <line
          x1={x + width / 2}
          y1={y}
          x2={x + width / 2}
          y2={y + height}
          stroke={color}
          strokeWidth={1}
          className={className}
        />
        <rect
          x={x}
          y={isRising ? y + height * (1 - (close - open) / (close - open)) : y}
          width={width}
          height={Math.max(1, Math.abs(height * (close - open) / (close - open)))}
          fill={color}
          stroke={color}
          className={className}
        />
      </g>
    );
  };

  return (
    <div className="w-full flex flex-col">
      {/* Main Price Chart */}
      <div className="h-[350px] bg-[#1A1F2C] mb-1 rounded-t-lg">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              minTickGap={50}
              stroke="#8E9196"
              tick={{ fill: '#8E9196' }}
              axisLine={{ stroke: '#333' }}
              hide={true}
            />
            <YAxis 
              yAxisId="price" 
              domain={formatYAxis}
              tickFormatter={formatTooltip}
              orientation="right"
              stroke="#8E9196"
              tick={{ fill: '#8E9196' }}
              axisLine={{ stroke: '#333' }}
            />
            <Tooltip
              formatter={formatTooltip}
              labelFormatter={(label) => `Date: ${formatDate(label.toString())}`}
              contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', color: '#fff' }}
              labelStyle={{ color: '#8E9196' }}
            />
            
            {/* Support/Resistance Lines */}
            {keyLevels.map((level, index) => (
              <ReferenceLine 
                key={`level-${index}`}
                y={level} 
                yAxisId="price"
                stroke="#38775F" 
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
            ))}
            
            {/* Candlestick Data */}
            <Bar
              dataKey="high"
              yAxisId="price"
              shape={renderCandlestickBar}
              name="Price"
            />
            
            {/* SMA Lines */}
            {showSMA && (
              <>
                <Line
                  type="monotone"
                  dataKey="sma10"
                  yAxisId="price"
                  stroke="#e91e63" // Pink line for SMA10
                  dot={false}
                  name="SMA(10)"
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="sma20"
                  yAxisId="price"
                  stroke="#FFFFFF" // White line for SMA20 (previously SMA30)
                  dot={false}
                  name="SMA(20)"
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="sma50"
                  yAxisId="price"
                  stroke="#ff9800" // Orange line for SMA50
                  dot={false}
                  name="SMA(50)"
                  strokeWidth={1}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Volume Chart Below */}
      {showVolume && (
        <div className="h-[100px] bg-[#1A1F2C] rounded-b-lg">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#8E9196"
                tick={{ fill: '#8E9196' }}
                axisLine={{ stroke: '#333' }}
              />
              <YAxis 
                yAxisId="volume" 
                orientation="right" 
                tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`}
                stroke="#8E9196"
                tick={{ fill: '#8E9196' }}
                axisLine={{ stroke: '#333' }}
              />
              <Tooltip
                formatter={(value: any) => [`${(value / 1000000).toFixed(2)}M`, 'Volume']}
                labelFormatter={(label) => formatDate(label.toString())}
                contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', color: '#fff' }}
                labelStyle={{ color: '#8E9196' }}
              />
              <Legend content={() => (
                <div style={{ color: '#8E9196', textAlign: 'center', padding: '4px', fontSize: '12px' }}>
                  Volume
                </div>
              )} />
              
              {/* Volume Bars */}
              <Bar
                dataKey="volume"
                yAxisId="volume"
                fill="#9b87f5"
                opacity={0.8}
                name="Volume"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CandlestickChart;

