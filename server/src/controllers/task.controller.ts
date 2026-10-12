import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const taskSelect = {
  id: true, title: true, description: true, priority: true,
  order: true, dueDate: true, tags: true, blockedBy: true,
  createdAt: true, updatedAt: true,
  assignee: { select: { id: true, name: true, avatar: true } },
  creator:  { select: { id: true, name: true, avatar: true } },
  column:   { select: { id: true, name: true } },
  _count:   { select: { comments: true } },
};

// GET /api/projects/:id/tasks
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member) {
      res.status(403).json({ message: 'Not a member of this project' });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      orderBy: [{ columnId: 'asc' }, { order: 'asc' }],
      select: taskSelect,
    });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

// GET /api/projects/:id/tasks/:taskId
export const getTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member) {
      res.status(403).json({ message: 'Not a member of this project' });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator:  { select: { id: true, name: true, avatar: true } },
        column:   { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
};

// POST /api/projects/:id/tasks
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, columnId, priority, dueDate, assigneeId, tags } = req.body;
  if (!title?.trim()) {
    res.status(400).json({ message: 'Task title is required' });
    return;
  }
  if (!columnId) {
    res.status(400).json({ message: 'Column ID is required' });
    return;
  }

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member) {
      res.status(403).json({ message: 'Not a member of this project' });
      return;
    }

    const lastTask = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' },
    });

    const task = await prisma.task.create({
      data: {
        id: uuidv4(),
        projectId: req.params.id,
        columnId,
        title: title.trim(),
        description,
        priority: priority || 'MEDIUM',
        order: (lastTask?.order ?? -1) + 1,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        creatorId: req.user!.userId,
        tags: tags ? JSON.stringify(tags) : null,
      },
      select: taskSelect,
    });

    // Log activity
    await prisma.activity.create({
      data: {
        id: uuidv4(),
        projectId: req.params.id,
        taskId: task.id,
        userId: req.user!.userId,
        action: 'created task',
        meta: JSON.stringify({ taskTitle: task.title }),
      },
    });

    // Notify assignee
    if (assigneeId && assigneeId !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'New Task Assigned',
          message: `You have been assigned: "${task.title}"`,
          link: `/projects/${req.params.id}`,
        },
      });
    }

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create task' });
  }
};

// PUT /api/projects/:id/tasks/:taskId
export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, priority, dueDate, assigneeId, tags, blockedBy } = req.body;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member) {
      res.status(403).json({ message: 'Not a member of this project' });
      return;
    }

    const oldTask = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!oldTask) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        title:       title ?? oldTask.title,
        description: description ?? oldTask.description,
        priority:    priority ?? oldTask.priority,
        dueDate:     dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : oldTask.dueDate,
        assigneeId:  assigneeId !== undefined ? (assigneeId || null) : oldTask.assigneeId,
        tags:        tags !== undefined ? (tags ? JSON.stringify(tags) : null) : oldTask.tags,
        blockedBy:   blockedBy !== undefined ? (blockedBy ? JSON.stringify(blockedBy) : null) : oldTask.blockedBy,
      },
      select: taskSelect,
    });

    // Notify new assignee
    if (assigneeId && assigneeId !== oldTask.assigneeId && assigneeId !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          message: `You have been assigned: "${task.title}"`,
          link: `/projects/${req.params.id}`,
        },
      });
    }

    await prisma.activity.create({
      data: {
        id: uuidv4(),
        projectId: req.params.id,
        taskId: task.id,
        userId: req.user!.userId,
        action: 'updated task',
        meta: JSON.stringify({ taskTitle: task.title }),
      },
    });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

// PUT /api/projects/:id/tasks/:taskId/move
export const moveTask = async (req: AuthRequest, res: Response): Promise<void> => {
  const { columnId, order } = req.body;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member) {
      res.status(403).json({ message: 'Not a member of this project' });
      return;
    }

    const oldTask = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { column: true },
    });
    if (!oldTask) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: { columnId, order },
      select: taskSelect,
    });

    await prisma.activity.create({
      data: {
        id: uuidv4(),
        projectId: req.params.id,
        taskId: task.id,
        userId: req.user!.userId,
        action: 'moved task',
        meta: JSON.stringify({ taskTitle: task.title, to: task.column?.name }),
      },
    });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to move task' });
  }
};

// DELETE /api/projects/:id/tasks/:taskId
export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member) {
      res.status(403).json({ message: 'Not a member of this project' });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    if (task.creatorId !== req.user!.userId && member.role === 'MEMBER') {
      res.status(403).json({ message: 'Only the task creator or a manager can delete tasks' });
      return;
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete task' });
  }
};
