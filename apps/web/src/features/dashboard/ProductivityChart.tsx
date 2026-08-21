import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type Point = { label: string; completed: number };

export default function ProductivityChart({ data }: { data: Point[] }) {
  const total = data.reduce((sum, d) => sum + d.completed, 0);

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
        No productivity data yet
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--text)]">No completions in the last 14 days</p>
        <p>Move tasks to Done on a board to see your productivity trend here.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} tickLine={false} />
        <YAxis
          stroke="var(--muted)"
          fontSize={12}
          allowDecimals={false}
          tickLine={false}
          width={28}
          domain={[0, 'auto']}
        />
        <Tooltip
          formatter={(value: number) => [`${value} completed`, 'Tasks']}
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            color: 'var(--text)',
          }}
        />
        <Area
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="#6366F1"
          fill="url(#prodGrad)"
          strokeWidth={2}
          dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
