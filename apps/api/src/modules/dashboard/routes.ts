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

    const projects = await prisma.project.findMany({
      where: { workspaceId: req.params.workspaceId, status: 'ACTIVE' },
      include: {
        tasks: {
          include: { column: { select: { name: true } }, assignee: { select: { id: true, name: true } } },
        },
      },
    });

    const allTasks = projects.flatMap((p) => p.tasks);
    const completed = allTasks.filter(
      (t) => t.completedAt || t.column.name.toLowerCase() === 'done'
    ).length;
    const pending = allTasks.length - completed;
    const overdue = allTasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < new Date() &&
        !(t.completedAt || t.column.name.toLowerCase() === 'done')
    ).length;

    const upcomingTasks = await prisma.task.findMany({
      where: {
        project: { workspaceId: req.params.workspaceId },
        dueDate: { gte: new Date() },
        completedAt: null,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 8,
    });

    const upcomingProjects = await prisma.project.findMany({
      where: {
        workspaceId: req.params.workspaceId,
        status: 'ACTIVE',
        deadline: { gte: new Date() },
      },
      select: { id: true, name: true, deadline: true },
      orderBy: { deadline: 'asc' },
      take: 8,
    });

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

    const activities = await prisma.activity.findMany({
      where: { project: { workspaceId: req.params.workspaceId } },
      include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // Productivity: completed tasks per day for last 14 days
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);
    const recentCompleted = allTasks.filter((t) => t.completedAt && t.completedAt >= since);
    const productivity = Array.from({ length: 14 }, (_, i) => {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      const count = recentCompleted.filter(
        (t) => t.completedAt && t.completedAt.toISOString().slice(0, 10) === key
      ).length;
      return { date: key, completed: count };
    });

    const productivityScore =
      allTasks.length === 0 ? 0 : Math.round((completed / allTasks.length) * 100);

    res.json({
      activeProjects: projects.length,
      taskStats: { completed, pending, overdue, total: allTasks.length },
      productivityScore,
      productivityTrend: productivity,
      upcomingDeadlines,
      activity: activities,
      projects: projects.map((p) => {
        const total = p.tasks.length;
        const done = p.tasks.filter(
          (t) => t.completedAt || t.column.name.toLowerCase() === 'done'
        ).length;
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
      include: {
        tasks: {
          include: {
            column: true,
            assignee: { select: { id: true, name: true } },
          },
        },
        members: { include: { user: { select: { id: true, name: true } } } },
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

      // Simple burndown: remaining tasks over last 14 days snapshot approximation
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

    res.json({
      projectHealth,
      teamPerformance: Array.from(teamMap.values()),
      completionRate:
        projects.reduce((s, p) => s + p.tasks.length, 0) === 0
          ? 0
          : Math.round(
              (projects.reduce(
                (s, p) =>
                  s +
                  p.tasks.filter((t) => t.completedAt || t.column.name.toLowerCase() === 'done')
                    .length,
                0
              ) /
                projects.reduce((s, p) => s + p.tasks.length, 0)) *
                100
            ),
    });
  })
);

export default router;
