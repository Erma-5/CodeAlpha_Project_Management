import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/projects/:id/activity
export const getProjectActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member) {
      res.status(403).json({ message: 'Not a member of this project' });
      return;
    }

    const activities = await prisma.activity.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true } },
      },
    });
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
};

// GET /api/projects/:id/stats
export const getProjectStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member) {
      res.status(403).json({ message: 'Not a member of this project' });
      return;
    }

    const [total, byColumn, overdue, dueThisWeek] = await Promise.all([
      prisma.task.count({ where: { projectId: req.params.id } }),
      prisma.task.groupBy({
        by: ['columnId'],
        where: { projectId: req.params.id },
        _count: true,
      }),
      prisma.task.count({
        where: { projectId: req.params.id, dueDate: { lt: new Date() } },
      }),
      prisma.task.count({
        where: {
          projectId: req.params.id,
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const columns = await prisma.column.findMany({
      where: { projectId: req.params.id },
      orderBy: { order: 'asc' },
    });

    const columnStats = columns.map(col => ({
      id: col.id,
      name: col.name,
      color: col.color,
      count: byColumn.find(b => b.columnId === col.id)?._count ?? 0,
    }));

    res.json({ total, overdue, dueThisWeek, columns: columnStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
