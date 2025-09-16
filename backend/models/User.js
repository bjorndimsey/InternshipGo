const { query } = require('../config/supabase');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.userType = data.userType;
    this.email = data.email;
    this.password = data.password;
    this.googleId = data.googleId;
    this.profilePicture = data.profilePicture;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.idNumber = data.idNumber;
    this.age = data.age;
    this.year = data.year;
    this.dateOfBirth = data.dateOfBirth;
    this.program = data.program;
    this.major = data.major;
    this.address = data.address;
    this.companyName = data.companyName;
    this.industry = data.industry;
    this.phoneNumber = data.phoneNumber;
  }

  // Hash password before saving (skip for Google users)
  async hashPassword() {
    // Skip password hashing for Google OAuth users
    if (this.googleId) {
      return; // Don't hash password for Google users
    }
    
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  // Save user to database with separated tables
  async save() {
    await this.hashPassword();
    
    try {
      // First, insert into users table
      const userData = {
        user_type: this.userType,
        email: this.email
      };
      
      // Add authentication fields based on user type
      if (this.googleId) {
        // Google OAuth user - no password_hash
        userData.google_id = this.googleId;
        userData.profile_picture = this.profilePicture;
        userData.password_hash = null;
      } else {
        // Regular user - has password_hash
        userData.password_hash = this.password;
        userData.google_id = null;
      }
      
      const userResult = await query('users', 'insert', userData);
      
      const userId = userResult.data[0].id;
      
      // Then insert into the specific user type table
      let profileData;
      
      switch (this.userType) {
        case 'Student':
          profileData = {
            user_id: userId,
            id_number: this.idNumber || '',
            first_name: this.firstName || '',
            last_name: this.lastName || '',
            age: this.age || 0,
            year: this.year || '',
            date_of_birth: this.dateOfBirth || '',
            program: this.program || '',
            major: this.major || '',
            address: this.address || ''
          };
          await query('students', 'insert', profileData);
          break;
          
        case 'Coordinator':
          profileData = {
            user_id: userId,
            first_name: this.firstName || '',
            last_name: this.lastName || '',
            program: this.program || '',
            phone_number: this.phoneNumber || '',
            address: this.address || ''
          };
          await query('coordinators', 'insert', profileData);
          break;
          
        case 'Company':
          profileData = {
            user_id: userId,
            company_name: this.companyName || '',
            industry: this.industry || '',
            address: this.address || ''
          };
          await query('companies', 'insert', profileData);
          break;
          
        default:
          throw new Error('Invalid user type');
      }
      
      return { id: userId, userType: this.userType };
      
    } catch (error) {
      throw error;
    }
  }

  // Find user by email with profile data
  static async findByEmail(email) {
    try {
      // Get user data
      const userResult = await query('users', 'select', null, { email, is_active: true });
      if (!userResult.data || userResult.data.length === 0) {
        return null;
      }
      
      const user = userResult.data[0];
      
      // Get profile data based on user type
      let profileResult;
      switch (user.user_type) {
        case 'Student':
          profileResult = await query('students', 'select', null, { user_id: user.id });
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            return {
              ...user,
              id_number: profile.id_number,
              first_name: profile.first_name,
              last_name: profile.last_name,
              age: profile.age,
              year: profile.year,
              date_of_birth: profile.date_of_birth,
              program: profile.program,
              major: profile.major,
              address: profile.address
            };
          }
          break;
          
        case 'Coordinator':
          profileResult = await query('coordinators', 'select', null, { user_id: user.id });
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            return {
              ...user,
              first_name: profile.first_name,
              last_name: profile.last_name,
              program: profile.program,
              phone_number: profile.phone_number,
              address: profile.address
            };
          }
          break;
          
        case 'Company':
          profileResult = await query('companies', 'select', null, { user_id: user.id });
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            return {
              ...user,
              company_name: profile.company_name,
              industry: profile.industry,
              address: profile.address
            };
          }
          break;
          
        case 'System Admin':
          profileResult = await query('system_admins', 'select', null, { user_id: user.id });
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            return {
              ...user,
              first_name: profile.first_name,
              last_name: profile.last_name,
              phone_number: profile.phone_number,
              address: profile.address
            };
          }
          break;
      }
      
      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  // Find user by Google ID with profile data
  static async findByGoogleId(googleId) {
    try {
      console.log('🔍 User.findByGoogleId called with Google ID:', googleId);
      
      // Get user data by google_id
      const userResult = await query('users', 'select', null, { google_id: googleId, is_active: true });
      console.log('🔍 Google user query result:', userResult);
      
      if (!userResult.data || userResult.data.length === 0) {
        console.log('🔍 No user found with Google ID:', googleId);
        return null;
      }
      
      const user = userResult.data[0];
      console.log('🔍 Google user found:', user);
      
      // Get profile data based on user type
      let profileResult;
      switch (user.user_type) {
        case 'Student':
          console.log('🔍 Looking for student profile for user_id:', user.id);
          profileResult = await query('students', 'select', null, { user_id: user.id });
          console.log('🔍 Student profile query result:', profileResult);
          
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            console.log('🔍 Student profile found:', profile);
            return {
              ...user,
              id_number: profile.id_number,
              first_name: profile.first_name,
              last_name: profile.last_name,
              age: profile.age,
              year: profile.year,
              date_of_birth: profile.date_of_birth,
              program: profile.program,
              major: profile.major,
              address: profile.address
            };
          } else {
            console.log('🔍 No student profile found for user_id:', user.id);
            console.log('🔍 Creating default student profile for Google OAuth user');
            
            // Create a default student profile for Google OAuth users
            const defaultProfile = {
              user_id: user.id,
              id_number: `GOOGLE_${user.id.slice(-6)}`, // Generate a unique ID
              first_name: user.name?.split(' ')[0] || 'Google',
              last_name: user.name?.split(' ').slice(1).join(' ') || 'User',
              age: 20, // Default age
              year: '1st', // Default year
              date_of_birth: '2000-01-01', // Default date
              program: 'BSIT', // Default program
              major: 'Information Technology', // Default major
              address: 'Not specified' // Default address
            };
            
            console.log('🔍 Creating default profile:', defaultProfile);
            
            // Insert the default profile
            const insertResult = await query('students', 'insert', defaultProfile);
            console.log('🔍 Default profile created:', insertResult);
            
            return {
              ...user,
              id_number: defaultProfile.id_number,
              first_name: defaultProfile.first_name,
              last_name: defaultProfile.last_name,
              age: defaultProfile.age,
              year: defaultProfile.year,
              date_of_birth: defaultProfile.date_of_birth,
              program: defaultProfile.program,
              major: defaultProfile.major,
              address: defaultProfile.address
            };
          }
          break;
          
        case 'Coordinator':
          console.log('🔍 Looking for coordinator profile for user_id:', user.id);
          profileResult = await query('coordinators', 'select', null, { user_id: user.id });
          console.log('🔍 Coordinator profile query result:', profileResult);
          
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            console.log('🔍 Coordinator profile found:', profile);
            return {
              ...user,
              first_name: profile.first_name,
              last_name: profile.last_name,
              program: profile.program,
              phone_number: profile.phone_number,
              address: profile.address
            };
          } else {
            console.log('🔍 No coordinator profile found for user_id:', user.id);
          }
          break;
          
        case 'Company':
          console.log('🔍 Looking for company profile for user_id:', user.id);
          profileResult = await query('companies', 'select', null, { user_id: user.id });
          console.log('🔍 Company profile query result:', profileResult);
          
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            console.log('🔍 Company profile found:', profile);
            return {
              ...user,
              company_name: profile.company_name,
              industry: profile.industry,
              address: profile.address
            };
          } else {
            console.log('🔍 No company profile found for user_id:', user.id);
          }
          break;
          
        case 'System Admin':
          console.log('🔍 Looking for system admin profile for user_id:', user.id);
          profileResult = await query('system_admins', 'select', null, { user_id: user.id });
          console.log('🔍 System admin profile query result:', profileResult);
          
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            console.log('🔍 System admin profile found:', profile);
            return {
              ...user,
              first_name: profile.first_name,
              last_name: profile.last_name,
              phone_number: profile.phone_number,
              address: profile.address
            };
          } else {
            console.log('🔍 No system admin profile found for user_id:', user.id);
          }
          break;
      }
      
      return user;
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      return null;
    }
  }

  // Find user by ID with profile data
  static async findById(id) {
    try {
      console.log('🔍 User.findById called with ID:', id, 'Type:', typeof id);
      
      // Get user data
      const userResult = await query('users', 'select', null, { id, is_active: true });
      console.log('🔍 User query result:', userResult);
      
      if (!userResult.data || userResult.data.length === 0) {
        console.log('🔍 No user found with ID:', id);
        return null;
      }
      
      const user = userResult.data[0];
      console.log('🔍 User found:', user);
      
      // Get profile data based on user type
      let profileResult;
      switch (user.user_type) {
        case 'Student':
          profileResult = await query('students', 'select', null, { user_id: user.id });
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            return {
              ...user,
              id_number: profile.id_number,
              first_name: profile.first_name,
              last_name: profile.last_name,
              age: profile.age,
              year: profile.year,
              date_of_birth: profile.date_of_birth,
              program: profile.program,
              major: profile.major,
              address: profile.address
            };
          }
          break;
          
        case 'Coordinator':
          profileResult = await query('coordinators', 'select', null, { user_id: user.id });
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            return {
              ...user,
              first_name: profile.first_name,
              last_name: profile.last_name,
              program: profile.program,
              phone_number: profile.phone_number,
              address: profile.address
            };
          }
          break;
          
        case 'Company':
          console.log('🔍 Looking for company profile for user_id:', user.id);
          profileResult = await query('companies', 'select', null, { user_id: user.id });
          console.log('🔍 Company profile query result:', profileResult);
          
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            console.log('🔍 Company profile found:', profile);
            return {
              ...user,
              company_name: profile.company_name,
              industry: profile.industry,
              address: profile.address
            };
          } else {
            console.log('🔍 No company profile found for user_id:', user.id);
          }
          break;
          
        case 'System Admin':
          console.log('🔍 Looking for system admin profile for user_id:', user.id);
          profileResult = await query('system_admins', 'select', null, { user_id: user.id });
          console.log('🔍 System admin profile query result:', profileResult);
          
          if (profileResult.data && profileResult.data.length > 0) {
            const profile = profileResult.data[0];
            console.log('🔍 System admin profile found:', profile);
            return {
              ...user,
              first_name: profile.first_name,
              last_name: profile.last_name,
              phone_number: profile.phone_number,
              address: profile.address
            };
          } else {
            console.log('🔍 No system admin profile found for user_id:', user.id);
          }
          break;
      }
      
      return user;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  // Check if email exists
  static async emailExists(email) {
    try {
      const result = await query('users', 'count', null, { email });
      return result.count > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  // Check if ID number exists (for students)
  static async idNumberExists(idNumber) {
    try {
      const result = await query('students', 'count', null, { id_number: idNumber });
      return result.count > 0;
    } catch (error) {
      console.error('Error checking ID number existence:', error);
      return false;
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    // Handle Google OAuth users
    if (hashedPassword === 'google_oauth') {
      return false; // Google users should not use password login
    }
    
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;
