import express from 'express';
import {
  getAllUsers,
  getAllPatients,
  getPatientDetails,
  resetPatientPassword,
  changePatientStatus,
  getCredentialAuditLog,
  getDashboardStats,
  deactivateUser,
  resetUserPassword,
  getSystemStatistics,
  getAuditLog,
  updateUserRole,
} from '../controllers/adminController.js';
import {
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  getRegistrationMonitoring,
  getPINOTPMonitoring,
  getAccountChangesMonitoring,
  lockUserAccount,
  unlockUserAccount,
  verifyUserEmail,
  toggleUserTwoFA,
  getUserActivityLog,
} from '../controllers/adminAdvancedController.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/commonMiddleware.js';

const router = express.Router();

// All routes are protected and require ADMIN role
router.use(authMiddleware, authorize('ADMIN'));

// ==========================================
// ADMIN CONTROL SERVER ROUTES
// ==========================================

/**
 * Dashboard & Statistics
 */
router.get('/dashboard/stats', getDashboardStats);

/**
 * Patient Management - NEW ENDPOINTS
 */
router.get('/patients', getAllPatients);
router.get('/patients/:userId', getPatientDetails);
router.post('/patients/:userId/reset-password', resetPatientPassword);
router.post('/patients/:userId/status', changePatientStatus);
router.get('/patients/:userId/credential-audit', getCredentialAuditLog);

/**
 * User Management - Existing Endpoints
 */
router.get('/users', getAllUsers);
router.put('/users/:userId/deactivate', deactivateUser);
router.post('/users/:userId/reset-password', resetUserPassword);
router.put('/users/:userId/role', updateUserRole);

/**
 * System & Audit
 */
router.get('/statistics', getSystemStatistics);
router.get('/audit-logs', getAuditLog);

// ==========================================
// ADVANCED ADMIN CONTROL ROUTES
// ==========================================

/**
 * User CRUD Operations
 */
router.post('/users', createUserByAdmin);
router.put('/users/:userId', updateUserByAdmin);
router.delete('/users/:userId', deleteUserByAdmin);

/**
 * Monitoring & Tracking
 */
router.get('/monitoring/registrations', getRegistrationMonitoring);
router.get('/monitoring/pin-otp', getPINOTPMonitoring);
router.get('/monitoring/account-changes', getAccountChangesMonitoring);
router.get('/monitoring/user-activity/:userId', getUserActivityLog);

/**
 * User Account Control
 */
router.post('/users/:userId/lock', lockUserAccount);
router.post('/users/:userId/unlock', unlockUserAccount);
router.post('/users/:userId/verify-email', verifyUserEmail);
router.post('/users/:userId/toggle-2fa', toggleUserTwoFA);

export default router;
