-- Clean messaging system schema for Supabase
-- This version only creates the schema without sample data

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    name VARCHAR(255), -- For group chats, NULL for direct messages
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversation participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system', 'image', 'file')),
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Message read receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(message_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active ON conversation_participants(is_active);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON message_read_receipts(user_id);

-- Function to update conversation updated_at when a message is added
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update conversation updated_at
DROP TRIGGER IF EXISTS trigger_update_conversation_updated_at ON messages;
CREATE TRIGGER trigger_update_conversation_updated_at
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_direct_conversation(BIGINT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS create_group_conversation(BIGINT, VARCHAR(255), BIGINT[]) CASCADE;
DROP FUNCTION IF EXISTS get_user_conversations(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS mark_messages_as_read(BIGINT, BIGINT) CASCADE;

-- Function to create a direct conversation between two users
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

-- Function to create a group conversation
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

-- Function to get user conversations with last message
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

-- Function to mark messages as read
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
