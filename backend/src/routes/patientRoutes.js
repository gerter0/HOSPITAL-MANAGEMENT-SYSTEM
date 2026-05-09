import express from 'express';
import {
  getPatientProfile,
  updatePatientProfile,
  getPatientMedicalRecords,
  getPatientPrescriptions,
  bookAppointment,
} from '../controllers/patientController.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';
import { sensitiveLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/commonMiddleware.js';
import { patientProfileValidator, appointmentValidator } from '../validators/index.js';

const router = express.Router();

// All routes are protected and require PATIENT role
router.use(authMiddleware, authorize('PATIENT', 'ADMIN', 'DOCTOR'));

// Get patient profile
router.get('/profile', getPatientProfile);

// Update patient profile
router.post('/profile', validateRequest(patientProfileValidator.updateProfile), updatePatientProfile);

// Get medical records
router.get('/medical-records', getPatientMedicalRecords);

// Get prescriptions
router.get('/prescriptions', getPatientPrescriptions);

// Book appointment
router.post('/appointment', sensitiveLimiter, validateRequest(appointmentValidator.bookAppointment), bookAppointment);

export default router;
