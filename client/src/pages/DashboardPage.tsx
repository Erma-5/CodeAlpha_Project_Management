import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { format, isPast, isToday, formatDistanceToNow } from 'date-fns';
import api from '../api/axios';
import { DashboardData } from '../types';
import { useAuthStore } from '../store/authStore';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60_000,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = data ? [
    { label: 'Active Projects',  value: data.stats.activeProjects, icon: '📋', color: 'bg-indigo-50 text-indigo-700',  link: '/projects' },
    { label: 'My Open Tasks',    value: data.stats.myOpenTasks,    icon: '✅', color: 'bg-emerald-50 text-emerald-700', link: '/my-tasks' },
    { label: 'Overdue Tasks',    value: data.stats.overdueTasks,   icon: '⚠️', color: 'bg-red-50 text-red-700',         link: '/my-tasks?filter=overdue' },
    { label: 'Due This Week',    value: data.stats.dueSoonTasks,   icon: '📅', color: 'bg-amber-50 text-amber-700',     link: '/my-tasks?filter=soon' },
    { label: 'Total Tasks',      value: data.stats.totalTasks,     icon: '🎯', color: 'bg-blue-50 text-blue-700',       link: '/projects' },
    { label: 'Team Members',     value: data.stats.totalMembers,   icon: '👥', color: 'bg-purple-50 text-purple-700',   link: '/team' },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(s => (
            <Link key={s.label} to={s.link}
              className="card p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2 ${s.color}`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — My Tasks + Upcoming */}
        <div className="lg:col-span-2 space-y-6">

          {/* My Tasks */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">My Tasks</h2>
              <Link to="/my-tasks" className="text-xs text-primary-600 hover:underline">View all →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading && [...Array(3)].map((_, i) => (
                <div key={i} className="px-5 py-3 flex gap-3 items-center animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                  <div className="flex-1 h-4 bg-gray-100 rounded" />
                  <div className="w-16 h-3 bg-gray-100 rounded" />
                </div>
              ))}
              {!isLoading && !data?.myTasks?.length && (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">
                  🎉 No tasks assigned to you
                </div>
              )}
              {data?.myTasks?.slice(0, 6).map(task => {
                const due = task.dueDate ? new Date(task.dueDate) : null;
                const overdue = due && isPast(due) && !isToday(due);
                const dueToday = due && isToday(due);
                return (
                  <div key={task.id}
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project?.color ?? '#6366f1' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{task.project?.name} · {task.column?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-[10px] ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      {due && (
                        <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : dueToday ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                          {overdue ? '⚠ ' : ''}{format(due, 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Projects with progress */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">Project Progress</h2>
              <Link to="/projects" className="text-xs text-primary-600 hover:underline">All projects →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading && [...Array(2)].map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded mb-3 w-1/2" />
                  <div className="h-2 bg-gray-100 rounded" />
                </div>
              ))}
              {!isLoading && !data?.projects?.length && (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No active projects</div>
              )}
              {data?.projects?.map(p => (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className="block px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium text-gray-900">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1">
                        {p.members.slice(0, 3).map(m => (
                          <div key={m.id}
                            className="w-5 h-5 rounded-full bg-primary-200 border border-white flex items-center justify-center text-primary-700 text-[9px] font-bold">
                            {m.name[0].toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{p.progress}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${p.progress}%`, backgroundColor: p.color }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{p.done} of {p.total} tasks done</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — Upcoming deadlines + Activity */}
        <div className="space-y-6">

          {/* Upcoming deadlines */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">Upcoming Deadlines</h2>
              <p className="text-xs text-gray-400 mt-0.5">Next 7 days</p>
            </div>
            <div className="divide-y divide-gray-50">
              {!isLoading && !data?.upcomingDeadlines?.length && (
                <div className="px-5 py-6 text-center text-gray-400 text-xs">No upcoming deadlines</div>
              )}
              {data?.upcomingDeadlines?.map(task => {
                const due = new Date(task.dueDate!);
                const dueToday = isToday(due);
                return (
                  <div key={task.id}
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                    className="px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{task.project?.name}</p>
                      </div>
                      <span className={`text-xs font-medium shrink-0 ${dueToday ? 'text-orange-600' : 'text-gray-500'}`}>
                        {dueToday ? 'Today' : format(due, 'MMM d')}
                      </span>
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="w-4 h-4 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 text-[9px] font-bold">
                          {task.assignee.name[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-400">{task.assignee.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {!isLoading && !data?.recentActivity?.length && (
                <div className="px-5 py-6 text-center text-gray-400 text-xs">No recent activity</div>
              )}
              {data?.recentActivity?.map(a => (
                <div key={a.id} className="px-5 py-3 flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-[10px] font-bold shrink-0 mt-0.5">
                    {a.user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">{a.user.name}</span>{' '}
                      {a.action}
                      {a.task && <span className="font-medium text-gray-900"> "{a.task.title}"</span>}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      {a.project && <span> · {a.project.name}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
