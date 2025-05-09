import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { AssetsProvider } from '@/contexts/AssetsContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X, Database, InfoIcon } from 'lucide-react';
import { isUsingDemoData } from '@/services/marketData';

const Layout = () => {
  const [showDemoAlert, setShowDemoAlert] = useState(false);
  const [usingRealData, setUsingRealData] = useState(true);
  
  // Check if we're using demo data
  useEffect(() => {
    // Initial check
    setShowDemoAlert(isUsingDemoData);
    setUsingRealData(!isUsingDemoData);
    
    // Check more frequently to catch any API failures
    const checkInterval = setInterval(() => {
      setShowDemoAlert(isUsingDemoData);
      setUsingRealData(!isUsingDemoData);
    }, 500);
    
    return () => clearInterval(checkInterval);
  }, []);
  
  return (
    <AssetsProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        {showDemoAlert && (
          <Alert variant="default" className="bg-yellow-500/15 border-yellow-500/30 m-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                <AlertDescription className="text-sm">
                  Using demo data. API calls failed or returned invalid data. Check API keys in Settings.
                </AlertDescription>
              </div>
              <button onClick={() => setShowDemoAlert(false)} className="p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </Alert>
        )}
        {usingRealData && (
          <Alert variant="default" className="bg-green-500/15 border-green-500/30 m-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="h-4 w-4 text-green-500 mr-2" />
                <AlertDescription className="text-sm">
                  Using real financial data from API sources.
                </AlertDescription>
              </div>
              <button onClick={() => setUsingRealData(false)} className="p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </Alert>
        )}
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="bg-card border-t border-border py-4">
          <div className="container text-center text-sm text-muted-foreground">
            <p>AlphaTrend Navigator &copy; {new Date().getFullYear()}. This is a demo application.</p>
            <p className="mt-1">All data is simulated and not financial advice.</p>
          </div>
        </footer>
      </div>
    </AssetsProvider>
  );
};

export default Layout;
