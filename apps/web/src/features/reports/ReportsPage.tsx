import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import api from '@/services/api';
import { useCurrentWorkspace } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ReportsData } from '@/types';

const COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#22C55E', '#F97316'];

export function ReportsPage() {
  const workspace = useCurrentWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ['reports', workspace?.id],
    queryFn: async () => {
      const { data } = await api.get<ReportsData>(`/dashboard/reports/${workspace!.id}`);
      return data;
    },
    enabled: !!workspace?.id,
  });

  if (!workspace) return <p className="text-[var(--muted)]">Select a workspace.</p>;
  if (isLoading) return <p className="text-[var(--muted)]">Loading reports...</p>;

  const firstProject = data?.projectHealth[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-[var(--muted)]">Workspace completion rate: {data?.completionRate ?? 0}%</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data?.projectHealth.map((p) => (
          <motion.div key={p.id} whileHover={{ y: -2 }}>
            <Card className="glass">
              <CardContent className="p-4">
                <p className="font-medium">{p.name}</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-2xl font-bold">{p.health}%</span>
                  <Badge variant={p.health >= 80 ? 'success' : p.health >= 60 ? 'warning' : 'danger'}>
                    Health
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {p.done}/{p.total} tasks complete
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {firstProject && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Burndown - {firstProject.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={firstProject.burndown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="var(--muted)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }} />
                    <Line type="monotone" dataKey="remaining" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass">
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} />
                  <YAxis stroke="var(--muted)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }} />
                  <Bar dataKey="completed" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="assigned" fill="#334155" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {firstProject && firstProject.workload.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto h-64 max-w-md">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={firstProject.workload} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {firstProject.workload.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
