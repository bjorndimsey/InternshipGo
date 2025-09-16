const { query } = require('../config/supabase');

class ApplicationController {
  // Submit a new application
  static async submitApplication(req, res) {
    try {
      const {
        studentId,
        companyId,
        position,
        department,
        coverLetter,
        resumeUrl,
        resumePublicId,
        transcriptUrl,
        transcriptPublicId,
        expectedStartDate,
        expectedEndDate,
        availability,
        motivation
      } = req.body;

      // Validate required fields
      if (!studentId || !companyId || !position) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: studentId, companyId, position'
        });
      }

      // Check if student already applied to this company
      const existingApplication = await query('applications', 'select', null, {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId)
      });

      if (existingApplication.data && existingApplication.data.length > 0) {
        const existing = existingApplication.data[0];
        if (['pending', 'under-review', 'approved'].includes(existing.status)) {
          return res.status(409).json({
            success: false,
            message: 'You have already applied to this company'
          });
        }
      }

      // Create application data
      const applicationData = {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId),
        position: position,
        department: department || null,
        cover_letter: coverLetter || null,
        resume_url: resumeUrl || null,
        resume_public_id: resumePublicId || null,
        transcript_url: transcriptUrl || null,
        transcript_public_id: transcriptPublicId || null,
        expected_start_date: expectedStartDate || null,
        expected_end_date: expectedEndDate || null,
        availability: availability || null,
        motivation: motivation || null,
        status: 'pending',
        applied_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert application
      const result = await query('applications', 'insert', applicationData);

      if (result.data) {
        res.json({
          success: true,
          message: 'Application submitted successfully',
          application: result.data
        });
      } else {
        throw new Error('Failed to create application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
        error: error.message
      });
    }
  }

  // Get applications by student
  static async getStudentApplications(req, res) {
    try {
      const { studentId } = req.params;

      // Get applications for the student
      const applicationsResult = await query('applications', 'select', null, {
        student_id: parseInt(studentId)
      });

      if (!applicationsResult.data || applicationsResult.data.length === 0) {
        return res.json({
          success: true,
          applications: []
        });
      }

      // Get company and user details for each application
      const applicationsWithDetails = await Promise.all(
        applicationsResult.data.map(async (application) => {
          // Get company details
          const companyResult = await query('companies', 'select', null, {
            id: application.company_id
          });
          
          if (companyResult.data && companyResult.data.length > 0) {
            const company = companyResult.data[0];
            
            // Get company user details
            const userResult = await query('users', 'select', null, {
              id: company.user_id
            });
            
            const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
            
            return {
              ...application,
              company_name: company.company_name,
              industry: company.industry,
              company_address: company.address,
              company_profile_picture: user?.profile_picture
            };
          }
          
          return application;
        })
      );

      res.json({
        success: true,
        applications: applicationsWithDetails
      });
    } catch (error) {
      console.error('Error fetching student applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications',
        error: error.message
      });
    }
  }

  // Get applications by company
  static async getCompanyApplications(req, res) {
    try {
      const { companyId } = req.params;

      // Get applications for the company
      const applicationsResult = await query('applications', 'select', null, {
        company_id: parseInt(companyId)
      });

      if (!applicationsResult.data || applicationsResult.data.length === 0) {
        return res.json({
          success: true,
          applications: []
        });
      }

      // Get student and user details for each application
      const applicationsWithDetails = await Promise.all(
        applicationsResult.data.map(async (application) => {
          // Get student details
          const studentResult = await query('students', 'select', null, {
            user_id: application.student_id
          });
          
          if (studentResult.data && studentResult.data.length > 0) {
            const student = studentResult.data[0];
            
            // Get student user details
            const userResult = await query('users', 'select', null, {
              id: application.student_id
            });
            
            const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
            
            return {
              ...application,
              first_name: student.first_name,
              last_name: student.last_name,
              major: student.major,
              year: student.year,
              student_email: user?.email,
              student_profile_picture: user?.profile_picture,
              student_latitude: user?.latitude,
              student_longitude: user?.longitude
            };
          }
          
          return application;
        })
      );

      res.json({
        success: true,
        applications: applicationsWithDetails
      });
    } catch (error) {
      console.error('Error fetching company applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications',
        error: error.message
      });
    }
  }

  // Update application status
  static async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes, reviewedBy } = req.body;

      if (!status || !['pending', 'under-review', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: pending, under-review, approved, rejected'
        });
      }

      const updateData = {
        status: status,
        notes: notes || null,
        reviewed_by: reviewedBy ? parseInt(reviewedBy) : null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await query('applications', 'update', updateData, { id: parseInt(id) });

      if (result.data) {
        res.json({
          success: true,
          message: 'Application status updated successfully',
          application: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application status',
        error: error.message
      });
    }
  }

  // Get approved applications by company
  static async getApprovedApplications(req, res) {
    try {
      const { companyId } = req.params;

      // Get approved applications for the company
      const applicationsResult = await query('applications', 'select', null, {
        company_id: parseInt(companyId),
        status: 'approved'
      });

      if (!applicationsResult.data || applicationsResult.data.length === 0) {
        return res.json({
          success: true,
          applications: []
        });
      }

      // Get student and user details for each application
      const applicationsWithDetails = await Promise.all(
        applicationsResult.data.map(async (application) => {
          // Get student details
          const studentResult = await query('students', 'select', null, {
            user_id: application.student_id
          });
          
          if (studentResult.data && studentResult.data.length > 0) {
            const student = studentResult.data[0];
            
            // Get student user details
            const userResult = await query('users', 'select', null, {
              id: application.student_id
            });
            
            const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
            
            return {
              ...application,
              first_name: student.first_name,
              last_name: student.last_name,
              major: student.major,
              year: student.year,
              student_email: user?.email,
              student_profile_picture: user?.profile_picture,
              student_latitude: user?.latitude,
              student_longitude: user?.longitude
            };
          }
          
          return application;
        })
      );

      res.json({
        success: true,
        applications: applicationsWithDetails
      });
    } catch (error) {
      console.error('Error fetching approved applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch approved applications',
        error: error.message
      });
    }
  }

  // Get application by ID
  static async getApplicationById(req, res) {
    try {
      const { id } = req.params;

      // Get application
      const applicationResult = await query('applications', 'select', null, {
        id: parseInt(id)
      });

      if (!applicationResult.data || applicationResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const application = applicationResult.data[0];

      // Get company details
      const companyResult = await query('companies', 'select', null, {
        id: application.company_id
      });
      
      let company = null;
      if (companyResult.data && companyResult.data.length > 0) {
        company = companyResult.data[0];
        
        // Get company user details
        const userResult = await query('users', 'select', null, {
          id: company.user_id
        });
        
        const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
        company.profile_picture = user?.profile_picture;
      }

      // Get student details
      const studentResult = await query('students', 'select', null, {
        user_id: application.student_id
      });
      
      let student = null;
      if (studentResult.data && studentResult.data.length > 0) {
        student = studentResult.data[0];
        
        // Get student user details
        const userResult = await query('users', 'select', null, {
          id: application.student_id
        });
        
        const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
        student.email = user?.email;
        student.profile_picture = user?.profile_picture;
      }

      const applicationWithDetails = {
        ...application,
        company_name: company?.company_name,
        industry: company?.industry,
        company_address: company?.address,
        company_profile_picture: company?.profile_picture,
        first_name: student?.first_name,
        last_name: student?.last_name,
        major: student?.major,
        year: student?.year,
        student_email: student?.email,
        student_profile_picture: student?.profile_picture
      };

      res.json({
        success: true,
        application: applicationWithDetails
      });
    } catch (error) {
      console.error('Error fetching application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application',
        error: error.message
      });
    }
  }
}

module.exports = ApplicationController;
