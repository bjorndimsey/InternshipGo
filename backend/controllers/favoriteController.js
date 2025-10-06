const { supabase } = require('../config/supabase');

// Add company to favorites
const addToFavorites = async (req, res) => {
  try {
    const { studentId, companyId } = req.body;

    // Validate required fields
    if (!studentId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Company ID are required'
      });
    }

    // Check if student exists
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .single();

    if (studentError || !studentData) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if company exists
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .single();

    if (companyError || !companyData) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if already favorited
    const { data: existingFavorite, error: favoriteError } = await supabase
      .from('student_favorites')
      .select('id')
      .eq('student_id', studentId)
      .eq('company_id', companyId)
      .single();

    if (existingFavorite) {
      return res.status(409).json({
        success: false,
        message: 'Company is already in favorites'
      });
    }

    // Add to favorites
    const { data: result, error: insertError } = await supabase
      .from('student_favorites')
      .insert({ student_id: studentId, company_id: companyId })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      success: true,
      message: 'Company added to favorites successfully',
      favorite: result
    });

  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Remove company from favorites
const removeFromFavorites = async (req, res) => {
  try {
    const { studentId, companyId } = req.body;

    // Validate required fields
    if (!studentId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Company ID are required'
      });
    }

    // Check if favorite exists
    const { data: existingFavorite, error: favoriteError } = await supabase
      .from('student_favorites')
      .select('id')
      .eq('student_id', studentId)
      .eq('company_id', companyId)
      .single();

    if (favoriteError || !existingFavorite) {
      return res.status(404).json({
        success: false,
        message: 'Company is not in favorites'
      });
    }

    // Remove from favorites
    const { error: deleteError } = await supabase
      .from('student_favorites')
      .delete()
      .eq('student_id', studentId)
      .eq('company_id', companyId);

    if (deleteError) {
      throw deleteError;
    }

    res.status(200).json({
      success: true,
      message: 'Company removed from favorites successfully'
    });

  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get student's favorite companies
const getStudentFavorites = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate student ID
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    // Get basic favorites data first
    const { data: favorites, error: favoritesError } = await supabase
      .from('student_favorites')
      .select('id, created_at, company_id')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (favoritesError) {
      console.error('Supabase favorites query error:', favoritesError);
      throw favoritesError;
    }

    if (!favorites || favorites.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Favorites retrieved successfully',
        favorites: []
      });
    }

    // Get company details for each favorite
    const companyIds = favorites.map(fav => fav.company_id);
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, company_name, industry, address, partnership_status, moa_status, moa_expiry_date, user_id')
      .in('id', companyIds);

    if (companiesError) {
      console.error('Supabase companies query error:', companiesError);
      throw companiesError;
    }

    // Get user details for each company
    const companyUserIds = companies.map(company => company.user_id);
    const { data: companyUsers, error: usersError } = await supabase
      .from('users')
      .select('id, profile_picture, email')
      .in('id', companyUserIds);

    if (usersError) {
      console.error('Supabase users query error:', usersError);
      // Continue without user data if there's an error
    }

    // Transform the data to match the expected format
    const transformedResult = favorites.map(favorite => {
      const company = companies.find(c => c.id === favorite.company_id);
      if (!company) return null;

      const companyUser = companyUsers?.find(user => user.id === company.user_id);
      
      return {
        favorite_id: favorite.id,
        favorited_at: favorite.created_at,
        company_id: company.id,
        name: company.company_name,
        industry: company.industry,
        location: company.address,
        partnership_status: company.partnership_status,
        moa_status: company.moa_status,
        moa_expiry_date: company.moa_expiry_date,
        profile_picture: companyUser?.profile_picture || null,
        company_email: companyUser?.email || null,
        available_slots: 5, // Mock data for now - can be added to companies table later
        total_slots: 10, // Mock data for now - can be added to companies table later
        rating: 4.5, // Mock data for now - can be added to companies table later
        description: `Leading company in ${company.industry} industry`,
        website: `www.${company.company_name.toLowerCase().replace(/\s+/g, '')}.com`
      };
    }).filter(Boolean); // Remove null entries

    res.status(200).json({
      success: true,
      message: 'Favorites retrieved successfully',
      favorites: transformedResult
    });

  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if company is favorited by student
const checkFavoriteStatus = async (req, res) => {
  try {
    const { studentId, companyId } = req.params;

    // Validate required fields
    if (!studentId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Company ID are required'
      });
    }

    // Check if favorited
    const { data: result, error: queryError } = await supabase
      .from('student_favorites')
      .select('id')
      .eq('student_id', studentId)
      .eq('company_id', companyId)
      .single();

    const isFavorited = !queryError && result;

    res.status(200).json({
      success: true,
      message: 'Favorite status retrieved successfully',
      isFavorited
    });

  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Toggle favorite status (add if not favorited, remove if favorited)
const toggleFavorite = async (req, res) => {
  try {
    const { studentId, companyId } = req.body;

    // Validate required fields
    if (!studentId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Company ID are required'
      });
    }

    // Check if already favorited
    const { data: existingFavorite, error: favoriteError } = await supabase
      .from('student_favorites')
      .select('id')
      .eq('student_id', studentId)
      .eq('company_id', companyId)
      .single();

    if (existingFavorite) {
      // Remove from favorites
      const { error: deleteError } = await supabase
        .from('student_favorites')
        .delete()
        .eq('student_id', studentId)
        .eq('company_id', companyId);

      if (deleteError) {
        throw deleteError;
      }

      res.status(200).json({
        success: true,
        message: 'Company removed from favorites',
        isFavorited: false
      });
    } else {
      // Add to favorites
      const { error: insertError } = await supabase
        .from('student_favorites')
        .insert({ student_id: studentId, company_id: companyId });

      if (insertError) {
        throw insertError;
      }

      res.status(200).json({
        success: true,
        message: 'Company added to favorites',
        isFavorited: true
      });
    }

  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getStudentFavorites,
  checkFavoriteStatus,
  toggleFavorite
};
