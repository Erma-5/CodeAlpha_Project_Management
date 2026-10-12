import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Notification } from '../types';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: '📌', TASK_COMMENTED: '💬', TASK_MOVED: '🔄',
  TASK_DUE_SOON: '⏰', PROJECT_INVITED: '🎉', MENTIONED: '@',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  });

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All marked as read'); },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClick = (n: Notification) => {
    if (!n.isRead) markOne.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data?.unreadCount ?? 0} unread notification{data?.unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        {(data?.unreadCount ?? 0) > 0 && (
          <button onClick={() => markAll.mutate()} className="btn-secondary text-sm">
            Mark all as read
          </button>
        )}
      </div>

      <div className="card divide-y divide-gray-50">
        {!data?.notifications?.length && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
          </div>
        )}
        {data?.notifications?.map(n => (
          <div key={n.id}
            onClick={() => handleClick(n)}
            className={`px-6 py-4 flex gap-4 cursor-pointer transition-colors hover:bg-gray-50 ${!n.isRead ? 'bg-primary-50/50' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${!n.isRead ? 'bg-primary-100' : 'bg-gray-100'}`}>
              {TYPE_ICONS[n.type] ?? '🔔'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
