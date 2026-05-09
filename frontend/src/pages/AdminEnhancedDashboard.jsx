import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import '../pages/AdminControlPanel.css';

export default function AdminEnhancedDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // User Management State
  const [users, setUsers] = useState([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '', username: '', password: '', first_name: '', last_name: '', phone_number: '', role: 'PATIENT'
  });

  // Registration Monitoring
  const [registrations, setRegistrations] = useState([]);
  const [registrationStats, setRegistrationStats] = useState({});

  // PIN/OTP Monitoring
  const [pinOtpLogs, setPinOtpLogs] = useState([]);
  const [pinOtpStats, setPinOtpStats] = useState({});

  // Account Changes Monitoring
  const [accountChanges, setAccountChanges] = useState([]);

  // User Activity
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userActivity, setUserActivity] = useState([]);

  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrationMonitoring();
    } else if (activeTab === 'pin-otp') {
      fetchPINOTPMonitoring();
    } else if (activeTab === 'account-changes') {
      fetchAccountChangesMonitoring();
    } else if (activeTab === 'user-management') {
      fetchAllUsers();
    }
  }, [activeTab]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/users');
      setUsers(response.data.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to fetch users: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationMonitoring = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/monitoring/registrations?days=30');
      setRegistrations(response.data.data.registrations || []);
      setRegistrationStats(response.data.data.stats || {});
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to fetch registration data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchPINOTPMonitoring = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/monitoring/pin-otp');
      setPinOtpLogs(response.data.data.logs || []);
      setPinOtpStats(response.data.data.stats || {});
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to fetch PIN/OTP data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountChangesMonitoring = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/monitoring/account-changes');
      setAccountChanges(response.data.data.changes || []);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to fetch account changes: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivity = async (userId) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/monitoring/user-activity/${userId}`);
      setUserActivity(response.data.data.logs || []);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to fetch user activity: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.username || !newUserForm.password) {
      setMessage({ type: 'error', text: 'Email, username, and password are required' });
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/admin/users', newUserForm);
      setMessage({ type: 'success', text: 'User created successfully!' });
      setShowCreateUserModal(false);
      setNewUserForm({
        email: '', username: '', password: '', first_name: '', last_name: '', phone_number: '', role: 'PATIENT'
      });
      fetchAllUsers();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to create user: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleLockAccount = async (userId) => {
    try {
      await apiClient.post(`/admin/users/${userId}/lock`, { duration: 3600 });
      setMessage({ type: 'success', text: 'Account locked successfully!' });
      fetchAllUsers();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to lock account: ${error.message}` });
    }
  };

  const handleUnlockAccount = async (userId) => {
    try {
      await apiClient.post(`/admin/users/${userId}/unlock`);
      setMessage({ type: 'success', text: 'Account unlocked successfully!' });
      fetchAllUsers();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to unlock account: ${error.message}` });
    }
  };

  const handleToggle2FA = async (userId, enable) => {
    try {
      await apiClient.post(`/admin/users/${userId}/toggle-2fa`, { enable });
      setMessage({ type: 'success', text: `2FA ${enable ? 'enabled' : 'disabled'} successfully!` });
      fetchAllUsers();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to toggle 2FA: ${error.message}` });
    }
  };

  const handleVerifyEmail = async (userId) => {
    try {
      await apiClient.post(`/admin/users/${userId}/verify-email`);
      setMessage({ type: 'success', text: 'Email verified successfully!' });
      fetchAllUsers();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to verify email: ${error.message}` });
    }
  };

  return (
    <div className="admin-enhanced-dashboard">
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.type === 'success' ? '✓' : '✕'} {message.text}
        </div>
      )}

      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab ${activeTab === 'user-management' ? 'active' : ''}`}
          onClick={() => setActiveTab('user-management')}
        >
          👥 User Management
        </button>
        <button 
          className={`tab ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          📝 Registration Monitor
        </button>
        <button 
          className={`tab ${activeTab === 'pin-otp' ? 'active' : ''}`}
          onClick={() => setActiveTab('pin-otp')}
        >
          🔐 PIN/OTP Monitor
        </button>
        <button 
          className={`tab ${activeTab === 'account-changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('account-changes')}
        >
          ⚙️ Account Changes
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="tab-content">
          <h2>📊 Admin Dashboard</h2>
          <p>System overview and quick statistics</p>
        </div>
      )}

      {activeTab === 'user-management' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>👥 User Management (CRUD)</h2>
            <button onClick={() => setShowCreateUserModal(true)} className="btn-primary">
              ➕ Create New User
            </button>
          </div>

          {showCreateUserModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Create New User</h3>
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})}
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="First Name" 
                  value={newUserForm.first_name}
                  onChange={(e) => setNewUserForm({...newUserForm, first_name: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  value={newUserForm.last_name}
                  onChange={(e) => setNewUserForm({...newUserForm, last_name: e.target.value})}
                />
                <select 
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})}
                >
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <div className="modal-buttons">
                  <button onClick={handleCreateUser} className="btn-success">Create</button>
                  <button onClick={() => setShowCreateUserModal(false)} className="btn-cancel">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {loading ? <p>Loading users...</p> : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.user_id}>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td><span className={`role-badge role-${user.role.toLowerCase()}`}>{user.role}</span></td>
                    <td>{user.is_active ? '✓ Active' : '✗ Inactive'}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="actions">
                      <button onClick={() => handleLockAccount(user.user_id)} title="Lock Account">🔒</button>
                      <button onClick={() => handleUnlockAccount(user.user_id)} title="Unlock Account">🔓</button>
                      <button onClick={() => handleToggle2FA(user.user_id, true)} title="Enable 2FA">🔐</button>
                      <button onClick={() => handleVerifyEmail(user.user_id)} title="Verify Email">✓</button>
                      <button onClick={() => { setSelectedUserId(user.user_id); fetchUserActivity(user.user_id); }} title="View Activity">📋</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'registrations' && (
        <div className="tab-content">
          <h2>📝 Registration Monitoring (Last 30 Days)</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{registrationStats.total || 0}</div>
              <div className="stat-label">Total Registrations</div>
            </div>
            <div className="stat-card success">
              <div className="stat-number">{registrationStats.verified || 0}</div>
              <div className="stat-label">Verified</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-number">{registrationStats.pending || 0}</div>
              <div className="stat-label">Pending Verification</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-number">{registrationStats.expired || 0}</div>
              <div className="stat-label">Verification Expired</div>
            </div>
          </div>

          {loading ? <p>Loading registrations...</p> : (
            <table className="monitoring-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(reg => (
                  <tr key={reg.user_id}>
                    <td>{reg.email}</td>
                    <td>{reg.username}</td>
                    <td>{reg.role}</td>
                    <td><span className={`status-${reg.verification_status.toLowerCase().replace(' ', '-')}`}>{reg.verification_status}</span></td>
                    <td>{new Date(reg.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'pin-otp' && (
        <div className="tab-content">
          <h2>🔐 PIN/OTP Send Monitoring</h2>
          <div className="stats-grid">
            {Object.entries(pinOtpStats).map(([action, count]) => (
              <div className="stat-card" key={action}>
                <div className="stat-number">{count}</div>
                <div className="stat-label">{action.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>

          {loading ? <p>Loading PIN/OTP logs...</p> : (
            <table className="monitoring-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User Email</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {pinOtpLogs.slice(0, 50).map((log, idx) => (
                  <tr key={idx}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.email}</td>
                    <td>{log.action_description}</td>
                    <td><span className={`status-${log.status.toLowerCase()}`}>{log.status}</span></td>
                    <td>{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'account-changes' && (
        <div className="tab-content">
          <h2>⚙️ Account Changes Monitoring</h2>
          {loading ? <p>Loading account changes...</p> : (
            <table className="monitoring-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Change Summary</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {accountChanges.slice(0, 100).map((change, idx) => (
                  <tr key={idx}>
                    <td>{new Date(change.timestamp).toLocaleString()}</td>
                    <td>{change.change_summary}</td>
                    <td>{change.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
