import React, { useState, useEffect } from 'react';
import { Eye, RotateCcw, Shield, Search, Filter } from 'react-icons/fa';
import apiClient from '../api/client';
import './AdminControlPanel.css';

export default function AdminControlPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Fetch dashboard statistics
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab]);

  // Fetch patients list
  useEffect(() => {
    if (activeTab === 'patients') {
      fetchPatients();
    }
  }, [activeTab, pagination.page, searchTerm, statusFilter]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      showMessage('error', `Failed to fetch statistics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/patients', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm,
          status: statusFilter,
        },
      });

      setPatients(response.data.data.patients);
      setPagination({
        ...pagination,
        total: response.data.data.pagination.total,
      });
    } catch (error) {
      showMessage('error', `Failed to fetch patients: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleResetPassword = async () => {
    if (!selectedPatient) return;

    const newPassword = prompt('Enter new password (min 8 characters):');
    if (!newPassword || newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }

    const reason = prompt('Enter reason for reset:');
    if (!reason) return;

    try {
      setLoading(true);
      await apiClient.post(`/admin/patients/${selectedPatient.user_id}/reset-password`, {
        newPassword,
        reason,
      });
      showMessage('success', 'Password reset successfully');
      setShowModal(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (error) {
      showMessage('error', `Failed to reset password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    if (!selectedPatient) return;

    const reason = prompt(`Enter reason for ${newStatus.toLowerCase()}:`);
    if (!reason) return;

    try {
      setLoading(true);
      await apiClient.post(`/admin/patients/${selectedPatient.user_id}/status`, {
        status: newStatus,
        reason,
      });
      showMessage('success', `Account status changed to ${newStatus}`);
      setShowModal(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (error) {
      showMessage('error', `Failed to change status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (patient) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/patients/${patient.user_id}`);
      setSelectedPatient(response.data.data);
      setModalAction('view');
      setShowModal(true);
    } catch (error) {
      showMessage('error', `Failed to fetch patient details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-control-panel">
      {/* Navigation Tabs */}
      <nav className="control-nav">
        <div className="nav-header">
          <Shield style={{ marginRight: '10px', fontSize: '24px' }} />
          <h1>Admin Control Panel</h1>
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            Patient Management
          </button>
          <button className="tab" disabled style={{ opacity: 0.5 }}>
            Doctor Management (Coming Soon)
          </button>
        </div>
      </nav>

      {/* Messages */}
      {message.text && (
        <div className={`message message-${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '✕'} {message.text}</span>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="control-content dashboard-section">
          <h2>System Overview & Statistics</h2>

          {loading ? (
            <div className="loading-state">
              <p>Loading system statistics...</p>
            </div>
          ) : stats ? (
            <div className="stats-grid">
              <div className="stat-card stat-patients">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>Total Patients</h3>
                  <p className="stat-main">{stats.total_patients || 0}</p>
                  <p className="stat-sub">{stats.active_patients || 0} active</p>
                </div>
              </div>

              <div className="stat-card stat-doctors">
                <div className="stat-icon">👨‍⚕️</div>
                <div className="stat-info">
                  <h3>Total Doctors</h3>
                  <p className="stat-main">{stats.total_doctors || 0}</p>
                  <p className="stat-sub">{stats.active_doctors || 0} active</p>
                </div>
              </div>

              <div className="stat-card stat-appointments">
                <div className="stat-icon">📅</div>
                <div className="stat-info">
                  <h3>Appointments</h3>
                  <p className="stat-main">{stats.scheduled_appointments || 0}</p>
                  <p className="stat-sub">{stats.completed_appointments || 0} completed</p>
                </div>
              </div>

              <div className="stat-card stat-alerts">
                <div className="stat-icon">⚠️</div>
                <div className="stat-info">
                  <h3>Suspended</h3>
                  <p className="stat-main">{stats.suspended_accounts || 0}</p>
                  <p className="stat-sub">Accounts suspended</p>
                </div>
              </div>

              <div className="stat-card stat-new">
                <div className="stat-icon">✨</div>
                <div className="stat-info">
                  <h3>New Registrations</h3>
                  <p className="stat-main">{stats.new_patients_today || 0}</p>
                  <p className="stat-sub">Registered today</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="error-state">
              <p>✕ Failed to load statistics</p>
            </div>
          )}
        </div>
      )}

      {/* Patient Management Tab */}
      {activeTab === 'patients' && (
        <div className="control-content patients-section">
          <div className="section-header">
            <h2>Patient Credential & Account Management</h2>
            <p>Manage patient credentials, account status, and access control</p>
          </div>

          {/* Filters */}
          <div className="control-filters">
            <div className="search-box">
              <Search />
              <input
                type="text"
                placeholder="Search patients by email, username, or name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
              />
            </div>

            <div className="filter-dropdown">
              <Filter />
              <select value={statusFilter} onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}>
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="inactive">Inactive Accounts</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </div>

          {/* Patients List */}
          {loading ? (
            <div className="loading-state">
              <p>Loading patient list...</p>
            </div>
          ) : patients.length > 0 ? (
            <>
              <div className="patients-table-wrapper">
                <table className="patients-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Full Name</th>
                      <th>Status</th>
                      <th>Verified</th>
                      <th>Last Login</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.user_id} className={!patient.is_active ? 'row-inactive' : ''}>
                        <td className="col-email">{patient.email}</td>
                        <td className="col-name">
                          {patient.first_name} {patient.last_name}
                        </td>
                        <td className="col-status">
                          <span className={`status-badge ${patient.is_active ? 'active' : 'inactive'}`}>
                            {patient.is_active ? '✓ Active' : '✗ Inactive'}
                          </span>
                        </td>
                        <td className="col-verified">
                          {patient.is_verified ? (
                            <span className="verified-check">✓ Verified</span>
                          ) : (
                            <span className="unverified-check">✗ Pending</span>
                          )}
                        </td>
                        <td className="col-lastlogin">
                          {patient.last_login
                            ? new Date(patient.last_login).toLocaleString()
                            : 'Never'}
                        </td>
                        <td className="col-registered">
                          {new Date(patient.created_at).toLocaleDateString()}
                        </td>
                        <td className="col-actions">
                          <div className="action-buttons">
                            <button
                              className="btn-action view"
                              onClick={() => handleViewDetails(patient)}
                              title="View Full Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="btn-action reset"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setModalAction('reset-password');
                                setShowModal(true);
                              }}
                              title="Reset Password"
                            >
                              <Lock size={16} />
                            </button>
                            <button
                              className="btn-action suspend"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setModalAction('change-status');
                                setShowModal(true);
                              }}
                              title="Change Account Status"
                            >
                              <Shield size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination-controls">
                <button
                  className="btn-nav"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  ← Previous
                </button>
                <span className="page-info">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)} ({pagination.total} total)
                </span>
                <button
                  className="btn-nav"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>No patients found matching your criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalAction === 'view' && '👤 Patient Details'}
                {modalAction === 'reset-password' && '🔐 Reset Password'}
                {modalAction === 'change-status' && '⚠️ Change Account Status'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-content">
              {modalAction === 'view' && (
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Email Address:</label>
                    <span className="detail-value">{selectedPatient.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Full Name:</label>
                    <span className="detail-value">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Phone Number:</label>
                    <span className="detail-value">{selectedPatient.phone_number}</span>
                  </div>
                  <div className="detail-item">
                    <label>Account Status:</label>
                    <span className={`detail-value status-badge ${selectedPatient.is_active ? 'active' : 'inactive'}`}>
                      {selectedPatient.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Email Verified:</label>
                    <span className="detail-value">
                      {selectedPatient.is_verified ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Registered Date:</label>
                    <span className="detail-value">
                      {new Date(selectedPatient.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Last Login:</label>
                    <span className="detail-value">
                      {selectedPatient.last_login
                        ? new Date(selectedPatient.last_login).toLocaleString()
                        : 'Never logged in'}
                    </span>
                  </div>
                </div>
              )}

              {modalAction === 'reset-password' && (
                <div className="action-warning">
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>⚠️</span>
                  <div className="warning-text">
                    <p>You are about to reset the password for:</p>
                    <strong>{selectedPatient.email}</strong>
                    <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
                      A new password will be generated. The user will need to set a new password on their next login.
                    </p>
                  </div>
                </div>
              )}

              {modalAction === 'change-status' && (
                <div className="action-warning">
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>⚠️</span>
                  <div className="warning-text">
                    <p>Current Status: <strong>{selectedPatient.is_active ? 'Active' : 'Inactive'}</strong></p>
                    <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
                      {selectedPatient.is_active
                        ? 'This will suspend the account and prevent all login attempts.'
                        : 'This will reactivate the account and grant access.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {modalAction === 'view' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setModalAction('reset-password')}
                  >
                    Reset Password
                  </button>
                </>
              )}

              {modalAction === 'reset-password' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleResetPassword}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Confirm & Reset Password'}
                  </button>
                </>
              )}

              {modalAction === 'change-status' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() =>
                      handleChangeStatus(
                        selectedPatient.is_active ? 'SUSPENDED' : 'ACTIVE'
                      )
                    }
                    disabled={loading}
                  >
                    {loading
                      ? 'Updating...'
                      : selectedPatient.is_active
                      ? 'Suspend Account'
                      : 'Reactivate Account'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

