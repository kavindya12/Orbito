import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileNav } from './MobileNav';
import { CommandSearch } from '@/features/search/CommandSearch';

const pageTitles: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/projects': 'Projects',
  '/app/calendar': 'Calendar',
  '/app/team': 'Team',
  '/app/reports': 'Reports',
  '/app/ai': 'AI Assistant',
  '/app/settings': 'Settings',
};

function getTitle(pathname: string) {
  if (pathname.startsWith('/app/projects/')) return 'Project Board';
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || (path !== '/app' && pathname.startsWith(path))) return title;
  }
  return 'Orbito';
}

export function AppShell() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[var(--background)]">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-16 lg:pb-0">
        <AppHeader title={getTitle(location.pathname)} onSearchOpen={() => setSearchOpen(true)} />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
          <div key={location.pathname} className="min-h-0">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
