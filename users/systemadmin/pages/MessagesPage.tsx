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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  sender: string;
  senderType: 'intern' | 'coordinator' | 'company' | 'admin';
  subject: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [searchQuery, selectedFilter, messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockMessages: Message[] = [
        {
          id: '1',
          sender: 'John Doe',
          senderType: 'intern',
          subject: 'Internship Application Status',
          message: 'Hi, I would like to know the status of my internship application...',
          timestamp: '2024-01-15 10:30',
          isRead: false,
          priority: 'high',
        },
        {
          id: '2',
          sender: 'TechCorp HR',
          senderType: 'company',
          subject: 'MOA Renewal Request',
          message: 'We would like to renew our Memorandum of Agreement...',
          timestamp: '2024-01-14 14:20',
          isRead: true,
          priority: 'medium',
        },
        {
          id: '3',
          sender: 'Dr. Sarah Johnson',
          senderType: 'coordinator',
          subject: 'Intern Performance Report',
          message: 'Please find attached the monthly performance report...',
          timestamp: '2024-01-13 09:15',
          isRead: true,
          priority: 'low',
        },
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = messages;

    if (searchQuery) {
      filtered = filtered.filter(msg =>
        msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(msg => msg.senderType === selectedFilter);
    }

    setFilteredMessages(filtered);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ea4335';
      case 'medium': return '#fbbc04';
      case 'low': return '#34a853';
      default: return '#666';
    }
  };

  const getSenderTypeColor = (type: string) => {
    switch (type) {
      case 'intern': return '#4285f4';
      case 'coordinator': return '#34a853';
      case 'company': return '#fbbc04';
      case 'admin': return '#9c27b0';
      default: return '#666';
    }
  };

  const MessageCard = ({ message }: { message: Message }) => (
    <TouchableOpacity style={[styles.messageCard, !message.isRead && styles.unreadMessage]}>
      <View style={styles.messageHeader}>
        <View style={styles.senderInfo}>
          <View style={[styles.senderTypeBadge, { backgroundColor: getSenderTypeColor(message.senderType) }]}>
            <Text style={styles.senderTypeText}>{message.senderType.toUpperCase()}</Text>
          </View>
          <Text style={styles.senderName}>{message.sender}</Text>
        </View>
        <View style={styles.messageMeta}>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(message.priority) }]} />
          <Text style={styles.timestamp}>{message.timestamp}</Text>
        </View>
      </View>
      
      <Text style={styles.subject}>{message.subject}</Text>
      <Text style={styles.messagePreview} numberOfLines={2}>
        {message.message}
      </Text>
      
      <View style={styles.messageActions}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="reply" size={16} color="#4285f4" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="forward" size={16} color="#666" />
          <Text style={styles.actionText}>Forward</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="archive" size={16} color="#666" />
          <Text style={styles.actionText}>Archive</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.composeButton}>
          <MaterialIcons name="edit" size={20} color="#fff" />
          <Text style={styles.composeButtonText}>Compose</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'intern', 'coordinator', 'company', 'admin'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.activeFilterChip
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter && styles.activeFilterChipText
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages List */}
      <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
        {filteredMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="message" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No messages found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No messages available at the moment'
              }
            </Text>
          </View>
        ) : (
          filteredMessages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  composeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  composeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  activeFilterChip: {
    backgroundColor: '#4285f4',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  messagesList: {
    flex: 1,
    padding: 20,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unreadMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#4285f4',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  senderTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  subject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});
