const { supabase } = require('../config/supabase');

// Get platform statistics (student count, company count, profile pictures)
const getPlatformStats = async (req, res) => {
  try {
    console.log('📊 PLATFORM STATS - Fetching platform statistics');

    // Get student count and profile pictures
    const { count: studentCount, error: studentError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (studentError) {
      console.error('❌ Error fetching student count:', studentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch student count',
        error: studentError.message
      });
    }

    // Get company count and profile pictures
    const { count: companyCount, error: companyError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    if (companyError) {
      console.error('❌ Error fetching company count:', companyError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch company count',
        error: companyError.message
      });
    }

    // Get recent student profile pictures (limit to 12 for carousel)
    const { data: studentProfiles, error: studentProfilesError } = await supabase
      .from('students')
      .select(`
        user_id,
        users!students_user_id_fkey(profile_picture)
      `)
      .not('users.profile_picture', 'is', null)
      .limit(12)
      .order('created_at', { ascending: false });

    if (studentProfilesError) {
      console.error('❌ Error fetching student profiles:', studentProfilesError);
    }

    // Get recent company profile pictures (limit to 8 for carousel)
    const { data: companyProfiles, error: companyProfilesError } = await supabase
      .from('companies')
      .select(`
        user_id,
        users!companies_user_id_fkey(profile_picture)
      `)
      .limit(8)
      .order('created_at', { ascending: false });

    if (companyProfilesError) {
      console.error('❌ Error fetching company profiles:', companyProfilesError);
    } else {
      console.log('📊 Company profiles raw data:', companyProfiles);
      console.log('📊 Company profile pictures mapped:', companyProfiles?.map(profile => profile.users?.profile_picture).filter(Boolean));
    }

    const stats = {
      studentCount: studentCount || 0,
      companyCount: companyCount || 0,
      studentProfilePictures: studentProfiles?.map(profile => profile.users?.profile_picture).filter(Boolean) || [],
      companyProfilePictures: companyProfiles?.map(profile => profile.users?.profile_picture).filter(Boolean) || []
    };

    console.log('✅ Platform stats fetched successfully:', {
      studentCount: stats.studentCount,
      companyCount: stats.companyCount,
      studentProfileCount: stats.studentProfilePictures.length,
      companyProfileCount: stats.companyProfilePictures.length
    });

    res.status(200).json({
      success: true,
      message: 'Platform statistics fetched successfully',
      data: stats
    });

  } catch (error) {
    console.error('❌ Error in getPlatformStats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getPlatformStats
};
