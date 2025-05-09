
import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Asset } from '@/lib/types';
import { searchAssets } from '@/lib/mockData';

interface SearchBarProps {
  onSelectAsset?: (asset: Asset) => void;
}

const SearchBar = ({ onSelectAsset }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const handleSearch = () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    const searchResults = searchAssets(query);
    setResults(searchResults);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div className="relative w-full max-w-2xl">
      <div className="flex">
        <div className="relative flex-grow">
          <Input
            placeholder="Search stocks & cryptocurrencies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
            className="pl-10 pr-4 py-2"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button onClick={handleSearch} className="ml-2">
          Search
        </Button>
      </div>
      
      {isSearching && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-80 overflow-auto">
          {results.map((asset) => (
            <div
              key={asset.id}
              className="p-3 hover:bg-accent/10 cursor-pointer border-b border-border last:border-0"
              onClick={() => {
                if (onSelectAsset) {
                  onSelectAsset(asset);
                }
                setQuery('');
                setResults([]);
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{asset.symbol}</div>
                  <div className="text-sm text-muted-foreground">{asset.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${asset.price.toFixed(2)}</div>
                  <div className={asset.change >= 0 ? "text-app-green" : "text-app-red"}>
                    {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
