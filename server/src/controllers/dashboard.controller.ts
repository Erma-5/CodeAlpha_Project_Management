import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/dashboard/stats
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  try {
    // All projects user is a member of
    const memberProjects = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberProjects.map(m => m.projectId);

    // Parallel queries
    const [
      activeProjects,
      totalTasks,
      myOpenTasks,
      overdueTasks,
      dueSoonTasks,
      recentActivity,
      upcomingDeadlines,
    ] = await Promise.all([
      // Active projects count
      prisma.project.count({
        where: { id: { in: projectIds }, status: 'ACTIVE' },
      }),
      // Total tasks across my projects
      prisma.task.count({
        where: { projectId: { in: projectIds } },
      }),
      // My open tasks (assigned to me, not in last column)
      prisma.task.findMany({
        where: { assigneeId: userId, projectId: { in: projectIds } },
        include: {
          project: { select: { id: true, name: true, color: true } },
          column:  { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      // Overdue tasks (due date passed, assigned to me)
      prisma.task.count({
        where: {
          assigneeId: userId,
          projectId: { in: projectIds },
          dueDate: { lt: new Date() },
        },
      }),
      // Due within 7 days
      prisma.task.count({
        where: {
          assigneeId: userId,
          projectId: { in: projectIds },
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Recent activity (last 10 across all my projects)
      prisma.activity.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user:    { select: { id: true, name: true, avatar: true } },
          task:    { select: { id: true, title: true } },
          project: { select: { id: true, name: true, color: true } },
        },
      }),
      // Upcoming deadlines (next 7 days, across all my projects)
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          project:  { select: { id: true, name: true, color: true } },
          column:   { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 8,
      }),
    ]);

    // Project completion rates
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds }, status: 'ACTIVE' },
      include: {
        columns: {
          orderBy: { order: 'desc' },
          take: 1, // last column = "done"
          include: { tasks: { select: { id: true } } },
        },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { tasks: true } },
      },
    });

    const projectsWithProgress = projects.map(p => {
      const doneCount = p.columns[0]?.tasks?.length ?? 0;
      const total = p._count.tasks;
      const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        status: p.status,
        progress,
        total,
        done: doneCount,
        memberCount: p.members.length,
        members: p.members.slice(0, 4).map(m => m.user),
      };
    });

    res.json({
      stats: {
        activeProjects,
        totalTasks,
        myOpenTasks: myOpenTasks.length,
        overdueTasks,
        dueSoonTasks,
        totalMembers: projectIds.length > 0
          ? await prisma.projectMember.groupBy({
              by: ['userId'],
              where: { projectId: { in: projectIds } },
            }).then(r => r.length)
          : 0,
      },
      myTasks: myOpenTasks,
      upcomingDeadlines,
      recentActivity,
      projects: projectsWithProgress,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};
