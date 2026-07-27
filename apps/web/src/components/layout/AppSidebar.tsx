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
          'relative z-50 flex flex-col border-r border-[var(--border)]/80 bg-[var(--card)]/95 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[width] duration-300 ease-out',
          'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
          collapsed ? 'w-[76px]' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center gap-3 border-b border-[var(--border)]/70 px-4',
            collapsed && 'justify-center px-2'
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
            <OrbitoLogo size={22} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight">Orbito</p>
              <p className="truncate text-[11px] text-[var(--muted)]">Keep projects in orbit</p>
            </div>
          )}
        </div>

        {!collapsed && workspaces.length > 0 && (
          <div className="border-b border-[var(--border)]/70 p-3">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Workspace
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-full justify-between rounded-xl border-[var(--border)]/80 bg-[var(--background)]/50 text-left font-normal hover:bg-[var(--background)]"
                >
                  <span className="truncate">{current?.name ?? 'Workspace'}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
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

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {!collapsed && (
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
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
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--text)]'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="hidden p-3 lg:block">
          <div className="mb-3 h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl border border-[var(--border)]/80 bg-[var(--background)]/70 px-3 py-2.5 text-sm font-medium text-[var(--muted)] shadow-sm transition-all duration-200',
              'hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/10',
              'active:scale-[0.98]',
              collapsed && 'justify-center px-2'
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--card)] ring-1 ring-[var(--border)] transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/15 group-hover:ring-primary/35 group-hover:text-primary">
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
