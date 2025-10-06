const { query } = require('./config/database');

async function fixMessagingFunctions() {
  try {
    console.log('🔧 Fixing messaging functions...');
    
    // Drop existing functions that might have different signatures
    const dropStatements = [
      'DROP FUNCTION IF EXISTS get_user_conversations(BIGINT) CASCADE;',
      'DROP FUNCTION IF EXISTS create_direct_conversation(BIGINT, BIGINT) CASCADE;',
      'DROP FUNCTION IF EXISTS create_group_conversation(BIGINT, VARCHAR(255), BIGINT[]) CASCADE;',
      'DROP FUNCTION IF EXISTS mark_messages_as_read(BIGINT, BIGINT) CASCADE;',
      'DROP FUNCTION IF EXISTS update_conversation_updated_at() CASCADE;'
    ];
    
    for (const statement of dropStatements) {
      try {
        console.log(`🗑️  Dropping: ${statement}`);
        await query(statement);
        console.log(`✅ Dropped successfully`);
      } catch (error) {
        console.log(`⚠️  Drop skipped: ${error.message.split('\n')[0]}`);
      }
    }
    
    // Now create the functions fresh
    console.log('🔄 Creating fresh functions...');
    
    // Create update_conversation_updated_at function
    const updateFunction = `
      CREATE OR REPLACE FUNCTION update_conversation_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          UPDATE conversations 
          SET updated_at = CURRENT_TIMESTAMP 
          WHERE id = NEW.conversation_id;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await query(updateFunction);
    console.log('✅ update_conversation_updated_at function created');
    
    // Create create_direct_conversation function
    const directConversationFunction = `
      CREATE OR REPLACE FUNCTION create_direct_conversation(user1_id BIGINT, user2_id BIGINT)
      RETURNS BIGINT AS $$
      DECLARE
          conversation_id BIGINT;
          existing_conversation_id BIGINT;
      BEGIN
          -- Check if conversation already exists
          SELECT c.id INTO existing_conversation_id
          FROM conversations c
          JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
          JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
          WHERE c.type = 'direct'
          AND cp1.user_id = user1_id
          AND cp2.user_id = user2_id
          AND cp1.is_active = TRUE
          AND cp2.is_active = TRUE;
          
          IF existing_conversation_id IS NOT NULL THEN
              RETURN existing_conversation_id;
          END IF;
          
          -- Create new conversation
          INSERT INTO conversations (type, created_by)
          VALUES ('direct', user1_id)
          RETURNING id INTO conversation_id;
          
          -- Add both users as participants
          INSERT INTO conversation_participants (conversation_id, user_id)
          VALUES (conversation_id, user1_id), (conversation_id, user2_id);
          
          RETURN conversation_id;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await query(directConversationFunction);
    console.log('✅ create_direct_conversation function created');
    
    // Create create_group_conversation function
    const groupConversationFunction = `
      CREATE OR REPLACE FUNCTION create_group_conversation(
          creator_id BIGINT,
          group_name VARCHAR(255),
          participant_ids BIGINT[]
      )
      RETURNS BIGINT AS $$
      DECLARE
          conversation_id BIGINT;
          participant_id BIGINT;
      BEGIN
          -- Create new group conversation
          INSERT INTO conversations (type, name, created_by)
          VALUES ('group', group_name, creator_id)
          RETURNING id INTO conversation_id;
          
          -- Add creator as participant
          INSERT INTO conversation_participants (conversation_id, user_id)
          VALUES (conversation_id, creator_id);
          
          -- Add all other participants
          FOREACH participant_id IN ARRAY participant_ids
          LOOP
              INSERT INTO conversation_participants (conversation_id, user_id)
              VALUES (conversation_id, participant_id);
          END LOOP;
          
          RETURN conversation_id;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await query(groupConversationFunction);
    console.log('✅ create_group_conversation function created');
    
    // Create get_user_conversations function
    const getUserConversationsFunction = `
      CREATE OR REPLACE FUNCTION get_user_conversations(user_id BIGINT)
      RETURNS TABLE (
          conversation_id BIGINT,
          conversation_type VARCHAR(20),
          conversation_name VARCHAR(255),
          last_message_content TEXT,
          last_message_sender_id BIGINT,
          last_message_created_at TIMESTAMP,
          unread_count BIGINT,
          updated_at TIMESTAMP
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              c.id as conversation_id,
              c.type as conversation_type,
              c.name as conversation_name,
              m.content as last_message_content,
              m.sender_id as last_message_sender_id,
              m.created_at as last_message_created_at,
              COALESCE(unread.unread_count, 0) as unread_count,
              c.updated_at
          FROM conversations c
          JOIN conversation_participants cp ON c.id = cp.conversation_id
          LEFT JOIN LATERAL (
              SELECT content, sender_id, created_at
              FROM messages
              WHERE conversation_id = c.id
              ORDER BY created_at DESC
              LIMIT 1
          ) m ON TRUE
          LEFT JOIN LATERAL (
              SELECT COUNT(*) as unread_count
              FROM messages msg
              WHERE msg.conversation_id = c.id
              AND msg.sender_id != user_id
              AND NOT EXISTS (
                  SELECT 1 FROM message_read_receipts mrr
                  WHERE mrr.message_id = msg.id AND mrr.user_id = user_id
              )
          ) unread ON TRUE
          WHERE cp.user_id = user_id
          AND cp.is_active = TRUE
          ORDER BY c.updated_at DESC;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await query(getUserConversationsFunction);
    console.log('✅ get_user_conversations function created');
    
    // Create mark_messages_as_read function
    const markAsReadFunction = `
      CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id BIGINT, user_id BIGINT)
      RETURNS VOID AS $$
      BEGIN
          -- Insert read receipts for all unread messages in the conversation
          INSERT INTO message_read_receipts (message_id, user_id)
          SELECT m.id, user_id
          FROM messages m
          WHERE m.conversation_id = conversation_id
          AND m.sender_id != user_id
          AND NOT EXISTS (
              SELECT 1 FROM message_read_receipts mrr
              WHERE mrr.message_id = m.id AND mrr.user_id = user_id
          );
          
          -- Update conversation participant's last_read_at
          UPDATE conversation_participants
          SET last_read_at = CURRENT_TIMESTAMP
          WHERE conversation_participants.conversation_id = conversation_id
          AND conversation_participants.user_id = user_id;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await query(markAsReadFunction);
    console.log('✅ mark_messages_as_read function created');
    
    // Recreate the trigger
    const triggerStatement = `
      DROP TRIGGER IF EXISTS trigger_update_conversation_updated_at ON messages;
      CREATE TRIGGER trigger_update_conversation_updated_at
          AFTER INSERT ON messages
          FOR EACH ROW
          EXECUTE FUNCTION update_conversation_updated_at();
    `;
    
    await query(triggerStatement);
    console.log('✅ Trigger recreated');
    
    console.log('🎉 All messaging functions fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing functions:', error);
    process.exit(1);
  }
}

// Run the fix
fixMessagingFunctions();
