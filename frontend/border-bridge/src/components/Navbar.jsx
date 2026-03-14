import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Hidden on /login or when not authenticated
  if (!isAuthenticated || location.pathname === '/login') {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex justify-between items-center py-4 px-6 md:px-8 max-w-7xl mx-auto">
        <div className="text-xl font-bold text-gray-900">
          Border Bridge
        </div>
        <nav className="flex space-x-2 items-center">
          {user && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-500 mr-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
              {user.name}
              {user.role && (
                <span className="text-xs font-medium px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                  {user.role}
                </span>
              )}
            </span>
          )}
          <Link
            to="/"
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/intake"
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Intake
          </Link>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
