/**
 * Adds staggered Done completions on the primary demo project
 * so Productivity Trend has visible data for the last 14 days.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst({
    where: { name: 'MediEase Healthcare System', status: 'ACTIVE' },
    include: { columns: true, members: true },
  });
  if (!project) {
    console.log('MediEase project not found');
    return;
  }

  const doneCol = project.columns.find((c) => c.name.toLowerCase() === 'done');
  const creatorId = project.ownerId || project.members[0]?.userId;
  if (!doneCol || !creatorId) {
    console.log('Missing Done column or creator');
    return;
  }

  // Remove prior demo trend tasks so re-runs stay clean
  await prisma.task.deleteMany({
    where: { projectId: project.id, title: { startsWith: 'Completed: ' } },
  });

  const samples = [
    { title: 'Completed: Wireframe review', daysAgo: 1 },
    { title: 'Completed: Auth bugfix', daysAgo: 2 },
    { title: 'Completed: API contract update', daysAgo: 3 },
    { title: 'Completed: Staging deploy', daysAgo: 3 },
    { title: 'Completed: Design QA pass', daysAgo: 5 },
    { title: 'Completed: Migration script', daysAgo: 7 },
    { title: 'Completed: Smoke tests', daysAgo: 8 },
    { title: 'Completed: Docs polish', daysAgo: 10 },
  ];

  const now = new Date();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const when = new Date(now);
    when.setDate(now.getDate() - s.daysAgo);
    when.setHours(10 + (i % 5), 30, 0, 0);

    await prisma.task.create({
      data: {
        projectId: project.id,
        columnId: doneCol.id,
        title: s.title,
        priority: 'MEDIUM',
        creatorId,
        position: 200 + i,
        completedAt: when,
        description: 'Historical completion used for Productivity Trend',
      },
    });
  }

  // Keep real Done tasks inside the window too
  await prisma.task.updateMany({
    where: {
      projectId: project.id,
      OR: [{ completedAt: { not: null } }, { columnId: doneCol.id }],
      title: { not: { startsWith: 'Completed: ' } },
    },
    data: {},
  });

  const realDone = await prisma.task.findMany({
    where: {
      projectId: project.id,
      columnId: doneCol.id,
      title: { not: { startsWith: 'Completed: ' } },
    },
  });
  for (let i = 0; i < realDone.length; i++) {
    const when = new Date(now);
    when.setDate(now.getDate() - (4 + i * 2));
    when.setHours(14, 0, 0, 0);
    await prisma.task.update({
      where: { id: realDone[i].id },
      data: { completedAt: when },
    });
  }

  console.log(`Seeded ${samples.length} trend completions on MediEase (+${realDone.length} real Done updated).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
