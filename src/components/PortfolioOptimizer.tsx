import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  PieChart, 
  ResponsiveContainer, 
  Pie, 
  Cell, 
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { PortfolioAsset, Asset } from '@/lib/types';
import { 
  Briefcase, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Shield, 
  DollarSign, 
  Percent, 
  Sliders, 
  ChevronRight,
  Plus,
  Trash2,
  RefreshCw,
  Minus
} from 'lucide-react';

// Mock portfolio data
const mockPortfolio: PortfolioAsset[] = [
  {
    id: 'AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    price: 185.92,
    change: 0.85,
    marketCap: 2900000000000,
    volume: 58000000,
    rating: 8,
    trend: 'RISING',
    analysis: 'Strong technical signals with bullish momentum',
    recommendation: 'BUY',
    quantity: 10,
    totalValue: 1859.20,
    allocationPercentage: 29.5,
    profitLoss: 125.30
  },
  {
    id: 'MSFT',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    type: 'stock',
    price: 415.30,
    change: 1.2,
    marketCap: 3100000000000,
    volume: 22000000,
    rating: 9,
    trend: 'RISING',
    analysis: 'Strong growth potential with solid fundamentals',
    recommendation: 'BUY',
    quantity: 5,
    totalValue: 2076.50,
    allocationPercentage: 33.0,
    profitLoss: 320.50
  },
  {
    id: 'BTC',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    price: 59800.00,
    change: -2.1,
    marketCap: 1200000000000,
    volume: 32000000000,
    rating: 7,
    trend: 'FALLING',
    analysis: 'Temporary pullback in a longer-term bullish trend',
    recommendation: 'HOLD',
    quantity: 0.025,
    totalValue: 1495.00,
    allocationPercentage: 23.8,
    profitLoss: -75.25
  },
  {
    id: 'META',
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    type: 'stock',
    price: 485.20,
    change: -0.5,
    marketCap: 1250000000000,
    volume: 15000000,
    rating: 6,
    trend: 'NEUTRAL',
    analysis: 'Mixed signals with recent earnings beat',
    recommendation: 'HOLD',
    quantity: 2,
    totalValue: 970.40,
    allocationPercentage: 13.7,
    profitLoss: 45.80
  }
];

// Risk profiles
const riskProfiles = [
  { name: 'Conservative', stocksAllocation: 40, cryptoAllocation: 5, bondAllocation: 45, cashAllocation: 10 },
  { name: 'Moderate', stocksAllocation: 55, cryptoAllocation: 15, bondAllocation: 25, cashAllocation: 5 },
  { name: 'Aggressive', stocksAllocation: 70, cryptoAllocation: 25, bondAllocation: 5, cashAllocation: 0 }
];

// Portfolio optimization suggestions
const generateOptimizationSuggestions = (portfolio: PortfolioAsset[], riskProfile: string): {
  asset: PortfolioAsset,
  action: 'increase' | 'decrease' | 'maintain',
  targetAllocation: number,
  currentAllocation: number,
  deltaPercentage: number
}[] => {
  // Get risk profile allocations
  const profile = riskProfiles.find(p => p.name === riskProfile) || riskProfiles[1];
  
  // Calculate current allocations
  const stockAssets = portfolio.filter(asset => asset.type === 'stock');
  const cryptoAssets = portfolio.filter(asset => asset.type === 'crypto');
  
  const totalValue = portfolio.reduce((sum, asset) => sum + asset.totalValue, 0);
  const stocksValue = stockAssets.reduce((sum, asset) => sum + asset.totalValue, 0);
  const cryptoValue = cryptoAssets.reduce((sum, asset) => sum + asset.totalValue, 0);
  
  const currentStocksAllocation = (stocksValue / totalValue) * 100;
  const currentCryptoAllocation = (cryptoValue / totalValue) * 100;
  
  // Calculate target allocation per asset
  const suggestions = portfolio.map(asset => {
    let targetAllocation = 0;
    let action: 'increase' | 'decrease' | 'maintain' = 'maintain';
    
    if (asset.type === 'stock') {
      // Distribute stock allocation based on rating (higher rating = higher allocation)
      const totalStockRating = stockAssets.reduce((sum, a) => sum + a.rating, 0);
      const weightedAllocation = (asset.rating / totalStockRating) * profile.stocksAllocation;
      targetAllocation = weightedAllocation;
      
      // Determine action
      const delta = targetAllocation - asset.allocationPercentage;
      if (delta > 1) {
        action = 'increase';
      } else if (delta < -1) {
        action = 'decrease';
      }
    } else if (asset.type === 'crypto') {
      // Distribute crypto allocation based on rating
      const totalCryptoRating = cryptoAssets.reduce((sum, a) => sum + a.rating, 0);
      const weightedAllocation = (asset.rating / totalCryptoRating) * profile.cryptoAllocation;
      targetAllocation = weightedAllocation;
      
      // Determine action
      const delta = targetAllocation - asset.allocationPercentage;
      if (delta > 1) {
        action = 'increase';
      } else if (delta < -1) {
        action = 'decrease';
      }
    }
    
    return {
      asset,
      action,
      targetAllocation,
      currentAllocation: asset.allocationPercentage,
      deltaPercentage: targetAllocation - asset.allocationPercentage
    };
  });
  
  // Sort by absolute delta (largest changes first)
  return suggestions.sort((a, b) => Math.abs(b.deltaPercentage) - Math.abs(a.deltaPercentage));
};

interface PortfolioOptimizerProps {
  initialAssets?: PortfolioAsset[];
  onAddAsset?: (asset: Asset, quantity: number) => void;
  onRemoveAsset?: (assetId: string) => void;
  onUpdateQuantity?: (assetId: string, quantity: number) => void;
}

const PortfolioOptimizer: React.FC<PortfolioOptimizerProps> = ({
  initialAssets,
  onAddAsset,
  onRemoveAsset,
  onUpdateQuantity
}) => {
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>(initialAssets || mockPortfolio);
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<string>('Moderate');
  const [optimization, setOptimization] = useState<ReturnType<typeof generateOptimizationSuggestions>>([]);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [timeHorizon, setTimeHorizon] = useState<number>(5); // Years
  const [addAssetDialog, setAddAssetDialog] = useState<boolean>(false);
  const [newAssetSymbol, setNewAssetSymbol] = useState<string>('');
  const [newAssetQuantity, setNewAssetQuantity] = useState<number>(0);
  
  // Calculate total portfolio value
  const totalValue = portfolio.reduce((sum, asset) => sum + asset.totalValue, 0);
  
  // Generate pie chart data
  const pieChartData = portfolio.map(asset => ({
    name: asset.symbol,
    value: asset.totalValue,
    type: asset.type
  }));
  
  // Generate bar chart data for suggested vs current allocation
  const allocationChartData = optimization.map(suggestion => ({
    name: suggestion.asset.symbol,
    current: suggestion.currentAllocation,
    target: suggestion.targetAllocation
  }));
  
  // Portfolio risk metrics (mock values)
  const portfolioMetrics = {
    riskScore: selectedRiskProfile === 'Conservative' ? 3.2 : selectedRiskProfile === 'Moderate' ? 5.8 : 8.4,
    expectedReturn: selectedRiskProfile === 'Conservative' ? 6.5 : selectedRiskProfile === 'Moderate' ? 9.2 : 12.8,
    volatility: selectedRiskProfile === 'Conservative' ? 8.4 : selectedRiskProfile === 'Moderate' ? 14.6 : 22.5,
    sharpeRatio: selectedRiskProfile === 'Conservative' ? 0.77 : selectedRiskProfile === 'Moderate' ? 0.63 : 0.57
  };
  
  // Colors for pie chart
  const COLORS = ['#6366F1', '#33b894', '#EA384C', '#F59E0B', '#8B5CF6', '#EC4899'];
  
  // Generate optimization when risk profile changes
  useEffect(() => {
    runOptimization();
  }, [selectedRiskProfile, portfolio]);
  
  const runOptimization = () => {
    setIsOptimizing(true);
    
    // Simulate delay for optimization algorithm
    setTimeout(() => {
      const suggestions = generateOptimizationSuggestions(portfolio, selectedRiskProfile);
      setOptimization(suggestions);
      setIsOptimizing(false);
    }, 500);
  };
  
  const handleRiskProfileChange = (profile: string) => {
    setSelectedRiskProfile(profile);
  };
  
  const handleTimeHorizonChange = (value: number[]) => {
    setTimeHorizon(value[0]);
  };
  
  const handleAddAsset = () => {
    // In a real implementation, we would fetch the asset data
    // For now, just add a mock asset
    if (newAssetSymbol && newAssetQuantity > 0) {
      const mockPrice = Math.random() * 1000 + 50;
      const mockAsset: Asset = {
        id: newAssetSymbol,
        symbol: newAssetSymbol,
        name: `${newAssetSymbol} Corp`,
        type: newAssetSymbol.length <= 4 ? 'stock' : 'crypto',
        price: mockPrice,
        change: (Math.random() * 8) - 4,
        marketCap: mockPrice * 1000000000,
        volume: mockPrice * 10000000,
        rating: Math.floor(Math.random() * 10) + 1,
        trend: Math.random() > 0.5 ? 'RISING' : 'FALLING',
        analysis: 'This is a mock analysis for the newly added asset',
        recommendation: Math.random() > 0.66 ? 'BUY' : Math.random() > 0.33 ? 'HOLD' : 'SELL'
      };
      
      if (onAddAsset) {
        onAddAsset(mockAsset, newAssetQuantity);
      } else {
        // Add to local state if no callback provided
        const totalAssetValue = mockPrice * newAssetQuantity;
        const newTotalValue = totalValue + totalAssetValue;
        
        // Recalculate allocation percentages
        const updatedPortfolio = portfolio.map(asset => ({
          ...asset,
          allocationPercentage: (asset.totalValue / newTotalValue) * 100
        }));
        
        // Add new asset
        const newPortfolioAsset: PortfolioAsset = {
          ...mockAsset,
          quantity: newAssetQuantity,
          totalValue: totalAssetValue,
          allocationPercentage: (totalAssetValue / newTotalValue) * 100,
          profitLoss: 0
        };
        
        setPortfolio([...updatedPortfolio, newPortfolioAsset]);
      }
      
      // Reset form and close dialog
      setNewAssetSymbol('');
      setNewAssetQuantity(0);
      setAddAssetDialog(false);
      
      toast({
        title: "Asset Added",
        description: `Added ${newAssetQuantity} units of ${newAssetSymbol} to your portfolio.`
      });
    }
  };
  
  const handleRemoveAsset = (assetId: string) => {
    if (onRemoveAsset) {
      onRemoveAsset(assetId);
    } else {
      // Remove from local state if no callback provided
      const assetToRemove = portfolio.find(asset => asset.id === assetId);
      if (!assetToRemove) return;
      
      const newTotalValue = totalValue - assetToRemove.totalValue;
      const updatedPortfolio = portfolio
        .filter(asset => asset.id !== assetId)
        .map(asset => ({
          ...asset,
          allocationPercentage: (asset.totalValue / newTotalValue) * 100
        }));
      
      setPortfolio(updatedPortfolio);
      
      toast({
        title: "Asset Removed",
        description: `Removed ${assetToRemove.symbol} from your portfolio.`
      });
    }
  };
  
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5" />
            Portfolio Optimizer
          </CardTitle>
          <Dialog open={addAssetDialog} onOpenChange={setAddAssetDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>
                  Enter the symbol and quantity of the asset you want to add to your portfolio.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="symbol" className="text-right">Symbol</Label>
                  <Input 
                    id="symbol" 
                    value={newAssetSymbol} 
                    onChange={(e) => setNewAssetSymbol(e.target.value.toUpperCase())} 
                    placeholder="AAPL" 
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    value={newAssetQuantity || ''} 
                    onChange={(e) => setNewAssetQuantity(parseFloat(e.target.value))} 
                    placeholder="10" 
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddAssetDialog(false)}>Cancel</Button>
                <Button onClick={handleAddAsset}>Add Asset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          AI-powered portfolio optimization and rebalancing
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Tabs defaultValue="allocation">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="allocation">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Allocation
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <Sliders className="h-4 w-4 mr-2" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="risk">
              <Shield className="h-4 w-4 mr-2" />
              Risk Profile
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="allocation" className="space-y-4">
            <div className="flex flex-col items-center justify-center h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']} 
                    contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3 mt-2">
              {portfolio.map((asset) => (
                <div 
                  key={asset.id}
                  className="flex items-center justify-between px-3 py-2 border rounded-lg"
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "w-2 h-10 rounded-l-sm mr-3",
                      asset.type === 'stock' ? "bg-app-blue" : "bg-app-green"
                    )}/>
                    <div>
                      <div className="font-medium">{asset.symbol}</div>
                      <div className="text-xs text-muted-foreground">{asset.type}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="font-medium">${asset.totalValue.toFixed(2)}</div>
                    <div className="text-xs">{asset.allocationPercentage.toFixed(1)}%</div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveAsset(asset.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="suggestions" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm">Optimization Suggestions</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runOptimization}
                disabled={isOptimizing}
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", isOptimizing && "animate-spin")} />
                Optimize
              </Button>
            </div>
            
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allocationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Allocation']}
                    contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333' }}
                  />
                  <Legend />
                  <Bar dataKey="current" name="Current Allocation" fill="#6366F1" />
                  <Bar dataKey="target" name="Target Allocation" fill="#33b894" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {optimization.map((suggestion, index) => (
                <div 
                  key={suggestion.asset.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center mr-2",
                      suggestion.action === 'increase' ? "bg-app-green/20" : 
                      suggestion.action === 'decrease' ? "bg-app-red/20" : "bg-secondary"
                    )}>
                      {suggestion.action === 'increase' ? (
                        <Plus className="h-4 w-4 text-app-green" />
                      ) : suggestion.action === 'decrease' ? (
                        <Minus className="h-4 w-4 text-app-red" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{suggestion.asset.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {suggestion.action === 'increase' ? 'Increase allocation' :
                         suggestion.action === 'decrease' ? 'Decrease allocation' : 'Maintain allocation'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{suggestion.currentAllocation.toFixed(1)}% → {suggestion.targetAllocation.toFixed(1)}%</div>
                    <div className={cn(
                      "text-xs",
                      suggestion.action === 'increase' ? "text-app-green" :
                      suggestion.action === 'decrease' ? "text-app-red" : "text-muted-foreground"
                    )}>
                      {suggestion.deltaPercentage > 0 ? '+' : ''}{suggestion.deltaPercentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="risk" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Risk Profile</Label>
                <Select value={selectedRiskProfile} onValueChange={handleRiskProfileChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select Risk Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conservative">Conservative</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm">Investment Time Horizon</Label>
                  <span className="text-sm">{timeHorizon} years</span>
                </div>
                <Slider
                  defaultValue={[timeHorizon]}
                  max={30}
                  min={1}
                  step={1}
                  onValueChange={handleTimeHorizonChange}
                />
              </div>
              
              <div className="border rounded-lg p-4 mt-4">
                <div className="text-sm font-medium mb-3">Portfolio Risk Metrics</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Risk Score</div>
                    <div className="flex items-center mt-1">
                      <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full",
                            portfolioMetrics.riskScore < 4 ? "bg-app-green" :
                            portfolioMetrics.riskScore < 7 ? "bg-yellow-500" : "bg-app-red"
                          )}
                          style={{ width: `${(portfolioMetrics.riskScore / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm ml-2">{portfolioMetrics.riskScore.toFixed(1)}/10</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Expected Annual Return</div>
                    <div className="text-sm mt-1 font-medium">{portfolioMetrics.expectedReturn.toFixed(1)}%</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Volatility</div>
                    <div className="text-sm mt-1 font-medium">{portfolioMetrics.volatility.toFixed(1)}%</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                    <div className="text-sm mt-1 font-medium">{portfolioMetrics.sharpeRatio.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-muted-foreground">
                  {selectedRiskProfile === 'Conservative' ? (
                    'Conservative portfolios prioritize capital preservation with modest growth. Lower risk but potentially lower returns.'
                  ) : selectedRiskProfile === 'Moderate' ? (
                    'Moderate portfolios balance growth and stability. Medium risk with moderate return potential.'
                  ) : (
                    'Aggressive portfolios emphasize maximum growth. Higher risk with potentially higher long-term returns.'
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={runOptimization}>
          <Sliders className="h-4 w-4 mr-2" />
          Run Full Portfolio Optimization
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PortfolioOptimizer; 