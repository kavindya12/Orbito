import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search, FolderKanban, CheckSquare, User, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useCurrentWorkspace } from '@/store/auth-store';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { SearchResults } from '@/types';

type CommandSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const { data } = useQuery({
    queryKey: ['search', workspace?.id, query],
    queryFn: async () => {
      const { data } = await api.get<SearchResults>('/search', {
        params: { q: query, workspaceId: workspace!.id },
      });
      return data;
    },
    enabled: !!workspace?.id && query.length >= 2,
  });

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="bg-[var(--card)]" shouldFilter={false}>
          <div className="flex items-center border-b border-[var(--border)] px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-[var(--muted)]" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search tasks, projects, people..."
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--muted)]">
              {query.length < 2 ? 'Type at least 2 characters...' : 'No results found.'}
            </Command.Empty>

            {data?.projects && data.projects.length > 0 && (
              <Command.Group heading="Projects">
                {data.projects.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={p.name}
                    onSelect={() => go(`/app/projects/${p.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-sm aria-selected:bg-primary/10"
                  >
                    <FolderKanban className="h-4 w-4 text-primary" />
                    {p.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {data?.tasks && data.tasks.length > 0 && (
              <Command.Group heading="Tasks">
                {data.tasks.map((t) => (
                  <Command.Item
                    key={t.id}
                    value={t.title}
                    onSelect={() => go(`/app/projects/${t.project.id}?task=${t.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-sm aria-selected:bg-primary/10"
                  >
                    <CheckSquare className="h-4 w-4 text-accent" />
                    <span>{t.title}</span>
                    <span className="ml-auto text-xs text-[var(--muted)]">{t.project.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {data?.users && data.users.length > 0 && (
              <Command.Group heading="People">
                {data.users.map((u) => (
                  <Command.Item
                    key={u.id}
                    value={u.name}
                    onSelect={() => go('/app/team')}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-sm aria-selected:bg-primary/10"
                  >
                    <User className="h-4 w-4 text-secondary" />
                    {u.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {data?.comments && data.comments.length > 0 && (
              <Command.Group heading="Comments">
                {data.comments.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={c.message}
                    onSelect={() => go(`/app/projects/${c.task.projectId}?task=${c.task.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-sm aria-selected:bg-primary/10"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate">{c.message}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
