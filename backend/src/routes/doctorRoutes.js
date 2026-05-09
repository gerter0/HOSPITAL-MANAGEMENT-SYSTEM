import express from 'express';
import {
  getDoctorPatients,
  getDoctorProfile,
  updateDoctorProfile,
  addMedicalRecord,
  addPrescription,
  getDoctorAppointments,
} from '../controllers/doctorController.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';
import { sensitiveLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/commonMiddleware.js';
import { medicalRecordValidator, prescriptionValidator } from '../validators/index.js';

const router = express.Router();

// All routes are protected and require DOCTOR role
router.use(authMiddleware, authorize('DOCTOR', 'ADMIN'));

// Get doctor profile
router.get('/profile', getDoctorProfile);

// Update doctor profile
router.put('/profile', validateRequest(medicalRecordValidator.updateProfile), updateDoctorProfile);

// Get patients list
router.get('/patients', getDoctorPatients);

// Add medical record
router.post('/medical-record', sensitiveLimiter, validateRequest(medicalRecordValidator.create), addMedicalRecord);

// Add prescription
router.post('/prescription', sensitiveLimiter, validateRequest(prescriptionValidator.create), addPrescription);

// Get appointments
router.get('/appointments', getDoctorAppointments);

export default router;
