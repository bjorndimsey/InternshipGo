const { query } = require('../config/supabase');
const https = require('https');
const http = require('http');

class CertificateController {
  // GET /api/certificates/company/:companyId/completed-interns
  // Get list of interns who have completed their internship (finished_at IS NOT NULL)
  static async getCompletedInterns(req, res) {
    try {
      const { companyId } = req.params;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      console.log('📋 Fetching completed interns for company:', companyId);

      // First, find the actual company_id from user_id if needed
      let actualCompanyId = parseInt(companyId);
      const companyByUserId = await query('companies', 'select', ['id'], {
        user_id: parseInt(companyId)
      });
      
      if (companyByUserId.data && companyByUserId.data.length > 0) {
        actualCompanyId = companyByUserId.data[0].id;
        console.log(`Found company_id: ${actualCompanyId} for user_id: ${companyId}`);
      }

      // Get all applications for this company that are finished (finished_at IS NOT NULL)
      // Use Supabase query builder directly to filter at database level
      const { supabase } = require('../config/supabase');
      const applicationsResult = await supabase
        .from('applications')
        .select('*')
        .eq('company_id', actualCompanyId)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false }); // Order by most recently finished first

      if (applicationsResult.error) {
        console.error('❌ Error fetching applications:', applicationsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch applications',
          error: applicationsResult.error.message
        });
      }

      const completedApplications = applicationsResult.data || [];

      console.log(`📊 Found ${completedApplications.length} completed internships`);

      if (completedApplications.length === 0) {
        return res.json({
          success: true,
          message: 'No completed interns found',
          interns: []
        });
      }

      // Get student details for each completed application
      // IMPORTANT: applications.student_id references users.id, not students.id
      // So we need to query students table by user_id, not id
      const studentUserIds = [...new Set(completedApplications.map(app => app.student_id))];
      
      // Use Supabase .in() for array query - query by user_id since that's what student_id references
      const studentsResult = await supabase
        .from('students')
        .select('*')
        .in('user_id', studentUserIds.map(id => parseInt(id)));

      const students = {};
      if (studentsResult.data) {
        studentsResult.data.forEach(student => {
          // Map by user_id since that's what we use to look up (applications.student_id = users.id = students.user_id)
          students[student.user_id] = student;
        });
      }
      
      console.log(`📚 Found ${Object.keys(students).length} student records for ${studentUserIds.length} user IDs:`, {
        studentUserIds,
        foundStudentUserIds: Object.keys(students).map(id => parseInt(id))
      });

      // For any missing students, try to get from users table
      const missingStudentIds = studentUserIds.filter(id => !students[parseInt(id)]);
      if (missingStudentIds.length > 0) {
        const usersResult = await supabase
          .from('users')
          .select('*')
          .in('id', missingStudentIds.map(id => parseInt(id)));
        
        if (usersResult.data) {
          usersResult.data.forEach(user => {
            // Create a student-like object from user data
            // Try to parse name: if 3+ parts, assume first, middle, last; if 2 parts, first and last
            const nameParts = (user.name || '').trim().split(/\s+/);
            let first_name = '';
            let middle_name = '';
            let last_name = '';
            
            if (nameParts.length >= 3) {
              first_name = nameParts[0];
              middle_name = nameParts.slice(1, -1).join(' '); // All parts except first and last
              last_name = nameParts[nameParts.length - 1];
            } else if (nameParts.length === 2) {
              first_name = nameParts[0];
              last_name = nameParts[1];
            } else if (nameParts.length === 1) {
              first_name = nameParts[0];
            }
            
            students[user.id] = {
              id: user.id,
              first_name: first_name,
              middle_name: middle_name,
              last_name: last_name,
              email: user.email || '',
              id_number: '',
              major: '',
              year: ''
            };
          });
        }
      }
      
      // For ALL students, check if we need to fill names from users table
      // Note: users table doesn't have a 'name' field, but we can check if it was added
      const allStudentIds = [...new Set(studentUserIds)];
      const usersResult = await supabase
        .from('users')
        .select('*')
        .in('id', allStudentIds.map(id => parseInt(id)));
      
      console.log(`👥 Fetched ${usersResult.data?.length || 0} users for ${allStudentIds.length} students`);
      
      if (usersResult.data) {
        usersResult.data.forEach(user => {
          const student = students[user.id];
          if (student) {
            // Check if any name field needs to be filled (empty string, null, undefined, or 'N/A')
            const needsFirstName = !student.first_name || student.first_name.trim() === '';
            const needsLastName = !student.last_name || student.last_name.trim() === '';
            const needsMiddleName = !student.middle_name || student.middle_name.trim() === '' || student.middle_name === 'N/A' || student.middle_name === 'n/a';
            
            console.log(`🔍 Checking user ${user.id} (email: ${user.email}):`, {
              userKeys: Object.keys(user),
              hasNameField: 'name' in user,
              userData: user,
              studentNeeds: {
                firstName: needsFirstName,
                lastName: needsLastName,
                middleName: needsMiddleName
              }
            });
            
            if (needsFirstName || needsLastName || needsMiddleName) {
              // Try to get name from user.name if it exists, otherwise we can't fill it
              const userName = user.name || '';
              const nameParts = userName.trim().split(/\s+/).filter(part => part.length > 0);
              
              console.log(`🔍 Filling names for student ${user.id} from user.name "${userName}":`, {
                nameParts,
                needsFirstName,
                needsLastName,
                needsMiddleName,
                currentStudent: {
                  first_name: student.first_name,
                  middle_name: student.middle_name,
                  last_name: student.last_name
                }
              });
              
              if (nameParts.length >= 3) {
                // If 3+ parts, assume first, middle, last
                if (needsFirstName && nameParts[0]) {
                  student.first_name = nameParts[0];
                }
                const middlePart = nameParts.slice(1, -1).join(' ');
                if (needsMiddleName && middlePart) {
                  student.middle_name = middlePart;
                }
                if (needsLastName && nameParts[nameParts.length - 1]) {
                  student.last_name = nameParts[nameParts.length - 1];
                }
              } else if (nameParts.length === 2) {
                // If 2 parts, first and last (no middle)
                if (needsFirstName && nameParts[0]) {
                  student.first_name = nameParts[0];
                }
                if (needsLastName && nameParts[1]) {
                  student.last_name = nameParts[1];
                }
                // Clear middle name if it was 'N/A' or empty
                if (needsMiddleName) {
                  student.middle_name = '';
                }
              } else if (nameParts.length === 1) {
                // If 1 part, just first name
                if (needsFirstName && nameParts[0]) {
                  student.first_name = nameParts[0];
                }
                // Clear middle name if it was 'N/A' or empty
                if (needsMiddleName) {
                  student.middle_name = '';
                }
              }
              
              // Also ensure email is set
              if (!student.email && user.email) {
                student.email = user.email;
              }
              
              console.log(`✅ Updated student ${user.id} names:`, {
                first_name: student.first_name,
                middle_name: student.middle_name,
                last_name: student.last_name
              });
            }
          } else {
            console.log(`⚠️ No student record found for user ${user.id}`);
          }
        });
      } else {
        console.log(`⚠️ No users found for student IDs: ${allStudentIds.join(', ')}`);
      }

      // Get attendance records to calculate total hours
      const attendanceResult = await query('attendance_records', 'select', null, {
        company_id: actualCompanyId
      });

      const attendanceByStudent = {};
      (attendanceResult.data || []).forEach(record => {
        if (!attendanceByStudent[record.student_id]) {
          attendanceByStudent[record.student_id] = [];
        }
        attendanceByStudent[record.student_id].push(record);
      });

      // Combine application, student, and attendance data
      const completedInterns = completedApplications.map(app => {
        const student = students[app.student_id] || {};
        const attendanceRecords = attendanceByStudent[app.student_id] || [];
        
        // Calculate total hours from attendance records
        const totalHours = attendanceRecords.reduce((sum, record) => {
          return sum + (record.total_hours || 0);
        }, 0);

        // Log student data for debugging
        console.log(`📝 Student data for app ${app.id}:`, {
          student_id: app.student_id,
          student_data: student,
          first_name: student.first_name,
          middle_name: student.middle_name,
          last_name: student.last_name
        });

        return {
          id: app.id.toString(), // Application ID
          student_id: app.student_id.toString(),
          application_id: app.id,
          first_name: student.first_name || '',
          middle_name: student.middle_name || '',
          last_name: student.last_name || '',
          student_email: student.email || '',
          id_number: student.id_number || '',
          major: student.major || '',
          year: student.year || '',
          position: app.position || '',
          department: app.department || '',
          expected_start_date: app.expected_start_date || app.started_at,
          expected_end_date: app.expected_end_date || app.finished_at,
          started_at: app.started_at,
          finished_at: app.finished_at,
          totalHours: totalHours || app.hours_of_internship || 0,
          status: 'completed'
        };
      });

      console.log(`✅ Returning ${completedInterns.length} completed interns`);

      res.json({
        success: true,
        message: 'Completed interns fetched successfully',
        interns: completedInterns
      });

    } catch (error) {
      console.error('❌ Error in getCompletedInterns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch completed interns',
        error: error.message
      });
    }
  }

  // POST /api/certificates/generate
  // Generate and save certificates for selected interns
  static async generateCertificates(req, res) {
    try {
      const { companyId, internIds, templateId, contactPersonTitle } = req.body;
      const generatedBy = req.user?.id; // From auth middleware

      if (!companyId || !internIds || !Array.isArray(internIds) || internIds.length === 0 || !templateId) {
        return res.status(400).json({
          success: false,
          message: 'companyId, internIds (array), and templateId are required'
        });
      }

      if (!generatedBy) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      console.log('🎨 Generating certificates:', {
        companyId,
        internCount: internIds.length,
        templateId,
        contactPersonTitle
      });

      // Find actual company_id
      let actualCompanyId = parseInt(companyId);
      const companyByUserId = await query('companies', 'select', ['id'], {
        user_id: parseInt(companyId)
      });
      
      if (companyByUserId.data && companyByUserId.data.length > 0) {
        actualCompanyId = companyByUserId.data[0].id;
      }

      // Get company data
      const companyResult = await query('companies', 'select', null, { id: actualCompanyId });
      if (!companyResult.data || companyResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const company = companyResult.data[0];
      
      // Get company user for signature
      const companyUserResult = await query('users', 'select', ['signature', 'esignature'], {
        id: parseInt(companyId)
      });
      const companyUser = companyUserResult.data && companyUserResult.data.length > 0 
        ? companyUserResult.data[0] 
        : null;

      // Get applications for selected interns
      const applicationsResult = await query('applications', 'select', null, {
        id: internIds.map(id => parseInt(id)),
        company_id: actualCompanyId
      });

      if (applicationsResult.error || !applicationsResult.data) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch applications'
        });
      }

      const applications = applicationsResult.data.filter(app => app.finished_at !== null);
      
      if (applications.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No completed internships found for selected interns'
        });
      }

      // Get student data
      const studentIds = [...new Set(applications.map(app => app.student_id))];
      const studentsResult = await query('students', 'select', null, {
        id: studentIds
      });

      const students = (studentsResult.data || []).reduce((acc, student) => {
        acc[student.id] = student;
        return acc;
      }, {});

      // Get attendance records for total hours
      const attendanceResult = await query('attendance_records', 'select', null, {
        company_id: actualCompanyId
      });

      const attendanceByStudent = {};
      (attendanceResult.data || []).forEach(record => {
        if (!attendanceByStudent[record.student_id]) {
          attendanceByStudent[record.student_id] = [];
        }
        attendanceByStudent[record.student_id].push(record);
      });

      // Note: Certificate image generation happens on frontend
      // This endpoint just saves the certificate URLs to database
      // Frontend will upload images to Cloudinary and send URLs here

      res.json({
        success: true,
        message: 'Certificate generation initiated',
        data: {
          company: {
            id: actualCompanyId,
            name: company.company_name,
            address: company.address,
            signature: companyUser?.signature || companyUser?.esignature || null,
            contactPerson: company.contact_person || null
          },
          interns: applications.map(app => {
            const student = students[app.student_id] || {};
            const attendanceRecords = attendanceByStudent[app.student_id] || [];
            const totalHours = attendanceRecords.reduce((sum, record) => {
              return sum + (record.total_hours || 0);
            }, 0);

            return {
              applicationId: app.id,
              studentId: app.student_id,
              firstName: student.first_name || '',
              lastName: student.last_name || '',
              totalHours: totalHours || app.hours_of_internship || 0,
              startDate: app.expected_start_date || app.started_at,
              endDate: app.finished_at
            };
          }),
          templateId,
          contactPersonTitle: contactPersonTitle || null
        }
      });

    } catch (error) {
      console.error('❌ Error in generateCertificates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate certificates',
        error: error.message
      });
    }
  }

  // POST /api/certificates/save
  // Save generated certificate URLs to database
  static async saveCertificates(req, res) {
    try {
      const { certificates, userId } = req.body; // Array of certificate objects and optional userId
      // Get generatedBy from req.user (if auth middleware set it) or from request body or from first certificate's companyId
      const generatedBy = req.user?.id || userId || (certificates && certificates.length > 0 ? certificates[0].companyId : null);

      if (!certificates || !Array.isArray(certificates) || certificates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'certificates array is required'
        });
      }

      if (!generatedBy) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      console.log(`💾 Saving ${certificates.length} certificates to database`);

      const savedCertificates = [];
      const errors = [];

      for (const cert of certificates) {
        try {
          const { companyId, studentId, applicationId, certificateUrl, certificatePublicId, templateId, totalHours, startDate, endDate, contactPersonTitle } = cert;

          if (!companyId || !studentId || !applicationId || !certificateUrl || !certificatePublicId || !templateId) {
            errors.push({
              studentId,
              error: 'Missing required fields'
            });
            continue;
          }

          // Find actual company_id
          let actualCompanyId = parseInt(companyId);
          const companyByUserId = await query('companies', 'select', ['id'], {
            user_id: parseInt(companyId)
          });
          
          if (companyByUserId.data && companyByUserId.data.length > 0) {
            actualCompanyId = companyByUserId.data[0].id;
          }

          const certificateData = {
            company_id: actualCompanyId,
            student_id: parseInt(studentId),
            application_id: parseInt(applicationId),
            certificate_url: certificateUrl,
            certificate_public_id: certificatePublicId,
            template_id: templateId,
            total_hours: totalHours || null,
            start_date: startDate || null,
            end_date: endDate || null,
            contact_person_title: contactPersonTitle || null,
            generated_by: generatedBy,
            generated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const result = await query('certificates', 'insert', certificateData);

          if (result.data && result.data.length > 0) {
            savedCertificates.push(result.data[0]);
            console.log(`✅ Saved certificate for student ${studentId}`);
          } else {
            errors.push({
              studentId,
              error: result.error?.message || 'Failed to save certificate'
            });
          }
        } catch (error) {
          console.error(`❌ Error saving certificate for student ${cert.studentId}:`, error);
          errors.push({
            studentId: cert.studentId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Saved ${savedCertificates.length} out of ${certificates.length} certificates`,
        saved: savedCertificates,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('❌ Error in saveCertificates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save certificates',
        error: error.message
      });
    }
  }

  // GET /api/certificates/company/:companyId
  // Get all certificates for a company
  static async getCompanyCertificates(req, res) {
    try {
      const { companyId } = req.params;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      console.log('📋 getCompanyCertificates called with companyId:', companyId);

      // Find actual company_id
      let actualCompanyId = parseInt(companyId);
      const { supabase } = require('../config/supabase');
      
      // IMPORTANT: Check if companyId is already a company_id FIRST
      // This is because the frontend passes companies.id, not companies.user_id
      const companyById = await supabase
        .from('companies')
        .select('id, user_id, company_name')
        .eq('id', parseInt(companyId));
      
      if (companyById.data && companyById.data.length > 0) {
        // companyId is already a company_id, use it directly
        actualCompanyId = companyById.data[0].id;
        console.log(`✅ Using companyId directly as company_id: ${actualCompanyId} (${companyById.data[0].company_name})`);
      } else {
        // If not found as company_id, check if it's a user_id
        const companyByUserId = await supabase
          .from('companies')
          .select('id, company_name')
          .eq('user_id', parseInt(companyId));
        
        if (companyByUserId.data && companyByUserId.data.length > 0) {
          actualCompanyId = companyByUserId.data[0].id;
          console.log(`✅ Found company_id: ${actualCompanyId} (${companyByUserId.data[0].company_name}) for user_id: ${companyId}`);
        } else {
          console.log(`⚠️ Company not found for companyId: ${companyId}, using as-is: ${actualCompanyId}`);
          // Even if company not found, try querying certificates with the ID as-is
          // (in case the company was deleted but certificates still exist)
        }
      }

      console.log(`📋 Querying certificates for company_id: ${actualCompanyId} (type: ${typeof actualCompanyId})`);

      // First, let's check what certificates exist in the database
      const allCertificatesCheck = await supabase
        .from('certificates')
        .select('id, company_id, student_id, application_id')
        .order('id', { ascending: false })
        .limit(20);
      
      if (!allCertificatesCheck.error && allCertificatesCheck.data) {
        console.log('📋 All certificates in database (sample):', allCertificatesCheck.data);
        const matchingCerts = allCertificatesCheck.data.filter(cert => {
          const certCompanyId = parseInt(cert.company_id) || cert.company_id;
          return certCompanyId === actualCompanyId || certCompanyId === parseInt(actualCompanyId);
        });
        console.log(`📋 Certificates matching company_id ${actualCompanyId} from sample:`, matchingCerts);
      }

      // Use Supabase directly to query certificates - try both as integer and string
      let certificatesResult = await supabase
        .from('certificates')
        .select('*')
        .eq('company_id', actualCompanyId);

      console.log(`📋 First query result:`, {
        error: certificatesResult.error,
        count: certificatesResult.data?.length || 0,
        data: certificatesResult.data?.map(c => ({ id: c.id, company_id: c.company_id, student_id: c.student_id })) || []
      });

      // If no results, try querying with string comparison
      if (!certificatesResult.error && (!certificatesResult.data || certificatesResult.data.length === 0)) {
        console.log(`⚠️ No results with integer ${actualCompanyId}, trying string comparison...`);
        certificatesResult = await supabase
          .from('certificates')
          .select('*')
          .eq('company_id', actualCompanyId.toString());
        
        console.log(`📋 String query result:`, {
          error: certificatesResult.error,
          count: certificatesResult.data?.length || 0
        });
      }

      // If still no results, try without any filter to see if query works at all
      if (!certificatesResult.error && (!certificatesResult.data || certificatesResult.data.length === 0)) {
        console.log(`⚠️ Still no results, trying query without filter to verify table access...`);
        const testQuery = await supabase
          .from('certificates')
          .select('id, company_id, student_id')
          .order('id', { ascending: false })
          .limit(5);
        
        console.log(`📋 Test query (all certificates, limit 5):`, {
          error: testQuery.error,
          count: testQuery.data?.length || 0,
          data: testQuery.data
        });
      }

      if (certificatesResult.error) {
        console.error('❌ Error querying certificates:', certificatesResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch certificates',
          error: certificatesResult.error.message
        });
      }

      const certificates = certificatesResult.data || [];
      console.log(`✅ Found ${certificates.length} certificate(s) for company_id ${actualCompanyId}`);

      if (certificates.length > 0) {
        console.log('📋 Certificate details:', certificates.map(cert => ({
          id: cert.id,
          company_id: cert.company_id,
          company_id_type: typeof cert.company_id,
          student_id: cert.student_id,
          student_id_type: typeof cert.student_id,
          application_id: cert.application_id
        })));
      } else {
        console.log(`⚠️ No certificates found for company_id ${actualCompanyId}. Checking if company exists...`);
        const companyCheck = await supabase
          .from('companies')
          .select('id, company_name, user_id')
          .eq('id', actualCompanyId);
        console.log('📋 Company check result:', companyCheck.data);
      }

      res.json({
        success: true,
        message: 'Certificates fetched successfully',
        certificates: certificates
      });

    } catch (error) {
      console.error('❌ Error in getCompanyCertificates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch certificates',
        error: error.message
      });
    }
  }

  // GET /api/certificates/:certificateId/download
  // Download certificate image
  static async downloadCertificate(req, res) {
    try {
      const { certificateId } = req.params;
      const { companyId } = req.user || req.query; // From auth or query param

      if (!certificateId) {
        return res.status(400).json({
          success: false,
          message: 'Certificate ID is required'
        });
      }

      // Get certificate from database
      const result = await query('certificates', 'select', null, {
        id: parseInt(certificateId)
      });

      if (result.error || !result.data || result.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Certificate not found'
        });
      }

      const certificate = result.data[0];

      // Verify company ownership if companyId provided
      if (companyId) {
        let actualCompanyId = parseInt(companyId);
        const companyByUserId = await query('companies', 'select', ['id'], {
          user_id: parseInt(companyId)
        });
        
        if (companyByUserId.data && companyByUserId.data.length > 0) {
          actualCompanyId = companyByUserId.data[0].id;
        }

        if (parseInt(certificate.company_id) !== actualCompanyId) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this certificate'
          });
        }
      }

      // Fetch image from Cloudinary using https/http
      try {
        const imageBuffer = await new Promise((resolve, reject) => {
          const url = new URL(certificate.certificate_url);
          const client = url.protocol === 'https:' ? https : http;
          
          client.get(url.href, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to fetch image: ${response.statusCode}`));
              return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          }).on('error', reject);
        });

        // Set headers for download
        res.setHeader('Content-Type', 'image/png');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="certificate-${certificate.student_id}-${certificate.id}.png"`
        );

        // Send image
        res.send(imageBuffer);
      } catch (fetchError) {
        console.error('❌ Error fetching certificate image:', fetchError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch certificate image',
          error: fetchError.message
        });
      }

    } catch (error) {
      console.error('❌ Error in downloadCertificate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download certificate',
        error: error.message
      });
    }
  }

  // GET /api/certificates/templates/:companyId
  // Get all custom certificate templates for a company
  static async getCustomTemplates(req, res) {
    try {
      const { companyId } = req.params;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      console.log('📋 Fetching custom templates for company:', companyId);

      // Find actual company_id
      let actualCompanyId = parseInt(companyId);
      const companyByUserId = await query('companies', 'select', ['id'], {
        user_id: parseInt(companyId)
      });
      
      if (companyByUserId.data && companyByUserId.data.length > 0) {
        actualCompanyId = companyByUserId.data[0].id;
      }

      // Get all custom templates for this company
      const { supabase } = require('../config/supabase');
      const { data: templates, error } = await supabase
        .from('company_certificate_templates')
        .select('*')
        .eq('company_id', actualCompanyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching custom templates:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch custom templates',
          error: error.message
        });
      }

      console.log(`✅ Found ${templates?.length || 0} custom template(s)`);

      res.json({
        success: true,
        templates: templates || []
      });

    } catch (error) {
      console.error('❌ Get custom templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // POST /api/certificates/templates
  // Create a new custom certificate template
  static async createCustomTemplate(req, res) {
    try {
      const { companyId, templateName, templateImageUrl } = req.body;
      
      if (!companyId || !templateImageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Company ID and template image URL are required'
        });
      }

      console.log('📝 Creating custom template for company:', companyId);

      // Find actual company_id
      let actualCompanyId = parseInt(companyId);
      const companyByUserId = await query('companies', 'select', ['id'], {
        user_id: parseInt(companyId)
      });
      
      if (companyByUserId.data && companyByUserId.data.length > 0) {
        actualCompanyId = companyByUserId.data[0].id;
      }

      // Create the template
      const { supabase } = require('../config/supabase');
      const { data: template, error } = await supabase
        .from('company_certificate_templates')
        .insert({
          company_id: actualCompanyId,
          template_name: templateName || 'Custom Template',
          template_image_url: templateImageUrl,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating custom template:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create custom template',
          error: error.message
        });
      }

      console.log('✅ Custom template created:', template.id);

      res.json({
        success: true,
        template: template
      });

    } catch (error) {
      console.error('❌ Create custom template error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // DELETE /api/certificates/templates/:templateId
  // Delete a custom certificate template
  static async deleteCustomTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { companyId } = req.query; // For verification
      
      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required'
        });
      }

      console.log('🗑️ Deleting custom template:', templateId, 'for company:', companyId);

      // Find actual company_id for verification
      let actualCompanyId = null;
      if (companyId) {
        const companyByUserId = await query('companies', 'select', ['id'], {
          user_id: parseInt(companyId)
        });
        
        if (companyByUserId.data && companyByUserId.data.length > 0) {
          actualCompanyId = companyByUserId.data[0].id;
          console.log('✅ Found company_id:', actualCompanyId, 'for user_id:', companyId);
        } else {
          console.log('⚠️ No company found for user_id:', companyId);
        }
      }

      // Delete the template
      const { supabase } = require('../config/supabase');
      const CloudinaryService = require('../lib/cloudinaryService');
      
      // Fetch template to get public_id for Cloudinary deletion
      const parsedTemplateId = parseInt(templateId);
      console.log('🔍 Looking for template with id:', parsedTemplateId, '(type:', typeof parsedTemplateId, ')');
      
      // Try to select template_public_id if column exists, otherwise just get basic fields
      const { data: template, error: fetchError } = await supabase
        .from('company_certificate_templates')
        .select('id, company_id, template_image_url')
        .eq('id', parsedTemplateId)
        .single();

      console.log('📋 Template query result:', { template, fetchError });

      if (fetchError) {
        console.error('❌ Error fetching template:', fetchError);
        // Check if it's a "not found" error or a column error
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Template not found'
          });
        }
        return res.status(404).json({
          success: false,
          message: `Template not found: ${fetchError.message}`
        });
      }

      if (!template) {
        console.error('❌ Template not found with id:', parsedTemplateId);
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // If companyId provided, verify ownership
      if (actualCompanyId && template.company_id !== actualCompanyId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this template'
        });
      }

      // Delete from Cloudinary if we can extract public_id from URL
      // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
      if (template.template_image_url) {
        try {
          // Extract public_id from Cloudinary URL
          const urlMatch = template.template_image_url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
          if (urlMatch && urlMatch[1]) {
            const publicId = urlMatch[1];
            console.log('🗑️ Attempting to delete Cloudinary image with public_id:', publicId);
            await CloudinaryService.deleteImage(publicId);
            console.log('✅ Cloudinary image deleted:', publicId);
          } else {
            console.log('⚠️ Could not extract public_id from URL:', template.template_image_url);
          }
        } catch (cloudinaryError) {
          console.error('⚠️ Error deleting from Cloudinary (continuing with DB delete):', cloudinaryError);
          // Continue with database deletion even if Cloudinary deletion fails
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('company_certificate_templates')
        .delete()
        .eq('id', parseInt(templateId));

      if (error) {
        console.error('❌ Error deleting custom template:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete custom template',
          error: error.message
        });
      }

      console.log('✅ Custom template deleted:', templateId);

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });

    } catch (error) {
      console.error('❌ Delete custom template error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = CertificateController;

