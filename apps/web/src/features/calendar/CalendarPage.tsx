import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/services/api';
import { useCurrentWorkspace } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type CalendarEvent = {
  id: string;
  title: string;
  dueDate: string;
  type: 'deadline' | 'milestone';
  project?: { id: string; name: string };
};

export function CalendarPage() {
  const workspace = useCurrentWorkspace();
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const { data } = useQuery({
    queryKey: ['calendar', workspace?.id, monthStart.toISOString()],
    queryFn: async () => {
      const { data } = await api.get<{ tasks: CalendarEvent[]; milestones: CalendarEvent[] }>(
        `/calendar/workspace/${workspace!.id}`,
        { params: { from: calStart.toISOString(), to: calEnd.toISOString() } }
      );
      return [...data.tasks, ...data.milestones];
    },
    enabled: !!workspace?.id,
  });

  const events = data ?? [];
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekStart = startOfWeek(current);
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(current) });

  const getEventsForDay = (day: Date) =>
    events.filter((e) => e.dueDate && isSameDay(parseISO(e.dueDate), day));

  if (!workspace) return <p className="text-[var(--muted)]">Select a workspace.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{format(current, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrent(subMonths(current, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrent(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrent(addMonths(current, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
        </TabsList>

        <TabsContent value="month">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--muted)]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'min-h-24 rounded-[12px] border border-[var(--border)] p-2',
                        !isSameMonth(day, current) && 'opacity-40',
                        isSameDay(day, new Date()) && 'ring-2 ring-primary/50'
                      )}
                    >
                      <span className="text-sm font-medium">{format(day, 'd')}</span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={cn(
                              'truncate rounded px-1 py-0.5 text-[10px]',
                              e.type === 'milestone' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                            )}
                          >
                            {e.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week">
          <div className="grid gap-4 md:grid-cols-7">
            {weekDays.map((day) => (
              <Card key={day.toISOString()} className={cn('glass', isSameDay(day, new Date()) && 'ring-2 ring-primary/50')}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{format(day, 'EEE d')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {getEventsForDay(day).map((e) => (
                    <div key={e.id} className="rounded-[8px] border border-[var(--border)] p-2 text-xs">
                      <p className="font-medium">{e.title}</p>
                      <Badge variant="outline" className="mt-1">{e.type}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="day">
          <Card className="glass">
            <CardHeader>
              <CardTitle>{format(current, 'EEEE, MMMM d')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getEventsForDay(current).length === 0 && (
                <p className="text-[var(--muted)]">No events for this day</p>
              )}
              {getEventsForDay(current).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-[12px] border border-[var(--border)] p-4">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-[var(--muted)]">{e.project?.name}</p>
                  </div>
                  <Badge variant={e.type === 'milestone' ? 'secondary' : 'default'}>{e.type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
