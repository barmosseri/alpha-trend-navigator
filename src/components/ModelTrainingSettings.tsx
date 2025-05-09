import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DataSource, PatternType } from '@/lib/types';
import { Bot, RefreshCw, Database, Code, BarChart, Save, Server, Newspaper, Rss } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface ModelTrainingSettingsProps {
  onTrainComplete?: () => void;
}

const ModelTrainingSettings: React.FC<ModelTrainingSettingsProps> = ({ onTrainComplete }) => {
  const [selectedTab, setSelectedTab] = useState<string>('sources');
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [trainingStatus, setTrainingStatus] = useState<string>('');
  
  // Data sources configuration
  const [dataSources, setDataSources] = useState<Record<string, boolean>>({
    'stooq': true,
    'finnhub': true,
    'investing': true,
    'bitbo': false,
    'marketwatch': false,
    'nasdaq': false,
    'cointelegraph': false,
    'coindesk': false
  });
  
  // RSS sources configuration
  const [rssSources, setRssSources] = useState<Record<string, boolean>>({
    'marketwatch': true,
    'nasdaq': true,
    'yahoo_finance': true,
    'investing': true,
    'coindesk': false,
    'cointelegraph': false,
    'bloomberg': false,
    'cnbc': false,
    'reuters': false
  });
  
  // RSS learning parameters
  const [rssLearningParams, setRssLearningParams] = useState({
    includeHistoricalNews: true,
    maxNewsAge: 30, // days
    sentimentWeight: 0.7,
    patternMentionWeight: 0.8,
    symbolRelevanceThreshold: 0.5,
    continuousLearning: true,
    updateFrequency: 12, // hours
    useNaturalLanguageProcessing: true
  });
  
  // Learning parameters
  const [learningParams, setLearningParams] = useState({
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
    dropout: 0.2,
    validationSplit: 0.2
  });
  
  // Pattern weights (how much each pattern type influences the final prediction)
  const [patternWeights, setPatternWeights] = useState<Record<PatternType, number>>({
    'HEAD_AND_SHOULDERS': 0.8,
    'DOUBLE_TOP': 0.8,
    'DOUBLE_BOTTOM': 0.8,
    'ASCENDING_TRIANGLE': 0.7,
    'DESCENDING_TRIANGLE': 0.7,
    'SYMMETRICAL_TRIANGLE': 0.6,
    'FLAG': 0.5,
    'PENNANT': 0.5,
    'WEDGE': 0.6,
    'CUP_AND_HANDLE': 0.7,
    'SUPPORT': 0.5,
    'RESISTANCE': 0.5
  });
  
  // Mock available data sources
  const availableDataSources: DataSource[] = [
    {
      name: 'Stooq',
      url: 'https://stooq.com/db/h/',
      type: 'stock',
      description: 'Historical stock market data in CSV format'
    },
    {
      name: 'Finnhub',
      url: 'https://finnhub.io/',
      apiKey: 'YOUR_FINNHUB_API_KEY',
      type: 'both',
      description: 'Real-time market data API for stocks and crypto'
    },
    {
      name: 'Investing.com',
      url: 'https://www.investing.com/crypto/bitcoin/historical-data',
      type: 'crypto',
      description: 'Historical cryptocurrency prices and data'
    },
    {
      name: 'Bitbo.io',
      url: 'https://charts.bitbo.io/price/',
      type: 'crypto',
      description: 'Bitcoin market data and metrics'
    },
    {
      name: 'MarketWatch',
      url: 'https://www.marketwatch.com/site/rss',
      type: 'both',
      description: 'Financial news and market data via RSS feeds'
    },
    {
      name: 'Nasdaq',
      url: 'https://www.nasdaq.com/nasdaq-RSS-Feeds',
      type: 'both',
      description: 'Stock and crypto market news via RSS feeds'
    },
    {
      name: 'CoinTelegraph',
      url: 'https://cointelegraph.com/rss-feeds',
      type: 'crypto',
      description: 'Cryptocurrency news and analysis via RSS'
    },
    {
      name: 'CoinDesk',
      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      type: 'crypto',
      description: 'Cryptocurrency news and price data'
    }
  ];
  
  // RSS news sources
  const availableRssSources = [
    { id: 'marketwatch', name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories' },
    { id: 'nasdaq', name: 'Nasdaq', url: 'https://www.nasdaq.com/feed/rssoutbound' },
    { id: 'yahoo_finance', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/rss/' },
    { id: 'investing', name: 'Investing.com', url: 'https://www.investing.com/rss/news.rss' },
    { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { id: 'cointelegraph', name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
    { id: 'bloomberg', name: 'Bloomberg', url: 'https://www.bloomberg.com/feeds/sitemap_news.xml' },
    { id: 'cnbc', name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
    { id: 'reuters', name: 'Reuters', url: 'https://www.reutersagency.com/feed/' },
  ];
  
  // Toggle data source
  const toggleDataSource = (source: string) => {
    setDataSources({
      ...dataSources,
      [source]: !dataSources[source]
    });
  };
  
  // Toggle RSS source
  const toggleRssSource = (source: string) => {
    setRssSources({
      ...rssSources,
      [source]: !rssSources[source]
    });
  };
  
  // Update learning parameter
  const updateLearningParam = (param: string, value: number | number[]) => {
    const actualValue = Array.isArray(value) ? value[0] : value;
    setLearningParams({
      ...learningParams,
      [param]: actualValue
    });
  };
  
  // Update RSS learning parameter
  const updateRssLearningParam = (param: string, value: number | number[] | boolean) => {
    setRssLearningParams({
      ...rssLearningParams,
      [param]: value
    });
  };
  
  // Update pattern weight
  const updatePatternWeight = (pattern: PatternType, value: number[]) => {
    setPatternWeights({
      ...patternWeights,
      [pattern]: value[0]
    });
  };
  
  // Simulate training process
  const startTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingStatus('Initializing training...');
    
    // Count enabled data sources
    const enabledSourcesCount = Object.values(dataSources).filter(Boolean).length;
    const enabledRssSources = Object.values(rssSources).filter(Boolean).length;
    
    if (enabledSourcesCount === 0) {
      toast({
        title: 'Training Error',
        description: 'Please enable at least one data source before training.',
        variant: 'destructive'
      });
      setIsTraining(false);
      return;
    }
    
    // Check if API keys are configured
    const finnhubAPIKey = availableDataSources.find(s => s.name === 'Finnhub')?.apiKey || '';
    if (finnhubAPIKey === 'YOUR_FINNHUB_API_KEY' || finnhubAPIKey === '') {
      toast({
        title: 'API Key Missing',
        description: 'Please configure your API keys in the Settings > API Keys section before training.',
        variant: 'destructive'
      });
      setIsTraining(false);
      return;
    }
    
    try {
      // Simulate the training process with progress updates
      if (enabledRssSources > 0) {
        await simulateTrainingStep('Fetching and parsing RSS feeds...', 0, 15);
        await simulateTrainingStep('Analyzing news sentiment...', 15, 25);
        await simulateTrainingStep('Extracting pattern mentions from news...', 25, 35);
      }
      
      await simulateTrainingStep('Fetching historical market data...', enabledRssSources > 0 ? 35 : 0, 50);
      await simulateTrainingStep('Preprocessing and cleaning data...', 50, 60);
      await simulateTrainingStep('Extracting features and patterns...', 60, 75);
      await simulateTrainingStep('Training model...', 75, 90);
      await simulateTrainingStep('Validating and fine-tuning...', 90, 100);
      
      // Complete
      setTrainingStatus('Training complete!');
      
      // Notify success with appropriate message
      toast({
        title: 'Training Complete',
        description: enabledRssSources > 0 
          ? 'The pattern detection model has been successfully trained and fine-tuned with market data and RSS news content.'
          : 'The pattern detection model has been successfully trained and fine-tuned with the selected data sources.',
      });
      
      // Notify parent component
      if (onTrainComplete) {
        onTrainComplete();
      }
    } catch (error) {
      console.error('Training error:', error);
      toast({
        title: 'Training Error',
        description: 'An error occurred during model training. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setTimeout(() => {
        setIsTraining(false);
      }, 1000);
    }
  };
  
  // Helper to simulate a training step
  const simulateTrainingStep = async (status: string, startProgress: number, endProgress: number) => {
    setTrainingStatus(status);
    const duration = 1000 + Math.random() * 2000; // Random duration between 1-3 seconds
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    return new Promise<void>((resolve) => {
      const updateProgress = () => {
        const currentTime = Date.now();
        const progress = startProgress + 
          ((currentTime - startTime) / duration) * (endProgress - startProgress);
        
        if (currentTime >= endTime) {
          setTrainingProgress(endProgress);
          resolve();
        } else {
          setTrainingProgress(progress);
          requestAnimationFrame(updateProgress);
        }
      };
      
      updateProgress();
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Bot className="h-5 w-5 mr-2 text-app-blue" />
            Pattern Recognition Training
          </CardTitle>
        </div>
        <CardDescription>
          Configure and train the AI pattern detection model
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="sources">Data Sources</TabsTrigger>
            <TabsTrigger value="rss">
              <Rss className="h-4 w-4 mr-2" />
              RSS Learning
            </TabsTrigger>
            <TabsTrigger value="parameters">Learning Parameters</TabsTrigger>
            <TabsTrigger value="patterns">Pattern Weights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sources" className="space-y-4">
            <div className="text-sm mb-2">
              Select data sources for training the pattern detection model
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableDataSources.map((source) => (
                <div key={source.name.toLowerCase()} className="flex items-center justify-between space-x-2 border rounded-lg p-3">
                  <div className="flex-1">
                    <div className="font-medium">{source.name}</div>
                    <div className="text-xs text-muted-foreground">{source.description}</div>
                    <div className="flex items-center mt-1">
                      <div className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        source.type === 'stock' ? "bg-app-blue/20 text-app-blue" :
                        source.type === 'crypto' ? "bg-app-green/20 text-app-green" :
                        "bg-purple-500/20 text-purple-500"
                      )}>
                        {source.type === 'both' ? 'STOCK & CRYPTO' : source.type.toUpperCase()}
                      </div>
                      {source.apiKey && (
                        <div className="text-xs ml-2 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                          API KEY
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Switch
                    id={`source-${source.name.toLowerCase()}`}
                    checked={dataSources[source.name.toLowerCase()]}
                    onCheckedChange={() => toggleDataSource(source.name.toLowerCase())}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="rss" className="space-y-6">
            <div className="text-sm mb-2">
              Configure RSS feed sources and learning parameters for news-based fine-tuning
            </div>
            
            <div className="border rounded-lg p-4 bg-blue-500/10 border-blue-500/20 mb-4">
              <div className="flex items-start">
                <Newspaper className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                <div>
                  <h4 className="font-medium text-blue-500">RSS News Learning</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The system will parse RSS feeds, extract pattern mentions, analyze sentiment, and use this 
                    information to fine-tune pattern detection models. This creates a comprehensive learning 
                    system that combines technical analysis with news-based insights.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="font-medium">RSS News Sources</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableRssSources.map((source) => (
                  <div key={source.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`rss-${source.id}`}
                      checked={rssSources[source.id]}
                      onCheckedChange={() => toggleRssSource(source.id)}
                    />
                    <Label htmlFor={`rss-${source.id}`} className="text-sm font-medium">
                      {source.name}
                    </Label>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="font-medium">RSS Learning Configuration</div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="includeHistoricalNews" className="text-sm font-medium">
                      Include Historical News
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Train on archived news data in addition to recent articles
                    </p>
                  </div>
                  <Switch
                    id="includeHistoricalNews"
                    checked={rssLearningParams.includeHistoricalNews}
                    onCheckedChange={(checked) => updateRssLearningParam('includeHistoricalNews', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="maxNewsAge">Maximum News Age (Days)</Label>
                    <span className="text-sm font-medium">{rssLearningParams.maxNewsAge}</span>
                  </div>
                  <Slider
                    id="maxNewsAge"
                    min={1}
                    max={90}
                    step={1}
                    value={[rssLearningParams.maxNewsAge]}
                    onValueChange={(v) => updateRssLearningParam('maxNewsAge', v[0])}
                    disabled={!rssLearningParams.includeHistoricalNews}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="sentimentWeight">Sentiment Analysis Weight</Label>
                    <span className="text-sm font-medium">{rssLearningParams.sentimentWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="sentimentWeight"
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={[rssLearningParams.sentimentWeight]}
                    onValueChange={(v) => updateRssLearningParam('sentimentWeight', v[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    How much news sentiment should influence pattern detection
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="patternMentionWeight">Pattern Mention Weight</Label>
                    <span className="text-sm font-medium">{rssLearningParams.patternMentionWeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    id="patternMentionWeight"
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={[rssLearningParams.patternMentionWeight]}
                    onValueChange={(v) => updateRssLearningParam('patternMentionWeight', v[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Impact of pattern mentions in news on detection confidence
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="continuousLearning" className="text-sm font-medium">
                      Continuous Learning
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically update model as new RSS content arrives
                    </p>
                  </div>
                  <Switch
                    id="continuousLearning"
                    checked={rssLearningParams.continuousLearning}
                    onCheckedChange={(checked) => updateRssLearningParam('continuousLearning', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="updateFrequency">Update Frequency (Hours)</Label>
                    <span className="text-sm font-medium">{rssLearningParams.updateFrequency}</span>
                  </div>
                  <Slider
                    id="updateFrequency"
                    min={1}
                    max={24}
                    step={1}
                    value={[rssLearningParams.updateFrequency]}
                    onValueChange={(v) => updateRssLearningParam('updateFrequency', v[0])}
                    disabled={!rssLearningParams.continuousLearning}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="useNLP" className="text-sm font-medium">
                      Use Natural Language Processing
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Apply advanced NLP techniques for better text understanding
                    </p>
                  </div>
                  <Switch
                    id="useNLP"
                    checked={rssLearningParams.useNaturalLanguageProcessing}
                    onCheckedChange={(checked) => updateRssLearningParam('useNaturalLanguageProcessing', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="parameters" className="space-y-6">
            <div className="text-sm mb-2">
              Configure the learning parameters for the model
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="epochs">Training Epochs</Label>
                  <span className="text-sm font-medium">{learningParams.epochs}</span>
                </div>
                <Slider
                  id="epochs"
                  min={50}
                  max={500}
                  step={10}
                  value={[learningParams.epochs]}
                  onValueChange={(v) => updateLearningParam('epochs', v)}
                />
                <div className="text-xs text-muted-foreground">
                  Number of complete passes through the training dataset
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <span className="text-sm font-medium">{learningParams.batchSize}</span>
                </div>
                <Slider
                  id="batchSize"
                  min={8}
                  max={128}
                  step={8}
                  value={[learningParams.batchSize]}
                  onValueChange={(v) => updateLearningParam('batchSize', v)}
                />
                <div className="text-xs text-muted-foreground">
                  Number of samples processed before model weights are updated
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="learningRate">Learning Rate</Label>
                  <span className="text-sm font-medium">{learningParams.learningRate}</span>
                </div>
                <Slider
                  id="learningRate"
                  min={0.0001}
                  max={0.01}
                  step={0.0001}
                  value={[learningParams.learningRate]}
                  onValueChange={(v) => updateLearningParam('learningRate', v)}
                />
                <div className="text-xs text-muted-foreground">
                  Step size for weight updates during training
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="dropout">Dropout Rate</Label>
                  <span className="text-sm font-medium">{learningParams.dropout}</span>
                </div>
                <Slider
                  id="dropout"
                  min={0}
                  max={0.5}
                  step={0.05}
                  value={[learningParams.dropout]}
                  onValueChange={(v) => updateLearningParam('dropout', v)}
                />
                <div className="text-xs text-muted-foreground">
                  Regularization parameter to prevent overfitting
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="validationSplit">Validation Split</Label>
                  <span className="text-sm font-medium">{(learningParams.validationSplit * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  id="validationSplit"
                  min={0.1}
                  max={0.4}
                  step={0.05}
                  value={[learningParams.validationSplit]}
                  onValueChange={(v) => updateLearningParam('validationSplit', v)}
                />
                <div className="text-xs text-muted-foreground">
                  Portion of data used for validation during training
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="patterns" className="space-y-4">
            <div className="text-sm mb-2">
              Adjust the influence weight of each pattern type on predictions
            </div>
            
            <div className="space-y-3">
              {(Object.keys(patternWeights) as PatternType[]).map((pattern) => (
                <div key={pattern} className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor={`pattern-${pattern}`}>
                      {pattern.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                    </Label>
                    <span className="text-sm font-medium">{patternWeights[pattern]}</span>
                  </div>
                  <Slider
                    id={`pattern-${pattern}`}
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={[patternWeights[pattern]]}
                    onValueChange={(v) => updatePatternWeight(pattern, v)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Training status */}
        {isTraining && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{trainingStatus}</span>
                <span>{Math.round(trainingProgress)}%</span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={startTraining} 
          disabled={isTraining}
        >
          {isTraining ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Training in Progress...
            </>
          ) : (
            <>
              <Server className="h-4 w-4 mr-2" />
              Train Pattern Recognition Model
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ModelTrainingSettings; 