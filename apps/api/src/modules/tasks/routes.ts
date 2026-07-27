import { Router } from 'express';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '@orbito/shared';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler, validateBody } from '../../lib/errors';
import { requireAuth, requireWorkspaceMember } from '../../lib/auth';
import { createNotification, logActivity } from '../../lib/activity';
import { emitToProject } from '../../lib/socket';

const router = Router();
router.use(requireAuth);

/** Fields non-owners may change (status via column, like Jira/Asana drawer + board). */
const MEMBER_STATUS_FIELDS = new Set(['columnId']);

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);
  await requireWorkspaceMember(project.workspaceId, userId);
  return project;
}

function isProjectOwner(project: { ownerId: string }, userId: string) {
  return project.ownerId === userId;
}

function assertOwnerOrStatusOnly(
  project: { ownerId: string },
  userId: string,
  body: Record<string, unknown>
) {
  if (isProjectOwner(project, userId)) return;
  const keys = Object.keys(body).filter((k) => body[k] !== undefined);
  const forbidden = keys.filter((k) => !MEMBER_STATUS_FIELDS.has(k));
  if (forbidden.length) {
    throw new AppError(
      'Only the project owner can edit task details. Members can change status only.',
      403,
      'FORBIDDEN'
    );
  }
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
    const project = await assertProjectAccess(req.params.projectId, req.user!.id);
    const { title, description, columnId, priority, assigneeId, dueDate, estimateHours, dependencyIds } =
      req.body;

    const owner = isProjectOwner(project, req.user!.id);
    if (!owner) {
      const tryingRestricted =
        (assigneeId != null && assigneeId !== '') ||
        (priority && priority !== 'MEDIUM') ||
        dueDate ||
        estimateHours != null ||
        (dependencyIds && dependencyIds.length > 0);
      if (tryingRestricted) {
        throw new AppError(
          'Only the project owner can set assignee, priority, and schedule when creating a task',
          403,
          'FORBIDDEN'
        );
      }
    }

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
        priority: owner ? priority : 'MEDIUM',
        assigneeId: owner ? assigneeId || null : null,
        creatorId: req.user!.id,
        dueDate: owner && dueDate ? new Date(dueDate) : null,
        estimateHours: owner ? (estimateHours ?? null) : null,
        position: (max._max.position ?? -1) + 1,
        completedAt: column.name.toLowerCase() === 'done' ? new Date() : null,
        dependsOn:
          owner && dependencyIds?.length
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

    if (task.assigneeId && task.assigneeId !== req.user!.id) {
      await createNotification({
        userId: task.assigneeId,
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
    const project = await assertProjectAccess(existing.projectId, req.user!.id);

    assertOwnerOrStatusOnly(project, req.user!.id, req.body);

    const { dueDate, dependencyIds, columnId, ...rest } = req.body;
    let completedAt = existing.completedAt;

    if (columnId) {
      const column = await prisma.boardColumn.findUnique({ where: { id: columnId } });
      if (!column) throw new AppError('Column not found', 404);
      completedAt = column.name.toLowerCase() === 'done' ? new Date() : null;
    }

    if (dependencyIds && isProjectOwner(project, req.user!.id)) {
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
    const project = await assertProjectAccess(existing.projectId, req.user!.id);
    if (!isProjectOwner(project, req.user!.id)) {
      throw new AppError('Only the project owner can delete tasks', 403, 'FORBIDDEN');
    }
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
