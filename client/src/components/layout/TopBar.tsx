import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Notification } from '../../types';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function TopBar() {
  const location = useLocation();
  const [showNotif, setShowNotif] = useState(false);

  const { data, refetch } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
  });

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    refetch();
    toast.success('All marked as read');
  };

  const title = location.pathname === '/dashboard'
    ? 'Dashboard'
    : location.pathname.startsWith('/projects/')
    ? 'Project Board'
    : 'Projects';

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="relative">
        <button
          onClick={() => setShowNotif(v => !v)}
          className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          🔔
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {showNotif && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm">Notifications</span>
              <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">Mark all read</button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {!data?.notifications?.length && (
                <p className="text-center text-sm text-gray-400 py-6">No notifications</p>
              )}
              {data?.notifications?.map(n => (
                <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!n.isRead ? 'bg-primary-50' : ''}`}>
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
