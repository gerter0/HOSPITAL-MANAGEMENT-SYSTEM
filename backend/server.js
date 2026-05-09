import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import config from './src/config/config.js';
import { initializeDatabase } from './src/config/database.js';
import apiRoutes from './src/routes/index.js';
import { apiLimiter } from './src/middleware/rateLimiter.js';
import {
  requestIdMiddleware,
  securityHeaders,
  httpsRedirect,
  errorHandler,
  notFoundHandler,
} from './src/middleware/commonMiddleware.js';

const app = express();

// Trust proxy for X-Forwarded-For headers
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet()); // Set various HTTP headers
app.use(httpsRedirect); // Redirect to HTTPS in production
app.use(securityHeaders); // Additional security headers

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost, ngrok, and all origins for development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:4173',
      'http://localhost:4174',
      'http://localhost:5173',
      'https://exactable-discretional-zion.ngrok-free.dev',
      'http://127.0.0.1:4173',
    ];
    
    // Allow if no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For development, allow all
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
}));

// Body Parser
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// Request ID Tracking
app.use(requestIdMiddleware);

// Rate Limiting
app.use('/api/', apiLimiter);

// Routes
app.use(`${config.api.prefix}`, apiRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

// Initialize Database and Start Server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Start listening
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║   Hospital Management System - Backend Server              ║
║   Environment: ${config.nodeEnv.padEnd(36)}                ║
║   Port: ${config.port}                                     ║
║   Database: Connected                                      ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;
