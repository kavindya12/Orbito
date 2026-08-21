/**
 * Creates a dedicated assignee test account and assigns sample tasks.
 * Email: tester@orbito.dev / password123
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const tester = await prisma.user.upsert({
    where: { email: 'tester@orbito.dev' },
    update: { name: 'Task Tester', passwordHash },
    create: {
      name: 'Task Tester',
      email: 'tester@orbito.dev',
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.findFirst({
    where: { name: 'NexGen Developers' },
  });
  if (!workspace) {
    throw new Error('Workspace "NexGen Developers" not found. Run db:seed first.');
  }

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: tester.id },
    },
    update: { role: 'MEMBER' },
    create: {
      workspaceId: workspace.id,
      userId: tester.id,
      role: 'MEMBER',
    },
  });

  const project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: 'MediEase Healthcare System' },
    include: { columns: { orderBy: { position: 'asc' } } },
  });
  if (!project) {
    throw new Error('Demo project not found. Run db:seed first.');
  }

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: tester.id },
    },
    update: {},
    create: { projectId: project.id, userId: tester.id },
  });

  const todo = project.columns.find((c) => c.name === 'To Do') || project.columns[1];
  const development =
    project.columns.find((c) => c.name === 'Development') || project.columns[2];

  const titles = [
    { title: 'Write patient intake form tests', columnId: todo.id, priority: 'HIGH' },
    { title: 'Fix appointment reminder emails', columnId: development.id, priority: 'URGENT' },
    { title: 'Update clinic dashboard charts', columnId: todo.id, priority: 'MEDIUM' },
  ];

  for (const item of titles) {
    const existing = await prisma.task.findFirst({
      where: { projectId: project.id, title: item.title, assigneeId: tester.id },
    });
    if (existing) continue;

    const max = await prisma.task.aggregate({
      where: { columnId: item.columnId },
      _max: { position: true },
    });

    await prisma.task.create({
      data: {
        projectId: project.id,
        columnId: item.columnId,
        title: item.title,
        description: 'Assigned for My Tasks testing',
        priority: item.priority,
        assigneeId: tester.id,
        creatorId: workspace.ownerId,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        position: (max._max.position ?? -1) + 1,
      },
    });
  }

  const mine = await prisma.task.count({ where: { assigneeId: tester.id } });
  console.log('Test assignee ready');
  console.log('  email:    tester@orbito.dev');
  console.log('  password: password123');
  console.log('  assigned tasks:', mine);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
