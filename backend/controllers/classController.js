const { query } = require('../config/supabase');

class ClassController {
  // Create a new class
  static async createClass(req, res) {
    try {
      const { className, schoolYear, classCode, coordinatorId, description } = req.body;

      if (!className || !schoolYear || !classCode || !coordinatorId) {
        return res.status(400).json({
          success: false,
          message: 'className, schoolYear, classCode, and coordinatorId are required'
        });
      }

      // Validate class code format (6 characters, alphanumeric)
      if (!/^[A-Z0-9]{6}$/.test(classCode)) {
        return res.status(400).json({
          success: false,
          message: 'Class code must be exactly 6 alphanumeric characters (uppercase)'
        });
      }

      // Check if coordinator exists and get coordinator ID
      const coordinatorResult = await query('coordinators', 'select', null, { user_id: parseInt(coordinatorId) });
      
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinatorDbId = coordinatorResult.data[0].id;

      // Check if class code already exists
      const existingClassResult = await query('classes', 'select', null, { class_code: classCode });
      
      if (existingClassResult.data && existingClassResult.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Class code already exists. Please generate a new code.'
        });
      }

      // Create the class
      const classData = {
        class_name: className,
        school_year: schoolYear,
        class_code: classCode,
        coordinator_id: coordinatorDbId,
        description: description || null,
        status: 'active'
      };

      const result = await query('classes', 'insert', classData);

      if (result.data && result.data.length > 0) {
        const newClass = result.data[0];
        const newClassId = newClass.id;
        
        // Automatically enroll existing interns that match the school year
        let enrolledCount = 0;
        let enrollmentErrors = [];
        let totalMatchingInterns = 0;
        
        try {
          // Find all interns assigned to this coordinator with matching school year
          // Note: interns.coordinator_id stores the user_id, not coordinators.id
          const internsResult = await query('interns', 'select', null, {
            coordinator_id: parseInt(coordinatorId), // Use user_id
            school_year: schoolYear
          });
          
          const matchingInterns = internsResult.data || [];
          totalMatchingInterns = matchingInterns.length;
          console.log(`📚 Found ${totalMatchingInterns} interns with school year ${schoolYear} for coordinator ${coordinatorId}`);
          
          // Enroll each matching intern in the new class
          for (const intern of matchingInterns) {
            try {
              // Check if student is already enrolled in this class
              const existingEnrollmentResult = await query('class_enrollments', 'select', null, {
                class_id: newClassId,
                student_id: intern.student_id
              });
              
              if (existingEnrollmentResult.data && existingEnrollmentResult.data.length > 0) {
                console.log(`ℹ️ Student ${intern.student_id} is already enrolled in class ${newClassId}`);
                continue; // Skip if already enrolled
              }
              
              // Create enrollment
              const enrollmentData = {
                class_id: newClassId,
                student_id: intern.student_id,
                status: 'enrolled'
              };
              
              const enrollmentResult = await query('class_enrollments', 'insert', enrollmentData);
              
              if (enrollmentResult.data && enrollmentResult.data.length > 0) {
                enrolledCount++;
                console.log(`✅ Automatically enrolled student ${intern.student_id} in class ${newClassId}`);
              }
            } catch (enrollError) {
              console.error(`❌ Error enrolling student ${intern.student_id}:`, enrollError);
              enrollmentErrors.push(`Student ${intern.student_id}: ${enrollError.message}`);
            }
          }
          
          console.log(`📚 Successfully enrolled ${enrolledCount} out of ${totalMatchingInterns} matching interns`);
        } catch (autoEnrollError) {
          console.error('❌ Error during automatic enrollment:', autoEnrollError);
          // Don't fail class creation if enrollment fails, just log it
          enrollmentErrors.push(`Auto-enrollment error: ${autoEnrollError.message}`);
        }
        
        const responseMessage = enrolledCount > 0 
          ? `Class created successfully. ${enrolledCount} intern${enrolledCount !== 1 ? 's' : ''} automatically enrolled.`
          : 'Class created successfully.';
        
        res.status(201).json({
          success: true,
          message: responseMessage,
          class: {
            id: newClass.id,
            className: newClass.class_name,
            schoolYear: newClass.school_year,
            classCode: newClass.class_code,
            coordinatorId: coordinatorId,
            description: newClass.description,
            status: newClass.status,
            createdAt: newClass.created_at
          },
          autoEnrolled: enrolledCount,
          totalMatchingInterns: totalMatchingInterns,
          enrollmentErrors: enrollmentErrors.length > 0 ? enrollmentErrors : undefined
        });
      } else {
        throw new Error('Failed to create class');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create class',
        error: error.message
      });
    }
  }

  // Get all classes for a coordinator
  static async getCoordinatorClasses(req, res) {
    try {
      const { coordinatorId } = req.params;

      // Get coordinator database ID from user_id
      const coordinatorResult = await query('coordinators', 'select', null, { user_id: parseInt(coordinatorId) });
      
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found'
        });
      }

      const coordinatorDbId = coordinatorResult.data[0].id;

      // Get all classes for this coordinator
      const classesResult = await query('classes', 'select', null, { coordinator_id: coordinatorDbId });

      // Get enrollment count for each class
      const classesWithCounts = await Promise.all(
        (classesResult.data || []).map(async (classItem) => {
          const enrollmentsResult = await query('class_enrollments', 'select', null, { 
            class_id: classItem.id,
            status: 'enrolled'
          });
          
          return {
            id: classItem.id,
            className: classItem.class_name,
            schoolYear: classItem.school_year,
            classCode: classItem.class_code,
            coordinatorId: coordinatorId,
            description: classItem.description,
            status: classItem.status,
            studentCount: enrollmentsResult.data ? enrollmentsResult.data.length : 0,
            createdAt: classItem.created_at,
            updatedAt: classItem.updated_at
          };
        })
      );

      res.json({
        success: true,
        message: 'Classes fetched successfully',
        classes: classesWithCounts
      });
    } catch (error) {
      console.error('Error fetching coordinator classes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch classes',
        error: error.message
      });
    }
  }

  // Get all classes (for admin/coordinator filtering)
  static async getAllClasses(req, res) {
    try {
      // Get all classes from the database
      const classesResult = await query('classes', 'select', null, { status: 'active' });

      // Get enrollment count and coordinator info for each class
      const classesWithCounts = await Promise.all(
        (classesResult.data || []).map(async (classItem) => {
          // Get enrollment count
          const enrollmentsResult = await query('class_enrollments', 'select', null, { 
            class_id: classItem.id,
            status: 'enrolled'
          });
          
          // Get coordinator info
          let coordinatorName = 'N/A';
          let coordinatorUserId = null;
          if (classItem.coordinator_id) {
            const coordinatorResult = await query('coordinators', 'select', null, { id: classItem.coordinator_id });
            if (coordinatorResult.data && coordinatorResult.data.length > 0) {
              coordinatorUserId = coordinatorResult.data[0].user_id;
              const userResult = await query('users', 'select', null, { id: coordinatorUserId });
              if (userResult.data && userResult.data.length > 0) {
                const user = userResult.data[0];
                coordinatorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A';
              }
            }
          }
          
          return {
            id: classItem.id,
            className: classItem.class_name,
            schoolYear: classItem.school_year,
            classCode: classItem.class_code,
            coordinatorId: coordinatorUserId,
            coordinatorName: coordinatorName,
            description: classItem.description,
            status: classItem.status,
            studentCount: enrollmentsResult.data ? enrollmentsResult.data.length : 0,
            createdAt: classItem.created_at,
            updatedAt: classItem.updated_at
          };
        })
      );

      res.json({
        success: true,
        message: 'All classes fetched successfully',
        classes: classesWithCounts
      });
    } catch (error) {
      console.error('Error fetching all classes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch classes',
        error: error.message
      });
    }
  }

  // Get class by code (for enrollment)
  static async getClassByCode(req, res) {
    try {
      const { classCode } = req.params;

      const classResult = await query('classes', 'select', null, { class_code: classCode });

      if (!classResult.data || classResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      const classItem = classResult.data[0];

      // Get coordinator info
      const coordinatorResult = await query('coordinators', 'select', null, { id: classItem.coordinator_id });
      const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;

      res.json({
        success: true,
        message: 'Class found',
        class: {
          id: classItem.id,
          className: classItem.class_name,
          schoolYear: classItem.school_year,
          classCode: classItem.class_code,
          description: classItem.description,
          status: classItem.status,
          coordinator: coordinator ? {
            userId: coordinator.user_id,
            name: `${coordinator.first_name} ${coordinator.last_name}`
          } : null,
          createdAt: classItem.created_at
        }
      });
    } catch (error) {
      console.error('Error fetching class by code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch class',
        error: error.message
      });
    }
  }

  // Enroll student in a class
  static async enrollStudent(req, res) {
    try {
      const { classCode, studentId } = req.body;

      if (!classCode || !studentId) {
        return res.status(400).json({
          success: false,
          message: 'classCode and studentId are required'
        });
      }

      // studentId can be either students.id (database ID) or user_id
      // First, try to find student by students.id
      let actualStudentId = parseInt(studentId);
      let studentResult = await query('students', 'select', null, { id: actualStudentId });
      
      // If not found by students.id, try to find by user_id
      if (!studentResult.data || studentResult.data.length === 0) {
        studentResult = await query('students', 'select', null, { user_id: parseInt(studentId) });
        if (studentResult.data && studentResult.data.length > 0) {
          actualStudentId = studentResult.data[0].id; // Use the students.id
          console.log(`✅ Found student by user_id ${studentId}, using students.id: ${actualStudentId}`);
        } else {
          return res.status(404).json({
            success: false,
            message: 'Student not found'
          });
        }
      } else {
        console.log(`✅ Found student by students.id: ${actualStudentId}`);
      }

      // Get class by code
      const classResult = await query('classes', 'select', null, { class_code: classCode });

      if (!classResult.data || classResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Class not found. Please check the class code.'
        });
      }

      const classItem = classResult.data[0];

      // Check if class is active
      if (classItem.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'This class is not currently accepting enrollments'
        });
      }

      // Check if student is already enrolled (using actualStudentId - students.id)
      const existingEnrollmentResult = await query('class_enrollments', 'select', null, {
        class_id: classItem.id,
        student_id: actualStudentId
      });

      if (existingEnrollmentResult.data && existingEnrollmentResult.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You are already enrolled in this class'
        });
      }

      // Get coordinator's user_id from coordinator_id
      const coordinatorResult = await query('coordinators', 'select', null, { id: classItem.coordinator_id });
      if (!coordinatorResult.data || coordinatorResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Coordinator not found for this class'
        });
      }

      const coordinator = coordinatorResult.data[0];
      const coordinatorUserId = coordinator.user_id;

      // Check if student is already an intern for this school year (using actualStudentId)
      // Note: The unique constraint is on (student_id, school_year), not including coordinator_id
      const existingInternResult = await query('interns', 'select', null, {
        student_id: actualStudentId,
        school_year: classItem.school_year
      });

      let internCreated = false;
      let newInternId = null;
      let existingIntern = null;

      // If not already an intern for this school year, automatically add them as an intern
      if (!existingInternResult.data || existingInternResult.data.length === 0) {
        const internData = {
          student_id: actualStudentId, // Use the actual students.id
          school_year: classItem.school_year,
          coordinator_id: coordinatorUserId, // Use the user_id
          status: 'active'
        };

        const internResult = await query('interns', 'insert', internData);
        
        if (internResult.data && internResult.data.length > 0) {
          internCreated = true;
          newInternId = internResult.data[0].id;
          existingIntern = internResult.data[0];
          console.log(`✅ Automatically added student ${actualStudentId} (students.id) as intern for coordinator ${coordinatorUserId} in school year ${classItem.school_year}`);
          
          // Assign existing requirements from the class to the new intern
          try {
            // Get all interns in the same class and coordinator (excluding the newly added one)
            const classInternsResult = await query('interns', 'select', null, {
              coordinator_id: coordinatorUserId,
              school_year: classItem.school_year
            });
            const classInterns = classInternsResult.data || [];
            
            // Get student IDs for these interns (excluding the newly added one)
            const classStudentIds = classInterns
              .filter(intern => intern.id !== newInternId)
              .map(intern => intern.student_id);
            
            if (classStudentIds.length > 0) {
              // Find all unique requirement_ids from existing students in this class
              const existingRequirements = [];
              for (const classStudentId of classStudentIds) {
                const reqResult = await query('student_requirements', 'select', null, {
                  student_id: classStudentId,
                  coordinator_id: classItem.coordinator_id // Use coordinators.id
                });
                if (reqResult.data && reqResult.data.length > 0) {
                  existingRequirements.push(...reqResult.data);
                }
              }
              
              // Get unique requirement IDs
              const uniqueRequirementIds = [...new Set(existingRequirements.map(req => req.requirement_id))];
              
              // Assign these requirements to the new intern
              for (const requirementId of uniqueRequirementIds) {
                // Get requirement details from one of the existing requirements
                const sampleReq = existingRequirements.find(req => req.requirement_id === requirementId);
                if (sampleReq) {
                  // Check if requirement already exists for this student
                  const existingReqCheck = await query('student_requirements', 'select', null, {
                    student_id: actualStudentId,
                    requirement_id: requirementId
                  });
                  
                  if (!existingReqCheck.data || existingReqCheck.data.length === 0) {
                    const requirementData = {
                      student_id: actualStudentId,
                      requirement_id: requirementId,
                      requirement_name: sampleReq.requirement_name,
                      requirement_description: sampleReq.requirement_description,
                      is_required: sampleReq.is_required,
                      due_date: sampleReq.due_date,
                      file_url: sampleReq.file_url,
                      file_public_id: sampleReq.file_public_id,
                      completed: false,
                      coordinator_id: classItem.coordinator_id, // Use coordinators.id
                      notes: null
                    };
                    
                    await query('student_requirements', 'insert', requirementData);
                    console.log(`✅ Assigned requirement ${requirementId} to new intern ${actualStudentId}`);
                  }
                }
              }
            }
          } catch (reqError) {
            console.error('Error assigning requirements to new intern:', reqError);
            // Don't fail enrollment if requirement assignment fails
          }
        }
      } else {
        // Student already has an intern record for this school year
        existingIntern = existingInternResult.data[0];
        newInternId = existingIntern.id;
        console.log(`ℹ️ Student ${actualStudentId} is already an intern for school year ${classItem.school_year} (intern_id: ${newInternId})`);
        
        // Check if the existing intern is for a different coordinator
        if (existingIntern.coordinator_id !== coordinatorUserId) {
          console.log(`⚠️ Student ${actualStudentId} is already an intern for a different coordinator (${existingIntern.coordinator_id}) in school year ${classItem.school_year}`);
          // Note: We'll still allow enrollment, but the intern record stays with the original coordinator
        }
      }

      // Create enrollment (using actualStudentId - students.id)
      const enrollmentData = {
        class_id: classItem.id,
        student_id: actualStudentId,
        status: 'enrolled'
      };

      const enrollmentResult = await query('class_enrollments', 'insert', enrollmentData);

      if (enrollmentResult.data && enrollmentResult.data.length > 0) {
        res.status(201).json({
          success: true,
          message: internCreated 
            ? 'Successfully enrolled in class and added as intern' 
            : 'Successfully enrolled in class',
          enrollment: {
            id: enrollmentResult.data[0].id,
            classId: classItem.id,
            className: classItem.class_name,
            studentId: actualStudentId,
            enrolledAt: enrollmentResult.data[0].enrolled_at,
            status: enrollmentResult.data[0].status
          },
          internCreated: internCreated
        });
      } else {
        throw new Error('Failed to create enrollment');
      }
    } catch (error) {
      console.error('Error enrolling student:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enroll in class',
        error: error.message
      });
    }
  }

  // Get students enrolled in a class
  static async getClassStudents(req, res) {
    try {
      const { classId } = req.params;

      const enrollmentsResult = await query('class_enrollments', 'select', null, {
        class_id: parseInt(classId),
        status: 'enrolled'
      });

      const enrollments = enrollmentsResult.data || [];

      // Get student details for each enrollment
      const studentsWithEnrollment = await Promise.all(
        enrollments.map(async (enrollment) => {
          const studentResult = await query('students', 'select', null, { id: enrollment.student_id });
          const student = studentResult.data && studentResult.data.length > 0 ? studentResult.data[0] : null;

          if (!student) return null;

          // Get user details
          const userResult = await query('users', 'select', ['email', 'profile_picture'], { id: student.user_id });
          const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;

          return {
            id: student.id,
            studentId: student.id_number,
            firstName: student.first_name,
            lastName: student.last_name,
            email: user ? user.email : null,
            profilePicture: user ? user.profile_picture : null,
            major: student.major,
            program: student.program,
            year: student.year,
            enrolledAt: enrollment.enrolled_at,
            enrollmentStatus: enrollment.status
          };
        })
      );

      const validStudents = studentsWithEnrollment.filter(s => s !== null);

      res.json({
        success: true,
        message: 'Students fetched successfully',
        students: validStudents,
        count: validStudents.length
      });
    } catch (error) {
      console.error('Error fetching class students:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch students',
        error: error.message
      });
    }
  }

  // Get classes for a student
  static async getStudentClasses(req, res) {
    try {
      const { studentId } = req.params;

      const enrollmentsResult = await query('class_enrollments', 'select', null, {
        student_id: parseInt(studentId),
        status: 'enrolled'
      });

      const enrollments = enrollmentsResult.data || [];

      // Get class details for each enrollment
      const classesWithEnrollment = await Promise.all(
        enrollments.map(async (enrollment) => {
          const classResult = await query('classes', 'select', null, { id: enrollment.class_id });
          const classItem = classResult.data && classResult.data.length > 0 ? classResult.data[0] : null;

          if (!classItem) return null;

          // Get coordinator info
          const coordinatorResult = await query('coordinators', 'select', null, { id: classItem.coordinator_id });
          const coordinator = coordinatorResult.data && coordinatorResult.data.length > 0 ? coordinatorResult.data[0] : null;

          return {
            id: classItem.id,
            className: classItem.class_name,
            schoolYear: classItem.school_year,
            classCode: classItem.class_code,
            description: classItem.description,
            status: classItem.status,
            coordinator: coordinator ? {
              userId: coordinator.user_id,
              name: `${coordinator.first_name} ${coordinator.last_name}`
            } : null,
            enrolledAt: enrollment.enrolled_at,
            enrollmentStatus: enrollment.status
          };
        })
      );

      const validClasses = classesWithEnrollment.filter(c => c !== null);

      res.json({
        success: true,
        message: 'Classes fetched successfully',
        classes: validClasses,
        count: validClasses.length
      });
    } catch (error) {
      console.error('Error fetching student classes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch classes',
        error: error.message
      });
    }
  }

  // Update class status
  static async updateClassStatus(req, res) {
    try {
      const { classId } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'inactive', 'archived'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Valid status (active, inactive, or archived) is required'
        });
      }

      const result = await query('classes', 'update', { status, updated_at: new Date().toISOString() }, { id: parseInt(classId) });

      if (result.data && result.data.length > 0) {
        res.json({
          success: true,
          message: 'Class status updated successfully',
          class: result.data[0]
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }
    } catch (error) {
      console.error('Error updating class status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update class status',
        error: error.message
      });
    }
  }

  // Delete a class
  static async deleteClass(req, res) {
    try {
      const { classId } = req.params;

      // Check if class exists
      const classResult = await query('classes', 'select', null, { id: parseInt(classId) });

      if (!classResult.data || classResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Delete class (enrollments will be cascade deleted)
      await query('classes', 'delete', null, { id: parseInt(classId) });

      res.json({
        success: true,
        message: 'Class deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting class:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete class',
        error: error.message
      });
    }
  }

  // Get all enrolled students across all classes
  static async getAllEnrolledStudents(req, res) {
    try {
      // Get all enrollments with status 'enrolled'
      const enrollmentsResult = await query('class_enrollments', 'select', null, {
        status: 'enrolled'
      });

      const enrollments = enrollmentsResult.data || [];

      // Get unique student IDs
      const uniqueStudentIds = [...new Set(enrollments.map(e => e.student_id))];

      res.json({
        success: true,
        message: 'Enrolled students fetched successfully',
        count: uniqueStudentIds.length,
        totalEnrollments: enrollments.length
      });
    } catch (error) {
      console.error('Error fetching all enrolled students:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch enrolled students',
        error: error.message
      });
    }
  }
}

module.exports = ClassController;

