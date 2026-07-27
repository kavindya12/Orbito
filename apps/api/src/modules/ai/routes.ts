import { Router } from 'express';
import { aiBreakdownSchema, aiPrioritySchema, aiHealthSchema } from '@orbito/shared';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler, validateBody } from '../../lib/errors';
import { requireAuth, requireWorkspaceMember } from '../../lib/auth';

const router = Router();
router.use(requireAuth);

async function callOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Orbito AI, a project management assistant. Respond with concise JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

function heuristicBreakdown(title: string, description?: string) {
  const base = [
    `Clarify requirements for ${title}`,
    `Design approach for ${title}`,
    `Implement core ${title}`,
    `Add validation and error handling`,
    `Write tests for ${title}`,
  ];
  if (description?.toLowerCase().includes('auth')) {
    return [
      'Create Login UI',
      'Add Form Validation',
      'Connect API',
      'Add JWT Authentication',
      'Testing',
    ];
  }
  return base;
}

router.post(
  '/breakdown',
  validateBody(aiBreakdownSchema),
  asyncHandler(async (req, res) => {
    const { title, description, createTasks, projectId, columnId } = req.body;

    const aiText = await callOpenAI(
      `Break down this task into 4-7 concrete subtasks as JSON array of strings. Title: ${title}. Description: ${description || 'n/a'}`
    );

    let subtasks = heuristicBreakdown(title, description);
    if (aiText) {
      try {
        const parsed = JSON.parse(aiText.replace(/```json|```/g, '').trim());
        if (Array.isArray(parsed)) subtasks = parsed.map(String);
      } catch {
        /* keep heuristic */
      }
    }

    let created: unknown[] = [];
    if (createTasks && projectId && columnId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError('Project not found', 404);
      await requireWorkspaceMember(project.workspaceId, req.user!.id);
      const max = await prisma.task.aggregate({ where: { columnId }, _max: { position: true } });
      created = await Promise.all(
        subtasks.map((t, i) =>
          prisma.task.create({
            data: {
              projectId,
              columnId,
              title: t,
              creatorId: req.user!.id,
              position: (max._max.position ?? -1) + 1 + i,
              priority: 'MEDIUM',
            },
          })
        )
      );
    }

    res.json({ subtasks, created, source: aiText ? 'openai' : 'heuristic' });
  })
);

router.post(
  '/priority',
  validateBody(aiPrioritySchema),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.body.projectId },
      include: {
        tasks: {
          include: {
            column: true,
            dependsOn: { include: { dependsOn: { select: { id: true, title: true, completedAt: true } } } },
            assignee: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!project) throw new AppError('Project not found', 404);
    await requireWorkspaceMember(project.workspaceId, req.user!.id);

    const open = project.tasks.filter((t) => !(t.completedAt || t.column.name.toLowerCase() === 'done'));
    const scored = open.map((t) => {
      let score = 0;
      if (t.priority === 'URGENT') score += 40;
      if (t.priority === 'HIGH') score += 30;
      if (t.priority === 'MEDIUM') score += 15;
      if (t.dueDate) {
        const days = (t.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (days < 0) score += 35;
        else if (days < 3) score += 25;
        else if (days < 7) score += 15;
      }
      const blockers = t.dependsOn.filter((d) => !d.dependsOn.completedAt).length;
      score += blockers * 10;
      const dependents = project.tasks.filter((other) =>
        other.dependsOn.some((d) => d.dependsOnId === t.id)
      ).length;
      score += dependents * 12;
      return { task: t, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    const recommendation = top
      ? {
          taskId: top.task.id,
          title: top.task.title,
          reason:
            top.task.dependsOn.some((d) => !d.dependsOn.completedAt)
              ? 'Has unfinished dependencies and blocks related work.'
              : top.task.dueDate && top.task.dueDate < new Date()
                ? 'Already overdue - complete before newer work.'
                : 'Highest combined priority, deadline pressure, and dependency impact.',
        }
      : null;

    const aiText = await callOpenAI(
      `Given these open tasks JSON, recommend which to do next and why in JSON {title, reason}: ${JSON.stringify(
        open.map((t) => ({ title: t.title, priority: t.priority, dueDate: t.dueDate }))
      )}`
    );

    res.json({
      recommendation,
      ranked: scored.slice(0, 5).map((s) => ({
        id: s.task.id,
        title: s.task.title,
        score: s.score,
        priority: s.task.priority,
      })),
      aiNote: aiText,
      source: aiText ? 'openai+heuristic' : 'heuristic',
    });
  })
);

router.post(
  '/health',
  validateBody(aiHealthSchema),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.body.projectId },
      include: { tasks: { include: { column: true } } },
    });
    if (!project) throw new AppError('Project not found', 404);
    await requireWorkspaceMember(project.workspaceId, req.user!.id);

    const total = project.tasks.length;
    const done = project.tasks.filter(
      (t) => t.completedAt || t.column.name.toLowerCase() === 'done'
    ).length;
    const highUnfinished = project.tasks.filter(
      (t) =>
        (t.priority === 'HIGH' || t.priority === 'URGENT') &&
        !(t.completedAt || t.column.name.toLowerCase() === 'done')
    ).length;
    const overdue = project.tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < new Date() &&
        !(t.completedAt || t.column.name.toLowerCase() === 'done')
    ).length;

    let health = total === 0 ? 100 : Math.round((done / total) * 100);
    health = Math.max(0, health - highUnfinished * 4 - overdue * 5);

    const warning =
      health < 70
        ? 'Sprint deadline may be delayed.'
        : health < 85
          ? 'Some risk remains - watch high-priority unfinished work.'
          : null;

    const reason =
      highUnfinished > 0
        ? `${highUnfinished} high-priority tasks unfinished.`
        : overdue > 0
          ? `${overdue} overdue tasks.`
          : 'Workload looks balanced.';

    res.json({
      health,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
      warning,
      reason,
      stats: { total, done, highUnfinished, overdue },
      source: 'heuristic',
    });
  })
);

export default router;
