const { Expo } = require('expo-server-sdk');
const { supabase } = require('../config/supabase');

// Create a new Expo SDK client
const expo = new Expo();

class PushNotificationService {
  /**
   * Send push notification to a user
   * @param {number} userId - The user ID to send notification to
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data to send with notification
   * @param {boolean} onlyIfUnread - Only send if user has unread messages (for messages)
   */
  async sendPushNotification(userId, title, body, data = {}, onlyIfUnread = false) {
    try {
      // Get user's push tokens
      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('push_token')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching push tokens:', error);
        return { success: false, error: error.message };
      }

      if (!tokens || tokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return { success: false, error: 'No push tokens found' };
      }

      // If onlyIfUnread is true, check if user has unread messages
      if (onlyIfUnread && data.conversationId) {
        // Check unread messages manually
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', data.conversationId)
          .neq('sender_id', userId);

        if (messagesError) {
          console.error('Error checking unread messages:', messagesError);
          // Continue anyway - better to send notification than miss it
        } else if (messages && messages.length > 0) {
          const { data: readReceipts } = await supabase
            .from('message_read_receipts')
            .select('message_id')
            .eq('user_id', userId)
            .in('message_id', messages.map(m => m.id));

          const readMessageIds = readReceipts ? readReceipts.map(r => r.message_id) : [];
          const unreadMessages = messages.filter(msg => !readMessageIds.includes(msg.id));

          if (unreadMessages.length === 0) {
            console.log(`User ${userId} has no unread messages in conversation ${data.conversationId} - skipping notification`);
            return { success: false, error: 'No unread messages' };
          }
        } else {
          // No messages yet, but we're sending a new one, so allow notification
          console.log(`No previous messages in conversation ${data.conversationId} - allowing notification for new message`);
        }
      }

      // Prepare notification messages
      const messages = tokens
        .filter(token => Expo.isExpoPushToken(token.push_token))
        .map(token => ({
          to: token.push_token,
          sound: 'default',
          title: title,
          body: body,
          data: data,
          priority: 'high',
          channelId: 'default'
        }));

      if (messages.length === 0) {
        console.log(`No valid push tokens for user ${userId}`);
        return { success: false, error: 'No valid push tokens' };
      }

      // Send notifications in chunks (Expo allows up to 100 at a time)
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];
      const allMessages = []; // Track all messages in order

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          allMessages.push(...chunk); // Keep messages in same order as tickets
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Check for errors in tickets and handle invalid tokens
      // Tickets are returned in the same order as messages
      const invalidTokens = [];
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'error') {
          const errorMessage = ticket.message || '';
          // Check if this is an invalid/expired token error
          if (
            errorMessage.includes('Invalid') ||
            errorMessage.includes('DeviceNotRegistered') ||
            errorMessage.includes('exponent') ||
            errorMessage.includes('NotRegistered')
          ) {
            // Get the corresponding token from the messages array
            const correspondingMessage = allMessages[index];
            if (correspondingMessage && correspondingMessage.to) {
              invalidTokens.push(correspondingMessage.to);
            }
          }
        }
      });

      if (invalidTokens.length > 0) {
        console.error(`Found ${invalidTokens.length} invalid push token(s):`, invalidTokens);

        // Remove invalid tokens from database
        try {
          const { error: deleteError } = await supabase
            .from('push_tokens')
            .delete()
            .in('push_token', invalidTokens);
          
          if (deleteError) {
            console.error('Error removing invalid push tokens:', deleteError);
          } else {
            console.log(`🗑️ Removed ${invalidTokens.length} invalid push token(s) from database`);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up invalid tokens:', cleanupError);
        }
      }

      const errorCount = tickets.filter(t => t.status === 'error').length;
      const successCount = tickets.length - errorCount;
      console.log(`✅ Sent ${successCount}/${tickets.length} push notification(s) to user ${userId}`);
      return { success: successCount > 0, tickets: successCount, errors: errorCount };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple users
   * @param {Array<number>} userIds - Array of user IDs
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data
   */
  async sendPushNotificationToMultiple(userIds, title, body, data = {}) {
    const results = await Promise.all(
      userIds.map(userId => this.sendPushNotification(userId, title, body, data, false))
    );

    const successCount = results.filter(r => r.success).length;
    return { success: true, sent: successCount, total: userIds.length };
  }
}

module.exports = new PushNotificationService();

