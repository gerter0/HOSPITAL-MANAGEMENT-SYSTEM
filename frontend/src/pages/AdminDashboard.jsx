import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Portal</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">{user?.first_name} {user?.last_name}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
            <p className="text-3xl font-bold text-indigo-600">156</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Doctors</h3>
            <p className="text-3xl font-bold text-indigo-600">32</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Patients</h3>
            <p className="text-3xl font-bold text-indigo-600">120</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Appointments</h3>
            <p className="text-3xl font-bold text-indigo-600">542</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Admin Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-indigo-600 text-white p-4 rounded hover:bg-indigo-700">
              👥 Manage Users
            </button>
            <button className="bg-green-600 text-white p-4 rounded hover:bg-green-700">
              📊 System Statistics
            </button>
            <button className="bg-blue-600 text-white p-4 rounded hover:bg-blue-700">
              📋 Audit Logs
            </button>
            <button className="bg-purple-600 text-white p-4 rounded hover:bg-purple-700">
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
