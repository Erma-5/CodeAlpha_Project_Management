import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Project } from '../types';

export default function TeamPage() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  // Collect all unique members across all projects
  const memberMap = new Map<string, { name: string; email: string; avatar?: string; projects: string[] }>();
  projects?.forEach(p => {
    p.members.forEach(m => {
      if (!memberMap.has(m.userId)) {
        memberMap.set(m.userId, { name: m.user.name, email: m.user.email ?? '', avatar: m.user.avatar, projects: [] });
      }
      memberMap.get(m.userId)!.projects.push(p.name);
    });
  });
  const members = Array.from(memberMap.entries());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-gray-500 text-sm mt-1">{members.length} members across your projects</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {members.map(([id, m]) => (
          <div key={id} className="card p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 text-lg font-bold shrink-0">
              {m.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{m.name}</p>
              <p className="text-sm text-gray-500 truncate">{m.email}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {m.projects.map(p => (
                  <span key={p} className="badge bg-gray-100 text-gray-600 text-[10px]">{p}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
