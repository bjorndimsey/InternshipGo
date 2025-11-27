const { query } = require('../config/supabase');

class HTEController {
  // Get HTE information for a student and company
  static async getHTEInformation(req, res) {
    try {
      const { studentId, companyId } = req.query;

      if (!studentId || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID and Company ID are required'
        });
      }

      // First, find the application for this student and company
      const applicationResult = await query('applications', 'select', null, {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId),
        status: 'approved'
      });

      if (!applicationResult.data || applicationResult.data.length === 0) {
        return res.json({
          success: true,
          message: 'No approved application found',
          hteInfo: null
        });
      }

      const application = applicationResult.data[0];

      // Get HTE information for this application
      const hteResult = await query('hte_information', 'select', null, {
        application_id: application.id
      });

      if (hteResult.data && hteResult.data.length > 0) {
        res.json({
          success: true,
          message: 'HTE information found',
          hteInfo: hteResult.data[0]
        });
      } else {
        res.json({
          success: true,
          message: 'No HTE information found',
          hteInfo: null
        });
      }
    } catch (error) {
      console.error('Error fetching HTE information:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch HTE information',
        error: error.message
      });
    }
  }

  // Save or update HTE information
  static async saveHTEInformation(req, res) {
    try {
      const { studentId, companyId, hteData } = req.body;

      if (!studentId || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID and Company ID are required'
        });
      }

      // Find the application for this student and company
      const applicationResult = await query('applications', 'select', null, {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId),
        status: 'approved'
      });

      if (!applicationResult.data || applicationResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No approved application found for this student and company'
        });
      }

      const application = applicationResult.data[0];

      // Get company information
      const companyResult = await query('companies', 'select', null, {
        id: parseInt(companyId)
      });

      if (!companyResult.data || companyResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.data[0];

      // Prepare HTE information data
      const hteInfoData = {
        application_id: application.id,
        company_id: parseInt(companyId),
        student_id: parseInt(studentId),
        company_name: hteData.companyName || company.company_name || null,
        company_address: hteData.companyAddress || company.address || null,
        hte_photo_url: hteData.htePhotoUrl || null,
        nature_of_hte: hteData.natureOfHte || null,
        head_of_hte: hteData.headOfHte || null,
        head_position: hteData.headPosition || null,
        immediate_supervisor: hteData.immediateSupervisor || null,
        supervisor_position: hteData.supervisorPosition || null,
        telephone_no: hteData.telephoneNo || null,
        mobile_no: hteData.mobileNo || null,
        email_address: hteData.emailAddress || null,
        updated_at: new Date().toISOString()
      };

      // Check if HTE information already exists
      const existingHteResult = await query('hte_information', 'select', null, {
        application_id: application.id
      });

      let result;
      if (existingHteResult.data && existingHteResult.data.length > 0) {
        // Update existing record
        result = await query('hte_information', 'update', hteInfoData, {
          application_id: application.id
        });
      } else {
        // Insert new record
        hteInfoData.created_at = new Date().toISOString();
        result = await query('hte_information', 'insert', hteInfoData);
      }

      if (result.data) {
        res.json({
          success: true,
          message: 'HTE information saved successfully',
          hteInfo: result.data[0] || result.data
        });
      } else {
        throw new Error('Failed to save HTE information');
      }
    } catch (error) {
      console.error('Error saving HTE information:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save HTE information',
        error: error.message
      });
    }
  }
}

module.exports = HTEController;

