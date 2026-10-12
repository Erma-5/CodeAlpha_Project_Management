import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Project } from '../../types';

const navItems = [
  { to: '/dashboard',    label: 'Overview',      icon: '🏠' },
  { to: '/my-tasks',     label: 'My Tasks',      icon: '✅' },
  { to: '/projects',     label: 'Projects',      icon: '📋' },
  { to: '/notifications',label: 'Inbox',         icon: '🔔' },
  { to: '/calendar',     label: 'Calendar',      icon: '📅' },
  { to: '/team',         label: 'Team',          icon: '👥' },
  { to: '/settings',     label: 'Settings',      icon: '⚙️' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-navy-900 text-white flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">T</div>
          <div>
            <span className="text-base font-bold tracking-tight">TaskFlow</span>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5">Project Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {/* Recent Projects */}
        {projects && projects.length > 0 && (
          <div className="pt-4">
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Recent Projects
            </p>
            {projects.slice(0, 5).map(p => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-gray-500 hover:text-white transition-colors text-sm px-1"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  );
}
