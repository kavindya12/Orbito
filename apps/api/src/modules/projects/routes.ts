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
    const statusFilter =
      status === 'ALL' ? {} : { status: status as 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' };

    const [projects, completedGroups] = await Promise.all([
      prisma.project.findMany({
        where: {
          workspaceId: req.params.workspaceId,
          ...statusFilter,
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          deadline: true,
          workspaceId: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.task.groupBy({
        by: ['projectId'],
        where: {
          project: { workspaceId: req.params.workspaceId, ...statusFilter },
          OR: [{ completedAt: { not: null } }, { column: { name: 'Done' } }],
        },
        _count: { _all: true },
      }),
    ]);

    const completedMap = new Map(completedGroups.map((g) => [g.projectId, g._count._all]));

    res.json(
      projects.map((p) => {
        const total = p._count.tasks;
        const completed = completedMap.get(p.id) ?? 0;
        const { _count, ...rest } = p;
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
          ownerId: req.user!.id,
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
          owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
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
    const existing = await getProjectAccess(req.params.projectId, req.user!.id);
    if (existing.ownerId !== req.user!.id) {
      throw new AppError('Only the project owner can edit this project', 403, 'FORBIDDEN');
    }
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
        data: [
          { projectId: project.id, userId: existing.ownerId },
          ...memberIds
            .filter((userId: string) => userId !== existing.ownerId)
            .map((userId: string) => ({ projectId: project.id, userId })),
        ],
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
    const existing = await getProjectAccess(req.params.projectId, req.user!.id);
    if (existing.ownerId !== req.user!.id) {
      throw new AppError('Only the project owner can delete this project', 403, 'FORBIDDEN');
    }
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
