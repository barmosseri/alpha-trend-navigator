import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  ChevronRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart,
  Bot,
  ArrowUp,
  ArrowDown,
  Sliders,
  PieChart,
  Newspaper,
  Database,
  Brain,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TradingAdvisor from '@/components/TradingAdvisor';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateTechnicalIndicators } from '@/services/mlService';
import { Asset, TechnicalIndicator, CandlestickData } from '@/lib/types';
import { cn } from '@/lib/utils';
import PatternDetectionFeatures from '@/components/PatternDetectionFeatures';
import { combineHistoricalData } from '@/services/patternDetectionService';
import { fetchAssetData } from '@/services/marketData';
import { toast } from '@/components/ui/use-toast';

const Trading = () => {
  const [activeTab, setActiveTab] = useState<string>('ai-advisor');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetChartData, setAssetChartData] = useState<CandlestickData[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [technicalIndicators, setTechnicalIndicators] = useState<TechnicalIndicator[]>([]);
  const navigate = useNavigate();
  
  // Add state for portfolio analysis
  const [isAnalyzingPortfolio, setIsAnalyzingPortfolio] = useState<boolean>(false);
  
  // Load real data instead of mock
  useEffect(() => {
    loadRealAssets();
  }, []);
  
  const loadRealAssets = async () => {
    setIsLoading(true);
    try {
      // Top symbols to fetch (in a real app, this would come from a config or API)
      const topSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'BTC', 'ETH'];
      
      const assetPromises = topSymbols.map(symbol => {
        const isStock = !symbol.includes('BTC') && !symbol.includes('ETH');
        return fetchAssetData(symbol, isStock);
      });
      
      const fetchedAssets = await Promise.all(assetPromises);
      const validAssets = fetchedAssets.filter(asset => asset !== null);
      
      if (validAssets.length === 0) {
        throw new Error('Could not fetch any real asset data');
      }
      
      setAssets(validAssets);
      
      // Initialize with the first asset
      if (validAssets.length > 0) {
        setSelectedAsset(validAssets[0]);
        await loadAssetData(validAssets[0]);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      toast({
        title: "Error",
        description: "Failed to load real asset data. Please check your API keys and connection.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAssetData = async (asset: Asset) => {
    if (!asset) return;
    
    try {
      const isStock = asset.type === 'stock';
      const data = await combineHistoricalData(asset.symbol, isStock);
      
      if (data.length > 0) {
        setAssetChartData(data);
        const indicators = generateTechnicalIndicators(data);
        setTechnicalIndicators(indicators);
      } else {
        throw new Error('No chart data available');
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      toast({
        title: "Error",
        description: "Could not fetch real chart data for " + asset.symbol,
        variant: "destructive"
      });
      setAssetChartData([]);
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRealAssets();
    setIsRefreshing(false);
  };
  
  const handleViewAsset = (id: string) => {
    navigate(`/asset/${id}`);
  };
  
  // Handle selecting an asset for pattern detection
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    loadAssetData(asset);
  };
  
  // Add portfolio analysis function
  const runPortfolioAnalysis = async () => {
    setIsAnalyzingPortfolio(true);
    
    try {
      // First gather data for all assets in the watchlist/portfolio
      const portfolioData = [];
      
      // Show toast for starting the analysis
      toast({
        title: "Analysis Started",
        description: "AI is analyzing your portfolio composition and market conditions...",
      });
      
      // Simulate each step of the analysis with delays to show progress
      // Step 1: Asset correlation analysis
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 2: Risk assessment
      toast({
        title: "Risk Assessment",
        description: "Analyzing volatility patterns and diversification metrics...",
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Optimization calculation
      toast({
        title: "Optimization",
        description: "Calculating optimal asset allocation based on risk profile...",
      });
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Final success notification
      toast({
        title: "Portfolio Analysis Complete",
        description: "AI optimization suggestions are now available",
        variant: "default",
      });
      
      // Navigate to portfolio page with analysis results
      // In a real app, we would pass the analysis results
      navigate("/asset/PORTFOLIO");
    } catch (error) {
      console.error('Error running portfolio analysis:', error);
      toast({
        title: "Error",
        description: "Failed to analyze portfolio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingPortfolio(false);
    }
  };
  
  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">AI Trading Platform</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="ai-advisor" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="ai-advisor">
                <Bot className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">AI Advisor</span>
              </TabsTrigger>
              <TabsTrigger value="technical">
                <BarChart className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Technical</span>
              </TabsTrigger>
              <TabsTrigger value="patterns">
                <Brain className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Patterns</span>
              </TabsTrigger>
              <TabsTrigger value="news">
                <Newspaper className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">News</span>
              </TabsTrigger>
              <TabsTrigger value="on-chain">
                <Database className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">On-Chain</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai-advisor" className="m-0">
              <TradingAdvisor />
            </TabsContent>
            
            <TabsContent value="technical" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Analysis</CardTitle>
                  <CardDescription>
                    Market signals based on technical indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="py-10 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin"></div>
                    </div>
                  ) : technicalIndicators.length > 0 ? (
                    <div className="space-y-4">
                      {technicalIndicators.map((indicator, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-medium">{indicator.name}</div>
                            <div className={cn(
                              "flex items-center px-2 py-1 rounded-full text-xs",
                              indicator.signal === 'bullish' ? "bg-app-green/20 text-app-green" : 
                              indicator.signal === 'bearish' ? "bg-app-red/20 text-app-red" : 
                              "bg-yellow-500/20 text-yellow-500"
                            )}>
                              {indicator.signal === 'bullish' ? (
                                <>
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  <span>Bullish</span>
                                </>
                              ) : indicator.signal === 'bearish' ? (
                                <>
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  <span>Bearish</span>
                                </>
                              ) : (
                                <span>Neutral</span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {indicator.description}
                          </div>
                          <div className="mt-2 text-sm">
                            Value: <span className="font-medium">{indicator.value.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 flex flex-col items-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                      <div className="text-muted-foreground">
                        No technical indicators available. Select an asset to view analysis.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Pattern Detection Tab */}
            <TabsContent value="patterns" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>AI Pattern Recognition</CardTitle>
                  <CardDescription>
                    Advanced chart pattern detection powered by machine learning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="py-10 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {assets.slice(0, 4).map(asset => (
                          <div 
                            key={asset.id}
                            className={cn(
                              "border rounded-lg p-3 cursor-pointer transition-colors",
                              selectedAsset?.id === asset.id ? "border-app-blue bg-accent" : "hover:border-app-blue/50"
                            )}
                            onClick={() => handleSelectAsset(asset)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center mr-2",
                                  asset.recommendation === 'BUY' ? "bg-app-green/20" : 
                                  asset.recommendation === 'SELL' ? "bg-app-red/20" : 
                                  "bg-yellow-500/20"
                                )}>
                                  {asset.recommendation === 'BUY' ? (
                                    <TrendingUp className="h-4 w-4 text-app-green" />
                                  ) : asset.recommendation === 'SELL' ? (
                                    <TrendingDown className="h-4 w-4 text-app-red" />
                                  ) : (
                                    <BarChart className="h-4 w-4 text-yellow-500" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{asset.symbol}</div>
                                  <div className="text-xs text-muted-foreground">{asset.type.toUpperCase()}</div>
                                </div>
                              </div>
                              <div className={cn(
                                "flex items-center text-sm",
                                asset.change >= 0 ? "text-app-green" : "text-app-red"
                              )}>
                                {asset.change >= 0 ? (
                                  <ArrowUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 mr-1" />
                                )}
                                {Math.abs(asset.change).toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {selectedAsset && (
                        <PatternDetectionFeatures 
                          asset={selectedAsset}
                          candlestickData={assetChartData}
                        />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="news" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Market News Analysis</CardTitle>
                  <CardDescription>
                    AI-analyzed news sentiment and impact
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    Coming soon - News sentiment analysis
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="on-chain" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>On-Chain Analytics</CardTitle>
                  <CardDescription>
                    Blockchain data analysis for cryptocurrencies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    Coming soon - On-chain analytics
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Portfolio Optimizer</span>
                <Sliders className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                AI-powered portfolio optimization
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full border-8 border-app-blue flex items-center justify-center">
                  <PieChart className="h-12 w-12 text-app-blue" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-muted-foreground mb-1">Suggested Allocation</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-xs">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-app-blue rounded-full mr-1"></div>
                        <span>Stocks: 45%</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-app-green rounded-full mr-1"></div>
                        <span>Crypto: 15%</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                        <span>Bonds: 30%</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
                        <span>Cash: 10%</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Optimize Portfolio
                  </Button>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-muted-foreground mb-2">Top Rebalance Suggestions</div>
                  {isLoading ? (
                    <div className="h-[120px] flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-t-app-blue rounded-full border-muted animate-spin"></div>
                    </div>
                  ) : assets.length > 0 ? (
                    <ScrollArea className="h-[120px]">
                      <div className="space-y-2">
                        {assets.slice(0, 3).map((asset) => (
                          <div 
                            key={asset.id}
                            className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-1 rounded"
                            onClick={() => handleViewAsset(asset.id)}
                          >
                            <div className="flex items-center">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center mr-2",
                                asset.recommendation === 'BUY' ? "bg-app-green/20" : "bg-app-red/20"
                              )}>
                                {asset.recommendation === 'BUY' ? (
                                  <ArrowUp className="h-3 w-3 text-app-green" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-app-red" />
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-medium">{asset.symbol}</div>
                                <div className="text-xs text-muted-foreground">
                                  {asset.recommendation === 'BUY' ? 'Increase' : 'Decrease'} by 5%
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-[120px] flex items-center justify-center text-muted-foreground text-xs">
                      No portfolio data available
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <Separator />
            <CardFooter className="pt-4">
              <Button 
                className="w-full"
                onClick={runPortfolioAnalysis}
                disabled={isAnalyzingPortfolio}
              >
                {isAnalyzingPortfolio ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-white rounded-full border-background animate-spin mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  'Run Custom Portfolio Analysis'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Trading;
