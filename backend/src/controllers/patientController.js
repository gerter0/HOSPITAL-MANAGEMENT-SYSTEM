import { AppError, formatSuccessResponse, getPaginationParams } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { encryptData, decryptData } from '../utils/security.js';
import { auditLog, auditLogFailure } from '../utils/auditLogger.js';

// Get Patient Profile
export const getPatientProfile = async (req, res, next) => {
  try {
    let { patientId } = req.params;
    const userId = req.user.user_id;

    // If no patientId provided, get the current user's patient ID
    if (!patientId) {
      const patientQuery = 'SELECT patient_id FROM patients WHERE user_id = ?';
      const patients = await executeQuery(patientQuery, [userId]);

      if (patients.length === 0) {
        throw new AppError('Patient record not found', 404, 'PATIENT_NOT_FOUND');
      }

      patientId = patients[0].patient_id;
    }

    // Authorization check - patients can only view their own profile
    if (req.user.role === 'PATIENT') {
      const patientQuery = 'SELECT patient_id FROM patients WHERE user_id = ?';
      const patients = await executeQuery(patientQuery, [userId]);

      if (patients.length === 0 || patients[0].patient_id !== parseInt(patientId)) {
        throw new AppError('Unauthorized to view this profile', 403, 'FORBIDDEN');
      }
    }

    const query = `
      SELECT p.*, u.email, u.first_name, u.last_name, u.phone_number
      FROM patients p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.patient_id = ?
    `;

    const patients = await executeQuery(query, [patientId]);

    if (patients.length === 0) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    await auditLog(req, 'VIEW_PATIENT_PROFILE', 'PATIENT', patientId, null, null);

    res.json(formatSuccessResponse(patients[0], 'Patient profile retrieved'));
  } catch (error) {
    next(error);
  }
};

// Update Patient Profile
export const updatePatientProfile = async (req, res, next) => {
  try {
    let { patientId } = req.params;
    const userId = req.user.user_id;

    // If no patientId provided, get the current user's patient ID
    if (!patientId) {
      const patientQuery = 'SELECT patient_id FROM patients WHERE user_id = ?';
      const patients = await executeQuery(patientQuery, [userId]);

      if (patients.length === 0) {
        throw new AppError('Patient record not found', 404, 'PATIENT_NOT_FOUND');
      }

      patientId = patients[0].patient_id;
    }

    // Authorization check
    if (req.user.role === 'PATIENT') {
      const patientQuery = 'SELECT patient_id FROM patients WHERE user_id = ?';
      const patients = await executeQuery(patientQuery, [userId]);

      if (patients.length === 0 || patients[0].patient_id !== parseInt(patientId)) {
        throw new AppError('Unauthorized to update this profile', 403, 'FORBIDDEN');
      }
    }

    const {
      date_of_birth,
      gender,
      nationality,
      valid_id,
      address,
      city,
      state,
      postal_code,
      country,
      blood_group,
      emergency_contact_name,
      emergency_contact_phone,
      medical_history_summary,
      allergies,
      current_medications,
      insurance_provider,
      insurance_policy_number,
    } = req.body;

    const updateQuery = `
      UPDATE patients SET
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        nationality = COALESCE(?, nationality),
        valid_id = COALESCE(?, valid_id),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        postal_code = COALESCE(?, postal_code),
        country = COALESCE(?, country),
        blood_group = COALESCE(?, blood_group),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        medical_history_summary = COALESCE(?, medical_history_summary),
        allergies = COALESCE(?, allergies),
        current_medications = COALESCE(?, current_medications),
        insurance_provider = COALESCE(?, insurance_provider),
        insurance_policy_number = COALESCE(?, insurance_policy_number),
        updated_at = NOW()
      WHERE patient_id = ?
    `;

    await executeQuery(updateQuery, [
      date_of_birth || null,
      gender || null,
      nationality || null,
      valid_id || null,
      address || null,
      city || null,
      state || null,
      postal_code || null,
      country || null,
      blood_group || null,
      emergency_contact_name || null,
      emergency_contact_phone || null,
      medical_history_summary || null,
      allergies || null,
      current_medications || null,
      insurance_provider || null,
      insurance_policy_number || null,
      patientId,
    ]);

    await auditLog(req, 'UPDATE_PATIENT_PROFILE', 'PATIENT', patientId, null, req.body);

    res.json(formatSuccessResponse(null, 'Patient profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

// Get Patient Medical Records
export const getPatientMedicalRecords = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.user_id;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Authorization check
    if (req.user.role === 'PATIENT') {
      const patientQuery = 'SELECT patient_id FROM patients WHERE user_id = ?';
      const patients = await executeQuery(patientQuery, [userId]);

      if (patients.length === 0 || patients[0].patient_id !== parseInt(patientId)) {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }
    }

    const query = `
      SELECT mr.*, u.first_name, u.last_name
      FROM medical_records mr
      JOIN doctors d ON mr.doctor_id = d.doctor_id
      JOIN users u ON d.user_id = u.user_id
      WHERE mr.patient_id = ?
      ORDER BY mr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM medical_records WHERE patient_id = ?';
    
    const [records] = await Promise.all([
      executeQuery(query, [patientId, limit, offset]),
      executeQuery(countQuery, [patientId]),
    ]);

    // Decrypt sensitive medical records
    const decryptedRecords = records.map(record => {
      if (record.is_encrypted && record.diagnosis) {
        try {
          const decrypted = decryptData({
            iv: record.iv,
            encryptedData: record.diagnosis,
            authTag: record.authTag,
          });
          return { ...record, diagnosis: decrypted };
        } catch (error) {
          console.error('Decryption error:', error);
          return record;
        }
      }
      return record;
    });

    await auditLog(req, 'VIEW_MEDICAL_RECORDS', 'MEDICAL_RECORD', patientId, null, null);

    res.json(
      formatSuccessResponse({
        data: decryptedRecords,
        pagination: {
          page,
          limit,
          total: records.length > 0 ? countQuery.total : 0,
        },
      }, 'Medical records retrieved')
    );
  } catch (error) {
    next(error);
  }
};

// Get Patient Prescriptions
export const getPatientPrescriptions = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.user_id;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Authorization check
    if (req.user.role === 'PATIENT') {
      const patientQuery = 'SELECT patient_id FROM patients WHERE user_id = ?';
      const patients = await executeQuery(patientQuery, [userId]);

      if (patients.length === 0 || patients[0].patient_id !== parseInt(patientId)) {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }
    }

    const query = `
      SELECT p.*, u.first_name, u.last_name
      FROM prescriptions p
      JOIN doctors d ON p.doctor_id = d.doctor_id
      JOIN users u ON d.user_id = u.user_id
      WHERE p.patient_id = ? AND p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM prescriptions WHERE patient_id = ? AND is_active = true';

    const [prescriptions] = await Promise.all([
      executeQuery(query, [patientId, limit, offset]),
      executeQuery(countQuery, [patientId]),
    ]);

    await auditLog(req, 'VIEW_PRESCRIPTIONS', 'PRESCRIPTION', patientId, null, null);

    res.json(
      formatSuccessResponse({
        data: prescriptions,
        pagination: { page, limit },
      }, 'Prescriptions retrieved')
    );
  } catch (error) {
    next(error);
  }
};

// Book Appointment
export const bookAppointment = async (req, res, next) => {
  try {
    const { doctor_id, appointment_date, reason_for_visit, notes } = req.body;
    const userId = req.user.user_id;

    // Get patient ID
    const patientQuery = 'SELECT patient_id FROM patients WHERE user_id = ?';
    const patients = await executeQuery(patientQuery, [userId]);

    if (patients.length === 0) {
      throw new AppError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');
    }

    const patientId = patients[0].patient_id;

    // Check if doctor exists
    const doctorQuery = 'SELECT doctor_id FROM doctors WHERE doctor_id = ? AND is_available = true';
    const doctors = await executeQuery(doctorQuery, [doctor_id]);

    if (doctors.length === 0) {
      throw new AppError('Doctor not found or unavailable', 404, 'DOCTOR_NOT_FOUND');
    }

    // Check for appointment conflicts
    const conflictQuery = `
      SELECT appointment_id FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND status != 'CANCELLED'
    `;

    const conflicts = await executeQuery(conflictQuery, [doctor_id, appointment_date]);

    if (conflicts.length > 0) {
      throw new AppError('Time slot not available', 409, 'TIME_SLOT_UNAVAILABLE');
    }

    // Create appointment
    const insertQuery = `
      INSERT INTO appointments (
        patient_id, doctor_id, appointment_date, reason_for_visit, notes
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertQuery, [
      patientId,
      doctor_id,
      appointment_date,
      reason_for_visit,
      notes,
    ]);

    await auditLog(req, 'BOOK_APPOINTMENT', 'APPOINTMENT', result.insertId, null, {
      patient_id: patientId,
      doctor_id,
      appointment_date,
    });

    res.status(201).json(
      formatSuccessResponse({
        appointment_id: result.insertId,
      }, 'Appointment booked successfully', 201)
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getPatientProfile,
  updatePatientProfile,
  getPatientMedicalRecords,
  getPatientPrescriptions,
  bookAppointment,
};
