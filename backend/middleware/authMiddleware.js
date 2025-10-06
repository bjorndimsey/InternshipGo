const { supabase } = require('../config/supabase');

// Simple authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    // For now, we'll use a simple approach - get user ID from query or body
    // In a real app, this would come from JWT token in Authorization header
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Verify user exists in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, user_type, is_active')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      userType: user.user_type
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

module.exports = authMiddleware;
