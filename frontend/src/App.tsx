import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Insights from './pages/Insights';
import Moonshots from './pages/Moonshots';
import Auth from './pages/Auth';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen">
          <Navigation />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            <Route path="/moonshots" element={<ProtectedRoute><Moonshots /></ProtectedRoute>} />
          </Routes>

          {/* Footer */}
          <footer className="bg-white border-t mt-12">
            <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
              <p>
                Stock Advisor - Built with React, TypeScript, and AI
              </p>
              <p className="mt-1 text-xs text-gray-500">
                This is for educational purposes. Always do your own research before investing.
              </p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
