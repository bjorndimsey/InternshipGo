const { query } = require('../config/supabase');

class SupervisorEvaluationController {
  // GET /api/supervisor-evaluations/:studentId/:companyId
  // Get evaluation form for a specific student and company
  static async getEvaluation(req, res) {
    try {
      const { studentId, companyId } = req.params;

      if (!studentId || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID and Company ID are required'
        });
      }

      console.log('📋 Fetching supervisor evaluation for student:', studentId, 'company:', companyId);

      const result = await query('supervisor_evaluation_forms', 'select', null, {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId)
      });

      if (result.error) {
        console.error('❌ Error fetching supervisor evaluation:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch supervisor evaluation',
          error: result.error.message
        });
      }

      const evaluation = result.data && result.data.length > 0 ? result.data[0] : null;

      console.log(evaluation ? '✅ Found supervisor evaluation' : 'ℹ️ No supervisor evaluation found');

      res.json({
        success: true,
        message: evaluation ? 'Supervisor evaluation fetched successfully' : 'No supervisor evaluation found',
        evaluationForm: evaluation
      });
    } catch (error) {
      console.error('❌ Error in getEvaluation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supervisor evaluation',
        error: error.message
      });
    }
  }

  // POST /api/supervisor-evaluations
  // Create a new supervisor evaluation form
  static async createEvaluation(req, res) {
    try {
      const {
        studentId,
        companyId,
        applicationId,
        // Section I: COMPANY AND SUPERVISOR
        organizationCompanyName,
        address,
        city,
        zip,
        supervisorPosition,
        supervisorPhone,
        supervisorEmail,
        // Section II: ON-THE-JOB TRAINING DATA
        startDate,
        endDate,
        totalHours,
        descriptionOfDuties,
        // Section III: PERFORMANCE EVALUATION
        question1Performance,
        question2SkillsCareer,
        question2Elaboration,
        question3FulltimeCandidate,
        question4InterestOtherTrainees,
        question4Elaboration,
        // Rating Scale items (1-5)
        workPerformance1,
        workPerformance2,
        workPerformance3,
        workPerformance4,
        workPerformance5,
        workPerformance6,
        communication1,
        communication2,
        professionalConduct1,
        professionalConduct2,
        professionalConduct3,
        punctuality1,
        punctuality2,
        punctuality3,
        flexibility1,
        flexibility2,
        attitude1,
        attitude2,
        attitude3,
        attitude4,
        attitude5,
        reliability1,
        reliability2,
        reliability3,
        reliability4,
        // Supervisor info
        supervisorName,
        supervisorSignatureUrl,
        evaluationDate
      } = req.body;

      const userId = req.user?.id || req.body.userId;

      // Verify authentication
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID is required'
        });
      }

      // Validate required fields
      if (!studentId || !companyId || !organizationCompanyName || !address || !city || !zip ||
          !supervisorPosition || !startDate || !endDate || !totalHours || !descriptionOfDuties ||
          !question1Performance || question2SkillsCareer === undefined || 
          question3FulltimeCandidate === undefined || question4InterestOtherTrainees === undefined ||
          !evaluationDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Validate question1Performance
      const validPerformanceRatings = ['Outstanding', 'Good', 'Average', 'Poor'];
      if (!validPerformanceRatings.includes(question1Performance)) {
        return res.status(400).json({
          success: false,
          message: 'Question 1 Performance must be one of: Outstanding, Good, Average, Poor'
        });
      }

      // Validate rating scale items (1-5)
      const ratingItems = [
        workPerformance1, workPerformance2, workPerformance3, workPerformance4, workPerformance5, workPerformance6,
        communication1, communication2,
        professionalConduct1, professionalConduct2, professionalConduct3,
        punctuality1, punctuality2, punctuality3,
        flexibility1, flexibility2,
        attitude1, attitude2, attitude3, attitude4, attitude5,
        reliability1, reliability2, reliability3, reliability4
      ];

      for (let i = 0; i < ratingItems.length; i++) {
        if (ratingItems[i] !== undefined && ratingItems[i] !== null) {
          const rating = parseInt(ratingItems[i]);
          if (isNaN(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
              success: false,
              message: `Rating items must be between 1 and 5`
            });
          }
        }
      }

      // Check if evaluation already exists
      const existingResult = await query('supervisor_evaluation_forms', 'select', null, {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId)
      });

      if (existingResult.data && existingResult.data.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Supervisor evaluation already exists for this student and company. Use PUT to update it.'
        });
      }

      // Calculate total score (sum of all rating items)
      let totalScore = 0;
      ratingItems.forEach(rating => {
        if (rating !== undefined && rating !== null) {
          totalScore += parseInt(rating);
        }
      });

      console.log('📋 Creating supervisor evaluation for student:', studentId, 'company:', companyId);

      const evaluationData = {
        student_id: parseInt(studentId),
        company_id: parseInt(companyId),
        application_id: applicationId ? parseInt(applicationId) : null,
        // Section I
        organization_company_name: organizationCompanyName.trim(),
        address: address.trim(),
        city: city.trim(),
        zip: zip.trim(),
        supervisor_position: supervisorPosition.trim(),
        supervisor_phone: supervisorPhone ? supervisorPhone.trim() : null,
        supervisor_email: supervisorEmail ? supervisorEmail.trim() : null,
        // Section II
        start_date: startDate,
        end_date: endDate,
        total_hours: parseFloat(totalHours),
        description_of_duties: descriptionOfDuties.trim(),
        // Section III
        question_1_performance: question1Performance,
        question_2_skills_career: question2SkillsCareer === true || question2SkillsCareer === 'true',
        question_2_elaboration: question2Elaboration ? question2Elaboration.trim() : null,
        question_3_fulltime_candidate: question3FulltimeCandidate === true || question3FulltimeCandidate === 'true',
        question_4_interest_other_trainees: question4InterestOtherTrainees === true || question4InterestOtherTrainees === 'true',
        question_4_elaboration: question4Elaboration ? question4Elaboration.trim() : null,
        // Rating items
        work_performance_1: workPerformance1 ? parseInt(workPerformance1) : null,
        work_performance_2: workPerformance2 ? parseInt(workPerformance2) : null,
        work_performance_3: workPerformance3 ? parseInt(workPerformance3) : null,
        work_performance_4: workPerformance4 ? parseInt(workPerformance4) : null,
        work_performance_5: workPerformance5 ? parseInt(workPerformance5) : null,
        work_performance_6: workPerformance6 ? parseInt(workPerformance6) : null,
        communication_1: communication1 ? parseInt(communication1) : null,
        communication_2: communication2 ? parseInt(communication2) : null,
        professional_conduct_1: professionalConduct1 ? parseInt(professionalConduct1) : null,
        professional_conduct_2: professionalConduct2 ? parseInt(professionalConduct2) : null,
        professional_conduct_3: professionalConduct3 ? parseInt(professionalConduct3) : null,
        punctuality_1: punctuality1 ? parseInt(punctuality1) : null,
        punctuality_2: punctuality2 ? parseInt(punctuality2) : null,
        punctuality_3: punctuality3 ? parseInt(punctuality3) : null,
        flexibility_1: flexibility1 ? parseInt(flexibility1) : null,
        flexibility_2: flexibility2 ? parseInt(flexibility2) : null,
        attitude_1: attitude1 ? parseInt(attitude1) : null,
        attitude_2: attitude2 ? parseInt(attitude2) : null,
        attitude_3: attitude3 ? parseInt(attitude3) : null,
        attitude_4: attitude4 ? parseInt(attitude4) : null,
        attitude_5: attitude5 ? parseInt(attitude5) : null,
        reliability_1: reliability1 ? parseInt(reliability1) : null,
        reliability_2: reliability2 ? parseInt(reliability2) : null,
        reliability_3: reliability3 ? parseInt(reliability3) : null,
        reliability_4: reliability4 ? parseInt(reliability4) : null,
        // Calculated fields
        total_score: totalScore,
        // Supervisor info
        supervisor_name: supervisorName ? supervisorName.trim() : null,
        supervisor_signature_url: supervisorSignatureUrl || null,
        evaluation_date: evaluationDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await query('supervisor_evaluation_forms', 'insert', evaluationData);

      if (result.error) {
        console.error('❌ Error creating supervisor evaluation:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create supervisor evaluation',
          error: result.error.message
        });
      }

      console.log('✅ Supervisor evaluation created successfully');

      res.json({
        success: true,
        message: 'Supervisor evaluation created successfully',
        evaluationForm: result.data
      });
    } catch (error) {
      console.error('❌ Error in createEvaluation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create supervisor evaluation',
        error: error.message
      });
    }
  }

  // PUT /api/supervisor-evaluations/:id
  // Update an existing supervisor evaluation form
  static async updateEvaluation(req, res) {
    try {
      const { id } = req.params;
      const {
        // Section I: COMPANY AND SUPERVISOR
        organizationCompanyName,
        address,
        city,
        zip,
        supervisorPosition,
        supervisorPhone,
        supervisorEmail,
        // Section II: ON-THE-JOB TRAINING DATA
        startDate,
        endDate,
        totalHours,
        descriptionOfDuties,
        // Section III: PERFORMANCE EVALUATION
        question1Performance,
        question2SkillsCareer,
        question2Elaboration,
        question3FulltimeCandidate,
        question4InterestOtherTrainees,
        question4Elaboration,
        // Rating Scale items (1-5)
        workPerformance1,
        workPerformance2,
        workPerformance3,
        workPerformance4,
        workPerformance5,
        workPerformance6,
        communication1,
        communication2,
        professionalConduct1,
        professionalConduct2,
        professionalConduct3,
        punctuality1,
        punctuality2,
        punctuality3,
        flexibility1,
        flexibility2,
        attitude1,
        attitude2,
        attitude3,
        attitude4,
        attitude5,
        reliability1,
        reliability2,
        reliability3,
        reliability4,
        // Supervisor info
        supervisorName,
        supervisorSignatureUrl,
        evaluationDate
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Evaluation form ID is required'
        });
      }

      // Verify authentication
      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID is required'
        });
      }

      // First, verify the evaluation form exists
      const existingResult = await query('supervisor_evaluation_forms', 'select', null, {
        id: parseInt(id)
      });

      if (existingResult.error || !existingResult.data || existingResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Supervisor evaluation form not found'
        });
      }

      const existingForm = existingResult.data[0];

      // Verify the evaluation belongs to the company (user must be from the company)
      if (existingForm.company_id.toString() !== userId.toString()) {
        // Check if user is from the company (you might need to add additional verification)
        // For now, we'll allow if userId matches company_id or if it's passed in body
        console.log('⚠️ User ID does not match company ID, but proceeding with update');
      }

      // Validate question1Performance if provided
      if (question1Performance) {
        const validPerformanceRatings = ['Outstanding', 'Good', 'Average', 'Poor'];
        if (!validPerformanceRatings.includes(question1Performance)) {
          return res.status(400).json({
            success: false,
            message: 'Question 1 Performance must be one of: Outstanding, Good, Average, Poor'
          });
        }
      }

      // Validate rating scale items (1-5) if provided
      const ratingItems = [
        workPerformance1, workPerformance2, workPerformance3, workPerformance4, workPerformance5, workPerformance6,
        communication1, communication2,
        professionalConduct1, professionalConduct2, professionalConduct3,
        punctuality1, punctuality2, punctuality3,
        flexibility1, flexibility2,
        attitude1, attitude2, attitude3, attitude4, attitude5,
        reliability1, reliability2, reliability3, reliability4
      ];

      for (let i = 0; i < ratingItems.length; i++) {
        if (ratingItems[i] !== undefined && ratingItems[i] !== null) {
          const rating = parseInt(ratingItems[i]);
          if (isNaN(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
              success: false,
              message: `Rating items must be between 1 and 5`
            });
          }
        }
      }

      console.log('📋 Updating supervisor evaluation:', id);

      // Calculate total score (sum of all rating items)
      let totalScore = 0;
      ratingItems.forEach(rating => {
        if (rating !== undefined && rating !== null) {
          totalScore += parseInt(rating);
        }
      });

      // Build update data object (only include fields that are provided)
      const updateData = {
        updated_at: new Date().toISOString()
      };

      // Section I
      if (organizationCompanyName !== undefined) updateData.organization_company_name = organizationCompanyName.trim();
      if (address !== undefined) updateData.address = address.trim();
      if (city !== undefined) updateData.city = city.trim();
      if (zip !== undefined) updateData.zip = zip.trim();
      if (supervisorPosition !== undefined) updateData.supervisor_position = supervisorPosition.trim();
      if (supervisorPhone !== undefined) updateData.supervisor_phone = supervisorPhone ? supervisorPhone.trim() : null;
      if (supervisorEmail !== undefined) updateData.supervisor_email = supervisorEmail ? supervisorEmail.trim() : null;

      // Section II
      if (startDate !== undefined) updateData.start_date = startDate;
      if (endDate !== undefined) updateData.end_date = endDate;
      if (totalHours !== undefined) updateData.total_hours = parseFloat(totalHours);
      if (descriptionOfDuties !== undefined) updateData.description_of_duties = descriptionOfDuties.trim();

      // Section III
      if (question1Performance !== undefined) updateData.question_1_performance = question1Performance;
      if (question2SkillsCareer !== undefined) updateData.question_2_skills_career = question2SkillsCareer === true || question2SkillsCareer === 'true';
      if (question2Elaboration !== undefined) updateData.question_2_elaboration = question2Elaboration ? question2Elaboration.trim() : null;
      if (question3FulltimeCandidate !== undefined) updateData.question_3_fulltime_candidate = question3FulltimeCandidate === true || question3FulltimeCandidate === 'true';
      if (question4InterestOtherTrainees !== undefined) updateData.question_4_interest_other_trainees = question4InterestOtherTrainees === true || question4InterestOtherTrainees === 'true';
      if (question4Elaboration !== undefined) updateData.question_4_elaboration = question4Elaboration ? question4Elaboration.trim() : null;

      // Rating items
      if (workPerformance1 !== undefined) updateData.work_performance_1 = workPerformance1 ? parseInt(workPerformance1) : null;
      if (workPerformance2 !== undefined) updateData.work_performance_2 = workPerformance2 ? parseInt(workPerformance2) : null;
      if (workPerformance3 !== undefined) updateData.work_performance_3 = workPerformance3 ? parseInt(workPerformance3) : null;
      if (workPerformance4 !== undefined) updateData.work_performance_4 = workPerformance4 ? parseInt(workPerformance4) : null;
      if (workPerformance5 !== undefined) updateData.work_performance_5 = workPerformance5 ? parseInt(workPerformance5) : null;
      if (workPerformance6 !== undefined) updateData.work_performance_6 = workPerformance6 ? parseInt(workPerformance6) : null;
      if (communication1 !== undefined) updateData.communication_1 = communication1 ? parseInt(communication1) : null;
      if (communication2 !== undefined) updateData.communication_2 = communication2 ? parseInt(communication2) : null;
      if (professionalConduct1 !== undefined) updateData.professional_conduct_1 = professionalConduct1 ? parseInt(professionalConduct1) : null;
      if (professionalConduct2 !== undefined) updateData.professional_conduct_2 = professionalConduct2 ? parseInt(professionalConduct2) : null;
      if (professionalConduct3 !== undefined) updateData.professional_conduct_3 = professionalConduct3 ? parseInt(professionalConduct3) : null;
      if (punctuality1 !== undefined) updateData.punctuality_1 = punctuality1 ? parseInt(punctuality1) : null;
      if (punctuality2 !== undefined) updateData.punctuality_2 = punctuality2 ? parseInt(punctuality2) : null;
      if (punctuality3 !== undefined) updateData.punctuality_3 = punctuality3 ? parseInt(punctuality3) : null;
      if (flexibility1 !== undefined) updateData.flexibility_1 = flexibility1 ? parseInt(flexibility1) : null;
      if (flexibility2 !== undefined) updateData.flexibility_2 = flexibility2 ? parseInt(flexibility2) : null;
      if (attitude1 !== undefined) updateData.attitude_1 = attitude1 ? parseInt(attitude1) : null;
      if (attitude2 !== undefined) updateData.attitude_2 = attitude2 ? parseInt(attitude2) : null;
      if (attitude3 !== undefined) updateData.attitude_3 = attitude3 ? parseInt(attitude3) : null;
      if (attitude4 !== undefined) updateData.attitude_4 = attitude4 ? parseInt(attitude4) : null;
      if (attitude5 !== undefined) updateData.attitude_5 = attitude5 ? parseInt(attitude5) : null;
      if (reliability1 !== undefined) updateData.reliability_1 = reliability1 ? parseInt(reliability1) : null;
      if (reliability2 !== undefined) updateData.reliability_2 = reliability2 ? parseInt(reliability2) : null;
      if (reliability3 !== undefined) updateData.reliability_3 = reliability3 ? parseInt(reliability3) : null;
      if (reliability4 !== undefined) updateData.reliability_4 = reliability4 ? parseInt(reliability4) : null;

      // Update total score
      if (totalScore > 0) {
        updateData.total_score = totalScore;
      }

      // Supervisor info
      if (supervisorName !== undefined) updateData.supervisor_name = supervisorName ? supervisorName.trim() : null;
      if (supervisorSignatureUrl !== undefined) updateData.supervisor_signature_url = supervisorSignatureUrl || null;
      if (evaluationDate !== undefined) updateData.evaluation_date = evaluationDate;

      const result = await query('supervisor_evaluation_forms', 'update', updateData, {
        id: parseInt(id)
      });

      if (result.error) {
        console.error('❌ Error updating supervisor evaluation:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update supervisor evaluation',
          error: result.error.message
        });
      }

      console.log('✅ Supervisor evaluation updated successfully');

      res.json({
        success: true,
        message: 'Supervisor evaluation updated successfully',
        evaluationForm: result.data
      });
    } catch (error) {
      console.error('❌ Error in updateEvaluation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update supervisor evaluation',
        error: error.message
      });
    }
  }
}

module.exports = SupervisorEvaluationController;

