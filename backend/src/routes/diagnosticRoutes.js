import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    backend: {
      port: process.env.PORT || 5001,
      node_version: process.version,
    },
    ngrok: {
      enabled: process.env.NGROK_ENABLED === 'true',
      url: process.env.NGROK_URL || 'Not configured',
    },
    email: {
      configured: !!process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email'),
      service: process.env.EMAIL_SERVICE || 'gmail',
      user: process.env.EMAIL_USER ? process.env.EMAIL_USER.split('@')[0] + '@...' : 'Not set',
    },
    cors: {
      origin: 'true (allow all)',
      credentials: true,
    },
  });
});

// Diagnostic endpoint for debugging ngrok issues
router.get('/diagnostics', (req, res) => {
  const diagnostics = {
    ngrok_connection: {
      header_forwarded_proto: req.headers['x-forwarded-proto'],
      header_forwarded_for: req.headers['x-forwarded-for'],
      header_forwarded_host: req.headers['x-forwarded-host'],
      origin: req.headers.origin,
      referer: req.headers.referer,
      user_agent: req.headers['user-agent'],
      real_ip: req.ip,
    },
    environment: {
      node_env: process.env.NODE_ENV,
      api_prefix: process.env.API_PREFIX,
      port: process.env.PORT,
    },
    frontend_config: {
      cors_origin: 'true (allow all)',
      cors_credentials: true,
    },
  };

  res.status(200).json({
    status: 'Diagnostics',
    data: diagnostics,
    help: 'Use this to verify ngrok tunnel configuration',
  });
});

export default router;
