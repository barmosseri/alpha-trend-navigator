
import React from 'react';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAssets } from '@/contexts/AssetsContext';

interface AssetCardProps {
  asset: Asset;
  showActions?: boolean;
}

const AssetCard = ({ asset, showActions = true }: AssetCardProps) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useAssets();
  
  const isInWatchlistAlready = isInWatchlist(asset.id);
  
  return (
    <div className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-border">
      <div className="flex justify-between items-start">
        <div>
          <Link to={`/asset/${asset.id}`} className="font-medium text-lg hover:text-accent">{asset.symbol}</Link>
          <div className="text-sm text-muted-foreground">{asset.name}</div>
          <div className="flex items-center mt-1 gap-1">
            <span className="text-sm bg-secondary rounded px-1">{asset.type.toUpperCase()}</span>
            <div className="flex items-center">
              {asset.trend === 'RISING' ? (
                <TrendingUp className="h-4 w-4 text-app-green" />
              ) : asset.trend === 'FALLING' ? (
                <TrendingDown className="h-4 w-4 text-app-red" />
              ) : null}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-semibold">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={cn(
            "flex items-center justify-end text-sm",
            asset.change >= 0 ? "text-app-green" : "text-app-red"
          )}>
            {asset.change >= 0 ? (
              <ArrowUp className="h-3 w-3 mr-0.5" />
            ) : (
              <ArrowDown className="h-3 w-3 mr-0.5" />
            )}
            {Math.abs(asset.change).toFixed(2)}%
          </div>
          <div className="mt-2">
            <div className="flex items-center bg-secondary rounded-full h-2 w-24 ml-auto">
              <div
                className={cn(
                  "h-full rounded-full",
                  asset.rating >= 7 ? "bg-app-green" : asset.rating >= 4 ? "bg-yellow-500" : "bg-app-red"
                )}
                style={{ width: `${asset.rating * 10}%` }}
              ></div>
            </div>
            <div className="text-xs text-right mt-0.5">Rating: {asset.rating}/10</div>
          </div>
        </div>
      </div>
      
      {showActions && (
        <div className="mt-3 flex justify-between items-center">
          <div className="text-sm font-medium">
            <span className={cn(
              "px-2 py-1 rounded",
              asset.recommendation === 'BUY' ? "bg-app-green/10 text-app-green" :
              asset.recommendation === 'SELL' ? "bg-app-red/10 text-app-red" :
                "bg-yellow-500/10 text-yellow-500"
            )}>
              {asset.recommendation}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => isInWatchlistAlready ? removeFromWatchlist(asset.id) : addToWatchlist(asset)}
          >
            {isInWatchlistAlready ? 'Remove' : 'Add to Watchlist'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AssetCard;
