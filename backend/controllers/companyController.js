const { query } = require('../config/supabase');

class CompanyController {
  // Get all companies with user data
  static async getAllCompanies(req, res) {
    try {
      // Get all companies
      const companiesResult = await query('companies', 'select', null, {});
      
      if (!companiesResult.data || companiesResult.data.length === 0) {
        console.log('No companies found in database, returning sample data for testing');
        return res.json({
          success: true,
          message: 'Companies fetched successfully',
          companies: [
            {
              id: '1',
              userId: '1',
              name: 'TechCorp Solutions',
              industry: 'Technology',
              address: '123 Tech Street, San Francisco, CA',
              profilePicture: null,
              email: 'contact@techcorp.com',
              status: 'active',
              joinDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              latitude: 37.7749,
              longitude: -122.4194,
              partnershipStatus: 'approved',
              moaStatus: 'active',
              moaExpiryDate: '2024-12-31',
              availableSlots: 5,
              totalSlots: 10,
              description: 'Leading technology company specializing in software development and AI solutions.',
              website: 'www.techcorp.com',
              schoolYear: '2024-2025',
              partnerStatus: 'approved',
              isFavorite: false,
              rating: 4.8
            },
            {
              id: '2',
              userId: '2',
              name: 'DataFlow Inc',
              industry: 'Data Analytics',
              address: '456 Data Ave, New York, NY',
              profilePicture: null,
              email: 'info@dataflow.com',
              status: 'active',
              joinDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              latitude: 40.7128,
              longitude: -74.0060,
              partnershipStatus: 'approved',
              moaStatus: 'active',
              moaExpiryDate: '2024-11-15',
              availableSlots: 3,
              totalSlots: 8,
              description: 'Data analytics company focused on business intelligence and machine learning.',
              website: 'www.dataflow.com',
              schoolYear: '2024-2025',
              partnerStatus: 'approved',
              isFavorite: false,
              rating: 4.6
            }
          ]
        });
      }

      console.log('Found companies in database:', companiesResult.data.length);

      // Get user data for each company
      const companies = [];
      for (const company of companiesResult.data) {
        console.log('Processing company:', company.id, 'with user_id:', company.user_id);
        const userResult = await query('users', 'select', null, { id: company.user_id });
        
        if (userResult.data && userResult.data.length > 0) {
          const user = userResult.data[0];
          console.log('Found user for company:', user.user_type, user.email);
          
          // Only include companies (not other user types)
          if (user.user_type === 'Company') {
            companies.push({
              id: company.id.toString(),
              userId: company.user_id.toString(),
              name: company.company_name,
              industry: company.industry,
              address: company.address,
              profilePicture: user.profile_picture,
              email: user.email,
              status: user.is_active ? 'active' : 'inactive',
              joinDate: company.created_at,
              updatedAt: company.updated_at,
              latitude: user.latitude,
              longitude: user.longitude,
              // Include partnership status from database
              partnershipStatus: company.partnership_status || 'pending',
              moaStatus: 'active', // Mock data - would need to be added to schema
              moaExpiryDate: company.moa_expiry_date,
              availableSlots: 5, // Mock data - would need to be calculated from internships
              totalSlots: 10, // Mock data - would need to be calculated from internships
              description: `${company.company_name} is a leading company in ${company.industry} industry.`,
              website: `www.${company.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
              schoolYear: '2024-2025', // Mock data - would need to be added to schema
              partnerStatus: company.partnership_status || 'pending',
              // Additional fields for student dashboard
              isFavorite: false,
              rating: 4.5
            });
          }
        }
      }

      res.json({
        success: true,
        message: 'Companies fetched successfully',
        companies
      });
    } catch (error) {
      console.error('Error fetching companies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch companies',
        error: error.message
      });
    }
  }

  // Get company by ID
  static async getCompanyById(req, res) {
    try {
      const { id } = req.params;
      
      const companyResult = await query('companies', 'select', null, { id: parseInt(id) });
      
      if (!companyResult.data || companyResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.data[0];
      
      // Get user data
      const userResult = await query('users', 'select', null, { id: company.user_id });
      
      if (!userResult.data || userResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company user data not found'
        });
      }

      const user = userResult.data[0];

      const companyData = {
        id: company.id.toString(),
        userId: company.user_id.toString(),
        name: company.company_name,
        industry: company.industry,
        address: company.address,
        profilePicture: user.profile_picture,
        email: user.email,
        status: user.is_active ? 'active' : 'inactive',
        joinDate: company.created_at,
        updatedAt: company.updated_at,
        moaStatus: 'active',
        moaExpiryDate: null,
        availableSlots: 0,
        totalSlots: 0,
        description: `${company.company_name} is a leading company in ${company.industry} industry.`,
        website: `www.${company.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
        schoolYear: '2024-2025',
        partnerStatus: 'active'
      };

      res.json({
        success: true,
        message: 'Company fetched successfully',
        company: companyData
      });
    } catch (error) {
      console.error('Error fetching company:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch company',
        error: error.message
      });
    }
  }

  // Update company MOA information
  static async updateCompanyMOA(req, res) {
    try {
      const { id } = req.params;
      const { moaUrl, moaPublicId, uploadedBy } = req.body;

      if (!moaUrl || !moaPublicId || !uploadedBy) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: moaUrl, moaPublicId, uploadedBy'
        });
      }

      // Update the company with MOA information
      const updateData = {
        moa_url: moaUrl,
        moa_public_id: moaPublicId,
        moa_uploaded_by: parseInt(uploadedBy),
        moa_uploaded_at: new Date().toISOString(),
        moa_status: 'active',
        updated_at: new Date().toISOString()
      };

      const result = await query('companies', 'update', updateData, { id: parseInt(id) });

      if (!result.data) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      res.json({
        success: true,
        message: 'MOA information updated successfully',
        company: result.data
      });
    } catch (error) {
      console.error('Error updating company MOA:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update company MOA',
        error: error.message
      });
    }
  }

  // Update partnership status for a company
  static async updatePartnershipStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, approvedBy } = req.body;

      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid partnership status. Must be pending, approved, or rejected'
        });
      }

      // Update the company with partnership status
      const updateData = {
        partnership_status: status,
        partnership_approved_by: approvedBy ? parseInt(approvedBy) : null,
        partnership_approved_at: status !== 'pending' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const result = await query('companies', 'update', updateData, { id: parseInt(id) });

      if (!result.data) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      res.json({
        success: true,
        message: `Partnership ${status} successfully`,
        company: result.data
      });
    } catch (error) {
      console.error('Error updating partnership status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update partnership status',
        error: error.message
      });
    }
  }
}

module.exports = CompanyController;
