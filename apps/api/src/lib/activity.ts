import { prisma } from './prisma';
import { NotificationType } from '@prisma/client';
import { emitToUser } from './socket';

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  const notification = await prisma.notification.create({ data: input });
  try {
    emitToUser(input.userId, 'notification', notification);
  } catch {
    // socket may not be ready in scripts
  }
  return notification;
}

export async function logActivity(input: {
  userId: string;
  action: string;
  projectId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.activity.create({
    data: {
      userId: input.userId,
      action: input.action,
      projectId: input.projectId,
      taskId: input.taskId,
      metadata: input.metadata ?? undefined,
    },
  });
}
