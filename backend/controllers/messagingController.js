const { supabase } = require('../config/supabase');
const pushNotificationService = require('../services/pushNotificationService');

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (diffInMinutes < 10080) {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else {
    return messageTime.toLocaleDateString();
  }
}

class MessagingController {
  // Search users for messaging (excludes system admin)
  async searchUsers(req, res) {
    try {
      const { searchTerm } = req.query;
      const currentUserId = req.user.id;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be at least 2 characters long'
        });
      }

      console.log(`Searching for: "${searchTerm}" by user: ${currentUserId}`);

      // First, get all active users (excluding system admin and current user)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, user_type, email, profile_picture')
        .neq('id', currentUserId)
        .neq('user_type', 'System')
        .eq('is_active', true)
        .limit(50);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      console.log(`Found ${users.length} users`);

      // Get additional details for all users and perform comprehensive search
      const searchResults = await Promise.all(
        users.map(async (user) => {
          let name = '';
          let username = '';
          let firstName = '';
          let lastName = '';

          try {
            if (user.user_type === 'Student') {
              const { data: student } = await supabase
                .from('students')
                .select('first_name, last_name, id_number')
                .eq('user_id', user.id)
                .single();
              
              if (student) {
                firstName = student.first_name || '';
                lastName = student.last_name || '';
                name = `${firstName} ${lastName}`.trim();
                username = student.id_number || '';
              }
            } else if (user.user_type === 'Coordinator') {
              const { data: coordinator } = await supabase
                .from('coordinators')
                .select('first_name, last_name')
                .eq('user_id', user.id)
                .single();
              
              if (coordinator) {
                firstName = coordinator.first_name || '';
                lastName = coordinator.last_name || '';
                name = `${firstName} ${lastName}`.trim();
                username = `${firstName}.${lastName}`;
              }
            } else if (user.user_type === 'Company') {
              const { data: company } = await supabase
                .from('companies')
                .select('company_name')
                .eq('user_id', user.id)
                .single();
              
              if (company) {
                name = company.company_name || '';
                username = company.company_name || '';
              }
            }

            // Check if any field matches search term
            const searchLower = searchTerm.toLowerCase();
            const nameMatches = name.toLowerCase().includes(searchLower);
            const firstNameMatches = firstName.toLowerCase().includes(searchLower);
            const lastNameMatches = lastName.toLowerCase().includes(searchLower);
            const usernameMatches = username.toLowerCase().includes(searchLower);
            const emailMatches = user.email.toLowerCase().includes(searchLower);

            if (nameMatches || firstNameMatches || lastNameMatches || usernameMatches || emailMatches) {
              
              return {
                id: user.id.toString(),
                name: name || user.email.split('@')[0],
                username: username || user.email.split('@')[0],
                email: user.email,
                profilePicture: user.profile_picture || '',
                userType: user.user_type.toLowerCase(),
                isOnline: Math.random() > 0.5 // Mock online status
              };
            }
          } catch (error) {
            console.error(`Error fetching details for user ${user.id}:`, error);
          }
          
          return null;
        })
      );

      // Filter out null results and limit to 10 results
      const filteredUsers = searchResults.filter(user => user !== null).slice(0, 10);

      console.log(`Search found: ${filteredUsers.length} users`);

      res.json({
        success: true,
        users: filteredUsers
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search users',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get user conversations
  async getConversations(req, res) {
    try {
      const userId = req.user.id;

      // First, get conversation IDs where user is a participant
      const { data: userConversations, error: userConvError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (userConvError) {
        throw userConvError;
      }

      if (!userConversations || userConversations.length === 0) {
        return res.json({
          success: true,
          conversations: []
        });
      }

      const conversationIds = userConversations.map(uc => uc.conversation_id);

      // Now get all conversations with all participants
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          name,
          avatar_url,
          created_at,
          updated_at,
          conversation_participants(
            user_id, 
            is_active,
            users(
              id,
              user_type,
              email,
              profile_picture,
              students(id, first_name, last_name, id_number),
              coordinators!coordinators_user_id_fkey(id, first_name, last_name),
              companies!companies_user_id_fkey(id, company_name)
            )
          ),
          messages(content, sender_id, created_at, message_type)
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Calculate unread counts for each conversation
      const conversationsWithUnreadCounts = await Promise.all(
        conversations.map(async (conv) => {
          // First, get all read message IDs for this user in this conversation
          const { data: readReceipts, error: receiptsError } = await supabase
            .from('message_read_receipts')
            .select('message_id')
            .eq('user_id', userId);

          if (receiptsError) {
            console.error('Error fetching read receipts:', receiptsError);
            return { ...conv, unreadCount: 0 };
          }

          const readMessageIds = readReceipts ? readReceipts.map(r => r.message_id) : [];

          // Get all messages in this conversation from other users
          const { data: allMessages, error: messagesError } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId);

          if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return { ...conv, unreadCount: 0 };
          }

          // Calculate unread count by filtering out read messages
          const unreadCount = allMessages ? 
            allMessages.filter(msg => !readMessageIds.includes(msg.id)).length : 0;

          return {
            ...conv,
            unreadCount: unreadCount
          };
        })
      );

      const formattedConversations = conversationsWithUnreadCounts.map(conv => {
        // Get the last message
        const lastMessage = conv.messages && conv.messages.length > 0 
          ? conv.messages[conv.messages.length - 1] 
          : null;

        // Get participants for this conversation with user details
        const participants = conv.conversation_participants || [];

        const formattedParticipants = participants.map(p => {
          const user = p.users;
          let name = '';
          let username = '';

          if (user) {
            if (user.user_type === 'Student' && user.students && user.students.length > 0) {
              const student = user.students[0];
              name = `${student.first_name} ${student.last_name}`;
              username = student.id_number;
            } else if (user.user_type === 'Coordinator' && user.coordinators && user.coordinators.length > 0) {
              const coordinator = user.coordinators[0];
              name = `${coordinator.first_name} ${coordinator.last_name}`;
              username = `${coordinator.first_name}.${coordinator.last_name}`;
            } else if (user.user_type === 'Company' && user.companies && user.companies.length > 0) {
              const company = user.companies[0];
              name = company.company_name;
              username = company.company_name;
            } else {
              name = user.email.split('@')[0];
              username = user.email.split('@')[0];
            }
          }

          
          return {
            id: p.user_id.toString(),
            user_id: p.user_id.toString(),
            isActive: p.is_active,
            user: {
              id: user?.id?.toString() || p.user_id.toString(),
              name: name || user?.email?.split('@')[0] || 'Unknown User',
              username: username || user?.email?.split('@')[0] || 'unknown',
              email: user?.email || '',
              profilePicture: user?.profile_picture || '',
              userType: user?.user_type?.toLowerCase() || 'unknown'
            },
            name: name || user?.email?.split('@')[0] || 'Unknown User',
            profilePicture: user?.profile_picture || ''
          };
        });

        return {
          id: conv.id.toString(),
          type: conv.type,
          name: conv.name || 'Direct Message',
          avatar_url: conv.avatar_url,
          participants: formattedParticipants,
          lastMessage: lastMessage ? {
            id: 'temp-id',
            senderId: lastMessage.sender_id.toString(),
            message: lastMessage.content,
            timestamp: formatTimestamp(lastMessage.created_at),
            messageType: lastMessage.message_type || 'text'
          } : undefined,
          unreadCount: conv.unreadCount || 0, // Use calculated unread count
          isOnline: false, // Mock status
          createdAt: conv.created_at,
          updatedAt: conv.updated_at
        };
      });

      res.json({
        success: true,
        conversations: formattedConversations
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversations'
      });
    }
  }

  // Create direct conversation
  async createDirectConversation(req, res) {
    try {
      const { participantId } = req.body;
      const currentUserId = req.user.id;

      if (!participantId) {
        return res.status(400).json({
          success: false,
          message: 'Participant ID is required'
        });
      }

      // Check if conversation already exists
      const { data: existingConversations, error: checkError } = await supabase
        .from('conversations')
        .select(`
          id,
          conversation_participants(user_id, is_active)
        `)
        .eq('type', 'direct')
        .eq('conversation_participants.user_id', currentUserId)
        .eq('conversation_participants.is_active', true);

      if (checkError) {
        throw checkError;
      }

      // Check if there's already a direct conversation with the participant
      let existingConversation = null;
      for (const conv of existingConversations) {
        const hasParticipant = conv.conversation_participants.some(
          p => p.user_id == participantId && p.is_active
        );
        if (hasParticipant) {
          existingConversation = conv;
          break;
        }
      }

      if (existingConversation) {
        return res.json({
          success: true,
          conversationId: existingConversation.id.toString(),
          message: 'Conversation already exists'
        });
      }

      // Create new direct conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          created_by: currentUserId
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Add both users as participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: currentUserId },
          { conversation_id: newConversation.id, user_id: participantId }
        ]);

      if (participantsError) {
        throw participantsError;
      }

      res.json({
        success: true,
        conversationId: newConversation.id.toString(),
        message: 'Direct conversation created successfully'
      });
    } catch (error) {
      console.error('Error creating direct conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create direct conversation'
      });
    }
  }

  // Create group conversation
  async createGroupConversation(req, res) {
    try {
      const { groupName, participantIds, avatarUrl } = req.body;
      const currentUserId = req.user.id;

      // Optimized: Removed excessive logging for better performance

      if (!groupName || !participantIds || participantIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Group name and participant IDs are required'
        });
      }

      // Create group conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name: groupName,
          created_by: currentUserId,
          avatar_url: avatarUrl || null
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Add creator and all participants (filter out current user from participantIds to avoid duplicates)
      const uniqueParticipantIds = participantIds.filter(id => id.toString() !== currentUserId.toString());
      const participants = [
        { conversation_id: newConversation.id, user_id: currentUserId },
        ...uniqueParticipantIds.map(id => ({ conversation_id: newConversation.id, user_id: id }))
      ];

      // Optimized: Removed excessive logging for better performance

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) {
        throw participantsError;
      }

      res.json({
        success: true,
        conversationId: newConversation.id.toString(),
        message: 'Group conversation created successfully'
      });
    } catch (error) {
      console.error('Error creating group conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create group conversation'
      });
    }
  }

  // Get messages for a conversation
  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 50 } = req.query;

      // Verify user is participant in conversation
      const { data: participant, error: participantError } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (participantError || !participant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Get messages with sender info
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          content,
          message_type,
          is_important,
          created_at,
          users(
            user_type,
            profile_picture,
            students(id, first_name, last_name, id_number),
            coordinators!coordinators_user_id_fkey(id, first_name, last_name),
            companies!companies_user_id_fkey(id, company_name)
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (messagesError) {
        throw messagesError;
      }

      const formattedMessages = messages.map(msg => {
        let senderName = 'Unknown';
        let senderUsername = 'unknown';
        
        if (msg.users) {
          if (msg.users.user_type === 'Student' && msg.users.students && msg.users.students.length > 0) {
            const student = msg.users.students[0];
            senderName = `${student.first_name} ${student.last_name}`;
            senderUsername = student.id_number || senderName;
          } else if (msg.users.user_type === 'Coordinator' && msg.users.coordinators && msg.users.coordinators.length > 0) {
            const coordinator = msg.users.coordinators[0];
            senderName = `${coordinator.first_name} ${coordinator.last_name}`;
            senderUsername = `${coordinator.first_name}.${coordinator.last_name}`;
          } else if (msg.users.user_type === 'Company' && msg.users.companies && msg.users.companies.length > 0) {
            const company = msg.users.companies[0];
            senderName = company.company_name;
            senderUsername = company.company_name;
          }
        }

        return {
          id: msg.id.toString(),
          senderId: msg.sender_id.toString(),
          sender: {
            id: msg.sender_id.toString(),
            name: senderName,
            username: senderUsername,
            email: '', // Not available in this query
            profilePicture: msg.users?.profile_picture || '',
            userType: msg.users?.user_type?.toLowerCase() || 'unknown',
            isOnline: false // Not available in this query
          },
          senderUsername: senderUsername,
          senderType: msg.users?.user_type?.toLowerCase() || 'unknown',
          profilePicture: msg.users?.profile_picture || '',
          message: msg.content,
          message_text: msg.content,
          content: msg.content,
          timestamp: formatTimestamp(msg.created_at),
          created_at: msg.created_at,
          isRead: true, // Will be updated based on read receipts
          isImportant: msg.is_important,
          messageType: msg.message_type || 'text'
        };
      }).reverse(); // Reverse to show oldest first

      res.json({
        success: true,
        messages: formattedMessages
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messages'
      });
    }
  }

  // Send message
  async sendMessage(req, res) {
    try {
      const { conversationId } = req.params;
      const { content, messageType = 'text', isImportant = false } = req.body;
      const userId = req.user.id;

      console.log('🔍 sendMessage - conversationId:', conversationId);
      console.log('🔍 sendMessage - userId:', userId);
      console.log('🔍 sendMessage - content:', content);
      console.log('🔍 sendMessage - messageType:', messageType);

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      // Verify user is participant in conversation
      const { data: participant, error: participantError } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (participantError || !participant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Insert message
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          message_type: messageType,
          is_important: isImportant
        })
        .select()
        .single();

      if (messageError) {
        throw messageError;
      }

      // Get sender info
      const { data: sender, error: senderError } = await supabase
        .from('users')
        .select(`
          user_type,
          profile_picture,
          students(id, first_name, last_name, id_number),
          coordinators!coordinators_user_id_fkey(id, first_name, last_name),
          companies!companies_user_id_fkey(id, company_name)
        `)
        .eq('id', userId)
        .single();

      if (senderError) {
        throw senderError;
      }

      let senderName = 'Unknown';
      if (sender.user_type === 'Student' && sender.students && sender.students.length > 0) {
        const student = sender.students[0];
        senderName = `${student.first_name} ${student.last_name}`;
      } else if (sender.user_type === 'Coordinator' && sender.coordinators && sender.coordinators.length > 0) {
        const coordinator = sender.coordinators[0];
        senderName = `${coordinator.first_name} ${coordinator.last_name}`;
      } else if (sender.user_type === 'Company' && sender.companies && sender.companies.length > 0) {
        const company = sender.companies[0];
        senderName = company.company_name;
      }

      const message = {
        id: newMessage.id.toString(),
        senderId: userId.toString(),
        sender: senderName,
        senderType: sender.user_type.toLowerCase(),
        profilePicture: sender.profile_picture,
        message: content.trim(),
        timestamp: formatTimestamp(newMessage.created_at),
        isRead: false,
        isImportant,
        messageType
      };
      // Get all participants in the conversation (except the sender)
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('is_active', true)
        .neq('user_id', userId);

      // Send push notifications to all participants (only for unread messages)
      if (!participantsError && participants && participants.length > 0) {
        const participantIds = participants.map(p => p.user_id);
        
        // Send push notification to each participant asynchronously (don't wait)
        // Use Promise.allSettled to handle all notifications without blocking
        Promise.allSettled(
          participantIds.map(async (participantId) => {
            try {
              await pushNotificationService.sendPushNotification(
                participantId,
                `New message from ${senderName}`,
                content.length > 100 ? content.substring(0, 100) + '...' : content,
                {
                  type: 'message',
                  conversationId: conversationId,
                  senderId: userId.toString(),
                  senderName: senderName
                },
                true // onlyIfUnread = true - only send if user has unread messages
              );
            } catch (pushError) {
              console.error(`Error sending push notification to user ${participantId}:`, pushError);
              // Don't fail the message send if push notification fails
            }
          })
        ).catch(error => {
          console.error('Error in push notification batch:', error);
          // Don't fail the message send if push notification fails
        });
      }
      res.json({
        success: true,
        message
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  }

  // Mark messages as read
  async markAsRead(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      // First, get all read message IDs for this user
      const { data: readReceipts, error: receiptsError } = await supabase
        .from('message_read_receipts')
        .select('message_id')
        .eq('user_id', userId);

      if (receiptsError) {
        throw receiptsError;
      }

      const readMessageIds = readReceipts ? readReceipts.map(r => r.message_id) : [];

      // Get all messages in this conversation from other users
      const { data: allMessages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);

      if (messagesError) {
        throw messagesError;
      }

      // Filter out already read messages
      const unreadMessages = allMessages ? 
        allMessages.filter(msg => !readMessageIds.includes(msg.id)) : [];

      // Create read receipts for unread messages
      if (unreadMessages.length > 0) {
        const newReadReceipts = unreadMessages.map(msg => ({
          message_id: msg.id,
          user_id: userId
        }));

        const { error: insertError } = await supabase
          .from('message_read_receipts')
          .insert(newReadReceipts);

        if (insertError) {
          throw insertError;
        }
      }

      // Update conversation participant's last_read_at
      const { error: updateError } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      res.json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read'
      });
    }
  }

  // Helper function to format timestamp
  formatTimestamp(timestamp) {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
      return messageTime.toLocaleDateString();
    }
  }

  // Update group avatar
  async updateGroupAvatar(req, res) {
    try {
      const { conversationId } = req.params;
      const { avatarUrl } = req.body;
      const userId = req.user.id;

      if (!avatarUrl) {
        return res.status(400).json({
          success: false,
          message: 'Avatar URL is required'
        });
      }

      // Verify user is participant in conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          conversation_participants(user_id)
        `)
        .eq('id', conversationId)
        .eq('type', 'group')
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: 'Group conversation not found'
        });
      }

      // Check if user is participant
      const isParticipant = conversation.conversation_participants.some(
        p => p.user_id === userId
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant in this group'
        });
      }

      // Update group avatar
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ avatar_url: avatarUrl })
        .eq('id', conversationId);

      if (updateError) {
        throw updateError;
      }

      res.json({
        success: true,
        message: 'Group avatar updated successfully'
      });
    } catch (error) {
      console.error('Error updating group avatar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update group avatar'
      });
    }
  }

  // Delete conversation
  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      
      console.log('🔍 DELETE CONVERSATION - conversationId:', conversationId);
      console.log('🔍 DELETE CONVERSATION - userId:', userId);

      // Verify user is participant in conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          conversation_participants(user_id)
        `)
        .eq('id', conversationId)
        .single();

      console.log('🔍 DELETE CONVERSATION - conversation query result:', conversation);
      console.log('🔍 DELETE CONVERSATION - convError:', convError);

      if (convError || !conversation) {
        console.log('🔍 DELETE CONVERSATION - Conversation not found');
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Check if user is participant
      const isParticipant = conversation.conversation_participants.some(
        p => p.user_id === userId
      );

      console.log('🔍 DELETE CONVERSATION - isParticipant:', isParticipant);
      console.log('🔍 DELETE CONVERSATION - participants:', conversation.conversation_participants);

      if (!isParticipant) {
        console.log('🔍 DELETE CONVERSATION - User not participant');
        return res.status(403).json({
          success: false,
          message: 'You are not a participant in this conversation'
        });
      }

      // Delete conversation (this will cascade delete participants and messages)
      console.log('🔍 DELETE CONVERSATION - Attempting to delete conversation:', conversationId);
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      console.log('🔍 DELETE CONVERSATION - deleteError:', deleteError);

      if (deleteError) {
        console.log('🔍 DELETE CONVERSATION - Delete error occurred:', deleteError);
        throw deleteError;
      }

      console.log('🔍 DELETE CONVERSATION - Successfully deleted conversation');
      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete conversation'
      });
    }
  }

  // Add member to group
  async addMemberToGroup(req, res) {
    try {
      const { conversationId } = req.params;
      const { memberId } = req.body;
      const userId = req.user.id;

      console.log('🔍 ADD MEMBER TO GROUP - conversationId:', conversationId);
      console.log('🔍 ADD MEMBER TO GROUP - memberId:', memberId);
      console.log('🔍 ADD MEMBER TO GROUP - userId:', userId);

      // Check if conversation exists and is a group
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (conversation.type !== 'group') {
        return res.status(400).json({
          success: false,
          message: 'Can only add members to group conversations'
        });
      }

      // Check if user is a participant in the group
      const { data: participant, error: participantError } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (participantError || !participant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      // Check if member is already in the group
      const { data: existingMember, error: existingError } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', memberId)
        .single();

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'User is already a member of this group'
        });
      }

      // Add member to group
      const { error: addError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: memberId,
          joined_at: new Date().toISOString()
        });

      if (addError) {
        console.error('Error adding member to group:', addError);
        return res.status(500).json({
          success: false,
          message: 'Failed to add member to group'
        });
      }

      console.log('🔍 ADD MEMBER TO GROUP - Successfully added member');
      res.json({
        success: true,
        message: 'Member added to group successfully'
      });
    } catch (error) {
      console.error('Error adding member to group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add member to group'
      });
    }
  }

  // Update group name
  async updateGroupName(req, res) {
    try {
      const { conversationId } = req.params;
      const { name } = req.body;
      const userId = req.user.id;

      console.log('🔍 UPDATE GROUP NAME - conversationId:', conversationId);
      console.log('🔍 UPDATE GROUP NAME - name:', name);
      console.log('🔍 UPDATE GROUP NAME - userId:', userId);

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Group name is required'
        });
      }

      // Check if conversation exists and is a group
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (conversation.type !== 'group') {
        return res.status(400).json({
          success: false,
          message: 'Can only update names for group conversations'
        });
      }

      // Check if user is a participant in the group
      const { data: participant, error: participantError } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (participantError || !participant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      // Update group name
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ name: name.trim() })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Error updating group name:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update group name'
        });
      }

      console.log('🔍 UPDATE GROUP NAME - Successfully updated group name');
      res.json({
        success: true,
        message: 'Group name updated successfully'
      });
    } catch (error) {
      console.error('Error updating group name:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update group name'
      });
    }
  }
}

module.exports = new MessagingController();