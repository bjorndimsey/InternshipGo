const { supabase } = require('../config/supabase');

// Submit evidence (daily task)
const submitEvidence = async (req, res) => {
  try {
    console.log('📝 EVIDENCE CONTROLLER - submitEvidence called');
    console.log('  - Request body:', req.body);
    console.log('  - User ID from query:', req.query.userId);

    const { title, description, imageUrl, companyId, userId, submittedAt } = req.body;
    const requestingUserId = req.query.userId;

    // Validate required fields
    if (!title || !description || !companyId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, companyId, userId'
      });
    }

    // Verify the requesting user matches the evidence user
    if (requestingUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: User ID mismatch'
      });
    }

    console.log('📝 Inserting evidence into database...');
    
    // Insert evidence into database
    const { data, error } = await supabase
      .from('evidences')
      .insert({
        user_id: userId,
        company_id: parseInt(companyId),
        task_title: title,
        task_notes: description,
        image_url: imageUrl || null,
        submitted_at: submittedAt || new Date().toISOString(),
        status: 'submitted'
      })
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit evidence',
        error: error.message
      });
    }

    console.log('✅ Evidence submitted successfully:', data);

    res.status(201).json({
      success: true,
      message: 'Evidence submitted successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('❌ Error in submitEvidence:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all evidences for a user
const getEvidences = async (req, res) => {
  try {
    console.log('📋 EVIDENCE CONTROLLER - getEvidences called');
    console.log('  - User ID:', req.query.userId);
    console.log('  - Query params:', req.query);

    const userId = req.query.userId;
    const { companyId, startDate, endDate, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let query = supabase
      .from('evidences')
      .select(`
        *,
        companies:company_id (
          id,
          company_name,
          industry
        )
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (startDate) {
      query = query.gte('submitted_at', startDate);
    }

    if (endDate) {
      query = query.lte('submitted_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch evidences',
        error: error.message
      });
    }

    console.log('✅ Evidences fetched successfully:', data?.length || 0);

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in getEvidences:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get evidences for a specific intern (for coordinators)
const getInternEvidences = async (req, res) => {
  try {
    console.log('📋 EVIDENCE CONTROLLER - getInternEvidences called');
    console.log('  - Intern ID:', req.params.internId);
    console.log('  - User ID:', req.query.userId);
    console.log('  - Query params:', req.query);

    const internId = req.params.internId;
    const userId = req.query.userId;
    const { limit = 50, offset = 0, month, year } = req.query;

    if (!internId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID and User ID are required'
      });
    }

    let query = supabase
      .from('evidences')
      .select(`
        *,
        companies:company_id (
          id,
          company_name,
          industry
        )
      `)
      .eq('user_id', internId)
      .order('submitted_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply date filters
    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      query = query.gte('submitted_at', startDate).lte('submitted_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch intern evidences',
        error: error.message
      });
    }

    console.log('✅ Intern evidences fetched successfully:', data?.length || 0);

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in getInternEvidences:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update evidence status (for coordinators/companies)
const updateEvidenceStatus = async (req, res) => {
  try {
    console.log('📝 EVIDENCE CONTROLLER - updateEvidenceStatus called');
    console.log('  - Evidence ID:', req.params.evidenceId);
    console.log('  - Request body:', req.body);

    const evidenceId = req.params.evidenceId;
    const { status, reviewNotes, reviewedBy } = req.body;

    if (!evidenceId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Evidence ID and status are required'
      });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (reviewNotes) {
      updateData.review_notes = reviewNotes;
    }

    if (reviewedBy) {
      updateData.reviewed_by = reviewedBy;
      updateData.reviewed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('evidences')
      .update(updateData)
      .eq('id', evidenceId)
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update evidence status',
        error: error.message
      });
    }

    console.log('✅ Evidence status updated successfully:', data);

    res.json({
      success: true,
      message: 'Evidence status updated successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('❌ Error in updateEvidenceStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete evidence (only if not reviewed)
const deleteEvidence = async (req, res) => {
  try {
    console.log('🗑️ EVIDENCE CONTROLLER - deleteEvidence called');
    console.log('  - Evidence ID:', req.params.evidenceId);
    console.log('  - User ID:', req.query.userId);

    const evidenceId = req.params.evidenceId;
    const userId = req.query.userId;

    if (!evidenceId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Evidence ID and User ID are required'
      });
    }

    // First check if the evidence exists and belongs to the user
    const { data: evidence, error: fetchError } = await supabase
      .from('evidences')
      .select('*')
      .eq('id', evidenceId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found or unauthorized'
      });
    }

    // Check if evidence can be deleted (only if not reviewed)
    if (evidence.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete reviewed evidence'
      });
    }

    // Delete the evidence
    const { error: deleteError } = await supabase
      .from('evidences')
      .delete()
      .eq('id', evidenceId);

    if (deleteError) {
      console.error('❌ Supabase error:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete evidence',
        error: deleteError.message
      });
    }

    console.log('✅ Evidence deleted successfully');

    res.json({
      success: true,
      message: 'Evidence deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in deleteEvidence:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get evidence statistics
const getEvidenceStats = async (req, res) => {
  try {
    console.log('📊 EVIDENCE CONTROLLER - getEvidenceStats called');
    console.log('  - User ID:', req.query.userId);

    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('evidences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('❌ Supabase count error:', countError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get evidence count',
        error: countError.message
      });
    }

    // Get status breakdown
    const { data: statusData, error: statusError } = await supabase
      .from('evidences')
      .select('status')
      .eq('user_id', userId);

    if (statusError) {
      console.error('❌ Supabase status error:', statusError);
      return res.status(500).json({
        success: false,
        message: 'Failed to get evidence status breakdown',
        error: statusError.message
      });
    }

    // Count by status
    const statusBreakdown = statusData.reduce((acc, evidence) => {
      acc[evidence.status] = (acc[evidence.status] || 0) + 1;
      return acc;
    }, {});

    console.log('✅ Evidence stats fetched successfully');

    res.json({
      success: true,
      data: {
        totalCount: totalCount || 0,
        statusBreakdown
      }
    });

  } catch (error) {
    console.error('❌ Error in getEvidenceStats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  submitEvidence,
  getEvidences,
  getInternEvidences,
  updateEvidenceStatus,
  deleteEvidence,
  getEvidenceStats
};
