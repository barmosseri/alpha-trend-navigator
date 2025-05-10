
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { CandlestickData, SMAData, PatternResult } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CalendarRange } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils";

interface CandlestickChartProps {
  candlestickData: CandlestickData[];
  smaData?: SMAData[];
  patterns?: PatternResult[];
  selectedPattern?: PatternResult | null;
  onPatternSelect?: (pattern: PatternResult | null) => void;
  showSMA?: boolean; // Added prop
  showVolume?: boolean; // Added prop
}

// Helper function declaration moved up before its use
const get3MonthsAgo = (): Date => {
  const now = new Date();
  now.setMonth(now.getMonth() - 3);
  return now;
};

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candlestickData,
  smaData,
  patterns,
  selectedPattern,
  onPatternSelect,
  showSMA = true, // Default value
  showVolume = true, // Default value
}) => {
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const chartRef = useRef<any>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: get3MonthsAgo(),
    to: new Date(),
  })
  const [filteredData, setFilteredData] = useState<CandlestickData[]>([]);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const filtered = candlestickData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(candlestickData);
    }
  }, [candlestickData, dateRange]);

  const handleZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.zoom({ x: [0, 100] });
    }
  }, []);

  const handleTooltip = (content: string | null) => {
    setTooltipContent(content);
  };

  const getSMAValue = (date: string, smaType: 'sma10' | 'sma30' | 'sma50'): number | undefined => {
    if (!smaData) return undefined;
    const dataPoint = smaData.find(item => item.date === date);
    return dataPoint ? dataPoint[smaType] : undefined;
  };

  const renderTooltipContent = (o: any) => {
    if (o && o.payload && o.payload.length > 0) {
      const data = o.payload[0].payload;
      const sma10 = getSMAValue(data.date, 'sma10');
      const sma30 = getSMAValue(data.date, 'sma30');
      const sma50 = getSMAValue(data.date, 'sma50');

      return (
        <div className="p-2 bg-white border border-gray-300 rounded-md shadow-md">
          <p className="font-bold text-gray-800">{format(new Date(data.date), 'MMM dd, yyyy')}</p>
          <p className="text-gray-700">Open: {data.open.toFixed(2)}</p>
          <p className="text-gray-700">High: {data.high.toFixed(2)}</p>
          <p className="text-gray-700">Low: {data.low.toFixed(2)}</p>
          <p className="text-gray-700">Close: {data.close.toFixed(2)}</p>
          <p className="text-gray-700">Volume: {data.volume}</p>
          {sma10 !== undefined && <p className="text-blue-500">SMA10: {sma10.toFixed(2)}</p>}
          {sma30 !== undefined && <p className="text-green-500">SMA30: {sma30.toFixed(2)}</p>}
          {sma50 !== undefined && <p className="text-red-500">SMA50: {sma50.toFixed(2)}</p>}
        </div>
      );
    }

    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderChart = () => {
    if (!filteredData || filteredData.length === 0) {
      return <div className="text-center py-4">No data available for the selected date range.</div>;
    }

    const renderBrush = () => {
      return (
        <ReferenceArea
          y1={0}
          y2={150000}
          x1={formatDate(filteredData[0].date)}
          x2={formatDate(filteredData[filteredData.length - 1].date)}
          stroke="rgba(102, 51, 153, 0.3)"
          strokeOpacity={0.3}
        />
      );
    };

    const combinedData = filteredData.map(item => {
      const sma10Value = getSMAValue(item.date, 'sma10');
      const sma30Value = getSMAValue(item.date, 'sma30');
      const sma50Value = getSMAValue(item.date, 'sma50');

      return {
        ...item,
        sma10: sma10Value,
        sma30: sma30Value,
        sma50: sma50Value,
      };
    });

    return (
      <>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={combinedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(new Date(date), 'MMM dd')}
              interval="preserveStartEnd"
            />
            <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip content={renderTooltipContent} />
            <Legend />
            {showVolume && <Bar dataKey="volume" barSize={5} fill="#413ea0" />}
            {showSMA && (
              <>
                <Line type="monotone" dataKey="sma10" stroke="#8884d8" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="sma30" stroke="#82ca9d" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="sma50" stroke="#e45649" strokeWidth={1.5} dot={false} />
              </>
            )}
            {filteredData.map((entry, index) => (
              <ReferenceArea
                key={`area-${index}`}
                x1={entry.date}
                x2={entry.date}
                stroke="rgba(255, 0, 0, 0.1)"
                strokeOpacity={0.3}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={80}>
          <ComposedChart
            data={smaData}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(new Date(date), 'MMM dd')}
              interval="preserveStartEnd"
            />
            <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip content={renderTooltipContent} />
            <Legend />
            <Line type="monotone" dataKey="sma10" stroke="#8884d8" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="sma30" stroke="#82ca9d" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="sma50" stroke="#e45649" strokeWidth={1.5} dot={false} />
            {smaData && smaData.length > 0 && renderBrush()}
          </ComposedChart>
        </ResponsiveContainer>
      </>
    );
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarRange className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM d, yyyy")} -{" "}
                    {format(dateRange.to, "MMM d, yyyy")}
                  </>
                ) : (
                  format(dateRange.from, "MMM d, yyyy")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" side="bottom">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      {renderChart()}
      <style>
        {`
        .recharts-tooltip-item-name {
          font-weight: bold;
        }
        .recharts-tooltip-item-value {
          font-style: italic;
        }
      `}
      </style>
    </div>
  );
};

export default CandlestickChart;
