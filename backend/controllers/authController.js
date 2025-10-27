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
    background_picture: user.background_picture,
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
        middle_name: user.middle_name,
        last_name: user.last_name,
        age: user.age,
        year: user.year,
        date_of_birth: user.date_of_birth,
        program: user.program,
        major: user.major,
        address: user.address,
        skills: user.skills,
        interests: user.interests,
        bio: user.bio,
        phone_number: user.phone_number,
        linkedin_url: user.linkedin_url,
        github_url: user.github_url,
        portfolio_url: user.portfolio_url,
        gpa: user.gpa,
        expected_graduation: user.expected_graduation,
        availability: user.availability,
        preferred_location: user.preferred_location,
        work_experience: user.work_experience,
        projects: user.projects,
        achievements: user.achievements
      };
    
    case 'Coordinator':
      return {
        ...baseUser,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        program: user.program,
        phone_number: user.phone_number,
        address: user.address,
        skills: user.skills,
        industryFocus: user.industry_focus,
        companyPreferences: user.company_preferences,
        bio: user.bio,
        linkedinUrl: user.linkedin_url,
        workExperience: user.work_experience,
        achievements: user.achievements,
        specializations: user.specializations,
        yearsOfExperience: user.years_of_experience,
        managedCompanies: user.managed_companies,
        successfulPlacements: user.successful_placements,
        rating: user.rating,
        location: user.location
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
        address: user.address,
        qualifications: user.qualifications,
        skills_required: user.skills_required,
        company_description: user.company_description,
        website: user.website,
        phone_number: user.phone_number,
        contact_person: user.contact_person,
        company_size: user.company_size,
        founded_year: user.founded_year,
        benefits: user.benefits,
        work_environment: user.work_environment,
        available_intern_slots: user.available_intern_slots,
        total_intern_capacity: user.total_intern_capacity,
        current_intern_count: user.current_intern_count
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

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      
      console.log('🔄 Updating profile for user ID:', userId);
      console.log('🔄 Update data:', updateData);
      
      // Find the user first
      let user;
      if (userId && userId.length > 15 && /^\d+$/.test(userId)) {
        user = await User.findByGoogleId(userId);
      } else {
        user = await User.findById(userId);
      }
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Update profile picture in users table if provided
      if (updateData.profilePicture) {
        const { query } = require('../config/supabase');
        await query('users', 'update', 
          { 
            profile_picture: updateData.profilePicture,
            updated_at: new Date().toISOString()
          }, 
          { id: user.id }
        );
      }
      
      // Update background picture in users table if provided
      if (updateData.backgroundPicture) {
        const { query } = require('../config/supabase');
        await query('users', 'update', 
          { 
            background_picture: updateData.backgroundPicture,
            updated_at: new Date().toISOString()
          }, 
          { id: user.id }
        );
      }
      
      // Update based on user type
      if (user.user_type === 'Company') {
        // Update company profile
        const companyUpdateData = {
          company_name: updateData.companyName,
          industry: updateData.industry,
          address: updateData.address,
          qualifications: updateData.qualifications,
          skills_required: updateData.skillsRequired,
          company_description: updateData.companyDescription,
          website: updateData.website,
          phone_number: updateData.phoneNumber,
          contact_person: updateData.contactPerson,
          company_size: updateData.companySize,
          founded_year: updateData.foundedYear ? parseInt(updateData.foundedYear) : null,
          benefits: updateData.benefits,
          work_environment: updateData.workEnvironment,
          available_intern_slots: updateData.availableInternSlots ? parseInt(updateData.availableInternSlots) : 0,
          total_intern_capacity: updateData.totalInternCapacity ? parseInt(updateData.totalInternCapacity) : 0,
          current_intern_count: updateData.currentInternCount ? parseInt(updateData.currentInternCount) : 0,
          updated_at: new Date().toISOString()
        };
        
        // Remove undefined values
        Object.keys(companyUpdateData).forEach(key => {
          if (companyUpdateData[key] === undefined) {
            delete companyUpdateData[key];
          }
        });
        
        const { query } = require('../config/supabase');
        const result = await query('companies', 'update', companyUpdateData, { user_id: user.id });
        
        if (!result.data) {
          return res.status(404).json({
            success: false,
            message: 'Company profile not found'
          });
        }
      } else if (user.user_type === 'Coordinator') {
        // Update coordinator profile
        const coordinatorUpdateData = {
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          program: updateData.program,
          phone_number: updateData.phone_number,
          address: updateData.address,
          skills: updateData.skills,
          industry_focus: updateData.industryFocus,
          company_preferences: updateData.companyPreferences,
          bio: updateData.bio,
          linkedin_url: updateData.linkedinUrl,
          work_experience: updateData.workExperience,
          achievements: updateData.achievements,
          specializations: updateData.specializations,
          years_of_experience: updateData.yearsOfExperience ? parseInt(updateData.yearsOfExperience) : null,
          managed_companies: updateData.managedCompanies ? parseInt(updateData.managedCompanies) : null,
          successful_placements: updateData.successfulPlacements ? parseInt(updateData.successfulPlacements) : null,
          rating: updateData.rating ? parseFloat(updateData.rating) : null,
          location: updateData.location,
          updated_at: new Date().toISOString()
        };
        
        // Remove undefined values
        Object.keys(coordinatorUpdateData).forEach(key => {
          if (coordinatorUpdateData[key] === undefined) {
            delete coordinatorUpdateData[key];
          }
        });
        
        const { query } = require('../config/supabase');
        const result = await query('coordinators', 'update', coordinatorUpdateData, { user_id: user.id });
        
        if (!result.data) {
          return res.status(404).json({
            success: false,
            message: 'Coordinator profile not found'
          });
        }
      } else if (user.user_type === 'Student') {
        // Update student profile
        const studentUpdateData = {
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          age: updateData.age ? parseInt(updateData.age) : undefined,
          year: updateData.year,
          date_of_birth: updateData.date_of_birth,
          program: updateData.program,
          major: updateData.major,
          address: updateData.address,
          skills: updateData.skills,
          interests: updateData.interests,
          bio: updateData.bio,
          phone_number: updateData.phone_number,
          linkedin_url: updateData.linkedin_url,
          github_url: updateData.github_url,
          portfolio_url: updateData.portfolio_url,
          gpa: updateData.gpa ? parseFloat(updateData.gpa) : undefined,
          expected_graduation: updateData.expected_graduation,
          availability: updateData.availability,
          preferred_location: updateData.preferred_location,
          work_experience: updateData.work_experience,
          projects: updateData.projects,
          achievements: updateData.achievements,
          updated_at: new Date().toISOString()
        };
        
        // Remove undefined values
        Object.keys(studentUpdateData).forEach(key => {
          if (studentUpdateData[key] === undefined) {
            delete studentUpdateData[key];
          }
        });
        
        const { query } = require('../config/supabase');
        const result = await query('students', 'update', studentUpdateData, { user_id: user.id });
        
        if (!result.data) {
          return res.status(404).json({
            success: false,
            message: 'Student profile not found'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Profile update not supported for this user type'
        });
      }
      
      // Get updated user data
      const updatedUser = await User.findById(user.id);
      const normalizedUser = normalizeUserResponse(updatedUser);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: normalizedUser
      });
      
    } catch (error) {
      console.error('Update profile error:', error);
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
      const { supabase } = require('../config/supabase');
      
      console.log('🔍 Fetching all user locations...');
      
      // Get all active users with their location data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        throw usersError;
      }

      console.log(`✅ Found ${users.length} users with location data`);

      // For each user type, get additional data from their specific tables
      const formattedUsers = [];
      
      for (const user of users) {
        let displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
        let userType = user.user_type?.toLowerCase() || 'unknown';
        
        // Fetch additional data based on user type
        if (user.user_type === 'Company') {
          try {
            const { data: companyData } = await supabase
              .from('companies')
              .select('company_name')
              .eq('user_id', user.id)
              .single();
            
            if (companyData && companyData.company_name) {
              displayName = companyData.company_name;
            }
            userType = 'company';
          } catch (err) {
            console.log(`⚠️ Could not fetch company data for user ${user.id}`);
          }
        } else if (user.user_type === 'Coordinator' || user.user_type === 'Admin Coordinator') {
          userType = 'coordinator';
        } else if (user.user_type === 'Student') {
          userType = 'student';
        }
        
        formattedUsers.push({
          id: user.id,
          name: displayName,
          latitude: user.latitude,
          longitude: user.longitude,
          avatar: user.profile_picture,
          userType: userType
        });
      }

      console.log('✅ Formatted users:', formattedUsers.length);
      console.log('📍 User type breakdown:', {
        company: formattedUsers.filter(u => u.userType === 'company').length,
        student: formattedUsers.filter(u => u.userType === 'student').length,
        coordinator: formattedUsers.filter(u => u.userType === 'coordinator').length
      });

      res.json({
        success: true,
        data: formattedUsers
      });

    } catch (error) {
      console.error('❌ Get user locations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = AuthController;
