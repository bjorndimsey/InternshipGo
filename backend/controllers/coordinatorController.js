const { query } = require('../config/supabase');

class CoordinatorController {
  // Test endpoint for debugging
  static async testPartnershipUpdate(req, res) {
    console.log('🧪 Test partnership update endpoint called');
    
    try {
      // First, let's check what fields exist in the coordinators table
      const sampleCoordinator = await query('coordinators', 'select', null, { id: 1 });
      console.log('🧪 Sample coordinator data:', sampleCoordinator);
      
      // Check if partnership status fields exist
      const testUpdate = await query('coordinators', 'update', {
        partnership_status: 'test'
      }, { id: 999999 }); // Use non-existent ID to avoid actual update
      
      console.log('🧪 Test update result:', testUpdate);
      
      res.json({
        success: true,
        message: 'Test endpoint working',
        timestamp: new Date().toISOString(),
        sampleCoordinator: sampleCoordinator.data?.[0],
        testUpdate: testUpdate
      });
    } catch (error) {
      console.log('🧪 Test update error (expected if fields don\'t exist):', error.message);
      res.json({
        success: true,
        message: 'Test endpoint working',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  // Sync all coordinator and company partnership statuses
  static async syncPartnershipStatuses(req, res) {
    console.log('🔄 Syncing all partnership statuses...');
    
    try {
      // Get all coordinators with their partnership status
      const coordinatorsResult = await query('coordinators', 'select', ['id', 'user_id', 'partnership_status'], {});
      
      if (!coordinatorsResult.data || coordinatorsResult.data.length === 0) {
        return res.json({
          success: true,
          message: 'No coordinators found to sync',
          synced: 0
        });
      }

      let syncedCount = 0;
      const syncResults = [];

      for (const coordinator of coordinatorsResult.data) {
        console.log(`🔄 Syncing coordinator ${coordinator.id} (user_id: ${coordinator.user_id}) with status: ${coordinator.partnership_status}`);
        
        // Find all companies uploaded by this coordinator
        const companiesResult = await query('companies', 'select', ['id', 'partnership_status'], { moa_uploaded_by: coordinator.user_id });
        
        if (companiesResult.data && companiesResult.data.length > 0) {
          console.log(`📝 Found ${companiesResult.data.length} companies for coordinator ${coordinator.id}`);
          
          // Update each company to match coordinator's status
          for (const company of companiesResult.data) {
            if (company.partnership_status !== coordinator.partnership_status) {
              console.log(`🔄 Updating company ${company.id} from ${company.partnership_status} to ${coordinator.partnership_status}`);
              
              const updateData = {
                partnership_status: coordinator.partnership_status,
                partnership_approved_by: coordinator.partnership_approved_by,
                partnership_approved_at: coordinator.partnership_approved_at,
                updated_at: new Date().toISOString()
              };
              
              const updateResult = await query('companies', 'update', updateData, { id: company.id });
              
              if (updateResult.data && updateResult.data.length > 0) {
                syncedCount++;
                syncResults.push({
                  coordinatorId: coordinator.id,
                  companyId: company.id,
                  oldStatus: company.partnership_status,
                  newStatus: coordinator.partnership_status,
                  success: true
                });
                console.log(`✅ Company ${company.id} synced successfully`);
              } else {
                syncResults.push({
                  coordinatorId: coordinator.id,
                  companyId: company.id,
                  oldStatus: company.partnership_status,
                  newStatus: coordinator.partnership_status,
                  success: false,
                  error: 'No data returned from update'
                });
                console.log(`❌ Company ${company.id} sync failed`);
              }
            } else {
              console.log(`✅ Company ${company.id} already synced (${company.partnership_status})`);
            }
          }
        } else {
          console.log(`ℹ️ No companies found for coordinator ${coordinator.id}`);
        }
      }

      res.json({
        success: true,
        message: `Partnership status sync completed. ${syncedCount} companies updated.`,
        synced: syncedCount,
        results: syncResults
      });
    } catch (error) {
      console.error('❌ Error syncing partnership statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync partnership statuses',
        error: error.message
      });
    }
  }

  // Get all coordinators with user data
  static async getAllCoordinators(req, res) {
    try {
      // First get all coordinators
      const coordinatorsResult = await query('coordinators', 'select');
      
      if (!coordinatorsResult.data || coordinatorsResult.data.length === 0) {
        return res.json({
          success: true,
          message: 'No coordinators found',
          coordinators: []
        });
      }

      // Get user data and admin status for each coordinator
      const coordinators = [];
      for (const coordinator of coordinatorsResult.data) {
        const userResult = await query('users', 'select', null, { id: coordinator.user_id });
        
        if (userResult.data && userResult.data.length > 0) {
          const user = userResult.data[0];
          
          // Only include coordinators (not other user types)
          if (user.user_type === 'Coordinator') {
            // Check if coordinator has admin status
            const adminResult = await query('admin_coordinators', 'select', null, { 
              coordinator_id: coordinator.id, 
              is_active: true 
            });
            
            const isAdminCoordinator = adminResult.data && adminResult.data.length > 0;
            
            // Get assigned interns count for this coordinator
            const internsResult = await query('interns', 'select', ['id'], { coordinator_id: coordinator.user_id });
            const assignedInternsCount = internsResult.data ? internsResult.data.length : 0;
            
            coordinators.push({
              id: coordinator.id.toString(),
              userId: coordinator.user_id.toString(),
              name: `${coordinator.first_name} ${coordinator.last_name}`,
              firstName: coordinator.first_name,
              lastName: coordinator.last_name,
              email: user.email,
              phone: coordinator.phone_number,
              program: coordinator.program,
              address: coordinator.address,
              profilePicture: user.profile_picture,
              status: user.is_active ? 'active' : 'inactive',
              joinDate: coordinator.created_at,
              isAdminCoordinator: isAdminCoordinator,
              adminId: isAdminCoordinator ? adminResult.data[0].id.toString() : null,
              adminPermissions: isAdminCoordinator ? adminResult.data[0].permissions : null,
              assignedInterns: assignedInternsCount,
              university: 'University', // This would need to be added to schema or derived
              department: coordinator.program, // Using program as department for now
              campusAssignment: coordinator.campus_assignment,
              assignedBy: coordinator.assigned_by ? coordinator.assigned_by.toString() : null,
              assignedAt: coordinator.assigned_at
            });
          }
        }
      }

      res.json({
        success: true,
        message: 'Coordinators fetched successfully',
        coordinators
      });
    } catch (error) {
      console.error('Error fetching coordinators:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coordinators',
        error: error.message
      });
    }
  }

  // Get coordinators with MOA information for companies
  static async getCoordinatorsWithMOA(req, res) {
    try {
      // Get the company ID from query parameters
      const { companyId } = req.query;
      
      console.log('🔍 Getting coordinators with MOA for company:', companyId);
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      // Get the company information first
      const companyResult = await query('companies', 'select', ['id', 'user_id', 'company_name'], { id: parseInt(companyId) });
      
      if (!companyResult.data || companyResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.data[0];
      console.log('📝 Company found:', company.company_name, 'ID:', company.id);

      // ONLY get coordinators from company_coordinator_partnerships table
      console.log('🔍 Fetching coordinators from partnerships table for company:', company.id);
      const partnershipsResult = await query('company_coordinator_partnerships', 'select', ['coordinator_id', 'coordinator_user_id'], {
        company_id: parseInt(companyId)
      });
      
      if (!partnershipsResult.data || partnershipsResult.data.length === 0) {
        console.log('ℹ️ No partnerships found for company:', companyId);
        return res.json({
          success: true,
          message: 'Coordinators with MOA fetched successfully',
          coordinators: []
        });
      }

      console.log('🔍 Found', partnershipsResult.data.length, 'partnerships for company');

      // Get user data and MOA information for each coordinator
      const coordinators = [];
      for (const partnership of partnershipsResult.data) {
        // Get coordinator data
        const coordinatorResult = await query('coordinators', 'select', null, { id: partnership.coordinator_id });
        
        if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
          console.log('⚠️ Coordinator not found for partnership:', partnership.coordinator_id);
          continue;
        }
        
        const coordinator = coordinatorResult.data[0];
        const userResult = await query('users', 'select', null, { id: coordinator.user_id });
        
        if (userResult.data && userResult.data.length > 0) {
          const user = userResult.data[0];
          
          // Only include coordinators (not other user types)
          if (user.user_type === 'Coordinator') {
            // Get partnership data from junction table
            let partnershipData = null;
            
            try {
              const partnershipDetailResult = await query('company_coordinator_partnerships', 'select', null, { 
                company_id: parseInt(companyId),
                coordinator_id: coordinator.id 
              });
              
              if (partnershipDetailResult.data && partnershipDetailResult.data.length > 0) {
                partnershipData = partnershipDetailResult.data[0];
                console.log('✅ Found partnership in junction table for coordinator', coordinator.id);
              } else {
                console.log('⚠️ Partnership data not found for coordinator', coordinator.id);
                continue; // Skip this coordinator if no partnership data
              }
            } catch (error) {
              console.log('⚠️ Error fetching partnership data:', error.message);
              continue; // Skip this coordinator on error
            }

            // Coordinator has a partnership - include them
            if (partnershipData) {
              // Check if coordinator has admin status
              const adminResult = await query('admin_coordinators', 'select', null, { 
                coordinator_id: coordinator.id, 
                is_active: true 
              });
              
              const isAdminCoordinator = adminResult.data && adminResult.data.length > 0;
              
              // Determine MOA status from partnership data
              let moaStatus = partnershipData.moa_status || 'pending';
              let moaDocument = partnershipData.moa_url ? 'MOA Document' : null;
              let moaSentDate = null;
              let moaReceivedDate = null;
              let moaExpiryDate = null;
              
              moaSentDate = partnershipData.moa_uploaded_at ? new Date(partnershipData.moa_uploaded_at).toISOString().split('T')[0] : null;
              moaReceivedDate = partnershipData.moa_received_date ? new Date(partnershipData.moa_received_date).toISOString().split('T')[0] : null;
              moaExpiryDate = partnershipData.moa_expiry_date;
              
              // Get approval status from partnership table
              let companyApproved = partnershipData.company_approved === true || partnershipData.company_approved === 1;
              let coordinatorApproved = partnershipData.coordinator_approved === true || partnershipData.coordinator_approved === 1;
              
              // Calculate partnership status based on approval flags
              let partnershipStatus = 'pending';
              if (companyApproved && coordinatorApproved) {
                partnershipStatus = 'approved';
              } else {
                partnershipStatus = 'pending';
              }
              
              console.log('🔍 Approval status for coordinator', coordinator.id, ':', {
                source: 'junction_table',
                companyApproved,
                coordinatorApproved,
                calculatedPartnershipStatus: partnershipStatus
              });

              coordinators.push({
                id: coordinator.id.toString(),
                userId: coordinator.user_id.toString(),
                companyId: parseInt(companyId).toString(),
                firstName: coordinator.first_name,
                lastName: coordinator.last_name,
                email: user.email,
                phoneNumber: coordinator.phone_number,
                profilePicture: user.profile_picture,
                employeeId: `EMP${coordinator.id.toString().padStart(6, '0')}`,
                department: coordinator.program,
                position: isAdminCoordinator ? 'Admin Coordinator' : 'Coordinator',
                university: 'University', // This would need to be added to schema
                officeLocation: coordinator.address,
                status: user.is_active ? 'active' : 'inactive',
                moaStatus: moaStatus,
                moaDocument: moaDocument,
                moaUrl: partnershipData.moa_url || null,
                moaPublicId: partnershipData.moa_public_id || null,
                moaSentDate: moaSentDate,
                moaReceivedDate: moaReceivedDate,
                moaExpiryDate: moaExpiryDate,
                partnershipStatus: partnershipStatus,
                companyApproved: companyApproved,
                coordinatorApproved: coordinatorApproved,
                assignedInterns: 0, // This would need to be calculated from related tables
                lastContact: coordinator.updated_at ? new Date(coordinator.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                latitude: user.latitude,
                longitude: user.longitude
              });
              
              console.log('✅ Added coordinator', coordinator.id, 'for company', companyId);
            }
          }
        }
      }

      console.log('📊 Total coordinators found for company', companyId, ':', coordinators.length);

      res.json({
        success: true,
        message: 'Coordinators with MOA fetched successfully',
        coordinators
      });
    } catch (error) {
      console.error('Error fetching coordinators with MOA:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coordinators with MOA',
        error: error.message
      });
    }
  }

  // Update coordinator partnership status
  static async updateCoordinatorPartnershipStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, approvedBy, companyId } = req.body;

      console.log('🔄 Updating coordinator partnership status:', {
        coordinatorId: id,
        status,
        approvedBy,
        companyId
      });

      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid partnership status. Must be pending, approved, or rejected'
        });
      }

      // Get the coordinator's user_id first
      const coordinatorResult = await query('coordinators', 'select', ['user_id'], { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinatorUserId = coordinatorResult.data[0].user_id;
      console.log('📝 Coordinator user_id:', coordinatorUserId);

      // Find ALL companies associated with this coordinator (where moa_uploaded_by = coordinator's user_id)
      let companiesToUpdate = [];
      if (companyId) {
        // Use provided companyId
        const companyResult = await query('companies', 'select', ['id', 'user_id'], { id: parseInt(companyId) });
        if (companyResult.data && companyResult.data.length > 0) {
          companiesToUpdate.push(companyResult.data[0]);
          console.log('📝 Using provided companyId:', companyResult.data[0].id);
        }
      } else {
        // Find ALL companies by moa_uploaded_by
        const companyResult = await query('companies', 'select', ['id', 'user_id'], { moa_uploaded_by: coordinatorUserId });
        if (companyResult.data && companyResult.data.length > 0) {
          companiesToUpdate = companyResult.data;
          console.log('📝 Found companies by moa_uploaded_by:', companiesToUpdate.map(c => c.id));
        }
      }

      // Get the company's user_id to use as partnership_approved_by
      let approvedByValue = null;
      if (companiesToUpdate.length > 0) {
        // Use the company's user_id who is doing the approval
        approvedByValue = companiesToUpdate[0].user_id;
        console.log('📝 Using company user_id as partnership_approved_by:', approvedByValue);
      } else if (companyId) {
        // If no companies found but companyId provided, get the company's user_id
        try {
          const companyResult = await query('companies', 'select', ['user_id'], { id: parseInt(companyId) });
          if (companyResult.data && companyResult.data.length > 0) {
            approvedByValue = companyResult.data[0].user_id;
            console.log('📝 Using provided company user_id as partnership_approved_by:', approvedByValue);
          }
        } catch (error) {
          console.log('⚠️ Error getting company user_id:', error.message);
        }
      } else {
        console.log('⚠️ No companies found for this coordinator, using null for partnership_approved_by');
      }

      // Get current coordinator data to check existing approvals
      // Try to get approval columns, but handle case where they don't exist yet
      let currentCompanyApproved = false;
      let currentCoordinatorApproved = false;
      
      try {
        const currentCoordinator = await query('coordinators', 'select', ['company_approved', 'coordinator_approved'], { id: parseInt(id) });
        if (currentCoordinator.data && currentCoordinator.data.length > 0) {
          currentCompanyApproved = currentCoordinator.data[0].company_approved || false;
          currentCoordinatorApproved = currentCoordinator.data[0].coordinator_approved || false;
        }
      } catch (error) {
        // If columns don't exist yet, default to false
        console.log('⚠️ Approval columns may not exist yet, defaulting to false:', error.message);
        currentCompanyApproved = false;
        currentCoordinatorApproved = false;
      }

      // When company approves coordinator, set company_approved = true
      // IMPORTANT: This is the COMPANY's approval of the coordinator, NOT the coordinator's approval
      const companyApproved = status === 'approved' ? true : (status === 'rejected' ? false : currentCompanyApproved);
      
      // For coordinator_approved, we need to check the COMPANIES table, not the coordinators table
      // The coordinator's approval is stored in the companies table as coordinator_approved
      // We should NOT use currentCoordinatorApproved from coordinators table for this check
      // Instead, we'll check the companies table when updating
      
      // Calculate final partnership status based on both approvals
      // IMPORTANT: Only set to 'approved' if BOTH sides have approved
      // Since we're updating from company side, we need to check if coordinator has approved in companies table
      let finalStatus = 'pending';
      
      // If company is rejecting, set to pending
      if (status === 'rejected') {
        finalStatus = 'pending';
      } else if (companyApproved) {
        // Company has approved, but we need to check if coordinator has also approved
        // We'll check this in the companies table update below
        // For now, keep it as pending until we verify coordinator approval
        finalStatus = 'pending';
      } else {
        // Neither approved
        finalStatus = 'pending';
      }
      
      console.log('🔍 Partnership status calculation:', {
        companyApproved,
        currentCoordinatorApproved,
        status,
        finalStatus,
        message: 'Company approval recorded. Partnership will be active only after coordinator also approves.'
      });

      const updateData = {
        partnership_status: finalStatus,
        partnership_approved_by: approvedByValue,
        partnership_approved_at: finalStatus === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        company_approved: companyApproved
      };

      console.log('📤 Update data:', updateData);

      // Update the coordinator table
      const result = await query('coordinators', 'update', updateData, { id: parseInt(id) });
      
      console.log('📥 Coordinators update result:', result);

      if (!result.data) {
        console.log('❌ No data returned from coordinators update operation');
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      // PHASE 1: Update companies table (OLD WAY - for backward compatibility)
      // FIXED: Only update the specific company if companyId provided, not ALL companies
      if (companiesToUpdate.length > 0) {
        const now = new Date().toISOString();
        const coordinatorId = parseInt(id);
        
        // Only process the specific company if companyId was provided
        // Otherwise, process all companies (for backward compatibility, but this is a bug)
        const companiesToProcess = companyId ? companiesToUpdate.slice(0, 1) : companiesToUpdate;
        
        console.log('🔄 Updating companies table for', companiesToProcess.length, 'company(ies):', companiesToProcess.map(c => c.id));
        
        // For each company, check if coordinator has approved it
        for (const company of companiesToProcess) {
          try {
            // Get current company approval status
            const currentCompany = await query('companies', 'select', ['coordinator_approved', 'company_approved'], { id: company.id });
            const currentCompanyCoordinatorApproved = currentCompany.data && currentCompany.data.length > 0 
              ? (currentCompany.data[0].coordinator_approved || false)
              : false;
            const currentCompanyCompanyApproved = currentCompany.data && currentCompany.data.length > 0 
              ? (currentCompany.data[0].company_approved || false)
              : false;

            // When company approves coordinator:
            // - Set company_approved = true in companies table (company approved this coordinator)
            // - DO NOT change coordinator_approved - that's only set when coordinator approves
            const companyApprovedForCompany = companyApproved;
            
            // Calculate final status for company based on both approvals
            let companyFinalStatus = 'pending';
            
            if (status === 'rejected') {
              companyFinalStatus = 'pending';
            } else if (currentCompanyCoordinatorApproved && companyApprovedForCompany) {
              companyFinalStatus = 'approved';
            } else {
              companyFinalStatus = 'pending';
            }
            
            console.log('🔍 Company final status calculation:', {
              companyId: company.id,
              currentCompanyCoordinatorApproved,
              companyApprovedForCompany,
              companyFinalStatus
            });

            // PHASE 1: Update companies table (OLD WAY)
            const companyUpdateData = {
              company_approved: companyApprovedForCompany,
              partnership_status: companyFinalStatus,
              partnership_approved_by: approvedByValue,
              partnership_approved_at: companyFinalStatus === 'approved' ? now : null,
              updated_at: now
            };
            
            const companyResult = await query('companies', 'update', companyUpdateData, { id: company.id });
            
            if (companyResult.data && companyResult.data.length > 0) {
              console.log('✅ Company', company.id, 'updated successfully in companies table');
              
              // PHASE 1: Update partnership in junction table (NEW WAY)
              try {
                const partnershipResult = await query('company_coordinator_partnerships', 'select', ['id'], { 
                  company_id: company.id,
                  coordinator_id: coordinatorId
                });

                if (partnershipResult.data && partnershipResult.data.length > 0) {
                  // Update existing partnership
                  const partnershipUpdateData = {
                    company_approved: companyApprovedForCompany,
                    partnership_status: companyFinalStatus,
                    partnership_approved_by: approvedByValue,
                    partnership_approved_at: companyFinalStatus === 'approved' ? now : null,
                    updated_at: now
                  };
                  await query('company_coordinator_partnerships', 'update', partnershipUpdateData, { 
                    id: partnershipResult.data[0].id 
                  });
                  console.log('✅ Updated partnership in junction table');
                } else {
                  console.log('⚠️ Partnership not found in junction table, may need to create it');
                }
              } catch (error) {
                console.error('⚠️ Error updating partnership junction table (migration may not be run yet):', error.message);
              }
            } else {
              console.log('❌ Company', company.id, 'update failed - no data returned');
            }
          } catch (companyError) {
            console.error('❌ Error updating company', company.id, ':', companyError);
          }
        }
      } else {
        console.log('ℹ️ No companies found for this coordinator, skipping companies table update');
      }

      console.log('✅ Partnership status updated successfully in coordinators table:', result.data);
      res.json({
        success: true,
        message: companyApproved 
          ? (finalStatus === 'approved' ? 'Partnership approved successfully! Both sides have approved.' : 'Your approval has been recorded. Waiting for coordinator approval.')
          : 'Partnership status updated',
        coordinator: result.data
      });
    } catch (error) {
      console.error('Error updating coordinator partnership status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update coordinator partnership status',
        error: error.message
      });
    }
  }

  // Get coordinator by ID
  static async getCoordinatorById(req, res) {
    try {
      const { id } = req.params;
      
      // Get coordinator data
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(id) });
      
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinator = coordinatorResult.data[0];
      
      // Get user data
      const userResult = await query('users', 'select', null, { id: coordinator.user_id });
      
      if (!userResult.data || userResult.data.length === 0 || userResult.data[0].user_type !== 'Coordinator') {
        return res.status(404).json({
          success: false,
          message: 'Coordinator user not found'
        });
      }

      const user = userResult.data[0];
      const coordinatorData = {
        id: coordinator.id.toString(),
        userId: coordinator.user_id.toString(),
        name: `${coordinator.first_name} ${coordinator.last_name}`,
        firstName: coordinator.first_name,
        lastName: coordinator.last_name,
        email: user.email,
        phone: coordinator.phone_number,
        program: coordinator.program,
        address: coordinator.address,
        profilePicture: user.profile_picture,
        status: user.is_active ? 'active' : 'inactive',
        joinDate: coordinator.created_at,
        isAdminCoordinator: false,
        assignedInterns: 0,
        university: 'University',
        department: coordinator.program
      };

      res.json({
        success: true,
        message: 'Coordinator fetched successfully',
        coordinator: coordinatorData
      });
    } catch (error) {
      console.error('Error fetching coordinator:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coordinator',
        error: error.message
      });
    }
  }

  // Create new coordinator
  static async createCoordinator(req, res) {
    try {
      const { firstName, lastName, email, phone, program, address, password } = req.body;

      // Check if email already exists
      const emailCheck = await query('users', 'select', null, { email });
      if (emailCheck.data && emailCheck.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user first
      const userData = {
        user_type: 'Coordinator',
        email: email,
        password_hash: passwordHash,
        is_active: true
      };

      const userResult = await query('users', 'insert', userData);
      const userId = userResult.data[0].id;

      // Create coordinator profile
      const coordinatorData = {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        program: program,
        phone_number: phone,
        address: address
      };

      const coordinatorResult = await query('coordinators', 'insert', coordinatorData);

      res.status(201).json({
        success: true,
        message: 'Coordinator created successfully',
        coordinator: {
          id: coordinatorResult.data[0].id,
          userId: userId,
          name: `${firstName} ${lastName}`,
          email: email,
          phone: phone,
          program: program,
          address: address,
          status: 'active'
        }
      });
    } catch (error) {
      console.error('Error creating coordinator:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create coordinator',
        error: error.message
      });
    }
  }

  // Update coordinator
  static async updateCoordinator(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone, program, address, isActive } = req.body;

      // Get coordinator data
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(id) });

      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinator = coordinatorResult.data[0];
      const userId = coordinator.user_id;

      // Get current user data to check email
      const userResult = await query('users', 'select', null, { id: userId });
      const currentUser = userResult.data[0];

      // Update user data if email changed
      if (email && email !== currentUser.email) {
        const emailCheck = await query('users', 'select', null, { email });
        if (emailCheck.data && emailCheck.data.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }

        await query('users', 'update', { email }, { id: userId });
      }

      // Update user active status
      if (isActive !== undefined) {
        await query('users', 'update', { is_active: isActive }, { id: userId });
      }

      // Update coordinator data
      const updateData = {};
      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (phone) updateData.phone_number = phone;
      if (program) updateData.program = program;
      if (address) updateData.address = address;
      updateData.updated_at = new Date().toISOString();

      await query('coordinators', 'update', updateData, { id });

      res.json({
        success: true,
        message: 'Coordinator updated successfully'
      });
    } catch (error) {
      console.error('Error updating coordinator:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update coordinator',
        error: error.message
      });
    }
  }

  // Delete coordinator
  static async deleteCoordinator(req, res) {
    try {
      const { id } = req.params;

      // Get coordinator user_id
      const coordinatorResult = await query('coordinators', 'select', null, { id });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const userId = coordinatorResult.data[0].user_id;

      // Delete coordinator (this will cascade to user due to foreign key)
      await query('coordinators', 'delete', null, { id });

      res.json({
        success: true,
        message: 'Coordinator deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting coordinator:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete coordinator',
        error: error.message
      });
    }
  }

  // Toggle admin status
  static async toggleAdminStatus(req, res) {
    try {
      const { id } = req.params;
      let { isAdmin, assignedBy } = req.body;

      // Check if coordinator exists
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      // Resolve assignedBy: if not provided or invalid, find a system admin user
      let finalAssignedBy = null;
      
      if (assignedBy) {
        // Check if the provided assignedBy user exists
        const userCheck = await query('users', 'select', ['id'], { id: parseInt(assignedBy) });
        if (userCheck.data && userCheck.data.length > 0) {
          finalAssignedBy = parseInt(assignedBy);
          console.log('✅ Using provided assignedBy user ID:', finalAssignedBy);
        } else {
          console.warn('⚠️ Provided assignedBy user ID does not exist:', assignedBy);
        }
      }
      
      // If assignedBy is not provided or invalid, find a system admin user
      if (!finalAssignedBy) {
        console.log('🔍 Searching for system admin user...');
        // Try to find a system admin user (user_type might be 'System Admin' or 'System')
        const systemAdminResult = await query('users', 'select', ['id'], { 
          user_type: 'System Admin'
        });
        
        if (systemAdminResult.data && systemAdminResult.data.length > 0) {
          finalAssignedBy = systemAdminResult.data[0].id;
          console.log('✅ Found system admin user ID:', finalAssignedBy);
        } else {
          // Try alternative user_type values
          const altSystemAdminResult = await query('users', 'select', ['id'], { 
            user_type: 'System'
          });
          
          if (altSystemAdminResult.data && altSystemAdminResult.data.length > 0) {
            finalAssignedBy = altSystemAdminResult.data[0].id;
            console.log('✅ Found system admin user ID (alternative):', finalAssignedBy);
          } else {
            // If still not found, try to get any active user
            const anyAdminResult = await query('users', 'select', ['id'], { 
              is_active: true
            });
            
            if (anyAdminResult.data && anyAdminResult.data.length > 0) {
              // Use the first active user as fallback
              finalAssignedBy = anyAdminResult.data[0].id;
              console.warn('⚠️ No system admin found, using first active user as fallback:', finalAssignedBy);
            } else {
              return res.status(500).json({
                success: false,
                message: 'No valid system admin user found to assign admin status. Please ensure at least one system admin user exists in the database.'
              });
            }
          }
        }
      }

      // Check current admin status (check for any existing record, not just active ones)
      const currentAdminResult = await query('admin_coordinators', 'select', null, { 
        coordinator_id: parseInt(id)
      });

      if (isAdmin) {
        // Assign admin status
        if (currentAdminResult.data && currentAdminResult.data.length > 0) {
          // Already has admin record, reactivate it
          await query('admin_coordinators', 'update', { 
            is_active: true,
            assigned_by: finalAssignedBy,
            updated_at: new Date().toISOString()
          }, { id: currentAdminResult.data[0].id });
          console.log('✅ Reactivated existing admin coordinator record');
        } else {
          // Create new admin record
          const adminData = {
            coordinator_id: parseInt(id),
            assigned_by: finalAssignedBy,
            is_active: true,
            permissions: {
              can_manage_coordinators: true,
              can_manage_interns: true,
              can_manage_companies: true,
              can_view_reports: true
            },
            notes: 'Admin status assigned via system'
          };
          await query('admin_coordinators', 'insert', adminData);
          console.log('✅ Created new admin coordinator record with assigned_by:', finalAssignedBy);
        }
      } else {
        // Remove admin status
        if (currentAdminResult.data && currentAdminResult.data.length > 0) {
          await query('admin_coordinators', 'update', { 
            is_active: false,
            updated_at: new Date().toISOString()
          }, { id: currentAdminResult.data[0].id });
          console.log('✅ Deactivated admin coordinator record');
        }
      }

      res.json({
        success: true,
        message: `Coordinator admin status ${isAdmin ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling admin status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle admin status',
        error: error.message
      });
    }
  }

  // Update coordinator account status (enable/disable)
  static async updateCoordinatorStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      console.log('🔄 updateCoordinatorStatus called:', { id, is_active, type: typeof is_active });

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'is_active must be a boolean value'
        });
      }

      // Get the coordinator to find the user_id
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(id) });
      
      console.log('🔄 Coordinator query result:', coordinatorResult);
      
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinator = coordinatorResult.data[0];
      const userId = coordinator.user_id;

      console.log('🔄 Found coordinator:', { coordinatorId: coordinator.id, userId });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Coordinator user_id is missing'
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
            message: `Coordinator account ${is_active ? 'enabled' : 'disabled'} successfully`
          });
        } else {
          res.json({
            success: true,
            message: `Coordinator account ${is_active ? 'enabled' : 'disabled'} successfully`
          });
        }
      } catch (updateError) {
        console.error('🔄 Update error caught:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update coordinator status',
          error: updateError.message || updateError
        });
      }
    } catch (error) {
      console.error('🔄 Error updating coordinator status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update coordinator status',
        error: error.message
      });
    }
  }

  // Get admin coordinator profile by user ID
  static async getAdminCoordinatorProfile(req, res) {
    try {
      const { userId } = req.params;

      // Get user data
      const userResult = await query('users', 'select', null, { id: parseInt(userId) });
      if (!userResult.data || userResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.data[0];

      // Get coordinator data
      const coordinatorResult = await query('coordinators', 'select', null, { user_id: parseInt(userId) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator profile not found'
        });
      }

      const coordinator = coordinatorResult.data[0];

      // Get admin status and permissions
      const adminResult = await query('admin_coordinators', 'select', null, { 
        coordinator_id: coordinator.id, 
        is_active: true 
      });

      if (!adminResult.data || adminResult.data.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User is not an admin coordinator'
        });
      }

      const adminData = adminResult.data[0];

      // Get statistics (mock data for now - you can implement real queries later)
      const stats = {
        totalCoordinators: 0, // This would need to be calculated from coordinators table
        managedInterns: 0,    // This would need to be calculated from interns table
        activePartnerships: 0, // This would need to be calculated from companies table
        completedProjects: 0,  // This would need to be calculated from projects table
      };

      // Format permissions array
      const permissions = [];
      if (adminData.permissions) {
        if (adminData.permissions.can_manage_coordinators) permissions.push('Manage Coordinators');
        if (adminData.permissions.can_manage_interns) permissions.push('Manage Interns');
        if (adminData.permissions.can_manage_companies) permissions.push('Manage Companies');
        if (adminData.permissions.can_view_reports) permissions.push('View Reports');
        if (adminData.permissions.can_manage_events) permissions.push('Manage Events');
        if (adminData.permissions.can_manage_notifications) permissions.push('Manage Notifications');
      }

      const profile = {
        id: coordinator.id.toString(),
        userId: user.id.toString(),
        firstName: coordinator.first_name,
        lastName: coordinator.last_name,
        email: user.email,
        phoneNumber: coordinator.phone_number,
        profilePicture: user.profile_picture,
        employeeId: `ADM${coordinator.id.toString().padStart(6, '0')}`,
        department: coordinator.program,
        position: 'Admin Coordinator',
        university: 'University', // This could be added to the schema later
        officeLocation: 'Admin Office', // This could be added to the schema later
        hireDate: coordinator.created_at.split('T')[0], // Convert to date only
        lastLogin: user.updated_at,
        permissions: permissions,
        totalCoordinators: stats.totalCoordinators,
        managedInterns: stats.managedInterns,
        activePartnerships: stats.activePartnerships,
        completedProjects: stats.completedProjects,
        rating: 4.9, // This could be calculated from reviews table
        reviews: 0,  // This could be calculated from reviews table
        adminId: adminData.id.toString(),
        assignedAt: adminData.assigned_at,
        assignedBy: adminData.assigned_by,
        notes: adminData.notes
      };

      res.json({
        success: true,
        message: 'Admin coordinator profile fetched successfully',
        profile: profile
      });

    } catch (error) {
      console.error('Error fetching admin coordinator profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin coordinator profile',
        error: error.message
      });
    }
  }

  // Get coordinator profile by coordinators.id (returns user_id)
  static async getCoordinatorProfile(req, res) {
    try {
      const { id } = req.params;
      console.log('👨‍🏫 Fetching coordinator profile for coordinators.id:', id);

      // Get coordinator by coordinators.id
      const coordinatorResult = await query('coordinators', 'select', null, { id: id });
      const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
      
      if (!coordinator) {
        console.log('❌ Coordinator not found for coordinators.id:', id);
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      // Get user details
      const userResult = await query('users', 'select', null, { id: coordinator.user_id });
      const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;

      if (!user) {
        console.log('❌ User not found for coordinator user_id:', coordinator.user_id);
        return res.status(404).json({
          success: false,
          message: 'User not found for coordinator'
        });
      }

      console.log('✅ Found coordinator profile:', {
        coordinators_id: coordinator.id,
        user_id: user.id,
        email: user.email
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          user_type: user.user_type,
          google_id: user.google_id,
          profile_picture: user.profile_picture,
          first_name: coordinator.first_name,
          last_name: coordinator.last_name,
          program: coordinator.program,
          phone_number: coordinator.phone_number,
          address: coordinator.address
        }
      });
    } catch (error) {
      console.error('Error fetching coordinator profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coordinator profile',
        error: error.message
      });
    }
  }

  // Get coordinator profile by user_id (returns coordinators.id)
  static async getCoordinatorProfileByUserId(req, res) {
    try {
      const { userId } = req.params;
      console.log('👨‍🏫 Fetching coordinator profile for user_id:', userId);

      // Get coordinator by user_id
      const coordinatorResult = await query('coordinators', 'select', null, { user_id: parseInt(userId) });
      const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
      
      if (!coordinator) {
        console.log('❌ Coordinator not found for user_id:', userId);
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
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

      console.log('✅ Found coordinator profile by user_id:', {
        coordinators_id: coordinator.id,
        user_id: user.id,
        email: user.email
      });

      res.json({
        success: true,
        user: {
          id: coordinator.id, // Return coordinators.id for use in other APIs
          user_id: user.id,
          email: user.email,
          user_type: user.user_type,
          google_id: user.google_id,
          profile_picture: user.profile_picture,
          first_name: coordinator.first_name,
          last_name: coordinator.last_name,
          program: coordinator.program,
          phone_number: coordinator.phone_number,
          address: coordinator.address
        }
      });
    } catch (error) {
      console.error('Error fetching coordinator profile by user_id:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coordinator profile',
        error: error.message
      });
    }
  }

  // Campus Assignment methods
  static async assignCampus(req, res) {
    try {
      const { id } = req.params;
      const { campusType, assignedBy } = req.body;

      if (!campusType || !assignedBy) {
        return res.status(400).json({
          success: false,
          message: 'campusType and assignedBy are required'
        });
      }

      if (!['in-campus', 'off-campus'].includes(campusType)) {
        return res.status(400).json({
          success: false,
          message: 'campusType must be either "in-campus" or "off-campus"'
        });
      }

      // Check if coordinator exists
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      // Update coordinator with campus assignment
      await query('coordinators', 'update', {
        campus_assignment: campusType,
        assigned_by: parseInt(assignedBy),
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { id: parseInt(id) });

      // Create notification for the coordinator
      const CoordinatorNotificationController = require('./coordinatorNotificationController');
      const notification = await CoordinatorNotificationController.createCampusAssignmentNotification(
        id, 
        campusType, 
        assignedBy
      );
      
      if (notification) {
        console.log('🔔 Campus assignment notification created successfully');
      } else {
        console.log('⚠️ Failed to create campus assignment notification');
      }

      res.json({
        success: true,
        message: `Coordinator assigned to ${campusType} duties successfully`
      });
    } catch (error) {
      console.error('Error assigning campus:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign campus',
        error: error.message
      });
    }
  }

  static async getCampusAssignment(req, res) {
    try {
      const { id } = req.params;

      // Check if coordinator exists and get campus assignment
      const coordinatorResult = await query('coordinators', 'select', ['campus_assignment', 'assigned_by', 'assigned_at'], { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinator = coordinatorResult.data[0];
      
      if (!coordinator.campus_assignment) {
        return res.json({
          success: true,
          message: 'No campus assignment found',
          assignment: null
        });
      }

      res.json({
        success: true,
        message: 'Campus assignment retrieved successfully',
        assignment: {
          coordinatorId: parseInt(id),
          campusType: coordinator.campus_assignment,
          assignedBy: coordinator.assigned_by,
          assignedAt: coordinator.assigned_at
        }
      });
    } catch (error) {
      console.error('Error getting campus assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get campus assignment',
        error: error.message
      });
    }
  }

  static async updateCampusAssignment(req, res) {
    try {
      const { id } = req.params;
      const { campusType, updatedBy } = req.body;

      if (!campusType || !updatedBy) {
        return res.status(400).json({
          success: false,
          message: 'campusType and updatedBy are required'
        });
      }

      if (!['in-campus', 'off-campus'].includes(campusType)) {
        return res.status(400).json({
          success: false,
          message: 'campusType must be either "in-campus" or "off-campus"'
        });
      }

      // Check if coordinator exists
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      // Check if coordinator has a campus assignment
      if (!coordinatorResult.data[0].campus_assignment) {
        return res.status(404).json({
          success: false,
          message: 'No campus assignment found for this coordinator'
        });
      }

      // Update campus assignment
      await query('coordinators', 'update', {
        campus_assignment: campusType,
        assigned_by: parseInt(updatedBy),
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { id: parseInt(id) });

      res.json({
        success: true,
        message: `Coordinator campus assignment updated to ${campusType} successfully`
      });
    } catch (error) {
      console.error('Error updating campus assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update campus assignment',
        error: error.message
      });
    }
  }

  static async removeCampusAssignment(req, res) {
    try {
      const { id } = req.params;
      const { removedBy } = req.body;

      if (!removedBy) {
        return res.status(400).json({
          success: false,
          message: 'removedBy is required'
        });
      }

      // Check if coordinator exists
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      // Check if coordinator has a campus assignment
      if (!coordinatorResult.data[0].campus_assignment) {
        return res.status(404).json({
          success: false,
          message: 'No campus assignment found for this coordinator'
        });
      }

      // Remove campus assignment (set to null)
      await query('coordinators', 'update', {
        campus_assignment: null,
        assigned_by: null,
        assigned_at: null,
        updated_at: new Date().toISOString()
      }, { id: parseInt(id) });

      // Create notification for campus assignment removal
      const CoordinatorNotificationController = require('./coordinatorNotificationController');
      const notification = await CoordinatorNotificationController.createCampusAssignmentNotification(
        id, 
        'removed', 
        removedBy
      );
      
      if (notification) {
        console.log('🔔 Campus assignment removal notification created successfully');
      } else {
        console.log('⚠️ Failed to create campus assignment removal notification');
      }

      res.json({
        success: true,
        message: 'Campus assignment removed successfully'
      });
    } catch (error) {
      console.error('Error removing campus assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove campus assignment',
        error: error.message
      });
    }
  }

  // Get companies available for assignment (have MOA with another coordinator, match program-industry)
  static async getAvailableCompaniesForAssignment(req, res) {
    try {
      const { coordinatorId } = req.params;
      
      if (!coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'Coordinator ID is required'
        });
      }

      // Get coordinator details
      const coordinatorResult = await query('coordinators', 'select', ['id', 'user_id', 'program'], { id: parseInt(coordinatorId) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinator = coordinatorResult.data[0];
      const coordinatorProgram = coordinator.program ? coordinator.program.toLowerCase() : '';

      // Get all companies that have at least one active MOA with any coordinator
      // First, get all partnerships with active MOA
      const partnershipsResult = await query('company_coordinator_partnerships', 'select', ['company_id', 'moa_status'], {});
      
      // Get unique company IDs that have active MOA
      const companiesWithMOA = new Set();
      if (partnershipsResult.data) {
        partnershipsResult.data.forEach(partnership => {
          if (partnership.moa_status === 'active' || partnership.moa_status === 'approved') {
            companiesWithMOA.add(partnership.company_id);
          }
        });
      }

      if (companiesWithMOA.size === 0) {
        return res.json({
          success: true,
          companies: []
        });
      }

      // Get all companies
      const allCompaniesResult = await query('companies', 'select', null, {});
      if (!allCompaniesResult.data) {
        return res.json({
          success: true,
          companies: []
        });
      }

      // Program-industry matching function (flexible keyword-based)
      const matchesProgramIndustry = (companyIndustry) => {
        if (!coordinatorProgram || !companyIndustry) return false;
        
        const industry = companyIndustry.toLowerCase();
        
        // Direct match
        if (industry.includes(coordinatorProgram)) return true;
        
        // Keyword-based matching
        const programKeywords = {
          'bsit': ['information technology', 'it', 'computer science', 'software engineering', 'web development', 'mobile development', 'technology', 'tech', 'software', 'programming', 'computer', 'computers', 'laptop', 'laptops', 'designing', 'design', 'print', 'printing', 'graphic design', 'print and designing', 'technical', 'word', 'excel', 'encoding', 'coding', 'programming', 'web design', 'graphic', 'digital design', 'computer programming', 'software development', 'game dev', 'game development', 'gaming', 'game design', 'video game', 'game programming', 'game developer'],
          'bitm': ['machine', 'motor', 'automotive', 'industrial', 'mechanical', 'manufacturing', 'industrial management', 'industrial technology', 'machine field', 'motor machine', 'automotive technology', 'industrial technology management', 'mechanic', 'machinery', 'automotive engineering'],
          'bsmath': ['mathematics', 'math', 'mathematical', 'maths'],
          'bsce': ['civil engineering', 'construction', 'infrastructure', 'architecture', 'structural', 'engineering', 'building', 'construction management', 'civil'],
          'bsmrs': ['mathematics', 'math', 'statistics', 'research', 'data analysis', 'analytics', 'quantitative', 'statistical analysis', 'statistical', 'mathematical research', 'math research', 'statistical research', 'analytics research']
        };

        const keywords = programKeywords[coordinatorProgram] || [];
        return keywords.some(keyword => industry.includes(keyword));
      };

      // Filter companies: must have MOA with another coordinator AND match program-industry
      const availableCompanies = [];
      const coordinatorUserId = coordinator.user_id;

      for (const company of allCompaniesResult.data) {
        // Check if company has MOA with another coordinator (not this one)
        if (!companiesWithMOA.has(company.id)) continue;

        // Check if company already has partnership with this coordinator
        const existingPartnership = await query('company_coordinator_partnerships', 'select', ['id'], {
          company_id: company.id,
          coordinator_id: coordinator.id
        });
        
        const isAlreadyAssigned = existingPartnership.data && existingPartnership.data.length > 0;
        
        // Check if company has MOA with a different coordinator
        const otherPartnerships = await query('company_coordinator_partnerships', 'select', ['coordinator_id', 'moa_status'], {
          company_id: company.id
        });
        
        const hasMOAWithOther = otherPartnerships.data && otherPartnerships.data.some(
          p => p.coordinator_id !== coordinator.id && (p.moa_status === 'active' || p.moa_status === 'approved')
        );

        // Must have MOA with another coordinator AND match program-industry
        if (hasMOAWithOther && matchesProgramIndustry(company.industry)) {
          // Get user data for company
          const userResult = await query('users', 'select', ['email', 'profile_picture'], { id: company.user_id });
          const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;

          availableCompanies.push({
            id: company.id.toString(),
            name: company.company_name,
            industry: company.industry,
            address: company.address,
            email: user ? user.email : '',
            profilePicture: user ? user.profile_picture : null,
            isAlreadyAssigned: isAlreadyAssigned
          });
        }
      }

      res.json({
        success: true,
        companies: availableCompanies
      });
    } catch (error) {
      console.error('Error getting available companies for assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available companies',
        error: error.message
      });
    }
  }

  // Assign coordinator to company (auto-approved by admin)
  static async assignCoordinatorToCompany(req, res) {
    try {
      const { id } = req.params; // coordinator id
      const { companyId, assignedBy } = req.body;

      if (!companyId || !assignedBy) {
        return res.status(400).json({
          success: false,
          message: 'companyId and assignedBy are required'
        });
      }

      // Get coordinator details
      const coordinatorResult = await query('coordinators', 'select', ['id', 'user_id', 'program'], { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinator = coordinatorResult.data[0];
      const coordinatorUserId = coordinator.user_id;

      // Get company details
      const companyResult = await query('companies', 'select', ['id', 'industry'], { id: parseInt(companyId) });
      if (!companyResult.data || companyResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.data[0];

      // Check if partnership already exists
      const existingPartnership = await query('company_coordinator_partnerships', 'select', ['id'], {
        company_id: parseInt(companyId),
        coordinator_id: coordinator.id
      });

      if (existingPartnership.data && existingPartnership.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Coordinator is already assigned to this company'
        });
      }

      // Validate program-industry match
      const coordinatorProgram = coordinator.program ? coordinator.program.toLowerCase() : '';
      const companyIndustry = company.industry ? company.industry.toLowerCase() : '';

      const programKeywords = {
        'bsit': ['information technology', 'it', 'computer science', 'software engineering', 'web development', 'mobile development', 'technology', 'tech', 'software', 'programming', 'computer', 'computers', 'laptop', 'laptops', 'designing', 'design', 'print', 'printing', 'graphic design', 'print and designing', 'technical', 'word', 'excel', 'encoding', 'coding', 'programming', 'web design', 'graphic', 'digital design', 'computer programming', 'software development', 'game dev', 'game development', 'gaming', 'game design', 'video game', 'game programming', 'game developer'],
        'bitm': ['machine', 'motor', 'automotive', 'industrial', 'mechanical', 'manufacturing', 'industrial management', 'industrial technology', 'machine field', 'motor machine', 'automotive technology', 'industrial technology management', 'mechanic', 'machinery', 'automotive engineering'],
        'bsmath': ['mathematics', 'math', 'mathematical', 'maths'],
        'bsce': ['civil engineering', 'construction', 'infrastructure', 'architecture', 'structural', 'engineering', 'building', 'construction management', 'civil'],
        'bsmrs': ['mathematics', 'math', 'statistics', 'research', 'data analysis', 'analytics', 'quantitative', 'statistical analysis', 'statistical', 'mathematical research', 'math research', 'statistical research', 'analytics research']
      };

      const keywords = programKeywords[coordinatorProgram] || [];
      const matchesProgram = coordinatorProgram && companyIndustry && (
        companyIndustry.includes(coordinatorProgram) ||
        keywords.some(keyword => companyIndustry.includes(keyword))
      );

      if (!matchesProgram) {
        return res.status(400).json({
          success: false,
          message: `Coordinator program (${coordinator.program}) does not match company industry (${company.industry})`
        });
      }

      // Check if company has a partnership with another coordinator
      // This ensures the company is already partnered with at least one other coordinator
      const otherPartnerships = await query('company_coordinator_partnerships', 'select', ['coordinator_id', 'partnership_status', 'coordinator_approved', 'company_approved'], {
        company_id: parseInt(companyId)
      });

      // Check if there's any partnership with another coordinator (not the one being assigned)
      // A partnership is considered valid if both coordinator and company have approved it
      const hasPartnershipWithOther = otherPartnerships.data && otherPartnerships.data.some(
        p => {
          const isOtherCoordinator = p.coordinator_id !== coordinator.id;
          const coordinatorApproved = p.coordinator_approved === true || p.coordinator_approved === 1 || p.coordinator_approved === 'true' || p.coordinator_approved === '1';
          const companyApproved = p.company_approved === true || p.company_approved === 1 || p.company_approved === 'true' || p.company_approved === '1';
          const isApproved = (p.partnership_status === 'approved') || (coordinatorApproved && companyApproved);
          
          return isOtherCoordinator && isApproved;
        }
      );

      if (!hasPartnershipWithOther) {
        return res.status(400).json({
          success: false,
          message: 'Company must have an approved partnership with another coordinator'
        });
      }

      // Create partnership with auto-approval
      const now = new Date().toISOString();
      const partnershipData = {
        company_id: parseInt(companyId),
        coordinator_id: coordinator.id,
        coordinator_user_id: coordinatorUserId,
        coordinator_approved: true,
        company_approved: true,
        partnership_status: 'approved',
        partnership_approved_by: parseInt(assignedBy),
        partnership_approved_at: now,
        created_at: now,
        updated_at: now
      };

      const partnershipResult = await query('company_coordinator_partnerships', 'insert', partnershipData);

      if (!partnershipResult.data) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create partnership'
        });
      }

      res.json({
        success: true,
        message: 'Coordinator assigned to company successfully',
        partnership: partnershipResult.data
      });
    } catch (error) {
      console.error('Error assigning coordinator to company:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign coordinator to company',
        error: error.message
      });
    }
  }

  // Get assigned companies for a coordinator
  static async getCoordinatorAssignedCompanies(req, res) {
    try {
      const { id } = req.params; // coordinator id

      // Get coordinator
      const coordinatorResult = await query('coordinators', 'select', ['id'], { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinator = coordinatorResult.data[0];

      // Get all partnerships for this coordinator
      const partnershipsResult = await query('company_coordinator_partnerships', 'select', null, {
        coordinator_id: coordinator.id
      });

      if (!partnershipsResult.data || partnershipsResult.data.length === 0) {
        return res.json({
          success: true,
          companies: []
        });
      }

      // Get company details for each partnership
      const companies = [];
      for (const partnership of partnershipsResult.data) {
        const companyResult = await query('companies', 'select', null, { id: partnership.company_id });
        if (companyResult.data && companyResult.data.length > 0) {
          const company = companyResult.data[0];
          
          // Get user data
          const userResult = await query('users', 'select', ['email', 'profile_picture'], { id: company.user_id });
          const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;

          companies.push({
            id: company.id.toString(),
            name: company.company_name,
            industry: company.industry,
            address: company.address,
            email: user ? user.email : '',
            profilePicture: user ? user.profile_picture : null,
            partnershipStatus: partnership.partnership_status,
            assignedAt: partnership.created_at,
            partnershipId: partnership.id.toString() // Include partnership ID for unassigning
          });
        }
      }

      res.json({
        success: true,
        companies: companies
      });
    } catch (error) {
      console.error('Error getting coordinator assigned companies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get assigned companies',
        error: error.message
      });
    }
  }

  // Unassign coordinator from company
  static async unassignCoordinatorFromCompany(req, res) {
    try {
      const { id } = req.params; // coordinator id
      const { companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'companyId is required'
        });
      }

      // Get coordinator
      const coordinatorResult = await query('coordinators', 'select', ['id'], { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinator = coordinatorResult.data[0];

      // Check if partnership exists
      const partnershipResult = await query('company_coordinator_partnerships', 'select', ['id'], {
        company_id: parseInt(companyId),
        coordinator_id: coordinator.id
      });

      if (!partnershipResult.data || partnershipResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Partnership not found'
        });
      }

      // Delete the partnership
      await query('company_coordinator_partnerships', 'delete', null, {
        company_id: parseInt(companyId),
        coordinator_id: coordinator.id
      });

      res.json({
        success: true,
        message: 'Coordinator unassigned from company successfully'
      });
    } catch (error) {
      console.error('Error unassigning coordinator from company:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unassign coordinator from company',
        error: error.message
      });
    }
  }
}

module.exports = CoordinatorController;
