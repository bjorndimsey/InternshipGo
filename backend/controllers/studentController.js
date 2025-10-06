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
            id_number: student.id_number,
            first_name: student.first_name,
            middle_name: student.middle_name,
            last_name: student.last_name,
            major: student.major,
            year: student.year,
            phone_number: student.phone_number,
            gpa: student.gpa,
            university: student.university,
            latitude: student.latitude,
            longitude: student.longitude,
            email: user ? user.email : null,
            profile_picture: user ? user.profile_picture : null,
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

      console.log('Updating student profile:', id, updateData);

      // First, get the student to find the user_id
      const studentResult = await query('students', 'select', null, { user_id: id });
      
      if (!studentResult.data || studentResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const student = studentResult.data[0];

      // Prepare the update data for students table
      const studentUpdateData = {};
      const allowedStudentFields = [
        'skills', 'interests', 'bio', 'phone_number', 'linkedin_url', 
        'github_url', 'portfolio_url', 'gpa', 'expected_graduation', 
        'availability', 'preferred_location', 'work_experience', 
        'projects', 'achievements', 'first_name', 'middle_name', 'last_name', 
        'age', 'year', 'date_of_birth', 'program', 'major', 'address'
      ];

      // Filter and map the update data
      Object.keys(updateData).forEach(key => {
        if (allowedStudentFields.includes(key) && updateData[key] !== undefined) {
          studentUpdateData[key] = updateData[key];
        }
      });

      // Add updated_at timestamp
      studentUpdateData.updated_at = new Date().toISOString();

      // Update the students table
      if (Object.keys(studentUpdateData).length > 0) {
        const updateResult = await query('students', 'update', studentUpdateData, { user_id: id });
        
        if (!updateResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update student profile',
            error: updateResult.error
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
        userUpdateData.updated_at = new Date().toISOString();
        const userUpdateResult = await query('users', 'update', userUpdateData, { id: id });
        
        if (!userUpdateResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update user profile pictures',
            error: userUpdateResult.error
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
}

module.exports = StudentController;
