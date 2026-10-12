import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getProjects, getProject, createProject,
  updateProject, deleteProject, inviteMember, removeMember,
} from '../controllers/project.controller';
import {
  createColumn, updateColumn, deleteColumn, reorderColumns,
} from '../controllers/column.controller';
import {
  getTasks, getTask, createTask, updateTask, moveTask, deleteTask,
} from '../controllers/task.controller';
import { addComment, updateComment, deleteComment } from '../controllers/comment.controller';
import { getProjectActivity, getProjectStats } from '../controllers/activity.controller';

const router = Router();
router.use(authenticate);

// Projects
router.get('/',            getProjects);
router.post('/',           createProject);
router.get('/:id',         getProject);
router.put('/:id',         updateProject);
router.delete('/:id',      deleteProject);

// Members
router.post('/:id/members',              inviteMember);
router.delete('/:id/members/:userId',    removeMember);

// Columns
router.post('/:id/columns',                   createColumn);
router.put('/:id/columns/reorder',            reorderColumns);
router.put('/:id/columns/:columnId',          updateColumn);
router.delete('/:id/columns/:columnId',       deleteColumn);

// Tasks
router.get('/:id/tasks',               getTasks);
router.post('/:id/tasks',              createTask);
router.get('/:id/tasks/:taskId',       getTask);
router.put('/:id/tasks/:taskId',       updateTask);
router.put('/:id/tasks/:taskId/move',  moveTask);
router.delete('/:id/tasks/:taskId',    deleteTask);

// Comments
router.post('/:id/tasks/:taskId/comments',                        addComment);
router.put('/:id/tasks/:taskId/comments/:commentId',              updateComment);
router.delete('/:id/tasks/:taskId/comments/:commentId',           deleteComment);

// Activity & Stats
router.get('/:id/activity', getProjectActivity);
router.get('/:id/stats',    getProjectStats);

export default router;
