const { supabase } = require('../config/supabase');
const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

class PushTokenController {
  // Register or update push token for a user
  async registerPushToken(req, res) {
    try {
      const { userId, pushToken, userType } = req.body;
      const currentUserId = req.user.id;

      // Verify the userId matches the authenticated user
      if (userId !== currentUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Cannot register push token for another user'
        });
      }

      if (!pushToken || !userType) {
        return res.status(400).json({
          success: false,
          message: 'pushToken and userType are required'
        });
      }

      // Validate Expo push token format
      if (!Expo.isExpoPushToken(pushToken)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Expo push token format'
        });
      }

      console.log(`📱 Registering push token for user ${userId}: ${pushToken.substring(0, 20)}...`);

      // Check if token already exists for this user
      const { data: existingToken, error: checkError } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('push_token', pushToken)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        throw checkError;
      }

      if (existingToken) {
        // Update existing token
        const { data: updatedToken, error: updateError } = await supabase
          .from('push_tokens')
          .update({
            user_type: userType,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingToken.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return res.json({
          success: true,
          message: 'Push token updated successfully',
          token: updatedToken
        });
      } else {
        // Insert new token
        const { data: newToken, error: insertError } = await supabase
          .from('push_tokens')
          .insert({
            user_id: userId,
            push_token: pushToken,
            user_type: userType
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        return res.json({
          success: true,
          message: 'Push token registered successfully',
          token: newToken
        });
      }
    } catch (error) {
      console.error('Error registering push token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register push token',
        error: error.message
      });
    }
  }

  // Get push tokens for a user
  async getUserPushTokens(req, res) {
    try {
      const userId = req.user.id;

      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        tokens: tokens || []
      });
    } catch (error) {
      console.error('Error fetching push tokens:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch push tokens',
        error: error.message
      });
    }
  }

  // Delete push token
  async deletePushToken(req, res) {
    try {
      const { tokenId } = req.params;
      const userId = req.user.id;

      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('id', tokenId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message: 'Push token deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting push token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete push token',
        error: error.message
      });
    }
  }
}

module.exports = new PushTokenController();

