import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  // Don't show navigation on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop Layout (3xl+) - Horizontal */}
        <div className="hidden 3xl:flex items-center justify-between py-6">
          {/* Logo/Title */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Stock Advisor
              <span className="text-blue-600">.</span>
            </h1>
            <p className="text-gray-600 mt-1">AI-powered stock analysis and portfolio tracking</p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isActive('/')
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Home
            </Link>
            <Link
              to="/insights"
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isActive('/insights')
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Insights
            </Link>
            <Link
              to="/moonshots"
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isActive('/moonshots')
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Moonshots
            </Link>

            {/* User Info and Logout */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Phone Layout (<768px) - Compact vertical */}
        <div className="md:hidden py-4 space-y-3">
          {/* Logo/Title - Compact */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Stock Advisor<span className="text-blue-600">.</span>
            </h1>
            {/* User Info - Compact on mobile */}
            {isAuthenticated && user && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
              >
                Logout
              </button>
            )}
          </div>

          {/* Subtitle - Smaller on mobile */}
          <p className="text-xs text-gray-600">AI-powered stock analysis and portfolio tracking</p>

          {/* Navigation Buttons - Full width stacked */}
          <div className="grid grid-cols-3 gap-2">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg font-semibold text-sm text-center transition-all duration-200 ${
                isActive('/')
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              Home
            </Link>
            <Link
              to="/insights"
              className={`px-3 py-2 rounded-lg font-semibold text-sm text-center transition-all duration-200 ${
                isActive('/insights')
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              Insights
            </Link>
            <Link
              to="/moonshots"
              className={`px-3 py-2 rounded-lg font-semibold text-sm text-center transition-all duration-200 ${
                isActive('/moonshots')
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              Moonshots
            </Link>
          </div>
        </div>

        {/* iPad/Tablet Layout (768px-1920px) - Vertical */}
        <div className="hidden md:block 3xl:hidden py-6 space-y-4">
          {/* Logo/Title - Left aligned */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Stock Advisor
              <span className="text-blue-600">.</span>
              <span className="text-gray-600 text-base font-normal ml-2">AI-powered stock analysis and portfolio tracking</span>
            </h1>
          </div>

          {/* Navigation Buttons - Right aligned */}
          <div className="flex items-center justify-end gap-4">
            <Link
              to="/"
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isActive('/')
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Home
            </Link>
            <Link
              to="/insights"
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isActive('/insights')
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Insights
            </Link>
            <Link
              to="/moonshots"
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isActive('/moonshots')
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Moonshots
            </Link>

            {/* User Info and Logout */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
