import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleContinue = () => {
    const roleRoutes = {
      PATIENT: '/patient',
      DOCTOR: '/doctor',
      ADMIN: '/admin',
    };
    navigate(roleRoutes[user?.role] || '/login');
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      PATIENT: 'Patient',
      DOCTOR: 'Doctor',
      ADMIN: 'Administrator',
    };
    return roleNames[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Welcome!
        </h1>
        <p className="text-center text-gray-600 mb-8">
          You have logged in successfully
        </p>

        {/* User Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="mb-3">
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-lg font-semibold text-gray-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Role</p>
            <p className="text-lg font-semibold text-blue-600">
              {getRoleDisplayName(user?.role)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            Continue to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>

        {/* Additional Info */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Hospital Management System
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
