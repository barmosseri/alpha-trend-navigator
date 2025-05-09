import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Asset, TrendingAsset } from '@/lib/types';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchTrendingAssets } from '@/services/marketData';
import { useAssets } from '@/contexts/AssetsContext';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TradingAdvisor = () => {
  const [trendingAssets, setTrendingAssets] = useState<TrendingAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'now' | 'day' | 'week' | 'month'>('now');
  const { addToWatchlist } = useAssets();
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadTrendingAssets = async () => {
      setIsLoading(true);
      try {
        const assets = await fetchTrendingAssets();
        setTrendingAssets(assets);
      } catch (error) {
        console.error('Error loading trending assets:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTrendingAssets();
  }, []);
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const assets = await fetchTrendingAssets();
      setTrendingAssets(assets);
    } catch (error) {
      console.error('Error refreshing trending assets:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewDetails = (id: string) => {
    navigate(`/asset/${id}`);
  };
  
  const handleAddToWatchlist = (asset: TrendingAsset) => {
    // Convert TrendingAsset to Asset format for watchlist
    const watchlistAsset: Asset = {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      price: 0, // We'll need to fetch this
      change: asset.change,
      marketCap: 0, // We'd need to fetch this
      volume: 0, // We'd need to fetch this
      rating: asset.confidence * 10, // Convert 0-1 to 0-10
      trend: asset.change > 0 ? 'RISING' : 'FALLING',
      analysis: `AI recommends to ${asset.signal.toLowerCase()} with ${(asset.confidence * 100).toFixed(0)}% confidence.`,
      recommendation: asset.signal
    };
    
    addToWatchlist(watchlistAsset);
  };
  
  const filteredAssets = trendingAssets.filter(asset => {
    // For now, we don't have different recommendations per timeframe
    // In a real implementation, we would filter based on the selected timeframe
    return true;
  });
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>AI Trading Advisor</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <CardDescription>
          AI-powered recommendations based on market analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="now" className="mb-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="now" onClick={() => setSelectedTimeframe('now')}>Now</TabsTrigger>
            <TabsTrigger value="day" onClick={() => setSelectedTimeframe('day')}>24h</TabsTrigger>
            <TabsTrigger value="week" onClick={() => setSelectedTimeframe('week')}>1W</TabsTrigger>
            <TabsTrigger value="month" onClick={() => setSelectedTimeframe('month')}>1M</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin"></div>
          </div>
        ) : filteredAssets.length > 0 ? (
          <div className="space-y-3">
            {filteredAssets.map((asset) => (
              <div 
                key={asset.id}
                className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent/50 cursor-pointer border"
                onClick={() => handleViewDetails(asset.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    asset.signal === 'BUY' ? "bg-app-green/20" : 
                    asset.signal === 'SELL' ? "bg-app-red/20" : "bg-yellow-500/20"
                  )}>
                    {asset.signal === 'BUY' ? (
                      <TrendingUp className="h-5 w-5 text-app-green" />
                    ) : asset.signal === 'SELL' ? (
                      <TrendingDown className="h-5 w-5 text-app-red" />
                    ) : (
                      <div className="h-1 w-4 bg-yellow-500 rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{asset.symbol}</div>
                    <div className="text-sm text-muted-foreground">{asset.name}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={cn(
                      "flex items-center",
                      asset.change >= 0 ? "text-app-green" : "text-app-red"
                    )}>
                      {asset.change >= 0 ? (
                        <ArrowUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      <span>{Math.abs(asset.change).toFixed(2)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {(asset.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  <Badge className={cn(
                    asset.signal === 'BUY' ? "bg-app-green hover:bg-app-green/90" : 
                    asset.signal === 'SELL' ? "bg-app-red hover:bg-app-red/90" : ""
                  )}>
                    {asset.signal}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No recommendations available for this timeframe
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" className="w-full" onClick={handleRefresh}>
          Refresh Analysis
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TradingAdvisor; 