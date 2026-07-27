import { Router } from 'express';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '@orbito/shared';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler, validateBody } from '../../lib/errors';
import { requireAuth, requireWorkspaceMember } from '../../lib/auth';
import { createNotification, logActivity } from '../../lib/activity';
import { emitToProject } from '../../lib/socket';

const router = Router();
router.use(requireAuth);

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);
  await requireWorkspaceMember(project.workspaceId, userId);
  return project;
}

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  creator: { select: { id: true, name: true, email: true } },
  column: true,
  comments: {
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  attachments: true,
  dependsOn: { include: { dependsOn: { select: { id: true, title: true } } } },
  _count: { select: { comments: true, attachments: true } },
};

router.post(
  '/project/:projectId',
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    await assertProjectAccess(req.params.projectId, req.user!.id);
    const { title, description, columnId, priority, assigneeId, dueDate, estimateHours, dependencyIds } =
      req.body;

    const column = await prisma.boardColumn.findFirst({
      where: { id: columnId, projectId: req.params.projectId },
    });
    if (!column) throw new AppError('Column not found', 404);

    const max = await prisma.task.aggregate({
      where: { columnId },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        projectId: req.params.projectId,
        columnId,
        title,
        description,
        priority,
        assigneeId: assigneeId || null,
        creatorId: req.user!.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimateHours: estimateHours ?? null,
        position: (max._max.position ?? -1) + 1,
        completedAt: column.name.toLowerCase() === 'done' ? new Date() : null,
        dependsOn: dependencyIds?.length
          ? { create: dependencyIds.map((dependsOnId: string) => ({ dependsOnId })) }
          : undefined,
      },
      include: taskInclude,
    });

    await logActivity({
      userId: req.user!.id,
      projectId: req.params.projectId,
      taskId: task.id,
      action: `created task "${title}"`,
    });

    if (assigneeId && assigneeId !== req.user!.id) {
      await createNotification({
        userId: assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned',
        message: `You were assigned "${title}"`,
        link: `/app/projects/${req.params.projectId}?task=${task.id}`,
      });
    }

    try {
      emitToProject(req.params.projectId, 'task:created', task);
    } catch {
      /* ignore */
    }

    res.status(201).json(task);
  })
);

router.get(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        ...taskInclude,
        activities: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!task) throw new AppError('Task not found', 404);
    await assertProjectAccess(task.projectId, req.user!.id);
    res.json(task);
  })
);

router.patch(
  '/:taskId',
  validateBody(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!existing) throw new AppError('Task not found', 404);
    await assertProjectAccess(existing.projectId, req.user!.id);

    const { dueDate, dependencyIds, columnId, ...rest } = req.body;
    let completedAt = existing.completedAt;

    if (columnId) {
      const column = await prisma.boardColumn.findUnique({ where: { id: columnId } });
      if (!column) throw new AppError('Column not found', 404);
      completedAt = column.name.toLowerCase() === 'done' ? new Date() : null;
    }

    if (dependencyIds) {
      await prisma.taskDependency.deleteMany({ where: { taskId: existing.id } });
      if (dependencyIds.length) {
        await prisma.taskDependency.createMany({
          data: dependencyIds.map((dependsOnId: string) => ({
            taskId: existing.id,
            dependsOnId,
          })),
        });
      }
    }

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...rest,
        columnId,
        dueDate: dueDate === undefined ? undefined : dueDate ? new Date(dueDate) : null,
        completedAt,
      },
      include: taskInclude,
    });

    if (rest.assigneeId && rest.assigneeId !== existing.assigneeId && rest.assigneeId !== req.user!.id) {
      await createNotification({
        userId: rest.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned',
        message: `You were assigned "${task.title}"`,
        link: `/app/projects/${task.projectId}?task=${task.id}`,
      });
    }

    await logActivity({
      userId: req.user!.id,
      projectId: task.projectId,
      taskId: task.id,
      action: `updated task "${task.title}"`,
    });

    try {
      emitToProject(task.projectId, 'task:updated', task);
    } catch {
      /* ignore */
    }

    res.json(task);
  })
);

router.post(
  '/:taskId/move',
  validateBody(moveTaskSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!existing) throw new AppError('Task not found', 404);
    await assertProjectAccess(existing.projectId, req.user!.id);

    const { columnId, position } = req.body;
    const column = await prisma.boardColumn.findFirst({
      where: { id: columnId, projectId: existing.projectId },
    });
    if (!column) throw new AppError('Column not found', 404);

    const siblings = await prisma.task.findMany({
      where: { columnId, id: { not: existing.id } },
      orderBy: { position: 'asc' },
    });

    const ordered = [...siblings];
    ordered.splice(position, 0, existing);

    await prisma.$transaction(
      ordered.map((t, index) =>
        prisma.task.update({
          where: { id: t.id },
          data: {
            columnId,
            position: index,
            completedAt:
              t.id === existing.id
                ? column.name.toLowerCase() === 'done'
                  ? new Date()
                  : null
                : undefined,
          },
        })
      )
    );

    const task = await prisma.task.findUnique({
      where: { id: existing.id },
      include: taskInclude,
    });

    await logActivity({
      userId: req.user!.id,
      projectId: existing.projectId,
      taskId: existing.id,
      action: `moved task to ${column.name}`,
    });

    try {
      emitToProject(existing.projectId, 'task:moved', task);
    } catch {
      /* ignore */
    }

    res.json(task);
  })
);

router.delete(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const existing = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!existing) throw new AppError('Task not found', 404);
    await assertProjectAccess(existing.projectId, req.user!.id);
    await prisma.task.delete({ where: { id: existing.id } });
    try {
      emitToProject(existing.projectId, 'task:deleted', { id: existing.id });
    } catch {
      /* ignore */
    }
    res.json({ ok: true });
  })
);

export default router;
