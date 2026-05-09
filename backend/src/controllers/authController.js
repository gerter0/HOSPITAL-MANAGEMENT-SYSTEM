import crypto from 'crypto';
import { hashPassword, comparePassword, generateJWT, generateToken, verify2FAToken } from '../utils/security.js';
import { AppError, validateEmail, validatePasswordStrength, formatSuccessResponse } from '../utils/helpers.js';
import { executeQuery } from '../config/database.js';
import config from '../config/config.js';
import { auditLog, auditLogFailure } from '../utils/auditLogger.js';
import { sendVerificationPINEmail, sendPasswordResetEmail, sendAccountRecoveryEmail } from '../utils/emailService.js';

const parseDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed;
  const normalized = String(value).replace(' ', 'T');
  return new Date(normalized);
};

// In-memory storage for PIN verification (in production, use Redis)
const pendingVerifications = new Map();

const generateRecoveryPin = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate and send PIN
export const sendVerificationPIN = async (req, res, next) => {
  try {
    const { email, username, testMode } = req.body;

    // Validate email
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Validate username
    const trimmedUsername = username?.trim() || '';
    if (!trimmedUsername || trimmedUsername.length < 3) {
      throw new AppError('Username must be at least 3 characters', 400, 'INVALID_USERNAME');
    }

    // Check if email already registered
    const existingUserQuery = 'SELECT user_id FROM users WHERE email = ?';
    const existingUsers = await executeQuery(existingUserQuery, [email]);
    if (existingUsers.length > 0) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Check if username already taken
    const existingUsernameQuery = 'SELECT user_id FROM users WHERE username = ?';
    const existingUsernames = await executeQuery(existingUsernameQuery, [trimmedUsername]);
    if (existingUsernames.length > 0) {
      throw new AppError('Username already taken', 400, 'USERNAME_EXISTS');
    }

    // Generate 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store PIN temporarily
    pendingVerifications.set(email, {
      pin,
      expiryTime,
      attempts: 0,
      username: trimmedUsername,
    });

    // Send PIN via email
    try {
      await sendVerificationPINEmail(email, pin);
      console.log(`✅ PIN sent to ${email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send email:', emailError.message);
      console.error('⚠️ Stack:', emailError.stack);
      // In development, show the PIN on frontend - don't fail the registration
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📌 Development Mode: PIN is ${pin} - it will be displayed on the frontend for testing`);
      }
    }

    const response = {
      email,
      username: trimmedUsername,
      message: 'PIN sent to your email. Valid for 10 minutes. Check your spam folder if not received.',
    };

    // Include PIN only in development/test mode
    if (process.env.NODE_ENV === 'development' || testMode === true) {
      response.pin = pin; // For testing only
      response.devNote = '⚠️ PIN displayed for development only. Remove in production.';
    }

    res.status(200).json(
      formatSuccessResponse(
        response,
        'PIN sent successfully',
        200
      )
    );
  } catch (error) {
    next(error);
  }
};

// Verify PIN and get registration token
export const verifyPIN = async (req, res, next) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      throw new AppError('Email and PIN are required', 400, 'MISSING_FIELDS');
    }

    const verification = pendingVerifications.get(email);
    
    if (!verification) {
      throw new AppError('No PIN found for this email. Request a new PIN.', 400, 'PIN_NOT_FOUND');
    }

    // Check if PIN is expired
    if (Date.now() > verification.expiryTime) {
      pendingVerifications.delete(email);
      throw new AppError('PIN has expired. Request a new one.', 400, 'PIN_EXPIRED');
    }

    // Check max attempts
    if (verification.attempts >= 3) {
      pendingVerifications.delete(email);
      throw new AppError('Too many failed attempts. Request a new PIN.', 400, 'MAX_ATTEMPTS');
    }

    // Verify PIN
    if (verification.pin !== pin) {
      verification.attempts += 1;
      throw new AppError('Invalid PIN. Please try again.', 400, 'INVALID_PIN');
    }

    // Generate registration token (valid for 30 minutes)
    const registrationToken = generateToken();
    verification.registrationToken = registrationToken;
    verification.registrationTokenExpiry = Date.now() + 30 * 60 * 1000;

    res.status(200).json(
      formatSuccessResponse(
        {
          email,
          username: verification.username,
          registrationToken,
          message: 'Email verified successfully. You can now complete registration.',
        },
        'PIN verified successfully',
        200
      )
    );
  } catch (error) {
    next(error);
  }
};

// Register User
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone_number, role } = req.body;

    // Validate email
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message, 400, 'WEAK_PASSWORD');
    }

    // Check if user already exists
    const existingUserQuery = 'SELECT user_id FROM users WHERE email = ?';
    const existingUsers = await executeQuery(existingUserQuery, [email]);

    if (existingUsers.length > 0) {
      throw new AppError('Email already registered', 400, 'USER_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert user
    const insertUserQuery = `
      INSERT INTO users (
        email, password_hash, first_name, last_name,
        phone_number, role, verification_token, verification_token_expiry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertUserQuery, [
      email,
      passwordHash,
      first_name,
      last_name,
      phone_number,
      role,
      verificationToken,
      verificationTokenExpiry,
    ]);

    // Create role-specific profile (placeholder - doctor/patient profile creation handled separately)
    await auditLog(req, 'USER_REGISTRATION', 'USER', result.insertId, null, {
      email,
      role,
      first_name,
      last_name,
    });

    res.status(201).json(
      formatSuccessResponse(
        {
          user_id: result.insertId,
          email,
          role,
          message: 'Registration successful. Please set up your security questions.',
          redirect_to: '/security-setup',
        },
        'User registered successfully',
        201
      )
    );
  } catch (error) {
    await auditLogFailure(req, 'USER_REGISTRATION', 'USER', error.message);
    next(error);
  }
};

// Enhanced Patient Registration with Full Details
export const registerPatient = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      registrationToken,
      first_name,
      last_name,
      phone_number,
      date_of_birth,
      gender,
      nationality,
      valid_id,
      address,
      city,
      state,
      postal_code,
      country,
    } = req.body;

    // Trim username to remove whitespace
    const trimmedUsername = username?.trim() || '';

    // Verify registration token (from email PIN verification)
    if (!registrationToken) {
      throw new AppError('Email verification required. Verify your email first.', 400, 'NO_REGISTRATION_TOKEN');
    }

    const verification = pendingVerifications.get(email);
    if (!verification || verification.registrationToken !== registrationToken) {
      throw new AppError('Invalid or expired verification token. Verify your email again.', 400, 'INVALID_REGISTRATION_TOKEN');
    }

    if (Date.now() > verification.registrationTokenExpiry) {
      pendingVerifications.delete(email);
      throw new AppError('Verification token has expired. Verify your email again.', 400, 'TOKEN_EXPIRED');
    }

    // Validate email
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Validate phone number - must be 09 followed by 9 digits (11 total)
    const phoneRegex = /^09\d{9}$/;
    if (!phone_number || !phoneRegex.test(phone_number)) {
      throw new AppError('Phone number must be 09 followed by 9 digits', 400, 'INVALID_PHONE');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message, 400, 'WEAK_PASSWORD');
    }

    // Check if user already exists
    const existingUserQuery = 'SELECT user_id FROM users WHERE email = ? OR username = ?';
    const existingUsers = await executeQuery(existingUserQuery, [email, trimmedUsername]);

    if (existingUsers.length > 0) {
      throw new AppError('Email or username already registered', 400, 'USER_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert user
    const insertUserQuery = `
      INSERT INTO users (
        email, username, password_hash, first_name, last_name,
        phone_number, role, verification_token, verification_token_expiry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const userResult = await executeQuery(insertUserQuery, [
      email,
      trimmedUsername,
      passwordHash,
      first_name,
      last_name,
      phone_number,
      'PATIENT',
      verificationToken,
      verificationTokenExpiry,
    ]);

    const userId = userResult.insertId;

    // Insert patient profile
    // Note: profile_image is dropped/cleared when valid_id is present
    const insertPatientQuery = `
      INSERT INTO patients (
        user_id, date_of_birth, gender, nationality, valid_id,
        address, city, state, postal_code, country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await executeQuery(insertPatientQuery, [
        userId,
        date_of_birth,
        gender,
        nationality,
        valid_id,
        address,
        city,
        state,
        postal_code,
        country,
      ]);
    } catch (patientError) {
      console.error('Patient insert error:', patientError.message);
      console.error('Patient data:', { userId, date_of_birth, gender, nationality, valid_id, address, city, state, postal_code, country });
      throw patientError;
    }

    // Send registration confirmation email
    try {
      await sendRegistrationConfirmationEmail(email, first_name);
      console.log(`✅ Confirmation email sent to ${email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email:', emailError.message);
      // Don't fail registration if email fails - it's secondary
    }

    // Clear PIN verification data
    pendingVerifications.delete(email);

    // Audit log
    await auditLog(req, 'PATIENT_REGISTRATION', 'USER', userId, null, {
      email,
      username: trimmedUsername,
      first_name,
      last_name,
    });

    res.status(201).json(
      formatSuccessResponse(
        {
          user_id: userId,
          email,
          username,
          message: 'Registration successful! Please check your email to verify your account.',
        },
        'Patient registered successfully',
        201
      )
    );
  } catch (error) {
    await auditLogFailure(req, 'PATIENT_REGISTRATION', 'USER', error.message);
    next(error);
  }
};

// Login User
export const loginUser = async (req, res, next) => {
  try {
    const { email, password, twoFactorToken } = req.body;

    // Get user
    const userQuery = `
      SELECT u.*, 
        CASE 
          WHEN u.role = 'PATIENT' THEN p.patient_id
          WHEN u.role = 'DOCTOR' THEN d.doctor_id
          WHEN u.role = 'ADMIN' THEN a.admin_id
        END as role_id
      FROM users u
      LEFT JOIN patients p ON u.user_id = p.user_id AND u.role = 'PATIENT'
      LEFT JOIN doctors d ON u.user_id = d.user_id AND u.role = 'DOCTOR'
      LEFT JOIN admins a ON u.user_id = a.user_id AND u.role = 'ADMIN'
      WHERE u.email = ? AND u.is_active = true
    `;

    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      await auditLogFailure(req, 'LOGIN_ATTEMPT', 'USER', 'User not found or inactive');
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const user = users[0];
    const lockedUntil = parseDateTime(user.locked_until);

    // Check if account is locked
    if (lockedUntil && lockedUntil > new Date()) {
      console.log(`🔐 Login blocked: Account locked until ${lockedUntil.toISOString()}`);
      await auditLogFailure(req, 'LOGIN_ATTEMPT', 'USER', 'Account locked due to multiple failed attempts');
      throw new AppError('Account locked due to multiple failed login attempts. Please use account recovery.', 423, 'ACCOUNT_LOCKED');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newAttempts = user.failed_login_attempts + 1;
      let updateQuery = 'UPDATE users SET failed_login_attempts = ? WHERE user_id = ?';
      let updateParams = [newAttempts, user.user_id];

      // Lock account after 3 failed attempts
      if (newAttempts >= 3) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        // Format date properly for MySQL: YYYY-MM-DD HH:MM:SS
        const lockUntilFormatted = lockUntil.toISOString().slice(0, 19).replace('T', ' ');
        updateQuery = 'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE user_id = ?';
        updateParams = [newAttempts, lockUntilFormatted, user.user_id];
        console.log(`🔒 Account locked for ${user.email}. Unlock time: ${lockUntilFormatted}`);
      }

      await executeQuery(updateQuery, updateParams);

      await auditLogFailure(req, 'LOGIN_ATTEMPT', 'USER', `Invalid password (attempt ${newAttempts}/3)`);
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Reset failed login attempts on successful login
    if (user.failed_login_attempts > 0) {
      await executeQuery('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?', [user.user_id]);
    }

    // Create session token
    const sessionToken = generateToken();
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const sessionQuery = `
      INSERT INTO login_sessions (user_id, token_hash, ip_address, user_agent, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at), created_at = NOW()
    `;

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    await executeQuery(sessionQuery, [
      user.user_id,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    ]);

    // Update last login
    const lastLoginQuery = `
      UPDATE users SET last_login = NOW()
      WHERE user_id = ?
    `;

    await executeQuery(lastLoginQuery, [user.user_id]);

    await auditLog(req, 'LOGIN_SUCCESS', 'USER', user.user_id, null, {
      email: user.email,
      role: user.role,
    });

    // Generate JWT token
    const jwtToken = generateJWT({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
    });

    res.json(
      formatSuccessResponse({
        token: jwtToken,
        user: {
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          role_id: user.role_id,
        },
      }, 'Login successful')
    );
  } catch (error) {
    next(error);
  }
};

// Logout User
export const logoutUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');

    const query = 'UPDATE login_sessions SET is_active = false WHERE token_hash = ?';
    await executeQuery(query, [tokenHash]);

    await auditLog(req, 'LOGOUT', 'USER', req.user.user_id, null, null);

    res.json(formatSuccessResponse(null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

// Refresh Token
export const refreshToken = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const userQuery = 'SELECT * FROM users WHERE user_id = ? AND is_active = true';
    const users = await executeQuery(userQuery, [req.user.user_id]);

    if (users.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = users[0];
    const newToken = generateJWT({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });

    res.json(formatSuccessResponse({ token: newToken }, 'Token refreshed'));
  } catch (error) {
    next(error);
  }
};

// Forgot Password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      throw new AppError('Valid email is required', 400, 'INVALID_EMAIL');
    }

    // Check if user exists
    const userQuery = 'SELECT user_id, email, first_name FROM users WHERE email = ? AND is_active = true';
    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      res.json(formatSuccessResponse(null, 'If the email exists, a password reset link has been sent.'));
      return;
    }

    const user = users[0];

    // Generate reset token
    const resetToken = generateToken(32);
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    const insertTokenQuery = `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at), created_at = NOW()
    `;

    await executeQuery(insertTokenQuery, [user.user_id, tokenHash, expiresAt]);

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    await auditLog(req, 'PASSWORD_RESET_REQUEST', 'USER', user.user_id, null, {
      email: user.email,
    });

    res.json(formatSuccessResponse(null, 'If the email exists, a password reset link has been sent.'));
  } catch (error) {
    next(error);
  }
};

// Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError('Token and password are required', 400, 'MISSING_FIELDS');
    }

    if (!validatePasswordStrength(password)) {
      throw new AppError('Password must contain at least 8 characters with uppercase, lowercase, and number', 400, 'WEAK_PASSWORD');
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const tokenQuery = `
      SELECT prt.user_id, u.email, u.first_name
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.user_id
      WHERE prt.token_hash = ? AND prt.expires_at > NOW() AND prt.used = false
    `;

    const tokens = await executeQuery(tokenQuery, [tokenHash]);

    if (tokens.length === 0) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    const user = tokens[0];

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    const updatePasswordQuery = 'UPDATE users SET password_hash = ? WHERE user_id = ?';
    await executeQuery(updatePasswordQuery, [hashedPassword, user.user_id]);

    // Mark token as used
    const markUsedQuery = 'UPDATE password_reset_tokens SET used = true WHERE token_hash = ?';
    await executeQuery(markUsedQuery, [tokenHash]);

    // Invalidate all existing sessions for security
    const invalidateSessionsQuery = 'UPDATE login_sessions SET is_active = false WHERE user_id = ?';
    await executeQuery(invalidateSessionsQuery, [user.user_id]);

    await auditLog(req, 'PASSWORD_RESET_SUCCESS', 'USER', user.user_id, null, {
      email: user.email,
    });

    res.json(formatSuccessResponse(null, 'Password has been reset successfully. Please login with your new password.'));
  } catch (error) {
    next(error);
  }
};

// Account Recovery - Send Verification Code
export const sendAccountRecoveryVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Check if user exists and is locked
    const userQuery = 'SELECT user_id, first_name, last_name, locked_until FROM users WHERE email = ? AND is_active = true';
    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      res.json(formatSuccessResponse(null, 'If the email exists and the account is locked, a verification code has been sent.'));
      return;
    }

    const user = users[0];

    // Check if account is actually locked
    if (!user.locked_until || user.locked_until <= new Date()) {
      res.json(formatSuccessResponse(null, 'If the email exists and the account is locked, a verification code has been sent.'));
      return;
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store recovery token
    const tokenHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const insertTokenQuery = `
      INSERT INTO account_recovery_tokens (user_id, token_hash, expires_at, used)
      VALUES (?, ?, ?, false)
      ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at), used = false, created_at = NOW()
    `;

    await executeQuery(insertTokenQuery, [user.user_id, tokenHash, expiresAt]);

    // Send verification email
    const subject = 'Account Recovery Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Account Recovery</h2>
        <p>Hello ${user.first_name},</p>
        <p>Your account has been locked due to multiple failed login attempts. To unlock your account, please use the following verification code:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #333; font-size: 32px; margin: 0;">${verificationCode}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this recovery, please ignore this email.</p>
        <p>Best regards,<br>Hospital Management System</p>
      </div>
    `;

    // For now, we'll use a simple email sending approach
    // In production, integrate with email service
    console.log(`Account recovery code for ${email}: ${verificationCode}`);

    await auditLog(req, 'ACCOUNT_RECOVERY_INITIATED', 'USER', user.user_id, null, {
      email: user.email,
    });

    res.json(formatSuccessResponse(null, 'If the email exists and the account is locked, a verification code has been sent.'));
  } catch (error) {
    next(error);
  }
};

// Account Recovery - Verify Code and Get Security Questions
export const verifyAccountRecoveryCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!validateEmail(email) || !code) {
      throw new AppError('Email and verification code are required', 400, 'MISSING_FIELDS');
    }

    // Get user
    const userQuery = 'SELECT user_id FROM users WHERE email = ? AND is_active = true';
    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      throw new AppError('Invalid verification code', 400, 'INVALID_CODE');
    }

    const user = users[0];

    // Verify code
    const tokenHash = crypto.createHash('sha256').update(code).digest('hex');
    const tokenQuery = `
      SELECT art.token_id FROM account_recovery_tokens art
      WHERE art.user_id = ? AND art.token_hash = ? AND art.expires_at > NOW() AND art.used = false
    `;

    const tokens = await executeQuery(tokenQuery, [user.user_id, tokenHash]);

    if (tokens.length === 0) {
      throw new AppError('Invalid or expired verification code', 400, 'INVALID_CODE');
    }

    // Get user's security questions
    const questionsQuery = `
      SELECT sq.question_id, sq.question_text
      FROM user_security_answers usa
      JOIN security_questions sq ON usa.question_id = sq.question_id
      WHERE usa.user_id = ?
      ORDER BY usa.created_at
    `;

    const questions = await executeQuery(questionsQuery, [user.user_id]);

    if (questions.length === 0) {
      throw new AppError('No security questions found for this account', 400, 'NO_SECURITY_QUESTIONS');
    }

    await auditLog(req, 'ACCOUNT_RECOVERY_CODE_VERIFIED', 'USER', user.user_id, null, {
      email: user.email,
    });

    res.json(formatSuccessResponse({
      questions: questions
    }, 'Verification successful. Please answer your security questions.'));
  } catch (error) {
    next(error);
  }
};

// Account Recovery - Verify Security Answers and Unlock Account
export const unlockAccount = async (req, res, next) => {
  try {
    const { email, securityAnswers } = req.body;

    if (!validateEmail(email) || !securityAnswers || !Array.isArray(securityAnswers)) {
      throw new AppError('Email and security answers are required', 400, 'MISSING_FIELDS');
    }

    // Get user
    const userQuery = 'SELECT user_id FROM users WHERE email = ? AND is_active = true';
    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      throw new AppError('Invalid request', 400, 'INVALID_REQUEST');
    }

    const user = users[0];

    // Verify all security answers
    for (const answer of securityAnswers) {
      const { questionId, answer: userAnswer } = answer;

      if (!questionId || !userAnswer) {
        throw new AppError('All security questions must be answered', 400, 'INCOMPLETE_ANSWERS');
      }

      // Get stored answer hash
      const answerQuery = 'SELECT answer_hash FROM user_security_answers WHERE user_id = ? AND question_id = ?';
      const storedAnswers = await executeQuery(answerQuery, [user.user_id, questionId]);

      if (storedAnswers.length === 0) {
        throw new AppError('Invalid security question', 400, 'INVALID_QUESTION');
      }

      // Verify answer
      const isAnswerValid = await comparePassword(userAnswer.trim().toLowerCase(), storedAnswers[0].answer_hash);

      if (!isAnswerValid) {
        throw new AppError('One or more security answers are incorrect', 400, 'INVALID_ANSWERS');
      }
    }

    // Unlock account - reset failed attempts and remove lock
    const unlockQuery = 'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?';
    await executeQuery(unlockQuery, [user.user_id]);

    // Mark recovery token as used (if any recent ones exist)
    const markUsedQuery = 'UPDATE account_recovery_tokens SET used = true WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)';
    await executeQuery(markUsedQuery, [user.user_id]);

    await auditLog(req, 'ACCOUNT_UNLOCKED', 'USER', user.user_id, null, {
      email: user.email,
      method: 'security_questions'
    });

    res.json(formatSuccessResponse(null, 'Account unlocked successfully. You can now login.'));
  } catch (error) {
    next(error);
  }
};

// Get Available Security Questions for Setup
export const getAvailableSecurityQuestionsSetup = async (req, res, next) => {
  try {
    const questionsQuery = 'SELECT question_id, question_text FROM security_questions ORDER BY question_id';
    const questions = await executeQuery(questionsQuery);

    res.json(formatSuccessResponse({
      questions: questions
    }, 'Security questions retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// Complete Patient Registration with Security Questions
export const completePatientRegistration = async (req, res, next) => {
  try {
    const { email, securityAnswers } = req.body;

    if (!validateEmail(email) || !securityAnswers || !Array.isArray(securityAnswers) || securityAnswers.length < 3) {
      throw new AppError('Email and at least 3 security answers are required', 400, 'MISSING_FIELDS');
    }

    // Get user
    const userQuery = 'SELECT user_id FROM users WHERE email = ? AND is_active = true';
    const users = await executeQuery(userQuery, [email]);

    if (users.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = users[0];

    // Check if user already has security answers
    const existingAnswersQuery = 'SELECT COUNT(*) as count FROM user_security_answers WHERE user_id = ?';
    const existingAnswers = await executeQuery(existingAnswersQuery, [user.user_id]);

    if (existingAnswers[0].count > 0) {
      throw new AppError('Security questions already set up for this user', 400, 'QUESTIONS_ALREADY_SET');
    }

    // Validate and store security answers
    const insertPromises = securityAnswers.map(async (answer) => {
      const { questionId, answer: userAnswer } = answer;

      if (!questionId || !userAnswer || userAnswer.trim().length === 0) {
        throw new AppError('All security questions must have valid answers', 400, 'INVALID_ANSWERS');
      }

      // Check if question exists
      const questionQuery = 'SELECT question_id FROM security_questions WHERE question_id = ?';
      const questions = await executeQuery(questionQuery, [questionId]);

      if (questions.length === 0) {
        throw new AppError('Invalid security question', 400, 'INVALID_QUESTION');
      }

      // Hash the answer (case-insensitive)
      const answerHash = await hashPassword(userAnswer.trim().toLowerCase());

      // Insert answer
      const insertQuery = `
        INSERT INTO user_security_answers (user_id, question_id, answer_hash)
        VALUES (?, ?, ?)
      `;

      return executeQuery(insertQuery, [user.user_id, questionId, answerHash]);
    });

    await Promise.all(insertPromises);

    await auditLog(req, 'SECURITY_QUESTIONS_SETUP', 'USER', user.user_id, null, {
      email: user.email,
      questions_count: securityAnswers.length
    });

    res.json(formatSuccessResponse(null, 'Registration completed successfully with security questions.'));
  } catch (error) {
    next(error);
  }
};

// Setup Security Questions
export const setupSecurityQuestions = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { questions } = req.body; // Array of { question_id, answer }

    if (!questions || questions.length < 3) {
      throw new AppError('At least 3 security questions are required', 400, 'INSUFFICIENT_QUESTIONS');
    }

    if (questions.length > 6) {
      throw new AppError('Maximum 6 security questions allowed', 400, 'TOO_MANY_QUESTIONS');
    }

    // Check if user already has security questions
    const existingQuery = 'SELECT COUNT(*) as count FROM user_security_answers WHERE user_id = ?';
    const existing = await executeQuery(existingQuery, [user_id]);

    if (existing[0].count > 0) {
      throw new AppError('Security questions already set up', 400, 'QUESTIONS_ALREADY_SET');
    }

    // Validate questions and hash answers
    const values = [];
    for (const q of questions) {
      if (!q.question_id || !q.answer || q.answer.trim().length < 2) {
        throw new AppError('Invalid question or answer format', 400, 'INVALID_QUESTION_FORMAT');
      }

      const answerHash = await hashPassword(q.answer.trim().toLowerCase());
      values.push([user_id, q.question_id, answerHash]);
    }

    // Insert security answers
    const insertQuery = 'INSERT INTO user_security_answers (user_id, question_id, answer_hash) VALUES (?, ?, ?)';
    for (const value of values) {
      await executeQuery(insertQuery, value);
    }

    await auditLog(req, 'SECURITY_QUESTIONS_SETUP', 'USER', user_id, null, {
      questions_count: questions.length,
    });

    res.json(formatSuccessResponse(null, 'Security questions set up successfully'));
  } catch (error) {
    next(error);
  }
};

// Get Security Questions (for account recovery)
export const getSecurityQuestions = async (req, res, next) => {
  try {
    const { user_id } = req.user;

    const query = `
      SELECT q.question_id, q.question_text
      FROM user_security_answers usa
      JOIN security_questions q ON usa.question_id = q.question_id
      WHERE usa.user_id = ? AND q.is_active = true
      ORDER BY usa.created_at
    `;

    const questions = await executeQuery(query, [user_id]);

    if (questions.length === 0) {
      throw new AppError('No security questions found', 404, 'NO_SECURITY_QUESTIONS');
    }

    res.json(formatSuccessResponse({ questions }, 'Security questions retrieved'));
  } catch (error) {
    next(error);
  }
};

// Verify Security Questions (for account recovery)
export const verifySecurityQuestions = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { answers } = req.body; // Array of { question_id, answer }

    if (!answers || answers.length === 0) {
      throw new AppError('Security answers are required', 400, 'MISSING_ANSWERS');
    }

    // Get user's security questions and answers
    const userAnswersQuery = `
      SELECT usa.question_id, usa.answer_hash
      FROM user_security_answers usa
      WHERE usa.user_id = ?
    `;

    const userAnswers = await executeQuery(userAnswersQuery, [user_id]);

    if (userAnswers.length === 0) {
      throw new AppError('No security questions set up', 404, 'NO_SECURITY_QUESTIONS');
    }

    // Verify answers
    let correctAnswers = 0;
    const totalQuestions = userAnswers.length;

    for (const userAnswer of userAnswers) {
      const providedAnswer = answers.find(a => a.question_id === userAnswer.question_id);
      if (providedAnswer) {
        const isCorrect = await comparePassword(providedAnswer.answer.trim().toLowerCase(), userAnswer.answer_hash);
        if (isCorrect) {
          correctAnswers++;
        }
      }
    }

    // Require at least 80% correct answers
    const requiredCorrect = Math.ceil(totalQuestions * 0.8);
    const verified = correctAnswers >= requiredCorrect;

    await auditLog(req, 'SECURITY_QUESTIONS_VERIFICATION', 'USER', user_id, null, {
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      verified,
    });

    res.json(formatSuccessResponse({
      verified,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      required_correct: requiredCorrect,
    }, verified ? 'Security questions verified' : 'Security questions verification failed'));
  } catch (error) {
    next(error);
  }
};

// Initiate Account Recovery
export const initiateAccountRecovery = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      throw new AppError('Valid email is required', 400, 'INVALID_EMAIL');
    }

    // Check if a locked account exists for this email
    const lockedUserQuery = 'SELECT user_id, email, first_name FROM users WHERE email = ? AND is_active = true AND locked_until > NOW()';
    const lockedUsers = await executeQuery(lockedUserQuery, [email]);

    if (lockedUsers.length === 0) {
      // Always return the same generic response to avoid account enumeration
      res.json(formatSuccessResponse(null, 'If the email exists and account is locked, recovery instructions have been sent.'));
      return;
    }

    const user = lockedUsers[0];

    // Ensure the locked account has security questions configured
    const questionCountQuery = 'SELECT COUNT(*) as count FROM user_security_answers WHERE user_id = ?';
    const questionCountResult = await executeQuery(questionCountQuery, [user.user_id]);

    if (questionCountResult.length === 0 || questionCountResult[0].count === 0) {
      // Account is locked but has no security questions - cannot recover
      res.json(formatSuccessResponse(null, 'Account recovery is not available for this account. Please contact support.'));
      return;
    }

    // Generate recovery token and PIN
    const recoveryToken = generateToken(32);
    const tokenHash = crypto.createHash('sha256').update(recoveryToken).digest('hex');
    const recoveryPin = generateRecoveryPin();
    const pinHash = crypto.createHash('sha256').update(recoveryPin).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const pinExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store recovery token and PIN
    const insertTokenQuery = `
      INSERT INTO account_recovery_tokens (user_id, token_hash, pin_hash, expires_at, pin_expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), pin_hash = VALUES(pin_hash), expires_at = VALUES(expires_at), pin_expires_at = VALUES(pin_expires_at), used = false
    `;

    await executeQuery(insertTokenQuery, [user.user_id, tokenHash, pinHash, expiresAt, pinExpiresAt]);

    // Send recovery email with one-time PIN
    const emailConfigured =
      config.email.user &&
      !config.email.user.includes('your-email') &&
      config.email.password &&
      !config.email.password.includes('your-app-password');

    let emailSent = false;

    try {
      if (emailConfigured) {
        await sendAccountRecoveryEmail(email, recoveryPin);
        emailSent = true;
      } else {
        console.warn('⚠️ Email service appears unconfigured. Recovery PIN will be logged for development only.');
        console.log(`🔓 Account Recovery PIN for ${email}: ${recoveryPin}`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send account recovery email:', emailError.message);
      if (emailConfigured) {
        throw new AppError('Unable to send account recovery email. Please try again later.', 500, 'EMAIL_SEND_FAILURE');
      }
      console.log(`🔓 Fallback recovery PIN for ${email}: ${recoveryPin}`);
    }

    await auditLog(req, 'ACCOUNT_RECOVERY_INITIATED', 'USER', user.user_id, null, {
      email: user.email,
      email_sent: emailSent,
    });

    const responseData = null;
    const responseMessage = emailSent
      ? 'Recovery instructions have been sent to your email.'
      : 'If the email exists and account is locked, recovery instructions have been sent.';

    if (!emailConfigured && config.nodeEnv !== 'production') {
      res.json(
        formatSuccessResponse(
          {
            dev_pin: recoveryPin,
            note: 'Email service is not configured in development. The recovery PIN is shown only for development purposes.',
          },
          responseMessage
        )
      );
      return;
    }

    res.json(formatSuccessResponse(responseData, responseMessage));
  } catch (error) {
    next(error);
  }
};

// Verify Recovery PIN
export const verifyRecoveryEmail = async (req, res, next) => {
  try {
    const { email, pin } = req.body;

    if (!email || !validateEmail(email) || !pin) {
      throw new AppError('Valid email and recovery PIN are required', 400, 'MISSING_PIN');
    }

    // Hash PIN to compare
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    // Find valid recovery token by PIN and email
    const tokenQuery = `
      SELECT art.*, u.email, u.first_name
      FROM account_recovery_tokens art
      JOIN users u ON art.user_id = u.user_id
      WHERE u.email = ? AND art.pin_hash = ? AND art.pin_expires_at > NOW() AND art.used = false
    `;

    const tokens = await executeQuery(tokenQuery, [email, pinHash]);

    if (tokens.length === 0) {
      throw new AppError('Invalid or expired recovery PIN', 400, 'INVALID_PIN');
    }

    const recoveryToken = tokens[0];

    // Mark email as verified
    await executeQuery(
      'UPDATE account_recovery_tokens SET email_verified = true WHERE token_id = ?',
      [recoveryToken.token_id]
    );

    await auditLog(req, 'ACCOUNT_RECOVERY_EMAIL_VERIFIED', 'USER', recoveryToken.user_id, null, {
      email: recoveryToken.email,
    });

    res.json(formatSuccessResponse({
      token_id: recoveryToken.token_id,
      email: recoveryToken.email,
      first_name: recoveryToken.first_name,
    }, 'Recovery PIN verified successfully. Please answer your security questions.'));
  } catch (error) {
    next(error);
  }
};

// Get questions for account recovery after PIN verification
export const getAccountRecoveryQuestions = async (req, res, next) => {
  try {
    const { token_id } = req.body;

    if (!token_id) {
      throw new AppError('Recovery token is required', 400, 'MISSING_TOKEN');
    }

    const tokenQuery = `
      SELECT art.user_id
      FROM account_recovery_tokens art
      WHERE art.token_id = ? AND art.expires_at > NOW() AND art.used = false AND art.email_verified = true
    `;

    const tokens = await executeQuery(tokenQuery, [token_id]);

    if (tokens.length === 0) {
      throw new AppError('Invalid or expired recovery token', 400, 'INVALID_TOKEN');
    }

    const userId = tokens[0].user_id;
    const questionsQuery = `
      SELECT q.question_id, q.question_text
      FROM user_security_answers usa
      JOIN security_questions q ON usa.question_id = q.question_id
      WHERE usa.user_id = ?
      ORDER BY usa.created_at
    `;

    const questions = await executeQuery(questionsQuery, [userId]);

    if (questions.length === 0) {
      throw new AppError('No security questions found for this account', 400, 'NO_SECURITY_QUESTIONS');
    }

    res.json(formatSuccessResponse({ questions }, 'Security questions retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// Complete Account Recovery
export const completeAccountRecovery = async (req, res, next) => {
  try {
    const { token_id, answers } = req.body;

    if (!token_id || !answers || !Array.isArray(answers) || answers.length < 3) {
      throw new AppError('Token ID and at least 3 security answers are required', 400, 'MISSING_DATA');
    }

    // Get recovery token
    const tokenQuery = `
      SELECT art.*, u.user_id, u.email
      FROM account_recovery_tokens art
      JOIN users u ON art.user_id = u.user_id
      WHERE art.token_id = ? AND art.expires_at > NOW() AND art.used = false
    `;

    const tokens = await executeQuery(tokenQuery, [token_id]);

    if (tokens.length === 0) {
      throw new AppError('Invalid or expired recovery token', 400, 'INVALID_TOKEN');
    }

    const recoveryToken = tokens[0];

    if (!recoveryToken.email_verified) {
      throw new AppError('Email verification required first', 400, 'EMAIL_NOT_VERIFIED');
    }

    const storedAnswersQuery = `
      SELECT question_id, answer_hash
      FROM user_security_answers
      WHERE user_id = ?
    `;

    const storedAnswers = await executeQuery(storedAnswersQuery, [recoveryToken.user_id]);

    if (storedAnswers.length === 0) {
      throw new AppError('No security questions found for this account', 400, 'NO_SECURITY_QUESTIONS');
    }

    let correctAnswers = 0;

    for (const provided of answers) {
      if (!provided.question_id || !provided.answer) {
        throw new AppError('Each security answer must include a question_id and answer', 400, 'INVALID_ANSWER_FORMAT');
      }

      const stored = storedAnswers.find(item => item.question_id === provided.question_id);
      if (!stored) {
        continue;
      }

      const isCorrect = await comparePassword(provided.answer.trim().toLowerCase(), stored.answer_hash);
      if (isCorrect) {
        correctAnswers += 1;
      }
    }

    const requiredCorrect = Math.ceil(storedAnswers.length * 0.8);
    if (correctAnswers < requiredCorrect) {
      throw new AppError('One or more security answers are incorrect', 400, 'INVALID_ANSWERS');
    }

    // Unlock account and reset failed attempts
    await executeQuery(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?',
      [recoveryToken.user_id]
    );

    // Mark recovery token as used
    await executeQuery(
      'UPDATE account_recovery_tokens SET used = true, questions_verified = true, used_at = NOW() WHERE token_id = ?',
      [token_id]
    );

    await auditLog(req, 'ACCOUNT_RECOVERY_COMPLETED', 'USER', recoveryToken.user_id, null, {
      email: recoveryToken.email,
    });

    res.json(formatSuccessResponse(null, 'Account unlocked successfully. You can now log in with your credentials.'));
  } catch (error) {
    next(error);
  }
};

// Get Available Security Questions
export const getAvailableSecurityQuestions = async (req, res, next) => {
  try {
    const query = 'SELECT question_id, question_text FROM security_questions WHERE is_active = true ORDER BY question_id';
    const questions = await executeQuery(query);

    res.json(formatSuccessResponse({ questions }, 'Security questions retrieved'));
  } catch (error) {
    next(error);
  }
};

export default {
  registerUser,
  registerPatient,
  loginUser,
  logoutUser,
  refreshToken,
  sendVerificationPIN,
  verifyPIN,
  forgotPassword,
  resetPassword,
  sendAccountRecoveryVerification,
  verifyAccountRecoveryCode,
  unlockAccount,
  completePatientRegistration,
  setupSecurityQuestions,
  getSecurityQuestions,
  verifySecurityQuestions,
  initiateAccountRecovery,
  verifyRecoveryEmail,
  getAccountRecoveryQuestions,
  completeAccountRecovery,
  getAvailableSecurityQuestions,
};
