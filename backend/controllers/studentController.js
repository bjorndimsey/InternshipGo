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
}

module.exports = StudentController;
