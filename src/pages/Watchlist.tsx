
import React from 'react';
import SearchBar from '@/components/SearchBar';
import AssetCard from '@/components/AssetCard';
import { useAssets } from '@/contexts/AssetsContext';

const Watchlist = () => {
  const { watchlist, addToWatchlist } = useAssets();

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">My Watchlist</h1>
        <SearchBar onSelectAsset={addToWatchlist} />
      </div>
      
      {watchlist.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map(asset => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">Your watchlist is empty</div>
          <p>Search for assets above and add them to your watchlist</p>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
