const { query } = require('../config/supabase');

class InternController {
  // Add student as intern
  static async addStudentAsIntern(req, res) {
    try {
      const { studentId, schoolYear, coordinatorId } = req.body;

      if (!studentId || !schoolYear || !coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'studentId, schoolYear, and coordinatorId are required'
        });
      }

      let coordinatorUserId;

      // Check if coordinatorId is a coordinator ID or user ID
      // First try to find by coordinator ID
      const coordinatorResult = await query('coordinators', 'select', ['user_id'], { id: parseInt(coordinatorId) });
      
      if (coordinatorResult.data && coordinatorResult.data.length > 0) {
        // coordinatorId is a coordinator ID
        coordinatorUserId = coordinatorResult.data[0].user_id;
      } else {
        // Try to find by user_id (in case coordinatorId is actually a user ID)
        const coordinatorByUserIdResult = await query('coordinators', 'select', ['user_id'], { user_id: parseInt(coordinatorId) });
        
        if (coordinatorByUserIdResult.data && coordinatorByUserIdResult.data.length > 0) {
          // coordinatorId is a user ID
          coordinatorUserId = parseInt(coordinatorId);
        } else {
          return res.status(404).json({
            success: false,
            message: 'Coordinator not found'
          });
        }
      }

      // Check if student is already an intern for this school year
      const existingResult = await query('interns', 'select', null, { 
        student_id: studentId, 
        school_year: schoolYear 
      });
      
      if (existingResult.data && existingResult.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Student is already an intern for this school year'
        });
      }

      // Add student as intern
      const internData = {
        student_id: studentId,
        school_year: schoolYear,
        coordinator_id: coordinatorUserId, // Use the user_id, not the coordinator id
        status: 'active'
      };

      const result = await query('interns', 'insert', internData);

      if (result.data && result.data.length > 0) {
        const newInternId = result.data[0].id;
        let enrolledClassesCount = 0;
        let enrollmentErrors = [];
        
        // After successfully adding intern, assign existing requirements and enroll in matching classes
        try {
          // Get the coordinator's id from their user_id
          const coordinatorResult = await query('coordinators', 'select', null, { user_id: coordinatorUserId });
          const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;
          
          if (coordinator) {
            // Automatically enroll student in existing classes with matching school year
            try {
              // Find all classes created by this coordinator with matching school year
              const classesResult = await query('classes', 'select', null, {
                coordinator_id: coordinator.id, // Use coordinators.id
                school_year: schoolYear,
                status: 'active' // Only enroll in active classes
              });
              
              const matchingClasses = classesResult.data || [];
              console.log(`📚 Found ${matchingClasses.length} classes with school year ${schoolYear} for coordinator ${coordinator.id}`);
              
              // Enroll student in each matching class
              for (const classItem of matchingClasses) {
                try {
                  // Check if student is already enrolled in this class
                  const existingEnrollmentResult = await query('class_enrollments', 'select', null, {
                    class_id: classItem.id,
                    student_id: parseInt(studentId)
                  });
                  
                  if (existingEnrollmentResult.data && existingEnrollmentResult.data.length > 0) {
                    console.log(`ℹ️ Student ${studentId} is already enrolled in class ${classItem.id}`);
                    continue; // Skip if already enrolled
                  }
                  
                  // Create enrollment
                  const enrollmentData = {
                    class_id: classItem.id,
                    student_id: parseInt(studentId),
                    status: 'enrolled'
                  };
                  
                  const enrollmentResult = await query('class_enrollments', 'insert', enrollmentData);
                  
                  if (enrollmentResult.data && enrollmentResult.data.length > 0) {
                    enrolledClassesCount++;
                    console.log(`✅ Automatically enrolled student ${studentId} in class "${classItem.class_name}" (${classItem.class_code})`);
                  }
                } catch (enrollError) {
                  console.error(`❌ Error enrolling student ${studentId} in class ${classItem.id}:`, enrollError);
                  enrollmentErrors.push(`Class ${classItem.class_name}: ${enrollError.message}`);
                }
              }
              
              console.log(`📚 Successfully enrolled student ${studentId} in ${enrolledClassesCount} out of ${matchingClasses.length} matching classes`);
            } catch (classEnrollError) {
              console.error('❌ Error during automatic class enrollment:', classEnrollError);
              enrollmentErrors.push(`Class enrollment error: ${classEnrollError.message}`);
            }
            
            // Find all unique requirement_ids that belong to other interns in the same class and coordinator
            // Get all interns in the same class and coordinator
            const classInternsResult = await query('interns', 'select', null, { 
              coordinator_id: coordinatorUserId,
              school_year: schoolYear
            });
            const classInterns = classInternsResult.data || [];
            
            // Get student IDs for these interns (excluding the newly added one)
            const classStudentIds = classInterns
              .filter(intern => intern.id !== newInternId)
              .map(intern => intern.student_id);
            
            if (classStudentIds.length > 0) {
              // Find all unique requirement_ids from existing students in this class
              // Since school_year is not in student_requirements table, we find requirements
              // by looking at students who are in the same class (already filtered above)
              const existingRequirements = [];
              for (const classStudentId of classStudentIds) {
                // Query requirements for this student and coordinator
                const reqResult = await query('student_requirements', 'select', null, {
                  student_id: classStudentId,
                  coordinator_id: coordinator.id
                });
                if (reqResult.data && reqResult.data.length > 0) {
                  existingRequirements.push(...reqResult.data);
                }
              }
              
              // Get unique requirement_ids (group by requirement_id to get the latest version)
              const uniqueRequirements = new Map();
              existingRequirements.forEach(req => {
                const reqId = req.requirement_id;
                if (!uniqueRequirements.has(reqId)) {
                  uniqueRequirements.set(reqId, req);
                }
              });
              
              // Assign each unique requirement to the new intern
              const assignPromises = Array.from(uniqueRequirements.values()).map(async (req) => {
                // Check if requirement already exists for this student
                const existingCheck = await query('student_requirements', 'select', null, {
                  student_id: studentId,
                  requirement_id: req.requirement_id
                });
                
                if (!existingCheck.data || existingCheck.data.length === 0) {
                  // Assign the requirement to the new intern
                  // Note: school_year is not stored in student_requirements table
                  const newRequirementData = {
                    student_id: studentId,
                    requirement_id: req.requirement_id,
                    requirement_name: req.requirement_name,
                    requirement_description: req.requirement_description,
                    is_required: req.is_required,
                    due_date: req.due_date,
                    file_url: req.file_url,
                    file_public_id: req.file_public_id || null,
                    completed: false,
                    coordinator_id: coordinator.id,
                    notes: null
                  };
                  
                  await query('student_requirements', 'insert', newRequirementData);
                  console.log(`✅ Assigned requirement "${req.requirement_name}" to new intern`);
                }
              });
              
              await Promise.all(assignPromises);
              console.log(`✅ Assigned ${uniqueRequirements.size} existing requirements to new intern`);
            }
          }
        } catch (reqError) {
          // Log error but don't fail the intern addition
          console.error('⚠️ Error assigning existing requirements to new intern:', reqError);
        }
        
        const responseMessage = enrolledClassesCount > 0
          ? `Student added as intern successfully. ${enrolledClassesCount} class${enrolledClassesCount !== 1 ? 'es' : ''} automatically enrolled.`
          : 'Student added as intern successfully.';
        
        return res.json({
          success: true,
          message: responseMessage,
          internId: newInternId,
          autoEnrolledClasses: enrolledClassesCount,
          enrollmentErrors: enrollmentErrors.length > 0 ? enrollmentErrors : undefined
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to add student as intern'
        });
      }
    } catch (error) {
      console.error('Error adding student as intern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add student as intern',
        error: error.message
      });
    }
  }

  // Get interns for a specific coordinator
  static async getCoordinatorInterns(req, res) {
    try {
      const { coordinatorId } = req.params;

      if (!coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'Coordinator ID is required'
        });
      }

      let coordinatorUserId;

      // Check if coordinatorId is a coordinator ID or user ID
      // First try to find by coordinator ID
      const coordinatorResult = await query('coordinators', 'select', ['user_id'], { id: parseInt(coordinatorId) });
      
      if (coordinatorResult.data && coordinatorResult.data.length > 0) {
        // coordinatorId is a coordinator ID
        coordinatorUserId = coordinatorResult.data[0].user_id;
      } else {
        // Try to find by user_id (in case coordinatorId is actually a user ID)
        const coordinatorByUserIdResult = await query('coordinators', 'select', ['user_id'], { user_id: parseInt(coordinatorId) });
        
        if (coordinatorByUserIdResult.data && coordinatorByUserIdResult.data.length > 0) {
          // coordinatorId is a user ID
          coordinatorUserId = parseInt(coordinatorId);
        } else {
          return res.status(404).json({
            success: false,
            message: 'Coordinator not found'
          });
        }
      }

      // Get interns for this coordinator (using user_id)
      console.log(`🔍 Querying interns for coordinator user_id: ${coordinatorUserId}`);
      const internsResult = await query('interns', 'select', null, { coordinator_id: coordinatorUserId });
      
      console.log(`📊 Found ${internsResult.data?.length || 0} interns for coordinator ${coordinatorUserId}`);
      
      if (!internsResult.data || internsResult.data.length === 0) {
        return res.json({
          success: true,
          message: 'No interns found',
          interns: []
        });
      }

      // Get student details for each intern
      const internsWithDetails = await Promise.all(
        internsResult.data.map(async (intern) => {
          // Get student details
          const studentResult = await query('students', 'select', null, { id: intern.student_id });
          const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;
          
          if (!student) {
            return null;
          }

          // Get user details
          const userResult = await query('users', 'select', null, { id: student.user_id });
          const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;

          // Get company assignment from applications table
          const applicationResult = await query('applications', 'select', ['company_id'], { 
            student_id: student.user_id, 
            status: 'approved' 
          });
          const company_id = applicationResult.data && applicationResult.data.length > 0 
            ? applicationResult.data[0].company_id 
            : null;

          return {
            id: intern.id,
            school_year: intern.school_year,
            status: intern.status,
            created_at: intern.created_at,
            student_id: student.id,
            user_id: student.user_id,
            company_id: company_id,
            id_number: student.id_number,
            first_name: student.first_name,
            last_name: student.last_name,
            major: student.major,
            year: student.year,
            program: student.program,
            address: student.address,
            age: student.age,
            date_of_birth: student.date_of_birth,
            email: user ? user.email : null,
            profile_picture: user ? user.profile_picture : null
          };
        })
      );

      // Filter out null values
      const validInterns = internsWithDetails.filter(intern => intern !== null);

      return res.json({
        success: true,
        message: 'Interns fetched successfully',
        interns: validInterns
      });
    } catch (error) {
      console.error('Error fetching coordinator interns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch interns',
        error: error.message
      });
    }
  }

  // Delete an intern
  static async deleteIntern(req, res) {
    try {
      const { internId } = req.params;

      if (!internId) {
        return res.status(400).json({
          success: false,
          message: 'Intern ID is required'
        });
      }

      // Check if intern exists
      const internResult = await query('interns', 'select', null, { id: parseInt(internId) });
      
      if (!internResult.data || internResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Intern not found'
        });
      }

      // Delete the intern
      const deleteResult = await query('interns', 'delete', null, { id: parseInt(internId) });

      if (deleteResult.error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete intern',
          error: deleteResult.error
        });
      }

      return res.json({
        success: true,
        message: 'Intern deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting intern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete intern',
        error: error.message
      });
    }
  }
}

module.exports = InternController;
