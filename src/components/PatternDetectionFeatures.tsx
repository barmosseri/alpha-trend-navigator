
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Asset, PatternResult, CandlestickData } from '@/lib/types';
import { detectPatterns, combineHistoricalData } from '@/services/patternDetectionService';
import { 
  Brain, 
  LineChart, 
  BarChart, 
  PieChart, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PatternDetection from './PatternDetection';
import { toast } from '@/components/ui/use-toast';

interface PatternDetectionFeaturesProps {
  asset?: Asset;
  candlestickData?: CandlestickData[];
  isDetailView?: boolean;
}

const PatternDetectionFeatures: React.FC<PatternDetectionFeaturesProps> = ({
  asset,
  candlestickData = [],
  isDetailView = false
}) => {
  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showAllPatterns, setShowAllPatterns] = useState<boolean>(false);
  
  useEffect(() => {
    if (asset && candlestickData.length > 0) {
      loadPatterns();
    }
  }, [asset, candlestickData]);
  
  const loadPatterns = async () => {
    if (!asset) return;
    
    setIsLoading(true);
    try {
      const detectedPatterns = await detectPatterns(asset, candlestickData);
      setPatterns(detectedPatterns);
      
      // Update asset with patterns
      if (asset && !asset.patterns) {
        asset.patterns = detectedPatterns;
      }
    } catch (error) {
      console.error('Error detecting patterns:', error);
      toast({
        title: 'Pattern Detection Error',
        description: 'Failed to detect chart patterns. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Group patterns by signal type (bullish/bearish/neutral)
  const bullishPatterns = patterns.filter(p => p.signal === 'bullish');
  const bearishPatterns = patterns.filter(p => p.signal === 'bearish');
  const neutralPatterns = patterns.filter(p => p.signal === 'neutral');
  
  // Determine overall signal based on pattern strength and count
  const calculateOverallSignal = (): 'bullish' | 'bearish' | 'neutral' => {
    if (!patterns.length) return 'neutral';
    
    const bullishStrength = bullishPatterns.reduce((sum, p) => sum + p.strength, 0);
    const bearishStrength = bearishPatterns.reduce((sum, p) => sum + p.strength, 0);
    
    if (bullishStrength > bearishStrength * 1.2) return 'bullish';
    if (bearishStrength > bullishStrength * 1.2) return 'bearish';
    return 'neutral';
  };
  
  const overallSignal = calculateOverallSignal();
  
  // Calculate pattern summary statistics
  const patternStats = {
    totalPatterns: patterns.length,
    bullishCount: bullishPatterns.length,
    bearishCount: bearishPatterns.length,
    neutralCount: neutralPatterns.length,
    strongestBullish: bullishPatterns.length > 0 
      ? bullishPatterns.sort((a, b) => b.strength - a.strength)[0]
      : null,
    strongestBearish: bearishPatterns.length > 0
      ? bearishPatterns.sort((a, b) => b.strength - a.strength)[0]
      : null
  };
  
  // Generate summary text
  const generateSummary = () => {
    if (patterns.length === 0) {
      return 'No significant chart patterns detected in the current timeframe.';
    }
    
    let summary = `Detected ${patterns.length} chart patterns: `;
    summary += `${bullishPatterns.length} bullish, ${bearishPatterns.length} bearish, and ${neutralPatterns.length} neutral. `;
    
    if (overallSignal === 'bullish') {
      summary += 'Overall, the technical patterns suggest a bullish bias.';
    } else if (overallSignal === 'bearish') {
      summary += 'Overall, the technical patterns suggest a bearish bias.';
    } else {
      summary += 'Overall, the technical patterns are mixed without a clear directional bias.';
    }
    
    return summary;
  };
  
  if (!asset) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            Select an asset to view pattern detection analysis
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Check if candlestickData is available before accessing it
  const safelyGetFirstDate = () => {
    if (candlestickData && candlestickData.length > 0 && candlestickData[0] && candlestickData[0].date) {
      return new Date(candlestickData[0].date);
    }
    return new Date(); // Default to current date if data isn't available
  };
  
  // Check if candlestickData is available before accessing it
  const safelyGetLastDate = () => {
    if (candlestickData && candlestickData.length > 0) {
      const lastIndex = candlestickData.length - 1;
      if (candlestickData[lastIndex] && candlestickData[lastIndex].date) {
        return new Date(candlestickData[lastIndex].date);
      }
    }
    return new Date(); // Default to current date if data isn't available
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-app-blue" />
            Pattern Detection
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={loadPatterns} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <CardDescription>
          AI-powered chart pattern analysis for {asset.symbol}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="py-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin"></div>
          </div>
        ) : (
          <>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="patterns">Patterns</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="pt-4 pb-2">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
                  <div className={cn(
                    "flex items-center justify-center w-20 h-20 rounded-full",
                    overallSignal === 'bullish' ? "bg-app-green/20" :
                    overallSignal === 'bearish' ? "bg-app-red/20" :
                    "bg-yellow-500/20"
                  )}>
                    {overallSignal === 'bullish' ? (
                      <TrendingUp className="h-10 w-10 text-app-green" />
                    ) : overallSignal === 'bearish' ? (
                      <TrendingDown className="h-10 w-10 text-app-red" />
                    ) : (
                      <BarChart className="h-10 w-10 text-yellow-500" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-lg capitalize mb-1">
                      {overallSignal} Pattern Bias
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {generateSummary()}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="border rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Bullish</div>
                    <div className="text-lg font-medium text-app-green">{patternStats.bullishCount}</div>
                  </div>
                  
                  <div className="border rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Bearish</div>
                    <div className="text-lg font-medium text-app-red">{patternStats.bearishCount}</div>
                  </div>
                  
                  <div className="border rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Neutral</div>
                    <div className="text-lg font-medium text-yellow-500">{patternStats.neutralCount}</div>
                  </div>
                </div>
                
                {patternStats.strongestBullish && (
                  <div className="border rounded-lg p-3 mb-2">
                    <div className="flex items-center mb-1">
                      <Circle className="h-2 w-2 fill-app-green text-app-green mr-1" />
                      <div className="text-sm font-medium">Strongest Bullish Pattern</div>
                    </div>
                    <div className="text-sm">
                      {patternStats.strongestBullish.patternType.split('_').map(
                        word => word.charAt(0) + word.slice(1).toLowerCase()
                      ).join(' ')}
                      {patternStats.strongestBullish.level && 
                        ` at $${patternStats.strongestBullish.level.toFixed(2)}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Strength: {Math.round(patternStats.strongestBullish.strength * 100)}%
                    </div>
                  </div>
                )}
                
                {patternStats.strongestBearish && (
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center mb-1">
                      <Circle className="h-2 w-2 fill-app-red text-app-red mr-1" />
                      <div className="text-sm font-medium">Strongest Bearish Pattern</div>
                    </div>
                    <div className="text-sm">
                      {patternStats.strongestBearish.patternType.split('_').map(
                        word => word.charAt(0) + word.slice(1).toLowerCase()
                      ).join(' ')}
                      {patternStats.strongestBearish.level && 
                        ` at $${patternStats.strongestBearish.level.toFixed(2)}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Strength: {Math.round(patternStats.strongestBearish.strength * 100)}%
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="patterns" className="pt-4">
                {patterns.length > 0 ? (
                  <div className="space-y-3">
                    {(showAllPatterns ? patterns : patterns.slice(0, 4)).map((pattern, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "border rounded-lg p-3",
                          pattern.signal === 'bullish' ? "border-app-green/30" :
                          pattern.signal === 'bearish' ? "border-app-red/30" :
                          "border-yellow-500/30"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {pattern.patternType.split('_').map(
                                word => word.charAt(0) + word.slice(1).toLowerCase()
                              ).join(' ')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pattern.description}
                            </div>
                          </div>
                          <div className={cn(
                            "px-2 py-1 text-xs rounded-full",
                            pattern.signal === 'bullish' ? "bg-app-green/20 text-app-green" :
                            pattern.signal === 'bearish' ? "bg-app-red/20 text-app-red" :
                            "bg-yellow-500/20 text-yellow-500"
                          )}>
                            {pattern.signal}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Strength:</span>
                            <span className="ml-1">{Math.round(pattern.strength * 100)}%</span>
                          </div>
                          {pattern.level && (
                            <div>
                              <span className="text-muted-foreground">Level:</span>
                              <span className="ml-1">${pattern.level.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Period:</span>
                            <span className="ml-1">
                              {new Date(pattern.startDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - 
                              {new Date(pattern.endDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {patterns.length > 4 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-2" 
                        onClick={() => setShowAllPatterns(!showAllPatterns)}
                      >
                        {showAllPatterns ? 'Show Less' : `Show All (${patterns.length})`}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No patterns detected for the current timeframe
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="stats" className="pt-4">
                <div className="space-y-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">Pattern Distribution</div>
                    <div className="flex items-center">
                      <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                        {patterns.length > 0 && (
                          <>
                            <div 
                              className="h-full bg-app-green" 
                              style={{ width: `${(patternStats.bullishCount / patterns.length) * 100}%` }}
                            ></div>
                            <div 
                              className="h-full bg-app-red mt-[-20px]" 
                              style={{ 
                                width: `${(patternStats.bearishCount / patterns.length) * 100}%`,
                                marginLeft: `${(patternStats.bullishCount / patterns.length) * 100}%`
                              }}
                            ></div>
                            <div 
                              className="h-full bg-yellow-500 mt-[-20px]" 
                              style={{ 
                                width: `${(patternStats.neutralCount / patterns.length) * 100}%`,
                                marginLeft: `${((patternStats.bullishCount + patternStats.bearishCount) / patterns.length) * 100}%`
                              }}
                            ></div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-app-green rounded-full mr-1"></div>
                        <span>Bullish ({patternStats.bullishCount})</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-app-red rounded-full mr-1"></div>
                        <span>Bearish ({patternStats.bearishCount})</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                        <span>Neutral ({patternStats.neutralCount})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">Pattern Timeline</div>
                    <div className="relative h-40 border-b border-l">
                      {patterns.length > 0 && candlestickData && candlestickData.length > 0 && patterns.map((pattern, index) => {
                        // Get the first date safely
                        const firstDate = safelyGetFirstDate();
                        // Get the last date safely
                        const lastDate = safelyGetLastDate();
                        
                        // Calculate the position only if we have valid dates
                        const dateRange = lastDate.getTime() - firstDate.getTime();
                        if (dateRange <= 0) return null; // Skip if date range is invalid
                        
                        const patternDate = new Date(pattern.endDate).getTime();
                        // Calculate left position as percentage
                        const leftPos = ((patternDate - firstDate.getTime()) / dateRange) * 100;
                        
                        return (
                          <div 
                            key={index}
                            className={cn(
                              "absolute w-4 h-4 rounded-full -ml-2 -mt-2",
                              pattern.signal === 'bullish' ? "bg-app-green" :
                              pattern.signal === 'bearish' ? "bg-app-red" :
                              "bg-yellow-500"
                            )}
                            style={{
                              left: `${leftPos}%`,
                              bottom: `${pattern.strength * 100}%`
                            }}
                            title={`${pattern.patternType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')} - ${Math.round(pattern.strength * 100)}% strength`}
                          ></div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>{candlestickData && candlestickData.length > 0 
                        ? new Date(candlestickData[0].date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
                        : "N/A"}
                      </span>
                      <span>{candlestickData && candlestickData.length > 0 
                        ? new Date(candlestickData[candlestickData.length-1].date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
                        : "N/A"}
                      </span>
                    </div>
                    <div className="text-xs mt-1">
                      <span className="text-muted-foreground">Vertical axis:</span> Pattern strength
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">Top Pattern Types</div>
                    <div className="space-y-2">
                      {Object.entries(
                        patterns.reduce((acc, pattern) => {
                          acc[pattern.patternType] = (acc[pattern.patternType] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      )
                      .sort(([, countA], [, countB]) => countB - countA)
                      .slice(0, 3)
                      .map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <div className="text-sm">
                            {type.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                          </div>
                          <div className="text-sm font-medium">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            {!isDetailView && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    // This would navigate to detailed view in a real app
                    toast({
                      title: 'View Details',
                      description: `Viewing detailed pattern analysis for ${asset.symbol}`
                    });
                  }}
                >
                  View Detailed Pattern Analysis
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PatternDetectionFeatures; 
