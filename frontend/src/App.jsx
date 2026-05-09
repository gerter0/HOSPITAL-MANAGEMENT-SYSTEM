import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import PatientRegistrationPage from './pages/PatientRegistrationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminControlPanel from './pages/AdminControlPanel';
import SecuritySetupPage from './pages/SecuritySetupPage';
import AccountRecoveryPage from './pages/AccountRecoveryPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/register" element={<PatientRegistrationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/security-setup" element={<SecuritySetupPage />} />
        <Route path="/account-recovery" element={<AccountRecoveryPage />} />
        
        {/* Patient Profile Settings */}
        <Route
          path="/profile-settings"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              userRole={user?.role}
              requiredRole="PATIENT"
            >
              <ProfileSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Control Panel */}
        <Route
          path="/admin/control-panel"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              userRole={user?.role}
              requiredRole="ADMIN"
            >
              <AdminControlPanel />
            </ProtectedRoute>
          }
        />
        
        {/* Patient Routes */}
        <Route
          path="/patient/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              userRole={user?.role}
              requiredRole="PATIENT"
            >
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        {/* Doctor Routes */}
        <Route
          path="/doctor/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              userRole={user?.role}
              requiredRole="DOCTOR"
            >
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              userRole={user?.role}
              requiredRole="ADMIN"
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect */}
        <Route path="/" element={<Navigate to={
          isAuthenticated ? 
            (user?.role === 'PATIENT' ? '/patient' : 
             user?.role === 'DOCTOR' ? '/doctor' : 
             user?.role === 'ADMIN' ? '/admin' : '/login')
            : '/login'
        } />} />
      </Routes>
    </Router>
  );
}

export default App;
