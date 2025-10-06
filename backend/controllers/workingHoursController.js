const { supabase } = require('../config/supabase');

// Get working hours for a company
const getWorkingHours = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company ID is required' 
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

    const { data, error } = await supabase
      .from('working_hours')
      .select('*')
      .eq('company_id', actualCompanyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No working hours found, return default values
        return res.status(200).json({
          success: true,
          data: {
            start_time: '07:00',
            start_period: 'AM',
            end_time: '07:00',
            end_period: 'PM',
            break_start: '11:00',
            break_start_period: 'AM',
            break_end: '01:00',
            break_end_period: 'PM'
          }
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        start_time: data.start_time,
        start_period: data.start_period,
        end_time: data.end_time,
        end_period: data.end_period,
        break_start: data.break_start,
        break_start_period: data.break_start_period,
        break_end: data.break_end,
        break_end_period: data.break_end_period
      }
    });

  } catch (error) {
    console.error('Error fetching working hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch working hours',
      error: error.message
    });
  }
};

// Create or update working hours for a company
const setWorkingHours = async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      startTime,
      startPeriod,
      endTime,
      endPeriod,
      breakStart,
      breakStartPeriod,
      breakEnd,
      breakEndPeriod
    } = req.body;

    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company ID is required' 
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

    // Validate required fields
    if (!startTime || !startPeriod || !endTime || !endPeriod) {
      return res.status(400).json({
        success: false,
        message: 'Start time, start period, end time, and end period are required'
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Please use HH:MM format'
      });
    }

    // Validate break times if provided
    if (breakStart && breakEnd) {
      if (!timeRegex.test(breakStart) || !timeRegex.test(breakEnd)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid break time format. Please use HH:MM format'
        });
      }
    }

    const workingHoursData = {
      company_id: actualCompanyId,
      start_time: startTime,
      start_period: startPeriod,
      end_time: endTime,
      end_period: endPeriod,
      break_start: breakStart || null,
      break_start_period: breakStartPeriod || null,
      break_end: breakEnd || null,
      break_end_period: breakEndPeriod || null,
      updated_at: new Date().toISOString()
    };

    // Check if working hours already exist for this company
    const { data: existingData, error: checkError } = await supabase
      .from('working_hours')
      .select('id')
      .eq('company_id', actualCompanyId)
      .single();

    let result;
    if (checkError && checkError.code === 'PGRST116') {
      // No existing record, create new one
      const { data, error } = await supabase
        .from('working_hours')
        .insert([workingHoursData])
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else if (checkError) {
      throw checkError;
    } else {
      // Update existing record
      const { data, error } = await supabase
        .from('working_hours')
        .update(workingHoursData)
        .eq('company_id', actualCompanyId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.status(200).json({
      success: true,
      message: 'Working hours updated successfully',
      data: {
        start_time: result.start_time,
        start_period: result.start_period,
        end_time: result.end_time,
        end_period: result.end_period,
        break_start: result.break_start,
        break_start_period: result.break_start_period,
        break_end: result.break_end,
        break_end_period: result.break_end_period
      }
    });

  } catch (error) {
    console.error('Error setting working hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update working hours',
      error: error.message
    });
  }
};

module.exports = {
  getWorkingHours,
  setWorkingHours
};
