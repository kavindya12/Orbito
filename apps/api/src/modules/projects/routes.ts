import { Router } from 'express';
import {
  createProjectSchema,
  updateProjectSchema,
  createColumnSchema,
  updateColumnSchema,
  reorderColumnsSchema,
} from '@orbito/shared';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler, validateBody } from '../../lib/errors';
import { requireAuth, requireWorkspaceMember } from '../../lib/auth';
import { logActivity } from '../../lib/activity';
import { DEFAULT_COLUMNS } from '../auth/routes';

const router = Router();
router.use(requireAuth);

async function getProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);
  await requireWorkspaceMember(project.workspaceId, userId);
  return project;
}

router.get(
  '/workspace/:workspaceId',
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id);
    const status = (req.query.status as string) || 'ACTIVE';
    const projects = await prisma.project.findMany({
      where: {
        workspaceId: req.params.workspaceId,
        ...(status === 'ALL' ? {} : { status: status as 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' }),
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count: { select: { tasks: true } },
        tasks: { select: { id: true, completedAt: true, column: { select: { name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(
      projects.map((p) => {
        const completed = p.tasks.filter(
          (t) => t.completedAt || t.column.name.toLowerCase() === 'done'
        ).length;
        const total = p.tasks.length;
        const { tasks, ...rest } = p;
        return {
          ...rest,
          progress: total === 0 ? 0 : Math.round((completed / total) * 100),
          taskCount: total,
          completedCount: completed,
        };
      })
    );
  })
);

router.post(
  '/workspace/:workspaceId',
  validateBody(createProjectSchema),
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id, ['OWNER', 'ADMIN', 'MEMBER']);
    const { name, description, deadline, memberIds } = req.body;

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          workspaceId: req.params.workspaceId,
          name,
          description,
          deadline: deadline ? new Date(deadline) : null,
          members: {
            create: [
              { userId: req.user!.id },
              ...(memberIds || [])
                .filter((id: string) => id !== req.user!.id)
                .map((userId: string) => ({ userId })),
            ],
          },
          columns: {
            create: DEFAULT_COLUMNS.map((col, index) => ({
              name: col.name,
              color: col.color,
              position: index,
            })),
          },
        },
        include: {
          columns: { orderBy: { position: 'asc' } },
          members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        },
      });
      return created;
    });

    await logActivity({
      userId: req.user!.id,
      projectId: project.id,
      action: 'created project',
      metadata: { name: project.name },
    });

    res.status(201).json(project);
  })
);

router.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    await getProjectAccess(req.params.projectId, req.user!.id);
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: {
                assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
                _count: { select: { comments: true, attachments: true } },
              },
            },
          },
        },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
    });
    res.json(project);
  })
);

router.patch(
  '/:projectId',
  validateBody(updateProjectSchema),
  asyncHandler(async (req, res) => {
    await getProjectAccess(req.params.projectId, req.user!.id);
    const { deadline, memberIds, ...rest } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: {
        ...rest,
        deadline: deadline === undefined ? undefined : deadline ? new Date(deadline) : null,
      },
    });

    if (memberIds) {
      await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
      await prisma.projectMember.createMany({
        data: memberIds.map((userId: string) => ({ projectId: project.id, userId })),
        skipDuplicates: true,
      });
    }

    await logActivity({
      userId: req.user!.id,
      projectId: project.id,
      action: 'updated project',
    });

    res.json(project);
  })
);

router.delete(
  '/:projectId',
  asyncHandler(async (req, res) => {
    await getProjectAccess(req.params.projectId, req.user!.id);
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ ok: true });
  })
);

router.post(
  '/:projectId/columns',
  validateBody(createColumnSchema),
  asyncHandler(async (req, res) => {
    await getProjectAccess(req.params.projectId, req.user!.id);
    const max = await prisma.boardColumn.aggregate({
      where: { projectId: req.params.projectId },
      _max: { position: true },
    });
    const column = await prisma.boardColumn.create({
      data: {
        projectId: req.params.projectId,
        name: req.body.name,
        color: req.body.color || '#64748B',
        position: (max._max.position ?? -1) + 1,
      },
    });
    res.status(201).json(column);
  })
);

router.patch(
  '/:projectId/columns/:columnId',
  validateBody(updateColumnSchema),
  asyncHandler(async (req, res) => {
    await getProjectAccess(req.params.projectId, req.user!.id);
    const column = await prisma.boardColumn.update({
      where: { id: req.params.columnId },
      data: req.body,
    });
    res.json(column);
  })
);

router.post(
  '/:projectId/columns/reorder',
  validateBody(reorderColumnsSchema),
  asyncHandler(async (req, res) => {
    await getProjectAccess(req.params.projectId, req.user!.id);
    await prisma.$transaction(
      req.body.columnIds.map((id: string, position: number) =>
        prisma.boardColumn.update({ where: { id }, data: { position } })
      )
    );
    res.json({ ok: true });
  })
);

router.delete(
  '/:projectId/columns/:columnId',
  asyncHandler(async (req, res) => {
    await getProjectAccess(req.params.projectId, req.user!.id);
    const tasks = await prisma.task.count({ where: { columnId: req.params.columnId } });
    if (tasks > 0) throw new AppError('Move or delete tasks before removing column', 400);
    await prisma.boardColumn.delete({ where: { id: req.params.columnId } });
    res.json({ ok: true });
  })
);

export default router;
