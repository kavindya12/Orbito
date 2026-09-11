import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/** True on GitHub Pages (or when VITE_DEMO_MODE=true) — no real backend. */
export function isDemoMode() {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return true;
  if (import.meta.env.VITE_API_URL) return false;
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) return true;
  return false;
}

const demoUser = {
  id: 'demo-user-1',
  name: 'Kavindya',
  email: 'kavindya@orbito.dev',
  avatarUrl: null as string | null,
};

const demoWorkspace = {
  id: 'demo-ws-1',
  name: 'NexGen Developers',
  role: 'OWNER',
  projectCount: 2,
  memberCount: 3,
};

const demoProjects = [
  {
    id: 'demo-proj-1',
    name: 'MediEase Healthcare System',
    description: 'AI-based EHR Platform',
    status: 'ACTIVE',
    deadline: '2026-12-30T00:00:00.000Z',
    progress: 45,
    taskCount: 8,
    ownerId: demoUser.id,
  },
  {
    id: 'demo-proj-2',
    name: 'Shoppy',
    description: 'E-commerce demo',
    status: 'ACTIVE',
    deadline: '2026-10-15T00:00:00.000Z',
    progress: 20,
    taskCount: 3,
    ownerId: demoUser.id,
  },
];

function ok<T>(data: T, config: AxiosRequestConfig): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: config as InternalAxiosRequestConfig,
  };
}

function fail(message: string, status = 400): never {
  const error = new Error(message) as Error & {
    isAxiosError: boolean;
    response: { status: number; data: { message: string } };
  };
  error.isAxiosError = true;
  error.response = { status, data: { message } };
  throw error;
}

function pathOf(config: AxiosRequestConfig) {
  const raw = `${config.baseURL || ''}${config.url || ''}`;
  try {
    return new URL(raw, 'http://demo.local').pathname.replace(/\/+$/, '') || '/';
  } catch {
    return (config.url || '').split('?')[0];
  }
}

export async function demoAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  // Simulate a tiny network delay
  await new Promise((r) => setTimeout(r, 200));

  const method = (config.method || 'get').toLowerCase();
  const path = pathOf(config);
  const body =
    typeof config.data === 'string'
      ? JSON.parse(config.data || '{}')
      : config.data || {};

  // Auth
  if (method === 'post' && path.endsWith('/auth/login')) {
    if (body.email === 'kavindya@orbito.dev' && body.password === 'password123') {
      return ok(
        {
          user: demoUser,
          accessToken: 'demo-token',
          workspaces: [demoWorkspace],
        },
        config
      );
    }
    fail('Invalid email or password', 401);
  }

  if (method === 'post' && path.endsWith('/auth/register')) {
    return ok(
      {
        user: { ...demoUser, name: body.name || 'Demo User', email: body.email },
        accessToken: 'demo-token',
        workspaces: [{ ...demoWorkspace, name: body.workspaceName || 'My Workspace' }],
      },
      config
    );
  }

  if (method === 'post' && path.endsWith('/auth/logout')) {
    return ok({ ok: true }, config);
  }

  if (method === 'post' && path.endsWith('/auth/refresh')) {
    return ok({ accessToken: 'demo-token', user: demoUser }, config);
  }

  if (method === 'patch' && path.endsWith('/auth/me')) {
    return ok({ user: { ...demoUser, name: body.name || demoUser.name } }, config);
  }

  // Dashboard
  if (method === 'get' && path.includes('/dashboard/workspace/')) {
    const today = new Date();
    const trend = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - i));
      return {
        date: d.toISOString().slice(0, 10),
        completed: [0, 1, 0, 2, 1, 0, 1, 3, 1, 0, 2, 1, 1, 2][i],
      };
    });
    return ok(
      {
        activeProjects: demoProjects.length,
        taskStats: { completed: 9, pending: 11, overdue: 2, total: 20 },
        productivityScore: 45,
        productivityTrend: trend,
        upcomingDeadlines: [
          {
            id: 'demo-task-1',
            title: 'API Development',
            dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
            type: 'task',
            project: { id: 'demo-proj-1', name: 'MediEase Healthcare System' },
            assignee: { id: demoUser.id, name: demoUser.name },
          },
        ],
        activity: [
          {
            id: 'a1',
            action: 'completed Requirement Analysis',
            createdAt: new Date().toISOString(),
            user: demoUser,
            project: { id: 'demo-proj-1', name: 'MediEase Healthcare System' },
          },
          {
            id: 'a2',
            action: 'created project',
            createdAt: new Date().toISOString(),
            user: demoUser,
            project: { id: 'demo-proj-1', name: 'MediEase Healthcare System' },
          },
        ],
        projects: demoProjects,
      },
      config
    );
  }

  if (method === 'get' && path.includes('/dashboard/reports/')) {
    return ok(
      {
        projectHealth: demoProjects.map((p) => ({
          id: p.id,
          name: p.name,
          health: 80,
          progress: p.progress,
          total: p.taskCount,
          done: Math.round((p.progress / 100) * p.taskCount),
          highUnfinished: 1,
          burndown: [],
          workload: [{ name: 'Kavindya', count: 4 }],
        })),
        teamPerformance: [
          { id: demoUser.id, name: 'Kavindya', completed: 5, assigned: 8 },
          { id: 'demo-user-2', name: 'John', completed: 3, assigned: 6 },
        ],
        completionRate: 45,
      },
      config
    );
  }

  // Projects
  if (method === 'get' && path.includes('/projects/workspace/')) {
    return ok(demoProjects, config);
  }

  if (method === 'get' && /\/projects\/[^/]+$/.test(path) && !path.includes('/workspace/')) {
    const project = demoProjects[0];
    return ok(
      {
        ...project,
        columns: [
          {
            id: 'col-1',
            name: 'To Do',
            color: '#6366F1',
            position: 0,
            tasks: [
              {
                id: 't1',
                title: 'Database Design',
                priority: 'HIGH',
                columnId: 'col-1',
                position: 0,
                completedAt: null,
              },
            ],
          },
          {
            id: 'col-2',
            name: 'Development',
            color: '#6366F1',
            position: 1,
            tasks: [
              {
                id: 't2',
                title: 'Build Login Interface',
                priority: 'HIGH',
                columnId: 'col-2',
                position: 0,
                completedAt: null,
              },
            ],
          },
          {
            id: 'col-3',
            name: 'Done',
            color: '#22C55E',
            position: 2,
            tasks: [
              {
                id: 't3',
                title: 'Requirement Analysis',
                priority: 'HIGH',
                columnId: 'col-3',
                position: 0,
                completedAt: new Date().toISOString(),
              },
            ],
          },
        ],
        members: [{ user: demoUser }],
      },
      config
    );
  }

  if (method === 'post' && path.includes('/projects/workspace/')) {
    return ok({ id: 'demo-proj-new', name: body.name, status: 'ACTIVE', ...body }, config);
  }

  if (method === 'patch' && path.includes('/projects/')) {
    return ok({ ...demoProjects[0], ...body }, config);
  }

  if (method === 'delete' && path.includes('/projects/')) {
    return ok({ ok: true }, config);
  }

  // Tasks
  if (method === 'get' && path.includes('/tasks/mine')) {
    return ok(
      [
        {
          id: 't2',
          title: 'Build Login Interface',
          priority: 'HIGH',
          completedAt: null,
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          project: { id: 'demo-proj-1', name: 'MediEase Healthcare System', workspaceId: demoWorkspace.id },
          column: { id: 'col-2', name: 'Development', color: '#6366F1' },
        },
      ],
      config
    );
  }

  if (method === 'post' && (path.includes('/tasks/') || path.includes('/move'))) {
    return ok({ ok: true, ...body }, config);
  }

  // Team / notifications / calendar / search / AI — safe empty defaults
  if (method === 'get' && path.includes('/members')) {
    return ok(
      [
        { user: demoUser, role: 'OWNER' },
        { user: { id: 'demo-user-2', name: 'John', email: 'john@orbito.dev' }, role: 'MEMBER' },
        { user: { id: 'demo-user-3', name: 'Sarah', email: 'sarah@orbito.dev' }, role: 'ADMIN' },
      ],
      config
    );
  }

  if (method === 'get' && path.includes('/notifications/unread-count')) {
    return ok({ count: 2 }, config);
  }

  if (method === 'get' && path.includes('/notifications')) {
    return ok(
      [
        {
          id: 'n1',
          title: 'Task assigned',
          message: 'You were assigned "Build Login Interface"',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      config
    );
  }

  if (method === 'post' && path.includes('/notifications')) {
    return ok({ ok: true }, config);
  }

  if (method === 'get' && path.includes('/calendar')) {
    return ok({ tasks: [], milestones: [] }, config);
  }

  if (method === 'get' && path.includes('/search')) {
    return ok({ tasks: [], projects: demoProjects, users: [demoUser], comments: [] }, config);
  }

  if (method === 'post' && path.includes('/ai/')) {
    return ok(
      {
        subtasks: ['Research requirements', 'Draft design', 'Implement MVP'],
        suggestions: [],
        score: 72,
        summary: 'Demo health check — project looks on track.',
      },
      config
    );
  }

  // Fallback so the UI does not crash
  if (method === 'get') return ok([], config);
  return ok({ ok: true }, config);
}
