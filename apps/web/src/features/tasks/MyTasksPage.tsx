import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckSquare, Clock, Loader2, AlertTriangle, ArrowRight, Inbox } from 'lucide-react';
import api from '@/services/api';
import { useCurrentWorkspace } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import type { Task } from '@/types';

type MyTask = Task & {
  project: { id: string; name: string; workspaceId: string };
  column: { id: string; name: string; color: string };
};

type Filter = 'all' | 'open' | 'done' | 'overdue';

export function MyTasksPage() {
  const workspace = useCurrentWorkspace();
  const [filter, setFilter] = useState<Filter>('open');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', workspace?.id],
    queryFn: async () => {
      const { data } = await api.get<MyTask[]>('/tasks/mine', {
        params: workspace?.id ? { workspaceId: workspace.id } : undefined,
      });
      return data;
    },
    enabled: !!workspace?.id,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      const done = Boolean(t.completedAt) || t.column.name.toLowerCase() === 'done';
      const overdue = Boolean(t.dueDate) && new Date(t.dueDate!) < now && !done;
      if (filter === 'open') return !done;
      if (filter === 'done') return done;
      if (filter === 'overdue') return overdue;
      return true;
    });
  }, [tasks, filter]);

  const counts = useMemo(() => {
    const now = new Date();
    let open = 0;
    let done = 0;
    let overdue = 0;
    for (const t of tasks) {
      const isDone = Boolean(t.completedAt) || t.column.name.toLowerCase() === 'done';
      if (isDone) done += 1;
      else open += 1;
      if (t.dueDate && new Date(t.dueDate) < now && !isDone) overdue += 1;
    }
    return { all: tasks.length, open, done, overdue };
  }, [tasks]);

  if (!workspace) {
    return <p className="text-[var(--muted)]">Select a workspace to view your tasks.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-[var(--muted)]">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your tasks...
      </div>
    );
  }

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'open', label: 'Open', count: counts.open },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
    { id: 'done', label: 'Done', count: counts.done },
    { id: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Tasks</h2>
        <p className="text-sm text-[var(--muted)]">
          Tasks assigned to you in {workspace.name}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              filter === f.id
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-primary/40'
            )}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Inbox className="h-10 w-10 text-[var(--muted)] opacity-50" />
            <p className="font-medium">No tasks here</p>
            <p className="max-w-sm text-sm text-[var(--muted)]">
              {filter === 'open'
                ? 'Nothing assigned to you right now. Ask a project owner to assign work, or check another filter.'
                : 'Try a different filter to see more tasks.'}
            </p>
            <Link to="/app/projects">
              <Button variant="outline" className="gap-2">
                Browse projects <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const done = Boolean(task.completedAt) || task.column.name.toLowerCase() === 'done';
            const overdue =
              Boolean(task.dueDate) && new Date(task.dueDate!) < new Date() && !done;
            return (
              <Link
                key={task.id}
                to={`/app/projects/${task.projectId}?task=${task.id}`}
                className="block"
              >
                <Card className="glass transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{task.title}</p>
                        <PriorityBadge priority={task.priority} />
                        {overdue && (
                          <Badge variant="danger" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Overdue
                          </Badge>
                        )}
                        {done && <Badge variant="success">Done</Badge>}
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        {task.project.name} · {task.column.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-sm text-[var(--muted)]">
                      {task.dueDate ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <CheckSquare className="h-3.5 w-3.5" /> No due date
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
