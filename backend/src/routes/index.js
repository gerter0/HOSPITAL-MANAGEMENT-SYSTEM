import express from 'express';
import authRoutes from './authRoutes.js';
import patientRoutes from './patientRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import adminRoutes from './adminRoutes.js';
import adminAuthRoutes from './adminAuthRoutes.js';
import config from '../config/config.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/admin', adminRoutes);

// Health check with ngrok awareness
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: config.api.version,
    environment: process.env.NODE_ENV,
    ngrok: {
      enabled: process.env.NGROK_ENABLED === 'true',
      url: process.env.NGROK_URL || 'Not configured',
    },
  });
});

// Diagnostics endpoint for troubleshooting ngrok
router.get('/diagnostics', (req, res) => {
  res.json({
    status: 'Diagnostics',
    request: {
      ip: req.ip,
      origin: req.headers.origin,
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
    },
    environment: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      email_configured: !!process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email'),
    },
    cors: {
      policy: 'Allow all origins',
      credentials: true,
    },
    help: 'Check request headers to verify ngrok tunnel is working correctly',
  });
});

export default router;
