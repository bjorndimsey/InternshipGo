const { query } = require('../config/supabase');

class StudentController {
  // Get all students
  static async getAllStudents(req, res) {
    try {
      const result = await query('students', 'select');
      
      if (!result.data || result.data.length === 0) {
        return res.json({
          success: true,
          message: 'No students found',
          students: []
        });
      }

      // Get user details for each student
      const studentsWithDetails = await Promise.all(
        result.data.map(async (student) => {
          const userResult = await query('users', 'select', null, { id: student.user_id });
          const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
          
          return {
            id: student.id,
            user_id: student.user_id,
            id_number: student.id_number,
            first_name: student.first_name,
            middle_name: student.middle_name,
            last_name: student.last_name,
            major: student.major,
            program: student.program,
            year: student.year,
            phone_number: student.phone_number,
            gpa: student.gpa,
            university: student.university,
            latitude: student.latitude,
            longitude: student.longitude,
            email: user ? user.email : null,
            profile_picture: user ? user.profile_picture : null,
            is_active: user ? user.is_active : true,
            created_at: student.created_at
          };
        })
      );

      res.json({
        success: true,
        message: 'Students fetched successfully',
        students: studentsWithDetails
      });
    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch students',
        error: error.message
      });
    }
  }

  // Search for students by email or student ID
  static async searchStudent(req, res) {
    try {
      const { email, studentId } = req.body;

      if (!email && !studentId) {
        return res.status(400).json({
          success: false,
          message: 'Either email or studentId is required'
        });
      }

      let result;

      if (email) {
        // Search by email - first get user, then get student
        const userResult = await query('users', 'select', null, { email });
        
        if (!userResult.data || userResult.data.length === 0) {
          return res.json({
            success: false,
            message: 'Student not found'
          });
        }

        const user = userResult.data[0];
        result = await query('students', 'select', null, { user_id: user.id });
      } else if (studentId) {
        // Search by student ID
        result = await query('students', 'select', null, { id_number: studentId });
      }

      if (result.data && result.data.length > 0) {
        const student = result.data[0];
        
        // Get user details for email and profile picture
        const userResult = await query('users', 'select', null, { id: student.user_id });
        const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
        
        return res.json({
          success: true,
          message: 'Student found',
          student: {
            id: student.id,
            id_number: student.id_number,
            first_name: student.first_name,
            last_name: student.last_name,
            major: student.major,
            year: student.year,
            email: user ? user.email : null,
            profile_picture: user ? user.profile_picture : null,
            latitude: student.latitude || null,
            longitude: student.longitude || null,
            created_at: student.created_at
          }
        });
      } else {
        return res.json({
          success: false,
          message: 'Student not found'
        });
      }
    } catch (error) {
      console.error('Error searching for student:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search for student',
        error: error.message
      });
    }
  }

  // Update student profile
  static async updateProfile(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log('Updating student profile:', id);
      console.log('Update data received:', JSON.stringify(updateData, null, 2));

      // First, get the student to find the user_id
      const studentResult = await query('students', 'select', null, { user_id: id });
      
      if (!studentResult.data || studentResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const student = studentResult.data[0];

      // Separate fields for students table vs student_personal_info table
      const studentUpdateData = {};
      const personalInfoUpdateData = {};
      
      // Fields that go to students table
      const allowedStudentFields = [
        'skills', 'interests', 'bio', 'phone_number', 'linkedin_url', 
        'github_url', 'portfolio_url', 'gpa', 'expected_graduation', 
        'availability', 'preferred_location', 'work_experience', 
        'projects', 'achievements', 'first_name', 'middle_name', 'last_name', 
        'age', 'year', 'date_of_birth', 'program', 'major', 'address'
      ];

      // Fields that go to student_personal_info table
      const allowedPersonalInfoFields = [
        'sex', 'civil_status', 'religion', 'citizenship', 'permanent_address',
        'present_address', 'academic_year', 'father_name', 'father_occupation',
        'mother_name', 'mother_occupation', 'emergency_contact_name',
        'emergency_contact_relationship', 'emergency_contact_number',
        'photo_url'
        // Note: emergency_contact_address removed - it now uses permanent_address value
      ];

      // Filter and map the update data
      Object.keys(updateData).forEach(key => {
        if (allowedStudentFields.includes(key) && updateData[key] !== undefined) {
          studentUpdateData[key] = updateData[key];
        } else if (allowedPersonalInfoFields.includes(key) && updateData[key] !== undefined) {
          personalInfoUpdateData[key] = updateData[key];
        }
      });

      // Update the students table
      if (Object.keys(studentUpdateData).length > 0) {
        try {
          studentUpdateData.updated_at = new Date().toISOString();
        const updateResult = await query('students', 'update', studentUpdateData, { user_id: id });
          console.log('✅ Students table updated successfully');
        } catch (error) {
          console.error('❌ Error updating students table:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update student profile',
            error: error.message || 'Unknown error'
          });
        }
      }

      // Update or insert into student_personal_info table
      if (Object.keys(personalInfoUpdateData).length > 0) {
        try {
          // Check if personal info record exists
          let personalInfoResult;
          try {
            personalInfoResult = await query('student_personal_info', 'select', null, { student_id: student.id });
          } catch (selectError) {
            // If table doesn't exist, provide helpful error message
            if (selectError.message && selectError.message.includes('does not exist')) {
              console.error('❌ Table student_personal_info does not exist');
              return res.status(500).json({
                success: false,
                message: 'Personal information table not found. Please run the database migration: backend/database/add-student-personal-info-fields.sql',
                error: selectError.message
              });
            }
            throw selectError;
          }
          
          if (personalInfoResult.data && personalInfoResult.data.length > 0) {
            // Update existing record
            personalInfoUpdateData.updated_at = new Date().toISOString();
            await query('student_personal_info', 'update', personalInfoUpdateData, { student_id: student.id });
            console.log('✅ Personal info updated successfully');
          } else {
            // Insert new record
            personalInfoUpdateData.student_id = student.id;
            personalInfoUpdateData.created_at = new Date().toISOString();
            personalInfoUpdateData.updated_at = new Date().toISOString();
            await query('student_personal_info', 'insert', personalInfoUpdateData);
            console.log('✅ Personal info created successfully');
          }
        } catch (error) {
          console.error('❌ Exception in personal info update:', error);
          // If table doesn't exist, provide helpful error message
          if (error.message && error.message.includes('does not exist')) {
            return res.status(500).json({
              success: false,
              message: 'Personal information table not found. Please run the database migration: backend/database/add-student-personal-info-fields.sql',
              error: error.message
            });
          }
          return res.status(500).json({
            success: false,
            message: 'Failed to save personal information',
            error: error.message || 'Unknown error'
          });
        }
      }

      // Update profile picture and background picture in users table if provided
      const userUpdateData = {};
      if (updateData.profilePicture) {
        userUpdateData.profile_picture = updateData.profilePicture;
      }
      if (updateData.backgroundPicture) {
        userUpdateData.background_picture = updateData.backgroundPicture;
      }

      if (Object.keys(userUpdateData).length > 0) {
        try {
        userUpdateData.updated_at = new Date().toISOString();
          await query('users', 'update', userUpdateData, { id: id });
          console.log('✅ Users table updated successfully');
        } catch (error) {
          console.error('❌ Error updating users table:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update user profile pictures',
            error: error.message || 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        message: 'Student profile updated successfully'
      });

    } catch (error) {
      console.error('Error updating student profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update student profile',
        error: error.message
      });
    }
  }

  // Update student account status (enable/disable)
  static async updateStudentStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      console.log('🔄 updateStudentStatus called:', { id, is_active, type: typeof is_active });

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'is_active must be a boolean value'
        });
      }

      // Get the student to find the user_id
      const studentResult = await query('students', 'select', null, { id: parseInt(id) });
      
      console.log('🔄 Student query result:', studentResult);
      
      if (!studentResult.data || studentResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const student = studentResult.data[0];
      const userId = student.user_id;

      console.log('🔄 Found student:', { studentId: student.id, userId });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Student user_id is missing'
        });
      }

      // Update the user's is_active status
      try {
        const updateResult = await query('users', 'update', { 
          is_active: is_active,
          updated_at: new Date().toISOString()
        }, { id: userId });

        console.log('🔄 Update result:', updateResult);

        // If query throws, it will be caught by outer catch
        // If query succeeds, updateResult will have data property
        if (updateResult.data && updateResult.data.length > 0) {
          res.json({
            success: true,
            message: `Student account ${is_active ? 'enabled' : 'disabled'} successfully`
          });
        } else {
          // Update might have succeeded but no data returned
          res.json({
            success: true,
            message: `Student account ${is_active ? 'enabled' : 'disabled'} successfully`
          });
        }
      } catch (updateError) {
        console.error('🔄 Update error caught:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update student status',
          error: updateError.message || updateError
        });
      }
    } catch (error) {
      console.error('🔄 Error updating student status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update student status',
        error: error.message
      });
    }
  }

  // Delete student
  static async deleteStudent(req, res) {
    try {
      const { id } = req.params;

      console.log('🗑️ deleteStudent called:', { id });

      // Get the student to find the user_id
      const studentResult = await query('students', 'select', null, { id: parseInt(id) });
      
      console.log('🗑️ Student query result:', studentResult);
      
      if (!studentResult.data || studentResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const student = studentResult.data[0];
      const userId = student.user_id;

      console.log('🗑️ Found student:', { studentId: student.id, userId });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Student user_id is missing'
        });
      }

      // Delete the student record first
      try {
        const deleteStudentResult = await query('students', 'delete', null, { id: parseInt(id) });
        console.log('🗑️ Delete student result:', deleteStudentResult);
      } catch (deleteError) {
        console.error('🗑️ Error deleting student record:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete student record',
          error: deleteError.message || deleteError
        });
      }

      // Delete the user record
      try {
        const deleteUserResult = await query('users', 'delete', null, { id: userId });
        console.log('🗑️ Delete user result:', deleteUserResult);
      } catch (deleteError) {
        console.error('🗑️ Error deleting user record:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete user record',
          error: deleteError.message || deleteError
        });
      }

      res.json({
        success: true,
        message: 'Student deleted successfully'
      });
    } catch (error) {
      console.error('🗑️ Error deleting student:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete student',
        error: error.message
      });
    }
  }
}

module.exports = StudentController;
