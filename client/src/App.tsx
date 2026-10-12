import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout         from './components/layout/AppLayout';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import DashboardPage     from './pages/DashboardPage';
import ProjectsPage      from './pages/ProjectsPage';
import ProjectBoard      from './pages/projects/ProjectBoard';
import MyTasksPage       from './pages/MyTasksPage';
import NotificationsPage from './pages/NotificationsPage';
import CalendarPage      from './pages/CalendarPage';
import TeamPage          from './pages/TeamPage';
import SettingsPage      from './pages/SettingsPage';
import NotFoundPage      from './pages/NotFoundPage';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index                  element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"       element={<DashboardPage />} />
          <Route path="my-tasks"        element={<MyTasksPage />} />
          <Route path="projects"        element={<ProjectsPage />} />
          <Route path="projects/:id"    element={<ProjectBoard />} />
          <Route path="notifications"   element={<NotificationsPage />} />
          <Route path="calendar"        element={<CalendarPage />} />
          <Route path="team"            element={<TeamPage />} />
          <Route path="settings"        element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
