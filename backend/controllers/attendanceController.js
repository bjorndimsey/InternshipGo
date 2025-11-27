const { supabase, query } = require('../config/supabase');

// Helper function to convert 12-hour time to 24-hour format for database storage
function convertTo24Hour(timeStr) {
  if (!timeStr || timeStr === '--:--' || timeStr === '') return null;
  
  // If already in 24-hour format (HH:MM), return as is
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // Parse 12-hour format (HH:MM AM/PM)
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hour24 = hours;
  
  if (period === 'PM' && hours !== 12) hour24 += 12;
  if (period === 'AM' && hours === 12) hour24 = 0;
  
  return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function to convert 24-hour time to 12-hour format for display
function convertTo12Hour(timeStr) {
  console.log('🕐 convertTo12Hour called with:', timeStr, 'type:', typeof timeStr);
  
  if (!timeStr || timeStr === '--:--' || timeStr === '' || timeStr === null) {
    console.log('🕐 Returning --:-- for empty/null value');
    return '--:--';
  }
  
  // Handle both HH:MM and HH:MM:SS formats
  const timeParts = timeStr.split(':');
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);
  
  console.log('🕐 Parsed time parts:', { hours, minutes });
  
  let hour12 = hours;
  let period = 'AM';
  
  if (hours === 0) {
    hour12 = 12;
  } else if (hours === 12) {
    period = 'PM';
  } else if (hours > 12) {
    hour12 = hours - 12;
    period = 'PM';
  }
  
  const result = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  console.log('🕐 Converted result:', result);
  
  return result;
}

// Get attendance records for a company
const getAttendanceRecords = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.query;
    const { startDate, endDate, internId } = req.query;

    if (!companyId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and User ID are required'
      });
    }

    // First, check if companyId is actually a user_id and find the corresponding company
    let actualCompanyId = parseInt(companyId);
    
    // If it's not a number, it might be a user_id, so find the company
    if (isNaN(actualCompanyId)) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, user_id')
        .eq('user_id', companyId)
        .single();

      if (companyError || !companyData) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
      
      actualCompanyId = companyData.id;
    } else {
      // If it's a number, verify it's a valid company ID
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, user_id')
        .eq('id', actualCompanyId)
        .single();

      if (companyError || !companyData) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
    }

    // Build query
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('company_id', actualCompanyId);

    // Add date filters if provided
    if (startDate && endDate && startDate === endDate) {
      // If startDate and endDate are the same, use exact date match
      query = query.eq('attendance_date', startDate);
      console.log('🔍 Exact date match for:', startDate);
    } else {
      // Use range matching for different start and end dates
      if (startDate) {
        query = query.gte('attendance_date', startDate);
        console.log('🔍 Date range start:', startDate);
      }
      if (endDate) {
        query = query.lte('attendance_date', endDate);
        console.log('🔍 Date range end:', endDate);
      }
    }
    if (internId) {
      const actualUserId = parseInt(internId);
      if (!isNaN(actualUserId)) {
        query = query.eq('user_id', actualUserId);
      }
    }

    // Order by date descending
    query = query.order('attendance_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance records:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance records',
        error: error.message,
        details: error.details || 'No additional details available'
      });
    }

    // Get student data for each record
    const userIds = [...new Set((data || []).map(record => record.user_id))];
    let students = [];
    
    if (userIds.length > 0) {
      try {
        // Get all students and filter by user_id in JavaScript
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*, users!inner(profile_picture)');
        
        if (studentsError) {
          throw studentsError;
        }
        
        students = (studentsData || []).filter(student => userIds.includes(student.user_id));
      } catch (studentsError) {
        console.error('Error fetching students:', studentsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch student data',
          error: studentsError.message
        });
      }
    }

    // Create a map of student data for quick lookup
    const studentMap = {};
    (students || []).forEach(student => {
      studentMap[student.user_id] = student;
    });

    // Convert times to 12-hour format for display and include student data
    const formattedData = (data || []).map(record => {
      const student = studentMap[record.user_id] || {};
      return {
        ...record,
        am_time_in: convertTo12Hour(record.am_time_in),
        am_time_out: convertTo12Hour(record.am_time_out),
        pm_time_in: convertTo12Hour(record.pm_time_in),
        pm_time_out: convertTo12Hour(record.pm_time_out),
        am_status: record.am_status || 'not_marked',
        pm_status: record.pm_status || 'not_marked',
        // Include verification fields
        verification_status: record.verification_status || 'pending',
        verified_by: record.verified_by || null,
        verified_at: record.verified_at || null,
        verification_remarks: record.verification_remarks || null,
        // Include student data
        first_name: student.first_name || 'N/A',
        last_name: student.last_name || 'N/A',
        email: student.email || 'N/A',
        profile_picture: student.users?.profile_picture || null
      };
    });

    res.json({
      success: true,
      data: formattedData,
      message: 'Attendance records fetched successfully'
    });

  } catch (error) {
    console.error('Error in getAttendanceRecords:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Create or update attendance record
const saveAttendanceRecord = async (req, res) => {
  console.log('💾💾💾 saveAttendanceRecord BACKEND FUNCTION CALLED! 💾💾💾');
  console.log('💾 saveAttendanceRecord called with:', {
    companyId: req.params.companyId,
    userId: req.query.userId,
    body: req.body,
    headers: req.headers,
    method: req.method,
    url: req.url
  });
  
  try {
    const { companyId } = req.params;
    const { userId } = req.query;
    const { 
      internId, 
      attendanceDate, 
      status, 
      amTimeIn, 
      amTimeOut, 
      pmTimeIn, 
      pmTimeOut, 
      amStatus,
      pmStatus,
      totalHours,
      notes 
    } = req.body;

    if (!companyId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and User ID are required'
      });
    }

    console.log('🔍 Validating required fields:', {
      internId: internId,
      internIdType: typeof internId,
      attendanceDate: attendanceDate,
      attendanceDateType: typeof attendanceDate,
      status: status,
      statusType: typeof status,
      amTimeIn: amTimeIn,
      amTimeOut: amTimeOut,
      pmTimeIn: pmTimeIn,
      pmTimeOut: pmTimeOut,
      amStatus: amStatus,
      amStatusType: typeof amStatus,
      pmStatus: pmStatus,
      pmStatusType: typeof pmStatus,
      totalHours: totalHours,
      totalHoursType: typeof totalHours
    });

    if (!internId || !attendanceDate || !status) {
      console.error('❌ Missing required fields:', {
        internId: !!internId,
        attendanceDate: !!attendanceDate,
        status: !!status
      });
      return res.status(400).json({
        success: false,
        message: 'Intern ID, attendance date, and status are required'
      });
    }

    // Convert internId to number since it's a user_id (BIGINT)
    const actualUserId = parseInt(internId);
    if (isNaN(actualUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Verify that the user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('id', actualUserId)
      .single();

    if (userError || !userData) {
      console.error('User not found:', { actualUserId, userError });
      return res.status(400).json({
        success: false,
        message: `User with ID ${actualUserId} not found`,
        error: userError?.message
      });
    }

    console.log('User found:', userData);

    // First, check if companyId is actually a user_id and find the corresponding company
    let actualCompanyId = parseInt(companyId);
    
    // If it's not a number, it might be a user_id, so find the company
    if (isNaN(actualCompanyId)) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, user_id')
        .eq('user_id', companyId)
        .single();

      if (companyError || !companyData) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
      
      actualCompanyId = companyData.id;
    } else {
      // If it's a number, verify it's a valid company ID
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, user_id')
        .eq('id', actualCompanyId)
        .single();

      if (companyError || !companyData) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
    }

    // Check if record already exists for this intern and date
    const { data: existingRecord, error: checkError } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('user_id', actualUserId)
      .eq('company_id', actualCompanyId)
      .eq('attendance_date', attendanceDate)
      .single();

    console.log('🔍 Checking for existing record:', {
      userId: actualUserId,
      companyId: actualCompanyId,
      attendanceDate: attendanceDate,
      existingRecord: existingRecord,
      checkError: checkError,
      totalHours: totalHours,
      totalHoursType: typeof totalHours
    });

    let result;
    if (existingRecord) {
      // Update existing record
      const updateData = {
        status,
        am_time_in: convertTo24Hour(amTimeIn),
        am_time_out: convertTo24Hour(amTimeOut),
        pm_time_in: convertTo24Hour(pmTimeIn),
        pm_time_out: convertTo24Hour(pmTimeOut),
        am_status: amStatus || 'not_marked',
        pm_status: pmStatus || 'not_marked',
        total_hours: totalHours || 0,
        notes: notes || null,
        updated_at: new Date().toISOString()
      };
      
      console.log('🔄 Updating existing record:', {
        recordId: existingRecord.id,
        updateData: updateData,
        originalData: { amTimeIn, amTimeOut, pmTimeIn, pmTimeOut, totalHours }
      });
      
      const { data, error } = await supabase
        .from('attendance_records')
        .update(updateData)
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating attendance record:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update attendance record',
          error: error.message,
          details: error.details || 'No additional details available'
        });
      }

      result = data;
    } else {
      // Create new record
      const insertData = {
        user_id: actualUserId,
        company_id: actualCompanyId,
        attendance_date: attendanceDate,
        status,
        am_time_in: convertTo24Hour(amTimeIn),
        am_time_out: convertTo24Hour(amTimeOut),
        pm_time_in: convertTo24Hour(pmTimeIn),
        pm_time_out: convertTo24Hour(pmTimeOut),
        am_status: amStatus || 'not_marked',
        pm_status: pmStatus || 'not_marked',
        total_hours: totalHours || 0,
        notes: notes || null
      };
      
      console.log('➕ Creating new record:', {
        insertData: insertData,
        originalData: { amTimeIn, amTimeOut, pmTimeIn, pmTimeOut, totalHours }
      });
      
      const { data, error } = await supabase
        .from('attendance_records')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating attendance record:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create attendance record',
          error: error.message,
          details: error.details || 'No additional details available'
        });
      }

      result = data;
    }

    console.log('✅✅✅ Attendance record saved successfully:', {
      result: result,
      finalData: {
        user_id: result?.user_id,
        am_time_in: result?.am_time_in,
        am_time_out: result?.am_time_out,
        pm_time_in: result?.pm_time_in,
        pm_time_out: result?.pm_time_out,
        total_hours: result?.total_hours
      }
    });

    // Calculate total accumulated hours and remaining hours
    try {
      console.log('📊 Calculating total accumulated hours and remaining hours...');
      
      // Get all attendance records for this intern to calculate total accumulated hours
      const { data: allAttendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('total_hours')
        .eq('user_id', actualUserId)
        .eq('company_id', actualCompanyId);

      if (attendanceError) {
        console.error('Error fetching attendance records for hours calculation:', attendanceError);
      } else {
        // Calculate total accumulated hours from all records
        const totalAccumulatedHours = allAttendanceRecords.reduce((sum, record) => {
          return sum + (parseFloat(record.total_hours) || 0);
        }, 0);

        console.log('📊 Total accumulated hours:', totalAccumulatedHours);

        // Get the application for this student and company to find hours_of_internship
        const { data: applicationData, error: applicationError } = await supabase
          .from('applications')
          .select('hours_of_internship')
          .eq('student_id', actualUserId)
          .eq('company_id', actualCompanyId)
          .eq('status', 'approved')
          .single();

        if (!applicationError && applicationData && applicationData.hours_of_internship) {
          // Parse hours_of_internship (e.g., "136 hours" -> 136)
          const hoursMatch = applicationData.hours_of_internship.match(/(\d+(?:\.\d+)?)/);
          const totalRequiredHours = hoursMatch ? parseFloat(hoursMatch[1]) || 0 : 0;

          if (totalRequiredHours > 0) {
            const remainingHours = Math.max(0, totalRequiredHours - totalAccumulatedHours);
            const remainingDays = Math.ceil(remainingHours / 8);

            console.log('📊 Hours calculation (from application):', {
              hours_of_internship: applicationData.hours_of_internship,
              totalRequiredHours,
              totalAccumulatedHours,
              remainingHours,
              remainingDays
            });

            // Also update requirements table if it exists (for backward compatibility)
            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('id')
              .eq('user_id', actualUserId)
              .single();

            if (!studentError && studentData) {
              const { error: updateError } = await supabase
                .from('requirements')
                .update({
                  remaining_hours: remainingHours,
                  remaining_days: remainingDays,
                  updated_at: new Date().toISOString()
                })
                .eq('student_id', studentData.id);

              if (updateError) {
                console.error('⚠️ Error updating remaining hours in requirements:', updateError);
              } else {
                console.log('✅ Remaining hours updated in requirements table');
              }
            }
            
            // Include calculated hours in the response
            result.total_accumulated_hours = totalAccumulatedHours;
            result.remaining_hours = remainingHours;
            result.remaining_days = remainingDays;
          } else {
            console.log('⚠️ No valid hours_of_internship found in application');
          }
        } else {
          console.log('⚠️ No application found or hours_of_internship not set:', {
            applicationError: applicationError?.message,
            hasApplication: !!applicationData,
            hoursOfInternship: applicationData?.hours_of_internship
          });
        }
      }
    } catch (hoursError) {
      console.error('Error calculating hours:', hoursError);
      // Don't fail the request if hours calculation fails
    }

    // Trigger attendance notification for coordinators
    try {
      console.log('🔔 Triggering attendance notification for coordinators');
      // Import the notification controller
      const CoordinatorNotificationController = require('./coordinatorNotificationController');
      
      // Get the student's coordinator
      const studentResult = await query('students', 'select', ['id'], { user_id: parseInt(userId) });
      if (studentResult.data && studentResult.data.length > 0) {
        const studentId = studentResult.data[0].id;
        
        // Get the intern record to find the coordinator
        const internResult = await query('interns', 'select', ['coordinator_id'], { student_id: studentId });
        if (internResult.data && internResult.data.length > 0) {
          const coordinatorId = internResult.data[0].coordinator_id;
          console.log('👨‍🏫 Found coordinator ID for notification:', coordinatorId);
          
          // The notification will be created when the coordinator checks their notifications
          // No need to create it here as it's generated on-demand
        }
      }
    } catch (notificationError) {
      console.error('⚠️ Error triggering attendance notification:', notificationError);
      // Don't fail the attendance save if notification fails
    }

    // Trigger attendance notification for the student
    try {
      console.log('🔔 Triggering attendance notification for student');
      // Import the notification controller
      const NotificationController = require('./notificationController');
      
      // Get the student's ID from the user_id
      const studentResult = await query('students', 'select', ['id'], { user_id: actualUserId });
      if (studentResult.data && studentResult.data.length > 0) {
        const studentId = studentResult.data[0].id;
        console.log('👨‍🎓 Found student ID for notification:', studentId);
        
        // The notification will be created when the student checks their notifications
        // No need to create it here as it's generated on-demand
      }
    } catch (studentNotificationError) {
      console.error('⚠️ Error triggering student attendance notification:', studentNotificationError);
      // Don't fail the attendance save if notification fails
    }

    res.json({
      success: true,
      data: result,
      message: existingRecord ? 'Attendance record updated successfully' : 'Attendance record created successfully'
    });

  } catch (error) {
    console.error('Error in saveAttendanceRecord:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get attendance statistics for a company
const getAttendanceStats = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.query;
    const { startDate, endDate } = req.query;

    if (!companyId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and User ID are required'
      });
    }

    // First, check if companyId is actually a user_id and find the corresponding company
    let actualCompanyId = parseInt(companyId);
    
    // If it's not a number, it might be a user_id, so find the company
    if (isNaN(actualCompanyId)) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, user_id')
        .eq('user_id', companyId)
        .single();

      if (companyError || !companyData) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
      
      actualCompanyId = companyData.id;
    } else {
      // If it's a number, verify it's a valid company ID
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, user_id')
        .eq('id', actualCompanyId)
        .single();

      if (companyError || !companyData) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
    }

    // Build query for statistics
    let query = supabase
      .from('attendance_records')
      .select('status, total_hours')
      .eq('company_id', actualCompanyId);

    // Add date filters if provided
    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance statistics',
        error: error.message
      });
    }

    // Calculate statistics
    const stats = {
      totalRecords: data.length,
      present: data.filter(record => record.status === 'present').length,
      late: data.filter(record => record.status === 'late').length,
      absent: data.filter(record => record.status === 'absent').length,
      leave: data.filter(record => record.status === 'leave').length,
      sick: data.filter(record => record.status === 'sick').length,
      totalHours: data.reduce((sum, record) => sum + (parseFloat(record.total_hours) || 0), 0)
    };

    res.json({
      success: true,
      data: stats,
      message: 'Attendance statistics fetched successfully'
    });

  } catch (error) {
    console.error('Error in getAttendanceStats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get today's attendance for all interns in a company
const getTodayAttendance = async (req, res) => {
  console.log('🚀🚀🚀 getTodayAttendance BACKEND FUNCTION CALLED! 🚀🚀🚀');
  console.log('🚀 getTodayAttendance called with:', {
    companyId: req.params.companyId,
    userId: req.query.userId,
    body: req.body
  });
  
  try {
    const { companyId } = req.params;
    const { userId } = req.query;

    // Validate required parameters
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // First, check if companyId is actually a user_id and find the corresponding company
    let actualCompanyId = parseInt(companyId);
    
    // If it's not a number, it might be a user_id, so find the company
    if (isNaN(actualCompanyId)) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', companyId)
        .single();

      if (companyError || !companyData) {
        return res.status(400).json({
          success: false,
          message: 'Company not found'
        });
      }

      actualCompanyId = companyData.id;
    }

    // Get today's date in Manila timezone
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    console.log('📅 Backend date calculation:', {
      today: today,
      currentTime: new Date().toISOString(),
      manilaTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    });

    // Get attendance records for today
    const { data: todayRecords, error: todayError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('company_id', actualCompanyId)
      .eq('attendance_date', today);

    console.log('🔍 Database query results:', {
      companyId: actualCompanyId,
      today: today,
      todayRecords: todayRecords,
      todayRecordsLength: todayRecords ? todayRecords.length : 0,
      todayError: todayError
    });

    if (todayError) {
      console.error('Error fetching today\'s attendance:', todayError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s attendance',
        error: todayError.message
      });
    }

    // Get student data for each record
    const userIds = [...new Set((todayRecords || []).map(record => record.user_id))];
    console.log('🔍 User IDs found in attendance records:', userIds);
    
    let students = [];
    
    if (userIds.length > 0) {
      try {
        // Get all students and filter by user_id in JavaScript
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*, users!inner(profile_picture)');
        
        if (studentsError) {
          throw studentsError;
        }
        
        students = (studentsData || []).filter(student => userIds.includes(student.user_id));
      } catch (studentsError) {
        console.error('Error fetching students:', studentsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch student data',
          error: studentsError.message
        });
      }
    }

    // Create a map of student data for quick lookup
    const studentMap = {};
    (students || []).forEach(student => {
      studentMap[student.user_id] = student;
    });

    // Convert times to 12-hour format for display and include student data
    const formattedData = (todayRecords || []).map(record => {
      const student = studentMap[record.user_id] || {};
      
      console.log('🔄 Converting record for user:', record.user_id, {
        original: {
          am_time_in: record.am_time_in,
          am_time_out: record.am_time_out,
          pm_time_in: record.pm_time_in,
          pm_time_out: record.pm_time_out,
          am_status: record.am_status,
          pm_status: record.pm_status,
          total_hours: record.total_hours
        }
      });
      
      const converted = {
        ...record,
        am_time_in: convertTo12Hour(record.am_time_in),
        am_time_out: convertTo12Hour(record.am_time_out),
        pm_time_in: convertTo12Hour(record.pm_time_in),
        pm_time_out: convertTo12Hour(record.pm_time_out),
        am_status: record.am_status || 'not_marked',
        pm_status: record.pm_status || 'not_marked',
        // Include verification fields
        verification_status: record.verification_status || 'pending',
        verified_by: record.verified_by || null,
        verified_at: record.verified_at || null,
        verification_remarks: record.verification_remarks || null,
        // Include student data
        first_name: student.first_name || 'N/A',
        last_name: student.last_name || 'N/A',
        email: student.email || 'N/A',
        profile_picture: student.users?.profile_picture || null
      };
      
      console.log('🔄 Converted record:', {
        converted: {
          am_time_in: converted.am_time_in,
          am_time_out: converted.am_time_out,
          pm_time_in: converted.pm_time_in,
          pm_time_out: converted.pm_time_out,
          total_hours: converted.total_hours
        }
      });
      
      return converted;
    });

    console.log('🚀🚀🚀 SENDING RESPONSE TO FRONTEND:');
    console.log('🚀 Response data length:', formattedData.length);
    console.log('🚀 First record in response:', formattedData[0] ? {
      user_id: formattedData[0].user_id,
      am_time_in: formattedData[0].am_time_in,
      am_time_out: formattedData[0].am_time_out,
      pm_time_in: formattedData[0].pm_time_in,
      pm_time_out: formattedData[0].pm_time_out,
      total_hours: formattedData[0].total_hours
    } : 'No records');
    
    res.json({
      success: true,
      data: formattedData,
      message: 'Today\'s attendance fetched successfully'
    });

  } catch (error) {
    console.error('Error in getTodayAttendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify attendance record
const verifyAttendanceRecord = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId } = req.query;
    const { attendanceId, verificationStatus, remarks } = req.body;

    if (!companyId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and User ID are required'
      });
    }

    if (!attendanceId || !verificationStatus) {
      return res.status(400).json({
        success: false,
        message: 'Attendance ID and verification status are required'
      });
    }

    if (!['accepted', 'denied'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Verification status must be either "accepted" or "denied"'
      });
    }

    // First, check if companyId is actually a user_id and find the corresponding company
    let actualCompanyId = parseInt(companyId);
    
    if (isNaN(actualCompanyId)) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, user_id')
        .eq('user_id', companyId)
        .single();

      if (companyError || !companyData) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
      
      actualCompanyId = companyData.id;
    }

    // Verify the attendance record exists and belongs to this company
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('id, company_id, user_id')
      .eq('id', attendanceId)
      .eq('company_id', actualCompanyId)
      .single();

    if (attendanceError || !attendanceData) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found or does not belong to this company'
      });
    }

    // Update the attendance record with verification information
    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        verification_status: verificationStatus,
        verified_by: parseInt(userId),
        verified_at: new Date().toISOString(),
        verification_remarks: remarks || null
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attendance verification:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update attendance verification',
        error: updateError.message
      });
    }

    // Format the response data
    const formattedData = {
      id: updatedRecord.id,
      user_id: updatedRecord.user_id,
      company_id: updatedRecord.company_id,
      attendance_date: updatedRecord.attendance_date,
      status: updatedRecord.status,
      am_time_in: convertTo12Hour(updatedRecord.am_time_in),
      am_time_out: convertTo12Hour(updatedRecord.am_time_out),
      pm_time_in: convertTo12Hour(updatedRecord.pm_time_in),
      pm_time_out: convertTo12Hour(updatedRecord.pm_time_out),
      total_hours: updatedRecord.total_hours,
      notes: updatedRecord.notes,
      verification_status: updatedRecord.verification_status,
      verified_by: updatedRecord.verified_by,
      verified_at: updatedRecord.verified_at,
      verification_remarks: updatedRecord.verification_remarks,
      created_at: updatedRecord.created_at,
      updated_at: updatedRecord.updated_at
    };

    res.json({
      success: true,
      data: formattedData,
      message: `Attendance ${verificationStatus} successfully`
    });

  } catch (error) {
    console.error('Error in verifyAttendanceRecord:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getAttendanceRecords,
  saveAttendanceRecord,
  getTodayAttendance,
  getAttendanceStats,
  verifyAttendanceRecord
};
