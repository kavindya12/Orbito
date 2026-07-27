import { z } from 'zod';

export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  workspaceName: z.string().min(2).max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  deadline: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
});

export const createColumnSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().optional(),
});

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string()),
});

export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  columnId: z.string().min(1),
  priority: taskPrioritySchema.default('MEDIUM'),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimateHours: z.number().min(0).max(1000).optional().nullable(),
  dependencyIds: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  columnId: z.string().optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimateHours: z.number().min(0).max(1000).optional().nullable(),
  position: z.number().int().min(0).optional(),
  timeSpentHours: z.number().min(0).optional(),
  dependencyIds: z.array(z.string()).optional(),
});

export const moveTaskSchema = z.object({
  columnId: z.string().min(1),
  position: z.number().int().min(0),
});

export const createCommentSchema = z.object({
  message: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
});

export const aiBreakdownSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  createTasks: z.boolean().optional(),
  projectId: z.string().optional(),
  columnId: z.string().optional(),
});

export const aiPrioritySchema = z.object({
  projectId: z.string().min(1),
});

export const aiHealthSchema = z.object({
  projectId: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const WorkspaceRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export const ProjectStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  COMPLETED: 'COMPLETED',
} as const;

export const TaskPriorityEnum = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type ApiError = {
  message: string;
  code?: string;
  details?: unknown;
};
