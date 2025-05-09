
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trendingAssets } from '@/lib/mockData';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssets } from '@/contexts/AssetsContext';
import AssetCard from '@/components/AssetCard';
import { fetchTrendingAssets } from '@/services/marketData';
import { TrendingAsset } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

const Trading = () => {
  const { assets, addToWatchlist } = useAssets();
  const [trending, setTrending] = useState<TrendingAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadTrendingAssets = async () => {
      setIsLoading(true);
      
      try {
        // Attempt to fetch real trending assets
        const data = await fetchTrendingAssets();
        
        if (data.length > 0) {
          setTrending(data);
        } else {
          // Fallback to mock data
          setTrending(trendingAssets);
          toast({
            title: "Using demo data",
            description: "Could not fetch real-time trending data. Using demo data instead.",
          });
        }
      } catch (error) {
        console.error('Error loading trending assets:', error);
        // Fallback to mock data
        setTrending(trendingAssets);
        toast({
          title: "API Error",
          description: "Failed to load real-time data. Using demo data instead.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTrendingAssets();
  }, []);
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">AI Trading Insights</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Trading Opportunities</CardTitle>
            <CardDescription>
              AI-detected assets with strong buy signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <div className="w-6 h-6 border-4 border-t-app-blue rounded-full border-muted animate-spin mx-auto mb-3"></div>
                  <div>Loading opportunities...</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {trending.map((asset) => (
                  <div key={asset.id} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <Link to={`/asset/${asset.id}`} className="font-medium text-lg hover:text-accent">{asset.symbol}</Link>
                      <div className="text-sm text-muted-foreground">{asset.name}</div>
                      <div className="flex items-center mt-1 gap-1">
                        <span className="text-sm bg-secondary rounded px-1">{asset.type.toUpperCase()}</span>
                        <div className="flex items-center">
                          {asset.change >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-app-green" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-app-red" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={cn(
                        "flex items-center justify-end",
                        asset.change >= 0 ? "text-app-green" : "text-app-red"
                      )}>
                        {asset.change >= 0 ? (
                          <ArrowUp className="h-4 w-4 mr-0.5" />
                        ) : (
                          <ArrowDown className="h-4 w-4 mr-0.5" />
                        )}
                        {Math.abs(asset.change).toFixed(2)}%
                      </div>
                      <div className="text-sm font-medium mt-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          asset.signal === 'BUY' ? "bg-app-green/10 text-app-green" :
                          asset.signal === 'SELL' ? "bg-app-red/10 text-app-red" :
                            "bg-yellow-500/10 text-yellow-500"
                        )}>
                          {asset.signal}
                        </span>
                      </div>
                      <div className="text-xs mt-1">
                        Confidence: {(asset.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>AI Market Analysis</CardTitle>
            <CardDescription>
              Current market trends and predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                The market is currently showing strong bullish signals in the technology sector, 
                particularly for AI-related stocks. Cryptocurrencies are demonstrating increased 
                stability after the recent volatility.
              </p>
              <div className="bg-secondary/50 p-3 rounded-lg">
                <h3 className="font-medium mb-1">Key Market Indicators</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Market sentiment: <span className="text-app-green font-medium">Bullish</span></li>
                  <li>Volatility index: <span className="text-muted-foreground">Moderate (21.4)</span></li>
                  <li>AI sector projection: <span className="text-app-green font-medium">+8.2% (30 days)</span></li>
                  <li>Crypto market cycle: <span className="text-muted-foreground">Accumulation phase</span></li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Based on analysis of economic indicators, market sentiment, and technical signals,
                our AI model suggests focusing on high-growth tech stocks and established cryptocurrencies
                with strong fundamentals.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-xl font-bold mt-8 mb-4">Featured Assets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.slice(0, 6).map(asset => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
};

export default Trading;
