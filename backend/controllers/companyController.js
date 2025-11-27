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
      // Get coordinator user ID from query parameter (if provided)
      const coordinatorUserId = req.query.coordinatorUserId ? parseInt(req.query.coordinatorUserId) : null;
      
      // If coordinatorUserId is provided, only get companies where this coordinator uploaded MOA
      // Otherwise, get all companies (for backward compatibility)
      const queryFilter = coordinatorUserId ? { moa_uploaded_by: coordinatorUserId } : {};
      
      console.log('🔍 Fetching companies with filter:', queryFilter);
      
      // Get companies filtered by MOA uploader (if coordinatorUserId provided)
      const companiesResult = await query('companies', 'select', null, queryFilter);
      
      if (!companiesResult.data || companiesResult.data.length === 0) {
        console.log('No companies found in database');
        return res.json({
          success: true,
          message: 'Companies fetched successfully',
          companies: []
        });
      }

      console.log('Found companies in database:', companiesResult.data.length);

      // Get user data for each company and filter by partnership status and MOA status
      const companies = [];
      for (const company of companiesResult.data) {
        console.log('Processing company:', company.id, 'with user_id:', company.user_id, 'moa_uploaded_by:', company.moa_uploaded_by);
        const userResult = await query('users', 'select', null, { id: company.user_id });
        
        if (userResult.data && userResult.data.length > 0) {
          const user = userResult.data[0];
          console.log('Found user for company:', user.user_type, user.email);
          
          // Include all companies (not other user types) regardless of partnership status
          if (user.user_type === 'Company') {
            
            // PHASE 3: If coordinatorUserId provided, check partnership in junction table
            let partnershipData = null;
            let shouldIncludeCompany = true;
            
            if (coordinatorUserId) {
              try {
                // Get coordinator_id from coordinator_user_id
                const coordinatorResult = await query('coordinators', 'select', ['id'], { user_id: coordinatorUserId });
                if (coordinatorResult.data && coordinatorResult.data.length > 0) {
                  const coordinatorId = coordinatorResult.data[0].id;
                  
                  // Try to get partnership from junction table
                  const partnershipResult = await query('company_coordinator_partnerships', 'select', null, { 
                    company_id: company.id,
                    coordinator_id: coordinatorId 
                  });
                  
                  if (partnershipResult.data && partnershipResult.data.length > 0) {
                    partnershipData = partnershipResult.data[0];
                    console.log('✅ Found partnership in junction table for company', company.id);
                  } else {
                    // Fallback: Check old companies table
                    if (!company.moa_uploaded_by || company.moa_uploaded_by !== coordinatorUserId) {
                      console.log(`Skipping company ${company.company_name} - No partnership with coordinator ${coordinatorUserId}`);
                      shouldIncludeCompany = false;
                    }
                  }
                } else {
                  // Coordinator not found, fallback to old method
                  if (!company.moa_uploaded_by || company.moa_uploaded_by !== coordinatorUserId) {
                    console.log(`Skipping company ${company.company_name} - MOA not uploaded by coordinator ${coordinatorUserId}`);
                    shouldIncludeCompany = false;
                  }
                }
              } catch (error) {
                console.log('⚠️ Error checking junction table, falling back to old method:', error.message);
                // Fallback to old method
                if (!company.moa_uploaded_by || company.moa_uploaded_by !== coordinatorUserId) {
                  shouldIncludeCompany = false;
                }
              }
            }
            // Note: If coordinatorUserId is NOT provided, we include all companies and fetch all their partnerships
            
            if (!shouldIncludeCompany) {
              continue;
            }
            
            // PHASE 3: Get ALL partnerships for this company from junction table
            let allPartnerships = [];
            let partnershipStatus = 'pending';
            let coordinatorApproved = false;
            let companyApproved = false;
            let moaStatus = 'pending';
            let moaExpiryDate = null;
            
            try {
              // Get all partnerships for this company
              const allPartnershipsResult = await query('company_coordinator_partnerships', 'select', null, { 
                company_id: company.id 
              });
              
              if (allPartnershipsResult.data && allPartnershipsResult.data.length > 0) {
                allPartnerships = allPartnershipsResult.data;
                console.log(`✅ Found ${allPartnerships.length} partnership(s) for company ${company.id}`);
                
                // Fetch coordinator names for all partnerships
                for (const partnership of allPartnerships) {
                  try {
                    const coordResult = await query('coordinators', 'select', ['first_name', 'last_name'], { 
                      id: partnership.coordinator_id 
                    });
                    if (coordResult.data && coordResult.data.length > 0) {
                      const coord = coordResult.data[0];
                      partnership.coordinator_name = `${coord.first_name || ''} ${coord.last_name || ''}`.trim();
                    }
                    
                    // Also get user email as fallback
                    const userResult = await query('users', 'select', ['email'], { 
                      id: partnership.coordinator_user_id 
                    });
                    if (userResult.data && userResult.data.length > 0) {
                      partnership.coordinator_email = userResult.data[0].email;
                      if (!partnership.coordinator_name) {
                        partnership.coordinator_name = userResult.data[0].email;
                      }
                    }
                  } catch (error) {
                    console.log('⚠️ Error fetching coordinator info for partnership:', error.message);
                    partnership.coordinator_name = 'Unknown Coordinator';
                  }
                }
                
                // If coordinatorUserId was provided, use that specific partnership
                if (partnershipData) {
                  partnershipStatus = partnershipData.partnership_status || 'pending';
                  coordinatorApproved = partnershipData.coordinator_approved === true || partnershipData.coordinator_approved === 1;
                  companyApproved = partnershipData.company_approved === true || partnershipData.company_approved === 1;
                  moaStatus = partnershipData.moa_status || 'pending';
                  moaExpiryDate = partnershipData.moa_expiry_date;
                } else {
                  // Use the first partnership or aggregate status
                  const firstPartnership = allPartnerships[0];
                  partnershipStatus = firstPartnership.partnership_status || 'pending';
                  coordinatorApproved = firstPartnership.coordinator_approved === true || firstPartnership.coordinator_approved === 1;
                  companyApproved = firstPartnership.company_approved === true || firstPartnership.company_approved === 1;
                  moaStatus = firstPartnership.moa_status || 'pending';
                  moaExpiryDate = firstPartnership.moa_expiry_date;
                }
              } else {
                // Fallback to old companies table
                partnershipStatus = company.partnership_status || 'pending';
                coordinatorApproved = company.coordinator_approved || false;
                companyApproved = company.company_approved || false;
                moaStatus = company.moa_status || 'pending';
                moaExpiryDate = company.moa_expiry_date;
              }
            } catch (error) {
              console.log('⚠️ Error fetching partnerships from junction table, falling back to old method:', error.message);
              // Fallback to old companies table
              partnershipStatus = company.partnership_status || 'pending';
              coordinatorApproved = company.coordinator_approved || false;
              companyApproved = company.company_approved || false;
              moaStatus = company.moa_status || 'pending';
              moaExpiryDate = company.moa_expiry_date;
            }
            
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
                // Include partnership status from junction table or fallback
                partnershipStatus: partnershipStatus,
                // Include approval flags from junction table or fallback
                coordinator_approved: coordinatorApproved,
                company_approved: companyApproved,
                // Include MOA uploader info for dashboard filtering
                moa_uploaded_by: partnershipData?.coordinator_user_id || company.moa_uploaded_by || null,
                moaStatus: moaStatus,
                moaExpiryDate: moaExpiryDate,
                availableSlots: company.available_intern_slots || 0,
                totalSlots: company.total_intern_capacity || 10,
                description: company.company_description || `${company.company_name} is a leading company in ${company.industry} industry.`,
                website: company.website || `www.${company.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
                schoolYear: '2024-2025', // Mock data - would need to be added to schema
                partnerStatus: partnershipStatus,
                // NEW: Include all partnerships with coordinator info
                partnerships: allPartnerships.map(p => ({
                  coordinator_user_id: p.coordinator_user_id,
                  coordinator_id: p.coordinator_id,
                  coordinator_name: p.coordinator_name || 'Unknown Coordinator',
                  coordinator_email: p.coordinator_email || '',
                  partnership_status: p.partnership_status,
                  coordinator_approved: p.coordinator_approved,
                  company_approved: p.company_approved,
                  moa_status: p.moa_status
                })),
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

      const coordinatorUserId = parseInt(uploadedBy);
      const companyId = parseInt(id);
      const now = new Date().toISOString();

      // Get coordinator_id from coordinator_user_id
      let coordinatorId = null;
      try {
        const coordinatorResult = await query('coordinators', 'select', ['id'], { user_id: coordinatorUserId });
        if (coordinatorResult.data && coordinatorResult.data.length > 0) {
          coordinatorId = coordinatorResult.data[0].id;
        } else {
          console.log('⚠️ Coordinator not found for user_id:', coordinatorUserId);
        }
      } catch (error) {
        console.error('⚠️ Error finding coordinator:', error);
      }

      // PHASE 1: Update the company table (OLD WAY - for backward compatibility)
      const updateData = {
        moa_url: moaUrl,
        moa_public_id: moaPublicId,
        moa_uploaded_by: coordinatorUserId,
        moa_uploaded_at: now,
        moa_status: 'active',
        updated_at: now
      };

      const result = await query('companies', 'update', updateData, { id: companyId });

      if (!result.data) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // PHASE 1: Create or update partnership in junction table (NEW WAY)
      if (coordinatorId) {
        try {
          // Check if partnership already exists
          const existingPartnership = await query('company_coordinator_partnerships', 'select', ['id'], { 
            company_id: companyId, 
            coordinator_id: coordinatorId 
          });

          if (existingPartnership.data && existingPartnership.data.length > 0) {
            // Update existing partnership
            const partnershipUpdateData = {
              moa_url: moaUrl,
              moa_public_id: moaPublicId,
              moa_status: 'active',
              moa_uploaded_by: coordinatorUserId,
              moa_uploaded_at: now,
              updated_at: now
            };
            await query('company_coordinator_partnerships', 'update', partnershipUpdateData, { 
              id: existingPartnership.data[0].id 
            });
            console.log('✅ Updated existing partnership record');
          } else {
            // Create new partnership
            const partnershipData = {
              company_id: companyId,
              coordinator_id: coordinatorId,
              coordinator_user_id: coordinatorUserId,
              moa_url: moaUrl,
              moa_public_id: moaPublicId,
              moa_status: 'active',
              moa_uploaded_by: coordinatorUserId,
              moa_uploaded_at: now,
              coordinator_approved: false,
              company_approved: false,
              partnership_status: 'pending',
              created_at: now,
              updated_at: now
            };
            await query('company_coordinator_partnerships', 'insert', partnershipData);
            console.log('✅ Created new partnership record');
          }
        } catch (error) {
          // Don't fail the request if junction table doesn't exist yet (migration not run)
          console.error('⚠️ Error updating partnership junction table (migration may not be run yet):', error.message);
        }
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

  // Update partnership status for a company (coordinator approves company)
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

      // Get current company data to check existing approvals
      // Try to get approval columns, but handle case where they don't exist yet
      let currentCoordinatorApproved = false;
      let currentCompanyApproved = false;
      
      try {
        const currentCompany = await query('companies', 'select', ['coordinator_approved', 'company_approved'], { id: parseInt(id) });
        if (currentCompany.data && currentCompany.data.length > 0) {
          currentCoordinatorApproved = currentCompany.data[0].coordinator_approved || false;
          currentCompanyApproved = currentCompany.data[0].company_approved || false;
        }
      } catch (error) {
        // If columns don't exist yet, default to false
        console.log('⚠️ Approval columns may not exist yet, defaulting to false:', error.message);
        currentCoordinatorApproved = false;
        currentCompanyApproved = false;
      }

      // When coordinator approves company, set coordinator_approved = true
      const coordinatorApproved = status === 'approved' ? true : (status === 'rejected' ? false : currentCoordinatorApproved);
      
      // Calculate final partnership status based on both approvals
      let finalStatus = 'pending';
      if (coordinatorApproved && currentCompanyApproved) {
        finalStatus = 'approved';
      } else if (status === 'rejected' || (!coordinatorApproved && !currentCompanyApproved)) {
        finalStatus = 'pending';
      } else if (coordinatorApproved || currentCompanyApproved) {
        finalStatus = 'pending'; // Still waiting for the other side
      }

      const companyId = parseInt(id);
      const now = new Date().toISOString();
      const approvedByUserId = approvedBy ? parseInt(approvedBy) : null;

      // PHASE 1: Update the company table (OLD WAY - for backward compatibility)
      const updateData = {
        partnership_status: finalStatus,
        partnership_approved_by: approvedByUserId,
        partnership_approved_at: finalStatus === 'approved' ? now : null,
        updated_at: now
      };
      
      // Only add coordinator_approved if the column exists
      try {
        updateData.coordinator_approved = coordinatorApproved;
      } catch (error) {
        console.log('⚠️ coordinator_approved column may not exist yet');
      }

      const result = await query('companies', 'update', updateData, { id: companyId });

      if (!result.data) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // PHASE 1: Update partnership in junction table (NEW WAY)
      // Get the coordinator_id from the company's moa_uploaded_by or approvedBy
      const coordinatorUserId = result.data.moa_uploaded_by || approvedByUserId;
      if (coordinatorUserId) {
        try {
          const coordinatorResult = await query('coordinators', 'select', ['id'], { user_id: coordinatorUserId });
          if (coordinatorResult.data && coordinatorResult.data.length > 0) {
            const coordinatorId = coordinatorResult.data[0].id;
            
            // Find the partnership
            const partnershipResult = await query('company_coordinator_partnerships', 'select', ['id'], { 
              company_id: companyId, 
              coordinator_id: coordinatorId 
            });

            if (partnershipResult.data && partnershipResult.data.length > 0) {
              // Update existing partnership
              const partnershipUpdateData = {
                coordinator_approved: coordinatorApproved,
                partnership_status: finalStatus,
                partnership_approved_by: approvedByUserId,
                partnership_approved_at: finalStatus === 'approved' ? now : null,
                updated_at: now
              };
              await query('company_coordinator_partnerships', 'update', partnershipUpdateData, { 
                id: partnershipResult.data[0].id 
              });
              console.log('✅ Updated partnership record in junction table');
            } else {
              console.log('⚠️ Partnership not found in junction table, may need to create it');
            }
          }
        } catch (error) {
          // Don't fail the request if junction table doesn't exist yet
          console.error('⚠️ Error updating partnership junction table (migration may not be run yet):', error.message);
        }
      }

      res.json({
        success: true,
        message: coordinatorApproved 
          ? (finalStatus === 'approved' ? 'Partnership approved successfully! Both sides have approved.' : 'Your approval has been recorded. Waiting for company approval.')
          : 'Partnership status updated',
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

  // Update company account status (enable/disable)
  static async updateCompanyStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      console.log('🔄 updateCompanyStatus called:', { id, is_active, type: typeof is_active });

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'is_active must be a boolean value'
        });
      }

      // Get the company to find the user_id
      const companyResult = await query('companies', 'select', null, { id: parseInt(id) });
      
      console.log('🔄 Company query result:', companyResult);
      
      if (!companyResult.data || companyResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.data[0];
      const userId = company.user_id;

      console.log('🔄 Found company:', { companyId: company.id, userId });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Company user_id is missing'
        });
      }

      // Update the user's is_active status
      try {
        const updateResult = await query('users', 'update', { 
          is_active: is_active,
          updated_at: new Date().toISOString()
        }, { id: userId });

        console.log('🔄 Update result:', updateResult);

        if (updateResult.data && updateResult.data.length > 0) {
          res.json({
            success: true,
            message: `Company account ${is_active ? 'enabled' : 'disabled'} successfully`
          });
        } else {
          res.json({
            success: true,
            message: `Company account ${is_active ? 'enabled' : 'disabled'} successfully`
          });
        }
      } catch (updateError) {
        console.error('🔄 Update error caught:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update company status',
          error: updateError.message || updateError
        });
      }
    } catch (error) {
      console.error('🔄 Error updating company status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update company status',
        error: error.message
      });
    }
  }

  // Remove partnership/MOA (without deleting the company)
  static async removePartnership(req, res) {
    try {
      const { id } = req.params;

      console.log('🗑️ removePartnership called for company:', id);

      const companyResult = await query('companies', 'select', null, { id: parseInt(id) });
      
      if (!companyResult.data || companyResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.data[0];
      const companyId = parseInt(id);
      const coordinatorUserId = company.moa_uploaded_by;
      console.log('🗑️ Found company:', { companyId: company.id, moa_uploaded_by: coordinatorUserId });

      // PHASE 1: Update the company table (OLD WAY - for backward compatibility)
      const updateData = {
        moa_uploaded_by: null,
        moa_uploaded_at: null,
        partnership_status: 'pending',
        moa_status: 'pending',
        updated_at: new Date().toISOString()
      };

      // Reset approval flags if they exist
      try {
        updateData.coordinator_approved = false;
        updateData.company_approved = false;
      } catch (error) {
        console.log('⚠️ Approval columns may not exist yet');
      }

      const result = await query('companies', 'update', updateData, { id: companyId });

      if (!result.data) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // PHASE 1: Remove partnership from junction table (NEW WAY)
      // If we have coordinator info, remove that specific partnership
      // Otherwise, remove all partnerships for this company
      if (coordinatorUserId) {
        try {
          const coordinatorResult = await query('coordinators', 'select', ['id'], { user_id: coordinatorUserId });
          if (coordinatorResult.data && coordinatorResult.data.length > 0) {
            const coordinatorId = coordinatorResult.data[0].id;
            // Delete the specific partnership
            await query('company_coordinator_partnerships', 'delete', null, { 
              company_id: companyId, 
              coordinator_id: coordinatorId 
            });
            console.log('✅ Removed partnership from junction table');
          }
        } catch (error) {
          console.error('⚠️ Error removing partnership from junction table (migration may not be run yet):', error.message);
        }
      } else {
        // Remove all partnerships for this company
        try {
          await query('company_coordinator_partnerships', 'delete', null, { company_id: companyId });
          console.log('✅ Removed all partnerships from junction table');
        } catch (error) {
          console.error('⚠️ Error removing partnerships from junction table (migration may not be run yet):', error.message);
        }
      }

      console.log('✅ Partnership/MOA removed successfully');

      res.json({
        success: true,
        message: 'Partnership and MOA removed successfully. The company remains in the system.',
        company: result.data
      });
    } catch (error) {
      console.error('❌ Error removing partnership:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove partnership',
        error: error.message
      });
    }
  }

  // Delete company
  static async deleteCompany(req, res) {
    try {
      const { id } = req.params;

      console.log('🗑️ deleteCompany called:', { id });

      const companyResult = await query('companies', 'select', null, { id: parseInt(id) });
      
      console.log('🗑️ Company query result:', companyResult);
      
      if (!companyResult.data || companyResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.data[0];
      const userId = company.user_id;

      console.log('🗑️ Found company:', { companyId: company.id, userId });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Company user_id is missing'
        });
      }

      try {
        const deleteCompanyResult = await query('companies', 'delete', null, { id: parseInt(id) });
        console.log('🗑️ Delete company result:', deleteCompanyResult);
      } catch (deleteError) {
        console.error('🗑️ Error deleting company record:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete company record',
          error: deleteError.message || deleteError
        });
      }

      try {
        const deleteUserResult = await query('users', 'delete', null, { id: userId });
        console.log('🗑️ Delete user result:', deleteUserResult);
      } catch (deleteError) {
        console.error('🗑️ Error deleting user record:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete user record',
          error: deleteError.message || deleteError
        });
      }

      res.json({
        success: true,
        message: 'Company deleted successfully'
      });
    } catch (error) {
      console.error('🗑️ Error deleting company:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete company',
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
          available_slots: company.available_intern_slots || 0,
          total_slots: company.total_intern_capacity || 10,
          description: company.description || `Leading company in ${company.industry} industry`,
          website: company.website || `www.${company.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
          rating: company.rating || 4.5,
          profile_picture: companyUser?.profile_picture || null,
          company_email: companyUser?.email || null,
          user_id: company.user_id,
          application_status: application ? application.status : 'approved',
          applied_at: application ? application.applied_at : undefined,
          hours_of_internship: application ? application.hours_of_internship : null,
          application_id: application ? application.id : null,
          started_at: application ? application.started_at : null,
          finished_at: application ? application.finished_at : null,
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
