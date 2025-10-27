const { supabase } = require('../config/supabase');

// Get companies data for landing page
const getCompaniesLandingPage = async (req, res) => {
  try {
    console.log('🏢 COMPANIES LANDING PAGE - Fetching companies data');

    // Get companies with their user data (profile picture, background picture, etc.)
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(`
        id,
        company_name,
        industry,
        address,
        available_intern_slots,
        total_intern_capacity,
        current_intern_count,
        created_at,
        users!companies_user_id_fkey(
          profile_picture,
          background_picture
        )
      `)
      .order('created_at', { ascending: false })
      .limit(12); // Limit to 12 companies for landing page

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch companies data',
        error: companiesError.message
      });
    }

    // Transform the data to match the frontend structure
    const transformedCompanies = companies.map(company => {
      const user = company.users;
      return {
        id: company.id,
        name: company.company_name || 'Company',
        logo: user?.profile_picture || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        backgroundPicture: user?.background_picture || null,
        industry: company.industry || 'Technology',
        openings: company.available_intern_slots || 0,
        totalCapacity: company.total_intern_capacity || 0,
        currentInterns: company.current_intern_count || 0,
        location: company.address || 'Location not specified',
        rating: 4.5, // Default rating for now
        createdAt: company.created_at
      };
    });

    console.log('✅ Companies data fetched successfully:', {
      totalCompanies: transformedCompanies.length,
      companiesWithLogos: transformedCompanies.filter(c => c.logo).length,
      companiesWithBackgrounds: transformedCompanies.filter(c => c.backgroundPicture).length
    });

    res.status(200).json({
      success: true,
      message: 'Companies data fetched successfully',
      data: transformedCompanies
    });

  } catch (error) {
    console.error('❌ Error in getCompaniesLandingPage:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getCompaniesLandingPage
};
