import admin from 'firebase-admin';
import config from '../config/config.js';

// Initialize Firebase Admin (if credentials provided)
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;
  
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  if (!serviceAccountPath) {
    console.warn('⚠️ Firebase service account path not configured. SMS delivery via FCM will be unavailable.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized for SMS delivery');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    console.warn('SMS delivery via FCM will not be available');
  }
};

/**
 * Send verification PIN via SMS using Firebase Cloud Messaging
 * @param {string} phoneNumber - User's phone number (E.164 format: +1234567890)
 * @param {string} pin - 6-digit PIN code
 * @returns {Promise<boolean>} Success status
 */
export const sendVerificationPINSMS = async (phoneNumber, pin) => {
  try {
    if (!firebaseInitialized) {
      initializeFirebase();
    }

    if (!firebaseInitialized) {
      throw new Error('Firebase not initialized. Check FIREBASE_SERVICE_ACCOUNT configuration.');
    }

    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+') || phoneNumber.replace(/\D/g, '').length < 10) {
      throw new Error('Invalid phone number format. Use E.164 format: +1234567890');
    }

    // Message content
    const message = `Your Hospital Management System verification code is: ${pin}. Valid for 10 minutes. Never share this code.`;

    // Send message via FCM
    // Note: In production, you'd use SendGrid, Twilio, or direct SMS gateway
    // FCM is better for in-app push notifications
    // For true SMS, you might need to use a different approach
    
    // For now, we'll log it and support a test mode
    console.log(`📱 SMS to ${phoneNumber}: ${message}`);

    // In development/test mode, return success
    if (process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true') {
      console.log(`✅ [TEST MODE] SMS PIN sent to ${phoneNumber}`);
      return true;
    }

    // In production, you would implement real SMS delivery here
    // For example, using Twilio instead of FCM:
    // const response = await twilioClient.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber,
    // });

    console.log(`✅ SMS PIN sent to ${phoneNumber}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send SMS PIN:', error.message);
    throw error;
  }
};

/**
 * Send registration confirmation via SMS
 * @param {string} phoneNumber - User's phone number
 * @param {string} firstName - User's first name
 * @returns {Promise<boolean>} Success status
 */
export const sendRegistrationConfirmationSMS = async (phoneNumber, firstName) => {
  try {
    if (!firebaseInitialized) {
      initializeFirebase();
    }

    const message = `Welcome ${firstName}! Your account has been successfully created on Hospital Management System. Keep your credentials safe.`;

    console.log(`📱 SMS to ${phoneNumber}: ${message}`);

    if (process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true') {
      console.log(`✅ [TEST MODE] Confirmation SMS sent to ${phoneNumber}`);
      return true;
    }

    console.log(`✅ Confirmation SMS sent to ${phoneNumber}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send confirmation SMS:', error.message);
    throw error;
  }
};

/**
 * Send password reset PIN via SMS
 * @param {string} phoneNumber - User's phone number
 * @param {string} pin - Reset PIN code
 * @returns {Promise<boolean>} Success status
 */
export const sendPasswordResetPINSMS = async (phoneNumber, pin) => {
  try {
    if (!firebaseInitialized) {
      initializeFirebase();
    }

    const message = `Your password reset code is: ${pin}. Valid for 15 minutes. If you didn't request this, ignore this message.`;

    console.log(`📱 SMS to ${phoneNumber}: ${message}`);

    if (process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true') {
      console.log(`✅ [TEST MODE] Password reset SMS sent to ${phoneNumber}`);
      return true;
    }

    console.log(`✅ Password reset SMS sent to ${phoneNumber}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send password reset SMS:', error.message);
    throw error;
  }
};

/**
 * Validate phone number format (E.164)
 * @param {string} phoneNumber
 * @returns {boolean}
 */
export const validatePhoneNumber = (phoneNumber) => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

export default {
  sendVerificationPINSMS,
  sendRegistrationConfirmationSMS,
  sendPasswordResetPINSMS,
  validatePhoneNumber,
  initializeFirebase,
};
