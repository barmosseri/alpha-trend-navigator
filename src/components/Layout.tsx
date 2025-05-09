
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { AssetsProvider } from '@/contexts/AssetsContext';

const Layout = () => {
  return (
    <AssetsProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
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
