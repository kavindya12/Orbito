import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createWorkspaceSchema, inviteMemberSchema, updateMemberRoleSchema } from '@orbito/shared';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler, validateBody } from '../../lib/errors';
import { requireAuth, requireWorkspaceMember } from '../../lib/auth';
import { createNotification } from '../../lib/activity';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.id },
      include: {
        workspace: {
          include: {
            _count: { select: { projects: true, members: true } },
          },
        },
      },
    });
    res.json(
      memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
        projectCount: m.workspace._count.projects,
        memberCount: m.workspace._count.members,
      }))
    );
  })
);

router.post(
  '/',
  validateBody(createWorkspaceSchema),
  asyncHandler(async (req, res) => {
    const workspace = await prisma.workspace.create({
      data: {
        name: req.body.name,
        ownerId: req.user!.id,
        members: { create: { userId: req.user!.id, role: 'OWNER' } },
      },
    });
    res.status(201).json(workspace);
  })
);

router.get(
  '/:workspaceId',
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id);
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.workspaceId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count: { select: { projects: true } },
      },
    });
    if (!workspace) throw new AppError('Workspace not found', 404);
    res.json(workspace);
  })
);

router.get(
  '/:workspaceId/members',
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id);
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            assignedTasks: {
              where: { project: { workspaceId: req.params.workspaceId } },
              select: {
                id: true,
                completedAt: true,
                column: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    res.json(
      members.map((m) => {
        const assigned = m.user.assignedTasks.length;
        const completed = m.user.assignedTasks.filter(
          (t) => t.completedAt || t.column.name.toLowerCase() === 'done'
        ).length;
        return {
          id: m.id,
          role: m.role,
          joinedAt: m.joinedAt,
          user: {
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
          },
          assignedTasks: assigned,
          completedTasks: completed,
        };
      })
    );
  })
);

router.post(
  '/:workspaceId/members',
  validateBody(inviteMemberSchema),
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id, ['OWNER', 'ADMIN']);
    const { email, role } = req.body;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const tempPassword = await bcrypt.hash(`temp-${Date.now()}`, 10);
      user = await prisma.user.create({
        data: {
          name: email.split('@')[0],
          email,
          passwordHash: tempPassword,
        },
      });
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: user.id } },
    });
    if (existing) throw new AppError('User already a member', 409);

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: req.params.workspaceId,
        userId: user.id,
        role: role || 'MEMBER',
      },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    const workspace = await prisma.workspace.findUnique({ where: { id: req.params.workspaceId } });
    await createNotification({
      userId: user.id,
      type: 'SYSTEM',
      title: 'Workspace invite',
      message: `You were added to ${workspace?.name ?? 'a workspace'}`,
      link: `/app`,
    });

    res.status(201).json(member);
  })
);

router.patch(
  '/:workspaceId/members/:memberId',
  validateBody(updateMemberRoleSchema),
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id, ['OWNER']);
    const member = await prisma.workspaceMember.update({
      where: { id: req.params.memberId },
      data: { role: req.body.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(member);
  })
);

router.delete(
  '/:workspaceId/members/:memberId',
  asyncHandler(async (req, res) => {
    await requireWorkspaceMember(req.params.workspaceId, req.user!.id, ['OWNER', 'ADMIN']);
    const member = await prisma.workspaceMember.findUnique({ where: { id: req.params.memberId } });
    if (!member || member.workspaceId !== req.params.workspaceId) {
      throw new AppError('Member not found', 404);
    }
    if (member.role === 'OWNER') throw new AppError('Cannot remove owner', 400);
    await prisma.workspaceMember.delete({ where: { id: member.id } });
    res.json({ ok: true });
  })
);

export default router;
