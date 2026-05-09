import express from 'express';
import { loginAdmin } from '../controllers/adminAuthController.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/commonMiddleware.js';
import { loginValidator } from '../validators/index.js';

const router = express.Router();

/**
 * Admin Login - Dedicated endpoint for admin authentication
 * POST /api/v1/admin/auth/login
 * Body: { email, password }
 * Returns: JWT token and admin user info
 * Rate limited to prevent brute force attacks
 */
router.post('/login', loginLimiter, validateRequest(loginValidator), loginAdmin);

export default router;
