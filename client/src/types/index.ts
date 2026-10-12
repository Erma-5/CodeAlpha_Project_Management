export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
export type NotificationType =
  | 'TASK_ASSIGNED' | 'TASK_COMMENTED' | 'TASK_MOVED'
  | 'TASK_DUE_SOON' | 'PROJECT_INVITED' | 'MENTIONED';

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: Role;
  joinedAt: string;
  user: Pick<User, 'id' | 'name' | 'avatar' | 'email'>;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  order: number;
  color: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  priority: Priority;
  order: number;
  dueDate?: string;
  tags?: string;
  blockedBy?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: Pick<User, 'id' | 'name' | 'avatar'> | null;
  creator:   Pick<User, 'id' | 'name' | 'avatar'>;
  column?:   { id: string; name: string };
  project?:  { id: string; name: string; color: string };
  _count?:   { comments: number };
  comments?: Comment[];
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'name' | 'avatar'>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  columns: Column[];
  _count?: { tasks: number };
}

export interface Activity {
  id: string;
  projectId: string;
  taskId?: string;
  action: string;
  meta?: string;
  createdAt: string;
  user:    Pick<User, 'id' | 'name' | 'avatar'>;
  task?:   { id: string; title: string } | null;
  project?: { id: string; name: string; color: string };
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ProjectStats {
  total: number;
  overdue: number;
  dueThisWeek: number;
  columns: { id: string; name: string; color: string; count: number }[];
}

export interface DashboardData {
  stats: {
    activeProjects: number;
    totalTasks: number;
    myOpenTasks: number;
    overdueTasks: number;
    dueSoonTasks: number;
    totalMembers: number;
  };
  myTasks: Task[];
  upcomingDeadlines: Task[];
  recentActivity: Activity[];
  projects: {
    id: string;
    name: string;
    color: string;
    status: ProjectStatus;
    progress: number;
    total: number;
    done: number;
    memberCount: number;
    members: Pick<User, 'id' | 'name' | 'avatar'>[];
  }[];
}
