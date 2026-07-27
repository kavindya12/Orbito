import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Sparkles,
  ListTree,
  Target,
  HeartPulse,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '@/services/api';
import { useCurrentWorkspace } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

type PriorityResult = {
  recommendation: { taskId: string; title: string; reason: string } | null;
  ranked: Array<{ id: string; title: string; score: number; priority: string }>;
  source: string;
};

type HealthResult = {
  health: number;
  progress: number;
  reason: string;
  warning: string | null;
};

const tools = [
  {
    id: 'breakdown',
    icon: ListTree,
    title: 'Task Breakdown',
    blurb: 'Turn one big idea into small steps you can assign.',
  },
  {
    id: 'priority',
    icon: Target,
    title: 'Priority',
    blurb: 'Find which open task you should do next.',
  },
  {
    id: 'health',
    icon: HeartPulse,
    title: 'Health',
    blurb: 'Check if your project is on track or at risk.',
  },
] as const;

export function AiAssistantPage() {
  const workspace = useCurrentWorkspace();
  const [tab, setTab] = useState('breakdown');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');
  const [priorityResult, setPriorityResult] = useState<PriorityResult | null>(null);
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null);
  const [breakdownResult, setBreakdownResult] = useState<string[] | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspace?.id],
    queryFn: async () => {
      const { data } = await api.get<Project[]>(`/projects/workspace/${workspace!.id}`);
      return data;
    },
    enabled: !!workspace?.id,
  });

  useEffect(() => {
    if (!projectId && projects.length === 1) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const breakdownMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ subtasks: string[] }>('/ai/breakdown', {
        title,
        description,
        createTasks: false,
      });
      return data;
    },
  });

  const priorityMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<PriorityResult>('/ai/priority', { projectId });
      return data;
    },
  });

  const healthMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<HealthResult>('/ai/health', { projectId });
      return data;
    },
  });

  const handleBreakdown = async () => {
    setError('');
    setBreakdownResult(null);
    try {
      const data = await breakdownMutation.mutateAsync();
      setBreakdownResult(data.subtasks);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handlePriority = async () => {
    if (!projectId) return setError('Select a project first');
    setError('');
    setPriorityResult(null);
    try {
      setPriorityResult(await priorityMutation.mutateAsync());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleHealth = async () => {
    if (!projectId) return setError('Select a project first');
    setError('');
    setHealthResult(null);
    try {
      setHealthResult(await healthMutation.mutateAsync());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[var(--card)] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Badge className="gap-1.5 border-0 bg-primary/15 text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Orbito AI
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">AI Assistant</h1>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              Your project co-pilot. It helps you plan work, decide what matters most, and spot
              deadline risk - so your team stays in orbit.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)]/60 px-4 py-3 text-xs text-[var(--muted)]">
            <Lightbulb className="h-4 w-4 text-accent" />
            Tip: add tasks to a project first for Priority & Health
          </div>
        </div>
      </div>

      {/* What each tool does */}
      <div className="grid gap-3 sm:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = tab === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setTab(tool.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-all duration-200',
                active
                  ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/10'
                  : 'border-[var(--border)] bg-[var(--card)]/60 hover:border-primary/30 hover:bg-[var(--card)]'
              )}
            >
              <div
                className={cn(
                  'mb-3 flex h-10 w-10 items-center justify-center rounded-xl',
                  active ? 'bg-primary text-white' : 'bg-[var(--background)] text-primary'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold">{tool.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{tool.blurb}</p>
            </button>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="priority">Priority</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="breakdown" className="mt-0">
            <motion.div
              key="breakdown"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="border-b border-[var(--border)] bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent px-6 py-5">
                <h2 className="text-xl font-semibold">Task Breakdown</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Type a big task (example: “Build login”). AI returns smaller steps like UI,
                  validation, API, and testing - ready to create on your board.
                </p>
              </div>
              <div className="grid gap-6 p-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Task title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Build authentication flow"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Any details that help AI understand the work..."
                      rows={4}
                      className="rounded-xl"
                    />
                  </div>
                  <Button
                    variant="gradient"
                    className="h-11 w-full gap-2 rounded-xl sm:w-auto"
                    onClick={handleBreakdown}
                    disabled={!title || breakdownMutation.isPending}
                  >
                    {breakdownMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate Breakdown
                  </Button>
                </div>

                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)]/50 p-4">
                  {!breakdownResult ? (
                    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">
                      <ListTree className="h-8 w-8 opacity-40" />
                      <p>Your subtasks will appear here</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {breakdownResult.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="pt-1">{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="priority" className="mt-0">
            <motion.div
              key="priority"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="border-b border-[var(--border)] bg-gradient-to-r from-secondary/15 via-primary/5 to-transparent px-6 py-5">
                <h2 className="text-xl font-semibold">Priority Recommendation</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  AI looks at due dates, priority, and blockers, then tells you which open task to
                  finish first - and why.
                </p>
              </div>
              <div className="space-y-5 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label>Project</Label>
                    <Select value={projectId || undefined} onValueChange={setProjectId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="gradient"
                    className="h-11 gap-2 rounded-xl"
                    onClick={handlePriority}
                    disabled={!projectId || priorityMutation.isPending}
                  >
                    {priorityMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4" />
                    )}
                    Get Recommendation
                  </Button>
                </div>

                {priorityResult && !priorityResult.recommendation && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="font-medium text-amber-400">No open tasks to prioritize</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Add tasks to {selectedProject?.name ?? 'this project'} on the board, then try
                      again.
                    </p>
                    {projectId && (
                      <Link to={`/app/projects/${projectId}`} className="mt-3 inline-flex">
                        <Button size="sm" variant="outline" className="gap-2 rounded-xl">
                          Open board <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                )}

                {priorityResult?.recommendation && (
                  <div className="ai-gradient rounded-2xl p-5 text-white shadow-xl shadow-primary/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                      Do this next
                    </p>
                    <p className="mt-2 text-xl font-bold">{priorityResult.recommendation.title}</p>
                    <p className="mt-2 text-sm text-white/85">{priorityResult.recommendation.reason}</p>
                  </div>
                )}

                {priorityResult?.ranked && priorityResult.ranked.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[var(--muted)]">Ranked queue</p>
                    {priorityResult.ranked.map((t, i) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="truncate text-sm font-medium">{t.title}</span>
                          <Badge variant="outline">{t.priority}</Badge>
                        </div>
                        <Badge variant="secondary">Score {t.score}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="health" className="mt-0">
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="border-b border-[var(--border)] bg-gradient-to-r from-accent/15 via-primary/5 to-transparent px-6 py-5">
                <h2 className="text-xl font-semibold">Project Health</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Scores progress vs unfinished high-priority and overdue work. Use it as an early
                  warning before deadlines slip.
                </p>
              </div>
              <div className="space-y-5 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label>Project</Label>
                    <Select value={projectId || undefined} onValueChange={setProjectId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="gradient"
                    className="h-11 gap-2 rounded-xl"
                    onClick={handleHealth}
                    disabled={!projectId || healthMutation.isPending}
                  >
                    {healthMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <HeartPulse className="h-4 w-4" />
                    )}
                    Analyze Health
                  </Button>
                </div>

                {healthResult && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Health score
                      </p>
                      <p className="mt-2 text-5xl font-bold text-primary">{healthResult.health}%</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        Progress {healthResult.progress}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Analysis
                      </p>
                      <p className="mt-3 text-sm leading-relaxed">{healthResult.reason}</p>
                      {healthResult.warning && (
                        <div className="mt-4 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          {healthResult.warning}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
