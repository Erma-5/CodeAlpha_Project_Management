import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../api/axios';
import { Task, Project, Comment } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Props {
  task: Task;
  project: Project;
  onClose: () => void;
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600', MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700', URGENT: 'bg-red-100 text-red-700',
};

export default function TaskModal({ task, project, onClose }: Props) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // Fetch full task with comments
  const { data: fullTask } = useQuery<Task>({
    queryKey: ['task', task.id],
    queryFn: () => api.get(`/projects/${project.id}/tasks/${task.id}`).then(r => r.data),
    initialData: task,
  });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id || '');
  const [comment, setComment] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(task.tags ? JSON.parse(task.tags) : []);

  const updateMutation = useMutation({
    mutationFn: (data: object) => api.put(`/projects/${project.id}/tasks/${task.id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      qc.invalidateQueries({ queryKey: ['task', task.id] });
      setEditing(false);
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${project.id}/tasks/${task.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('Task deleted');
      onClose();
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/projects/${project.id}/tasks/${task.id}/comments`, { content }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', task.id] });
      setComment('');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const handleSave = () => {
    updateMutation.mutate({ title, description, priority, dueDate: dueDate || null, assigneeId: assigneeId || null, tags });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-gray-100">
          <div className="flex-1">
            {editing ? (
              <input className="input text-lg font-bold" value={title} onChange={e => setTitle(e.target.value)} />
            ) : (
              <h2 className="text-lg font-bold text-gray-900">{fullTask?.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>in <strong className="text-gray-600">{project.name}</strong></span>
              <span>·</span>
              <span className={`badge ${PRIORITY_COLORS[fullTask?.priority ?? 'MEDIUM']}`}>
                {fullTask?.priority}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-3 py-1.5">Edit</button>}
            {editing && <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary text-xs px-3 py-1.5">Save</button>}
            {editing && <button onClick={() => setEditing(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl ml-2">✕</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0">
          {/* Main */}
          <div className="col-span-2 p-6 space-y-5">
            {/* Description */}
            <div>
              <label className="label">Description</label>
              {editing ? (
                <textarea className="input resize-none h-28" placeholder="Add a description…"
                  value={description} onChange={e => setDescription(e.target.value)} />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[40px]">
                  {fullTask?.description || <span className="text-gray-400 italic">No description</span>}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="label">Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map(t => (
                  <span key={t} className="badge bg-purple-100 text-purple-700 text-xs">
                    {t}
                    {editing && (
                      <button onClick={() => setTags(tags.filter(x => x !== t))} className="ml-1 text-purple-400 hover:text-purple-700">×</button>
                    )}
                  </span>
                ))}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <input className="input text-sm" placeholder="Add tag…" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                  <button type="button" onClick={addTag} className="btn-secondary text-xs px-3">Add</button>
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <label className="label">Comments ({fullTask?.comments?.length ?? 0})</label>
              <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                {fullTask?.comments?.map((c: Comment) => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                      {c.user.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{c.user.name}</span>
                        <span className="text-xs text-gray-400">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-sm text-gray-700">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input text-sm" placeholder="Write a comment…" value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && comment.trim() && (e.preventDefault(), commentMutation.mutate(comment))} />
                <button onClick={() => comment.trim() && commentMutation.mutate(comment)}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="btn-primary text-xs px-3">Post</button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-1 bg-gray-50 rounded-r-2xl p-5 space-y-4 border-l border-gray-100">
            {/* Assignee */}
            <div>
              <label className="label text-xs">Assignee</label>
              {editing ? (
                <select className="input text-sm" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {project.members.map(m => (
                    <option key={m.userId} value={m.userId}>{m.user.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  {fullTask?.assignee ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-bold text-xs">
                        {fullTask.assignee.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">{fullTask.assignee.name}</span>
                    </>
                  ) : <span className="text-sm text-gray-400">Unassigned</span>}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="label text-xs">Priority</label>
              {editing ? (
                <select className="input text-sm" value={priority} onChange={e => setPriority(e.target.value as any)}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              ) : (
                <span className={`badge mt-1 ${PRIORITY_COLORS[fullTask?.priority ?? 'MEDIUM']}`}>
                  {fullTask?.priority}
                </span>
              )}
            </div>

            {/* Due date */}
            <div>
              <label className="label text-xs">Due Date</label>
              {editing ? (
                <input type="date" className="input text-sm" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              ) : (
                <p className="text-sm text-gray-700 mt-1">
                  {fullTask?.dueDate ? format(new Date(fullTask.dueDate), 'MMM d, yyyy') : <span className="text-gray-400">None</span>}
                </p>
              )}
            </div>

            {/* Creator */}
            <div>
              <label className="label text-xs">Created by</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                  {fullTask?.creator?.name[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-700">{fullTask?.creator?.name}</span>
              </div>
            </div>

            {/* Created at */}
            <div>
              <label className="label text-xs">Created</label>
              <p className="text-sm text-gray-500 mt-1">
                {fullTask?.createdAt ? format(new Date(fullTask.createdAt), 'MMM d, yyyy') : '—'}
              </p>
            </div>

            {/* Delete */}
            {(user?.id === fullTask?.creator?.id) && (
              <button onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate(); }}
                className="btn-danger w-full justify-center text-xs mt-4">
                Delete Task
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
