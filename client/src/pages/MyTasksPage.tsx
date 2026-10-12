import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';
import api from '../api/axios';
import { DashboardData } from '../types';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default function MyTasksPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeFilter = params.get('filter') || 'all';

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  });

  const allTasks = data?.myTasks ?? [];

  const filtered = allTasks.filter(t => {
    if (activeFilter === 'overdue') {
      return t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate));
    }
    if (activeFilter === 'soon') {
      const d = t.dueDate ? new Date(t.dueDate) : null;
      return d && !isPast(d);
    }
    if (activeFilter === 'urgent') return t.priority === 'URGENT' || t.priority === 'HIGH';
    return true;
  });

  const tabs = [
    { key: 'all',     label: `All (${allTasks.length})` },
    { key: 'urgent',  label: `High Priority` },
    { key: 'overdue', label: `Overdue (${data?.stats.overdueTasks ?? 0})` },
    { key: 'soon',    label: `Due Soon (${data?.stats.dueSoonTasks ?? 0})` },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-500 text-sm mt-1">All tasks assigned to you across projects.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => setParams(tab.key === 'all' ? {} : { filter: tab.key })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="card divide-y divide-gray-50">
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-4 animate-pulse flex gap-4">
            <div className="w-3 h-3 rounded-full bg-gray-200 mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-50 rounded w-1/3" />
            </div>
          </div>
        ))}

        {!isLoading && !filtered.length && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-gray-500 font-medium">No tasks here</p>
            <p className="text-gray-400 text-sm mt-1">
              {activeFilter === 'overdue' ? "You're all caught up!" : 'Nothing to show for this filter.'}
            </p>
          </div>
        )}

        {filtered.map(task => {
          const due = task.dueDate ? new Date(task.dueDate) : null;
          const overdue = due && isPast(due) && !isToday(due);
          const dueToday = due && isToday(due);

          return (
            <div key={task.id}
              onClick={() => navigate(`/projects/${task.projectId}`)}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: task.project?.color ?? '#6366f1' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                  <span>{task.project?.name}</span>
                  <span>·</span>
                  <span>{task.column?.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge text-[10px] ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                {due && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    overdue  ? 'bg-red-100 text-red-600' :
                    dueToday ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {overdue ? '⚠ Overdue · ' : dueToday ? 'Today · ' : ''}{format(due, 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
