import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay, closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import api from '../../api/axios';
import { Project, Task, Column } from '../../types';
import KanbanColumn from '../../components/board/KanbanColumn';
import TaskCard from '../../components/board/TaskCard';
import TaskModal from '../../components/board/TaskModal';
import { getSocket } from '../../socket';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showAddTask, setShowAddTask] = useState<string | null>(null); // columnId
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [filter, setFilter] = useState({ priority: '', assignee: '' });
  const [search, setSearch] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  });

  // Socket.io real-time
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('join:project', id);

    socket.on('task:created', (task: Task) => {
      qc.setQueryData<Project>(['project', id], old => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map(col =>
            col.id === task.columnId ? { ...col, tasks: [...col.tasks, task] } : col
          ),
        };
      });
      toast(`${task.creator?.name ?? 'Someone'} added "${task.title}"`, { icon: '➕' });
    });

    socket.on('task:moved', (task: Task) => {
      qc.setQueryData<Project>(['project', id], old => {
        if (!old) return old;
        const allCols = old.columns.map(col => ({
          ...col,
          tasks: col.tasks.filter(t => t.id !== task.id),
        }));
        return {
          ...old,
          columns: allCols.map(col =>
            col.id === task.columnId
              ? { ...col, tasks: [...col.tasks, task].sort((a, b) => a.order - b.order) }
              : col
          ),
        };
      });
    });

    socket.on('task:updated', (task: Task) => {
      qc.setQueryData<Project>(['project', id], old => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map(col => ({
            ...col,
            tasks: col.tasks.map(t => t.id === task.id ? { ...t, ...task } : t),
          })),
        };
      });
    });

    socket.on('task:deleted', (taskId: string) => {
      qc.setQueryData<Project>(['project', id], old => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => t.id !== taskId),
          })),
        };
      });
    });

    return () => {
      socket.emit('leave:project', id);
      socket.off('task:created');
      socket.off('task:moved');
      socket.off('task:updated');
      socket.off('task:deleted');
    };
  }, [id, qc]);

  const moveMutation = useMutation({
    mutationFn: ({ taskId, columnId, order }: { taskId: string; columnId: string; order: number }) =>
      api.put(`/projects/${id}/tasks/${taskId}/move`, { columnId, order }).then(r => r.data),
    onSuccess: (task) => {
      const socket = getSocket();
      socket.emit('task:move', { projectId: id, task });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      toast.error('Failed to move task');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: object) => api.post(`/projects/${id}/tasks`, data).then(r => r.data),
    onSuccess: (task) => {
      qc.setQueryData<Project>(['project', id], old => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map(col =>
            col.id === task.columnId ? { ...col, tasks: [...col.tasks, task] } : col
          ),
        };
      });
      const socket = getSocket();
      socket.emit('task:create', { projectId: id, task });
      setShowAddTask(null);
      setNewTaskTitle('');
      toast.success('Task created');
    },
    onError: () => toast.error('Failed to create task'),
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post(`/projects/${id}/members`, { email, role: 'MEMBER' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Member invited!');
      setShowInvite(false);
      setInviteEmail('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to invite'),
  });

  const handleDragStart = (e: DragStartEvent) => {
    if (e.active.data.current?.type === 'task') {
      setActiveTask(e.active.data.current.task);
    }
  };

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over || !project) return;

    const activeTask = active.data.current?.task as Task;
    if (!activeTask) return;

    const overType = over.data.current?.type;
    let targetColumnId: string;
    let targetOrder: number;

    if (overType === 'column') {
      targetColumnId = over.id as string;
      const targetCol = project.columns.find(c => c.id === targetColumnId);
      targetOrder = (targetCol?.tasks?.length ?? 0);
    } else if (overType === 'task') {
      const overTask = over.data.current?.task as Task;
      targetColumnId = overTask.columnId;
      targetOrder = overTask.order;
    } else return;

    if (activeTask.columnId === targetColumnId && activeTask.order === targetOrder) return;

    // Optimistic update
    qc.setQueryData<Project>(['project', id], old => {
      if (!old) return old;
      const updated = old.columns.map(col => {
        if (col.id === activeTask.columnId) {
          return { ...col, tasks: col.tasks.filter(t => t.id !== activeTask.id) };
        }
        if (col.id === targetColumnId) {
          const newTasks = [...col.tasks.filter(t => t.id !== activeTask.id)];
          newTasks.splice(targetOrder, 0, { ...activeTask, columnId: targetColumnId, order: targetOrder });
          return { ...col, tasks: newTasks.map((t, i) => ({ ...t, order: i })) };
        }
        return col;
      });
      return { ...old, columns: updated };
    });

    moveMutation.mutate({ taskId: activeTask.id, columnId: targetColumnId, order: targetOrder });
  }, [project, id, qc, moveMutation]);

  // Filtered tasks
  const getFilteredTasks = (tasks: Task[]) => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      if (filter.assignee && t.assignee?.id !== filter.assignee) return false;
      return true;
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading board…</div>
  );

  if (error || !project) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <p className="text-lg mb-4">Project not found or access denied.</p>
      <button onClick={() => navigate('/projects')} className="btn-secondary">Back to Projects</button>
    </div>
  );

  const currentMember = project.members.find(m => m.userId === user?.id);
  const canManage = currentMember?.role === 'ADMIN' || currentMember?.role === 'MANAGER';

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Board header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: project.color }} />
            <div>
              <h1 className="font-bold text-gray-900">{project.name}</h1>
              {project.description && <p className="text-xs text-gray-500">{project.description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <input className="input text-sm w-40" placeholder="Search tasks…"
              value={search} onChange={e => setSearch(e.target.value)} />

            {/* Priority filter */}
            <select className="input text-sm w-32" value={filter.priority}
              onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
              <option value="">All priorities</option>
              {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p}>{p}</option>)}
            </select>

            {/* Assignee filter */}
            <select className="input text-sm w-36" value={filter.assignee}
              onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))}>
              <option value="">All members</option>
              {project.members.map(m => (
                <option key={m.userId} value={m.userId}>{m.user.name}</option>
              ))}
            </select>

            {/* Members avatars */}
            <div className="flex -space-x-1">
              {project.members.map(m => (
                <div key={m.id} title={m.user.name}
                  className="w-7 h-7 rounded-full bg-primary-200 border-2 border-white flex items-center justify-center text-primary-700 font-bold text-xs cursor-default">
                  {m.user.name[0].toUpperCase()}
                </div>
              ))}
            </div>

            {canManage && (
              <button onClick={() => setShowInvite(true)} className="btn-secondary text-sm">
                + Invite
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full items-start">
            {[...project.columns].sort((a, b) => a.order - b.order).map(col => (
              <div key={col.id} className="flex flex-col">
                <KanbanColumn
                  column={col}
                  tasks={getFilteredTasks([...col.tasks].sort((a, b) => a.order - b.order))}
                  onTaskClick={setSelectedTask}
                  onAddTask={(columnId) => setShowAddTask(columnId)}
                />

                {/* Inline add task form */}
                {showAddTask === col.id && (
                  <div className="mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                    <input autoFocus className="input text-sm mb-2"
                      placeholder="Task title…" value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newTaskTitle.trim()) {
                          createTaskMutation.mutate({ title: newTaskTitle, columnId: col.id });
                        }
                        if (e.key === 'Escape') { setShowAddTask(null); setNewTaskTitle(''); }
                      }} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => newTaskTitle.trim() && createTaskMutation.mutate({ title: newTaskTitle, columnId: col.id })}
                        disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                        className="btn-primary text-xs px-3 py-1.5">
                        Add
                      </button>
                      <button onClick={() => { setShowAddTask(null); setNewTaskTitle(''); }}
                        className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskModal task={selectedTask} project={project} onClose={() => setSelectedTask(null)} />
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">Invite Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input className="input" type="email" placeholder="colleague@example.com"
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && inviteEmail && inviteMutation.mutate(inviteEmail)} />
                <p className="text-xs text-gray-400 mt-1">They must already have a TaskFlow account.</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button className="btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                <button className="btn-primary" disabled={!inviteEmail || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate(inviteEmail)}>
                  {inviteMutation.isPending ? 'Inviting…' : 'Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
