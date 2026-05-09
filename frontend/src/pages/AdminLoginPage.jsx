import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/admin/auth/login', formData);
      const { data } = response.data;

      // Store token and user info
      localStorage.setItem('token', data.token);
      login(data.user, data.token);

      // Redirect to admin control panel
      navigate('/admin/control-panel');
    } catch (err) {
      console.error('Admin login error:', err.response?.data || err.message || err);
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      let message = 'Unable to log in. Please try again.';

      // Handle specific error cases
      if (statusCode === 401 || errorCode === 'INVALID_CREDENTIALS') {
        message = '❌ Invalid email or password. Please check and try again.';
      } else if (statusCode === 423 || errorCode === 'ACCOUNT_LOCKED') {
        message = '🔒 Your account is locked due to repeated failed login attempts. Please use account recovery to unlock it.';
      } else if (statusCode === 429 || errorCode === 'RATE_LIMITED') {
        message = '⏱️ Too many login attempts. Please wait a few minutes before trying again or use account recovery.';
      } else if (statusCode === 500) {
        message = '⚠️ Server error. Please try again later or contact support.';
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Hospital Management</h1>
        <h2 className="text-lg font-semibold text-center text-red-600 mb-6">🛡️ Admin Control Panel</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Admin Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
              placeholder="admin@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800 focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.039m10.318 10.318L3.596 3.039M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition"
          >
            {isLoading ? 'Logging in...' : '🛡️ Admin Login'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6 text-sm">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-red-600 hover:underline font-medium"
          >
            Forgot Password?
          </button>
          {' | '}
          <button
            type="button"
            onClick={() => navigate('/account-recovery')}
            className="text-red-600 hover:underline font-medium"
          >
            Account Locked?
          </button>
        </p>

        <p className="text-center text-gray-600 mt-4 text-sm">
          <Link to="/login" className="text-red-600 hover:underline font-medium">
            Back to User Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
