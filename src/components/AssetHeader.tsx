
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Asset } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bookmark, BookmarkCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssets } from '@/contexts/AssetsContext';

interface AssetHeaderProps {
  asset: Asset;
}

const AssetHeader = ({ asset }: AssetHeaderProps) => {
  const navigate = useNavigate();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useAssets();
  const isWatchlisted = isInWatchlist(asset.id);

  const toggleWatchlist = () => {
    if (isWatchlisted) {
      removeFromWatchlist(asset.id);
    } else {
      addToWatchlist(asset);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        
        <div className="flex items-center">
          <Badge 
            variant="outline" 
            className={cn(
              "mr-2 uppercase font-mono text-xs",
              asset.type === 'stock' ? "border-blue-500 text-blue-500" : "border-green-500 text-green-500"
            )}
          >
            {asset.type}
          </Badge>
          
          <h1 className="text-2xl font-bold">{asset.name}</h1>
          <span className="ml-2 text-xl text-muted-foreground">{asset.symbol}</span>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold mr-3">${asset.price.toFixed(2)}</span>
          <div 
            className={cn(
              "flex items-center text-sm font-medium",
              asset.change >= 0 ? "text-app-green" : "text-app-red"
            )}
          >
            {asset.change >= 0 ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {Math.abs(asset.change).toFixed(2)}%
          </div>
        </div>
        
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleWatchlist}
            className={cn(
              isWatchlisted && "bg-accent text-accent-foreground"
            )}
          >
            {isWatchlisted ? (
              <>
                <BookmarkCheck className="h-4 w-4 mr-2" />
                Watchlisted
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                Add to Watchlist
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssetHeader;
