const { query } = require('../config/supabase');

class InternFeedbackFormController {
  // GET /api/intern-feedback-forms/:studentId/:companyId
  // Get feedback form for a specific student and company
  static async getFeedbackForm(req, res) {
    try {
      const { studentId, companyId } = req.params;

      if (!studentId || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID and Company ID are required'
        });
      }

      console.log('📋 Fetching feedback form for student:', studentId, 'company:', companyId);

      const result = await query('intern_feedback_forms', 'select', null, {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId)
      });

      if (result.error) {
        console.error('❌ Error fetching feedback form:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch feedback form',
          error: result.error.message
        });
      }

      const feedbackForm = result.data && result.data.length > 0 ? result.data[0] : null;

      console.log(feedbackForm ? '✅ Found feedback form' : 'ℹ️ No feedback form found');

      res.json({
        success: true,
        message: feedbackForm ? 'Feedback form fetched successfully' : 'No feedback form found',
        feedbackForm: feedbackForm
      });
    } catch (error) {
      console.error('❌ Error in getFeedbackForm:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch feedback form',
        error: error.message
      });
    }
  }

  // POST /api/intern-feedback-forms
  // Create a new feedback form
  static async createFeedbackForm(req, res) {
    try {
      const {
        studentId,
        companyId,
        question1,
        question2,
        question3,
        question4,
        question5,
        question6,
        question7,
        problemsMet,
        otherConcerns,
        formDate
      } = req.body;

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
          message: 'Forbidden: You can only create feedback forms for yourself'
        });
      }

      // Validate required fields
      if (!studentId || !companyId || !question1 || !question2 || !question3 || !question4 || 
          !question5 || !question6 || !question7 || !problemsMet || !otherConcerns) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: all questions, problemsMet, and otherConcerns are required'
        });
      }

      // Validate question responses
      const validResponses = ['SA', 'A', 'N', 'D', 'SD'];
      const questions = [question1, question2, question3, question4, question5, question6, question7];
      for (let i = 0; i < questions.length; i++) {
        if (!validResponses.includes(questions[i])) {
          return res.status(400).json({
            success: false,
            message: `Question ${i + 1} must be one of: SA, A, N, D, SD`
          });
        }
      }

      // Validate problemsMet and otherConcerns are not empty
      if (!problemsMet.trim() || !otherConcerns.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Problems Met and Other Concerns cannot be empty'
        });
      }

      // Check if feedback form already exists
      const existingResult = await query('intern_feedback_forms', 'select', null, {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId)
      });

      if (existingResult.data && existingResult.data.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Feedback form already exists for this company. Use PUT to update it.'
        });
      }

      // Use provided formDate or current date
      const dateToUse = formDate || new Date().toISOString().split('T')[0];

      console.log('📋 Creating feedback form for student:', studentId, 'company:', companyId);

      const feedbackData = {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId),
        question_1: question1,
        question_2: question2,
        question_3: question3,
        question_4: question4,
        question_5: question5,
        question_6: question6,
        question_7: question7,
        problems_met: problemsMet.trim(),
        other_concerns: otherConcerns.trim(),
        form_date: dateToUse,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await query('intern_feedback_forms', 'insert', feedbackData);

      if (result.error) {
        console.error('❌ Error creating feedback form:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create feedback form',
          error: result.error.message
        });
      }

      console.log('✅ Feedback form created successfully');

      res.json({
        success: true,
        message: 'Feedback form created successfully',
        feedbackForm: result.data
      });
    } catch (error) {
      console.error('❌ Error in createFeedbackForm:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create feedback form',
        error: error.message
      });
    }
  }

  // PUT /api/intern-feedback-forms/:id
  // Update an existing feedback form
  static async updateFeedbackForm(req, res) {
    try {
      const { id } = req.params;
      const {
        question1,
        question2,
        question3,
        question4,
        question5,
        question6,
        question7,
        problemsMet,
        otherConcerns,
        formDate
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Feedback form ID is required'
        });
      }

      // Validate required fields
      if (!question1 || !question2 || !question3 || !question4 || 
          !question5 || !question6 || !question7 || !problemsMet || !otherConcerns) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: all questions, problemsMet, and otherConcerns are required'
        });
      }

      // Validate question responses
      const validResponses = ['SA', 'A', 'N', 'D', 'SD'];
      const questions = [question1, question2, question3, question4, question5, question6, question7];
      for (let i = 0; i < questions.length; i++) {
        if (!validResponses.includes(questions[i])) {
          return res.status(400).json({
            success: false,
            message: `Question ${i + 1} must be one of: SA, A, N, D, SD`
          });
        }
      }

      // Validate problemsMet and otherConcerns are not empty
      if (!problemsMet.trim() || !otherConcerns.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Problems Met and Other Concerns cannot be empty'
        });
      }

      console.log('📋 Updating feedback form:', id);

      // Verify authentication
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID is required'
        });
      }

      // First, verify the feedback form exists and belongs to the student
      const existingResult = await query('intern_feedback_forms', 'select', null, {
        id: parseInt(id)
      });

      if (existingResult.error || !existingResult.data || existingResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Feedback form not found'
        });
      }

      // Verify the feedback form belongs to the authenticated user
      const existingForm = existingResult.data[0];
      if (existingForm.student_id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update your own feedback forms'
        });
      }

      // Use provided formDate or current date (update to current date when editing)
      const dateToUse = formDate || new Date().toISOString().split('T')[0];

      const updateData = {
        question_1: question1,
        question_2: question2,
        question_3: question3,
        question_4: question4,
        question_5: question5,
        question_6: question6,
        question_7: question7,
        problems_met: problemsMet.trim(),
        other_concerns: otherConcerns.trim(),
        form_date: dateToUse,
        updated_at: new Date().toISOString()
      };

      const result = await query('intern_feedback_forms', 'update', updateData, {
        id: parseInt(id)
      });

      if (result.error) {
        console.error('❌ Error updating feedback form:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update feedback form',
          error: result.error.message
        });
      }

      console.log('✅ Feedback form updated successfully');

      res.json({
        success: true,
        message: 'Feedback form updated successfully',
        feedbackForm: result.data
      });
    } catch (error) {
      console.error('❌ Error in updateFeedbackForm:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update feedback form',
        error: error.message
      });
    }
  }
}

module.exports = InternFeedbackFormController;

