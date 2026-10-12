import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding project management database...');

  const adminPass = await bcrypt.hash('admin123', 12);
  const staffPass = await bcrypt.hash('staff123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@proj.com' },
    update: { password: adminPass },
    create: { id: uuidv4(), email: 'admin@proj.com', password: adminPass, name: 'Admin User' },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@proj.com' },
    update: { password: staffPass },
    create: { id: uuidv4(), email: 'staff@proj.com', password: staffPass, name: 'Staff Member' },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@proj.com' },
    update: {},
    create: { id: uuidv4(), email: 'carol@proj.com', password: await bcrypt.hash('carol123', 12), name: 'Carol White' },
  });

  console.log('✅ Users created');

  // Upsert projects
  const existing = await prisma.project.findFirst({ where: { name: 'Website Redesign' } });

  if (!existing) {
    const projectId = uuidv4();
    await prisma.project.create({
      data: {
        id: projectId,
        name: 'Website Redesign',
        description: 'Complete redesign of the company website with modern UI.',
        color: '#6366f1',
        ownerId: admin.id,
        members: {
          create: [
            { id: uuidv4(), userId: admin.id,  role: 'ADMIN' },
            { id: uuidv4(), userId: staff.id,  role: 'MANAGER' },
            { id: uuidv4(), userId: carol.id,  role: 'MEMBER' },
          ],
        },
        columns: {
          create: [
            { id: uuidv4(), name: 'To Do',       order: 0, color: '#e2e8f0' },
            { id: uuidv4(), name: 'In Progress', order: 1, color: '#bfdbfe' },
            { id: uuidv4(), name: 'In Review',   order: 2, color: '#fde68a' },
            { id: uuidv4(), name: 'Done',        order: 3, color: '#bbf7d0' },
          ],
        },
      },
    });

    const cols = await prisma.column.findMany({
      where: { project: { name: 'Website Redesign' } },
      orderBy: { order: 'asc' },
    });
    const [todo, inProgress, , done] = cols;

    await prisma.task.createMany({
      data: [
        { id: uuidv4(), projectId, columnId: todo.id,       title: 'Design homepage mockup',   priority: 'HIGH',   order: 0, creatorId: admin.id, assigneeId: staff.id,  dueDate: new Date(Date.now() + 3 * 86400000) },
        { id: uuidv4(), projectId, columnId: todo.id,       title: 'Write content strategy',   priority: 'MEDIUM', order: 1, creatorId: admin.id, assigneeId: carol.id,  dueDate: new Date(Date.now() + 7 * 86400000) },
        { id: uuidv4(), projectId, columnId: inProgress.id, title: 'Set up React project',     priority: 'HIGH',   order: 0, creatorId: staff.id, assigneeId: staff.id,  dueDate: new Date(Date.now() + 1 * 86400000) },
        { id: uuidv4(), projectId, columnId: inProgress.id, title: 'Configure CI/CD pipeline', priority: 'URGENT', order: 1, creatorId: admin.id, assigneeId: admin.id,  dueDate: new Date(Date.now() - 1 * 86400000) },
        { id: uuidv4(), projectId, columnId: done.id,       title: 'Kick-off meeting',         priority: 'LOW',    order: 0, creatorId: admin.id },
      ],
    });

    console.log('✅ Project, columns, and tasks created');
  }

  // Second demo project
  const existing2 = await prisma.project.findFirst({ where: { name: 'Mobile App v2' } });
  if (!existing2) {
    const p2Id = uuidv4();
    await prisma.project.create({
      data: {
        id: p2Id,
        name: 'Mobile App v2',
        description: 'New version of the mobile application with improved UX.',
        color: '#22c55e',
        ownerId: admin.id,
        members: {
          create: [
            { id: uuidv4(), userId: admin.id, role: 'ADMIN' },
            { id: uuidv4(), userId: staff.id, role: 'MEMBER' },
          ],
        },
        columns: {
          create: [
            { id: uuidv4(), name: 'Backlog',     order: 0, color: '#f1f5f9' },
            { id: uuidv4(), name: 'In Progress', order: 1, color: '#bfdbfe' },
            { id: uuidv4(), name: 'Done',        order: 2, color: '#bbf7d0' },
          ],
        },
      },
    });

    const cols2 = await prisma.column.findMany({
      where: { project: { name: 'Mobile App v2' } },
      orderBy: { order: 'asc' },
    });

    await prisma.task.createMany({
      data: [
        { id: uuidv4(), projectId: p2Id, columnId: cols2[0].id, title: 'Design onboarding screens', priority: 'HIGH',   order: 0, creatorId: admin.id, assigneeId: staff.id, dueDate: new Date(Date.now() + 5 * 86400000) },
        { id: uuidv4(), projectId: p2Id, columnId: cols2[0].id, title: 'API integration plan',      priority: 'MEDIUM', order: 1, creatorId: admin.id },
        { id: uuidv4(), projectId: p2Id, columnId: cols2[1].id, title: 'Push notifications setup',  priority: 'HIGH',   order: 0, creatorId: staff.id, assigneeId: admin.id, dueDate: new Date(Date.now() - 2 * 86400000) },
      ],
    });

    console.log('✅ Second project created');
  }

  console.log('\n✨ Seed complete!');
  console.log('Admin  → admin@proj.com / admin123');
  console.log('Staff  → staff@proj.com / staff123');
  console.log('Member → carol@proj.com / carol123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
