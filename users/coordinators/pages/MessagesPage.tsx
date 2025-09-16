import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  sender: string;
  senderType: 'student' | 'company' | 'admin' | 'system';
  profilePicture?: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isImportant: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface Conversation {
  id: string;
  participant: string;
  participantType: 'student' | 'company' | 'admin' | 'system';
  profilePicture?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  priority: 'low' | 'medium' | 'high';
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high-priority'>('all');

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
          participant: 'John Doe',
          participantType: 'student',
          lastMessage: 'I have a question about my internship requirements.',
          timestamp: '2 hours ago',
          unreadCount: 2,
          isOnline: true,
          priority: 'medium',
        },
        {
          id: '2',
          participant: 'TechCorp Solutions',
          participantType: 'company',
          lastMessage: 'We would like to schedule a meeting to discuss the new internship program.',
          timestamp: '1 day ago',
          unreadCount: 0,
          isOnline: false,
          priority: 'high',
        },
        {
          id: '3',
          participant: 'Sarah Wilson',
          participantType: 'student',
          lastMessage: 'Thank you for approving my application!',
          timestamp: '3 days ago',
          unreadCount: 0,
          isOnline: false,
          priority: 'low',
        },
        {
          id: '4',
          participant: 'DataFlow Inc',
          participantType: 'company',
          lastMessage: 'The internship orientation is scheduled for next Monday.',
          timestamp: '1 week ago',
          unreadCount: 1,
          isOnline: true,
          priority: 'medium',
        },
        {
          id: '5',
          participant: 'System Notifications',
          participantType: 'system',
          lastMessage: 'New internship applications require your review.',
          timestamp: '1 week ago',
          unreadCount: 0,
          isOnline: false,
          priority: 'high',
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
          sender: 'John Doe',
          senderType: 'student',
          message: 'Hello, I have a question about my internship requirements.',
          timestamp: '2 hours ago',
          isRead: true,
          isImportant: false,
          priority: 'medium',
        },
        {
          id: '2',
          sender: 'You',
          senderType: 'admin',
          message: 'Hi John! What specific requirements are you asking about?',
          timestamp: '1 hour ago',
          isRead: true,
          isImportant: false,
          priority: 'medium',
        },
        {
          id: '3',
          sender: 'John Doe',
          senderType: 'student',
          message: 'I need to know if I need to submit my medical clearance before starting.',
          timestamp: '30 minutes ago',
          isRead: false,
          isImportant: true,
          priority: 'high',
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
        senderType: 'admin',
        message: newMessage.trim(),
        timestamp: 'Just now',
        isRead: true,
        isImportant: false,
        priority: 'medium',
      };
      
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const handleMarkAsRead = (conversationId: string) => {
    setConversations(conversations.map(conv =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    ));
  };

  const getFilteredConversations = () => {
    switch (filter) {
      case 'unread':
        return conversations.filter(c => c.unreadCount > 0);
      case 'high-priority':
        return conversations.filter(c => c.priority === 'high');
      default:
        return conversations;
    }
  };

  const getParticipantIcon = (type: string) => {
    switch (type) {
      case 'student': return 'school';
      case 'company': return 'business-center';
      case 'admin': return 'admin-panel-settings';
      case 'system': return 'notifications';
      default: return 'person';
    }
  };

  const getParticipantColor = (type: string) => {
    switch (type) {
      case 'student': return '#4285f4';
      case 'company': return '#34a853';
      case 'admin': return '#fbbc04';
      case 'system': return '#ea4335';
      default: return '#666';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ea4335';
      case 'medium': return '#fbbc04';
      case 'low': return '#34a853';
      default: return '#666';
    }
  };

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        selectedConversation === conversation.id && styles.selectedConversation
      ]}
      onPress={() => {
        handleConversationSelect(conversation.id);
        handleMarkAsRead(conversation.id);
      }}
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
          <View style={styles.conversationTitleRow}>
            <Text style={styles.participantName}>{conversation.participant}</Text>
            <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(conversation.priority) }]} />
          </View>
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

  const filteredConversations = getFilteredConversations();

  return (
    <View style={styles.container}>
      {!selectedConversation ? (
        // Conversations List
        <View style={styles.conversationsContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              {conversations.filter(c => c.unreadCount > 0).length} unread messages
            </Text>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                  All ({conversations.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
                onPress={() => setFilter('unread')}
              >
                <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
                  Unread ({conversations.filter(c => c.unreadCount > 0).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'high-priority' && styles.activeFilterTab]}
                onPress={() => setFilter('high-priority')}
              >
                <Text style={[styles.filterText, filter === 'high-priority' && styles.activeFilterText]}>
                  High Priority ({conversations.filter(c => c.priority === 'high').length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
            {filteredConversations.map((conversation) => (
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
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  activeFilterTab: {
    backgroundColor: '#4285f4',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
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
  conversationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
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
