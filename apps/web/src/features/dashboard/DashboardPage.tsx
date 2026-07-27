import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import type { ElementType } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import api from '@/services/api';
import { useCurrentWorkspace } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { DashboardData } from '@/types';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: ElementType;
  color: string;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card className="glass">
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-[12px] ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DashboardPage() {
  const workspace = useCurrentWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', workspace?.id],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>(`/dashboard/workspace/${workspace!.id}`);
      return data;
    },
    enabled: !!workspace?.id,
  });

  if (!workspace) {
    return <p className="text-[var(--muted)]">Select a workspace to view dashboard.</p>;
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-[var(--muted)]">Loading dashboard...</div>;
  }

  const chartData = data?.productivityTrend.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Projects" value={data?.activeProjects ?? 0} icon={FolderKanban} color="bg-primary/15 text-primary" />
        <StatCard title="Completed Tasks" value={data?.taskStats.completed ?? 0} icon={CheckCircle2} color="bg-emerald-500/15 text-emerald-500" />
        <StatCard title="Pending Tasks" value={data?.taskStats.pending ?? 0} icon={Clock} color="bg-amber-500/15 text-amber-500" />
        <StatCard title="Overdue" value={data?.taskStats.overdue ?? 0} icon={AlertTriangle} color="bg-red-500/15 text-red-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle>Productivity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                  <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="completed" stroke="#6366F1" fill="url(#prodGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <motion.div whileHover={{ scale: 1.01 }}>
          <Card className="ai-gradient h-full text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5" />
                AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data?.productivityScore ?? 0}%</p>
              <p className="mt-2 text-sm text-white/80">Productivity score across active projects</p>
              <Link to="/app/ai" className="mt-4 inline-block">
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Ask AI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!data?.upcomingDeadlines || data.upcomingDeadlines.length === 0) && (
              <p className="text-sm text-[var(--muted)]">No upcoming deadlines</p>
            )}
            {data?.upcomingDeadlines.map((item) => (
              <Link
                key={item.id}
                to={
                  item.type === 'project'
                    ? `/app/projects/${item.project?.id}`
                    : `/app/projects/${item.project?.id}?task=${item.id}`
                }
                className="flex items-center justify-between rounded-[12px] border border-[var(--border)] p-3 transition-colors hover:border-primary/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant={item.type === 'project' ? 'secondary' : 'outline'}>
                      {item.type === 'project' ? 'Project' : 'Task'}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {item.type === 'project'
                      ? 'Project deadline'
                      : item.project?.name}
                    {item.assignee ? ` · ${item.assignee.name}` : ''}
                  </p>
                </div>
                <Badge variant="outline">{formatDate(item.dueDate)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.activity.slice(0, 8).map((a) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p>
                    <span className="font-medium">{a.user.name}</span>{' '}
                    <span className="text-[var(--muted)]">{a.action}</span>
                  </p>
                  {a.project && <p className="text-xs text-[var(--muted)]">{a.project.name}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
