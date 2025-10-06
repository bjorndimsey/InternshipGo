const { query } = require('../config/supabase');

class CoordinatorNotificationController {
  // Get attendance notifications for today
  static async getAttendanceNotifications(coordinatorUserId) {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      console.log('📅 Fetching attendance notifications for date:', today);
      
      // Get all interns assigned to this coordinator
      const internsResult = await query('interns', 'select', null, { coordinator_id: coordinatorUserId });
      
      if (!internsResult.data || internsResult.data.length === 0) {
        console.log('👥 No interns found for coordinator');
        return [];
      }

      const internIds = internsResult.data.map(intern => intern.student_id);
      console.log('👥 Found interns for coordinator:', internIds);
      console.log('👥 Full intern data:', internsResult.data);
      
      // Get the user_ids for these interns from the students table
      const userIds = [];
      for (const intern of internsResult.data) {
        const studentResult = await query('students', 'select', ['user_id'], { id: intern.student_id });
        if (studentResult.data && studentResult.data.length > 0) {
          userIds.push(studentResult.data[0].user_id);
        }
      }
      console.log('👤 User IDs for coordinator interns:', userIds);
      
      // Also check what applications exist for any student_id
      console.log('🔍 Checking all applications in database...');
      const allApplicationsResult = await query('applications', 'select', ['student_id', 'company_id', 'status'], {});
      console.log('📋 All applications in database:', allApplicationsResult.data);

      const notifications = [];

      // Get today's attendance records for all companies where these interns are assigned
      const companyIds = new Set();
      
      // Query applications for each intern individually
      for (const internId of internIds) {
        console.log(`🔍 Checking applications for intern student_id: ${internId}`);
        const applicationsResult = await query('applications', 'select', ['company_id', 'student_id'], { 
          student_id: internId,
          status: 'approved'
        });
        
        console.log(`📋 Applications result for student_id ${internId}:`, applicationsResult);
        
        if (applicationsResult.data && applicationsResult.data.length > 0) {
          applicationsResult.data.forEach(app => companyIds.add(app.company_id));
          console.log(`✅ Found ${applicationsResult.data.length} approved applications for student_id ${internId}`);
        } else {
          console.log(`❌ No approved applications found for student_id ${internId}`);
        }
      }

      if (companyIds.size === 0) {
        console.log('🏢 No approved applications found for coordinator interns');
        console.log('🔄 Trying alternative approach: querying attendance records directly...');
        
        // Alternative approach: Query attendance records directly for the coordinator's interns
        for (const userId of userIds) {
          const directAttendanceResult = await query('attendance_records', 'select', null, {
            user_id: userId,
            attendance_date: today
          });
          
          console.log(`📊 Direct attendance query result for user_id ${userId}:`, directAttendanceResult);
          
          if (directAttendanceResult.data && directAttendanceResult.data.length > 0) {
            console.log(`✅ Found ${directAttendanceResult.data.length} attendance records for user_id ${userId}`);
            // Process these records directly
            for (const record of directAttendanceResult.data) {
              // Get student details
              const studentResult = await query('students', 'select', ['first_name', 'last_name'], { 
                user_id: record.user_id 
              });
              const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;

              if (student) {
                const studentName = `${student.first_name} ${student.last_name}`;
                const status = record.status;
                
                let notification = {
                  id: `attendance_${record.id}_${today}`,
                  title: `Daily Attendance Update`,
                  message: `${studentName} is marked as ${status.toUpperCase()} today`,
                  type: CoordinatorNotificationController.getAttendanceNotificationType(status),
                  timestamp: new Date().toISOString(),
                  isRead: false,
                  isImportant: status === 'absent' || status === 'leave',
                  category: 'attendance',
                  action: 'View Attendance Timeline',
                  priority: CoordinatorNotificationController.getAttendancePriority(status),
                  data: {
                    studentName,
                    studentId: record.user_id,
                    status,
                    attendanceDate: today,
                    companyId: record.company_id,
                    amTimeIn: record.am_time_in,
                    amTimeOut: record.am_time_out,
                    pmTimeIn: record.pm_time_in,
                    pmTimeOut: record.pm_time_out,
                    totalHours: record.total_hours
                  }
                };

                notifications.push(notification);
                console.log(`✅ Created direct attendance notification for ${studentName}: ${status}`);
              }
            }
          }
        }
        
        return notifications;
      }

      const companyIdsArray = Array.from(companyIds);
      console.log('🏢 Company IDs for attendance check:', companyIdsArray);

      // Fetch attendance records for today from all relevant companies
      for (const companyId of companyIdsArray) {
        const attendanceResult = await query('attendance_records', 'select', null, {
          company_id: companyId,
          attendance_date: today
        });

        if (attendanceResult.data && attendanceResult.data.length > 0) {
          console.log(`📊 Found ${attendanceResult.data.length} attendance records for company ${companyId} on ${today}`);
          
          // Filter records for interns assigned to this coordinator
          const coordinatorInternRecords = attendanceResult.data.filter(record => 
            internIds.includes(record.user_id)
          );

          console.log(`👥 Filtered to ${coordinatorInternRecords.length} records for coordinator's interns`);

          // Create notifications for each attendance record
          for (const record of coordinatorInternRecords) {
            // Get student details
            const studentResult = await query('students', 'select', ['first_name', 'last_name'], { 
              user_id: record.user_id 
            });
            const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;

            if (student) {
              const studentName = `${student.first_name} ${student.last_name}`;
              const status = record.status;
              
              let notification = {
                id: `attendance_${record.id}_${today}`,
                title: `Daily Attendance Update`,
                message: `${studentName} is marked as ${status.toUpperCase()} today`,
                type: CoordinatorNotificationController.getAttendanceNotificationType(status),
                timestamp: new Date().toISOString(),
                isRead: false,
                isImportant: status === 'absent' || status === 'leave',
                category: 'attendance',
                action: 'View Attendance Timeline',
                priority: CoordinatorNotificationController.getAttendancePriority(status),
                data: {
                  studentName,
                  studentId: record.user_id,
                  status,
                  attendanceDate: today,
                  companyId: record.company_id,
                  amTimeIn: record.am_time_in,
                  amTimeOut: record.am_time_out,
                  pmTimeIn: record.pm_time_in,
                  pmTimeOut: record.pm_time_out,
                  totalHours: record.total_hours
                }
              };

              notifications.push(notification);
              console.log(`✅ Created attendance notification for ${studentName}: ${status}`);
            }
          }
        }
      }

      console.log(`🔔 Generated ${notifications.length} attendance notifications for coordinator`);
      return notifications;

    } catch (error) {
      console.error('❌ Error fetching attendance notifications:', error);
      return [];
    }
  }

  // Get notification type based on attendance status
  static getAttendanceNotificationType(status) {
    switch (status) {
      case 'present': return 'success';
      case 'late': return 'warning';
      case 'absent': return 'error';
      case 'leave': return 'info';
      default: return 'info';
    }
  }

  // Get notification priority based on attendance status
  static getAttendancePriority(status) {
    switch (status) {
      case 'absent': return 'high';
      case 'leave': return 'medium';
      case 'late': return 'medium';
      case 'present': return 'low';
      default: return 'low';
    }
  }

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

      // 1. Get attendance notifications for today
      console.log('🔍 Fetching attendance notifications for coordinator user_id:', coordinator.user_id);
      const attendanceNotifications = await CoordinatorNotificationController.getAttendanceNotifications(coordinator.user_id);
      notifications.push(...attendanceNotifications);

      // 2. Get MOA status notifications (companies that approved/rejected MOAs uploaded by this coordinator)
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
