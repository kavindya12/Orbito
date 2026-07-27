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
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to
      ? new Date(String(req.query.to))
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    const tasks = await prisma.task.findMany({
      where: {
        project: { workspaceId: req.params.workspaceId },
        dueDate: { gte: from, lte: to },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        column: { select: { name: true, color: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const projects = await prisma.project.findMany({
      where: {
        workspaceId: req.params.workspaceId,
        deadline: { gte: from, lte: to },
      },
      select: { id: true, name: true, deadline: true, status: true },
    });

    res.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        type: 'deadline' as const,
        project: t.project,
        assignee: t.assignee,
        column: t.column,
      })),
      milestones: projects.map((p) => ({
        id: p.id,
        title: `${p.name} deadline`,
        dueDate: p.deadline,
        type: 'milestone' as const,
        project: { id: p.id, name: p.name },
        status: p.status,
      })),
    });
  })
);

export default router;
