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

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081', // Expo default port
  credentials: true
}));

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
