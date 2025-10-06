const { query, supabase } = require('../config/supabase');

class CompanyController {
  // Deduct a slot from company when application is approved
  static async deductCompanySlot(companyId) {
    try {
      console.log(`📉 Deducting slot for company ID: ${companyId}`);
      
      // Get current company data
      const companyResult = await query('companies', 'select', null, { id: parseInt(companyId) });
      
      if (!companyResult.data || companyResult.data.length === 0) {
        console.error(`❌ Company not found: ${companyId}`);
        return false;
      }

      const company = companyResult.data[0];
      const currentAvailableSlots = company.available_intern_slots || 0;
      const currentTotalSlots = company.total_intern_capacity || 0;
      const currentInternCount = company.current_intern_count || 0;

      console.log(`📊 Current slots - Available: ${currentAvailableSlots}, Total: ${currentTotalSlots}, Current Interns: ${currentInternCount}`);

      // Check if there are available slots
      if (currentAvailableSlots <= 0) {
        console.warn(`⚠️ No available slots for company ${companyId}`);
        return false;
      }

      // Update available slots and current intern count
      const newAvailableSlots = Math.max(0, currentAvailableSlots - 1);
      const newInternCount = currentInternCount + 1;

      const updateData = {
        available_intern_slots: newAvailableSlots,
        current_intern_count: newInternCount,
        updated_at: new Date().toISOString()
      };

      const updateResult = await query('companies', 'update', updateData, { id: parseInt(companyId) });

      if (updateResult.data) {
        console.log(`✅ Slot deducted successfully - New available slots: ${newAvailableSlots}, New intern count: ${newInternCount}`);
        return true;
      } else {
        console.error(`❌ Failed to update company slots for company ${companyId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error deducting company slot for company ${companyId}:`, error);
      return false;
    }
  }

  // Add back a slot to company when application is unapproved
  static async addCompanySlot(companyId) {
    try {
      console.log(`📈 Adding back slot for company ID: ${companyId}`);
      
      // Get current company data
      const companyResult = await query('companies', 'select', null, { id: parseInt(companyId) });
      
      if (!companyResult.data || companyResult.data.length === 0) {
        console.error(`❌ Company not found: ${companyId}`);
        return false;
      }

      const company = companyResult.data[0];
      const currentAvailableSlots = company.available_intern_slots || 0;
      const currentTotalSlots = company.total_intern_capacity || 0;
      const currentInternCount = company.current_intern_count || 0;

      console.log(`📊 Current slots - Available: ${currentAvailableSlots}, Total: ${currentTotalSlots}, Current Interns: ${currentInternCount}`);

      // Check if we can add back a slot (don't exceed total capacity)
      if (currentAvailableSlots >= currentTotalSlots) {
        console.warn(`⚠️ Company ${companyId} already at maximum capacity`);
        return false;
      }

      // Update available slots and current intern count
      const newAvailableSlots = Math.min(currentTotalSlots, currentAvailableSlots + 1);
      const newInternCount = Math.max(0, currentInternCount - 1);

      const updateData = {
        available_intern_slots: newAvailableSlots,
        current_intern_count: newInternCount,
        updated_at: new Date().toISOString()
      };

      const updateResult = await query('companies', 'update', updateData, { id: parseInt(companyId) });

      if (updateResult.data) {
        console.log(`✅ Slot added back successfully - New available slots: ${newAvailableSlots}, New intern count: ${newInternCount}`);
        return true;
      } else {
        console.error(`❌ Failed to update company slots for company ${companyId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error adding back company slot for company ${companyId}:`, error);
      return false;
    }
  }
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
              partnershipStatus: 'pending',
              moaStatus: 'pending',
              moaExpiryDate: '2024-12-31',
              availableSlots: 5,
              totalSlots: 10,
              description: 'Leading technology company specializing in software development and AI solutions.',
              website: 'www.techcorp.com',
              schoolYear: '2024-2025',
              partnerStatus: 'pending',
              isFavorite: false,
              rating: 4.8,
              qualifications: 'Computer Science, Information Technology, Software Engineering',
              skillsRequired: 'JavaScript, React, Node.js, Python, SQL, Git'
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
              partnershipStatus: 'pending',
              moaStatus: 'pending',
              moaExpiryDate: '2024-11-15',
              availableSlots: 3,
              totalSlots: 8,
              description: 'Data analytics company focused on business intelligence and machine learning.',
              website: 'www.dataflow.com',
              schoolYear: '2024-2025',
              partnerStatus: 'pending',
              isFavorite: false,
              rating: 4.6,
              qualifications: 'Computer Science, Data Science, Statistics, Mathematics',
              skillsRequired: 'Python, R, SQL, Machine Learning, Statistics, Data Visualization'
            },
            {
              id: '3',
              userId: '3',
              name: 'WebDev Studio',
              industry: 'Web Development',
              address: '789 Web Street, Los Angeles, CA',
              profilePicture: null,
              email: 'hello@webdevstudio.com',
              status: 'active',
              joinDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              latitude: 34.0522,
              longitude: -118.2437,
              partnershipStatus: 'rejected',
              moaStatus: 'pending',
              moaExpiryDate: null,
              availableSlots: 2,
              totalSlots: 5,
              description: 'Creative web development agency specializing in modern web applications.',
              website: 'www.webdevstudio.com',
              schoolYear: '2024-2025',
              partnerStatus: 'inactive',
              isFavorite: false,
              rating: 4.2,
              qualifications: 'Web Development, Frontend Development, UI/UX Design',
              skillsRequired: 'HTML, CSS, JavaScript, React, Vue.js, Node.js, MongoDB'
            }
          ]
        });
      }

      console.log('Found companies in database:', companiesResult.data.length);

      // Get user data for each company and filter by partnership status and MOA status
      const companies = [];
      for (const company of companiesResult.data) {
        console.log('Processing company:', company.id, 'with user_id:', company.user_id);
        const userResult = await query('users', 'select', null, { id: company.user_id });
        
        if (userResult.data && userResult.data.length > 0) {
          const user = userResult.data[0];
          console.log('Found user for company:', user.user_type, user.email);
          
          // Include all companies (not other user types) regardless of partnership status
          if (user.user_type === 'Company') {
            
            // Check MOA status - include all companies regardless of MOA status
            const moaStatus = company.moa_status || 'pending';
            
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
                moaStatus: moaStatus,
                moaExpiryDate: company.moa_expiry_date,
                availableSlots: company.available_intern_slots || 0,
                totalSlots: company.total_intern_capacity || 10,
                description: company.company_description || `${company.company_name} is a leading company in ${company.industry} industry.`,
                website: company.website || `www.${company.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
                schoolYear: '2024-2025', // Mock data - would need to be added to schema
                partnerStatus: company.partnership_status || 'pending',
                // Additional fields for student dashboard
                isFavorite: false,
                rating: 4.5,
                // Fields for skill-based matching
                qualifications: company.qualifications,
                skillsRequired: company.skills_required
              });
          } else {
            console.log(`Skipping company ${company.company_name} - Not a Company user type`);
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

  // Get company profile by user_id (returns companies.id)
  static async getCompanyProfileByUserId(req, res) {
    try {
      const { userId } = req.params;
      console.log('🏢 Fetching company profile for user_id:', userId);

      // Get company by user_id
      const companyResult = await query('companies', 'select', null, { user_id: parseInt(userId) });
      const company = companyResult.data && companyResult.data.length > 0 ? companyResult.data[0] : null;
      
      if (!company) {
        console.log('❌ Company not found for user_id:', userId);
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Get user details
      const userResult = await query('users', 'select', null, { id: parseInt(userId) });
      const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;

      if (!user) {
        console.log('❌ User not found for user_id:', userId);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('✅ Found company profile by user_id:', {
        companies_id: company.id,
        user_id: user.id,
        email: user.email
      });

      res.json({
        success: true,
        user: {
          id: company.id, // Return companies.id for use in other APIs
          user_id: user.id,
          email: user.email,
          user_type: user.user_type,
          google_id: user.google_id,
          profile_picture: user.profile_picture,
          company_name: company.company_name,
          industry: company.industry,
          address: company.address,
          website: company.website,
          company_description: company.company_description
        }
      });
    } catch (error) {
      console.error('Error fetching company profile by user_id:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch company profile',
        error: error.message
      });
    }
  }

  // Get companies for a student (only companies that have approved the student's application)
  static async getStudentCompanies(req, res) {
    try {
      const { studentId } = req.params;
      
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      console.log('🔍 Getting companies for student (user ID):', studentId);

      // First, find the student record in the students table using user_id
      const studentResult = await query('students', 'select', null, { user_id: parseInt(studentId) });
      
      if (studentResult.error) {
        console.error('❌ Error finding student record:', studentResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to find student record',
          error: studentResult.error.message
        });
      }

      const studentData = studentResult.data || [];
      console.log('🔍 Student query result for user_id', studentId, ':', studentData);
      
      if (studentData.length === 0) {
        return res.json({
          success: true,
          message: 'Student record not found for user_id ' + studentId,
          companies: []
        });
      }

      const actualStudentId = studentData[0].id;
      console.log('📋 Found student record with ID:', actualStudentId);

      // Check if student has approved applications
      const applicationsResult = await query('applications', 'select', null, { 
        student_id: parseInt(studentId),
        status: 'approved'
      });
      
      if (applicationsResult.error) {
        console.error('❌ Error checking applications:', applicationsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to check applications',
          error: applicationsResult.error.message
        });
      }

      const approvedApplications = applicationsResult.data || [];
      console.log('✅ Student applications status:', approvedApplications.length > 0 ? 'Has approved applications' : 'No approved applications');

      if (approvedApplications.length === 0) {
        return res.json({
          success: true,
          message: 'No approved applications found',
          companies: []
        });
      }

      // Get company IDs that have approved this student
      const approvedCompanyIds = approvedApplications.map(app => app.company_id);
      console.log('🏢 Companies with approved applications:', approvedCompanyIds);

      // Get company details for approved companies
      const companiesResult = await supabase
        .from('companies')
        .select('*')
        .in('id', approvedCompanyIds);
      
      if (companiesResult.error) {
        console.error('❌ Error fetching companies:', companiesResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch companies',
          error: companiesResult.error.message
        });
      }

      const companies = companiesResult.data || [];
      console.log('🏢 Found companies:', companies.length);

      // Get user details for each company
      const companyUserIds = companies.map(company => company.user_id);
      const usersResult = await supabase
        .from('users')
        .select('id, profile_picture, email')
        .in('id', companyUserIds);
      
      if (usersResult.error) {
        console.error('❌ Error fetching company users:', usersResult.error);
        // Continue without user data if there's an error
      }

      const companyUsers = usersResult.data || [];

      // Transform the data to match the expected format
      const transformedCompanies = companies.map((company) => {
        const application = approvedApplications.find(app => app.company_id === company.id);
        const companyUser = companyUsers.find(user => user.id === company.user_id);
        
        return {
          id: company.id.toString(),
          company_name: company.company_name,
          industry: company.industry,
          address: company.address,
          partnership_status: company.partnership_status,
          moa_status: company.moa_status,
          moa_expiry_date: company.moa_expiry_date,
          available_slots: company.available_slots || 0,
          total_slots: company.total_slots || 10,
          description: company.description || `Leading company in ${company.industry} industry`,
          website: company.website || `www.${company.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
          rating: company.rating || 4.5,
          profile_picture: companyUser?.profile_picture || null,
          company_email: companyUser?.email || null,
          user_id: company.user_id,
          application_status: application ? application.status : 'approved',
          applied_at: application ? application.applied_at : undefined,
        };
      });

      console.log('✅ Returning companies for student:', transformedCompanies.length);

      res.json({
        success: true,
        message: 'Companies fetched successfully',
        companies: transformedCompanies
      });

    } catch (error) {
      console.error('❌ Error in getStudentCompanies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student companies',
        error: error.message
      });
    }
  }
}

module.exports = CompanyController;
