import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const DEFAULT_COLUMNS = [
  { name: 'To Do',       order: 0, color: '#e2e8f0' },
  { name: 'In Progress', order: 1, color: '#bfdbfe' },
  { name: 'In Review',   order: 2, color: '#fde68a' },
  { name: 'Done',        order: 3, color: '#bbf7d0' },
];

// GET /api/projects
export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.user!.userId } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

// GET /api/projects/:id
export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        members: { some: { userId: req.user!.userId } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignee: { select: { id: true, name: true, avatar: true } },
                creator:  { select: { id: true, name: true, avatar: true } },
                _count:   { select: { comments: true } },
              },
            },
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
};

// POST /api/projects
export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, color } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ message: 'Project name is required' });
    return;
  }

  try {
    const projectId = uuidv4();
    const project = await prisma.project.create({
      data: {
        id: projectId,
        name: name.trim(),
        description,
        color: color || '#6366f1',
        ownerId: req.user!.userId,
        members: {
          create: {
            id: uuidv4(),
            userId: req.user!.userId,
            role: 'ADMIN',
          },
        },
        columns: {
          create: DEFAULT_COLUMNS.map(col => ({ id: uuidv4(), ...col })),
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        columns: { orderBy: { order: 'asc' } },
        _count: { select: { tasks: true } },
      },
    });

    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create project' });
  }
};

// PUT /api/projects/:id
export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, color, status } = req.body;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member || member.role === 'MEMBER') {
      res.status(403).json({ message: 'Not authorized to update this project' });
      return;
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { name, description, color, status },
    });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

// DELETE /api/projects/:id
export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project || project.ownerId !== req.user!.userId) {
      res.status(403).json({ message: 'Only the project owner can delete it' });
      return;
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

// POST /api/projects/:id/members
export const inviteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, role } = req.body;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member || member.role === 'MEMBER') {
      res.status(403).json({ message: 'Not authorized to invite members' });
      return;
    }

    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      res.status(404).json({ message: 'User with that email not found' });
      return;
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: invitee.id } },
    });
    if (existing) {
      res.status(409).json({ message: 'User is already a member' });
      return;
    }

    const newMember = await prisma.projectMember.create({
      data: {
        id: uuidv4(),
        projectId: req.params.id,
        userId: invitee.id,
        role: role || 'MEMBER',
      },
      include: { user: { select: { id: true, name: true, avatar: true, email: true } } },
    });

    // Notification
    await prisma.notification.create({
      data: {
        id: uuidv4(),
        userId: invitee.id,
        type: 'PROJECT_INVITED',
        title: 'Project Invitation',
        message: `You have been added to a project`,
        link: `/projects/${req.params.id}`,
      },
    });

    res.status(201).json(newMember);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to invite member' });
  }
};

// DELETE /api/projects/:id/members/:userId
export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user!.userId } },
    });
    if (!member || member.role === 'MEMBER') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: req.params.id, userId: req.params.userId } },
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove member' });
  }
};
