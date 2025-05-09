import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnChainData } from '@/lib/types';
import { 
  BarChart, 
  ResponsiveContainer, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  Line,
  LineChart,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  BarChart3, 
  Network, 
  Wallet, 
  Hash, 
  Layers, 
  Clock,
  TrendingUp,
  TrendingDown,
  CircleDollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnChainAnalyticsProps {
  symbol: string;
  onChainData: OnChainData;
  historicalData?: {
    date: string;
    activeAddresses?: number;
    transactionCount?: number;
    difficulty?: number;
    fees?: number;
  }[];
}

const OnChainAnalytics: React.FC<OnChainAnalyticsProps> = ({
  symbol,
  onChainData,
  historicalData = []
}) => {
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return 'N/A';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toFixed(2);
    }
  };
  
  const formatHashRate = (hashRate: number | undefined): string => {
    if (hashRate === undefined) return 'N/A';
    
    if (hashRate >= 1000000000000000) {
      return (hashRate / 1000000000000000).toFixed(2) + ' EH/s';
    } else if (hashRate >= 1000000000000) {
      return (hashRate / 1000000000000).toFixed(2) + ' TH/s';
    } else if (hashRate >= 1000000000) {
      return (hashRate / 1000000000).toFixed(2) + ' GH/s';
    } else if (hashRate >= 1000000) {
      return (hashRate / 1000000).toFixed(2) + ' MH/s';
    } else {
      return hashRate.toFixed(2) + ' H/s';
    }
  };
  
  // For demo purposes, generate some mock historical data if none provided
  const ensureHistoricalData = () => {
    if (historicalData && historicalData.length > 0) return historicalData;
    
    // Generate mock data for the last 30 days
    const mockData = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const baseActiveAddresses = onChainData.activeAddresses || 500000;
      const baseTxCount = onChainData.transactionCount || 300000;
      const baseDifficulty = onChainData.difficulty || 25000000000000;
      const baseFees = onChainData.fees || 2.5;
      
      // Add some randomness to make the charts interesting
      const randomFactor = 0.8 + (Math.random() * 0.4);
      const trend = i > 15 ? (i / 30) : ((30 - i) / 30); // Create a V shape trend
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        activeAddresses: Math.round(baseActiveAddresses * randomFactor * trend),
        transactionCount: Math.round(baseTxCount * randomFactor * trend),
        difficulty: Math.round(baseDifficulty * (1 + (i / 100))), // Steadily increasing
        fees: baseFees * randomFactor * (i < 5 ? 1.5 : 1) // Spike in recent days
      });
    }
    
    return mockData;
  };
  
  const finalHistoricalData = ensureHistoricalData();
  
  // Calculate 7-day trends
  const calculateTrend = (dataKey: keyof typeof finalHistoricalData[0]): { value: number, increasing: boolean } => {
    if (finalHistoricalData.length < 8) {
      return { value: 0, increasing: false };
    }
    
    const recent = finalHistoricalData.slice(-7);
    const lastWeek = finalHistoricalData.slice(-14, -7);
    
    // Calculate averages
    const recentSum = recent.reduce((sum, item) => {
      const val = item[dataKey];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
    
    const lastWeekSum = lastWeek.reduce((sum, item) => {
      const val = item[dataKey];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
    
    const recentAvg = recentSum / recent.length;
    const lastWeekAvg = lastWeekSum / lastWeek.length;
    
    // Calculate percentage change
    const percentChange = ((recentAvg - lastWeekAvg) / lastWeekAvg) * 100;
    
    return {
      value: Math.abs(percentChange),
      increasing: percentChange > 0
    };
  };
  
  const addressesTrend = calculateTrend('activeAddresses');
  const transactionsTrend = calculateTrend('transactionCount');
  const difficultyTrend = calculateTrend('difficulty');
  const feesTrend = calculateTrend('fees');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>On-Chain Analytics for {symbol}</CardTitle>
        <CardDescription>
          Real-time blockchain data and network metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs text-muted-foreground">Active Addresses</div>
              <Wallet className="h-4 w-4 text-app-blue" />
            </div>
            <div className="text-lg font-medium">
              {formatNumber(onChainData.activeAddresses)}
            </div>
            <div className={cn(
              "flex items-center text-xs mt-1",
              addressesTrend.increasing ? "text-app-green" : "text-app-red"
            )}>
              {addressesTrend.increasing ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {addressesTrend.value.toFixed(1)}% in 7d
            </div>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs text-muted-foreground">Daily Transactions</div>
              <Activity className="h-4 w-4 text-app-blue" />
            </div>
            <div className="text-lg font-medium">
              {formatNumber(onChainData.transactionCount)}
            </div>
            <div className={cn(
              "flex items-center text-xs mt-1",
              transactionsTrend.increasing ? "text-app-green" : "text-app-red"
            )}>
              {transactionsTrend.increasing ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {transactionsTrend.value.toFixed(1)}% in 7d
            </div>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs text-muted-foreground">Network Hashrate</div>
              <Hash className="h-4 w-4 text-app-blue" />
            </div>
            <div className="text-lg font-medium">
              {formatHashRate(onChainData.networkHashRate)}
            </div>
            <div className={cn(
              "flex items-center text-xs mt-1",
              difficultyTrend.increasing ? "text-app-green" : "text-app-red"
            )}>
              {difficultyTrend.increasing ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {difficultyTrend.value.toFixed(1)}% in 7d
            </div>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs text-muted-foreground">Average Fee</div>
              <CircleDollarSign className="h-4 w-4 text-app-blue" />
            </div>
            <div className="text-lg font-medium">
              ${formatNumber(onChainData.fees)}
            </div>
            <div className={cn(
              "flex items-center text-xs mt-1",
              feesTrend.increasing ? "text-app-red" : "text-app-green" // Note: increasing fees is negative
            )}>
              {feesTrend.increasing ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {feesTrend.value.toFixed(1)}% in 7d
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="activity">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="activity">Network Activity</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="mining">Mining Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={finalHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#8E9196"
                    tick={{ fill: '#8E9196' }}
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis 
                    stroke="#8E9196"
                    tick={{ fill: '#8E9196' }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatNumber(value), 'Active Addresses']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="activeAddresses" 
                    name="Active Addresses"
                    stroke="#6366F1" 
                    strokeWidth={2}
                    dot={false} 
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm">
              <p>
                {addressesTrend.increasing ? 'Increasing' : 'Decreasing'} network activity suggests 
                {addressesTrend.increasing ? ' growing adoption and interest in ' : ' reduced engagement with '}
                {symbol}. {
                  addressesTrend.increasing && transactionsTrend.increasing
                    ? 'Both address activity and transaction volume are up, indicating healthy network growth.'
                    : !addressesTrend.increasing && !transactionsTrend.increasing
                    ? 'Both address activity and transaction volume are down, which could indicate reduced network usage.'
                    : 'Address activity and transaction volume are showing different trends, suggesting changing usage patterns.'
                }
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="transactions">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finalHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#8E9196"
                    tick={{ fill: '#8E9196' }}
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis 
                    stroke="#8E9196"
                    tick={{ fill: '#8E9196' }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatNumber(value), 'Daily Transactions']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="transactionCount" 
                    name="Transactions" 
                    fill="#33b894" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm">
              <p>
                {transactionsTrend.increasing 
                  ? 'Transaction volume is growing, which typically indicates higher network usage and potential price activity.' 
                  : 'Transaction volume is declining, which may indicate lower network usage or market consolidation.'}
                {' '}
                {feesTrend.increasing
                  ? 'Rising transaction fees could indicate network congestion or increased demand for block space.'
                  : 'Decreasing transaction fees suggest the network has capacity for more activity.'}
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="mining">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={finalHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#8E9196"
                    tick={{ fill: '#8E9196' }}
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis 
                    stroke="#8E9196"
                    tick={{ fill: '#8E9196' }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatNumber(value), 'Mining Difficulty']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="difficulty" 
                    name="Mining Difficulty" 
                    stroke="#EA384C" 
                    fill="#EA384C33"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm">
              <p>
                Mining difficulty {difficultyTrend.increasing ? 'continues to increase' : 'has decreased recently'}, 
                which {difficultyTrend.increasing ? 'indicates growing hash power being added to the network' : 'may indicate miners reducing operations'}.
                {' '}
                {difficultyTrend.increasing 
                  ? 'Higher difficulty typically means the network is more secure but may require more resources for mining.' 
                  : 'Lower difficulty can lead to more profitable mining operations in the short term.'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OnChainAnalytics; 