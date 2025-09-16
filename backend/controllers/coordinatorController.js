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
              assignedInterns: 0, // This would need to be calculated from related tables
              university: 'University', // This would need to be added to schema or derived
              department: coordinator.program // Using program as department for now
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

      // Get coordinators who uploaded MOAs for this specific company
      const coordinatorsResult = await query('coordinators', 'select');
      
      if (!coordinatorsResult.data || coordinatorsResult.data.length === 0) {
        return res.json({
          success: true,
          message: 'Coordinators with MOA fetched successfully',
          coordinators: []
        });
      }

      // Get user data and MOA information for each coordinator
      const coordinators = [];
      for (const coordinator of coordinatorsResult.data) {
        const userResult = await query('users', 'select', null, { id: coordinator.user_id });
        
        if (userResult.data && userResult.data.length > 0) {
          const user = userResult.data[0];
          
          // Only include coordinators (not other user types)
          if (user.user_type === 'Coordinator') {
            // Get MOA information from this specific company where this coordinator uploaded MOA
            const moaResult = await query('companies', 'select', null, { 
              id: parseInt(companyId),
              moa_uploaded_by: coordinator.user_id 
            });

            // Only include this coordinator if they uploaded MOA for this specific company
            if (moaResult.data && moaResult.data.length > 0) {
              const moaData = moaResult.data[0];
              
              // Check if coordinator has admin status
              const adminResult = await query('admin_coordinators', 'select', null, { 
                coordinator_id: coordinator.id, 
                is_active: true 
              });
              
              const isAdminCoordinator = adminResult.data && adminResult.data.length > 0;
              
              // Determine MOA status based on uploaded MOAs
              let moaStatus = moaData.moa_status || 'sent';
              let moaDocument = moaData.moa_url ? 'MOA Document' : null;
              let moaSentDate = moaData.moa_uploaded_at ? new Date(moaData.moa_uploaded_at).toISOString().split('T')[0] : null;
              let moaReceivedDate = moaData.moa_uploaded_at ? new Date(moaData.moa_uploaded_at).toISOString().split('T')[0] : null;
              let moaExpiryDate = moaData.moa_expiry_date;
              let partnershipStatus = moaData.partnership_status || 'pending';

              coordinators.push({
                id: coordinator.id.toString(),
                userId: coordinator.user_id.toString(),
                companyId: moaData.id.toString(),
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
                moaUrl: moaData.moa_url,
                moaPublicId: moaData.moa_public_id,
                moaSentDate: moaSentDate,
                moaReceivedDate: moaReceivedDate,
                moaExpiryDate: moaExpiryDate,
                partnershipStatus: partnershipStatus,
                assignedInterns: 0, // This would need to be calculated from related tables
                lastContact: coordinator.updated_at ? new Date(coordinator.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                latitude: user.latitude,
                longitude: user.longitude
              });
              
              console.log('✅ Added coordinator', coordinator.id, 'for company', companyId);
            } else {
              console.log('ℹ️ Coordinator', coordinator.id, 'did not upload MOA for company', companyId);
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

      const updateData = {
        partnership_status: status,
        partnership_approved_by: approvedByValue,
        partnership_approved_at: status !== 'pending' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
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

      // Also update ALL companies associated with this coordinator
      if (companiesToUpdate.length > 0) {
        console.log('🔄 Updating companies table for', companiesToUpdate.length, 'companies:', companiesToUpdate.map(c => c.id));
        
        const companyUpdateData = {
          partnership_status: status,
          partnership_approved_by: approvedByValue,
          partnership_approved_at: status !== 'pending' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        };
        
        console.log('📤 Company update data:', companyUpdateData);
        
        // Update each company
        for (const company of companiesToUpdate) {
          try {
            console.log('🔄 Updating company ID:', company.id);
            const companyResult = await query('companies', 'update', companyUpdateData, { id: company.id });
            console.log('📥 Company update result for ID', company.id, ':', companyResult);
            
            if (companyResult.data && companyResult.data.length > 0) {
              console.log('✅ Company', company.id, 'updated successfully');
            } else {
              console.log('❌ Company', company.id, 'update failed - no data returned');
            }
          } catch (companyError) {
            console.error('❌ Error updating company', company.id, ':', companyError);
            // Continue with other companies even if one fails
          }
        }
      } else {
        console.log('ℹ️ No companies found for this coordinator, skipping companies table update');
      }

      console.log('✅ Partnership status updated successfully in coordinators table:', result.data);
      res.json({
        success: true,
        message: 'Partnership status updated successfully in both coordinators and companies tables',
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
      const { isAdmin, assignedBy = 1 } = req.body; // assignedBy defaults to 1 (system admin)

      // Check if coordinator exists
      const coordinatorResult = await query('coordinators', 'select', null, { id: parseInt(id) });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
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
            assigned_by: parseInt(assignedBy),
            updated_at: new Date().toISOString()
          }, { id: currentAdminResult.data[0].id });
        } else {
          // Create new admin record
          const adminData = {
            coordinator_id: parseInt(id),
            assigned_by: parseInt(assignedBy),
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
        }
      } else {
        // Remove admin status
        if (currentAdminResult.data && currentAdminResult.data.length > 0) {
          await query('admin_coordinators', 'update', { 
            is_active: false,
            updated_at: new Date().toISOString()
          }, { id: currentAdminResult.data[0].id });
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
}

module.exports = CoordinatorController;
