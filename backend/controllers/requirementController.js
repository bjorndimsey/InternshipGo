const { query, supabase } = require('../config/supabase');
const { CloudinaryService } = require('../lib/cloudinaryService');

// Get requirements for a specific student
const getStudentRequirements = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('🔍 Fetching requirements for student:', studentId);
    
    // First, check if the student is assigned to a coordinator
    const internResult = await query('interns', 'select', null, { student_id: studentId });
    const intern = internResult.data && internResult.data.length > 0 ? internResult.data[0] : null;
    
    if (!intern) {
      console.log('⚠️ Student not assigned to any coordinator');
      return res.json({
        success: true,
        requirements: [],
        message: 'Student not assigned to any coordinator'
      });
    }
    
    // Get the coordinator ID for this student
    const coordinatorResult = await query('coordinators', 'select', null, { user_id: intern.coordinator_id });
    const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
    
    if (!coordinator) {
      console.log('⚠️ Coordinator not found for student');
      return res.json({
        success: true,
        requirements: [],
        message: 'Coordinator not found'
      });
    }
    
    console.log('👨‍🏫 Student assigned to coordinator:', coordinator.id);
    
    // Debug: Check if there are any requirements for this student at all
    const allStudentRequirements = await query('student_requirements', 'select', null, { 
      student_id: studentId
    });
    console.log('🔍 All requirements for student:', allStudentRequirements.data?.length || 0);
    
    // Debug: Check if there are any requirements for this coordinator at all
    const allCoordinatorRequirements = await query('student_requirements', 'select', null, { 
      coordinator_id: coordinator.id
    });
    console.log('🔍 All requirements for coordinator:', allCoordinatorRequirements.data?.length || 0);
    
    // Get requirements for this student and coordinator
    const result = await query('student_requirements', 'select', null, { 
      student_id: studentId,
      coordinator_id: coordinator.id 
    });
    
    // If no requirements found with coordinator filter, try without coordinator filter
    // This handles cases where requirements might not have coordinator_id set properly
    if (!result.data || result.data.length === 0) {
      console.log('⚠️ No requirements found with coordinator filter, trying without...');
      const fallbackResult = await query('student_requirements', 'select', null, { 
        student_id: studentId
      });
      
      if (fallbackResult.data && fallbackResult.data.length > 0) {
        console.log('📋 Found requirements without coordinator filter:', fallbackResult.data.length);
        result.data = fallbackResult.data;
      }
    }
    
    console.log('📋 Found requirements:', result.data?.length || 0);
    
    res.json({
      success: true,
      requirements: result.data || []
    });
  } catch (error) {
    console.error('Error fetching student requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student requirements',
      error: error.message
    });
  }
};

// Create a new requirement for all students
const createRequirement = async (req, res) => {
  try {
    console.log('📝 Creating requirement with data:', req.body);
    const { name, description, isRequired, dueDate, coordinatorId, fileUrl, fileName, schoolYear } = req.body;
    
    // Generate a unique requirement ID
    const requirementId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🆔 Generated requirement ID:', requirementId);
    
    // Get coordinator's assigned interns only
    console.log('👥 Fetching coordinator interns...');
    
    // First, get the coordinator's id from their user_id
    const coordinatorResult = await query('coordinators', 'select', null, { user_id: coordinatorId });
    const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
    
    if (!coordinator) {
      return res.status(400).json({
        success: false,
        message: 'Coordinator not found',
        error: 'Invalid coordinator ID'
      });
    }
    
    console.log('👨‍🏫 Found coordinator with id:', coordinator.id);
    
    // Get only the students assigned to this coordinator
    // Note: interns.coordinator_id stores the user_id, not the coordinators.id
    const internsResult = await query('interns', 'select', null, { coordinator_id: coordinatorId });
    let interns = internsResult.data || [];
    
    // Filter by school year if provided
    if (schoolYear) {
      interns = interns.filter(intern => intern.school_year === schoolYear);
      console.log(`👥 Filtered interns by school year ${schoolYear}:`, interns.length);
    }
    
    console.log('👥 Found interns for coordinator:', interns.length);
    
    if (interns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No interns assigned to this coordinator. Please assign students first.',
        error: 'No interns available'
      });
    }
    
    // Get student details for the assigned interns
    const studentIds = interns.map(intern => intern.student_id);
    console.log('🔍 Student IDs to fetch:', studentIds);
    
    // Fetch students one by one since Supabase doesn't handle array matching well
    const students = [];
    for (const studentId of studentIds) {
      try {
        const studentResult = await query('students', 'select', null, { id: studentId });
        if (studentResult.data && studentResult.data.length > 0) {
          students.push(studentResult.data[0]);
        }
      } catch (error) {
        console.error(`Error fetching student ${studentId}:`, error);
      }
    }
    
    console.log('👥 Found students for interns:', students.length);
    
    // Create requirement for each assigned student
    console.log('📋 Creating requirements for each assigned student...');
    const requirementPromises = students.map(async (student) => {
      // Check if requirement already exists for this student
      const existingResult = await query('student_requirements', 'select', null, { 
        student_id: student.id, 
        requirement_id: requirementId 
      });
      
      if (existingResult.data && existingResult.data.length > 0) {
        console.log('⚠️ Requirement already exists for student:', student.id, 'skipping...');
        return null; // Skip this student
      }
      
      // Use the coordinators.id for coordinator_id in student_requirements (foreign key constraint)
      const coordinatorIdForRequirement = coordinator.id; // This is the coordinators.id
      
      const requirementData = {
        student_id: student.id,
        requirement_id: requirementId,
        requirement_name: name,
        requirement_description: description,
        is_required: isRequired,
        due_date: dueDate || null, // Handle null dates properly
        file_url: fileUrl,
        file_public_id: null,
        completed: false,
        coordinator_id: coordinatorIdForRequirement, // Use the coordinators.id
        // Note: school_year is not stored in student_requirements table
        // We identify class requirements by finding requirements of other interns in the same class
        notes: null
      };
      
      console.log('📋 Creating requirement for student:', student.id, 'coordinator:', requirementData.coordinator_id, 'with data:', requirementData);
      return query('student_requirements', 'insert', requirementData);
    });
    
    const results = await Promise.all(requirementPromises);
    const successfulResults = results.filter(result => result !== null);
    
    res.json({
      success: true,
      message: `Requirement created successfully for ${successfulResults.length} students`,
      requirement: {
        id: requirementId,
        name,
        description,
        isRequired,
        dueDate,
        fileUrl,
        fileName
      }
    });
  } catch (error) {
    console.error('❌ Error creating requirement:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create requirement',
      error: error.message,
      details: error.details || null,
      hint: error.hint || null
    });
  }
};

// Update a requirement for all students
const updateRequirement = async (req, res) => {
  try {
    const { requirementId } = req.params;
    const { name, description, isRequired, dueDate, fileUrl, fileName } = req.body;
    
    // Update all student requirements with this requirement_id
    const updateData = {
      requirement_name: name,
      requirement_description: description,
      is_required: isRequired,
      due_date: dueDate || null, // Handle null dates properly
      file_url: fileUrl,
      file_public_id: null,
      updated_at: new Date().toISOString()
    };
    
    const result = await query('student_requirements', 'update', updateData, { requirement_id: requirementId });
    
    res.json({
      success: true,
      message: 'Requirement updated successfully for all students',
      requirement: {
        id: requirementId,
        name,
        description,
        isRequired,
        dueDate,
        fileUrl,
        fileName
      }
    });
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update requirement',
      error: error.message
    });
  }
};

// Delete a requirement from all students
const deleteRequirement = async (req, res) => {
  try {
    const { requirementId } = req.params;
    
    const result = await query('student_requirements', 'delete', null, { requirement_id: requirementId });
    
    res.json({
      success: true,
      message: 'Requirement deleted successfully from all students'
    });
  } catch (error) {
    console.error('Error deleting requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete requirement',
      error: error.message
    });
  }
};


// Update student requirement
const updateStudentRequirement = async (req, res) => {
  try {
    const { studentId, requirementId } = req.params;
    const { completed, fileUrl, filePublicId, notes, requirements } = req.body;
    
    console.log('📝 Updating student requirement:', { studentId, requirementId, completed, fileUrl, filePublicId, notes });
    
    // Handle bulk update
    if (requirementId === 'bulk' && requirements) {
      const updatePromises = requirements.map(async (req) => {
        return query('student_requirements', 'update', {
          file_url: req.fileUrl,
          file_public_id: req.filePublicId,
          updated_at: new Date().toISOString()
        }, { 
          student_id: studentId, 
          requirement_id: req.id 
        });
      });
      
      await Promise.all(updatePromises);
      
      return res.json({
        success: true,
        message: 'Student requirements updated successfully'
      });
    }
    
    // Handle single requirement update
    const updateData = {
      completed: completed,
      file_url: fileUrl,
      file_public_id: filePublicId,
      notes: notes,
      updated_at: new Date().toISOString()
    };
    
    // Set completed_at if completing for the first time
    if (completed === true) {
      updateData.completed_at = new Date().toISOString();
    }
    
    const result = await query('student_requirements', 'update', updateData, { 
      student_id: studentId, 
      requirement_id: requirementId 
    });
    
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student requirement not found'
      });
    }
    
    console.log('✅ Student requirement updated successfully');
    res.json({
      success: true,
      message: 'Student requirement updated successfully',
      requirement: result.data[0]
    });
  } catch (error) {
    console.error('Error updating student requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student requirement',
      error: error.message
    });
  }
};

// Upload requirement file
const uploadRequirementFile = async (req, res) => {
  try {
    const { studentId, requirementId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Upload to Cloudinary using the dedicated requirements account
    const uploadResult = await CloudinaryService.uploadRequirementPDF(
      req.file.buffer,
      `requirement_${requirementId}_${studentId}_${Date.now()}`
    );
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: uploadResult.error
      });
    }
    
    // Update database with file info
    const query = `
      UPDATE student_requirements 
      SET 
        file_url = $1,
        file_public_id = $2,
        uploaded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE student_id = $3 AND requirement_id = $4
      RETURNING *
    `;
    
    const result = await db.query(query, [
      uploadResult.url,
      uploadResult.public_id,
      studentId,
      requirementId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student requirement not found'
      });
    }
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      requirement: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading requirement file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
};

// Download requirement file
const downloadRequirementFile = async (req, res) => {
  try {
    const { studentId, requirementId } = req.params;
    
    // Get the file URL from student_requirements table
    const result = await query('student_requirements', 'select', null, { 
      student_id: studentId, 
      requirement_id: requirementId 
    });
    
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student requirement not found'
      });
    }
    
    const { file_url, requirement_name } = result.data[0];
    
    if (!file_url) {
      return res.status(404).json({
        success: false,
        message: 'No file uploaded for this requirement'
      });
    }
    
    // Redirect to the Cloudinary URL to download the file directly
    res.redirect(file_url);
  } catch (error) {
    console.error('Error downloading requirement file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
};

// Send requirement reminder
const sendRequirementReminder = async (req, res) => {
  try {
    const { studentId, requirementId } = req.params;
    
    // Get requirement details
    const query = `
      SELECT sr.*, s.first_name, s.last_name, s.email
      FROM student_requirements sr
      JOIN students s ON sr.student_id = s.id
      WHERE sr.student_id = $1 AND sr.requirement_id = $2
    `;
    
    const result = await db.query(query, [studentId, requirementId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student requirement not found'
      });
    }
    
    const requirement = result.rows[0];
    
    // Here you would integrate with your email service
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Reminder sent successfully',
      requirement: {
        name: requirement.requirement_name,
        studentName: `${requirement.first_name} ${requirement.last_name}`,
        studentEmail: requirement.email
      }
    });
  } catch (error) {
    console.error('Error sending requirement reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
      error: error.message
    });
  }
};

// Get requirements report
const getRequirementsReport = async (req, res) => {
  try {
    const { coordinatorId } = req.query;
    const { studentId, completed, dueDateFrom, dueDateTo } = req.query;
    
    let query = `
      SELECT 
        sr.*, s.first_name, s.last_name, s.email, s.id_number,
        c.first_name as coordinator_first_name, c.last_name as coordinator_last_name
      FROM student_requirements sr
      JOIN students s ON sr.student_id = s.id
      LEFT JOIN coordinators c ON sr.coordinator_id = c.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;
    
    if (coordinatorId) {
      query += ` AND sr.coordinator_id = $${paramCount}`;
      values.push(coordinatorId);
      paramCount++;
    }
    
    if (studentId) {
      query += ` AND sr.student_id = $${paramCount}`;
      values.push(studentId);
      paramCount++;
    }
    
    if (completed !== undefined) {
      query += ` AND sr.completed = $${paramCount}`;
      values.push(completed === 'true');
      paramCount++;
    }
    
    if (dueDateFrom) {
      query += ` AND sr.due_date >= $${paramCount}`;
      values.push(dueDateFrom);
      paramCount++;
    }
    
    if (dueDateTo) {
      query += ` AND sr.due_date <= $${paramCount}`;
      values.push(dueDateTo);
      paramCount++;
    }
    
    query += ` ORDER BY sr.created_at DESC`;
    
    const result = await db.query(query, values);
    
    res.json({
      success: true,
      report: result.rows,
      totalCount: result.rows.length
    });
  } catch (error) {
    console.error('Error generating requirements report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

// Test endpoint to check database state
const testDatabaseState = async (req, res) => {
  try {
    console.log('🧪 Testing database state...');
    
    // Check students
    const studentsResult = await query('students', 'select');
    console.log('👥 Students in database:', studentsResult.data?.length || 0);
    
    // Check coordinators
    const coordinatorsResult = await query('coordinators', 'select');
    console.log('👨‍🏫 Coordinators in database:', coordinatorsResult.data?.length || 0);
    
    // Check interns
    const internsResult = await query('interns', 'select');
    console.log('🎓 Interns in database:', internsResult.data?.length || 0);
    
    // Check student_requirements
    const requirementsResult = await query('student_requirements', 'select');
    console.log('📋 Student requirements in database:', requirementsResult.data?.length || 0);
    
    // Show sample data
    if (requirementsResult.data && requirementsResult.data.length > 0) {
      console.log('📋 Sample requirement:', requirementsResult.data[0]);
    }
    
    res.json({
      success: true,
      data: {
        students: studentsResult.data?.length || 0,
        coordinators: coordinatorsResult.data?.length || 0,
        interns: internsResult.data?.length || 0,
        requirements: requirementsResult.data?.length || 0,
        sampleRequirement: requirementsResult.data?.[0] || null
      }
    });
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get requirements by coordinator
const getCoordinatorRequirements = async (req, res) => {
  try {
    const { coordinatorId } = req.params;
    console.log('📋 Fetching requirements for coordinator user_id:', coordinatorId);

    // First, get the coordinator's id from their user_id
    const coordinatorResult = await query('coordinators', 'select', null, { user_id: coordinatorId });
    const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
    
    if (!coordinator) {
      console.log('❌ Coordinator not found for user_id:', coordinatorId);
      return res.json({
        success: true,
        requirements: [],
        count: 0,
        message: 'Coordinator not found'
      });
    }

    console.log('👨‍🏫 Found coordinator with id:', coordinator.id);

    // Get unique requirements created by this coordinator using coordinators.id
    const result = await query('student_requirements', 'select', null, { 
      coordinator_id: coordinator.id 
    });

    console.log('🔍 Raw requirements query result:', result.data?.length || 0);

    if (result.data && result.data.length > 0) {
      // Group by requirement_id to get unique requirements
      const requirementMap = new Map();
      
      result.data.forEach((req) => {
        const key = req.requirement_id;
        if (!requirementMap.has(key)) {
          requirementMap.set(key, {
            id: req.id,
            requirement_id: req.requirement_id,
            requirement_name: req.requirement_name,
            requirement_description: req.requirement_description,
            is_required: req.is_required,
            due_date: req.due_date,
            file_url: req.file_url,
            file_name: req.file_name,
            created_at: req.created_at,
            coordinator_id: req.coordinator_id,
            submitted_students: []
          });
        }
      });

      const uniqueRequirements = Array.from(requirementMap.values());
      console.log('📋 Found unique requirements:', uniqueRequirements.length);

      res.json({
        success: true,
        requirements: uniqueRequirements,
        count: uniqueRequirements.length
      });
    } else {
      console.log('📋 No requirements found for coordinator');
      res.json({
        success: true,
        requirements: [],
        count: 0
      });
    }
  } catch (error) {
    console.error('Error fetching coordinator requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coordinator requirements',
      error: error.message
    });
  }
};

module.exports = {
  getStudentRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  updateStudentRequirement,
  uploadRequirementFile,
  downloadRequirementFile,
  sendRequirementReminder,
  getRequirementsReport,
  testDatabaseState,
  getCoordinatorRequirements
};
