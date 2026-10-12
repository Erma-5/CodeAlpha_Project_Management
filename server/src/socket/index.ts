import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';

export const setupSocket = (io: Server) => {
  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const user = verifyAccessToken(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`Socket connected: ${user.name} (${socket.id})`);

    // Join a project room
    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    // Leave a project room
    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // Task moved — broadcast to all other project members
    socket.on('task:move', (data: { projectId: string; task: object }) => {
      socket.to(`project:${data.projectId}`).emit('task:moved', data.task);
    });

    // Task created
    socket.on('task:create', (data: { projectId: string; task: object }) => {
      socket.to(`project:${data.projectId}`).emit('task:created', data.task);
    });

    // Task updated
    socket.on('task:update', (data: { projectId: string; task: object }) => {
      socket.to(`project:${data.projectId}`).emit('task:updated', data.task);
    });

    // Task deleted
    socket.on('task:delete', (data: { projectId: string; taskId: string }) => {
      socket.to(`project:${data.projectId}`).emit('task:deleted', data.taskId);
    });

    // New comment
    socket.on('comment:add', (data: { projectId: string; taskId: string; comment: object }) => {
      socket.to(`project:${data.projectId}`).emit('comment:added', {
        taskId: data.taskId,
        comment: data.comment,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.name}`);
    });
  });
};
