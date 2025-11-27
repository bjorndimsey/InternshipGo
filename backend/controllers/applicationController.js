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
            
            // Get academic year and coordinator from classes table via class_enrollments
            let academicYear = null;
            let coordinatorName = null;
            
            if (student && student.id) {
              try {
                // Get active enrollments for this student
                const enrollmentsResult = await query('class_enrollments', 'select', null, {
                  student_id: student.id,
                  status: 'enrolled'
                });
                
                if (enrollmentsResult.data && enrollmentsResult.data.length > 0) {
                  // Get the most recent enrollment's class to get school_year
                  const enrollments = enrollmentsResult.data;
                  // Sort by enrolled_at descending to get the most recent
                  enrollments.sort((a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at));
                  
                  // Get school_year and coordinator from the most recent class
                  for (const enrollment of enrollments) {
                    const classResult = await query('classes', 'select', null, { 
                      id: enrollment.class_id,
                      status: 'active'
                    });
                    
                    if (classResult.data && classResult.data.length > 0) {
                      const classItem = classResult.data[0];
                      academicYear = classItem.school_year;
                      
                      // Get coordinator info
                      const coordinatorResult = await query('coordinators', 'select', null, {
                        id: classItem.coordinator_id
                      });
                      
                      if (coordinatorResult.data && coordinatorResult.data.length > 0) {
                        const coordinator = coordinatorResult.data[0];
                        coordinatorName = `${coordinator.first_name} ${coordinator.last_name}`;
                      }
                      
                      break; // Use the first active class found
                    }
                  }
                }
              } catch (error) {
                // Tables might not exist yet, or other error - just log and continue
                console.log('⚠️ Could not fetch academic year and coordinator from classes:', error.message);
              }
            }
            
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
              student_longitude: user?.longitude,
              academic_year: academicYear,
              coordinator_name: coordinatorName
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

      // If status is 'rejected', delete the application completely
      if (status === 'rejected') {
        console.log(`🗑️ Application ${id} rejected - deleting from database`);
        
        // If it was approved, add back the slot before deleting
        if (wasApproved) {
          console.log(`🔄 Application ${id} was approved - adding back slot for company ${currentApplication.company_id}`);
          await CompanyController.addCompanySlot(currentApplication.company_id);
        }

        // Delete the application
        const deleteResult = await query('applications', 'delete', null, { id: parseInt(id) });

        if (deleteResult.data || deleteResult.error === null) {
          res.json({
            success: true,
            message: 'Application rejected and deleted successfully',
            deleted: true
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to delete application'
          });
        }
        return;
      }

      // For other statuses, update normally
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
          // Application is being unapproved (pending/under-review) - add back a slot
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
      let companyUserId = parseInt(companyId); // Default to companyId as user_id
      
      // Check if this is a user_id by looking for a company with this user_id
      const companyByUserId = await query('companies', 'select', null, {
        user_id: parseInt(companyId)
      });
      
      if (companyByUserId.data && companyByUserId.data.length > 0) {
        // This is a user_id, get the actual company_id
        actualCompanyId = companyByUserId.data[0].id;
        companyUserId = companyByUserId.data[0].user_id; // Get the company's user_id
        console.log(`Found company_id: ${actualCompanyId} for user_id: ${companyId}`);
      } else {
        // If companyId is a company_id, get the user_id
        const companyResult = await query('companies', 'select', ['user_id'], {
          id: parseInt(companyId)
        });
        if (companyResult.data && companyResult.data.length > 0) {
          companyUserId = companyResult.data[0].user_id;
        }
      }

      // Get approved applications for the company WHERE reviewed_by matches the company's user_id
      // This ensures we only get applications that the company itself approved, not coordinator-approved ones
      console.log(`🔍 Fetching approved applications for company_id: ${actualCompanyId}, company_user_id: ${companyUserId}`);
      
      // First, get all approved applications for this company
      const applicationsResult = await query('applications', 'select', null, {
        company_id: actualCompanyId,
        status: 'approved'
      });

      console.log(`📊 Found ${applicationsResult.data?.length || 0} total approved applications for company_id: ${actualCompanyId}`);

      if (!applicationsResult.data || applicationsResult.data.length === 0) {
        return res.json({
          success: true,
          applications: []
        });
      }

      // Filter to only include applications where reviewed_by matches the company's user_id
      // This ensures we only return applications that the company itself approved
      const companyApprovedApplications = applicationsResult.data.filter(app => {
        const reviewedBy = app.reviewed_by;
        const isCompanyApproved = reviewedBy === companyUserId || reviewedBy === parseInt(companyUserId);
        console.log(`🔍 Application ${app.id}: reviewed_by=${reviewedBy}, company_user_id=${companyUserId}, isCompanyApproved=${isCompanyApproved}`);
        return isCompanyApproved;
      });

      console.log(`✅ Filtered to ${companyApprovedApplications.length} applications approved by company (user_id: ${companyUserId})`);

      if (companyApprovedApplications.length === 0) {
        return res.json({
          success: true,
          applications: []
        });
      }

      // Get student and user details for each application
      const applicationsWithDetails = await Promise.all(
        companyApprovedApplications.map(async (application) => {
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
            
            // Get academic year and coordinator from classes table via class_enrollments
            let academicYear = null;
            let coordinatorName = null;
            
            if (student && student.id) {
              try {
                // Get active enrollments for this student
                const enrollmentsResult = await query('class_enrollments', 'select', null, {
                  student_id: student.id,
                  status: 'enrolled'
                });
                
                if (enrollmentsResult.data && enrollmentsResult.data.length > 0) {
                  // Get the most recent enrollment's class to get school_year
                  const enrollments = enrollmentsResult.data;
                  // Sort by enrolled_at descending to get the most recent
                  enrollments.sort((a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at));
                  
                  // Get school_year and coordinator from the most recent class
                  for (const enrollment of enrollments) {
                    const classResult = await query('classes', 'select', null, { 
                      id: enrollment.class_id,
                      status: 'active'
                    });
                    
                    if (classResult.data && classResult.data.length > 0) {
                      const classItem = classResult.data[0];
                      academicYear = classItem.school_year;
                      
                      // Get coordinator info
                      const coordinatorResult = await query('coordinators', 'select', null, {
                        id: classItem.coordinator_id
                      });
                      
                      if (coordinatorResult.data && coordinatorResult.data.length > 0) {
                        const coordinator = coordinatorResult.data[0];
                        coordinatorName = `${coordinator.first_name} ${coordinator.last_name}`;
                      }
                      
                      break; // Use the first active class found
                    }
                  }
                }
              } catch (error) {
                // Tables might not exist yet, or other error - just log and continue
                console.log('⚠️ Could not fetch academic year and coordinator from classes:', error.message);
              }
            }
            
            // Get attendance stats (present days and total hours)
            let presentDays = 0;
            let totalHours = 0;
            
            try {
              const attendanceResult = await query('attendance_records', 'select', ['status', 'total_hours'], {
                user_id: application.student_id,
                company_id: actualCompanyId
              });
              
              if (attendanceResult.data && attendanceResult.data.length > 0) {
                // Count present days (status = 'present' or 'late')
                presentDays = attendanceResult.data.filter(record => 
                  record.status === 'present' || record.status === 'late'
                ).length;
                
                // Calculate total hours
                totalHours = attendanceResult.data.reduce((sum, record) => {
                  return sum + (parseFloat(record.total_hours) || 0);
                }, 0);
              }
            } catch (error) {
              // Attendance table might not exist yet, or other error - just log and continue
              console.log('⚠️ Could not fetch attendance stats:', error.message);
            }
            
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
              student_longitude: user?.longitude,
              started_at: application.started_at || null,
              finished_at: application.finished_at || null,
              academic_year: academicYear,
              coordinator_name: coordinatorName,
              attendance_present_days: presentDays,
              attendance_total_hours: totalHours
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

  // Start internship - Mark application as started
  static async startInternship(req, res) {
    try {
      const { id } = req.params;
      const { studentId } = req.body;

      console.log('🚀 Start Internship API called:', { id, studentId });

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Application ID is required'
        });
      }

      // Get the current application
      console.log('📋 Fetching application with ID:', id);
      const currentApplicationResult = await query('applications', 'select', null, { id: parseInt(id) });
      
      if (currentApplicationResult.error) {
        console.error('❌ Error fetching application:', currentApplicationResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch application',
          error: currentApplicationResult.error.message
        });
      }
      
      if (!currentApplicationResult.data || currentApplicationResult.data.length === 0) {
        console.log('❌ Application not found with ID:', id);
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const currentApplication = currentApplicationResult.data[0];
      console.log('📋 Current application:', {
        id: currentApplication.id,
        student_id: currentApplication.student_id,
        status: currentApplication.status,
        started_at: currentApplication.started_at
      });

      // Verify the application belongs to the student
      if (studentId && parseInt(currentApplication.student_id) !== parseInt(studentId)) {
        console.log('❌ Student ID mismatch:', {
          applicationStudentId: currentApplication.student_id,
          providedStudentId: studentId
        });
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to start this internship'
        });
      }

      // Check if application is approved
      if (currentApplication.status !== 'approved') {
        console.log('❌ Application not approved:', currentApplication.status);
        return res.status(400).json({
          success: false,
          message: 'Application must be approved before starting internship'
        });
      }

      // Check if already started
      if (currentApplication.started_at) {
        console.log('ℹ️ Internship already started:', currentApplication.started_at);
        return res.status(400).json({
          success: false,
          message: 'Internship has already been started',
          application: currentApplication
        });
      }

      // Update application with started_at timestamp
      const startedAtTimestamp = new Date().toISOString();
      const updateData = {
        started_at: startedAtTimestamp,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Updating application with data:', updateData);
      const result = await query('applications', 'update', updateData, { id: parseInt(id) });

      if (result.error) {
        console.error('❌ Error updating application:', result.error);
        // Check if error is about missing column
        if (result.error.message && result.error.message.includes('started_at')) {
          return res.status(500).json({
            success: false,
            message: 'Database column "started_at" does not exist. Please run the migration: backend/database/add-internship-started-at.sql',
            error: result.error.message
          });
        }
        return res.status(500).json({
          success: false,
          message: 'Failed to update application',
          error: result.error.message
        });
      }

      console.log('📊 Update result:', {
        hasData: !!result.data,
        dataLength: result.data?.length,
        result: result
      });

      if (result.data && result.data.length > 0) {
        console.log('✅ Internship started successfully:', result.data[0]);
        res.json({
          success: true,
          message: 'Internship started successfully',
          application: result.data[0]
        });
      } else {
        console.log('⚠️ Update succeeded but no data returned');
        // Even if no data returned, check if update was successful by querying again
        const verifyResult = await query('applications', 'select', null, { id: parseInt(id) });
        if (verifyResult.data && verifyResult.data.length > 0 && verifyResult.data[0].started_at) {
          console.log('✅ Verified: Application was updated successfully');
          res.json({
            success: true,
            message: 'Internship started successfully',
            application: verifyResult.data[0]
          });
        } else {
          console.log('❌ Update verification failed');
          res.status(500).json({
            success: false,
            message: 'Update may have failed. Please check the database.'
          });
        }
      }
    } catch (error) {
      console.error('❌ Error starting internship:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start internship',
        error: error.message
      });
    }
  }

  // Finish internship - Mark application as finished (Company only)
  static async finishInternship(req, res) {
    try {
      const { id } = req.params;
      const { companyId } = req.body;

      console.log('🎉 Finish Internship API called:', { id, companyId });

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Application ID is required'
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      // Get the current application
      console.log('📋 Fetching application with ID:', id);
      const currentApplicationResult = await query('applications', 'select', null, { id: parseInt(id) });
      
      if (currentApplicationResult.error) {
        console.error('❌ Error fetching application:', currentApplicationResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch application',
          error: currentApplicationResult.error.message
        });
      }
      
      if (!currentApplicationResult.data || currentApplicationResult.data.length === 0) {
        console.log('❌ Application not found with ID:', id);
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const currentApplication = currentApplicationResult.data[0];
      console.log('📋 Current application:', {
        id: currentApplication.id,
        company_id: currentApplication.company_id,
        student_id: currentApplication.student_id,
        status: currentApplication.status,
        started_at: currentApplication.started_at
      });

      // Verify the application belongs to the company
      // companyId could be either companies.id or companies.user_id
      // First, try to find company by id (in case companyId is already companies.id)
      let actualCompanyId = parseInt(companyId);
      let companyFound = false;
      
      const companyById = await query('companies', 'select', null, {
        id: parseInt(companyId)
      });
      
      if (companyById.data && companyById.data.length > 0) {
        actualCompanyId = companyById.data[0].id;
        companyFound = true;
        console.log(`✅ Found company by id: ${actualCompanyId}`);
      } else {
        // If not found by id, try to find by user_id
        const companyByUserId = await query('companies', 'select', null, {
          user_id: parseInt(companyId)
        });
        
        if (companyByUserId.data && companyByUserId.data.length > 0) {
          actualCompanyId = companyByUserId.data[0].id;
          companyFound = true;
          console.log(`✅ Found company_id: ${actualCompanyId} for user_id: ${companyId}`);
        }
      }

      if (!companyFound) {
        console.log('❌ Company not found:', { providedCompanyId: companyId });
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      console.log('🔍 Company verification:', {
        applicationCompanyId: currentApplication.company_id,
        actualCompanyId: actualCompanyId,
        match: parseInt(currentApplication.company_id) === actualCompanyId
      });

      if (parseInt(currentApplication.company_id) !== actualCompanyId) {
        console.log('❌ Company ID mismatch:', {
          applicationCompanyId: currentApplication.company_id,
          providedCompanyId: companyId,
          resolvedCompanyId: actualCompanyId
        });
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to finish this internship'
        });
      }

      // Check if internship has been started
      if (!currentApplication.started_at) {
        console.log('❌ Internship not started yet');
        return res.status(400).json({
          success: false,
          message: 'Internship must be started before it can be finished'
        });
      }

      // Update application - set finished_at timestamp to mark as finished
      const finishedAtTimestamp = new Date().toISOString();
      const updateData = {
        finished_at: finishedAtTimestamp,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Finishing internship with data:', updateData);
      console.log('💾 Updating application ID:', id);
      
      // Use Supabase directly for more reliable updates
      const { supabase } = require('../config/supabase');
      const { data: updatedApplication, error: updateError } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', parseInt(id))
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating application:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to finish internship',
          error: updateError.message || 'Database update failed'
        });
      }

      // Verify the update was successful
      if (!updatedApplication || !updatedApplication.finished_at) {
        console.log('⚠️ Update may not have been successful, verifying...');
        const verifyResult = await query('applications', 'select', null, { id: parseInt(id) });
        if (verifyResult.data && verifyResult.data.length > 0 && verifyResult.data[0].finished_at) {
          console.log('✅ Verified: Application was updated successfully');
          updatedApplication = verifyResult.data[0];
        } else {
          console.log('❌ Update verification failed');
          return res.status(500).json({
            success: false,
            message: 'Update may have failed. Please check the database.'
          });
        }
      }

      console.log('📊 Finish result:', {
        updatedApplication: updatedApplication,
        finished_at: updatedApplication?.finished_at,
        id: updatedApplication?.id
      });

      // Get company name for notification
      const companyResult = await query('companies', 'select', ['company_name'], { id: actualCompanyId });
      const companyName = companyResult.data?.[0]?.company_name || 'the company';

      // Create notification for student (if notifications table exists)
      try {
        // Get student's user_id
        const studentUserId = currentApplication.student_id;
        
        // Try to create notification (if notifications table exists)
        // Note: This assumes a notifications table exists. If not, notifications can be generated on-demand.
        const notificationData = {
          user_id: studentUserId,
          title: 'Internship Completed',
          message: `Your internship with ${companyName} has been completed by the company.`,
          type: 'internship_completed',
          is_read: false,
          created_at: new Date().toISOString()
        };
        
        // Attempt to insert notification (will fail gracefully if table doesn't exist)
        try {
          await query('notifications', 'insert', notificationData);
          console.log('✅ Notification created for student:', studentUserId);
        } catch (notificationError) {
          console.log('ℹ️ Notifications table may not exist, skipping notification creation:', notificationError.message);
          // Continue without failing the request
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating notification:', notificationError);
        // Don't fail the request if notification creation fails
      }

      console.log('✅ Internship finished successfully:', updatedApplication);
      res.json({
        success: true,
        message: 'Internship finished successfully',
        application: updatedApplication
      });
    } catch (error) {
      console.error('❌ Error finishing internship:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to finish internship',
        error: error.message
      });
    }
  }
}

module.exports = ApplicationController;
