const { query } = require('../config/supabase');

class TrainingScheduleController {
  // GET /api/training-schedules/:studentId
  // Get all training schedule entries for a student
  static async getTrainingSchedules(req, res) {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      console.log('📋 Fetching training schedules for student:', studentId);

      const result = await query('training_schedules', 'select', null, {
        student_id: parseInt(studentId)
      });

      if (result.error) {
        console.error('❌ Error fetching training schedules:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch training schedules',
          error: result.error.message
        });
      }

      const schedules = result.data || [];

      // Sort by created_at (oldest first) to maintain order
      schedules.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateA.getTime() - dateB.getTime();
      });

      console.log(`✅ Found ${schedules.length} training schedule entries`);

      res.json({
        success: true,
        message: 'Training schedules fetched successfully',
        schedules: schedules
      });
    } catch (error) {
      console.error('❌ Error in getTrainingSchedules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch training schedules',
        error: error.message
      });
    }
  }

  // POST /api/training-schedules
  // Create a new training schedule entry
  static async createTrainingSchedule(req, res) {
    try {
      const { studentId, taskClassification, toolsDeviceSoftwareUsed, totalHours } = req.body;
      const userId = req.user?.id;

      // Verify authentication
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID is required'
        });
      }

      // Verify the authenticated user matches the studentId
      if (userId.toString() !== studentId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only create training schedules for yourself'
        });
      }

      // Validate required fields
      if (!studentId || !taskClassification || !toolsDeviceSoftwareUsed || totalHours === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: studentId, taskClassification, toolsDeviceSoftwareUsed, totalHours'
        });
      }

      // Validate totalHours is a positive number
      const hours = parseFloat(totalHours);
      if (isNaN(hours) || hours <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Total hours must be a positive number'
        });
      }

      console.log('📋 Creating training schedule entry for student:', studentId);

      const scheduleData = {
        student_id: parseInt(studentId),
        task_classification: taskClassification.trim(),
        tools_device_software_used: toolsDeviceSoftwareUsed.trim(),
        total_hours: hours,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await query('training_schedules', 'insert', scheduleData);

      if (result.error) {
        console.error('❌ Error creating training schedule:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create training schedule',
          error: result.error.message
        });
      }

      console.log('✅ Training schedule entry created successfully');

      res.json({
        success: true,
        message: 'Training schedule entry created successfully',
        schedule: result.data
      });
    } catch (error) {
      console.error('❌ Error in createTrainingSchedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create training schedule',
        error: error.message
      });
    }
  }

  // PUT /api/training-schedules/:id
  // Update an existing training schedule entry
  static async updateTrainingSchedule(req, res) {
    try {
      const { id } = req.params;
      const { taskClassification, toolsDeviceSoftwareUsed, totalHours } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID is required'
        });
      }

      // Validate required fields
      if (!taskClassification || !toolsDeviceSoftwareUsed || totalHours === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: taskClassification, toolsDeviceSoftwareUsed, totalHours'
        });
      }

      // Validate totalHours is a positive number
      const hours = parseFloat(totalHours);
      if (isNaN(hours) || hours <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Total hours must be a positive number'
        });
      }

      console.log('📋 Updating training schedule entry:', id);

      // Verify authentication
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID is required'
        });
      }

      // First, verify the schedule exists and belongs to the student
      const existingResult = await query('training_schedules', 'select', null, {
        id: parseInt(id)
      });

      if (existingResult.error || !existingResult.data || existingResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Training schedule entry not found'
        });
      }

      // Verify the schedule belongs to the authenticated user
      const existingSchedule = existingResult.data[0];
      if (existingSchedule.student_id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update your own training schedules'
        });
      }

      const updateData = {
        task_classification: taskClassification.trim(),
        tools_device_software_used: toolsDeviceSoftwareUsed.trim(),
        total_hours: hours,
        updated_at: new Date().toISOString()
      };

      const result = await query('training_schedules', 'update', updateData, {
        id: parseInt(id)
      });

      if (result.error) {
        console.error('❌ Error updating training schedule:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update training schedule',
          error: result.error.message
        });
      }

      console.log('✅ Training schedule entry updated successfully');

      res.json({
        success: true,
        message: 'Training schedule entry updated successfully',
        schedule: result.data
      });
    } catch (error) {
      console.error('❌ Error in updateTrainingSchedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update training schedule',
        error: error.message
      });
    }
  }

  // DELETE /api/training-schedules/:id
  // Delete a training schedule entry
  static async deleteTrainingSchedule(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID is required'
        });
      }

      console.log('📋 Deleting training schedule entry:', id);

      // Verify authentication
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID is required'
        });
      }

      // First, verify the schedule exists
      const existingResult = await query('training_schedules', 'select', null, {
        id: parseInt(id)
      });

      if (existingResult.error || !existingResult.data || existingResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Training schedule entry not found'
        });
      }

      // Verify the schedule belongs to the authenticated user
      const existingSchedule = existingResult.data[0];
      if (existingSchedule.student_id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only delete your own training schedules'
        });
      }

      const result = await query('training_schedules', 'delete', null, {
        id: parseInt(id)
      });

      if (result.error) {
        console.error('❌ Error deleting training schedule:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete training schedule',
          error: result.error.message
        });
      }

      console.log('✅ Training schedule entry deleted successfully');

      res.json({
        success: true,
        message: 'Training schedule entry deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error in deleteTrainingSchedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete training schedule',
        error: error.message
      });
    }
  }
}

module.exports = TrainingScheduleController;

