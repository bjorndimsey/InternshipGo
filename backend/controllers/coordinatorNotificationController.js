const { query } = require('../config/supabase');

class CoordinatorNotificationController {
  // Get notifications for a coordinator
  static async getCoordinatorNotifications(req, res) {
    try {
      const { coordinatorId } = req.params;
      const { userId } = req.query;

      console.log('🔔 Fetching notifications for coordinator:', coordinatorId, 'user_id:', userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Verify the coordinator exists and get their user_id
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(coordinatorId) });
      const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
      
      if (!coordinator) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      if (coordinator.user_id !== parseInt(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to coordinator notifications'
        });
      }

      const notifications = [];

      // 1. Get MOA status notifications (companies that approved/rejected MOAs uploaded by this coordinator)
      console.log('🔍 Fetching MOA status notifications for coordinator user_id:', coordinator.user_id);
      
      const moaCompaniesResult = await query('companies', 'select', null, { 
        moa_uploaded_by: coordinator.user_id 
      });

      if (moaCompaniesResult.data && moaCompaniesResult.data.length > 0) {
        console.log('📋 Found companies with MOAs uploaded by coordinator:', moaCompaniesResult.data.length);
        
        for (const company of moaCompaniesResult.data) {
          // Only create notification if MOA status is approved or rejected
          if (company.partnership_status === 'approved' || company.partnership_status === 'rejected') {
            const notification = {
              id: `moa_${company.id}_${company.partnership_status}`,
              title: `MOA ${company.partnership_status === 'approved' ? 'Approved' : 'Rejected'}`,
              message: `${company.company_name} has ${company.partnership_status} your MOA submission.`,
              type: company.partnership_status === 'approved' ? 'success' : 'error',
              timestamp: company.partnership_approved_at || company.updated_at,
              isRead: false, // This would need to be tracked in a notifications table
              isImportant: true,
              category: 'moa',
              action: 'View MOA Details',
              priority: company.partnership_status === 'approved' ? 'high' : 'medium',
              data: {
                companyId: company.id,
                companyName: company.company_name,
                moaStatus: company.partnership_status,
                approvedAt: company.partnership_approved_at,
                moaUrl: company.moa_url,
                moaExpiryDate: company.moa_expiry_date
              }
            };
            notifications.push(notification);
          }
        }
      }

      // 2. Get campus assignment notifications
      console.log('🔍 Fetching campus assignment notifications for coordinator id:', coordinator.id);
      
      if (coordinator.campus_assignment) {
        const campusNotification = {
          id: `campus_${coordinator.id}_${coordinator.campus_assignment}`,
          title: `Campus Assignment: ${coordinator.campus_assignment === 'in-campus' ? 'In-Campus' : 'Off-Campus'}`,
          message: `You have been assigned to ${coordinator.campus_assignment === 'in-campus' ? 'in-campus' : 'off-campus'} duties.`,
          type: 'info',
          timestamp: coordinator.assigned_at || coordinator.updated_at,
          isRead: false,
          isImportant: true,
          category: 'system',
          action: 'View Assignment Details',
          priority: 'high',
          data: {
            coordinatorId: coordinator.id,
            campusAssignment: coordinator.campus_assignment,
            assignedAt: coordinator.assigned_at,
            assignedBy: coordinator.assigned_by
          }
        };
        notifications.push(campusNotification);
      }

      // 3. Get student requirement submission notifications
      console.log('🔍 Fetching student requirement submissions for coordinator id:', coordinator.id);
      
      const submissionsResult = await query('student_submitted_requirements', 'select', null, { 
        coordinator_id: coordinator.id 
      });

      if (submissionsResult.data && submissionsResult.data.length > 0) {
        console.log('📋 Found student submissions for coordinator:', submissionsResult.data.length);
        
        for (const submission of submissionsResult.data) {
          // Get student details
          const studentResult = await query('students', 'select', null, { id: submission.student_id });
          const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;
          
          if (student) {
            // Get user details for student
            const userResult = await query('users', 'select', null, { id: student.user_id });
            const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
            
            if (user) {
              const notification = {
                id: `submission_${submission.id}`,
                title: 'New Requirement Submission',
                message: `${user.email} has submitted a requirement: ${submission.requirement_name}`,
                type: 'info',
                timestamp: submission.submitted_at,
                isRead: false, // This would need to be tracked in a notifications table
                isImportant: submission.is_required,
                category: 'requirement',
                action: 'Review Submission',
                priority: submission.is_required ? 'high' : 'medium',
                data: {
                  submissionId: submission.id,
                  studentId: submission.student_id,
                  studentName: `${student.first_name} ${student.last_name}`,
                  studentEmail: user.email,
                  requirementName: submission.requirement_name,
                  requirementDescription: submission.requirement_description,
                  submittedAt: submission.submitted_at,
                  fileUrl: submission.submitted_file_url,
                  fileName: submission.submitted_file_name,
                  fileSize: submission.submitted_file_size,
                  isRequired: submission.is_required,
                  dueDate: submission.due_date
                }
              };
              notifications.push(notification);
            }
          }
        }
      }

      // Sort notifications by timestamp (newest first)
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      console.log('🔔 Total notifications found:', notifications.length);

      res.json({
        success: true,
        notifications: notifications
      });

    } catch (error) {
      console.error('Error fetching coordinator notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coordinator notifications',
        error: error.message
      });
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { coordinatorId } = req.body;

      console.log('🔔 Marking notification as read:', notificationId, 'for coordinator:', coordinatorId);

      // For now, we'll just return success since we don't have a notifications table
      // In a real implementation, you'd update a notifications table here
      
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
      const { coordinatorId } = req.body;

      console.log('🔔 Marking all notifications as read for coordinator:', coordinatorId);

      // For now, we'll just return success since we don't have a notifications table
      // In a real implementation, you'd update a notifications table here
      
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

  // Create campus assignment notification
  static async createCampusAssignmentNotification(coordinatorId, campusType, assignedBy) {
    try {
      console.log('🔔 Creating campus assignment notification for coordinator:', coordinatorId, 'campus:', campusType);
      
      // Get coordinator details
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(coordinatorId) });
      const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
      
      if (!coordinator) {
        console.error('❌ Coordinator not found for notification:', coordinatorId);
        return false;
      }

      // Get assigned by user details
      const assignedByResult = await query('users', 'select', null, { id: parseInt(assignedBy) });
      const assignedByUser = assignedByResult.data && assignedByResult.data.length > 0 ? assignedByResult.data[0] : null;

      const isRemoved = campusType === 'removed';
      const notification = {
        id: `campus_${coordinatorId}_${campusType}_${Date.now()}`,
        title: isRemoved ? 'Campus Assignment Removed' : `Campus Assignment: ${campusType === 'in-campus' ? 'In-Campus' : 'Off-Campus'}`,
        message: isRemoved 
          ? `Your campus assignment has been removed${assignedByUser ? ` by ${assignedByUser.email}` : ''}.`
          : `You have been assigned to ${campusType === 'in-campus' ? 'in-campus' : 'off-campus'} duties${assignedByUser ? ` by ${assignedByUser.email}` : ''}.`,
        type: isRemoved ? 'warning' : 'info',
        timestamp: new Date().toISOString(),
        isRead: false,
        isImportant: true,
        category: 'system',
        action: 'View Assignment Details',
        priority: 'high',
        data: {
          coordinatorId: coordinatorId,
          campusAssignment: isRemoved ? null : campusType,
          assignedAt: new Date().toISOString(),
          assignedBy: assignedBy,
          assignedByName: assignedByUser ? assignedByUser.email : 'System',
          isRemoved: isRemoved
        }
      };

      console.log('🔔 Campus assignment notification created:', notification);
      return notification;

    } catch (error) {
      console.error('Error creating campus assignment notification:', error);
      return false;
    }
  }
}

module.exports = CoordinatorNotificationController;
