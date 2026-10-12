import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Project } from '../types';
import toast from 'react-hot-toast';

const PROJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#eab308','#22c55e','#06b6d4',
];

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => api.post('/projects', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
      setShowCreate(false);
      setName(''); setDescription(''); setColor(PROJECT_COLORS[0]);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create project'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name, description, color });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">{projects?.length ?? 0} projects</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Project</button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Create Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Project name</label>
                <input className="input" placeholder="e.g. Website Redesign" value={name}
                  onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea className="input resize-none h-20" placeholder="What is this project about?"
                  value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2">
                  {PROJECT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects grid */}
      {isLoading && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="card h-40 animate-pulse bg-gray-100" />)}
      </div>}

      {!isLoading && !projects?.length && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900">No projects yet</h3>
          <p className="text-gray-500 mt-1 mb-6">Create your first project to get started.</p>
          <button className="btn-primary mx-auto" onClick={() => setShowCreate(true)}>Create Project</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map(p => (
          <Link key={p.id} to={`/projects/${p.id}`}
            className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: p.color }}>
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">{p.name}</h3>
                <span className={`badge text-xs ${
                  p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>{p.status}</span>
              </div>
            </div>
            {p.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{p._count?.tasks ?? 0} tasks</span>
              <div className="flex -space-x-1">
                {p.members.slice(0,4).map(m => (
                  <div key={m.id} className="w-6 h-6 rounded-full bg-primary-200 border-2 border-white flex items-center justify-center text-primary-700 font-semibold text-[10px]">
                    {m.user.name[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
