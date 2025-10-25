import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-6">
          {/* Logo/Title */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              StockIQ
              <span className="text-blue-600">.</span>
            </h1>
            <p className="text-gray-600 mt-1">AI-powered stock analysis and portfolio tracking</p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
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
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
