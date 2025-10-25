import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Auth() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(username, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await register(regUsername, regEmail, regPassword, regInviteCode);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Logo/Title */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Stock Advisor</h1>
          <p className="text-sm md:text-base text-gray-600">AI-Powered Stock Analysis Platform</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* Tab Switcher */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`flex-1 py-3 md:py-2 px-4 rounded-md font-semibold transition-colors text-base ${
                isLogin
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
              className={`flex-1 py-3 md:py-2 px-4 rounded-md font-semibold transition-colors text-base ${
                !isLogin
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 md:py-2 px-4 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-base"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          ) : (
            // Register Form
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="regUsername" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="regUsername"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={3}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 3 characters</p>
              </div>

              <div>
                <label htmlFor="regEmail" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="regEmail"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="regPassword" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="regPassword"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label htmlFor="regConfirmPassword" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="regConfirmPassword"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="regInviteCode" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                  Invite Code <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  id="regInviteCode"
                  value={regInviteCode}
                  onChange={(e) => setRegInviteCode(e.target.value.toUpperCase())}
                  placeholder="BETA-XXXXXX"
                  className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Required if your email is not whitelisted</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 md:py-2 px-4 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-base"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Info Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By logging in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-6 md:mt-8 bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 mb-3 text-base">Platform Features:</h3>
          <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700">
            <li>• Multi-source AI analysis with dynamic weighting</li>
            <li>• Elliott Wave pattern recognition</li>
            <li>• Sentiment analysis with meme risk detection</li>
            <li>• Macro economic indicators and sector analysis</li>
            <li>• Moonshot candidate discovery</li>
            <li>• Portfolio tracking with P/L calculation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Auth;
