import { Menu, Moon, Sun, LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { OrbitoLogo } from './Logo';
import api from '@/services/api';
import { greeting } from '@/lib/utils';

type AppHeaderProps = {
  title?: string;
  onSearchOpen?: () => void;
};

export function AppHeader({ title, onSearchOpen }: AppHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--border)] bg-[var(--background)]/80 px-4 backdrop-blur-md lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2 lg:hidden">
        <OrbitoLogo size={24} />
        <span className="font-semibold">Orbito</span>
      </div>
      {title && (
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold">{title}</h1>
          {user && (
            <p className="text-xs text-[var(--muted)]">
              {greeting()} {user.name}
            </p>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden gap-2 md:flex" onClick={onSearchOpen}>
          <Search className="h-4 w-4" />
          <span className="text-[var(--muted)]">Search...</span>
          <kbd className="ml-4 rounded border border-[var(--border)] px-1.5 py-0.5 text-xs text-[var(--muted)]">⌘K</kbd>
        </Button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onSearchOpen}>
          <Search className="h-5 w-5" />
        </Button>
        <NotificationBell />
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none ring-primary/50 focus-visible:ring-2">
              <UserAvatar name={user?.name ?? 'User'} src={user?.avatarUrl} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-[var(--muted)]">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/app/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await api.post('/auth/logout');
                } catch {
                  /* ignore */
                }
                logout();
                navigate('/login');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
