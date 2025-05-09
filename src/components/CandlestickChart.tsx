
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
  Legend
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
  sma30?: number;
  sma50?: number;
}

const CandlestickChart = ({
  candlestickData,
  smaData,
  showVolume = true,
  showSMA = true,
}: CandlestickChartProps) => {
  const [combinedData, setCombinedData] = useState<CombinedData[]>([]);
  
  useEffect(() => {
    if (!candlestickData.length) return;
    
    // Create combined dataset
    const combined = candlestickData.map(candle => {
      const matchingSMA = smaData?.find(sma => sma.date === candle.date);
      
      return {
        date: candle.date,
        open: candle.open,
        close: candle.close,
        high: candle.high,
        low: candle.low,
        volume: showVolume ? candle.volume : undefined,
        sma10: showSMA && matchingSMA ? matchingSMA.sma10 : undefined,
        sma30: showSMA && matchingSMA ? matchingSMA.sma30 : undefined,
        sma50: showSMA && matchingSMA ? matchingSMA.sma50 : undefined,
      };
    });
    
    setCombinedData(combined);
  }, [candlestickData, smaData, showVolume, showSMA]);
  
  // Custom tooltip formatter
  const formatTooltip = (value: number) => {
    return `$${value.toFixed(2)}`;
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const renderCandlestickBar = (props: any) => {
    const { x, y, width, height, open, close } = props;
    
    const isRising = close >= open;
    const color = isRising ? "var(--app-green)" : "var(--app-red)";
    const className = isRising ? "up" : "down";
    
    return (
      <g>
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

  // Format the domain for Y-axis
  const formatYAxis = (domain: [number, number]) => {
    const min = Math.min(...combinedData.map(d => d.low));
    const max = Math.max(...combinedData.map(d => d.high));
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  };

  return (
    <div className="w-full h-[400px] candlestick-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            minTickGap={50}
          />
          <YAxis 
            yAxisId="price" 
            domain={formatYAxis}
            tickFormatter={formatTooltip}
          />
          {showVolume && (
            <YAxis 
              yAxisId="volume" 
              orientation="right" 
              tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`}
            />
          )}
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => `Date: ${formatDate(label.toString())}`}
          />
          <Legend />
          <Bar
            dataKey="high"
            yAxisId="price"
            shape={renderCandlestickBar}
            name="Price"
          />
          {showVolume && (
            <Bar
              dataKey="volume"
              yAxisId="volume"
              fill="#8884d8"
              opacity={0.3}
              name="Volume"
            />
          )}
          {showSMA && (
            <>
              <Line
                type="monotone"
                dataKey="sma10"
                yAxisId="price"
                stroke="#38BDF8"
                dot={false}
                name="SMA 10"
                className="sma10"
              />
              <Line
                type="monotone"
                dataKey="sma30"
                yAxisId="price"
                stroke="#A855F7"
                dot={false}
                name="SMA 30"
                className="sma30"
              />
              <Line
                type="monotone"
                dataKey="sma50"
                yAxisId="price"
                stroke="#F97316"
                dot={false}
                name="SMA 50"
                className="sma50"
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CandlestickChart;
