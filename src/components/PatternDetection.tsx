
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PatternResult, CandlestickData, Asset } from '@/lib/types';
import { detectPatterns } from '@/services/patternDetectionService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Flag, 
  Triangle, 
  LineChart, 
  AlertCircle, 
  Info,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import tooltips
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PatternDetectionProps {
  asset: Asset;
  candlestickData: CandlestickData[];
  onPatternSelect?: (pattern: PatternResult) => void;
}

const PatternDetection: React.FC<PatternDetectionProps> = ({
  asset,
  candlestickData,
  onPatternSelect
}) => {
  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  useEffect(() => {
    loadPatterns();
  }, [asset.symbol, candlestickData]);
  
  const loadPatterns = async () => {
    if (!asset || candlestickData.length === 0) return;
    
    setIsLoading(true);
    try {
      const detectedPatterns = await detectPatterns(asset, candlestickData);
      setPatterns(detectedPatterns);
    } catch (error) {
      console.error('Error detecting patterns:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = () => {
    loadPatterns();
  };
  
  const getPatternIcon = (patternType: string) => {
    switch (patternType) {
      case 'HEAD_AND_SHOULDERS':
      case 'DOUBLE_TOP':
        return <TrendingDown className="h-4 w-4 text-app-red" />;
      case 'DOUBLE_BOTTOM':
      case 'CUP_AND_HANDLE':
        return <TrendingUp className="h-4 w-4 text-app-green" />;
      case 'ASCENDING_TRIANGLE':
      case 'DESCENDING_TRIANGLE':
      case 'SYMMETRICAL_TRIANGLE':
        return <Triangle className="h-4 w-4 text-app-blue" />;
      case 'FLAG':
      case 'PENNANT':
        return <Flag className="h-4 w-4 text-yellow-500" />;
      case 'SUPPORT':
        return <LineChart className="h-4 w-4 text-app-green" />;
      case 'RESISTANCE':
        return <LineChart className="h-4 w-4 text-app-red" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getPatternDescription = (pattern: PatternResult) => {
    return (
      <div className="space-y-2">
        <p>{pattern.description}</p>
        
        <div className="text-sm">
          <span className="font-medium">Signal:</span> 
          <span className={cn(
            "ml-1",
            pattern.signal === 'bullish' ? "text-app-green" : 
            pattern.signal === 'bearish' ? "text-app-red" : 
            "text-muted-foreground"
          )}>
            {pattern.signal.charAt(0).toUpperCase() + pattern.signal.slice(1)}
          </span>
        </div>
        
        <div className="text-sm">
          <span className="font-medium">Strength:</span> 
          <span className="ml-1">{Math.round(pattern.strength * 100)}%</span>
        </div>
        
        {pattern.level && (
          <div className="text-sm">
            <span className="font-medium">Price Level:</span> 
            <span className="ml-1">${pattern.level.toFixed(2)}</span>
          </div>
        )}
        
        <div className="text-sm">
          <span className="font-medium">Timeframe:</span> 
          <span className="ml-1">{formatDate(pattern.startDate)} - {formatDate(pattern.endDate)}</span>
        </div>
      </div>
    );
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Filter patterns based on active tab
  const filteredPatterns = activeTab === 'all' 
    ? patterns 
    : activeTab === 'bullish'
      ? patterns.filter(p => p.signal === 'bullish')
      : activeTab === 'bearish'
        ? patterns.filter(p => p.signal === 'bearish')
        : patterns.filter(p => p.patternType === activeTab);
  
  // Group patterns by type
  const patternCounts: Record<string, number> = {};
  patterns.forEach(pattern => {
    patternCounts[pattern.patternType] = (patternCounts[pattern.patternType] || 0) + 1;
  });
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Chart Pattern Detection</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <CardDescription>
          AI-powered technical pattern recognition
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="bullish">Bullish</TabsTrigger>
            <TabsTrigger value="bearish">Bearish</TabsTrigger>
            <TabsTrigger value="SUPPORT">Support/Res</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            {isLoading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-app-blue rounded-full border-muted animate-spin"></div>
              </div>
            ) : filteredPatterns.length > 0 ? (
              <div className="space-y-4">
                {filteredPatterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
                      onClick={() => onPatternSelect && onPatternSelect(pattern)}
                    >
                      <div className="flex items-center">
                        {getPatternIcon(pattern.patternType)}
                        <span className="font-medium ml-2">
                          {pattern.patternType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                        </span>
                        <Badge className={cn(
                          "ml-2",
                          pattern.signal === 'bullish' ? "bg-app-green hover:bg-app-green/90" : 
                          pattern.signal === 'bearish' ? "bg-app-red hover:bg-app-red/90" : 
                          "bg-secondary hover:bg-secondary/90"
                        )}>
                          {pattern.signal}
                        </Badge>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="w-80 p-4">
                            {getPatternDescription(pattern)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No patterns detected
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="bullish">
            {!isLoading && filteredPatterns.length > 0 ? (
              <div className="space-y-4">
                {filteredPatterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
                      onClick={() => onPatternSelect && onPatternSelect(pattern)}
                    >
                      <div className="flex items-center">
                        {getPatternIcon(pattern.patternType)}
                        <span className="font-medium ml-2">
                          {pattern.patternType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                        </span>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="w-80 p-4">
                            {getPatternDescription(pattern)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No bullish patterns detected
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="bearish">
            {!isLoading && filteredPatterns.length > 0 ? (
              <div className="space-y-4">
                {filteredPatterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
                      onClick={() => onPatternSelect && onPatternSelect(pattern)}
                    >
                      <div className="flex items-center">
                        {getPatternIcon(pattern.patternType)}
                        <span className="font-medium ml-2">
                          {pattern.patternType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                        </span>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="w-80 p-4">
                            {getPatternDescription(pattern)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No bearish patterns detected
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="SUPPORT">
            {!isLoading && filteredPatterns.length > 0 ? (
              <div className="space-y-4">
                {filteredPatterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
                      onClick={() => onPatternSelect && onPatternSelect(pattern)}
                    >
                      <div className="flex items-center">
                        {getPatternIcon(pattern.patternType)}
                        <span className="font-medium ml-2">
                          {pattern.patternType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                        </span>
                        {pattern.level && (
                          <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                            ${pattern.level.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="w-80 p-4">
                            {getPatternDescription(pattern)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No support/resistance levels detected
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <Separator />
      <CardFooter className="pt-4">
        <div className="w-full">
          <div className="text-sm font-medium mb-2">Pattern Distribution</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(patternCounts).map(([type, count]) => (
              <div 
                key={type}
                className="flex items-center justify-between text-xs p-1 rounded hover:bg-accent cursor-pointer"
                onClick={() => setActiveTab(type)}
              >
                <div className="flex items-center">
                  {getPatternIcon(type)}
                  <span className="ml-1">{type.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}</span>
                </div>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PatternDetection;
