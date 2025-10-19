import React, { ReactNode, useRef } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { useMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useMobile();
  const { isRTL } = useLanguage();
  const mainContentRef = useRef<HTMLElement>(null);
  
  // Preserve scroll position when navigating within the app
  useScrollRestoration(mainContentRef);
  
  return (
    <div 
      className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50" 
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Header />
      
      <div className="flex flex-1">
        {/* Sidebar for desktop layout */}
        <Sidebar />
        
        {/* Main content area with enhanced styling */}
        <main 
          ref={mainContentRef}
          className={`flex-1 overflow-auto ${isMobile ? 'p-3' : 'p-6'}`}
          style={{
            ...(isMobile ? { paddingBottom: 'max(5rem, calc(5rem + env(safe-area-inset-bottom, 0px)))' } : {}),
            overflowAnchor: 'none'
          }}
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
