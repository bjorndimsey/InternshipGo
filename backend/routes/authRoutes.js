const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// POST /api/auth/register - Register a new user
router.post('/register', AuthController.register);

// POST /api/auth/login - Login user
router.post('/login', AuthController.login);

// GET /api/auth/profile/:userId - Get user profile
router.get('/profile/:userId', AuthController.getProfile);

// PUT /api/auth/profile/:userId - Update user profile
router.put('/profile/:userId', AuthController.updateProfile);

// POST /api/auth/check-google-user - Check if Google user exists
router.post('/check-google-user', AuthController.checkGoogleUser);

// POST /api/auth/request-otp - Request OTP for password reset
router.post('/request-otp', AuthController.requestOTP);

// POST /api/auth/verify-otp - Verify OTP
router.post('/verify-otp', AuthController.verifyOTP);

// POST /api/auth/reset-password - Reset password
router.post('/reset-password', AuthController.resetPassword);

// POST /api/auth/update-location - Update user location
router.post('/update-location', AuthController.updateLocation);

// GET /api/auth/locations - Get all users' locations
router.get('/locations', AuthController.getUserLocations);

module.exports = router;
