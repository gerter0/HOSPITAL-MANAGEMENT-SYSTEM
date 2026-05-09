import Joi from 'joi';

// User Registration Validator
export const registerValidator = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required(),
  phone_number: Joi.string().pattern(/^09\d{9}$/).required().messages({
    'string.pattern.base': 'Phone number must be 09 followed by 9 digits',
    'any.required': 'Phone number is required',
  }),
  role: Joi.string().valid('PATIENT', 'DOCTOR').required(),
});

// Comprehensive Patient Registration Validator
export const patientRegistrationValidator = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters',
    'any.required': 'Username is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@_-]+$/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
      'any.required': 'Password is required',
    }),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm your password',
  }),
  registrationToken: Joi.string().required().messages({
    'any.required': 'Email verification is required before registration',
  }),
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  phone_number: Joi.string().pattern(/^09\d{9}$/).required().messages({
    'string.pattern.base': 'Phone number must be 09 followed by 9 digits',
    'any.required': 'Phone number is required',
  }),
  date_of_birth: Joi.date().iso().max('now').required().messages({
    'date.base': 'Invalid date format',
    'date.max': 'Date of birth must be in the past',
    'any.required': 'Date of birth is required',
  }),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').required().messages({
    'any.only': 'Please select a valid gender',
    'any.required': 'Gender is required',
  }),
  nationality: Joi.string().min(2).max(50).required().messages({
    'any.required': 'Nationality is required',
  }),
  valid_id: Joi.string().min(5).max(50).allow('').optional().messages({
    'string.min': 'Valid ID must be at least 5 characters if provided',
  }),
  address: Joi.string().min(5).max(255).required().messages({
    'string.min': 'Address must be at least 5 characters',
    'any.required': 'Address is required',
  }),
  city: Joi.string().min(2).max(50).required(),
  state: Joi.string().min(2).max(50).required(),
  postal_code: Joi.string().pattern(/^[0-9]{5}$/).required().messages({
    'string.pattern.base': 'Postal code must be exactly 5 digits',
  }),
  country: Joi.string().min(2).max(50).required(),
  emergency_contact_name: Joi.string().min(2).max(100).allow('').optional(),
  emergency_contact_phone: Joi.string()
    .pattern(/^09\d{9}$/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Emergency contact phone must be 09 followed by 9 digits (11 digits total)',
    }),
  medical_history: Joi.string().allow('').max(1000).optional(),
}).unknown(false);

// User Login Validator
export const loginValidator = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  twoFactorToken: Joi.string().optional(),
});

// Password Reset Validator
export const passwordResetValidator = Joi.object({
  email: Joi.string().email().required(),
});

// New Password Validator
export const newPasswordValidator = Joi.object({
  resetToken: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

// Patient Profile Validator
export const patientProfileValidator = {
  updateProfile: Joi.object({
    date_of_birth: Joi.date().optional(),
    gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional(),
    nationality: Joi.string().max(100).allow(''),
    valid_id: Joi.string().max(50).allow(''),
    address: Joi.string().max(500).allow(''),
    city: Joi.string().max(100).allow(''),
    state: Joi.string().max(100).allow(''),
    postal_code: Joi.string().max(20).allow(''),
    country: Joi.string().max(100).allow(''),
    blood_group: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
    emergency_contact_name: Joi.string().allow('').min(2).max(100),
    emergency_contact_phone: Joi.string().allow('').pattern(/^(09\d{8,12})?$/),
    medical_history_summary: Joi.string().max(1000).allow(''),
    allergies: Joi.string().max(500).allow(''),
    current_medications: Joi.string().max(500).allow(''),
    insurance_provider: Joi.string().max(100).allow(''),
    insurance_policy_number: Joi.string().max(50).allow(''),
  })
};

// Doctor Profile Validator
export const doctorProfileValidator = Joi.object({
  specialization: Joi.string().required().max(100),
  license_number: Joi.string().required().max(50),
  qualifications: Joi.string().max(500),
  years_of_experience: Joi.number().min(0).max(80),
  consultation_fee: Joi.number().min(0),
  office_location: Joi.string().max(255),
});

// Appointment Validator
export const appointmentValidator = Joi.object({
  doctor_id: Joi.number().required(),
  appointment_date: Joi.date().iso().required(),
  reason_for_visit: Joi.string().max(255).required(),
  notes: Joi.string().max(1000),
});

// Medical Record Validator
export const medicalRecordValidator = Joi.object({
  diagnosis: Joi.string().required().max(1000),
  symptoms: Joi.string().max(1000),
  examination_findings: Joi.string().max(1000),
  treatment_plan: Joi.string().max(1000),
  test_recommendations: Joi.string().max(1000),
  record_type: Joi.string().valid('GENERAL', 'SURGERY', 'DIAGNOSIS', 'TEST_RESULT', 'DISCHARGE'),
});

// Security Questions Setup Validator
export const securityQuestionsSetupValidator = Joi.object({
  questions: Joi.array()
    .min(3)
    .max(6)
    .items(
      Joi.object({
        question_id: Joi.number().integer().min(1).max(6).required(),
        answer: Joi.string().min(2).max(255).required().trim(),
      })
    )
    .required()
    .messages({
      'array.min': 'At least 3 security questions are required',
      'array.max': 'Maximum 6 security questions allowed',
      'any.required': 'Security questions are required',
    }),
});

// Security Questions Verification Validator
export const securityQuestionsVerifyValidator = Joi.object({
  answers: Joi.array()
    .min(1)
    .items(
      Joi.object({
        question_id: Joi.number().integer().min(1).max(6).required(),
        answer: Joi.string().min(1).max(255).required().trim(),
      })
    )
    .required()
    .messages({
      'any.required': 'Security answers are required',
    }),
});

// Account Recovery Validators
export const accountRecoveryInitiateValidator = Joi.object({
  email: Joi.string().email().required(),
});

export const accountRecoveryVerifyEmailValidator = Joi.object({
  email: Joi.string().email().required(),
  pin: Joi.string().length(6).pattern(/^[0-9]{6}$/).required(),
});

export const accountRecoveryQuestionsValidator = Joi.object({
  token_id: Joi.number().integer().required(),
});

export const accountRecoveryCompleteValidator = Joi.object({
  token_id: Joi.number().integer().required(),
  answers: Joi.array()
    .min(3)
    .items(
      Joi.object({
        question_id: Joi.number().integer().required(),
        answer: Joi.string().min(2).max(255).required().trim(),
      })
    )
    .required(),
});

export const prescriptionValidator = {
  create: Joi.object({
    patient_id: Joi.number().integer().required(),
    medication_name: Joi.string().required(),
    dosage: Joi.string().required(),
    frequency: Joi.string().required(),
    duration: Joi.string().required(),
    instructions: Joi.string().optional(),
  }),
};

export default {
  registerValidator,
  patientRegistrationValidator,
  loginValidator,
  passwordResetValidator,
  newPasswordValidator,
  patientProfileValidator,
  doctorProfileValidator,
  appointmentValidator,
  medicalRecordValidator,
  prescriptionValidator,
};
