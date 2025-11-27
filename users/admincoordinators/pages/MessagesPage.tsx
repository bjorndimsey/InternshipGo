import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import { CloudinaryService } from '../../../lib/cloudinaryService';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

interface MessagesPageProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    picture?: string;
    user_type: string;
  } | null;
  onUnreadCountChange?: (count: number) => void;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  profilePicture: string;
  userType: 'student' | 'company' | 'coordinator' | 'system';
  isOnline: boolean;
}

interface Message {
  id: string;
  conversation_id?: string;
  sender_id?: string;
  senderId?: string;
  message_text?: string;
  message?: string;
  content?: string;
  created_at?: string;
  timestamp?: string;
  message_type?: string;
  messageType?: string;
  sender?: User;
  isOptimistic?: boolean;
}

interface Conversation {
  id: string;
  name?: string;
  type?: string;
  is_group?: boolean;
  avatar_url?: string;
  last_message?: Message;
  lastMessage?: Message;
  participants?: Array<{
    id?: string;
    user_id?: string;
    user?: User;
    name?: string;
  profilePicture?: string;
    isActive?: boolean;
  }>;
  created_at?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

// Memoized Search Input Component
const SearchInput = memo(({ 
  value, 
  onChangeText, 
  onClear,
  placeholder = "Search users...",
  isLoading = false
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  isLoading?: boolean;
}) => {
  return (
    <View style={styles.searchInputContainer}>
      <MaterialIcons name="search" size={20} color="#F56E0F" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#878787"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        selectionColor="#4285f4"
      />
      {isLoading ? (
        <ActivityIndicator size="small" color="#4285f4" style={styles.searchButton} />
      ) : value.length > 0 ? (
        <TouchableOpacity onPress={onClear} style={styles.searchButton}>
          <MaterialIcons name="clear" size={20} color="#999" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

export default function MessagesPage({ currentUser, onUnreadCountChange }: MessagesPageProps) {
  console.log('🔍 Coordinators MessagesPage - currentUser:', currentUser);

  // Safety check for currentUser
  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  // Get the correct user ID
  const getEffectiveUserId = () => {
    if (currentUser?.id === '3') {
      return '19';
    }
    return currentUser?.id || '19';
  };
  
  const effectiveUserId = getEffectiveUserId();

  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high-priority'>('all');

  // Message caching for performance
  const [messageCache, setMessageCache] = useState<Record<string, Message[]>>({});
  const [lastFetchTime, setLastFetchTime] = useState<Record<string, number>>({});

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Group chat functionality
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<User[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<User[]>([]);
  
  // Group members modal
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  
  // Group avatar state
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Starting conversation state
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  
  // Group chat menu state
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  
  // Direct message menu state
  const [showDirectMessageMenu, setShowDirectMessageMenu] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Add member and edit name modals
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');
  const [addMemberSearchResults, setAddMemberSearchResults] = useState<User[]>([]);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  // Skeleton loading state
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const fetchConversations = useCallback(async () => {
    if (!effectiveUserId) {
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      setShowSkeleton(true);
      const response = await apiService.getConversations(effectiveUserId);

      if (response.success && response.conversations) {
        setConversations(response.conversations);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  }, [effectiveUserId]);

  // Fetch conversations on mount with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
    fetchConversations();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [fetchConversations]);

  // Page load animations
  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Shimmer animation for skeleton loading
  useEffect(() => {
    if (showSkeleton) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [showSkeleton]);

  const fetchMessages = async (conversationId: string) => {
    if (!currentUser || !currentUser.id) {
      setMessages([]);
      return;
    }

    console.log('🔍 Fetching messages for conversation:', conversationId);

    // Check cache first (1 minute cache for better real-time updates)
    const now = Date.now();
    const cacheTime = lastFetchTime[conversationId] || 0;
    const isCacheValid = (now - cacheTime) < 1 * 60 * 1000; // 1 minute

    try {
      setLoading(true);
      console.log('🔍 Making API call to fetch messages...');
      const response = await apiService.getMessages(effectiveUserId, conversationId);
      
      console.log('🔍 API response:', response);
      
      if (response.success && response.messages) {
        console.log('🔍 Setting messages:', response.messages.length);
        // Sort messages by timestamp (oldest first)
        const sortedMessages = response.messages.sort((a: Message, b: Message) => {
          const timeA = new Date(a.created_at || a.timestamp || new Date()).getTime();
          const timeB = new Date(b.created_at || b.timestamp || new Date()).getTime();
          
          // Handle invalid dates
          if (isNaN(timeA) && isNaN(timeB)) return 0;
          if (isNaN(timeA)) return 1;
          if (isNaN(timeB)) return -1;
          
          return timeA - timeB;
        });
        setMessages(sortedMessages);
        // Cache the messages
        setMessageCache(prev => ({ ...prev, [conversationId]: sortedMessages }));
        setLastFetchTime(prev => ({ ...prev, [conversationId]: now }));
      } else {
        console.log('🔍 No messages found or API error');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (query: string = searchQuery) => {
    if (!currentUser || !currentUser.id || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await apiService.searchUsers(effectiveUserId, query);
      
      if (response.success && response.users) {
        setSearchResults(response.users);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser, effectiveUserId, searchQuery]);

  // Debounced search effect for autocomplete
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  const handleGroupSearch = useCallback(async (query: string = groupSearchQuery) => {
    if (!currentUser || !currentUser.id || query.trim().length < 2) {
      setGroupSearchResults([]);
      return;
    }

    try {
      const response = await apiService.searchUsers(effectiveUserId, query);
      if (response.success && response.users) {
        const filteredUsers = response.users.filter((user: User) =>
          user.userType !== 'system' &&
          user.id !== effectiveUserId &&
          !selectedGroupMembers.some(member => member.id === user.id)
        );
        setGroupSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error('Error searching users for group:', error);
      setGroupSearchResults([]);
    }
  }, [currentUser, effectiveUserId, groupSearchQuery, selectedGroupMembers]);

  const handleAddMemberSearch = useCallback(async (query: string = addMemberSearchQuery) => {
    if (!currentUser || !currentUser.id || query.trim().length < 2) {
      setAddMemberSearchResults([]);
      return;
    }

    try {
      const response = await apiService.searchUsers(effectiveUserId, query);
      if (response.success && response.users) {
        // Filter out users who are already in the group
        const currentParticipantIds = selectedConversation?.participants?.map(p => p.user_id || p.id) || [];
        const filteredUsers = response.users.filter((user: User) =>
          user.userType !== 'system' &&
          user.id !== effectiveUserId &&
          !currentParticipantIds.includes(user.id)
        );
        setAddMemberSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error('Error searching users for adding to group:', error);
      setAddMemberSearchResults([]);
    }
  }, [currentUser, effectiveUserId, addMemberSearchQuery, selectedConversation]);

  // Debounced group search effect for autocomplete
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (groupSearchQuery.trim().length >= 2) {
        handleGroupSearch(groupSearchQuery);
      } else {
        setGroupSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [groupSearchQuery, handleGroupSearch]);

  // Debounced add member search effect for autocomplete
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addMemberSearchQuery.trim().length >= 2) {
        handleAddMemberSearch(addMemberSearchQuery);
      } else {
        setAddMemberSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [addMemberSearchQuery, handleAddMemberSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setIsSearching(false);
  }, []);

  const hideSearchResults = useCallback(() => {
    setShowSearchResults(false);
  }, []);

  const clearGroupSearch = useCallback(() => {
    setGroupSearchQuery('');
    setGroupSearchResults([]);
  }, []);

  const pickGroupAvatar = useCallback(async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 Selected image asset:', asset);
        setGroupAvatar(asset.uri);
        
        // Convert the asset to a proper File object for Cloudinary
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const file = new File([blob], `group_avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        console.log('📁 Created file object:', file);
        setGroupAvatarFile(file);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const startDirectMessage = useCallback(async (user: User) => {
    if (!currentUser || !currentUser.id) {
      Alert.alert('Error', 'You must be logged in to start a conversation');
      return;
    }

    setIsStartingConversation(true);
    try {
      const response = await apiService.createDirectConversation(effectiveUserId, user.id);
      
      if (response.success && response.conversationId) {
        // Find the created conversation in the list or create a temporary one
        const newConversation: Conversation = {
          id: response.conversationId,
          type: 'direct',
          participants: [
            {
              id: effectiveUserId,
              user_id: effectiveUserId,
              user: {
                id: effectiveUserId,
                name: currentUser.name,
                username: currentUser.email.split('@')[0],
                email: currentUser.email,
                profilePicture: currentUser.picture || '',
                userType: currentUser.user_type.toLowerCase() as any,
                isOnline: true
              },
              isActive: true
            },
            {
              id: user.id,
              user_id: user.id,
              user: user,
              isActive: true
            }
          ]
        };
        
        setSelectedConversation(newConversation);
        setShowSearchResults(false);
        setSearchQuery('');
        
        // Refresh conversations to include the new one
        await fetchConversations();
      } else {
        Alert.alert('Error', 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error starting direct message:', error);
      Alert.alert('Error', 'Failed to start conversation');
    } finally {
      setIsStartingConversation(false);
    }
  }, [currentUser, effectiveUserId, fetchConversations]);

  const createGroupChat = useCallback(async () => {
    if (!currentUser || !currentUser.id || selectedGroupMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member for the group');
      return;
    }

    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      let avatarUrl: string | undefined = groupAvatar || undefined;
      
      // Upload avatar if selected
      if (groupAvatarFile) {
        console.log('📤 Uploading group avatar...', groupAvatarFile);
        const uploadResult = await CloudinaryService.uploadGroupAvatar(
          groupAvatarFile, 
          `group_${Date.now()}` // Generate a unique group ID
        );
        console.log('📊 Upload result:', uploadResult);
        if (uploadResult.success) {
          avatarUrl = uploadResult.url;
          console.log('✅ Avatar uploaded successfully:', avatarUrl);
        } else {
          console.error('❌ Avatar upload failed:', uploadResult.error);
          // Continue without avatar instead of showing error
          console.log('⚠️ Continuing group creation without avatar');
        }
      }

      const participantIds = selectedGroupMembers.map(member => member.id);
      const response = await apiService.createGroupConversation(
        effectiveUserId, 
        groupName.trim(), 
        participantIds, 
        avatarUrl || undefined
      );

      if (response.success && response.conversationId) {
        // Create a temporary conversation object
        const newConversation: Conversation = {
          id: response.conversationId,
          type: 'group',
          name: groupName.trim(),
          participants: [
            {
              id: effectiveUserId,
              user_id: effectiveUserId,
              user: {
                id: effectiveUserId,
                name: currentUser.name,
                username: currentUser.email.split('@')[0],
                email: currentUser.email,
                profilePicture: currentUser.picture || '',
                userType: currentUser.user_type.toLowerCase() as any,
                isOnline: true
              },
              isActive: true
            },
            ...selectedGroupMembers.map(member => ({
              id: member.id,
              user_id: member.id,
              user: member,
              isActive: true
            }))
          ]
        };

        setSelectedConversation(newConversation);
        setShowGroupModal(false);
        setGroupName('');
        setSelectedGroupMembers([]);
        setGroupAvatar(null);
        setGroupAvatarFile(null);
        
        // Refresh conversations to include the new one
        await fetchConversations();
      } else {
        Alert.alert('Error', 'Failed to create group chat');
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
      Alert.alert('Error', 'Failed to create group chat');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [currentUser, effectiveUserId, groupName, selectedGroupMembers, groupAvatar, groupAvatarFile, fetchConversations]);

  const handleGroupMenuPress = useCallback(() => {
    console.log('🔍 handleGroupMenuPress - selectedConversation:', selectedConversation);
    console.log('🔍 Conversation type:', selectedConversation?.type);
    console.log('🔍 Is group?', selectedConversation?.type === 'group');
    console.log('🔍 Is direct?', selectedConversation?.type === 'direct');
    console.log('🔍 Conversation is_group:', selectedConversation?.is_group);
    
    // Check both type and is_group properties
    const isGroup = selectedConversation?.type === 'group' || selectedConversation?.is_group === true;
    const isDirect = selectedConversation?.type === 'direct' || selectedConversation?.is_group === false;
    
    console.log('🔍 Final isGroup:', isGroup);
    console.log('🔍 Final isDirect:', isDirect);
    
    if (isGroup) {
      console.log('🔍 Opening group menu');
      setShowGroupMenu(true);
    } else if (isDirect) {
      console.log('🔍 Opening direct message menu');
      setShowDirectMessageMenu(true);
    } else {
      console.log('🔍 Unknown conversation type, opening direct message menu as fallback');
      setShowDirectMessageMenu(true);
    }
  }, [selectedConversation]);

  const handleEditGroupAvatar = useCallback(async () => {
    setShowGroupMenu(false);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 Selected new group avatar:', asset);
        
        // Convert the asset to a proper File object for Cloudinary
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const file = new File([blob], `group_avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        setIsUploadingAvatar(true);
        try {
          const uploadResult = await CloudinaryService.uploadGroupAvatar(
            file, 
            `group_${selectedConversation?.id}_${Date.now()}`
          );
          
          if (uploadResult.success) {
            console.log('✅ Group avatar updated successfully:', uploadResult.url);
            
            // Update group avatar in the database
            if (selectedConversation?.id && uploadResult.url) {
              const updateResult = await apiService.updateGroupAvatar(
                effectiveUserId,
                selectedConversation.id, 
                uploadResult.url
              );
            
              if (updateResult.success) {
                showSuccessModalWithMessage('Group avatar updated successfully!');
                // Refresh conversations to show updated avatar
                await fetchConversations();
              } else {
                console.error('❌ Failed to update group avatar in database:', updateResult.error);
                Alert.alert('Error', 'Avatar uploaded but failed to save. Please try again.');
              }
            }
          } else {
            console.error('❌ Group avatar update failed:', uploadResult.error);
            Alert.alert('Error', 'Failed to update group avatar. Please try again.');
          }
        } catch (error) {
          console.error('Error updating group avatar:', error);
          Alert.alert('Error', 'Failed to update group avatar.');
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [selectedConversation]);

  const handleShowGroupMembers = useCallback(() => {
    setShowGroupMenu(false);
    setShowGroupInfoModal(true);
  }, []);

  const getGroupCreator = useCallback(() => {
    if (!selectedConversation || selectedConversation.type !== 'group') {
      return null;
    }
    
    // Find the creator (usually the first participant or the one with creator role)
    // For now, we'll return the first participant as the creator
    return selectedConversation.participants?.[0]?.user;
  }, [selectedConversation]);

  const showSuccessModalWithMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  }, []);

  const handleAddMemberToGroup = useCallback(async (user: User) => {
    if (!selectedConversation || !currentUser || !currentUser.id) {
      Alert.alert('Error', 'Unable to add member to group');
      return;
    }

    setIsUpdatingGroup(true);
    try {
      // Add member to group via API
      const response = await apiService.addMemberToGroup(effectiveUserId, selectedConversation.id, user.id);
      
      if (response.success) {
        showSuccessModalWithMessage(`${user.name} has been added to the group!`);
        setShowAddMemberModal(false);
        setAddMemberSearchQuery('');
        setAddMemberSearchResults([]);
        
        // Refresh conversations to show updated group
        await fetchConversations();
      } else {
        Alert.alert('Error', 'Failed to add member to group. Please try again.');
      }
    } catch (error) {
      console.error('Error adding member to group:', error);
      Alert.alert('Error', 'Failed to add member to group.');
    } finally {
      setIsUpdatingGroup(false);
    }
  }, [selectedConversation, currentUser, effectiveUserId, showSuccessModalWithMessage, fetchConversations]);

  const handleEditGroupName = useCallback(async () => {
    if (!selectedConversation || !currentUser || !currentUser.id || !newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a valid group name');
      return;
    }

    setIsUpdatingGroup(true);
    try {
      // Update group name via API
      const response = await apiService.updateGroupName(effectiveUserId, selectedConversation.id, newGroupName.trim());
      
      if (response.success) {
        showSuccessModalWithMessage('Group name updated successfully!');
        setShowEditNameModal(false);
        setNewGroupName('');
        
        // Refresh conversations to show updated name
        await fetchConversations();
      } else {
        Alert.alert('Error', 'Failed to update group name. Please try again.');
      }
    } catch (error) {
      console.error('Error updating group name:', error);
      Alert.alert('Error', 'Failed to update group name.');
    } finally {
      setIsUpdatingGroup(false);
    }
  }, [selectedConversation, currentUser, effectiveUserId, newGroupName, showSuccessModalWithMessage, fetchConversations]);

  const handleDeleteConversation = useCallback(async () => {
    console.log('🔍 handleDeleteConversation called');
    console.log('🔍 selectedConversation:', selectedConversation);
    console.log('🔍 effectiveUserId:', effectiveUserId);
    
    if (!selectedConversation) {
      console.log('🔍 No selected conversation, returning');
      return;
    }

    // Close the appropriate menu
    if (selectedConversation.type === 'group') {
      console.log('🔍 Closing group menu');
      setShowGroupMenu(false);
    } else {
      console.log('🔍 Closing direct message menu');
      setShowDirectMessageMenu(false);
    }

    console.log('🔍 Showing delete confirmation alert');
    console.log('🔍 Alert title: Delete Conversation');
    console.log('🔍 Alert message:', `Are you sure you want to delete this ${selectedConversation.type === 'group' ? 'group' : 'conversation'}? This action cannot be undone.`);
    
    // For now, let's skip the alert and go directly to delete to test the API
    console.log('🔍 SKIPPING ALERT - Going directly to delete for testing');
    console.log('🔍 User confirmed delete, calling API');
    try {
      console.log('🔍 Calling apiService.deleteConversation with:');
      console.log('  - effectiveUserId:', effectiveUserId);
      console.log('  - conversationId:', selectedConversation.id);
      console.log('  - conversation type:', selectedConversation.type);
      
      const response = await apiService.deleteConversation(effectiveUserId, selectedConversation.id);
      console.log('🔍 API response:', response);
      console.log('🔍 Response success:', response.success);
      console.log('🔍 Response message:', response.message);
      
      if (response.success) {
        console.log('🔍 Delete successful, showing success modal');
        showSuccessModalWithMessage('Conversation deleted successfully!');
        setSelectedConversation(null);
        await fetchConversations();
      } else {
        console.log('🔍 Delete failed:', response);
        Alert.alert('Error', 'Failed to delete conversation. Please try again.');
      }
    } catch (error) {
      console.error('🔍 Error deleting conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation.');
    }
  }, [selectedConversation, fetchConversations, effectiveUserId, showSuccessModalWithMessage]);

  const handleConversationSelect = async (conversation: Conversation) => {
    console.log('🔍 Selecting conversation:', conversation);
    console.log('🔍 Conversation type from selection:', conversation.type);
    console.log('🔍 Conversation is_group:', conversation.is_group);
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    
    // Mark messages as read when conversation is opened
    if (conversation.id && (conversation.unreadCount || 0) > 0) {
      try {
        await apiService.markMessagesAsRead(effectiveUserId, conversation.id);
        // Update local state to remove unread count
        setConversations(prev => {
          const updatedConversations = prev.map(conv => 
            conv.id === conversation.id 
              ? { ...conv, unreadCount: 0 }
              : conv
          );
          
          // Calculate total unread count and notify dashboard
          const totalUnreadCount = updatedConversations.reduce(
            (total, conv) => total + (conv.unreadCount || 0), 
            0
          );
          onUnreadCountChange?.(totalUnreadCount);
          
          return updatedConversations;
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser || !currentUser.id) {
      return;
    }

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic message for immediate UI update
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: effectiveUserId,
      senderId: effectiveUserId,
      message: messageText,
      content: messageText,
      message_text: messageText,
        timestamp: 'Just now',
      created_at: new Date().toISOString(),
      messageType: 'text',
      message_type: 'text',
      isOptimistic: true
    };
      
    // Update UI immediately
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      // Sort messages by timestamp (oldest first)
      const sortedMessages = newMessages.sort((a: Message, b: Message) => {
        const timeA = new Date(a.created_at || a.timestamp || new Date()).getTime();
        const timeB = new Date(b.created_at || b.timestamp || new Date()).getTime();
        
        // Handle invalid dates
        if (isNaN(timeA) && isNaN(timeB)) return 0;
        if (isNaN(timeA)) return 1;
        if (isNaN(timeB)) return -1;
        
        return timeA - timeB;
      });
      return sortedMessages;
    });
      setNewMessage('');
    
    // Update conversation list immediately
    setConversations(prev => prev.map(conv => 
      conv.id === selectedConversation.id 
        ? { 
            ...conv, 
            lastMessage: {
              ...optimisticMessage,
              content: messageText,
              message: messageText,
              message_text: messageText
            },
            last_message: {
              ...optimisticMessage,
              content: messageText,
              message: messageText,
              message_text: messageText
            }
          }
        : conv
    ));

    try {
      const response = await apiService.sendMessage(
        effectiveUserId,
        selectedConversation.id,
        messageText
      );
      
      if (response.success && response.message) {
        // Replace optimistic message with real message
        const realMessage = response.message;
        setMessages(prev => {
          const updatedMessages = prev.map(msg => 
            msg.id === tempId ? realMessage : msg
          );
          // Sort messages by timestamp (oldest first)
          const sortedMessages = updatedMessages.sort((a: Message, b: Message) => {
            const timeA = new Date(a.created_at || a.timestamp || new Date()).getTime();
            const timeB = new Date(b.created_at || b.timestamp || new Date()).getTime();
            
            // Handle invalid dates
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return 1;
            if (isNaN(timeB)) return -1;
            
            return timeA - timeB;
          });
          return sortedMessages;
        });
        
        // Update conversation with real message
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { 
                ...conv, 
                lastMessage: {
                  ...realMessage,
                  content: realMessage.content || realMessage.message || realMessage.message_text,
                  message: realMessage.message || realMessage.content || realMessage.message_text,
                  message_text: realMessage.message_text || realMessage.message || realMessage.content
                },
                last_message: {
                  ...realMessage,
                  content: realMessage.content || realMessage.message || realMessage.message_text,
                  message: realMessage.message || realMessage.content || realMessage.message_text,
                  message_text: realMessage.message_text || realMessage.message || realMessage.content
                }
              }
            : conv
        ));
        
        // Update cache efficiently
        setMessageCache(prev => ({
          ...prev,
          [selectedConversation.id]: prev[selectedConversation.id]?.map(msg => 
            msg.id === tempId ? realMessage : msg
          ) || [realMessage]
        }));
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setNewMessage(messageText); // Restore message text
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText); // Restore message text
    }
  };

  const handleMarkAsRead = (conversationId: string) => {
    setConversations(conversations.map(conv =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    ));
  };

  const getParticipantName = useCallback((conversation: Conversation) => {
    if (!conversation) return 'Unknown User';
    
    if (conversation.type === 'group' || conversation.is_group) {
      return conversation.name || 'Group Chat';
    }
    
    if (!conversation.participants || !Array.isArray(conversation.participants)) {
      return 'Unknown User';
    }
    
    const otherParticipant = conversation.participants.find(
      p => p.user_id?.toString() !== effectiveUserId?.toString() && p.id?.toString() !== effectiveUserId?.toString()
    );
    
    if (!otherParticipant) {
      if (conversation.participants.length === 1) {
        const singleParticipant = conversation.participants[0];
        const isCurrentUser = singleParticipant.user_id?.toString() === effectiveUserId?.toString() || 
                             singleParticipant.id?.toString() === effectiveUserId?.toString();
        
        if (isCurrentUser) {
          return singleParticipant?.user?.name || singleParticipant?.name || 'Self';
        } else {
          return singleParticipant?.user?.name || singleParticipant?.name || 'Unknown User';
        }
      }
      return 'Unknown User';
    }
    
    return otherParticipant?.user?.name || otherParticipant?.name || 'Unknown User';
  }, [effectiveUserId]);

  const getParticipantProfilePicture = useCallback((conversation: Conversation) => {
    if (!conversation) {
      return 'https://via.placeholder.com/150';
    }
    
    if (conversation.type === 'group' || conversation.is_group) {
      return conversation.avatar_url || 'https://via.placeholder.com/150/4285f4/FFFFFF?text=G';
    }
    
    if (!conversation.participants || !Array.isArray(conversation.participants)) {
      return 'https://via.placeholder.com/150';
    }
    
    const otherParticipant = conversation.participants.find(
      p => p.user_id?.toString() !== effectiveUserId?.toString() && p.id?.toString() !== effectiveUserId?.toString()
    );
    
    // If no other participant found, check if it's a single participant conversation
    if (!otherParticipant && conversation.participants.length === 1) {
      const singleParticipant = conversation.participants[0];
      const isCurrentUser = singleParticipant.user_id?.toString() === effectiveUserId?.toString() || 
                           singleParticipant.id?.toString() === effectiveUserId?.toString();
      
      if (isCurrentUser) {
        // This is a self-conversation, return current user's profile picture
        return currentUser?.picture || (currentUser as any)?.profilePicture || 'https://via.placeholder.com/150';
      } else {
        // Single participant that's not current user
        return singleParticipant?.user?.profilePicture || 
               (singleParticipant?.user as any)?.profile_picture || 
               singleParticipant?.profilePicture || 
               'https://via.placeholder.com/150';
      }
    }
    
    // Handle both profilePicture and profile_picture field names
    return otherParticipant?.user?.profilePicture || 
           (otherParticipant?.user as any)?.profile_picture || 
           otherParticipant?.profilePicture || 
           'https://via.placeholder.com/150';
  }, [effectiveUserId, currentUser?.picture]);

  const formatTime = (timestamp: string) => {
    if (!timestamp || timestamp === 'Just now') {
      return 'Just now';
    }
    
    // Parse timestamp as Philippines time (Asia/Manila)
    // Convert the timestamp to UTC by subtracting 8 hours, then let JavaScript handle it
    const utcTimestamp = new Date(timestamp);
    const philippinesDate = new Date(utcTimestamp.getTime() + (8 * 60 * 60 * 1000));
    const date = philippinesDate;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Just now';
    }
    
    // Debug logging
    console.log('🕐 TIME DEBUG:');
    console.log('  - Original timestamp:', timestamp);
    console.log('  - Parsed date (UTC):', date.toISOString());
    console.log('  - Local time (browser):', date.toLocaleString());
    console.log('  - Philippines time:', date.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    const now = new Date();
    // Use the original UTC timestamp for time difference calculation
    const diffInHours = (now.getTime() - utcTimestamp.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      const philippinesTime = date.toLocaleTimeString('en-PH', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      });
      console.log('  - Final formatted time:', philippinesTime);
      return philippinesTime;
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getFilteredConversations = () => {
    switch (filter) {
      case 'unread':
        return conversations.filter(c => (c.unreadCount || 0) > 0);
      case 'high-priority':
        return conversations.filter(c => (c as any).priority === 'high');
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

  // Skeleton Components
  const SkeletonConversationItem = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });
    
    return (
      <View style={styles.skeletonConversationItem}>
        <View style={styles.skeletonConversationHeader}>
          <Animated.View style={[styles.skeletonProfileContainer, { opacity: shimmerOpacity }]}>
            <Animated.View style={[styles.skeletonProfileImage, { opacity: shimmerOpacity }]} />
          </Animated.View>
          <View style={styles.skeletonConversationInfo}>
            <Animated.View style={[styles.skeletonParticipantName, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonLastMessage, { opacity: shimmerOpacity }]} />
          </View>
          <View style={styles.skeletonConversationMeta}>
            <Animated.View style={[styles.skeletonTimestamp, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonUnreadBadge, { opacity: shimmerOpacity }]} />
          </View>
        </View>
      </View>
    );
  };

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        selectedConversation?.id === conversation.id && styles.selectedConversation
      ]}
      onPress={() => {
        handleConversationSelect(conversation);
        handleMarkAsRead(conversation.id);
      }}
    >
      <View style={styles.conversationHeader}>
        <View style={styles.profileContainer}>
          <Image 
            source={{ uri: getParticipantProfilePicture(conversation) }} 
            style={styles.profileImage} 
          />
          {conversation.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.conversationInfo}>
          <View style={styles.conversationTitleRow}>
            <Text style={styles.participantName}>{getParticipantName(conversation)}</Text>
            <View style={[styles.priorityDot, { backgroundColor: getPriorityColor('medium') }]} />
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {(conversation.last_message || conversation.lastMessage)?.message_text || 
             (conversation.last_message || conversation.lastMessage)?.message || ''}
          </Text>
        </View>
        <View style={styles.conversationMeta}>
          <Text style={styles.timestamp}>
            {formatTime((conversation.last_message || conversation.lastMessage)?.created_at || 
                       (conversation.last_message || conversation.lastMessage)?.timestamp || '')}
          </Text>
          {(conversation.unreadCount || 0) > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{conversation.unreadCount || 0}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const MessageItem = ({ message }: { message: Message }) => {
    const isCurrentUser = message.sender_id === effectiveUserId || message.senderId === effectiveUserId;
    const isOptimistic = message.isOptimistic;
    
    return (
    <View style={[
      styles.messageItem,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage,
        isOptimistic && styles.optimisticMessage
    ]}>
      <View style={styles.messageHeader}>
        <View style={styles.senderInfo}>
          {!isCurrentUser && (
            <Image
              source={{
                uri: typeof message.sender === 'object' && message.sender?.profilePicture
                  ? message.sender.profilePicture
                  : 'https://via.placeholder.com/150'
              }}
              style={styles.senderAvatar}
            />
          )}
          <Text style={styles.messageSender}>
            {isCurrentUser ? 'You' : (typeof message.sender === 'string' ? message.sender : (message.sender?.name || 'Unknown'))}
          </Text>
      </View>
        <View style={styles.messageMeta}>
          <Text style={styles.messageTime}>
            {formatTime(message.created_at || message.timestamp || '')}
          </Text>
          {isOptimistic && (
            <ActivityIndicator size="small" color="#999" style={styles.optimisticIndicator} />
          )}
        </View>
      </View>
        <Text style={[
          styles.messageText,
          isOptimistic && styles.optimisticMessageText
        ]}>
          {message.message_text || message.message || message.content || ''}
        </Text>
    </View>
  );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  const filteredConversations = getFilteredConversations();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {!selectedConversation ? (
        // Conversations List
        <Animated.View style={[styles.conversationsContainer, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.headerGradient}>
              <Text style={styles.headerTitle}>Messages</Text>
              <Text style={styles.headerSubtitle}>
                {conversations.filter(c => (c.unreadCount || 0) > 0).length} unread messages
              </Text>
            </View>
              <TouchableOpacity
              style={styles.newGroupButton}
              onPress={() => setShowGroupModal(true)}
              >
              <MaterialIcons name="group-add" size={24} color="#FBFBFB" />
              </TouchableOpacity>
          </Animated.View>

          <TouchableWithoutFeedback onPress={hideSearchResults}>
            <View style={styles.searchContainer}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={clearSearch}
                isLoading={isSearching}
              />

              {showSearchResults && (
                <View style={styles.searchResultsContainer}>
                  <FlatList
                    data={searchResults}
                    renderItem={({ item }) => (
              <TouchableOpacity
                        style={styles.searchResultItem}
                        onPress={() => startDirectMessage(item)}
                        disabled={isStartingConversation}
                      >
                        <Image
                          source={{ 
                            uri: item.profilePicture || 
                                 (item as any).profile_picture || 
                                 'https://via.placeholder.com/150' 
                          }}
                          style={styles.searchResultAvatar}
                        />
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{item.name}</Text>
                          <Text style={styles.searchResultEmail}>{item.email}</Text>
                        </View>
                        {isStartingConversation ? (
                          <ActivityIndicator size="small" color="#4285f4" />
                        ) : (
                          <MaterialIcons name="message" size={20} color="#4285f4" />
                        )}
              </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                    style={styles.searchResultsList}
                  />
          </View>
              )}
            </View>
          </TouchableWithoutFeedback>

          {/* Filter Tabs - Removed to fix search results visibility */}

          <Animated.ScrollView 
            style={[
              styles.conversationsList, 
              showSearchResults && styles.conversationsListWithSearch,
              { transform: [{ scale: scaleAnim }] }
            ]} 
            showsVerticalScrollIndicator={false}
          >
            {showSkeleton ? (
              <>
                <SkeletonConversationItem />
                <SkeletonConversationItem />
                <SkeletonConversationItem />
                <SkeletonConversationItem />
                <SkeletonConversationItem />
              </>
            ) : (
              filteredConversations.map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} />
              ))
            )}
          </Animated.ScrollView>
        </Animated.View>
      ) : (
        // Messages View
        <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
          <View style={styles.messagesHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedConversation(null)}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.messagesHeaderTitle}>
              {getParticipantName(selectedConversation)}
            </Text>
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={() => {
                console.log('🔍 Three dots button pressed');
                handleGroupMenuPress();
              }}
            >
              <MaterialIcons name="more-vert" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <Animated.ScrollView 
            style={[styles.messagesList, { transform: [{ scale: scaleAnim }] }]} 
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </Animated.ScrollView>

          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              placeholderTextColor="#878787"
              multiline
              maxLength={1000}
              returnKeyType="send"
              blurOnSubmit={false}
              onKeyPress={(e) => {
                if (e.nativeEvent.key === 'Enter') {
                  e.preventDefault();
                  if (newMessage.trim()) {
                    sendMessage();
                  }
                }
              }}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <MaterialIcons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Group Creation Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group Chat</Text>
              <TouchableOpacity
                onPress={() => setShowGroupModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
    </View>

            <View style={styles.groupForm}>
              {/* Group Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Group Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Enter group name"
                  placeholderTextColor="#878787"
                />
              </View>

              {/* Group Avatar */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Group Avatar (Optional)</Text>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={pickGroupAvatar}
                >
                  {groupAvatar ? (
                    <Image source={{ uri: groupAvatar }} style={styles.avatarPreview} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <MaterialIcons name="add-a-photo" size={24} color="#666" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Add Members Button */}
              <TouchableOpacity
                style={styles.addMembersButton}
                onPress={() => setShowGroupMembersModal(true)}
              >
                <MaterialIcons name="person-add" size={20} color="#4285f4" />
                <Text style={styles.addMembersText}>
                  Add Members ({selectedGroupMembers.length})
                </Text>
              </TouchableOpacity>

              {/* Selected Members */}
              {selectedGroupMembers.length > 0 && (
                <View style={styles.selectedMembersContainer}>
                  <Text style={styles.selectedMembersTitle}>Selected Members:</Text>
                  <FlatList
                    data={selectedGroupMembers}
                    horizontal
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.selectedMemberItem}>
                        <Image
                          source={{
                            uri: item.profilePicture || 
                                 (item as any).profile_picture || 
                                 'https://via.placeholder.com/150'
                          }}
                          style={styles.selectedMemberAvatar}
                        />
                        <Text style={styles.selectedMemberName}>{item.name}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedGroupMembers(prev => 
                              prev.filter(member => member.id !== item.id)
                            );
                          }}
                          style={styles.removeMemberButton}
                        >
                          <MaterialIcons name="close" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowGroupModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createButton, (!groupName.trim() || selectedGroupMembers.length === 0) && styles.createButtonDisabled]}
                  onPress={createGroupChat}
                  disabled={!groupName.trim() || selectedGroupMembers.length === 0 || isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Group</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Group Members Selection Modal */}
      <Modal
        visible={showGroupMembersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Members</Text>
              <TouchableOpacity
                onPress={() => setShowGroupMembersModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.membersSearchContainer}>
              <TextInput
                style={styles.membersSearchInput}
                value={groupSearchQuery}
                onChangeText={setGroupSearchQuery}
                placeholder="Search users..."
                placeholderTextColor="#878787"
              />
            </View>

            <FlatList
              data={groupSearchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedGroupMembers.some(member => member.id === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.memberItem, isSelected && styles.selectedMemberItemHighlighted]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedGroupMembers(prev => 
                          prev.filter(member => member.id !== item.id)
                        );
                      } else {
                        setSelectedGroupMembers(prev => [...prev, item]);
                      }
                    }}
                  >
                    <Image
                      source={{
                        uri: item.profilePicture || 
                             (item as any).profile_picture || 
                             'https://via.placeholder.com/150'
                      }}
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{item.name}</Text>
                      <Text style={styles.memberEmail}>{item.email}</Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={24} color="#4285f4" />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.membersList}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowGroupMembersModal(false)}
              >
                <Text style={styles.cancelButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Group Menu Modal */}
      <Modal
        visible={showGroupMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGroupMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGroupMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.groupMenuContainer}>
                <View style={styles.groupMenuHeader}>
                  <Text style={styles.groupMenuTitle}>Group Options</Text>
                  <TouchableOpacity onPress={() => setShowGroupMenu(false)}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.groupMenuOption}
                  onPress={handleEditGroupAvatar}
                  disabled={isUploadingAvatar}
                >
                  <MaterialIcons name="edit" size={24} color="#4285f4" />
                  <Text style={styles.groupMenuOptionText}>
                    {isUploadingAvatar ? 'Updating...' : 'Edit Profile Picture'}
                  </Text>
                  {isUploadingAvatar && (
                    <ActivityIndicator size="small" color="#4285f4" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.groupMenuOption}
                  onPress={handleShowGroupMembers}
                >
                  <MaterialIcons name="group" size={24} color="#4285f4" />
                  <Text style={styles.groupMenuOptionText}>Show Group Members</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.groupMenuOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    setShowAddMemberModal(true);
                  }}
                >
                  <MaterialIcons name="person-add" size={24} color="#4285f4" />
                  <Text style={styles.groupMenuOptionText}>Add Group Member</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.groupMenuOption}
                  onPress={() => {
                    setShowGroupMenu(false);
                    setNewGroupName(selectedConversation?.name || '');
                    setShowEditNameModal(true);
                  }}
                >
                  <MaterialIcons name="edit" size={24} color="#4285f4" />
                  <Text style={styles.groupMenuOptionText}>Edit Group Name</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.groupMenuOption, styles.deleteOption]}
                  onPress={() => {
                    console.log('🔍 Delete conversation button pressed in group menu');
                    handleDeleteConversation();
                  }}
                >
                  <MaterialIcons name="delete" size={24} color="#ea4335" />
                  <Text style={[styles.groupMenuOptionText, styles.deleteOptionText]}>
                    Delete Conversation
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Direct Message Menu Modal */}
      <Modal
        visible={showDirectMessageMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDirectMessageMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDirectMessageMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.groupMenuContainer}>
                <View style={styles.groupMenuHeader}>
                  <Text style={styles.groupMenuTitle}>Conversation Options</Text>
                  <TouchableOpacity onPress={() => setShowDirectMessageMenu(false)}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={[styles.groupMenuOption, styles.deleteOption]}
                  onPress={() => {
                    console.log('🔍 Delete conversation button pressed in direct message menu');
                    handleDeleteConversation();
                  }}
                >
                  <MaterialIcons name="delete" size={24} color="#ea4335" />
                  <Text style={[styles.groupMenuOptionText, styles.deleteOptionText]}>
                    Delete Conversation
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Group Info Modal */}
      <Modal
        visible={showGroupInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Information</Text>
              <TouchableOpacity
                onPress={() => setShowGroupInfoModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.groupInfoContent}>
              {/* Group Avatar and Name */}
              <View style={styles.groupInfoHeader}>
                <View style={styles.groupInfoAvatar}>
                  {(selectedConversation as any)?.avatar_url ? (
                    <Image
                      source={{ uri: (selectedConversation as any).avatar_url }}
                      style={styles.groupInfoAvatarImage}
                    />
                  ) : selectedConversation?.name ? (
                    <Text style={styles.groupInfoAvatarText}>
                      {selectedConversation.name.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <MaterialIcons name="group" size={40} color="#666" />
                  )}
                </View>
                <Text style={styles.groupInfoName}>
                  {selectedConversation?.name || 'Group Chat'}
                </Text>
              </View>

              {/* Group Creator */}
              <View style={styles.groupInfoSection}>
                <Text style={styles.groupInfoSectionTitle}>Group Creator</Text>
                {getGroupCreator() ? (
                  <View style={styles.groupCreatorInfo}>
                    <Image
                      source={{
                        uri: getGroupCreator()?.profilePicture || 
                             (getGroupCreator() as any)?.profile_picture || 
                             'https://via.placeholder.com/150'
                      }}
                      style={styles.groupCreatorAvatar}
                    />
                    <View style={styles.groupCreatorDetails}>
                      <Text style={styles.groupCreatorName}>
                        {getGroupCreator()?.name}
                      </Text>
                      <Text style={styles.groupCreatorEmail}>
                        {getGroupCreator()?.email}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.groupInfoNoData}>No creator information available</Text>
                )}
              </View>

              {/* Group Members */}
              <View style={styles.groupInfoSection}>
                <Text style={styles.groupInfoSectionTitle}>
                  Group Members ({selectedConversation?.participants?.length || 0})
                </Text>
                <ScrollView style={styles.groupMembersList} showsVerticalScrollIndicator={false}>
                  {selectedConversation?.participants?.map((participant) => (
                    <View key={participant.id} style={styles.groupMemberItem}>
                      <Image
                        source={{
                          uri: participant.user?.profilePicture || 
                               (participant.user as any)?.profile_picture || 
                               'https://via.placeholder.com/150'
                        }}
                        style={styles.groupMemberAvatar}
                      />
                      <View style={styles.groupMemberDetails}>
                        <Text style={styles.groupMemberName}>
                          {participant.user?.name}
                        </Text>
                        <Text style={styles.groupMemberEmail}>
                          {participant.user?.email}
                        </Text>
                      </View>
                      {participant.id === getGroupCreator()?.id && (
                        <View style={styles.creatorBadge}>
                          <Text style={styles.creatorBadgeText}>Creator</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Group Member</Text>
              <TouchableOpacity
                onPress={() => setShowAddMemberModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.membersSearchContainer}>
              <TextInput
                style={styles.membersSearchInput}
                value={addMemberSearchQuery}
                onChangeText={setAddMemberSearchQuery}
                placeholder="Search users to add..."
                placeholderTextColor="#878787"
              />
            </View>

            <FlatList
              data={addMemberSearchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.memberItem}
                  onPress={() => handleAddMemberToGroup(item)}
                  disabled={isUpdatingGroup}
                >
                  <Image
                    source={{
                      uri: item.profilePicture || 
                           (item as any).profile_picture || 
                           'https://via.placeholder.com/150'
                    }}
                    style={styles.memberAvatar}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberEmail}>{item.email}</Text>
                  </View>
                  {isUpdatingGroup ? (
                    <ActivityIndicator size="small" color="#4285f4" />
                  ) : (
                    <MaterialIcons name="person-add" size={24} color="#4285f4" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.membersList}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddMemberModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Group Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Group Name</Text>
              <TouchableOpacity
                onPress={() => setShowEditNameModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.groupForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Group Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="Enter new group name"
                  placeholderTextColor="#878787"
                  maxLength={50}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEditNameModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createButton, (!newGroupName.trim()) && styles.createButtonDisabled]}
                  onPress={handleEditGroupName}
                  disabled={!newGroupName.trim() || isUpdatingGroup}
                >
                  {isUpdatingGroup ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Update Name</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContainer}>
            <View style={styles.successModalContent}>
              <View style={styles.successIconContainer}>
                <MaterialIcons name="check-circle" size={60} color="#4CAF50" />
              </View>
              <Text style={styles.successModalTitle}>Success!</Text>
              <Text style={styles.successModalMessage}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.successModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.83);', // Dark background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#151419', // Dark background
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  conversationsContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2A2A2E', // Dark background
    padding: 24,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerGradient: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
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
  conversationsListWithSearch: {
    marginTop: 0,
  },
  conversationItem: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  selectedConversation: {
    backgroundColor: '#F56E0F', // Primary orange
    elevation: 8,
    shadowOpacity: 0.2,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    backgroundColor: '#34a853',
  },
  lastMessage: {
    fontSize: 15,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
    opacity: 0.9,
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 4,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#151419', // Dark background
  },
  messagesHeader: {
    backgroundColor: '#2A2A2E', // Dark background
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    marginRight: 16,
  },
  messagesHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
    letterSpacing: -0.3,
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
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginRight: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    lineHeight: 20,
    backgroundColor: '#2A2A2E', // Dark message background
    padding: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: '#2A2A2E', // Dark background
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
  },
  messageInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#F56E0F', // Primary orange
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 15,
    color: '#FBFBFB', // Light text
    backgroundColor: '#151419', // Dark input background
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  newGroupButton: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#F56E0F', // Primary orange
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E', // Dark input background
    borderRadius: 16,
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#F56E0F', // Primary orange
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '600',
  },
  searchButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsContainer: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F56E0F', // Primary orange
    elevation: 10,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    fontFamily: 'System',
  },
  searchResultEmail: {
    fontSize: 15,
    color: '#878787', // Muted gray
    marginTop: 4,
    fontWeight: '500',
  },
  // Optimistic message styles
  optimisticMessage: {
    opacity: 0.7,
  },
  optimisticMessageText: {
    fontStyle: 'italic',
  },
  optimisticIndicator: {
    marginLeft: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  closeButton: {
    padding: 4,
  },
  groupForm: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  avatarButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPreview: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4285f4',
    borderRadius: 8,
    marginBottom: 16,
  },
  addMembersText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4285f4',
    fontWeight: '500',
  },
  selectedMembersContainer: {
    marginBottom: 20,
  },
  selectedMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedMemberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  selectedMemberName: {
    fontSize: 12,
    color: '#333',
    marginRight: 4,
  },
  removeMemberButton: {
    padding: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  createButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#4285f4',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  membersSearchContainer: {
    marginBottom: 16,
  },
  membersSearchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  membersList: {
    maxHeight: 300,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedMemberItemHighlighted: {
    backgroundColor: '#e3f2fd',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  // Group menu styles
  groupMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  groupMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  groupMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  groupMenuOptionText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  deleteOption: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 16,
  },
  deleteOptionText: {
    color: '#ea4335',
  },
  // Group info styles
  groupInfoContent: {
    flex: 1,
  },
  groupInfoHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  groupInfoAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupInfoAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4285f4',
  },
  groupInfoAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  groupInfoName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  groupInfoSection: {
    marginBottom: 24,
  },
  groupInfoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  groupCreatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  groupCreatorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  groupCreatorDetails: {
    flex: 1,
  },
  groupCreatorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  groupCreatorEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  groupInfoNoData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  groupMembersList: {
    maxHeight: 200,
  },
  groupMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  groupMemberDetails: {
    flex: 1,
  },
  groupMemberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  groupMemberEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  creatorBadge: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creatorBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  // Success modal styles
  successModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successModalButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Skeleton Loading Styles
  skeletonConversationItem: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    opacity: 0.7,
  },
  skeletonConversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonProfileContainer: {
    position: 'relative',
    marginRight: 12,
  },
  skeletonProfileImage: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 25,
  },
  skeletonConversationInfo: {
    flex: 1,
  },
  skeletonParticipantName: {
    width: '60%',
    height: 18,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonLastMessage: {
    width: '80%',
    height: 15,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
  },
  skeletonConversationMeta: {
    alignItems: 'flex-end',
  },
  skeletonTimestamp: {
    width: 40,
    height: 13,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonUnreadBadge: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 12,
  },
});
