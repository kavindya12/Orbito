import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { createCommentSchema } from '@orbito/shared';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler, validateBody } from '../../lib/errors';
import { requireAuth, requireWorkspaceMember } from '../../lib/auth';
import { createNotification, logActivity } from '../../lib/activity';
import { assertFile, uploadFile } from '../../lib/upload';
import { emitToProject } from '../../lib/socket';

const router = Router();
const upload = multer({ dest: os.tmpdir() });
router.use(requireAuth);

async function assertTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) throw new AppError('Task not found', 404);
  await requireWorkspaceMember(task.project.workspaceId, userId);
  return task;
}

router.post(
  '/task/:taskId',
  validateBody(createCommentSchema),
  asyncHandler(async (req, res) => {
    const task = await assertTaskAccess(req.params.taskId, req.user!.id);
    const comment = await prisma.comment.create({
      data: {
        taskId: task.id,
        userId: req.user!.id,
        message: req.body.message,
      },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    await logActivity({
      userId: req.user!.id,
      projectId: task.projectId,
      taskId: task.id,
      action: 'commented on task',
    });

    const mentionIds: string[] = req.body.mentions || [];
    const notifyIds = new Set<string>(mentionIds);
    if (task.assigneeId) notifyIds.add(task.assigneeId);
    notifyIds.delete(req.user!.id);

    for (const userId of notifyIds) {
      await createNotification({
        userId,
        type: mentionIds.includes(userId) ? 'MENTION' : 'COMMENT',
        title: mentionIds.includes(userId) ? 'You were mentioned' : 'New comment',
        message: `${req.user!.name}: ${req.body.message.slice(0, 120)}`,
        link: `/app/projects/${task.projectId}?task=${task.id}`,
      });
    }

    try {
      emitToProject(task.projectId, 'comment:created', { taskId: task.id, comment });
    } catch {
      /* ignore */
    }

    res.status(201).json(comment);
  })
);

router.post(
  '/task/:taskId/attachments',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const task = await assertTaskAccess(req.params.taskId, req.user!.id);
    const file = assertFile(req.file);
    const uploaded = await uploadFile(file);
    const attachment = await prisma.attachment.create({
      data: {
        taskId: task.id,
        userId: req.user!.id,
        ...uploaded,
      },
    });
    await logActivity({
      userId: req.user!.id,
      projectId: task.projectId,
      taskId: task.id,
      action: `uploaded ${uploaded.fileName}`,
    });
    res.status(201).json(attachment);
  })
);

export default router;
