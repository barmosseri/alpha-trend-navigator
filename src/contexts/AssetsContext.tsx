
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Asset } from '../lib/types';
import { mockAssets } from '../lib/mockData';
import { toast } from 'sonner';

interface AssetsContextType {
  assets: Asset[];
  watchlist: Asset[];
  addToWatchlist: (asset: Asset) => void;
  removeFromWatchlist: (assetId: string) => void;
  isInWatchlist: (assetId: string) => boolean;
}

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export const useAssets = () => {
  const context = useContext(AssetsContext);
  if (!context) {
    throw new Error('useAssets must be used within an AssetsProvider');
  }
  return context;
};

export const AssetsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assets] = useState<Asset[]>(mockAssets);
  const [watchlist, setWatchlist] = useState<Asset[]>([]);

  const addToWatchlist = (asset: Asset) => {
    if (!watchlist.some(item => item.id === asset.id)) {
      setWatchlist(prev => [...prev, asset]);
      toast.success(`${asset.symbol} added to watchlist`);
    } else {
      toast.info(`${asset.symbol} is already in your watchlist`);
    }
  };

  const removeFromWatchlist = (assetId: string) => {
    setWatchlist(prev => prev.filter(asset => asset.id !== assetId));
    toast.success(`Removed from watchlist`);
  };

  const isInWatchlist = (assetId: string) => {
    return watchlist.some(asset => asset.id === assetId);
  };

  return (
    <AssetsContext.Provider 
      value={{ 
        assets, 
        watchlist, 
        addToWatchlist, 
        removeFromWatchlist,
        isInWatchlist
      }}
    >
      {children}
    </AssetsContext.Provider>
  );
};
