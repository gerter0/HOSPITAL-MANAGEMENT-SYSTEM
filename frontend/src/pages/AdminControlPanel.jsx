import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import './AdminControlPanel.css';

export default function AdminControlPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Patient Management State
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const itemsPerPage = 10;
  
  // Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'patients') {
      fetchPatients();
    }
  }, [activeTab, currentPage, searchQuery, statusFilter]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to fetch statistics: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setPatientsLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };
      
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await apiClient.get('/admin/patients', { params });
      console.log('📦 Raw Response:', response.data);
      
      // The structure is: { success, data: { patients, pagination }, ... }
      const patientList = response.data.data?.patients || [];
      const total = response.data.data?.pagination?.total || 0;
      
      console.log('👥 Patients loaded:', patientList.length);
      
      setPatients(patientList);
      setTotalPatients(total);
    } catch (error) {
      console.error('❌ Fetch error:', error);
      setMessage({ type: 'error', text: `Failed to fetch patients: ${error.message}` });
    } finally {
      setPatientsLoading(false);
    }
  };

  const fetchAuditLogs = async (userId) => {
    try {
      setAuditLoading(true);
      const response = await apiClient.get(`/admin/patients/${userId}/credential-audit`);
      setAuditLogs(response.data.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to fetch audit logs: ${error.message}` });
    } finally {
      setAuditLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setMessage({ type: 'error', text: 'Please enter a new password' });
      return;
    }
    
    try {
      await apiClient.post(`/admin/patients/${selectedPatient.user_id}/reset-password`, {
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: `Password reset for ${selectedPatient.first_name} ${selectedPatient.last_name}` });
      setShowPasswordModal(false);
      setNewPassword('');
      fetchPatients();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to reset password: ${error.message}` });
    }
  };

  const handleChangeStatus = async () => {
    try {
      await apiClient.post(`/admin/patients/${selectedPatient.user_id}/status`, {
        status: newStatus,
      });
      setMessage({ type: 'success', text: `Status updated to ${newStatus}` });
      setShowStatusModal(false);
      fetchPatients();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to change status: ${error.message}` });
    }
  };

  const openPasswordModal = (patient) => {
    setSelectedPatient(patient);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const openStatusModal = (patient) => {
    setSelectedPatient(patient);
    setNewStatus(patient.is_active ? 'INACTIVE' : 'ACTIVE');
    setShowStatusModal(true);
  };

  const openAuditModal = (patient) => {
    setSelectedPatient(patient);
    setShowAuditModal(true);
    fetchAuditLogs(patient.user_id);
  };

  const totalPages = Math.ceil(totalPatients / itemsPerPage);

  return (
    <div className="admin-control-panel">
      <nav className="control-nav">
        <div className="nav-header">
          <h1>🛡️ Admin Control Panel</h1>
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            👥 Patient Management
          </button>
        </div>
      </nav>

      {message.text && (
        <div className={`message message-${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '✕'} {message.text}</span>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="control-content dashboard-section">
          <h2>System Overview & Statistics</h2>

          {loading ? (
            <div className="loading-state">
              <p>⏳ Loading system statistics...</p>
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
                  <h3>Suspended Accounts</h3>
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
              <p>❌ Failed to load statistics</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="control-content patients-section">
          <h2>👥 Patient Management</h2>
          
          {/* Search and Filter Section */}
          <div className="patient-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by email, name, or username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            <div className="filter-box">
              <select value={statusFilter} onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}>
                <option value="all">All Patients</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Patients Table */}
          {patientsLoading ? (
            <div className="loading-state">
              <p>⏳ Loading patients...</p>
            </div>
          ) : patients.length > 0 ? (
            <>
              <div className="patients-table-wrapper">
                <table className="patients-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.user_id} className={`patient-row ${patient.is_active ? 'active' : 'inactive'}`}>
                        <td>
                          <strong>{patient.first_name} {patient.last_name}</strong>
                          <br />
                          <small>@{patient.username}</small>
                        </td>
                        <td>{patient.email}</td>
                        <td>{patient.phone_number || '—'}</td>
                        <td>
                          <span className={`status-badge status-${patient.is_active ? 'active' : 'inactive'}`}>
                            {patient.is_active ? '✓ Active' : '✕ Inactive'}
                          </span>
                        </td>
                        <td>
                          {new Date(patient.created_at).toLocaleDateString()}
                        </td>
                        <td className="patient-actions">
                          <button 
                            className="action-btn btn-reset"
                            title="Reset Password"
                            onClick={() => openPasswordModal(patient)}
                          >
                            🔑 Reset
                          </button>
                          <button 
                            className="action-btn btn-status"
                            title="Change Status"
                            onClick={() => openStatusModal(patient)}
                          >
                            ⚙️ Status
                          </button>
                          <button 
                            className="action-btn btn-audit"
                            title="View Audit Logs"
                            onClick={() => openAuditModal(patient)}
                          >
                            📋 Logs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <span>Page {currentPage} of {totalPages} ({totalPatients} total)</span>
                <button 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>📭 No patients found</p>
            </div>
          )}
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Reset Password</h3>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Patient:</strong> {selectedPatient.first_name} {selectedPatient.last_name}</p>
              <p><strong>Email:</strong> {selectedPatient.email}</p>
              <div className="form-group">
                <label>New Password:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleResetPassword}>Reset Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Change Status</h3>
              <button className="close-btn" onClick={() => setShowStatusModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Patient:</strong> {selectedPatient.first_name} {selectedPatient.last_name}</p>
              <p><strong>Current Status:</strong> {selectedPatient.is_active ? 'Active' : 'Inactive'}</p>
              <div className="form-group">
                <label>New Status:</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleChangeStatus}>Change Status</button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowAuditModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Credential Audit Logs</h3>
              <button className="close-btn" onClick={() => setShowAuditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Patient:</strong> {selectedPatient.first_name} {selectedPatient.last_name} ({selectedPatient.email})</p>
              
              {auditLoading ? (
                <p>⏳ Loading audit logs...</p>
              ) : auditLogs.length > 0 ? (
                <div className="audit-logs-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Type</th>
                        <th>Performed By</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td>{log.action_type}</td>
                          <td>{log.credential_type}</td>
                          <td>{log.performed_by || 'System'}</td>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>📭 No audit logs found</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAuditModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

