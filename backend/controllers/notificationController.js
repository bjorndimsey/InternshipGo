const { query } = require('../config/supabase');

class NotificationController {
  // Get attendance notifications for a student
  static async getStudentAttendanceNotifications(studentId) {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      console.log('🔍 [DEBUG] getStudentAttendanceNotifications called with studentId:', studentId, 'type:', typeof studentId);
      console.log('📅 [DEBUG] Today date:', today);
      console.log('📅 [DEBUG] Today date type:', typeof today);
      console.log('📅 [DEBUG] Current time:', new Date().toISOString());
      
      // Get the student's user_id from the students table
      console.log('🔍 [DEBUG] Querying students table for studentId:', parseInt(studentId));
      const studentResult = await query('students', 'select', ['user_id'], { id: parseInt(studentId) });
      console.log('🔍 [DEBUG] Student query result:', studentResult);
      
      if (!studentResult.data || studentResult.data.length === 0) {
        console.log('❌ [DEBUG] Student not found in database');
        return [];
      }

      const userId = studentResult.data[0].user_id;
      console.log('✅ [DEBUG] Found student user_id:', userId, 'type:', typeof userId);

      const notifications = [];

      // Get today's attendance records for this student
      console.log('🔍 [DEBUG] Querying attendance_records with userId:', userId, 'attendance_date:', today);
      const attendanceResult = await query('attendance_records', 'select', null, {
        user_id: userId,
        attendance_date: today
      });
      console.log('🔍 [DEBUG] Attendance query result:', attendanceResult);

      if (attendanceResult.data && attendanceResult.data.length > 0) {
        console.log(`✅ [DEBUG] Found ${attendanceResult.data.length} attendance records for student on ${today}`);
        console.log('🔍 [DEBUG] Raw attendance records:', attendanceResult.data);
        
        for (const record of attendanceResult.data) {
          console.log('🔍 [DEBUG] Processing record:', record);
          
          // Get company details
          console.log('🔍 [DEBUG] Querying companies table for company_id:', record.company_id);
          const companyResult = await query('companies', 'select', ['company_name'], { 
            id: record.company_id 
          });
          console.log('🔍 [DEBUG] Company query result:', companyResult);
          const company = companyResult.data?.[0];

          if (company) {
            const status = record.status;
            console.log('🔍 [DEBUG] Creating notification for status:', status, 'company:', company.company_name);
            
            let notification = {
              id: `attendance_${record.id}_${today}`,
              title: `Daily Attendance Update`,
              message: `You are marked as ${status.toUpperCase()} today at ${company.company_name}`,
              type: NotificationController.getStudentAttendanceNotificationType(status),
              timestamp: new Date().toISOString(),
              isRead: false,
              isImportant: status === 'absent' || status === 'leave',
              action: 'View Details',
              data: {
                status,
                attendanceDate: today,
                companyId: record.company_id,
                companyName: company.company_name,
                amTimeIn: record.am_time_in,
                amTimeOut: record.am_time_out,
                pmTimeIn: record.pm_time_in,
                pmTimeOut: record.pm_time_out,
                totalHours: record.total_hours
              }
            };

            // Format timestamp
            notification.timestamp = NotificationController.formatTimestamp(notification.timestamp);

            notifications.push(notification);
            console.log(`✅ [DEBUG] Created attendance notification for student: ${status}`, notification);
          } else {
            console.log('❌ [DEBUG] Company not found for company_id:', record.company_id);
          }
        }
      } else {
        console.log('❌ [DEBUG] No attendance records found for student today');
        console.log('🔍 [DEBUG] Checking if there are any attendance records at all...');
        
        // Debug: Check if there are any attendance records for this user on any date
        const allAttendanceResult = await query('attendance_records', 'select', null, {
          user_id: userId
        });
        console.log('🔍 [DEBUG] All attendance records for user:', allAttendanceResult);
        
        // Debug: Check if there are any attendance records for today (any user)
        const todayAttendanceResult = await query('attendance_records', 'select', null, {
          attendance_date: today
        });
        console.log('🔍 [DEBUG] All attendance records for today:', todayAttendanceResult);
        
        // Debug: Check if there are any attendance records at all
        const allRecordsResult = await query('attendance_records', 'select', null, {});
        console.log('🔍 [DEBUG] Total attendance records in database:', allRecordsResult.data ? allRecordsResult.data.length : 0);
        if (allRecordsResult.data && allRecordsResult.data.length > 0) {
          console.log('🔍 [DEBUG] Sample attendance record:', allRecordsResult.data[0]);
        }
      }

      console.log(`🔔 Generated ${notifications.length} attendance notifications for student`);
      return notifications;

    } catch (error) {
      console.error('❌ Error fetching student attendance notifications:', error);
      return [];
    }
  }

  // Get notification type based on attendance status for students
  static getStudentAttendanceNotificationType(status) {
    switch (status) {
      case 'present': return 'success';
      case 'late': return 'warning';
      case 'absent': return 'error';
      case 'leave': return 'info';
      default: return 'info';
    }
  }

  // Get notifications for a student
  static async getStudentNotifications(req, res) {
    try {
      const { userId } = req.params;
      console.log('🔍 [DEBUG] getStudentNotifications called with userId:', userId, 'type:', typeof userId);
      
      // First, get the student ID from the user ID
      const studentResult = await query('students', 'select', ['id'], { user_id: parseInt(userId) });
      console.log('🔍 [DEBUG] Student lookup result:', studentResult);
      
      if (!studentResult.data || studentResult.data.length === 0) {
        console.log('❌ [DEBUG] No student found for user_id:', userId);
        return res.json({
          success: true,
          notifications: []
        });
      }
      
      const studentId = studentResult.data[0].id;
      console.log('✅ [DEBUG] Found student ID:', studentId, 'for user ID:', userId);
      
      const notifications = [];

      // 1. Get attendance notifications for today
      console.log('🔍 [DEBUG] Fetching attendance notifications for student:', studentId);
      const attendanceNotifications = await NotificationController.getStudentAttendanceNotifications(studentId);
      console.log('🔍 [DEBUG] Attendance notifications result:', attendanceNotifications);
      notifications.push(...attendanceNotifications);

      // 2. Get application status notifications
      // Note: applications table uses user_id as student_id
      const applicationsResult = await query('applications', 'select', null, { 
        student_id: parseInt(userId) 
      });

      if (applicationsResult.data && applicationsResult.data.length > 0) {
        for (const application of applicationsResult.data) {
          // Get company details
          const companyResult = await query('companies', 'select', null, { 
            id: application.company_id 
          });
          const company = companyResult.data?.[0];

          if (company) {
            let notification = {
              id: `app_${application.id}`,
              type: 'application',
              title: 'Application Status Update',
              message: `Your application to ${company.company_name} has been ${application.status}.`,
              status: application.status,
              timestamp: application.reviewed_at || application.applied_at,
              isRead: false, // This would need to be tracked in a notifications table
              isImportant: application.status === 'approved' || application.status === 'rejected',
              action: application.status === 'approved' ? 'View Details' : null,
              data: {
                applicationId: application.id,
                companyId: application.company_id,
                companyName: company.company_name,
                position: application.position,
                notes: application.notes
              }
            };

            // Format timestamp
            if (notification.timestamp) {
              notification.timestamp = NotificationController.formatTimestamp(notification.timestamp);
            }

            notifications.push(notification);
          }
        }
      }

      // 3. Get coordinator assignment notifications
      const internResult = await query('interns', 'select', null, { 
        student_id: parseInt(studentId) 
      });

      if (internResult.data && internResult.data.length > 0) {
        const intern = internResult.data[0];
        
        // Get coordinator details
        const coordinatorResult = await query('coordinators', 'select', null, { 
          user_id: intern.coordinator_id 
        });
        const coordinator = coordinatorResult.data?.[0];

        if (coordinator) {
          const assignmentNotification = {
            id: `assignment_${intern.id}`,
            type: 'assignment',
            title: 'Coordinator Assignment',
            message: `You have been assigned to ${coordinator.first_name} ${coordinator.last_name} as your internship coordinator.`,
            status: 'assigned',
            timestamp: intern.created_at || new Date().toISOString(),
            isRead: false,
            isImportant: true,
            action: 'View Coordinator Profile',
            data: {
              coordinatorId: coordinator.id,
              coordinatorName: `${coordinator.first_name} ${coordinator.last_name}`,
              schoolYear: intern.school_year,
              status: intern.status
            }
          };

          assignmentNotification.timestamp = NotificationController.formatTimestamp(assignmentNotification.timestamp);
          notifications.push(assignmentNotification);
        }
      }

      // 3. Get requirement notifications
      console.log('🔍 Fetching requirements for student ID:', studentId);
      const requirementsResult = await query('student_requirements', 'select', null, { 
        student_id: studentId 
      });
      
      console.log('🔍 Requirements query result:', requirementsResult);
      console.log('🔍 Requirements found:', requirementsResult.data?.length || 0);

      if (requirementsResult.data && requirementsResult.data.length > 0) {
        for (const requirement of requirementsResult.data) {
          // Get coordinator details for the requirement
          const coordinatorResult = await query('coordinators', 'select', null, { 
            id: requirement.coordinator_id 
          });
          const coordinator = coordinatorResult.data?.[0];

          const requirementNotification = {
            id: `req_${requirement.requirement_id}`,
            type: 'requirement',
            title: 'New Requirement',
            message: `${coordinator ? coordinator.first_name + ' ' + coordinator.last_name : 'Your coordinator'} has assigned a new requirement: ${requirement.requirement_name}.`,
            status: requirement.completed ? 'completed' : 'pending',
            timestamp: requirement.created_at || new Date().toISOString(),
            isRead: false,
            isImportant: requirement.is_required,
            action: requirement.completed ? 'View Submission' : 'Submit Requirement',
            data: {
              requirementId: requirement.requirement_id,
              requirementName: requirement.requirement_name,
              description: requirement.requirement_description,
              isRequired: requirement.is_required,
              dueDate: requirement.due_date,
              completed: requirement.completed,
              coordinatorId: requirement.coordinator_id,
              coordinatorName: coordinator ? `${coordinator.first_name} ${coordinator.last_name}` : 'Unknown'
            }
          };

          requirementNotification.timestamp = NotificationController.formatTimestamp(requirementNotification.timestamp);
          notifications.push(requirementNotification);
        }
      } else {
        console.log('⚠️ No requirements found for student ID:', studentId);
      }

      // 4. Get approved requirement notifications from submissions
      console.log('🔍 Fetching approved submissions for student ID:', studentId);
      
      // Get submissions using the student ID (we already have the correct studentId)
      const allSubmissionsResult = await query('student_submitted_requirements', 'select', null, { 
        student_id: studentId
      });
      console.log('🔍 All submissions for student:', allSubmissionsResult);
      console.log('🔍 All submissions count:', allSubmissionsResult.data?.length || 0);
      
      // Get approved submissions
      const submissionsResult = await query('student_submitted_requirements', 'select', null, { 
          student_id: studentId,
          status: 'approved'
        });

        console.log('🔍 Approved submissions result:', submissionsResult);
        console.log('🔍 Approved submissions count:', submissionsResult.data?.length || 0);

        if (submissionsResult.data && submissionsResult.data.length > 0) {
          for (const submission of submissionsResult.data) {
            // Get coordinator details for the submission
            const coordinatorResult = await query('coordinators', 'select', null, { 
              id: submission.coordinator_id 
            });
            const coordinator = coordinatorResult.data?.[0];

            const approvedNotification = {
              id: `approved_${submission.requirement_id}`,
              type: 'requirement',
              title: '🎉 Requirement Approved!',
              message: `Great news! Your submission for "${submission.requirement_name}" has been approved by ${coordinator ? coordinator.first_name + ' ' + coordinator.last_name : 'your coordinator'}.`,
              status: 'approved',
              timestamp: submission.coordinator_reviewed_at || submission.submitted_at || new Date().toISOString(),
              isRead: false,
              isImportant: true,
              action: 'View Feedback',
              data: {
                requirementId: submission.requirement_id,
                requirementName: submission.requirement_name,
                description: submission.requirement_description,
                isRequired: submission.is_required,
                dueDate: submission.due_date,
                completed: true,
                submissionStatus: 'approved',
                coordinatorId: submission.coordinator_id,
                coordinatorName: coordinator ? `${coordinator.first_name} ${coordinator.last_name}` : 'Unknown',
                coordinatorFeedback: submission.coordinator_feedback,
                submittedAt: submission.submitted_at,
                reviewedAt: submission.coordinator_reviewed_at
              }
            };

            approvedNotification.timestamp = NotificationController.formatTimestamp(approvedNotification.timestamp);
            notifications.push(approvedNotification);
          }
        }

      // 5. Get rejected requirement notifications from submissions
      console.log('🔍 Fetching rejected submissions for student:', studentId);
      const rejectedSubmissionsResult = await query('student_submitted_requirements', 'select', null, { 
        student_id: studentId,
        status: 'rejected'
      });

      console.log('🔍 Rejected submissions result:', rejectedSubmissionsResult);
      console.log('🔍 Rejected submissions count:', rejectedSubmissionsResult.data?.length || 0);

      if (rejectedSubmissionsResult.data && rejectedSubmissionsResult.data.length > 0) {
        for (const submission of rejectedSubmissionsResult.data) {
          // Get coordinator details for the submission
          const coordinatorResult = await query('coordinators', 'select', null, { 
            id: submission.coordinator_id 
          });
          const coordinator = coordinatorResult.data?.[0];

          const rejectedNotification = {
            id: `rejected_${submission.requirement_id}`,
            type: 'requirement',
            title: 'Requirement Needs Revision',
            message: `Your submission for "${submission.requirement_name}" needs revision. Please review the feedback from ${coordinator ? coordinator.first_name + ' ' + coordinator.last_name : 'your coordinator'}.`,
            status: 'rejected',
            timestamp: submission.coordinator_reviewed_at || submission.submitted_at || new Date().toISOString(),
            isRead: false,
            isImportant: true,
            action: 'View Feedback',
            data: {
              requirementId: submission.requirement_id,
              requirementName: submission.requirement_name,
              description: submission.requirement_description,
              isRequired: submission.is_required,
              dueDate: submission.due_date,
              completed: false,
              submissionStatus: 'rejected',
              coordinatorId: submission.coordinator_id,
              coordinatorName: coordinator ? `${coordinator.first_name} ${coordinator.last_name}` : 'Unknown',
              coordinatorFeedback: submission.coordinator_feedback,
              submittedAt: submission.submitted_at,
              reviewedAt: submission.coordinator_reviewed_at
            }
          };

          rejectedNotification.timestamp = NotificationController.formatTimestamp(rejectedNotification.timestamp);
          notifications.push(rejectedNotification);
        }
      }

      // Sort notifications by timestamp (newest first)
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log('🔔 [DEBUG] Total notifications generated:', notifications.length);
      console.log('🔔 [DEBUG] Notification types:', notifications.map(n => n.type));
      console.log('🔍 [DEBUG] Final notifications array:', notifications);

      res.json({
        success: true,
        notifications: notifications
      });

    } catch (error) {
      console.error('Error fetching student notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message
      });
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { studentId } = req.body;

      // In a real implementation, you would have a notifications table
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Notification marked as read'
      });

    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  }

  // Mark all notifications as read
  static async markAllNotificationsAsRead(req, res) {
    try {
      const { studentId } = req.body;

      // In a real implementation, you would update a notifications table
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'All notifications marked as read'
      });

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message
      });
    }
  }

  // Helper function to format timestamp
  static formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return messageTime.toLocaleDateString();
    }
  }

  // Debug endpoint to check database data
  static async debugStudentData(req, res) {
    try {
      const { userId } = req.params;
      console.log('🔍 [DEBUG] Debug endpoint called for userId:', userId);
      
      // Check student exists by user_id
      const studentResult = await query('students', 'select', ['id', 'user_id', 'first_name', 'last_name'], { user_id: parseInt(userId) });
      console.log('🔍 [DEBUG] Student data:', studentResult);
      
      // Check attendance records
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const attendanceResult = await query('attendance_records', 'select', null, {});
      console.log('🔍 [DEBUG] All attendance records:', attendanceResult);
      
      // Check if there are any records for this student
      if (studentResult.data && studentResult.data.length > 0) {
        const studentId = studentResult.data[0].id;
        const studentUserId = studentResult.data[0].user_id;
        const studentAttendanceResult = await query('attendance_records', 'select', null, { user_id: studentUserId });
        console.log('🔍 [DEBUG] Student attendance records:', studentAttendanceResult);
      }
      
      res.json({
        success: true,
        studentData: studentResult.data,
        allAttendanceRecords: attendanceResult.data,
        today: today
      });
    } catch (error) {
      console.error('❌ [DEBUG] Error in debug endpoint:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = NotificationController;
