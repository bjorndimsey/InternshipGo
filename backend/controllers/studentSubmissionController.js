const { query } = require('../config/supabase');

/**
 * Student Submission Controller
 * Handles student-submitted requirements for coordinator review
 */

// Submit a requirement (student uploads file)
const submitRequirement = async (req, res) => {
  try {
    const {
      studentId,
      requirementId,
      requirementName,
      requirementDescription,
      isRequired,
      dueDate,
      submittedFileUrl,
      submittedFilePublicId,
      submittedFileName,
      submittedFileSize,
      coordinatorId
    } = req.body;

    console.log('📝 Student submitting requirement:', {
      studentId,
      requirementId,
      requirementName,
      submittedFileName,
      coordinatorId
    });

    // Convert coordinator user_id to coordinators.id
    let actualCoordinatorId = coordinatorId;
    if (coordinatorId) {
      const coordinatorResult = await query('coordinators', 'select', null, { user_id: coordinatorId });
      const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
      
      if (coordinator) {
        actualCoordinatorId = coordinator.id;
        console.log('👨‍🏫 Converted coordinator user_id to id:', coordinatorId, '->', actualCoordinatorId);
      } else {
        console.log('⚠️ Coordinator not found for user_id:', coordinatorId);
        return res.status(400).json({
          success: false,
          message: 'Coordinator not found'
        });
      }
    }

    // Check if submission already exists for this requirement
    const existingSubmission = await query('student_submitted_requirements', 'select', null, {
      student_id: studentId,
      requirement_id: requirementId
    });

    if (existingSubmission.data && existingSubmission.data.length > 0) {
      // Update existing submission
      const updateData = {
        submitted_file_url: submittedFileUrl,
        submitted_file_public_id: submittedFilePublicId,
        submitted_file_name: submittedFileName,
        submitted_file_size: submittedFileSize,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        updated_at: new Date().toISOString()
      };

      const result = await query('student_submitted_requirements', 'update', updateData, {
        student_id: studentId,
        requirement_id: requirementId
      });

      console.log('✅ Updated existing submission');
      res.json({
        success: true,
        message: 'Requirement submission updated successfully',
        submission: result.data[0]
      });
    } else {
      // Create new submission
      const submissionData = {
        student_id: studentId,
        requirement_id: requirementId,
        requirement_name: requirementName,
        requirement_description: requirementDescription,
        is_required: isRequired,
        due_date: dueDate,
        submitted_file_url: submittedFileUrl,
        submitted_file_public_id: submittedFilePublicId,
        submitted_file_name: submittedFileName,
        submitted_file_size: submittedFileSize,
        coordinator_id: actualCoordinatorId, // Use the converted coordinator id
        status: 'submitted'
      };

      const result = await query('student_submitted_requirements', 'insert', submissionData);

      console.log('✅ Created new submission');
      res.json({
        success: true,
        message: 'Requirement submitted successfully',
        submission: result.data[0]
      });
    }
  } catch (error) {
    console.error('Error submitting requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit requirement',
      error: error.message
    });
  }
};

// Get all submissions for a coordinator
const getCoordinatorSubmissions = async (req, res) => {
  try {
    const { coordinatorId } = req.params;
    const { status } = req.query;

    console.log('📋 Fetching submissions for coordinator user_id:', coordinatorId);

    // First, get the coordinator's id from their user_id
    const coordinatorResult = await query('coordinators', 'select', null, { user_id: coordinatorId });
    const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
    
    if (!coordinator) {
      console.log('❌ Coordinator not found for user_id:', coordinatorId);
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'Coordinator not found'
      });
    }

    console.log('👨‍🏫 Found coordinator with id:', coordinator.id);

    let filter = { coordinator_id: coordinator.id };
    if (status) {
      filter.status = status;
    }

    const result = await query('student_submitted_requirements', 'select', null, filter);

    // Get additional student details
    const submissionsWithDetails = await Promise.all(
      (result.data || []).map(async (submission) => {
        // Get student details
        const studentResult = await query('students', 'select', null, { id: submission.student_id });
        const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;

        return {
          ...submission,
          student: student ? {
            first_name: student.first_name,
            last_name: student.last_name,
            id_number: student.id_number,
            program: student.program,
            major: student.major,
            university: student.university
          } : null
        };
      })
    );

    console.log('📋 Found submissions:', submissionsWithDetails.length);

    res.json({
      success: true,
      data: submissionsWithDetails,
      count: submissionsWithDetails.length
    });
  } catch (error) {
    console.error('Error fetching coordinator submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};

// Get submissions for a specific student
const getStudentSubmissions = async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log('📋 Fetching submissions for student:', studentId);

    const result = await query('student_submitted_requirements', 'select', null, {
      student_id: studentId
    });

    console.log('📋 Found student submissions:', result.data?.length || 0);
    console.log('📋 Student submissions data:', result.data);

    res.json({
      success: true,
      data: result.data || [],
      count: result.data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching student submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student submissions',
      error: error.message
    });
  }
};

// Update submission status (coordinator review)
const updateSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, feedback } = req.body;

    console.log('🔄 Updating submission status:', { submissionId, status, feedback });

    const updateData = {
      status: status,
      coordinator_feedback: feedback,
      coordinator_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await query('student_submitted_requirements', 'update', updateData, {
      id: submissionId
    });

    if (!result.data || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    console.log('✅ Submission status updated');

    res.json({
      success: true,
      message: 'Submission status updated successfully',
      submission: result.data[0]
    });
  } catch (error) {
    console.error('Error updating submission status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update submission status',
      error: error.message
    });
  }
};

// Get submission statistics for coordinator dashboard
const getSubmissionStats = async (req, res) => {
  try {
    const { coordinatorId } = req.params;

    console.log('📊 Fetching submission stats for coordinator:', coordinatorId);

    // Get all submissions for this coordinator
    const result = await query('student_submitted_requirements', 'select', null, {
      coordinator_id: coordinatorId
    });

    const submissions = result.data || [];
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total_submissions: submissions.length,
      pending_review: submissions.filter(s => s.status === 'submitted').length,
      approved: submissions.filter(s => s.status === 'approved').length,
      rejected: submissions.filter(s => s.status === 'rejected').length,
      needs_revision: submissions.filter(s => s.status === 'needs_revision').length,
      submissions_this_week: submissions.filter(s => 
        new Date(s.submitted_at) >= oneWeekAgo
      ).length,
      submissions_this_month: submissions.filter(s => 
        new Date(s.submitted_at) >= oneMonthAgo
      ).length
    };

    console.log('📊 Submission stats:', stats);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching submission stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submission statistics',
      error: error.message
    });
  }
};

// Get submission details by ID
const getSubmissionDetails = async (req, res) => {
  try {
    const { submissionId } = req.params;

    console.log('🔍 Fetching submission details:', submissionId);

    const result = await query('student_submitted_requirements', 'select', null, {
      id: submissionId
    });

    if (!result.data || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const submission = result.data[0];

    // Get student details
    const studentResult = await query('students', 'select', null, { id: submission.student_id });
    const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;

    // Get coordinator details
    const coordinatorResult = await query('coordinators', 'select', null, { id: submission.coordinator_id });
    const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;

    const submissionWithDetails = {
      ...submission,
      student: student ? {
        first_name: student.first_name,
        last_name: student.last_name,
        id_number: student.id_number,
        program: student.program,
        major: student.major,
        university: student.university
      } : null,
      coordinator: coordinator ? {
        first_name: coordinator.first_name,
        last_name: coordinator.last_name
      } : null
    };

    res.json({
      success: true,
      submission: submissionWithDetails
    });
  } catch (error) {
    console.error('Error fetching submission details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submission details',
      error: error.message
    });
  }
};

module.exports = {
  submitRequirement,
  getCoordinatorSubmissions,
  getStudentSubmissions,
  updateSubmissionStatus,
  getSubmissionStats,
  getSubmissionDetails
};
