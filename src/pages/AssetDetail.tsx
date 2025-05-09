import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAssets } from '@/contexts/AssetsContext';
import { 
  fetchAssetData,
  fetchCandlestickData,
  generateSMAData
} from '@/services/marketData';
import { Asset, CandlestickData, SMAData } from '@/lib/types';
import CandlestickChart from '@/components/CandlestickChart';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockAssets, generateMockCandlestickData, generateMockSMAData } from '@/lib/mockData';
import { toast } from '@/components/ui/use-toast';

// Import our new components
import ExplainableAI from '@/components/ExplainableAI';
import OnChainAnalytics from '@/components/OnChainAnalytics';
import { generatePricePrediction, generateTechnicalIndicators, updateModelWeights } from '@/services/mlService';
import { fetchAssetNews, fetchOnChainData } from '@/services/marketData';
import PatternDetection from '@/components/PatternDetection';
import { combineHistoricalData } from '@/services/patternDetectionService';

const AssetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { assets, addToWatchlist, removeFromWatchlist, isInWatchlist } = useAssets();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
  const [smaData, setSmaData] = useState<SMAData[]>([]);
  const [timeframe, setTimeframe] = useState<'30d' | '90d' | '1y'>('90d');
  
  // Add new state for AI components
  const [prediction, setPrediction] = useState(null);
  const [technicalIndicators, setTechnicalIndicators] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [onChainData, setOnChainData] = useState(null);
  
  // Add state for selected pattern
  const [selectedPattern, setSelectedPattern] = useState<PatternResult | null>(null);
  
  // Load asset data
  useEffect(() => {
    if (!id) return;
    
    const loadAssetData = async () => {
      setIsLoading(true);

      try {
        // Try to find in already loaded assets
        const cachedAsset = assets.find(a => a.id === id);
        if (cachedAsset) {
          setAsset(cachedAsset);
        } else {
          // If not found, try to fetch from API
          const symbol = id;
          const isStock = !symbol.includes('BTC') && !symbol.includes('ETH'); // Simple check
          const fetchedAsset = await fetchAssetData(symbol, isStock);
          
          if (fetchedAsset) {
            setAsset(fetchedAsset);
          } else {
            throw new Error('Could not fetch real asset data');
          }
        }
      } catch (error) {
        console.error('Error loading asset:', error);
        toast({
          title: "Error",
          description: "Failed to load real asset data. Please check your API keys and connection.",
          variant: "destructive"
        });
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAssetData();
  }, [id, assets]);
  
  // Load chart data - updated to use our multi-source data
  useEffect(() => {
    if (!asset) return;
    
    const loadChartData = async () => {
      try {
        // Use our new combined data source function
        const isStock = asset.type === 'stock';
        const symbol = asset.symbol;
        
        // First try the multi-source data
        const combinedData = await combineHistoricalData(symbol, isStock);
        
        if (combinedData.length > 0) {
          // Filter based on selected timeframe
          const filteredData = filterCandlesticksByTimeframe(combinedData, timeframe);
          setCandlestickData(filteredData);
          const sma = generateSMAData(filteredData);
          setSmaData(sma);
        } else {
          // Fall back to original implementation if no data
          const data = await fetchCandlestickData(symbol, isStock, timeframe);
        
          if (data.length > 0) {
            setCandlestickData(data);
            const sma = generateSMAData(data);
            setSmaData(sma);
          } else {
            throw new Error('No real chart data available');
          }
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        toast({
          title: "Error",
          description: "Could not fetch real-time chart data. Please check your API keys and connection.",
          variant: "destructive"
        });
      }
    };
    
    loadChartData();
  }, [asset, timeframe]);
  
  // Add helper function to filter candlestick data by timeframe
  const filterCandlesticksByTimeframe = (
    data: CandlestickData[], 
    timeframe: '30d' | '90d' | '1y'
  ): CandlestickData[] => {
    if (!data.length) return [];
    
    const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return data.filter(candle => {
      const candleDate = new Date(candle.date);
      return candleDate >= cutoffDate;
    });
  };
  
  // Add new useEffect to generate AI predictions and analysis
  useEffect(() => {
    if (!asset || !candlestickData.length) return;
    
    // Generate AI prediction
    const prediction = generatePricePrediction(asset, candlestickData);
    setPrediction(prediction);
    
    // Generate technical indicators
    const indicators = generateTechnicalIndicators(candlestickData);
    setTechnicalIndicators(indicators);
    
    // Fetch news for the asset
    const loadNews = async () => {
      try {
        const newsItems = await fetchAssetNews(asset.symbol);
        setNewsItems(newsItems);
      } catch (error) {
        console.error('Error loading news:', error);
      }
    };
    
    // Fetch on-chain data for cryptocurrencies
    const loadOnChainData = async () => {
      if (asset.type !== 'crypto') return;
      
      try {
        const data = await fetchOnChainData(asset.symbol);
        setOnChainData(data);
      } catch (error) {
        console.error('Error loading on-chain data:', error);
      }
    };
    
    loadNews();
    if (asset.type === 'crypto') {
      loadOnChainData();
    }
  }, [asset, candlestickData]);
  
  // Add feedback handler for the AI
  const handleAIFeedback = (feedback) => {
    if (!asset || !prediction) return;
    
    updateModelWeights(asset.symbol, prediction.probability, feedback);
    
    toast({
      title: 'Thank you for your feedback',
      description: 'Your input helps improve our AI predictions.',
    });
  };
  
  // Handle pattern selection
  const handlePatternSelect = (pattern: PatternResult) => {
    setSelectedPattern(pattern);
    
    toast({
      title: 'Pattern Selected',
      description: `${pattern.patternType.split('_').join(' ')} pattern identified from ${pattern.startDate} to ${pattern.endDate}`,
    });
  };
  
  if (isLoading) {
    return (
      <div className="container py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin mx-auto mb-4"></div>
          <div>Loading asset data...</div>
        </div>
      </div>
    );
  }
  
  if (!asset) {
    return <div className="container py-12 text-center">Asset not found</div>;
  }
  
  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{asset.symbol}</h1>
            <span className="text-lg text-muted-foreground">({asset.name})</span>
            <span className="text-sm bg-secondary rounded px-1.5 py-0.5">{asset.type.toUpperCase()}</span>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <div className="font-semibold text-xl">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className={cn(
              "flex items-center text-sm",
              asset.change >= 0 ? "text-app-green" : "text-app-red"
            )}>
              {asset.change >= 0 ? (
                <ArrowUp className="h-4 w-4 mr-0.5" />
              ) : (
                <ArrowDown className="h-4 w-4 mr-0.5" />
              )}
              {Math.abs(asset.change).toFixed(2)}%
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button
            variant={asset.recommendation === 'BUY' ? 'default' : 'outline'}
            className={asset.recommendation === 'BUY' ? 'bg-app-green hover:bg-app-green/90' : ''}
          >
            <Plus className="h-4 w-4 mr-2" />
            Buy
          </Button>
          <Button
            variant={asset.recommendation === 'SELL' ? 'default' : 'outline'}
            className={asset.recommendation === 'SELL' ? 'bg-app-red hover:bg-app-red/90' : ''}
          >
            <Minus className="h-4 w-4 mr-2" />
            Sell
          </Button>
          <Button
            variant="outline"
            onClick={() => isInWatchlist(asset.id) ? removeFromWatchlist(asset.id) : addToWatchlist(asset)}
          >
            {isInWatchlist(asset.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-0">
            <div className="flex justify-between items-center">
              <CardTitle>
                {asset.symbol} {asset.type === 'stock' ? 'AI Powered Stock Chart' : 'AI Powered Crypto Chart'}
              </CardTitle>
              <div className="flex gap-1">
                <Button 
                  variant={timeframe === '30d' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setTimeframe('30d')}
                >
                  30D
                </Button>
                <Button 
                  variant={timeframe === '90d' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setTimeframe('90d')}
                >
                  90D
                </Button>
                <Button 
                  variant={timeframe === '1y' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setTimeframe('1y')}
                >
                  1Y
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {candlestickData.length > 0 ? (
              <>
                <div className="text-sm text-muted-foreground mb-2">
                  {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' '}
                  <span className="bg-[#9b87f5] px-1 rounded-sm text-white">
                    {asset.symbol}:
                  </span> 
                  {' '}
                  O: ${asset.price.toFixed(2)}; H: ${(asset.price * 1.01).toFixed(2)}; 
                  L: ${(asset.price * 0.99).toFixed(2)}; C: ${asset.price.toFixed(2)}
                </div>
                <CandlestickChart 
                  candlestickData={candlestickData} 
                  smaData={smaData}
                  showSMA={true}
                  showVolume={true}
                  selectedPattern={selectedPattern}
                />
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin mx-auto mb-4"></div>
                  <div>Loading chart data...</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rating & Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Rating</div>
                  <div className="flex items-center">
                    <div className="w-full bg-secondary rounded-full h-4">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          asset.rating >= 7 ? "bg-app-green" : asset.rating >= 4 ? "bg-yellow-500" : "bg-app-red"
                        )}
                        style={{ width: `${asset.rating * 10}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 font-semibold">{asset.rating}/10</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Trend</div>
                  <div className={cn(
                    "flex items-center text-lg font-semibold",
                    asset.trend === 'RISING' ? "text-app-green" : 
                    asset.trend === 'FALLING' ? "text-app-red" : 
                    "text-app-gray"
                  )}>
                    {asset.trend === 'RISING' ? (
                      <TrendingUp className="h-5 w-5 mr-1" />
                    ) : asset.trend === 'FALLING' ? (
                      <TrendingDown className="h-5 w-5 mr-1" />
                    ) : null}
                    {asset.trend}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Recommendation</div>
                  <div className={cn(
                    "inline-block px-3 py-1 rounded-full font-medium",
                    asset.recommendation === 'BUY' ? "bg-app-green/20 text-app-green" :
                    asset.recommendation === 'SELL' ? "bg-app-red/20 text-app-red" :
                      "bg-yellow-500/20 text-yellow-500"
                  )}>
                    {asset.recommendation}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Market Cap</div>
                  <div className="font-semibold">
                    ${(asset.marketCap / 1000000000).toFixed(2)}B
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-2">24h Volume</div>
                  <div className="font-semibold">
                    ${(asset.volume / 1000000).toFixed(2)}M
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Pattern Detection Component */}
          <PatternDetection 
            asset={asset}
            candlestickData={candlestickData}
            onPatternSelect={handlePatternSelect}
          />
        </div>
      </div>
      
      {/* Add AI analysis and advanced tools */}
      <div className="mt-8">
        <Tabs defaultValue="ai-analysis">
          <TabsList>
            <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
            <TabsTrigger value="patterns">Chart Patterns</TabsTrigger>
            {asset?.type === 'crypto' && (
              <TabsTrigger value="on-chain">On-Chain Analytics</TabsTrigger>
            )}
            <TabsTrigger value="news">News</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai-analysis" className="mt-4">
            {prediction ? (
              <ExplainableAI 
                asset={asset}
                prediction={prediction}
                technicalIndicators={technicalIndicators}
                onFeedback={handleAIFeedback}
              />
            ) : (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin mx-auto mb-4"></div>
                <div>Generating AI analysis...</div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="technical" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical Analysis</CardTitle>
                <CardDescription>
                  Key technical indicators and signals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add new tab for detailed pattern analysis */}
          <TabsContent value="patterns" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Chart Pattern Analysis</CardTitle>
                <CardDescription>
                  Detailed analysis of detected chart patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="font-medium">Pattern Overview</div>
                    <p className="text-sm text-muted-foreground">
                      Chart patterns are specific price formations that help predict future price movements. 
                      Our AI system analyzes historical data from multiple sources to identify reliable patterns.
                    </p>
                    
                    {selectedPattern ? (
                      <div className="border rounded-lg p-4 mt-4">
                        <div className="font-medium mb-2">
                          {selectedPattern.patternType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                        </div>
                        <p className="text-sm mb-2">{selectedPattern.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Signal:</span>
                            <span className={cn(
                              "ml-1 font-medium",
                              selectedPattern.signal === 'bullish' ? "text-app-green" :
                              selectedPattern.signal === 'bearish' ? "text-app-red" :
                              "text-muted-foreground"
                            )}>
                              {selectedPattern.signal.charAt(0).toUpperCase() + selectedPattern.signal.slice(1)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Strength:</span>
                            <span className="ml-1 font-medium">{Math.round(selectedPattern.strength * 100)}%</span>
                          </div>
                          {selectedPattern.level && (
                            <div>
                              <span className="text-muted-foreground">Price Level:</span>
                              <span className="ml-1 font-medium">${selectedPattern.level.toFixed(2)}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Pattern Period:</span>
                            <span className="ml-1 font-medium">
                              {new Date(selectedPattern.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                              {new Date(selectedPattern.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Select a pattern from the sidebar to see detailed analysis
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="font-medium mb-4">Trading Implications</div>
                    {selectedPattern ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <div className="font-medium mb-2">Entry Points</div>
                          <div className="text-sm">
                            {selectedPattern.signal === 'bullish' ? (
                              <p>Consider entry positions on price confirmation above resistance. A good entry would be after the pattern is confirmed with increased volume.</p>
                            ) : selectedPattern.signal === 'bearish' ? (
                              <p>Consider entry positions on price confirmation below support. Wait for the pattern to complete before taking a position.</p>
                            ) : (
                              <p>This pattern suggests a period of consolidation. Wait for a breakout in either direction with increased volume before entering a position.</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-4">
                          <div className="font-medium mb-2">Price Targets</div>
                          <div className="text-sm">
                            {selectedPattern.patternType === 'HEAD_AND_SHOULDERS' && (
                              <p>The price target from a head and shoulders pattern is typically the distance from the head to the neckline, projected from the breakdown point.</p>
                            )}
                            {selectedPattern.patternType === 'DOUBLE_TOP' && (
                              <p>The price target from a double top is typically the height of the formation, measured from the breakdown point at the neckline.</p>
                            )}
                            {selectedPattern.patternType === 'DOUBLE_BOTTOM' && (
                              <p>The price target from a double bottom is typically the height of the formation, measured from the breakout point at the neckline.</p>
                            )}
                            {(selectedPattern.patternType === 'ASCENDING_TRIANGLE' || 
                              selectedPattern.patternType === 'DESCENDING_TRIANGLE' || 
                              selectedPattern.patternType === 'SYMMETRICAL_TRIANGLE') && (
                              <p>The price target from a triangle pattern is typically the height of the triangle measured from the breakout point.</p>
                            )}
                            {selectedPattern.patternType === 'SUPPORT' && (
                              <p>Support levels often act as good entry points for long positions, with a stop loss just below the support level.</p>
                            )}
                            {selectedPattern.patternType === 'RESISTANCE' && (
                              <p>Resistance levels can be used as exit points for long positions or entry points for short positions if the price fails to break through.</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-4">
                          <div className="font-medium mb-2">Risk Management</div>
                          <div className="text-sm">
                            <p>
                              {selectedPattern.signal === 'bullish' ? (
                                `Consider placing a stop loss below ${selectedPattern.patternType === 'SUPPORT' ? 'the support level' : 'the pattern low'} to manage risk.`
                              ) : selectedPattern.signal === 'bearish' ? (
                                `Consider placing a stop loss above ${selectedPattern.patternType === 'RESISTANCE' ? 'the resistance level' : 'the pattern high'} to manage risk.`
                              ) : (
                                "Wait for a clear breakout before entering a position, with a stop loss on the opposite side of the pattern."
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        Select a pattern to see trading implications
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {asset?.type === 'crypto' && (
            <TabsContent value="on-chain" className="mt-4">
              {onChainData ? (
                <OnChainAnalytics
                  symbol={asset.symbol}
                  onChainData={onChainData}
                />
              ) : (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin mx-auto mb-4"></div>
                  <div>Loading on-chain data...</div>
                </div>
              )}
            </TabsContent>
          )}
          
          <TabsContent value="news" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Latest News</CardTitle>
                <CardDescription>
                  Recent news and market sentiment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {newsItems.length > 0 ? (
                  <div className="space-y-4">
                    {newsItems.map((item, index) => (
                      <div key={index} className="border-b pb-3 last:border-b-0">
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-2",
                            item.sentiment === 'positive' ? "bg-app-green" :
                            item.sentiment === 'negative' ? "bg-app-red" : "bg-yellow-500"
                          )} />
                          <div>
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium hover:underline"
                            >
                              {item.title}
                            </a>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(item.publishedAt).toLocaleDateString()} · {item.source}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent news found for {asset?.symbol}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssetDetail;
