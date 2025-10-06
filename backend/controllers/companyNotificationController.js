const { query } = require('../config/supabase');

class CompanyNotificationController {
  // Format timestamp to relative time
  static formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMs = now - time;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInDays / 365)} year${Math.floor(diffInDays / 365) > 1 ? 's' : ''} ago`;
  }
  // Get notifications for a company
  static async getCompanyNotifications(req, res) {
    try {
      const { companyId } = req.params;
      const { userId } = req.query;

      console.log('🔔 Fetching notifications for company:', companyId, 'user_id:', userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Verify the company exists and get their user_id
      const companyResult = await query('companies', 'select', null, { id: parseInt(companyId) });
      const company = companyResult.data && companyResult.data.length > 0 ? companyResult.data[0] : null;
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      if (company.user_id !== parseInt(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to company notifications'
        });
      }

      const notifications = [];

      // 1. Get MOA notifications (coordinators who uploaded MOAs for this company)
      console.log('🔍 Fetching MOA notifications for company:', company.id);
      
      // Find coordinators who uploaded MOAs for this company
      const moaCoordinatorsResult = await query('coordinators', 'select', null, {});
      
      if (moaCoordinatorsResult.data && moaCoordinatorsResult.data.length > 0) {
        console.log('📋 Found coordinators:', moaCoordinatorsResult.data.length);
        
        for (const coordinator of moaCoordinatorsResult.data) {
          // Check if this coordinator uploaded a MOA for this company
          const moaResult = await query('companies', 'select', null, { 
            id: company.id,
            moa_uploaded_by: coordinator.user_id 
          });

          if (moaResult.data && moaResult.data.length > 0) {
            // Get coordinator user details
            const userResult = await query('users', 'select', null, { id: coordinator.user_id });
            const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
            
            if (user) {
              const originalTimestamp = company.moa_uploaded_at || company.updated_at;
              const notification = {
                id: `moa_${coordinator.id}_${company.id}`,
                title: 'MOA Received',
                message: `${user.email} has uploaded a MOA for your company.`,
                type: 'moa',
                timestamp: CompanyNotificationController.formatTimestamp(originalTimestamp),
                originalTimestamp: originalTimestamp,
                isRead: false, // This would need to be tracked in a notifications table
                isImportant: true,
                category: 'moa',
                action: 'Review MOA',
                priority: 'high',
                data: {
                  coordinatorId: coordinator.id,
                  coordinatorName: `${coordinator.first_name} ${coordinator.last_name}`,
                  coordinatorEmail: user.email,
                  moaUrl: company.moa_url,
                  moaStatus: company.moa_status,
                  uploadedAt: company.moa_uploaded_at,
                  moaExpiryDate: company.moa_expiry_date
                }
              };
              notifications.push(notification);
            }
          }
        }
      }

      // 2. Get application notifications (students who applied to this company)
      console.log('🔍 Fetching application notifications for company:', company.id);
      
      const applicationsResult = await query('applications', 'select', null, { 
        company_id: company.id 
      });

      if (applicationsResult.data && applicationsResult.data.length > 0) {
        console.log('📋 Found applications for company:', applicationsResult.data.length);
        
        for (const application of applicationsResult.data) {
          // Get student user details
          const userResult = await query('users', 'select', null, { id: application.student_id });
          const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
          
          if (user) {
            // Get student details
            const studentResult = await query('students', 'select', null, { user_id: application.student_id });
            const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;
            
            if (student) {
              const originalTimestamp = application.applied_at;
              const notification = {
                id: `application_${application.id}`,
                title: 'New Application Received',
                message: `${user.email} has applied for the ${application.position} position.`,
                type: 'application',
                timestamp: CompanyNotificationController.formatTimestamp(originalTimestamp),
                originalTimestamp: originalTimestamp,
                isRead: false, // This would need to be tracked in a notifications table
                isImportant: true,
                category: 'application',
                action: 'Review Application',
                priority: 'high',
                data: {
                  applicationId: application.id,
                  studentId: application.student_id,
                  studentName: `${student.first_name} ${student.last_name}`,
                  studentEmail: user.email,
                  position: application.position,
                  department: application.department,
                  appliedAt: application.applied_at,
                  status: application.status,
                  coverLetter: application.cover_letter,
                  resumeUrl: application.resume_url,
                  transcriptUrl: application.transcript_url,
                  expectedStartDate: application.expected_start_date,
                  expectedEndDate: application.expected_end_date,
                  motivation: application.motivation
                }
              };
              notifications.push(notification);
            }
          }
        }
      }

      // Sort notifications by original timestamp (newest first)
      notifications.sort((a, b) => {
        const timeA = new Date(a.originalTimestamp || 0);
        const timeB = new Date(b.originalTimestamp || 0);
        return timeB - timeA;
      });

      console.log('🔔 Total notifications found:', notifications.length);
      console.log('🔔 Sample notification:', notifications[0]);

      res.json({
        success: true,
        notifications: notifications
      });

    } catch (error) {
      console.error('Error fetching company notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch company notifications',
        error: error.message
      });
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { companyId } = req.body;

      console.log('🔔 Marking notification as read:', notificationId, 'for company:', companyId);

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
      const { companyId } = req.body;

      console.log('🔔 Marking all notifications as read for company:', companyId);

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
}

module.exports = CompanyNotificationController;
