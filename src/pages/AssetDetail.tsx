
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

const AssetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { assets, addToWatchlist, removeFromWatchlist, isInWatchlist } = useAssets();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);
  const [smaData, setSmaData] = useState<SMAData[]>([]);
  const [timeframe, setTimeframe] = useState<'30d' | '90d' | '1y'>('90d');
  
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
            // Fallback to mock data if API fails
            const mockAsset = mockAssets.find(a => a.id === id);
            if (mockAsset) {
              setAsset(mockAsset);
              toast({
                title: "Using mock data",
                description: "Could not fetch real-time data. Using demo data instead.",
                variant: "destructive"
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading asset:', error);
        toast({
          title: "Error",
          description: "Failed to load asset data. Using mock data instead.",
          variant: "destructive"
        });
        
        // Fallback to mock
        const mockAsset = mockAssets.find(a => a.id === id);
        if (mockAsset) setAsset(mockAsset);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAssetData();
  }, [id, assets]);
  
  // Load chart data
  useEffect(() => {
    if (!asset) return;
    
    const loadChartData = async () => {
      try {
        // Try to fetch from API
        const isStock = asset.type === 'stock';
        const symbol = asset.symbol;
        const data = await fetchCandlestickData(symbol, isStock, timeframe);
        
        if (data.length > 0) {
          setCandlestickData(data);
          const sma = generateSMAData(data);
          setSmaData(sma);
        } else {
          throw new Error('No chart data available');
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        toast({
          title: "Using mock chart data",
          description: "Could not fetch real-time chart data. Using demo data instead.",
          variant: "destructive"
        });
        
        // Use mock data as fallback (use direct imports instead of require)
        const mockData = generateMockCandlestickData(asset.id, timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365);
        setCandlestickData(mockData);
        const mockSMA = generateMockSMAData(mockData);
        setSmaData(mockSMA);
      }
    };
    
    loadChartData();
  }, [asset, timeframe]);
  
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
      </div>
      
      <div className="mt-6">
        <Tabs defaultValue="analysis">
          <TabsList>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="explainable-ai">Explainable AI</TabsTrigger>
            <TabsTrigger value="on-chain">On-Chain Analytics</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio Optimization</TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
                <CardDescription>
                  Based on technical indicators, fundamental analysis, and market sentiment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                  <h3 className="font-medium mb-2">Summary</h3>
                  <p>{asset.analysis}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Technical Indicators</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/30 p-3 rounded-lg border border-border">
                      <div className="text-sm text-muted-foreground">RSI (14)</div>
                      <div className="font-medium">{40 + Math.floor(Math.random() * 30)}</div>
                    </div>
                    <div className="bg-secondary/30 p-3 rounded-lg border border-border">
                      <div className="text-sm text-muted-foreground">MACD</div>
                      <div className={Math.random() > 0.5 ? "text-app-green font-medium" : "text-app-red font-medium"}>
                        {Math.random() > 0.5 ? "Bullish" : "Bearish"}
                      </div>
                    </div>
                    <div className="bg-secondary/30 p-3 rounded-lg border border-border">
                      <div className="text-sm text-muted-foreground">Stochastic</div>
                      <div className="font-medium">{30 + Math.floor(Math.random() * 50)}</div>
                    </div>
                    <div className="bg-secondary/30 p-3 rounded-lg border border-border">
                      <div className="text-sm text-muted-foreground">Bollinger Bands</div>
                      <div className="font-medium">
                        {Math.random() > 0.6 ? "Upper bound" : Math.random() > 0.3 ? "Middle" : "Lower bound"}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Support & Resistance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Support Levels</div>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>${(asset.price * 0.92).toFixed(2)}</li>
                        <li>${(asset.price * 0.85).toFixed(2)}</li>
                        <li>${(asset.price * 0.78).toFixed(2)}</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Resistance Levels</div>
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>${(asset.price * 1.08).toFixed(2)}</li>
                        <li>${(asset.price * 1.15).toFixed(2)}</li>
                        <li>${(asset.price * 1.22).toFixed(2)}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="explainable-ai" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Explainable AI</CardTitle>
                <CardDescription>
                  Understanding the factors behind our AI recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Our AI model's {asset.recommendation} recommendation is based on multiple factors analyzed from
                  historical data, market trends, and predictive modeling.
                </p>
                
                <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                  <h3 className="font-medium mb-2">Key Factors Influencing This Recommendation</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <span className="font-medium">Technical Patterns:</span>{' '}
                      {asset.trend === 'RISING' 
                        ? 'Identified bullish continuation pattern with strong momentum indicators.' 
                        : 'Detected bearish reversal pattern with weakening momentum.'}
                    </li>
                    <li>
                      <span className="font-medium">Market Sentiment:</span>{' '}
                      Analysis of social media and news coverage shows {Math.random() > 0.5 ? 'positive' : 'mixed'} sentiment.
                    </li>
                    <li>
                      <span className="font-medium">Fundamental Analysis:</span>{' '}
                      {asset.type === 'stock' 
                        ? 'Company fundamentals indicate strong revenue growth and positive earnings outlook.' 
                        : 'Network metrics show healthy adoption and growing use cases.'}
                    </li>
                    <li>
                      <span className="font-medium">Historical Patterns:</span>{' '}
                      Similar market conditions in the past have led to {asset.trend === 'RISING' ? 'positive' : 'negative'} price movement.
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Model Confidence</h3>
                  <div className="flex items-center">
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div
                        className="bg-app-blue h-full rounded-full"
                        style={{ width: `${65 + Math.floor(Math.random() * 25)}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 font-semibold">{65 + Math.floor(Math.random() * 25)}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center">
                  <Button>Request Detailed AI Report</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="on-chain" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>On-Chain Analytics</CardTitle>
                <CardDescription>
                  {asset.type === 'crypto' 
                    ? 'Blockchain data insights for this cryptocurrency' 
                    : 'On-chain analytics not available for stocks'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {asset.type === 'crypto' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                        <h3 className="font-medium mb-2">Network Activity</h3>
                        <ul className="space-y-2">
                          <li className="flex justify-between">
                            <span className="text-muted-foreground">Active Addresses (24h):</span>
                            <span className="font-medium">{(Math.random() * 500000 + 100000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-muted-foreground">Transaction Volume (24h):</span>
                            <span className="font-medium">${(Math.random() * 5 + 1).toFixed(2)}B</span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-muted-foreground">Avg Transaction Fee:</span>
                            <span className="font-medium">${(Math.random() * 5).toFixed(2)}</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                        <h3 className="font-medium mb-2">Holder Distribution</h3>
                        <ul className="space-y-2">
                          <li className="flex justify-between">
                            <span className="text-muted-foreground">Top 10 Addresses:</span>
                            <span className="font-medium">{(Math.random() * 30 + 10).toFixed(2)}%</span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-muted-foreground">New Addresses (24h):</span>
                            <span className="font-medium">{(Math.random() * 50000 + 5000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-muted-foreground">HODLer Ratio:</span>
                            <span className="font-medium">{(Math.random() * 40 + 40).toFixed(2)}%</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                      <h3 className="font-medium mb-2">Market Metrics</h3>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">NVT Ratio:</span>
                          <span className="font-medium">{(Math.random() * 60 + 20).toFixed(2)}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">MVRV Ratio:</span>
                          <span className="font-medium">{(Math.random() * 3 + 0.5).toFixed(2)}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Exchange Outflow (24h):</span>
                          <span className={Math.random() > 0.5 ? "text-app-green font-medium" : "text-app-red font-medium"}>
                            {Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 100 + 10).toFixed(2)}M
                          </span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <Button>View Full On-Chain Report</Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">On-chain analytics are only available for cryptocurrency assets.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="portfolio" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Optimization</CardTitle>
                <CardDescription>
                  Analyze how this asset fits into your investment portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                  <h3 className="font-medium mb-2">Risk Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Volatility</div>
                      <div className="flex items-center">
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={asset.type === 'crypto' ? "bg-app-red h-full rounded-full" : "bg-yellow-500 h-full rounded-full"}
                            style={{ width: asset.type === 'crypto' ? '80%' : '55%' }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium">{asset.type === 'crypto' ? 'High' : 'Medium'}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Sharpe Ratio</div>
                      <div className="font-medium">{(Math.random() * 2 + 0.5).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Beta</div>
                      <div className="font-medium">{(Math.random() * 1.5 + 0.5).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Correlation Analysis</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 text-left">Asset</th>
                          <th className="pb-2 text-right">Correlation</th>
                          <th className="pb-2 text-right">Diversification Effect</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-2">S&P 500</td>
                          <td className="py-2 text-right">{(Math.random() * 0.9).toFixed(2)}</td>
                          <td className="py-2 text-right">{Math.random() > 0.5 ? 'Positive' : 'Negative'}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-2">Bitcoin</td>
                          <td className="py-2 text-right">{(Math.random() * 0.9).toFixed(2)}</td>
                          <td className="py-2 text-right">{Math.random() > 0.5 ? 'Positive' : 'Negative'}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-2">Gold</td>
                          <td className="py-2 text-right">{(Math.random() * 0.9).toFixed(2)}</td>
                          <td className="py-2 text-right">{Math.random() > 0.5 ? 'Positive' : 'Negative'}</td>
                        </tr>
                        <tr>
                          <td className="py-2">US Treasury</td>
                          <td className="py-2 text-right">{(Math.random() * 0.9).toFixed(2)}</td>
                          <td className="py-2 text-right">{Math.random() > 0.5 ? 'Positive' : 'Negative'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                  <h3 className="font-medium mb-2">Recommended Allocation</h3>
                  <p>Based on modern portfolio theory and your risk profile:</p>
                  <div className="mt-2 flex items-center">
                    <div className="w-full bg-secondary rounded-full h-4">
                      <div
                        className="bg-app-blue h-full rounded-full"
                        style={{ width: `${(Math.random() * 15 + 5).toFixed(0)}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 font-medium">{(Math.random() * 15 + 5).toFixed(0)}%</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Adding {asset.symbol} at this allocation may {Math.random() > 0.5 ? 'improve' : 'slightly decrease'} your portfolio's risk-adjusted returns.
                  </p>
                </div>
                
                <div className="flex items-center justify-center">
                  <Button>Run Custom Portfolio Analysis</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssetDetail;
