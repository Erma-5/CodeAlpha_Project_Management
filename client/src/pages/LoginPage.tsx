import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 bg-navy-900 px-16">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white text-xl font-bold mb-6">T</div>
        <h1 className="text-4xl font-bold text-white mb-4">TaskFlow</h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Manage projects, track tasks, and collaborate with your team — all in one place.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4">
          {['Kanban Boards', 'Real-time Updates', 'Team Collaboration', 'Activity Timeline'].map(f => (
            <div key={f} className="flex items-center gap-2 text-gray-300 text-sm">
              <span className="text-primary-400">✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">Sign up</Link>
          </p>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Demo accounts:</p>
            <p>admin@proj.com / admin123</p>
            <p>staff@proj.com / staff123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
