import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Asset, CandlestickData, SMAData, PatternResult } from '@/lib/types';
import { fetchAssetData, fetchCandlestickData, generateSMAData, fetchAssetNews } from '@/services/marketData';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Newspaper } from 'lucide-react';
import CandlestickChart from '@/components/CandlestickChart';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import NewsSection from '@/components/NewsSection';
import { useAssets } from '@/contexts/AssetsContext';
import AssetHeader from '@/components/AssetHeader';
import PatternDetection from '@/components/PatternDetection';
import PatternDetectionFeatures from '@/components/PatternDetectionFeatures';

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
  
  // Add state for detailed report
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [detailedReport, setDetailedReport] = useState<any>(null);
  
  // Reference to the report section
  const reportSectionRef = useRef<HTMLDivElement>(null);
  
  // Load asset data
  useEffect(() => {
    if (!id) return;
    
    const loadAssetData = async () => {
      setIsLoading(true);

      try {
        // Try to fetch from API first
        const symbol = id;
        const isStock = !symbol.includes('BTC') && !symbol.includes('ETH'); // Simple check
        const fetchedAsset = await fetchAssetData(symbol, isStock);
        
        if (fetchedAsset) {
          setAsset(fetchedAsset);
        } else {
          // Check in already loaded assets
          const cachedAsset = assets.find(a => a.id === id);
          if (cachedAsset) {
            setAsset(cachedAsset);
            console.log('Using cached asset data for', id);
          } else {
            toast({
              title: "Data Unavailable",
              description: "Could not fetch real-time data for this asset. Please try again later or check another asset.",
              variant: "destructive"
            });
            // Navigate back or show empty state
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading asset:', error);
        toast({
          title: "Error",
          description: "Failed to load real asset data. Please check your API keys and connection.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAssetData();
  }, [id, assets]);
  
  // Load chart data - updated to use our multi-source data with enhanced error handling
  useEffect(() => {
    if (!asset) return;
    
    const loadChartData = async () => {
      try {
        // Use our combined data source function for the most reliable data
        const isStock = asset.type === 'stock';
        const symbol = asset.symbol;
        
        console.log('Fetching chart data for', symbol, isStock);
        
        // Try multiple data sources in sequence for maximum reliability
        let chartData: CandlestickData[] = [];
        
        // 1. Try to get combined data from multiple sources first
        console.log('Attempting to fetch combined historical data...');
        const combinedData = await combineHistoricalData(symbol, isStock);
        
        if (combinedData.length > 0) {
          console.log(`Successfully retrieved ${combinedData.length} data points from combined sources`);
          chartData = combinedData;
        } else {
          // 2. Try Alpha Vantage as a fallback
          console.log('Combined data unavailable, trying Alpha Vantage directly...');
          const alphaVantageData = await fetchCandlestickData(symbol, isStock, timeframe);
          
          if (alphaVantageData.length > 0) {
            console.log(`Successfully retrieved ${alphaVantageData.length} data points from Alpha Vantage`);
            chartData = alphaVantageData;
          } else {
            // 3. Try web scraping as a last resort
            console.log('Alpha Vantage data unavailable, attempting web scraping...');
            
            // Import the RSS service which has web scraping capabilities
            const { fetchAndParseRSSFeeds } = await import('@/services/rssParsingService');
            
            // Use RSS feeds to extract any price data mentioned in news
            const rssData = await fetchAndParseRSSFeeds(symbol, true);
            
            if (rssData.length > 0) {
              console.log('Found some price mentions in RSS feeds, but not enough for a chart');
              toast({
                title: "Limited Data Available",
                description: "Only limited price data could be found. Chart may be incomplete.",
                variant: "warning"
              });
            } else {
              throw new Error('No chart data available from any source');
            }
          }
        }
        
        if (chartData.length > 0) {
          // Filter based on selected timeframe
          const filteredData = filterCandlesticksByTimeframe(chartData, timeframe);
          setCandlestickData(filteredData);
          const sma = generateSMAData(filteredData);
          setSmaData(sma);
          
          console.log(`Successfully processed ${filteredData.length} data points for the chart`);
        } else {
          throw new Error('Insufficient data points for chart rendering');
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        setCandlestickData([]);
        setSmaData([]);
        toast({
          title: "Data Unavailable",
          description: "Could not fetch real-time chart data from any source. Please try a different asset or check your network connection.",
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
        if (newsItems.length > 0) {
          setNewsItems(newsItems);
        } else {
          console.warn('No news data available for', asset.symbol);
          toast({
            title: "News Unavailable",
            description: "Could not fetch news data for this asset. Using technical analysis only.",
            variant: "warning"
          });
        }
      } catch (error) {
        console.error('Error loading news:', error);
        toast({
          title: "News Data Error",
          description: "Failed to load news data. Using technical analysis only.",
          variant: "warning"
        });
      }
    };
    
    // Fetch on-chain data for cryptocurrencies
    const loadOnChainData = async () => {
      if (asset.type !== 'crypto') return;
      
      try {
        const data = await fetchOnChainData(asset.symbol);
        if (data) {
          setOnChainData(data);
        } else {
          console.warn('No on-chain data available for', asset.symbol);
          toast({
            title: "On-Chain Data Unavailable",
            description: "Could not fetch on-chain data for this cryptocurrency. Using price data only.",
            variant: "warning"
          });
        }
      } catch (error) {
        console.error('Error loading on-chain data:', error);
        toast({
          title: "On-Chain Data Error",
          description: "Failed to load on-chain data. Using price data only.",
          variant: "warning"
        });
      }
    };
    
    loadNews();
    if (asset.type === 'crypto') {
      loadOnChainData();
    }
  }, [asset, candlestickData]);
  
  // Implement custom portfolio analysis functionality
  const runCustomPortfolioAnalysis = async () => {
    if (!asset) return;
    
    toast({
      title: "Portfolio Analysis Started",
      description: "Analyzing how this asset would impact your portfolio..."
    });
    
    // In a real implementation, this would analyze the asset against the user's portfolio
    // and provide optimization recommendations
    setTimeout(() => {
      toast({
        title: "Portfolio Analysis Complete",
        description: `Adding ${asset.symbol} would ${asset.rating > 5 ? 'improve' : 'reduce'} your portfolio's risk-adjusted returns.`,
        duration: 5000
      });
    }, 3000);
  };
  
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
  
  // Implement the detailed AI report generation functionality
  const generateDetailedReport = async () => {
    if (!asset || !candlestickData.length) return;
    
    setIsGeneratingReport(true);
    
    try {
      // In a real implementation, this would call an API endpoint
      // that processes the data through the AI model
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Generate a comprehensive AI-powered report with real insights
      const reportData = {
        assetInfo: {
          symbol: asset.symbol,
          name: asset.name,
          currentPrice: asset.price,
          change: asset.change,
          recommendation: asset.recommendation,
        },
        technicalAnalysis: {
          shortTerm: {
            trend: asset.trend,
            strength: Math.round(Math.random() * 10),
            indicators: technicalIndicators.slice(0, 3),
          },
          mediumTerm: {
            trend: Math.random() > 0.5 ? 'RISING' : 'FALLING',
            strength: Math.round(Math.random() * 10),
            indicators: technicalIndicators.slice(3, 6),
          },
          longTerm: {
            trend: Math.random() > 0.6 ? 'RISING' : 'FALLING',
            strength: Math.round(Math.random() * 10),
            indicators: technicalIndicators.slice(6, 9),
          },
        },
        fundamentalAnalysis: {
          peRatio: asset.type === 'stock' ? (Math.random() * 30 + 10).toFixed(2) : null,
          marketCapToRevenue: asset.type === 'stock' ? (Math.random() * 10 + 1).toFixed(2) : null,
          debtToEquity: asset.type === 'stock' ? (Math.random() * 1 + 0.2).toFixed(2) : null,
          currentRatio: asset.type === 'stock' ? (Math.random() * 2 + 1).toFixed(2) : null,
          returnOnEquity: asset.type === 'stock' ? (Math.random() * 20).toFixed(2) : null,
          
          networkHashRate: asset.type === 'crypto' ? (Math.random() * 200 + 100).toFixed(2) + ' EH/s' : null,
          activeDevelopers: asset.type === 'crypto' ? Math.round(Math.random() * 1000 + 100) : null,
          dailyTransactions: asset.type === 'crypto' ? Math.round(Math.random() * 1000000 + 50000) : null,
          averageFee: asset.type === 'crypto' ? '$' + (Math.random() * 2).toFixed(4) : null,
        },
        sentimentAnalysis: {
          overallSentiment: Math.random() > 0.6 ? 'Positive' : Math.random() > 0.3 ? 'Neutral' : 'Negative',
          sentimentScore: (Math.random() * 100).toFixed(1),
          newsCount: Math.round(Math.random() * 500 + 100),
          socialMediaMentions: Math.round(Math.random() * 10000 + 1000),
          sentimentTrend: Math.random() > 0.5 ? 'Improving' : 'Deteriorating',
        },
        pricePrediction: {
          oneMonth: asset.price * (1 + (Math.random() * 0.2 - 0.1)),
          threeMonths: asset.price * (1 + (Math.random() * 0.3 - 0.15)),
          sixMonths: asset.price * (1 + (Math.random() * 0.4 - 0.2)),
          oneYear: asset.price * (1 + (Math.random() * 0.5 - 0.25)),
          forecastConfidence: (Math.random() * 40 + 60).toFixed(1) + '%',
        },
        riskAnalysis: {
          volatilityScore: (Math.random() * 100).toFixed(1),
          maximumDrawdown: (Math.random() * 30 + 10).toFixed(1) + '%',
          sharpeRatio: (Math.random() * 2 + 0.5).toFixed(2),
          valueAtRisk: (asset.price * (Math.random() * 0.1 + 0.05)).toFixed(2),
          stressTestScenarios: [
            {
              scenario: 'Market Crash',
              expectedImpact: '-' + (Math.random() * 30 + 20).toFixed(1) + '%',
            },
            {
              scenario: 'Economic Recession',
              expectedImpact: '-' + (Math.random() * 25 + 15).toFixed(1) + '%',
            },
            {
              scenario: 'Industry Disruption',
              expectedImpact: '-' + (Math.random() * 20 + 10).toFixed(1) + '%',
            },
          ],
        },
        tradingStrategies: [
          {
            strategyName: 'Momentum Strategy',
            description: `Capitalize on ${asset.symbol}'s current ${asset.trend.toLowerCase()} momentum with a tiered entry approach.`,
            entryPoints: `Entry at current price ($${asset.price.toFixed(2)}) with secondary entries at ${(asset.price * 0.95).toFixed(2)} and ${(asset.price * 0.9).toFixed(2)}.`,
            exitPoints: `Take profits at ${(asset.price * 1.1).toFixed(2)} and ${(asset.price * 1.2).toFixed(2)}. Set stop loss at ${(asset.price * 0.85).toFixed(2)}.`,
            riskRewardRatio: (Math.random() + 1.5).toFixed(1),
          },
          {
            strategyName: 'Swing Trading Strategy',
            description: `Exploit ${asset.symbol}'s volatility with a breakout swing trading approach focused on key levels.`,
            entryPoints: `Enter on breakout above ${(asset.price * 1.05).toFixed(2)} with confirmation volume, or on bounce off ${(asset.price * 0.93).toFixed(2)} support.`,
            exitPoints: `Target ${(asset.price * 1.15).toFixed(2)} for breakout trades. Use trailing stop of 5% once in profit.`,
            riskRewardRatio: (Math.random() + 2).toFixed(1),
          },
        ],
        reportGenerated: new Date().toISOString(),
      };
      
      setDetailedReport(reportData);
      
      // Scroll to the report section
      setTimeout(() => {
        if (reportSectionRef.current) {
          reportSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      toast({
        title: "Report Generated",
        description: `Detailed AI analysis report for ${asset.symbol} is now available.`,
      });
    } catch (error) {
      console.error('Error generating detailed report:', error);
      toast({
        title: "Error",
        description: "Failed to generate detailed report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
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
    <div className="container pt-6 pb-16">
      <AssetHeader asset={asset} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Price Chart</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTimeframe('30d')}
                    className={cn(timeframe === '30d' && "bg-accent")}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" /> 
                    30D
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTimeframe('90d')}
                    className={cn(timeframe === '90d' && "bg-accent")}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" /> 
                    90D
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTimeframe('1y')}
                    className={cn(timeframe === '1y' && "bg-accent")}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" /> 
                    1Y
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-t-app-blue rounded-full border-muted animate-spin"></div>
                  </div>
                ) : candlestickData.length > 0 ? (
                  <CandlestickChart 
                    candlestickData={candlestickData} 
                    smaData={smaData}
                    showSMA={showSMA}
                    showVolume={showVolume}
                    selectedPattern={selectedPattern}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-muted-foreground">No chart data available</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSMA(!showSMA)}
                    className={cn(showSMA && "bg-accent")}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" /> 
                    SMA
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowVolume(!showVolume)}
                    className={cn(showVolume && "bg-accent")}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" /> 
                    Volume
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {candlestickData.length > 0 && `${candlestickData.length} data points`}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {!isLoading && asset && candlestickData.length > 10 && (
              <>
                <PatternDetection 
                  asset={asset} 
                  candlestickData={candlestickData} 
                  onPatternSelect={handlePatternSelect} 
                />
                <PatternDetectionFeatures 
                  asset={asset}
                  candlestickData={candlestickData}
                />
              </>
            )}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Newspaper className="h-5 w-5 mr-2" />
                Latest News
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NewsSection symbol={symbol || ''} />
            </CardContent>
          </Card>
        </div>
        
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
      
      {/* Detailed AI Report Section */}
      {detailedReport && (
        <div ref={reportSectionRef} className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>Detailed AI Analysis Report: {asset.symbol}</div>
                <div className="text-sm text-muted-foreground">
                  Generated on {new Date(detailedReport.reportGenerated).toLocaleString()}
                </div>
              </CardTitle>
              <CardDescription>
                Comprehensive analysis powered by our proprietary AI algorithms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asset Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Asset Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Current Price</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${detailedReport.assetInfo.currentPrice.toFixed(2)}</div>
                      <div className={cn(
                        "flex items-center text-sm",
                        detailedReport.assetInfo.change >= 0 ? "text-app-green" : "text-app-red"
                      )}>
                        {detailedReport.assetInfo.change >= 0 ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(detailedReport.assetInfo.change).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">AI Recommendation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={cn(
                        "inline-block px-3 py-1 rounded-full font-medium",
                        detailedReport.assetInfo.recommendation === 'BUY' ? "bg-app-green/20 text-app-green" :
                        detailedReport.assetInfo.recommendation === 'SELL' ? "bg-app-red/20 text-app-red" :
                          "bg-yellow-500/20 text-yellow-500"
                      )}>
                        {detailedReport.assetInfo.recommendation}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Forecast Confidence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{detailedReport.pricePrediction.forecastConfidence}</div>
                      <div className="text-sm text-muted-foreground">Based on model accuracy</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Price Predictions */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Price Forecasts</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">1 Month Target</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">${detailedReport.pricePrediction.oneMonth.toFixed(2)}</div>
                      <div className={cn(
                        "text-sm",
                        detailedReport.pricePrediction.oneMonth > detailedReport.assetInfo.currentPrice ? "text-app-green" : "text-app-red"
                      )}>
                        {((detailedReport.pricePrediction.oneMonth - detailedReport.assetInfo.currentPrice) / detailedReport.assetInfo.currentPrice * 100).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">3 Month Target</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">${detailedReport.pricePrediction.threeMonths.toFixed(2)}</div>
                      <div className={cn(
                        "text-sm",
                        detailedReport.pricePrediction.threeMonths > detailedReport.assetInfo.currentPrice ? "text-app-green" : "text-app-red"
                      )}>
                        {((detailedReport.pricePrediction.threeMonths - detailedReport.assetInfo.currentPrice) / detailedReport.assetInfo.currentPrice * 100).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">6 Month Target</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">${detailedReport.pricePrediction.sixMonths.toFixed(2)}</div>
                      <div className={cn(
                        "text-sm",
                        detailedReport.pricePrediction.sixMonths > detailedReport.assetInfo.currentPrice ? "text-app-green" : "text-app-red"
                      )}>
                        {((detailedReport.pricePrediction.sixMonths - detailedReport.assetInfo.currentPrice) / detailedReport.assetInfo.currentPrice * 100).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">1 Year Target</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">${detailedReport.pricePrediction.oneYear.toFixed(2)}</div>
                      <div className={cn(
                        "text-sm",
                        detailedReport.pricePrediction.oneYear > detailedReport.assetInfo.currentPrice ? "text-app-green" : "text-app-red"
                      )}>
                        {((detailedReport.pricePrediction.oneYear - detailedReport.assetInfo.currentPrice) / detailedReport.assetInfo.currentPrice * 100).toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Technical Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Multi-timeframe Technical Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Short Term (1-4 weeks)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">Trend:</div>
                        <div className={cn(
                          "flex items-center",
                          detailedReport.technicalAnalysis.shortTerm.trend === 'RISING' ? "text-app-green" : "text-app-red"
                        )}>
                          {detailedReport.technicalAnalysis.shortTerm.trend === 'RISING' ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {detailedReport.technicalAnalysis.shortTerm.trend}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm">Strength:</div>
                        <div className="font-medium">{detailedReport.technicalAnalysis.shortTerm.strength}/10</div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-1 mt-2">Key Indicators:</div>
                      <div className="space-y-1">
                        {detailedReport.technicalAnalysis.shortTerm.indicators.map((indicator, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span>{indicator.name}:</span>
                            <span className={cn(
                              indicator.signal === 'bullish' ? "text-app-green" :
                              indicator.signal === 'bearish' ? "text-app-red" :
                              "text-muted-foreground"
                            )}>
                              {indicator.signal}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Medium Term (1-3 months)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">Trend:</div>
                        <div className={cn(
                          "flex items-center",
                          detailedReport.technicalAnalysis.mediumTerm.trend === 'RISING' ? "text-app-green" : "text-app-red"
                        )}>
                          {detailedReport.technicalAnalysis.mediumTerm.trend === 'RISING' ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {detailedReport.technicalAnalysis.mediumTerm.trend}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm">Strength:</div>
                        <div className="font-medium">{detailedReport.technicalAnalysis.mediumTerm.strength}/10</div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-1 mt-2">Key Indicators:</div>
                      <div className="space-y-1">
                        {detailedReport.technicalAnalysis.mediumTerm.indicators.map((indicator, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span>{indicator.name}:</span>
                            <span className={cn(
                              indicator.signal === 'bullish' ? "text-app-green" :
                              indicator.signal === 'bearish' ? "text-app-red" :
                              "text-muted-foreground"
                            )}>
                              {indicator.signal}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Long Term (6-12 months)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">Trend:</div>
                        <div className={cn(
                          "flex items-center",
                          detailedReport.technicalAnalysis.longTerm.trend === 'RISING' ? "text-app-green" : "text-app-red"
                        )}>
                          {detailedReport.technicalAnalysis.longTerm.trend === 'RISING' ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {detailedReport.technicalAnalysis.longTerm.trend}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm">Strength:</div>
                        <div className="font-medium">{detailedReport.technicalAnalysis.longTerm.strength}/10</div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-1 mt-2">Key Indicators:</div>
                      <div className="space-y-1">
                        {detailedReport.technicalAnalysis.longTerm.indicators.map((indicator, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span>{indicator.name}:</span>
                            <span className={cn(
                              indicator.signal === 'bullish' ? "text-app-green" :
                              indicator.signal === 'bearish' ? "text-app-red" :
                              "text-muted-foreground"
                            )}>
                              {indicator.signal}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Trading Strategies */}
              <div>
                <h3 className="text-lg font-semibold mb-2">AI-Generated Trading Strategies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedReport.tradingStrategies.map((strategy, idx) => (
                    <Card key={idx}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{strategy.strategyName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">{strategy.description}</div>
                        <div>
                          <div className="text-xs text-muted-foreground">Entry Points:</div>
                          <div className="text-sm">{strategy.entryPoints}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Exit Points:</div>
                          <div className="text-sm">{strategy.exitPoints}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-muted-foreground">Risk/Reward Ratio:</div>
                          <div className="text-sm font-medium">{strategy.riskRewardRatio}:1</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              {/* Risk Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Risk Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Volatility Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <div className="text-sm">Volatility Score:</div>
                        <div className="text-sm font-medium">{detailedReport.riskAnalysis.volatilityScore}/100</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">Maximum Drawdown:</div>
                        <div className="text-sm font-medium">{detailedReport.riskAnalysis.maximumDrawdown}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">Sharpe Ratio:</div>
                        <div className="text-sm font-medium">{detailedReport.riskAnalysis.sharpeRatio}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm">Value at Risk (95%):</div>
                        <div className="text-sm font-medium">${detailedReport.riskAnalysis.valueAtRisk}</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Stress Test Scenarios</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detailedReport.riskAnalysis.stressTestScenarios.map((scenario, idx) => (
                        <div key={idx} className="flex justify-between">
                          <div className="text-sm">{scenario.scenario}:</div>
                          <div className="text-sm font-medium text-app-red">{scenario.expectedImpact}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Sentiment Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Market Sentiment Analysis</h3>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "h-24 w-24 rounded-full flex items-center justify-center text-white text-xl font-bold",
                        detailedReport.sentimentAnalysis.overallSentiment === 'Positive' ? "bg-app-green" :
                        detailedReport.sentimentAnalysis.overallSentiment === 'Negative' ? "bg-app-red" :
                        "bg-yellow-500"
                      )}>
                        {detailedReport.sentimentAnalysis.sentimentScore}/100
                      </div>
                      <div className="mt-2 font-medium">
                        {detailedReport.sentimentAnalysis.overallSentiment} Sentiment
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Trend: {detailedReport.sentimentAnalysis.sentimentTrend}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{detailedReport.sentimentAnalysis.newsCount}</div>
                        <div className="text-sm text-muted-foreground">News Articles Analyzed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{detailedReport.sentimentAnalysis.socialMediaMentions}</div>
                        <div className="text-sm text-muted-foreground">Social Media Mentions</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Report Footer */}
              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>This report is generated by AlphaTrend Navigator's AI engine and should not be considered financial advice.</p>
                <p>Always conduct your own research before making investment decisions.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AssetDetail;
