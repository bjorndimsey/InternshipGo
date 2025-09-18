const User = require('../models/User');
const { validateUser } = require('../validators/userValidator');

// Helper function to normalize user response based on user type
function normalizeUserResponse(user) {
  if (!user) return null;

  const baseUser = {
    id: user.id,
    user_type: user.user_type,
    email: user.email,
    google_id: user.google_id,
    profile_picture: user.profile_picture,
    is_active: user.is_active,
    latitude: user.latitude,
    longitude: user.longitude,
    created_at: user.created_at,
    updated_at: user.updated_at
  };

  switch (user.user_type) {
    case 'Student':
      return {
        ...baseUser,
        student_id: user.student_id, // Add the student table ID
        id_number: user.id_number,
        first_name: user.first_name,
        last_name: user.last_name,
        age: user.age,
        year: user.year,
        date_of_birth: user.date_of_birth,
        program: user.program,
        major: user.major,
        address: user.address
      };
    
    case 'Coordinator':
      return {
        ...baseUser,
        first_name: user.first_name,
        last_name: user.last_name,
        program: user.program,
        phone_number: user.phone_number,
        address: user.address
      };
    
    case 'Admin Coordinator':
      return {
        ...baseUser,
        first_name: user.first_name,
        last_name: user.last_name,
        program: user.program,
        phone_number: user.phone_number,
        address: user.address
      };
    
    case 'Company':
      return {
        ...baseUser,
        company_name: user.company_name,
        industry: user.industry,
        address: user.address
      };
    
    case 'System Admin':
      return {
        ...baseUser,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        address: user.address
      };
    
    default:
      return baseUser;
  }
}

class AuthController {
  // Register a new user
  static async register(req, res) {
    try {
      console.log('Registration request body:', JSON.stringify(req.body, null, 2));
      
      // Validate input data
      const { error, value } = validateUser(req.body);
      if (error) {
        console.log('Validation errors:', error.details);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
      }

      const userData = value;

      // Check if email already exists
      const emailExists = await User.emailExists(userData.email);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Check if ID number already exists (for students)
      if (userData.userType === 'Student' && userData.idNumber) {
        const idExists = await User.idNumberExists(userData.idNumber);
        if (idExists) {
          return res.status(409).json({
            success: false,
            message: 'ID number already exists'
          });
        }
      }

      // Create new user
      const user = new User(userData);
      const savedUser = await user.save();

      // Get the complete user data with profile information
      const completeUser = await User.findById(savedUser.id);
      
      // Normalize the response based on user type
      const normalizedUser = normalizeUserResponse(completeUser);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: normalizedUser
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if coordinator has admin status
      let finalUserType = user.user_type;
      if (user.user_type === 'Coordinator') {
        const { query } = require('../config/supabase');
        
        // First, get the coordinator record to get the coordinator ID
        const coordinatorResult = await query('coordinators', 'select', null, { 
          user_id: user.id 
        });
        
        if (coordinatorResult.data && coordinatorResult.data.length > 0) {
          const coordinatorId = coordinatorResult.data[0].id;
          
          // Now check if this coordinator has admin status
          const adminResult = await query('admin_coordinators', 'select', null, { 
            coordinator_id: coordinatorId, 
            is_active: true 
          });
          
          if (adminResult.data && adminResult.data.length > 0) {
            finalUserType = 'Admin Coordinator';
            console.log('🔧 Coordinator has admin status, changing user type to Admin Coordinator');
          }
        }
      }

      // Create a modified user object with the correct user type
      const userWithCorrectType = {
        ...user,
        user_type: finalUserType
      };

      // Normalize the response based on user type
      const normalizedUser = normalizeUserResponse(userWithCorrectType);

      res.json({
        success: true,
        message: 'Login successful',
        user: normalizedUser
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get user profile
  static async getProfile(req, res) {
    try {
      const { userId } = req.params;
      console.log('🔍 Getting profile for user ID:', userId);
      
      // Check if this looks like a Google ID (very large number as string)
      let user;
      if (userId && userId.length > 15 && /^\d+$/.test(userId)) {
        console.log('🔍 This looks like a Google ID, searching by google_id');
        user = await User.findByGoogleId(userId);
      } else {
        console.log('🔍 This looks like a database ID, searching by id');
        user = await User.findById(userId);
      }
      
      console.log('🔍 User found:', user ? 'Yes' : 'No');
      
      if (user) {
        console.log('🔍 User details:', {
          id: user.id,
          email: user.email,
          user_type: user.user_type,
          google_id: user.google_id
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Normalize the response based on user type
      const normalizedUser = normalizeUserResponse(user);
      console.log('🔍 Normalized user:', normalizedUser);

      res.json({
        success: true,
        user: normalizedUser
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Check if Google user exists
  static async checkGoogleUser(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      console.log('Checking Google user for email:', email);

      const user = await User.findByEmail(email);
      
      if (user) {
        console.log('✅ Google user found:', user.email);
        const normalizedUser = normalizeUserResponse(user);
        
        return res.json({
          success: true,
          message: 'Google user exists',
          user: normalizedUser
        });
      } else {
        console.log('❌ Google user not found for email:', email);
        return res.json({
          success: false,
          message: 'Google user not found',
          user: null
        });
      }
    } catch (error) {
      console.error('Check Google user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Request OTP for password reset
  static async requestOTP(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      console.log('Requesting OTP for email:', email);

      // Check if user exists
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email address'
        });
      }

      // Check if user is a Google OAuth user (no password hash or google_oauth placeholder)
      const { query } = require('../config/supabase');
      const userResult = await query('users', 'select', null, { email, is_active: true });
      const isGoogleUser = !userResult.data[0].password_hash || userResult.data[0].password_hash === 'google_oauth';
      
      console.log('User type check:', { 
        email, 
        hasPassword: !!userResult.data[0].password_hash, 
        isGoogleUser 
      });

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in database (you might want to create an OTP table)
      // For now, we'll store it in a simple way
      const otpData = {
        email,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        createdAt: new Date()
      };

      // In a real app, you'd store this in a database
      // For now, we'll just return it
      console.log('Generated OTP for', email, ':', otp);

      res.json({
        success: true,
        message: 'OTP generated successfully',
        otp, // In production, don't return the OTP
        userName: user.first_name || user.coord_first_name || user.company_name || 'User',
        isGoogleUser // Add this flag to indicate if user is Google OAuth
      });

    } catch (error) {
      console.error('Request OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Verify OTP
  static async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP are required'
        });
      }

      console.log('Verifying OTP for email:', email, 'OTP:', otp);

      // In a real app, you'd verify against stored OTP in database
      // For now, we'll accept any 6-digit OTP for demo purposes
      if (otp.length === 6 && /^\d+$/.test(otp)) {
        res.json({
          success: true,
          message: 'OTP verified successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid OTP format'
        });
      }

    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Reset password or set password for Google OAuth users
  static async resetPassword(req, res) {
    try {
      const { email, newPassword, confirmPassword } = req.body;
      
      if (!email || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email, new password, and confirm password are required'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      console.log('Resetting/setting password for email:', email);

      // Find user by email
      const { query } = require('../config/supabase');
      const userResult = await query('users', 'select', null, { email, is_active: true });
      
      if (!userResult.data || userResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.data[0];
      console.log('User found:', { id: user.id, email: user.email, has_password: !!user.password_hash });

      // Check if user is a Google OAuth user (no password or google_oauth placeholder)
      const isGoogleUser = !user.password_hash || user.password_hash === 'google_oauth';
      
      if (isGoogleUser) {
        console.log('Google OAuth user setting password for the first time');
      } else {
        console.log('Regular user resetting existing password');
      }

      // Hash new password
      const bcrypt = require('bcryptjs');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await query('users', 'update', { password_hash: hashedPassword }, { email });

      console.log('Password set/reset successful for:', email);

      res.json({
        success: true,
        message: isGoogleUser 
          ? 'Password set successfully! You can now login with email and password.' 
          : 'Password reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Update user location
  static async updateLocation(req, res) {
    try {
      const { userId, latitude, longitude } = req.body;

      if (!userId || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'User ID, latitude, and longitude are required'
        });
      }

      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }

      const { query } = require('../config/supabase');
      
      // Update user location in database
      const updateResult = await query('users', 'update', 
        { 
          latitude: parseFloat(latitude), 
          longitude: parseFloat(longitude),
          updated_at: new Date().toISOString()
        }, 
        { id: userId }
      );

      if (updateResult.error) {
        throw updateResult.error;
      }

      res.json({
        success: true,
        message: 'Location updated successfully',
        data: {
          userId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        }
      });

    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get all users' locations
  static async getUserLocations(req, res) {
    try {
      const { query } = require('../config/supabase');
      
      // Get all active users with their location data
      const usersResult = await query('users', 'select', 
        ['id', 'first_name', 'last_name', 'profile_picture', 'latitude', 'longitude', 'user_type'],
        { is_active: true }
      );

      if (usersResult.error) {
        throw usersResult.error;
      }

      // Filter out users without location data and format response
      const usersWithLocations = usersResult.data
        .filter(user => user.latitude !== null && user.longitude !== null)
        .map(user => ({
          id: user.id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User',
          latitude: user.latitude,
          longitude: user.longitude,
          avatar: user.profile_picture,
          userType: user.user_type
        }));

      res.json({
        success: true,
        data: usersWithLocations
      });

    } catch (error) {
      console.error('Get user locations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = AuthController;
