const { query } = require('../config/supabase');

class InternController {
  // Add student as intern
  static async addStudentAsIntern(req, res) {
    try {
      const { studentId, schoolYear, coordinatorId } = req.body;

      if (!studentId || !schoolYear || !coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'studentId, schoolYear, and coordinatorId are required'
        });
      }

      let coordinatorUserId;

      // Check if coordinatorId is a coordinator ID or user ID
      // First try to find by coordinator ID
      const coordinatorResult = await query('coordinators', 'select', ['user_id'], { id: parseInt(coordinatorId) });
      
      if (coordinatorResult.data && coordinatorResult.data.length > 0) {
        // coordinatorId is a coordinator ID
        coordinatorUserId = coordinatorResult.data[0].user_id;
      } else {
        // Try to find by user_id (in case coordinatorId is actually a user ID)
        const coordinatorByUserIdResult = await query('coordinators', 'select', ['user_id'], { user_id: parseInt(coordinatorId) });
        
        if (coordinatorByUserIdResult.data && coordinatorByUserIdResult.data.length > 0) {
          // coordinatorId is a user ID
          coordinatorUserId = parseInt(coordinatorId);
        } else {
          return res.status(404).json({
            success: false,
            message: 'Coordinator not found'
          });
        }
      }

      // Check if student is already an intern for this school year
      const existingResult = await query('interns', 'select', null, { 
        student_id: studentId, 
        school_year: schoolYear 
      });
      
      if (existingResult.data && existingResult.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Student is already an intern for this school year'
        });
      }

      // Add student as intern
      const internData = {
        student_id: studentId,
        school_year: schoolYear,
        coordinator_id: coordinatorUserId, // Use the user_id, not the coordinator id
        status: 'active'
      };

      const result = await query('interns', 'insert', internData);

      if (result.data && result.data.length > 0) {
        return res.json({
          success: true,
          message: 'Student added as intern successfully',
          internId: result.data[0].id
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to add student as intern'
        });
      }
    } catch (error) {
      console.error('Error adding student as intern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add student as intern',
        error: error.message
      });
    }
  }

  // Get interns for a specific coordinator
  static async getCoordinatorInterns(req, res) {
    try {
      const { coordinatorId } = req.params;

      if (!coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'Coordinator ID is required'
        });
      }

      let coordinatorUserId;

      // Check if coordinatorId is a coordinator ID or user ID
      // First try to find by coordinator ID
      const coordinatorResult = await query('coordinators', 'select', ['user_id'], { id: parseInt(coordinatorId) });
      
      if (coordinatorResult.data && coordinatorResult.data.length > 0) {
        // coordinatorId is a coordinator ID
        coordinatorUserId = coordinatorResult.data[0].user_id;
      } else {
        // Try to find by user_id (in case coordinatorId is actually a user ID)
        const coordinatorByUserIdResult = await query('coordinators', 'select', ['user_id'], { user_id: parseInt(coordinatorId) });
        
        if (coordinatorByUserIdResult.data && coordinatorByUserIdResult.data.length > 0) {
          // coordinatorId is a user ID
          coordinatorUserId = parseInt(coordinatorId);
        } else {
          return res.status(404).json({
            success: false,
            message: 'Coordinator not found'
          });
        }
      }

      // Get interns for this coordinator (using user_id)
      const internsResult = await query('interns', 'select', null, { coordinator_id: coordinatorUserId });
      
      if (!internsResult.data || internsResult.data.length === 0) {
        return res.json({
          success: true,
          message: 'No interns found',
          interns: []
        });
      }

      // Get student details for each intern
      const internsWithDetails = await Promise.all(
        internsResult.data.map(async (intern) => {
          // Get student details
          const studentResult = await query('students', 'select', null, { id: intern.student_id });
          const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;
          
          if (!student) {
            return null;
          }

          // Get user details
          const userResult = await query('users', 'select', null, { id: student.user_id });
          const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;

          return {
            id: intern.id,
            school_year: intern.school_year,
            status: intern.status,
            created_at: intern.created_at,
            student_id: student.id,
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
            profile_picture: user ? user.profile_picture : null
          };
        })
      );

      // Filter out null values
      const validInterns = internsWithDetails.filter(intern => intern !== null);

      return res.json({
        success: true,
        message: 'Interns fetched successfully',
        interns: validInterns
      });
    } catch (error) {
      console.error('Error fetching coordinator interns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch interns',
        error: error.message
      });
    }
  }
}

module.exports = InternController;
