
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { NewsItem } from '@/lib/types';
import { fetchAssetNews } from '@/services/marketData';

interface NewsSectionProps {
  symbol: string;
}

const NewsSection = ({ symbol }: NewsSectionProps) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      if (!symbol) return;
      
      setIsLoading(true);
      try {
        const newsItems = await fetchAssetNews(symbol);
        setNews(newsItems);
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNews();
  }, [symbol]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return <div className="text-center py-6 text-muted-foreground">No recent news found</div>;
  }

  return (
    <div className="space-y-4">
      {news.map((item, index) => (
        <div key={index} className="border-b pb-3 last:border-b-0">
          <div className="flex items-start gap-2">
            <div 
              className={`w-2 h-2 rounded-full mt-2 ${
                item.sentiment === 'positive' 
                  ? 'bg-app-green' 
                  : item.sentiment === 'negative' 
                    ? 'bg-app-red' 
                    : 'bg-yellow-500'
              }`} 
            />
            <div>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium hover:underline flex items-center"
              >
                {item.title}
                <ExternalLink className="h-3 w-3 ml-1 inline-block" />
              </a>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(item.publishedAt).toLocaleDateString()} · {item.source}
              </div>
              {item.content && (
                <div className="text-sm mt-1 text-muted-foreground line-clamp-2">
                  {item.content}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NewsSection;
