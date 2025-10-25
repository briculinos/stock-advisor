import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Insights from './pages/Insights';
import Moonshots from './pages/Moonshots';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/moonshots" element={<Moonshots />} />
        </Routes>

        {/* Footer */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
            <p>
              StockIQ - Built with React, TypeScript, and AI
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This is for educational purposes. Always do your own research before investing.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
