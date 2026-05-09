import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { FiLogOut, FiFileText, FiCalendar, FiBox, FiUser } from 'react-icons/fi';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState({
    appointmentsCount: 0,
    medicalRecordsCount: 0,
    prescriptionsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch patient data
        const response = await apiClient.get('/api/v1/patients/profile');
        if (response.data) {
          setStats({
            appointmentsCount: response.data.appointmentsCount || 0,
            medicalRecordsCount: response.data.medicalRecordsCount || 0,
            prescriptionsCount: response.data.prescriptionsCount || 0,
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleViewMedicalRecords = () => {
    navigate('/medical-records');
  };

  const handleViewPrescriptions = () => {
    navigate('/prescriptions');
  };

  const handleBookAppointment = () => {
    navigate('/book-appointment');
  };

  const handleProfileSettings = () => {
    navigate('/profile-settings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {user?.name || 'Patient'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Appointments Card */}
          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Upcoming Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.appointmentsCount}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <FiCalendar className="text-blue-600 text-2xl" />
              </div>
            </div>
          </div>

          {/* Medical Records Card */}
          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Medical Records</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.medicalRecordsCount}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <FiFileText className="text-green-600 text-2xl" />
              </div>
            </div>
          </div>

          {/* Prescriptions Card */}
          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Active Prescriptions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.prescriptionsCount}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <FiBox className="text-purple-600 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleBookAppointment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Book Appointment
            </button>
            <button
              onClick={handleViewMedicalRecords}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              View Medical Records
            </button>
            <button
              onClick={handleViewPrescriptions}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              View Prescriptions
            </button>
            <button
              onClick={handleProfileSettings}
              className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              <FiUser /> Profile Settings
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Info</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <strong>Tip:</strong> Keep your medical records up to date and follow your doctor's prescriptions for better health management.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

