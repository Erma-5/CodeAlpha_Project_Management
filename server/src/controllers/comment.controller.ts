import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// POST /api/projects/:id/tasks/:taskId/comments
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  if (!content?.trim()) {
    res.status(400).json({ message: 'Comment content is required' });
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

    const comment = await prisma.comment.create({
      data: {
        id: uuidv4(),
        taskId: req.params.taskId,
        userId: req.user!.userId,
        content: content.trim(),
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    await prisma.activity.create({
      data: {
        id: uuidv4(),
        projectId: req.params.id,
        taskId: req.params.taskId,
        userId: req.user!.userId,
        action: 'commented on task',
        meta: JSON.stringify({ preview: content.substring(0, 80) }),
      },
    });

    // Notify task assignee
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (task?.assigneeId && task.assigneeId !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: task.assigneeId,
          type: 'TASK_COMMENTED',
          title: 'New Comment',
          message: `Someone commented on "${task.title}"`,
          link: `/projects/${req.params.id}`,
        },
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// PUT /api/projects/:id/tasks/:taskId/comments/:commentId
export const updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  if (!content?.trim()) {
    res.status(400).json({ message: 'Content is required' });
    return;
  }

  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!comment || comment.userId !== req.user!.userId) {
      res.status(403).json({ message: 'Not authorized to edit this comment' });
      return;
    }

    const updated = await prisma.comment.update({
      where: { id: req.params.commentId },
      data: { content: content.trim() },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update comment' });
  }
};

// DELETE /api/projects/:id/tasks/:taskId/comments/:commentId
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!comment || comment.userId !== req.user!.userId) {
      res.status(403).json({ message: 'Not authorized to delete this comment' });
      return;
    }

    await prisma.comment.delete({ where: { id: req.params.commentId } });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};
