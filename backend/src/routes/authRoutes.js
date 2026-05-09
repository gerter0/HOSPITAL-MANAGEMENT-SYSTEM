import express from 'express';
import { registerUser, registerPatient, loginUser, logoutUser, refreshToken, sendVerificationPIN, verifyPIN, forgotPassword, resetPassword, sendAccountRecoveryVerification, verifyAccountRecoveryCode, unlockAccount, getSecurityQuestions, completePatientRegistration, setupSecurityQuestions, verifySecurityQuestions, initiateAccountRecovery, verifyRecoveryEmail, completeAccountRecovery, getAvailableSecurityQuestions, getAccountRecoveryQuestions } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/commonMiddleware.js';
import { loginValidator, registerValidator, patientRegistrationValidator, securityQuestionsSetupValidator, securityQuestionsVerifyValidator, accountRecoveryInitiateValidator, accountRecoveryVerifyEmailValidator, accountRecoveryQuestionsValidator, accountRecoveryCompleteValidator } from '../validators/index.js';

const router = express.Router();

// Email verification routes (public)
router.post('/send-verification-pin', sendVerificationPIN);
router.post('/verify-pin', verifyPIN);

// Registration routes
router.post('/register', validateRequest(registerValidator), registerUser);
router.post('/register/patient', validateRequest(patientRegistrationValidator), registerPatient);

// Login routes
router.post('/login', loginLimiter, validateRequest(loginValidator), loginUser);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Account recovery routes
router.post('/account-recovery/initiate', validateRequest(accountRecoveryInitiateValidator), initiateAccountRecovery);
router.post('/account-recovery/verify-email', validateRequest(accountRecoveryVerifyEmailValidator), verifyRecoveryEmail);
router.post('/account-recovery/questions', validateRequest(accountRecoveryQuestionsValidator), getAccountRecoveryQuestions);
router.post('/account-recovery/complete', validateRequest(accountRecoveryCompleteValidator), completeAccountRecovery);

// Security questions routes
router.get('/security-questions/available', getAvailableSecurityQuestions);
router.post('/security-questions/setup', authMiddleware, validateRequest(securityQuestionsSetupValidator), setupSecurityQuestions);
router.get('/security-questions', authMiddleware, getSecurityQuestions);
router.post('/security-questions/verify', authMiddleware, validateRequest(securityQuestionsVerifyValidator), verifySecurityQuestions);

// Security setup routes
router.post('/register/patient/complete', completePatientRegistration);

// Protected routes
router.post('/logout', authMiddleware, logoutUser);
router.post('/refresh-token', authMiddleware, refreshToken);

export default router;
