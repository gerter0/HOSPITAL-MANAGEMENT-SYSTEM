import { AppError, formatSuccessResponse, getPaginationParams } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import { encryptData, decryptData } from '../utils/security.js';
import { auditLog } from '../utils/auditLogger.js';

// Get Doctor Profile
export const getDoctorProfile = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    const query = `
      SELECT d.*, u.email, u.first_name, u.last_name, u.phone_number
      FROM doctors d
      JOIN users u ON d.user_id = u.user_id
      WHERE d.doctor_id = ?
    `;

    const doctors = await executeQuery(query, [doctorId]);

    if (doctors.length === 0) {
      throw new AppError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
    }

    res.json(formatSuccessResponse(doctors[0], 'Doctor profile retrieved'));
  } catch (error) {
    next(error);
  }
};

// Update Doctor Profile
export const updateDoctorProfile = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const userId = req.user.user_id;

    // Authorization check
    if (req.user.role === 'DOCTOR') {
      const doctorQuery = 'SELECT doctor_id FROM doctors WHERE user_id = ?';
      const doctors = await executeQuery(doctorQuery, [userId]);

      if (doctors.length === 0 || doctors[0].doctor_id !== parseInt(doctorId)) {
        throw new AppError('Unauthorized to update this profile', 403, 'FORBIDDEN');
      }
    }

    const {
      specialization,
      qualifications,
      years_of_experience,
      consultation_fee,
      office_location,
      bio,
      is_available,
    } = req.body;

    const updateQuery = `
      UPDATE doctors SET
        specialization = COALESCE(?, specialization),
        qualifications = COALESCE(?, qualifications),
        years_of_experience = COALESCE(?, years_of_experience),
        consultation_fee = COALESCE(?, consultation_fee),
        office_location = COALESCE(?, office_location),
        bio = COALESCE(?, bio),
        is_available = COALESCE(?, is_available),
        updated_at = NOW()
      WHERE doctor_id = ?
    `;

    await executeQuery(updateQuery, [
      specialization || null,
      qualifications || null,
      years_of_experience || null,
      consultation_fee || null,
      office_location || null,
      bio || null,
      is_available !== undefined ? is_available : null,
      doctorId,
    ]);

    await auditLog(req, 'UPDATE_DOCTOR_PROFILE', 'DOCTOR', doctorId, null, req.body);

    res.json(formatSuccessResponse(null, 'Doctor profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

// Get Doctor's Patients
export const getDoctorPatients = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const userId = req.user.user_id;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Authorization check
    if (req.user.role === 'DOCTOR') {
      const doctorQuery = 'SELECT doctor_id FROM doctors WHERE user_id = ?';
      const doctors = await executeQuery(doctorQuery, [userId]);

      if (doctors.length === 0 || doctors[0].doctor_id !== parseInt(doctorId)) {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }
    }

    const query = `
      SELECT DISTINCT p.patient_id, p.date_of_birth, p.blood_group,
        u.first_name, u.last_name, u.email, u.phone_number
      FROM patients p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.patient_id IN (
        SELECT DISTINCT patient_id FROM medical_records WHERE doctor_id = ?
      )
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT patient_id) as total FROM medical_records WHERE doctor_id = ?
    `;

    const [patients, counts] = await Promise.all([
      executeQuery(query, [doctorId, limit, offset]),
      executeQuery(countQuery, [doctorId]),
    ]);

    await auditLog(req, 'VIEW_DOCTOR_PATIENTS', 'DOCTOR', doctorId, null, null);

    res.json(
      formatSuccessResponse({
        data: patients,
        pagination: {
          page,
          limit,
          total: counts[0]?.total || 0,
        },
      }, 'Patients retrieved')
    );
  } catch (error) {
    next(error);
  }
};

// Add Medical Record
export const addMedicalRecord = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.user_id;
    const {
      diagnosis,
      symptoms,
      examination_findings,
      treatment_plan,
      test_recommendations,
      appointment_id,
      record_type,
    } = req.body;

    // Get doctor ID
    const doctorQuery = 'SELECT doctor_id FROM doctors WHERE user_id = ?';
    const doctors = await executeQuery(doctorQuery, [userId]);

    if (doctors.length === 0) {
      throw new AppError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');
    }

    const doctorId = doctors[0].doctor_id;

    // Encrypt sensitive medical data
    const encryptedDiagnosis = encryptData(diagnosis);

    const insertQuery = `
      INSERT INTO medical_records (
        patient_id, doctor_id, appointment_id, diagnosis,
        symptoms, examination_findings, treatment_plan,
        test_recommendations, record_type, is_encrypted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)
    `;

    const result = await executeQuery(insertQuery, [
      patientId,
      doctorId,
      appointment_id || null,
      JSON.stringify(encryptedDiagnosis),
      symptoms,
      examination_findings,
      treatment_plan,
      test_recommendations,
      record_type || 'GENERAL',
    ]);

    await auditLog(req, 'CREATE_MEDICAL_RECORD', 'MEDICAL_RECORD', result.insertId, null, {
      patient_id: patientId,
      doctor_id: doctorId,
      record_type,
    });

    res.status(201).json(
      formatSuccessResponse({
        record_id: result.insertId,
      }, 'Medical record created successfully', 201)
    );
  } catch (error) {
    next(error);
  }
};

// Add Prescription
export const addPrescription = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.user_id;
    const {
      medication_name,
      dosage,
      frequency,
      duration_days,
      instructions,
      start_date,
      end_date,
      medical_record_id,
    } = req.body;

    // Get doctor ID
    const doctorQuery = 'SELECT doctor_id FROM doctors WHERE user_id = ?';
    const doctors = await executeQuery(doctorQuery, [userId]);

    if (doctors.length === 0) {
      throw new AppError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');
    }

    const doctorId = doctors[0].doctor_id;

    const insertQuery = `
      INSERT INTO prescriptions (
        patient_id, doctor_id, medical_record_id, medication_name,
        dosage, frequency, duration_days, instructions,
        start_date, end_date, is_active, is_encrypted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, true)
    `;

    const result = await executeQuery(insertQuery, [
      patientId,
      doctorId,
      medical_record_id || null,
      medication_name,
      dosage,
      frequency,
      duration_days,
      instructions,
      start_date,
      end_date,
    ]);

    await auditLog(req, 'CREATE_PRESCRIPTION', 'PRESCRIPTION', result.insertId, null, {
      patient_id: patientId,
      doctor_id: doctorId,
      medication_name,
    });

    res.status(201).json(
      formatSuccessResponse({
        prescription_id: result.insertId,
      }, 'Prescription created successfully', 201)
    );
  } catch (error) {
    next(error);
  }
};

// Get Doctor's Appointments
export const getDoctorAppointments = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const userId = req.user.user_id;
    const { page, limit, offset } = getPaginationParams(req.query);
    const { status } = req.query;

    // Authorization check
    if (req.user.role === 'DOCTOR') {
      const doctorQuery = 'SELECT doctor_id FROM doctors WHERE user_id = ?';
      const doctors = await executeQuery(doctorQuery, [userId]);

      if (doctors.length === 0 || doctors[0].doctor_id !== parseInt(doctorId)) {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }
    }

    let query = `
      SELECT a.*, p.patient_id, u.first_name, u.last_name, u.email
      FROM appointments a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN users u ON p.user_id = u.user_id
      WHERE a.doctor_id = ?
    `;

    const params = [doctorId];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.appointment_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const countQuery = status
      ? `SELECT COUNT(*) as total FROM appointments WHERE doctor_id = ? AND status = ?`
      : 'SELECT COUNT(*) as total FROM appointments WHERE doctor_id = ?';

    const countParams = status ? [doctorId, status] : [doctorId];

    const [appointments, counts] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQuery, countParams),
    ]);

    await auditLog(req, 'VIEW_APPOINTMENTS', 'APPOINTMENT', doctorId, null, null);

    res.json(
      formatSuccessResponse({
        data: appointments,
        pagination: {
          page,
          limit,
          total: counts[0]?.total || 0,
        },
      }, 'Appointments retrieved')
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorPatients,
  addMedicalRecord,
  addPrescription,
  getDoctorAppointments,
};
