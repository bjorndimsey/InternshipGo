const { query } = require('../config/supabase');
const CompanyController = require('./companyController');

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
        motivation,
        hoursOfInternship
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
        hours_of_internship: hoursOfInternship || null,
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

      // First, check if companyId is actually a user_id and find the corresponding company
      let actualCompanyId = parseInt(companyId);
      
      // Check if this is a user_id by looking for a company with this user_id
      const companyByUserId = await query('companies', 'select', null, {
        user_id: parseInt(companyId)
      });
      
      if (companyByUserId.data && companyByUserId.data.length > 0) {
        // This is a user_id, get the actual company_id
        actualCompanyId = companyByUserId.data[0].id;
        console.log(`Found company_id: ${actualCompanyId} for user_id: ${companyId}`);
      }

      // Get applications for the company
      const applicationsResult = await query('applications', 'select', null, {
        company_id: actualCompanyId
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
          // Get student user details first (since student_id references users.id)
          const userResult = await query('users', 'select', null, {
            id: application.student_id
          });
          
          if (userResult.data && userResult.data.length > 0) {
            const user = userResult.data[0];
            
            // Get student details using the user_id
            const studentResult = await query('students', 'select', null, {
              user_id: application.student_id
            });
            
            const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;
            
            return {
              ...application,
              first_name: student?.first_name || user.first_name || 'N/A',
              last_name: student?.last_name || user.last_name || 'N/A',
              major: student?.major || 'N/A',
              year: student?.year || 'N/A',
              id_number: student?.id_number || 'N/A',
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

      // First, get the current application to check its status and get company_id
      const currentApplicationResult = await query('applications', 'select', null, { id: parseInt(id) });
      
      if (!currentApplicationResult.data || currentApplicationResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const currentApplication = currentApplicationResult.data[0];
      const wasApproved = currentApplication.status === 'approved';
      const willBeApproved = status === 'approved';

      const updateData = {
        status: status,
        notes: notes || null,
        reviewed_by: reviewedBy ? parseInt(reviewedBy) : null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await query('applications', 'update', updateData, { id: parseInt(id) });

      if (result.data) {
        // Handle slot deduction/addition based on approval status changes
        if (willBeApproved && !wasApproved) {
          // Application is being approved - deduct a slot
          console.log(`🎯 Application ${id} approved - deducting slot for company ${currentApplication.company_id}`);
          await CompanyController.deductCompanySlot(currentApplication.company_id);
        } else if (!willBeApproved && wasApproved) {
          // Application is being unapproved (rejected/pending) - add back a slot
          console.log(`🔄 Application ${id} unapproved - adding back slot for company ${currentApplication.company_id}`);
          await CompanyController.addCompanySlot(currentApplication.company_id);
        }

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

      // First, check if companyId is actually a user_id and find the corresponding company
      let actualCompanyId = parseInt(companyId);
      
      // Check if this is a user_id by looking for a company with this user_id
      const companyByUserId = await query('companies', 'select', null, {
        user_id: parseInt(companyId)
      });
      
      if (companyByUserId.data && companyByUserId.data.length > 0) {
        // This is a user_id, get the actual company_id
        actualCompanyId = companyByUserId.data[0].id;
        console.log(`Found company_id: ${actualCompanyId} for user_id: ${companyId}`);
      }

      // Get approved applications for the company
      const applicationsResult = await query('applications', 'select', null, {
        company_id: actualCompanyId,
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
          // Get student user details first (since student_id references users.id)
          const userResult = await query('users', 'select', null, {
            id: application.student_id
          });
          
          if (userResult.data && userResult.data.length > 0) {
            const user = userResult.data[0];
            
            // Get student details using the user_id
            const studentResult = await query('students', 'select', null, {
              user_id: application.student_id
            });
            
            const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;
            
            return {
              ...application,
              first_name: student?.first_name || user.first_name || 'N/A',
              last_name: student?.last_name || user.last_name || 'N/A',
              major: student?.major || 'N/A',
              year: student?.year || 'N/A',
              id_number: student?.id_number || 'N/A',
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

      // Get student user details first (since student_id references users.id)
      const userResult = await query('users', 'select', null, {
        id: application.student_id
      });
      
      let student = null;
      let user = null;
      if (userResult.data && userResult.data.length > 0) {
        user = userResult.data[0];
        
        // Get student details using the user_id
        const studentResult = await query('students', 'select', null, {
          user_id: application.student_id
        });
        
        if (studentResult.data && studentResult.data.length > 0) {
          student = studentResult.data[0];
          student.email = user?.email;
          student.profile_picture = user?.profile_picture;
        }
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
