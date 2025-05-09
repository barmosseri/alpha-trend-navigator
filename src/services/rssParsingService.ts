import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { NewsItem } from '@/lib/types';

// Configuration for RSS feeds
const RSS_SOURCES = {
  MARKET_WATCH: 'https://www.marketwatch.com/rss/topstories',
  NASDAQ: 'https://www.nasdaq.com/feed/rssoutbound?symbol=',
  COIN_TELEGRAPH: 'https://cointelegraph.com/rss',
  COIN_DESK: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  INVESTING: 'https://www.investing.com/rss/news.rss',
  YAHOO_FINANCE: 'https://finance.yahoo.com/rss/'
};

// Data structure for training
interface RSSTrainingData {
  title: string;
  content: string;
  publishDate: string;
  symbols: string[];
  sentimentScore?: number;
  relevanceScore?: number;
  extractedPatterns?: string[];
}

// Cache for processed RSS data
const rssCache = new Map<string, {
  timestamp: number,
  data: RSSTrainingData[]
}>();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

/**
 * Fetches and parses RSS feeds from multiple sources
 */
export const fetchAndParseRSSFeeds = async (
  symbol: string,
  includeGeneral: boolean = true
): Promise<RSSTrainingData[]> => {
  const cacheKey = `${symbol}-${includeGeneral}`;
  const cached = rssCache.get(cacheKey);
  
  // Return cached data if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.data;
  }
  
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const rssSources = [];
    
    // Add symbol-specific feeds
    rssSources.push(`${RSS_SOURCES.NASDAQ}${symbol}`);
    rssSources.push(`${RSS_SOURCES.YAHOO_FINANCE}${symbol}`);
    
    // Add general market feeds if requested
    if (includeGeneral) {
      rssSources.push(RSS_SOURCES.MARKET_WATCH);
      
      // Add crypto-specific sources for crypto symbols
      if (symbol === 'BTC' || symbol === 'ETH' || symbol.includes('COIN')) {
        rssSources.push(RSS_SOURCES.COIN_TELEGRAPH);
        rssSources.push(RSS_SOURCES.COIN_DESK);
      }
      
      rssSources.push(RSS_SOURCES.INVESTING);
    }
    
    // Fetch all RSS feeds in parallel
    const rssPromises = rssSources.map(url => 
      axios.get(url, { timeout: 5000 })
        .catch(err => {
          console.warn(`Failed to fetch RSS from ${url}:`, err.message);
          return { data: null };
        })
    );
    
    const responses = await Promise.all(rssPromises);
    
    // Parse and combine all RSS data
    const allTrainingData: RSSTrainingData[] = [];
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (!response.data) continue;
      
      try {
        const parsed = parser.parse(response.data);
        
        // Handle different RSS formats
        const items = parsed.rss?.channel?.item || 
                     parsed.feed?.entry || 
                     [];
        
        if (!Array.isArray(items)) continue;
        
        // Process each item
        for (const item of items) {
          const title = item.title || '';
          const content = item.description || item.content || item['content:encoded'] || '';
          const publishDate = item.pubDate || item.published || item.date || new Date().toISOString();
          
          // Extract mentioned symbols using regex
          const symbolRegex = /\$([A-Z]{1,5})\b|\b([A-Z]{2,5})\b(?=\s+(?:stock|share|token|coin|crypto))/g;
          const matches = [...content.matchAll(symbolRegex)];
          const mentionedSymbols = matches.map(match => match[1] || match[2]);
          
          // Include the main symbol we're searching for
          const symbols = Array.from(new Set([symbol, ...mentionedSymbols]));
          
          allTrainingData.push({
            title,
            content: stripHtml(content),
            publishDate,
            symbols
          });
        }
      } catch (error) {
        console.error('Error parsing RSS feed:', error);
      }
    }
    
    // Process the training data - add sentiment and relevance scoring
    const processedData = await processRSSForTraining(allTrainingData, symbol);
    
    // Cache the processed data
    rssCache.set(cacheKey, {
      timestamp: Date.now(),
      data: processedData
    });
    
    return processedData;
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    return [];
  }
};

/**
 * Process RSS data for model training - adds sentiment analysis
 * and relevance scoring
 */
const processRSSForTraining = async (
  data: RSSTrainingData[],
  targetSymbol: string
): Promise<RSSTrainingData[]> => {
  return data.map(item => {
    // Basic sentiment analysis
    const sentimentScore = calculateSentiment(item.content);
    
    // Calculate relevance to the target symbol
    const relevanceScore = calculateRelevance(item, targetSymbol);
    
    // Extract potential patterns mentioned in the content
    const extractedPatterns = extractPatterns(item.content);
    
    return {
      ...item,
      sentimentScore,
      relevanceScore,
      extractedPatterns
    };
  });
};

/**
 * Converts RSS data to NewsItems for the UI
 */
export const convertRSSToNewsItems = (rssData: RSSTrainingData[]): NewsItem[] => {
  return rssData.map(item => ({
    title: item.title,
    source: extractSourceFromContent(item.content) || 'RSS',
    url: '#', // In a real implementation, we would extract the URL from the RSS item
    publishedAt: item.publishDate,
    sentiment: getSentimentLabel(item.sentimentScore || 0)
  }));
};

/**
 * Basic sentiment analysis function
 * In a real app, this would use a proper NLP library or API
 */
const calculateSentiment = (text: string): number => {
  const positiveWords = ['increase', 'gain', 'growth', 'positive', 'up', 'rise', 'bullish', 'outperform'];
  const negativeWords = ['decrease', 'loss', 'decline', 'negative', 'down', 'fall', 'bearish', 'underperform'];
  
  let score = 0;
  const lowerText = text.toLowerCase();
  
  // Count positive and negative words
  for (const word of positiveWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) score += matches.length;
  }
  
  for (const word of negativeWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) score -= matches.length;
  }
  
  // Normalize to range between -1 and 1
  const normalized = Math.max(-1, Math.min(1, score / 10));
  return normalized;
};

/**
 * Calculate relevance of news item to target symbol
 */
const calculateRelevance = (item: RSSTrainingData, targetSymbol: string): number => {
  let score = 0;
  
  // Check if target symbol is in symbols array
  if (item.symbols.includes(targetSymbol)) {
    score += 0.5;
  }
  
  // Check if target symbol is mentioned in title (higher weight)
  if (item.title.includes(targetSymbol)) {
    score += 0.3;
  }
  
  // Check frequency of symbol mentions in content
  const symbolRegex = new RegExp(`\\b${targetSymbol}\\b`, 'gi');
  const matches = item.content.match(symbolRegex);
  if (matches) {
    score += Math.min(0.2, matches.length * 0.05);
  }
  
  return Math.min(1, score);
};

/**
 * Extract potential pattern mentions from text
 */
const extractPatterns = (text: string): string[] => {
  const patterns = [
    'head and shoulders',
    'double top',
    'double bottom',
    'triangle',
    'ascending triangle',
    'descending triangle',
    'symmetrical triangle',
    'flag',
    'pennant',
    'wedge',
    'cup and handle',
    'support',
    'resistance'
  ];
  
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const pattern of patterns) {
    if (lowerText.includes(pattern)) {
      found.push(pattern);
    }
  }
  
  return found;
};

/**
 * Convert sentiment score to label
 */
const getSentimentLabel = (score: number): 'positive' | 'negative' | 'neutral' => {
  if (score > 0.2) return 'positive';
  if (score < -0.2) return 'negative';
  return 'neutral';
};

/**
 * Extract likely source from content
 */
const extractSourceFromContent = (content: string): string | null => {
  // This is a simplified implementation
  const sourceIndicators = [
    { pattern: 'marketwatch', source: 'MarketWatch' },
    { pattern: 'nasdaq.com', source: 'Nasdaq' },
    { pattern: 'yahoo', source: 'Yahoo Finance' },
    { pattern: 'coindesk', source: 'CoinDesk' },
    { pattern: 'cointelegraph', source: 'CoinTelegraph' },
    { pattern: 'investing.com', source: 'Investing.com' },
    { pattern: 'bloomberg', source: 'Bloomberg' },
    { pattern: 'cnbc', source: 'CNBC' },
    { pattern: 'reuters', source: 'Reuters' },
  ];
  
  for (const { pattern, source } of sourceIndicators) {
    if (content.toLowerCase().includes(pattern)) {
      return source;
    }
  }
  
  return null;
};

/**
 * Remove HTML tags from text
 */
const stripHtml = (html: string): string => {
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};

/**
 * Prepare RSS data for model training
 */
export const prepareRSSDataForTraining = async (symbol: string): Promise<any> => {
  const rssData = await fetchAndParseRSSFeeds(symbol, true);
  
  // Filter for relevance
  const relevantItems = rssData.filter(item => item.relevanceScore && item.relevanceScore > 0.5);
  
  // Extract features for training
  return relevantItems.map(item => ({
    text: item.title + ' ' + item.content,
    sentiment: item.sentimentScore || 0,
    patterns: item.extractedPatterns || [],
    date: new Date(item.publishDate).getTime(),
    symbol
  }));
};

/**
 * Integrate RSS learning with pattern detection
 */
export const enhancePatternDetectionWithRSS = async (
  symbol: string,
  initialPatterns: any[]
): Promise<any[]> => {
  try {
    const rssData = await fetchAndParseRSSFeeds(symbol, true);
    
    if (rssData.length === 0) {
      return initialPatterns;
    }
    
    // Filter for recent and relevant news
    const recentRelevantNews = rssData.filter(item => {
      const isRecent = new Date(item.publishDate).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
      const isRelevant = item.relevanceScore && item.relevanceScore > 0.6;
      return isRecent && isRelevant;
    });
    
    if (recentRelevantNews.length === 0) {
      return initialPatterns;
    }
    
    // Get average sentiment from news
    const avgSentiment = recentRelevantNews.reduce((sum, item) => sum + (item.sentimentScore || 0), 0) / recentRelevantNews.length;
    
    // Find mentioned patterns
    const mentionedPatterns = new Set<string>();
    recentRelevantNews.forEach(item => {
      if (item.extractedPatterns) {
        item.extractedPatterns.forEach(pattern => mentionedPatterns.add(pattern));
      }
    });
    
    // Adjust strength of existing patterns based on news sentiment and mentions
    return initialPatterns.map(pattern => {
      let adjustedPattern = { ...pattern };
      
      // Convert pattern type to lowercase for comparison with extracted patterns
      const patternTypeLower = pattern.patternType.toLowerCase().replace(/_/g, ' ');
      
      if (mentionedPatterns.has(patternTypeLower)) {
        // This pattern was mentioned in news, boost its strength
        adjustedPattern.strength = Math.min(1, pattern.strength * 1.2);
        
        // Add mention to description
        adjustedPattern.description += ' (Mentioned in recent news)';
      }
      
      // Adjust bullish/bearish patterns based on overall sentiment
      if (Math.abs(avgSentiment) > 0.3) {
        if (pattern.signal === 'bullish' && avgSentiment > 0.3) {
          // Strengthen bullish patterns if sentiment is positive
          adjustedPattern.strength = Math.min(1, pattern.strength * 1.15);
        } else if (pattern.signal === 'bearish' && avgSentiment < -0.3) {
          // Strengthen bearish patterns if sentiment is negative
          adjustedPattern.strength = Math.min(1, pattern.strength * 1.15);
        }
      }
      
      return adjustedPattern;
    });
  } catch (error) {
    console.error('Error enhancing patterns with RSS data:', error);
    return initialPatterns;
  }
}; 