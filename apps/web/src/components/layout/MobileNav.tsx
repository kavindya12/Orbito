import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Calendar, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/app', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/app/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/app/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/app/team', icon: Users, label: 'Team' },
  { to: '/app/ai', icon: Sparkles, label: 'AI' },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[var(--border)] bg-[var(--sidebar)] px-2 py-2 lg:hidden">
      {items.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors',
              isActive ? 'ai-gradient text-white' : 'text-slate-400'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
