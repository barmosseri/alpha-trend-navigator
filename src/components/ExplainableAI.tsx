import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Asset, AIPrediction, TechnicalIndicator } from '@/lib/types';
import { CircleHelp, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart4, LineChart, Bot } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExplainableAIProps {
  asset: Asset;
  prediction: AIPrediction;
  technicalIndicators: TechnicalIndicator[];
  onFeedback?: (feedback: 'accurate' | 'inaccurate') => void;
}

const ExplainableAI: React.FC<ExplainableAIProps> = ({
  asset,
  prediction,
  technicalIndicators,
  onFeedback
}) => {
  const [explainTab, setExplainTab] = useState<string>('prediction');
  const [featureImportance, setFeatureImportance] = useState<Record<string, number>>({
    'price_momentum': 0.35,
    'volume_trend': 0.20,
    'volatility': 0.15,
    'news_sentiment': 0.15,
    'technical_indicators': 0.10,
    'market_trend': 0.05
  });
  
  // Calculate a confidence bar based on prediction probability
  const confidencePercentage = Math.round(prediction.probability * 100);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            Explainable AI
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="h-4 w-4 ml-2 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-80">
                    This section explains how our AI system arrived at its prediction, 
                    the factors that influenced it, and allows you to provide feedback to improve future predictions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <Bot className="h-5 w-5 text-app-blue" />
        </div>
        <CardDescription>
          Understanding how our AI reached its {asset.recommendation} recommendation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={explainTab} onValueChange={setExplainTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="prediction">Prediction</TabsTrigger>
            <TabsTrigger value="factors">Key Factors</TabsTrigger>
            <TabsTrigger value="signals">Technical Signals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="prediction" className="space-y-4">
            <div className="flex items-center justify-center">
              <div className={cn(
                "w-28 h-28 rounded-full flex items-center justify-center text-white font-bold text-2xl",
                prediction.expectedMove > 0 ? 
                  (prediction.probability > 0.7 ? "bg-app-green" : "bg-emerald-400") : 
                  (prediction.probability > 0.7 ? "bg-app-red" : "bg-rose-400")
              )}>
                {prediction.expectedMove > 0 ? "+" : ""}{prediction.expectedMove.toFixed(1)}%
              </div>
            </div>
            
            <div className="text-center mb-4">
              <div className="text-lg font-medium">Price Target: ${prediction.targetPrice.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Within {prediction.timeframe} timeframe</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>AI Confidence</span>
                <span className="font-medium">{confidencePercentage}%</span>
              </div>
              <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
                <div 
                  className={cn(
                    "h-full",
                    confidencePercentage > 70 ? "bg-app-green" : 
                    confidencePercentage > 50 ? "bg-yellow-500" : "bg-app-red"
                  )}
                  style={{ width: `${confidencePercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Confidence</span>
                <span>High Confidence</span>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Key Price Levels</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-2">
                  <div className="text-xs text-muted-foreground">Support Levels</div>
                  <div className="space-y-1 mt-1">
                    {prediction.supportLevels.map((level, index) => (
                      <div key={index} className="flex items-center">
                        <ArrowUpRight className="h-3 w-3 text-app-green mr-1" />
                        <span className="text-sm">${level.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border rounded-lg p-2">
                  <div className="text-xs text-muted-foreground">Resistance Levels</div>
                  <div className="space-y-1 mt-1">
                    {prediction.resistanceLevels.map((level, index) => (
                      <div key={index} className="flex items-center">
                        <ArrowDownRight className="h-3 w-3 text-app-red mr-1" />
                        <span className="text-sm">${level.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="factors" className="space-y-4">
            <div className="text-sm mb-3">
              Feature importance in prediction model
            </div>
            
            {Object.entries(featureImportance).map(([feature, importance]) => (
              <div key={feature} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{feature.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                  <span>{(importance * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
                  <div 
                    className="h-full bg-app-blue"
                    style={{ width: `${importance * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            
            <div className="border rounded-lg p-3 mt-4">
              <div className="text-sm font-medium mb-2">Feature Explanation</div>
              <div className="text-sm">
                <p className="mb-2">
                  The AI model analyzes multiple factors to generate predictions. 
                  Price momentum (35%) and volume trends (20%) have the strongest impact on our prediction.
                </p>
                <p>
                  For {asset.symbol}, {
                    prediction.expectedMove > 0 
                      ? "positive price momentum and increasing trading volume are the key drivers behind our bullish outlook."
                      : "declining price momentum and decreasing trading volume contribute to our bearish outlook."
                  }
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="signals" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {technicalIndicators.map((indicator, index) => (
                <div key={index} className="border rounded-lg p-2">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">{indicator.name}</div>
                    <div className={cn(
                      "text-xs rounded-full px-2 py-0.5",
                      indicator.signal === 'bullish' ? "bg-app-green/20 text-app-green" :
                      indicator.signal === 'bearish' ? "bg-app-red/20 text-app-red" :
                      "bg-yellow-500/20 text-yellow-500"
                    )}>
                      {indicator.signal}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-sm font-mono">{indicator.value.toFixed(2)}</div>
                    {indicator.signal === 'bullish' ? (
                      <TrendingUp className="h-3 w-3 text-app-green ml-1" />
                    ) : indicator.signal === 'bearish' ? (
                      <TrendingDown className="h-3 w-3 text-app-red ml-1" />
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {
                      indicator.name === 'RSI' ? 
                        indicator.value > 70 ? "Overbought condition" : 
                        indicator.value < 30 ? "Oversold condition" : "Neutral range" :
                      indicator.name === 'MACD' ?
                        indicator.value > 0 ? "Above signal line" : "Below signal line" :
                      indicator.name === 'Bollinger Bands' ?
                        indicator.value > 1 ? "Above upper band" : 
                        indicator.value < 0 ? "Below lower band" : "Within bands" :
                      "Technical signal"
                    }
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border rounded-lg p-3 mt-2">
              <div className="text-sm font-medium mb-2">Signal Analysis</div>
              <div className="text-sm">
                <p>
                  {
                    technicalIndicators.filter(i => i.signal === 'bullish').length > 
                    technicalIndicators.filter(i => i.signal === 'bearish').length ?
                      `Technical indicators are predominantly bullish for ${asset.symbol}, reinforcing our overall positive outlook.` :
                      `Technical indicators are predominantly bearish for ${asset.symbol}, contributing to our cautious outlook.`
                  }
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Was this prediction helpful?
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onFeedback && onFeedback('inaccurate')}
          >
            Not Helpful
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => onFeedback && onFeedback('accurate')}
          >
            Helpful
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ExplainableAI; 