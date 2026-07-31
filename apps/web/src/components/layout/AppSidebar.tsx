import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Users,
  BarChart3,
  Sparkles,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrbitoLogo } from './Logo';
import { useUiStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/app/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/app/team', icon: Users, label: 'Team' },
  { to: '/app/reports', icon: BarChart3, label: 'Reports' },
  { to: '/app/ai', icon: Sparkles, label: 'AI Assistant' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const workspaces = useAuthStore((s) => s.workspaces);
  const currentWorkspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const setCurrentWorkspaceId = useAuthStore((s) => s.setCurrentWorkspaceId);
  const current = workspaces.find((w) => w.id === currentWorkspaceId);

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={cn(
          'z-50 flex h-dvh shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-[width] duration-300 ease-out',
          'fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:translate-x-0',
          collapsed ? 'w-[76px]' : 'w-[260px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex h-[72px] items-center gap-3 px-5',
            collapsed && 'justify-center px-2'
          )}
        >
          <OrbitoLogo size={28} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold tracking-tight text-white">Orbito</p>
              <p className="truncate text-[11px] text-slate-400">Keep projects in orbit</p>
            </div>
          )}
        </div>

        {!collapsed && workspaces.length > 0 && (
          <div className="px-4 pb-4">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Workspace
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-full justify-between rounded-2xl border-white/10 bg-white/5 text-left font-medium text-slate-100 hover:bg-white/10 hover:text-white"
                >
                  <span className="truncate">{current?.name ?? 'Workspace'}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map((w) => (
                  <DropdownMenuItem key={w.id} onClick={() => setCurrentWorkspaceId(w.id)}>
                    {w.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {!collapsed && (
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Menu
            </p>
          )}
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'ai-gradient text-white shadow-lg shadow-primary/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="hidden p-3 lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
