// Admin input validation utilities
import { validatePasswordStrength } from '../utils/passwordValidator.js';

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
};

const validateName = (name) => {
  // Allow letters, spaces, hyphens, apostrophes. Max 100 chars
  const nameRegex = /^[a-zA-Z\s\-']{1,100}$/;
  return nameRegex.test(name);
};

const validatePhone = (phone) => {
  // Allow various phone formats: +1234567890, (123) 456-7890, 123-456-7890, 1234567890
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateCreateUserInput = (input) => {
  const errors = [];

  if (!input.email || !validateEmail(input.email)) {
    errors.push('Valid email address is required');
  }

  if (!input.username || !validateUsername(input.username)) {
    errors.push('Username must be 3-50 characters, alphanumeric and underscore only');
  }

  if (!input.password) {
    errors.push('Password is required');
  } else {
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (!input.role || !['PATIENT', 'DOCTOR', 'ADMIN'].includes(input.role)) {
    errors.push('Valid role is required (PATIENT, DOCTOR, or ADMIN)');
  }

  if (input.first_name && !validateName(input.first_name)) {
    errors.push('First name contains invalid characters');
  }

  if (input.last_name && !validateName(input.last_name)) {
    errors.push('Last name contains invalid characters');
  }

  if (input.phone_number && !validatePhone(input.phone_number)) {
    errors.push('Invalid phone number format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateUpdateUserInput = (input) => {
  const errors = [];

  if (input.email !== undefined && !validateEmail(input.email)) {
    errors.push('Valid email address is required');
  }

  if (input.username !== undefined && !validateUsername(input.username)) {
    errors.push('Username must be 3-50 characters, alphanumeric and underscore only');
  }

  if (input.password !== undefined) {
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (input.role !== undefined && !['PATIENT', 'DOCTOR', 'ADMIN'].includes(input.role)) {
    errors.push('Invalid role (PATIENT, DOCTOR, or ADMIN)');
  }

  if (input.first_name !== undefined && input.first_name && !validateName(input.first_name)) {
    errors.push('First name contains invalid characters');
  }

  if (input.last_name !== undefined && input.last_name && !validateName(input.last_name)) {
    errors.push('Last name contains invalid characters');
  }

  if (input.phone_number !== undefined && input.phone_number && !validatePhone(input.phone_number)) {
    errors.push('Invalid phone number format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validatePasswordResetInput = (password) => {
  return validatePasswordStrength(password);
};

export default {
  validateCreateUserInput,
  validateUpdateUserInput,
  validatePasswordResetInput,
  validateEmail,
  validateUsername,
  validateName,
  validatePhone,
};
