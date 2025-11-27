const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const coordinatorRoutes = require('./routes/coordinatorRoutes');
const companyRoutes = require('./routes/companyRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const studentRoutes = require('./routes/studentRoutes');
const internRoutes = require('./routes/internRoutes');
const eventRoutes = require('./routes/eventRoutes');
const locationPictureRoutes = require('./routes/locationPictureRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const studentSubmissionRoutes = require('./routes/studentSubmissionRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const messagingRoutes = require('./routes/messagingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const coordinatorNotificationRoutes = require('./routes/coordinatorNotificationRoutes');
const companyNotificationRoutes = require('./routes/companyNotificationRoutes');
const workingHoursRoutes = require('./routes/workingHoursRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const cloudinaryRoutes = require('./routes/cloudinaryRoutes');
const platformStatsRoutes = require('./routes/platformStatsRoutes');
const companiesLandingPageRoutes = require('./routes/companiesLandingPageRoutes');
const classRoutes = require('./routes/classRoutes');
const hteRoutes = require('./routes/hteRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const trainingScheduleRoutes = require('./routes/trainingScheduleRoutes');
const internFeedbackFormRoutes = require('./routes/internFeedbackFormRoutes');
const supervisorEvaluationRoutes = require('./routes/supervisorEvaluationRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting - Disabled for development
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // Increased limit for development
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   skip: (req) => {
//     // Skip rate limiting for health checks
//     return req.path === '/health';
//   }
// });
// app.use(limiter);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:8081',
      'http://localhost:3000',
      'http://localhost:19006',
      'http://localhost:19000',
      'http://localhost:8080',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS: Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Handle preflight OPTIONS requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'InternshipGo API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/coordinators', coordinatorRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/interns', internRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', locationPictureRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/submissions', studentSubmissionRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notifications', coordinatorNotificationRoutes);
app.use('/api/notifications', companyNotificationRoutes);
app.use('/api/working-hours', workingHoursRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/evidences', evidenceRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/platform', platformStatsRoutes);
app.use('/api/landing', companiesLandingPageRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/hte', hteRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/training-schedules', trainingScheduleRoutes);
app.use('/api/intern-feedback-forms', internFeedbackFormRoutes);
app.use('/api/supervisor-evaluations', supervisorEvaluationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:19006'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
});

module.exports = app;
