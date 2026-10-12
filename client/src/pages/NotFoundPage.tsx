import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn-primary mt-6 inline-flex">Go to Dashboard</Link>
      </div>
    </div>
  );
}
