import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/errors';
import { requireAuth, requireWorkspaceMember } from '../../lib/auth';

const router = Router();
router.use(requireAuth);

router.get(
  '/workspace/:workspaceId',
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id);
    const workspaceId = req.params.workspaceId;
    const now = new Date();

    const [projects, upcomingTasks, upcomingProjects, activities] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          deadline: true,
          tasks: {
            select: {
              id: true,
              completedAt: true,
              dueDate: true,
              column: { select: { name: true } },
            },
          },
        },
      }),
      prisma.task.findMany({
        where: {
          project: { workspaceId },
          dueDate: { gte: now },
          completedAt: null,
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 8,
      }),
      prisma.project.findMany({
        where: {
          workspaceId,
          status: 'ACTIVE',
          deadline: { gte: now },
        },
        select: { id: true, name: true, deadline: true },
        orderBy: { deadline: 'asc' },
        take: 8,
      }),
      prisma.activity.findMany({
        where: { project: { workspaceId } },
        select: {
          id: true,
          action: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const allTasks = projects.flatMap((p) => p.tasks);
    const isDone = (t: { completedAt: Date | null; column: { name: string } }) =>
      Boolean(t.completedAt) || t.column.name.toLowerCase() === 'done';

    const completed = allTasks.filter(isDone).length;
    const pending = allTasks.length - completed;
    const overdue = allTasks.filter(
      (t) => t.dueDate && t.dueDate < now && !isDone(t)
    ).length;

    const upcomingDeadlines = [
      ...upcomingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        type: 'task' as const,
        project: t.project,
        assignee: t.assignee,
      })),
      ...upcomingProjects.map((p) => ({
        id: `project-${p.id}`,
        title: `${p.name} deadline`,
        dueDate: p.deadline,
        type: 'project' as const,
        project: { id: p.id, name: p.name },
        assignee: null,
      })),
    ]
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 10);

    // Local calendar day key (avoid UTC shifting the chart day)
    const dayKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 13);

    // Completions in window: completedAt, or Done column updated recently without completedAt
    const [recentByCompletedAt, recentDoneWithoutStamp, completionActivities] = await Promise.all([
      prisma.task.findMany({
        where: {
          project: { workspaceId, status: 'ACTIVE' },
          completedAt: { gte: since },
        },
        select: { completedAt: true },
      }),
      prisma.task.findMany({
        where: {
          project: { workspaceId, status: 'ACTIVE' },
          completedAt: null,
          updatedAt: { gte: since },
          column: { name: { equals: 'Done' } },
        },
        select: { updatedAt: true },
      }),
      prisma.activity.findMany({
        where: {
          project: { workspaceId },
          createdAt: { gte: since },
          OR: [
            { action: { contains: 'moved task to Done' } },
            { action: { contains: 'completed' } },
          ],
        },
        select: { createdAt: true },
      }),
    ]);

    const countByDay = new Map<string, number>();
    for (const t of recentByCompletedAt) {
      if (!t.completedAt) continue;
      const key = dayKey(t.completedAt);
      countByDay.set(key, (countByDay.get(key) || 0) + 1);
    }
    for (const t of recentDoneWithoutStamp) {
      const key = dayKey(t.updatedAt);
      countByDay.set(key, (countByDay.get(key) || 0) + 1);
    }
    // Fill days that only have activity evidence (no task stamp)
    for (const a of completionActivities) {
      const key = dayKey(a.createdAt);
      if (!countByDay.has(key)) countByDay.set(key, 1);
    }

    const productivity = Array.from({ length: 14 }, (_, i) => {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = dayKey(day);
      return { date: key, completed: countByDay.get(key) || 0 };
    });

    res.json({
      activeProjects: projects.length,
      taskStats: { completed, pending, overdue, total: allTasks.length },
      productivityScore: allTasks.length === 0 ? 0 : Math.round((completed / allTasks.length) * 100),
      productivityTrend: productivity,
      upcomingDeadlines,
      activity: activities,
      projects: projects.map((p) => {
        const total = p.tasks.length;
        const done = p.tasks.filter(isDone).length;
        return {
          id: p.id,
          name: p.name,
          deadline: p.deadline,
          progress: total === 0 ? 0 : Math.round((done / total) * 100),
          taskCount: total,
        };
      }),
    });
  })
);

router.get(
  '/reports/:workspaceId',
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id);
    const projectId = req.query.projectId as string | undefined;

    const projects = await prisma.project.findMany({
      where: {
        workspaceId: req.params.workspaceId,
        ...(projectId ? { id: projectId } : {}),
      },
      select: {
        id: true,
        name: true,
        tasks: {
          select: {
            id: true,
            completedAt: true,
            priority: true,
            column: { select: { name: true } },
            assignee: { select: { id: true, name: true } },
          },
        },
      },
    });

    const teamMap = new Map<string, { id: string; name: string; completed: number; assigned: number }>();
    const projectHealth = projects.map((p) => {
      const total = p.tasks.length;
      const done = p.tasks.filter(
        (t) => t.completedAt || t.column.name.toLowerCase() === 'done'
      ).length;
      const highUnfinished = p.tasks.filter(
        (t) =>
          (t.priority === 'HIGH' || t.priority === 'URGENT') &&
          !(t.completedAt || t.column.name.toLowerCase() === 'done')
      ).length;
      const health = total === 0 ? 100 : Math.max(0, Math.round((done / total) * 100) - highUnfinished * 5);

      for (const task of p.tasks) {
        if (!task.assignee) continue;
        const entry = teamMap.get(task.assignee.id) || {
          id: task.assignee.id,
          name: task.assignee.name,
          completed: 0,
          assigned: 0,
        };
        entry.assigned += 1;
        if (task.completedAt || task.column.name.toLowerCase() === 'done') entry.completed += 1;
        teamMap.set(task.assignee.id, entry);
      }

      const burndown = Array.from({ length: 14 }, (_, i) => {
        const day = new Date();
        day.setDate(day.getDate() - (13 - i));
        const remaining = p.tasks.filter((t) => {
          if (!t.completedAt) return true;
          return t.completedAt > day;
        }).length;
        return { date: day.toISOString().slice(0, 10), remaining };
      });

      return {
        id: p.id,
        name: p.name,
        health,
        progress: total === 0 ? 0 : Math.round((done / total) * 100),
        total,
        done,
        highUnfinished,
        burndown,
        workload: Array.from(
          p.tasks.reduce((acc, t) => {
            if (!t.assignee) return acc;
            acc.set(t.assignee.name, (acc.get(t.assignee.name) || 0) + 1);
            return acc;
          }, new Map<string, number>())
        ).map(([name, count]) => ({ name, count })),
      };
    });

    const totalTasks = projects.reduce((s, p) => s + p.tasks.length, 0);
    const doneTasks = projects.reduce(
      (s, p) =>
        s +
        p.tasks.filter((t) => t.completedAt || t.column.name.toLowerCase() === 'done').length,
      0
    );

    res.json({
      projectHealth,
      teamPerformance: Array.from(teamMap.values()),
      completionRate: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
    });
  })
);

export default router;
