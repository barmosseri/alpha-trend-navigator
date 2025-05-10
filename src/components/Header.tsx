import React from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Ensure Trading is the first tab and Watchlist is the second
// Ensure Trading is the first tab and Watchlist is the second
const currentTab = location.pathname.includes('/watchlist') ? 'watchlist' : 'trading';
  
  return (
    <header className="bg-card border-b border-border py-4">
      <div className="container flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-app-navy rounded-md p-1">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <path d="M22 12L18 16L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L6 8L8 10L12 6L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-xl">AlphaTrend</span>
        </Link>
        
        <Tabs value={currentTab} onValueChange={(value) => navigate(`/${value === 'watchlist' ? '' : value}`)}>
          <TabsList>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="w-24">
          {/* Placeholder for balance */}
        </div>
      </div>
    </header>
  );
};

export default Header;
