import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const requireProjectAccess = async (projectId: string, userId: string, minRole?: 'MANAGER' | 'ADMIN') => {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) return null;
  if (minRole === 'ADMIN' && member.role !== 'ADMIN') return null;
  if (minRole === 'MANAGER' && member.role === 'MEMBER') return null;
  return member;
};

// POST /api/projects/:id/columns
export const createColumn = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, color } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ message: 'Column name is required' });
    return;
  }

  try {
    const access = await requireProjectAccess(req.params.id, req.user!.userId, 'MANAGER');
    if (!access) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const lastCol = await prisma.column.findFirst({
      where: { projectId: req.params.id },
      orderBy: { order: 'desc' },
    });

    const column = await prisma.column.create({
      data: {
        id: uuidv4(),
        projectId: req.params.id,
        name: name.trim(),
        color: color || '#e2e8f0',
        order: (lastCol?.order ?? -1) + 1,
      },
    });
    res.status(201).json(column);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create column' });
  }
};

// PUT /api/projects/:id/columns/:columnId
export const updateColumn = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, color } = req.body;

  try {
    const access = await requireProjectAccess(req.params.id, req.user!.userId, 'MANAGER');
    if (!access) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const column = await prisma.column.update({
      where: { id: req.params.columnId },
      data: { name, color },
    });
    res.json(column);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update column' });
  }
};

// DELETE /api/projects/:id/columns/:columnId
export const deleteColumn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const access = await requireProjectAccess(req.params.id, req.user!.userId, 'MANAGER');
    if (!access) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await prisma.column.delete({ where: { id: req.params.columnId } });
    res.json({ message: 'Column deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete column' });
  }
};

// PUT /api/projects/:id/columns/reorder
export const reorderColumns = async (req: AuthRequest, res: Response): Promise<void> => {
  const { columns } = req.body as { columns: { id: string; order: number }[] };

  try {
    const access = await requireProjectAccess(req.params.id, req.user!.userId, 'MANAGER');
    if (!access) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await Promise.all(
      columns.map(col => prisma.column.update({ where: { id: col.id }, data: { order: col.order } }))
    );
    res.json({ message: 'Columns reordered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to reorder columns' });
  }
};
