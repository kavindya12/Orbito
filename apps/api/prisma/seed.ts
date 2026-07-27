import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_COLUMNS = [
  { name: 'Backlog', color: '#64748B' },
  { name: 'To Do', color: '#6366F1' },
  { name: 'Development', color: '#6366F1' },
  { name: 'Code Review', color: '#8B5CF6' },
  { name: 'Testing', color: '#F97316' },
  { name: 'Done', color: '#22C55E' },
];

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const kavindya = await prisma.user.upsert({
    where: { email: 'kavindya@orbito.dev' },
    update: {},
    create: { name: 'Kavindya', email: 'kavindya@orbito.dev', passwordHash },
  });

  const john = await prisma.user.upsert({
    where: { email: 'john@orbito.dev' },
    update: {},
    create: { name: 'John', email: 'john@orbito.dev', passwordHash },
  });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@orbito.dev' },
    update: {},
    create: { name: 'Sarah', email: 'sarah@orbito.dev', passwordHash },
  });

  let workspace = await prisma.workspace.findFirst({ where: { name: 'NexGen Developers' } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'NexGen Developers',
        ownerId: kavindya.id,
        members: {
          create: [
            { userId: kavindya.id, role: 'OWNER' },
            { userId: john.id, role: 'MEMBER' },
            { userId: sarah.id, role: 'ADMIN' },
          ],
        },
      },
    });
  }

  let project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: 'MediEase Healthcare System' },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'MediEase Healthcare System',
        description: 'AI-based EHR Platform',
        deadline: new Date('2026-12-30'),
        members: {
          create: [{ userId: kavindya.id }, { userId: john.id }, { userId: sarah.id }],
        },
        columns: {
          create: DEFAULT_COLUMNS.map((c, i) => ({ ...c, position: i })),
        },
      },
      include: { columns: true },
    });

    const cols = await prisma.boardColumn.findMany({
      where: { projectId: project.id },
      orderBy: { position: 'asc' },
    });

    const tasks = [
      { title: 'Requirement Analysis', column: 'Done', priority: 'HIGH' as const, assigneeId: sarah.id },
      { title: 'Database Design', column: 'To Do', priority: 'HIGH' as const, assigneeId: sarah.id },
      { title: 'Build Login Interface', column: 'Development', priority: 'HIGH' as const, assigneeId: kavindya.id },
      { title: 'API Development', column: 'Development', priority: 'URGENT' as const, assigneeId: john.id },
      { title: 'Payment API', column: 'To Do', priority: 'HIGH' as const, assigneeId: john.id },
      { title: 'UI Improvements', column: 'Backlog', priority: 'LOW' as const, assigneeId: kavindya.id },
    ];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const column = cols.find((c) => c.name === t.column)!;
      await prisma.task.create({
        data: {
          projectId: project.id,
          columnId: column.id,
          title: t.title,
          priority: t.priority,
          assigneeId: t.assigneeId,
          creatorId: kavindya.id,
          position: i,
          estimateHours: 8,
          dueDate: new Date(Date.now() + (i + 2) * 86400000),
          completedAt: t.column === 'Done' ? new Date() : null,
          description: `Seeded task for ${t.title}`,
        },
      });
    }

    await prisma.activity.createMany({
      data: [
        { userId: kavindya.id, projectId: project.id, action: 'created project' },
        { userId: john.id, projectId: project.id, action: 'completed Login UI' },
        { userId: sarah.id, projectId: project.id, action: 'created Database Schema' },
      ],
    });
  }

  console.log('Seed complete. Login: kavindya@orbito.dev / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
