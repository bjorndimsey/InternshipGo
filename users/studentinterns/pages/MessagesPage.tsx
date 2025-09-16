import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  sender: string;
  senderType: 'company' | 'coordinator' | 'system';
  profilePicture?: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isImportant: boolean;
}

interface Conversation {
  id: string;
  participant: string;
  participantType: 'company' | 'coordinator' | 'system';
  profilePicture?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockConversations: Conversation[] = [
        {
          id: '1',
          participant: 'TechCorp Solutions',
          participantType: 'company',
          lastMessage: 'Thank you for your application! We would like to schedule an interview.',
          timestamp: '2 hours ago',
          unreadCount: 2,
          isOnline: true,
        },
        {
          id: '2',
          participant: 'Dr. Sarah Johnson',
          participantType: 'coordinator',
          lastMessage: 'Your internship application has been approved.',
          timestamp: '1 day ago',
          unreadCount: 0,
          isOnline: false,
        },
        {
          id: '3',
          participant: 'DataFlow Inc',
          participantType: 'company',
          lastMessage: 'Welcome to our team! Please complete the onboarding process.',
          timestamp: '3 days ago',
          unreadCount: 1,
          isOnline: true,
        },
        {
          id: '4',
          participant: 'System Notifications',
          participantType: 'system',
          lastMessage: 'New internship opportunities available in your field.',
          timestamp: '1 week ago',
          unreadCount: 0,
          isOnline: false,
        },
      ];
      
      setConversations(mockConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const mockMessages: Message[] = [
        {
          id: '1',
          sender: 'TechCorp Solutions',
          senderType: 'company',
          message: 'Hello! Thank you for your interest in our internship program.',
          timestamp: '2 hours ago',
          isRead: true,
          isImportant: false,
        },
        {
          id: '2',
          sender: 'You',
          senderType: 'company',
          message: 'Thank you! I am very excited about this opportunity.',
          timestamp: '1 hour ago',
          isRead: true,
          isImportant: false,
        },
        {
          id: '3',
          sender: 'TechCorp Solutions',
          senderType: 'company',
          message: 'We would like to schedule an interview with you. Are you available this Friday at 2 PM?',
          timestamp: '30 minutes ago',
          isRead: false,
          isImportant: true,
        },
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: 'You',
        senderType: 'company',
        message: newMessage.trim(),
        timestamp: 'Just now',
        isRead: true,
        isImportant: false,
      };
      
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const getParticipantIcon = (type: string) => {
    switch (type) {
      case 'company': return 'business-center';
      case 'coordinator': return 'person';
      case 'system': return 'notifications';
      default: return 'person';
    }
  };

  const getParticipantColor = (type: string) => {
    switch (type) {
      case 'company': return '#4285f4';
      case 'coordinator': return '#34a853';
      case 'system': return '#fbbc04';
      default: return '#666';
    }
  };

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        selectedConversation === conversation.id && styles.selectedConversation
      ]}
      onPress={() => handleConversationSelect(conversation.id)}
    >
      <View style={styles.conversationHeader}>
        <View style={styles.profileContainer}>
          {conversation.profilePicture ? (
            <Image source={{ uri: conversation.profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profilePlaceholder, { backgroundColor: getParticipantColor(conversation.participantType) }]}>
              <MaterialIcons 
                name={getParticipantIcon(conversation.participantType)} 
                size={24} 
                color="#fff" 
              />
            </View>
          )}
          {conversation.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.conversationInfo}>
          <Text style={styles.participantName}>{conversation.participant}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {conversation.lastMessage}
          </Text>
        </View>
        <View style={styles.conversationMeta}>
          <Text style={styles.timestamp}>{conversation.timestamp}</Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const MessageItem = ({ message }: { message: Message }) => (
    <View style={[
      styles.messageItem,
      message.sender === 'You' ? styles.sentMessage : styles.receivedMessage
    ]}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageSender}>{message.sender}</Text>
        <Text style={styles.messageTime}>{message.timestamp}</Text>
        {message.isImportant && (
          <MaterialIcons name="priority-high" size={16} color="#ea4335" />
        )}
      </View>
      <Text style={styles.messageText}>{message.message}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!selectedConversation ? (
        // Conversations List
        <View style={styles.conversationsContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              {conversations.length} conversations
            </Text>
          </View>

          <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
            {conversations.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))}
          </ScrollView>
        </View>
      ) : (
        // Messages View
        <View style={styles.messagesContainer}>
          <View style={styles.messagesHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedConversation(null)}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.messagesHeaderTitle}>
              {conversations.find(c => c.id === selectedConversation)?.participant}
            </Text>
            <TouchableOpacity style={styles.moreButton}>
              <MaterialIcons name="more-vert" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </ScrollView>

          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
            >
              <MaterialIcons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  conversationsContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedConversation: {
    backgroundColor: '#e3f2fd',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34a853',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#ea4335',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesHeader: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  messagesHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  moreButton: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageItem: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginRight: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1a1a2e',
    lineHeight: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
    color: '#1a1a2e',
  },
  sendButton: {
    backgroundColor: '#4285f4',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
