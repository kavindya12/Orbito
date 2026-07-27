import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/errors';
import { requireAuth, requireWorkspaceMember } from '../../lib/auth';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const workspaceId = String(req.query.workspaceId || '');
    if (!workspaceId) return res.json({ tasks: [], projects: [], users: [], comments: [] });
    await requireWorkspaceMember(workspaceId, req.user!.id);
    if (!q) return res.json({ tasks: [], projects: [], users: [], comments: [] });

    const [tasks, projects, members, comments] = await Promise.all([
      prisma.task.findMany({
        where: {
          project: { workspaceId },
          OR: [{ title: { contains: q } }, { description: { contains: q } }],
        },
        include: { project: { select: { id: true, name: true } } },
        take: 10,
      }),
      prisma.project.findMany({
        where: {
          workspaceId,
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        },
        take: 10,
      }),
      prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          user: {
            OR: [{ name: { contains: q } }, { email: { contains: q } }],
          },
        },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        take: 10,
      }),
      prisma.comment.findMany({
        where: {
          task: { project: { workspaceId } },
          message: { contains: q },
        },
        include: {
          user: { select: { id: true, name: true } },
          task: { select: { id: true, title: true, projectId: true } },
        },
        take: 10,
      }),
    ]);

    res.json({
      tasks,
      projects,
      users: members.map((m) => m.user),
      comments,
    });
  })
);

export default router;
