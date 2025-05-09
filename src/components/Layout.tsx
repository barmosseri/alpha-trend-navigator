import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { AssetsProvider } from '@/contexts/AssetsContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { isUsingDemoData } from '@/services/marketData';

const Layout = () => {
  const [showDemoAlert, setShowDemoAlert] = useState(false);
  
  // Check if we're using demo data
  useEffect(() => {
    setShowDemoAlert(isUsingDemoData);
    
    // Listen for changes in the isUsingDemoData flag
    const checkInterval = setInterval(() => {
      if (isUsingDemoData) {
        setShowDemoAlert(true);
        clearInterval(checkInterval);
      }
    }, 1000);
    
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
                  Using demo data. Could not fetch real-time trending data. Using demo data instead.
                </AlertDescription>
              </div>
              <button onClick={() => setShowDemoAlert(false)} className="p-1">
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
