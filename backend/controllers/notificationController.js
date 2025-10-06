const { query } = require('../config/supabase');

class NotificationController {
  // Get notifications for a student
  static async getStudentNotifications(req, res) {
    try {
      const { studentId } = req.params;
      const notifications = [];

      // 1. Get application status notifications
      const applicationsResult = await query('applications', 'select', null, { 
        student_id: parseInt(studentId) 
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

      // 2. Get coordinator assignment notifications
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
      // First, convert user ID to student ID for student_requirements table
      const studentForRequirementsResult = await query('students', 'select', null, { user_id: parseInt(studentId) });
      const studentForRequirements = studentForRequirementsResult.data && studentForRequirementsResult.data.length > 0 ? studentForRequirementsResult.data[0] : null;
      
      if (studentForRequirements) {
        console.log('🔍 Fetching requirements for student ID:', studentForRequirements.id);
        const requirementsResult = await query('student_requirements', 'select', null, { 
          student_id: studentForRequirements.id 
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
        console.log('⚠️ No student found for requirements query with user ID:', studentId);
      }
      }

      // 4. Get approved requirement notifications from submissions
      console.log('🔍 Fetching approved submissions for user ID:', studentId);
      
      // First, convert user ID to student ID
      const studentResult = await query('students', 'select', null, { user_id: parseInt(studentId) });
      const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;
      
      if (!student) {
        console.log('⚠️ No student found for user ID:', studentId);
      } else {
        console.log('✅ Found student:', { id: student.id, user_id: student.user_id, name: `${student.first_name} ${student.last_name}` });
        
        // Now get submissions using the students.id (not users.id)
        const allSubmissionsResult = await query('student_submitted_requirements', 'select', null, { 
          student_id: student.id
        });
        console.log('🔍 All submissions for student:', allSubmissionsResult);
        console.log('🔍 All submissions count:', allSubmissionsResult.data?.length || 0);
        
        // Get approved submissions
        const submissionsResult = await query('student_submitted_requirements', 'select', null, { 
          student_id: student.id,
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
      }

      // 5. Get rejected requirement notifications from submissions
      if (student) {
        console.log('🔍 Fetching rejected submissions for student:', student.id);
        const rejectedSubmissionsResult = await query('student_submitted_requirements', 'select', null, { 
          student_id: student.id,
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
      }

      // Sort notifications by timestamp (newest first)
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log('🔔 Total notifications generated:', notifications.length);
      console.log('🔔 Notification types:', notifications.map(n => n.type));

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
}

module.exports = NotificationController;
