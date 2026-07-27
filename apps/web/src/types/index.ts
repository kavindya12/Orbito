export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type Workspace = {
  id: string;
  name: string;
  role?: string;
  projectCount?: number;
  memberCount?: number;
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  deadline?: string | null;
  workspaceId: string;
  progress?: number;
  taskCount?: number;
  completedCount?: number;
  members?: Array<{ user: User }>;
  columns?: BoardColumn[];
};

export type BoardColumn = {
  id: string;
  name: string;
  color: string;
  position: number;
  tasks?: Task[];
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  position: number;
  columnId: string;
  projectId: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimateHours?: number | null;
  timeSpentHours?: number;
  completedAt?: string | null;
  assignee?: User | null;
  creator?: User;
  project?: { id: string; name: string };
  column?: BoardColumn;
  comments?: Comment[];
  attachments?: Attachment[];
  _count?: { comments: number; attachments: number };
};

export type Comment = {
  id: string;
  message: string;
  createdAt: string;
  user: User;
};

export type Attachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export type WorkspaceMember = {
  id: string;
  role: string;
  joinedAt: string;
  user: User;
  assignedTasks?: number;
  completedTasks?: number;
};

export type UpcomingDeadline = {
  id: string;
  title: string;
  dueDate?: string | null;
  type: 'task' | 'project';
  project?: { id: string; name: string };
  assignee?: { id: string; name: string } | null;
};

export type DashboardData = {
  activeProjects: number;
  taskStats: { completed: number; pending: number; overdue: number; total: number };
  productivityScore: number;
  productivityTrend: Array<{ date: string; completed: number }>;
  upcomingDeadlines: UpcomingDeadline[];
  activity: Array<{
    id: string;
    action: string;
    createdAt: string;
    user: { id: string; name: string };
    project?: { id: string; name: string };
  }>;
  projects: Array<{
    id: string;
    name: string;
    deadline?: string | null;
    progress: number;
    taskCount: number;
  }>;
};

export type ReportsData = {
  projectHealth: Array<{
    id: string;
    name: string;
    health: number;
    progress: number;
    total: number;
    done: number;
    burndown: Array<{ date: string; remaining: number }>;
    workload: Array<{ name: string; count: number }>;
  }>;
  teamPerformance: Array<{ id: string; name: string; completed: number; assigned: number }>;
  completionRate: number;
};

export type SearchResults = {
  tasks: Array<Task & { project: { id: string; name: string } }>;
  projects: Project[];
  users: User[];
  comments: Array<Comment & { task: { id: string; title: string; projectId: string } }>;
};
