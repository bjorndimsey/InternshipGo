import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

const { width } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'application' | 'moa' | 'intern';
  timestamp: string;
  isRead: boolean;
  isImportant: boolean;
  actionRequired: boolean;
  actionText?: string;
  relatedId?: string;
  category?: string;
  action?: string;
  priority?: string;
  data?: any;
  // Alternative timestamp field names that might be used by the API
  created_at?: string;
  createdAt?: string;
}

interface NotificationResponse {
  success: boolean;
  notifications: Notification[];
  message?: string;
}

interface NotificationsPageProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  } | null;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationsPage({ currentUser, onUnreadCountChange }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important' | 'action-required'>('all');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentUser?.id) {
      fetchCompanyIdAndNotifications();
      
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
    }
  }, [currentUser?.id]);

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

  useEffect(() => {
    filterNotifications();
  }, [filter, notifications]);

  useEffect(() => {
    console.log('🔄 Notifications state changed:', notifications.length, 'notifications');
    updateUnreadCount();
  }, [notifications]);

  useEffect(() => {
    console.log('🔄 Loading state changed:', loading);
  }, [loading]);

  const fetchCompanyIdAndNotifications = async () => {
    console.log('🚀 fetchCompanyIdAndNotifications called with currentUser:', currentUser);
    if (!currentUser?.id) {
      console.log('❌ No currentUser.id, returning');
      return;
    }

    try {
      console.log('🔄 Setting loading to true in fetchCompanyIdAndNotifications');
      setLoading(true);
      console.log('🔔 Fetching company profile for user:', currentUser.id);

      const companyResponse = await apiService.getCompanyProfileByUserId(currentUser.id);

      if (!companyResponse.success || !companyResponse.user) {
        console.error('❌ Failed to get company profile');
        setNotifications([]);
        setLoading(false);
        return;
      }

      const fetchedCompanyId = companyResponse.user.id;
      setCompanyId(fetchedCompanyId);
      console.log('✅ Fetched company ID:', fetchedCompanyId);

      console.log('🔄 Calling fetchNotifications with companyId:', fetchedCompanyId);
      await fetchNotifications(fetchedCompanyId);
      console.log('✅ fetchNotifications completed');

    } catch (error) {
      console.error('Error fetching company ID:', error);
      setNotifications([]);
      setLoading(false);
    }
  };

  const fetchNotifications = async (cId: string) => {
    console.log('🚀 fetchNotifications called with cId:', cId);
    if (!cId) {
      console.log('❌ No companyId provided, returning');
      return;
    }

    try {
      console.log('🔄 Setting loading to true');
      setLoading(true);
      setShowSkeleton(true);
      console.log('🔔 Fetching company notifications for companyId:', cId);

      const notificationsResponse = await apiService.getCompanyNotifications(cId, currentUser!.id) as NotificationResponse;

      console.log('🔍 API Response:', notificationsResponse);
      console.log('🔍 API Response type:', typeof notificationsResponse);
      console.log('🔍 API Response success:', notificationsResponse.success);
      console.log('🔍 API Response notifications:', notificationsResponse.notifications);

      if (notificationsResponse.success && notificationsResponse.notifications) {
        console.log('✅ Setting notifications:', notificationsResponse.notifications);
        // Log each notification's timestamp for debugging
        notificationsResponse.notifications.forEach((notification, index) => {
          console.log(`🔍 Notification ${index}:`, {
            id: notification.id,
            title: notification.title,
            timestamp: notification.timestamp,
            timestampType: typeof notification.timestamp,
            allKeys: Object.keys(notification)
          });
        });
        setNotifications(notificationsResponse.notifications);
        console.log('✅ Fetched notifications:', notificationsResponse.notifications.length);
      } else {
        console.log('ℹ️ No notifications found or failed to fetch.');
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      console.log('🔄 Setting loading to false');
      setLoading(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.isRead);
        break;
      case 'important':
        filtered = filtered.filter(n => n.isImportant);
        break;
      case 'action-required':
        filtered = filtered.filter(n => n.actionRequired);
        break;
      default:
        // Show all
        break;
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser?.id || !companyId) return;
    
    try {
      await apiService.markCompanyNotificationAsRead(notificationId, companyId, currentUser.id);
      setNotifications(notifications.map(notification =>
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      ));
      updateUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const updateUnreadCount = () => {
    const unreadCount = notifications.filter(notification => !notification.isRead).length;
    onUnreadCountChange?.(unreadCount);
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id || !companyId) return;
    
    try {
      await apiService.markAllCompanyNotificationsAsRead(companyId, currentUser.id);
      setNotifications(notifications.map(notification => ({
        ...notification,
        isRead: true
      })));
      updateUnreadCount();
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleNotificationAction = (notification: Notification) => {
    if (notification.action || notification.actionText) {
      if (notification.type === 'moa') {
        Alert.alert('MOA Details',
          `Coordinator: ${notification.data?.coordinatorName}\n` +
          `Email: ${notification.data?.coordinatorEmail}\n` +
          `Status: ${notification.data?.moaStatus}\n` +
          `Uploaded At: ${notification.data?.uploadedAt ? new Date(notification.data.uploadedAt).toLocaleString() : 'N/A'}\n` +
          `Expiry Date: ${notification.data?.moaExpiryDate || 'N/A'}\n` +
          `${notification.data?.moaUrl ? `MOA Document: ${notification.data.moaUrl}` : ''}`
        );
        handleMarkAsRead(notification.id);
      } else if (notification.type === 'application') {
        Alert.alert('Application Details',
          `Student: ${notification.data?.studentName}\n` +
          `Email: ${notification.data?.studentEmail}\n` +
          `Position: ${notification.data?.position}\n` +
          `Department: ${notification.data?.department || 'N/A'}\n` +
          `Applied At: ${notification.data?.appliedAt ? new Date(notification.data.appliedAt).toLocaleString() : 'N/A'}\n` +
          `Status: ${notification.data?.status}\n` +
          `${notification.data?.coverLetter ? `Cover Letter: ${notification.data.coverLetter}` : ''}\n` +
          `${notification.data?.resumeUrl ? `Resume: ${notification.data.resumeUrl}` : ''}`
        );
        handleMarkAsRead(notification.id);
      } else {
        Alert.alert('Action Required',
          `Perform action: ${notification.actionText || notification.action}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Perform Action', 
              onPress: () => {
                handleMarkAsRead(notification.id);
                Alert.alert('Success', 'Action completed successfully');
              }
            },
          ]
        );
      }
    } else {
      handleMarkAsRead(notification.id);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setNotifications(notifications.filter(n => n.id !== notificationId));
            Alert.alert('Success', 'Notification deleted');
          }
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return 'info';
      case 'success': return 'check-circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'application': return 'assignment';
      case 'moa': return 'description';
      case 'intern': return 'school';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return '#F56E0F';
      case 'info': return '#F56E0F';
      case 'warning': return '#F56E0F';
      case 'error': return '#F56E0F';
      case 'application': return '#F56E0F';
      case 'moa': return '#F56E0F';
      case 'intern': return '#F56E0F';
      default: return '#F56E0F';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'moa': return 'description';
      case 'application': return 'assignment';
      case 'system': return 'settings';
      case 'event': return 'event';
      default: return 'notifications';
    }
  };

  const getPriorityColor = (isImportant: boolean, actionRequired: boolean) => {
    if (actionRequired) return '#F56E0F';
    if (isImportant) return '#F56E0F';
    return '#F56E0F';
  };

  // Skeleton Components
  const SkeletonNotificationItem = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonNotificationItem}>
        <View style={styles.skeletonNotificationHeader}>
          <Animated.View style={[styles.skeletonNotificationIcon, { opacity: shimmerOpacity }]} />
          <View style={styles.skeletonNotificationContent}>
            <Animated.View style={[styles.skeletonNotificationTitle, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonNotificationMessage, { opacity: shimmerOpacity }]} />
          </View>
          <View style={styles.skeletonNotificationMeta}>
            <Animated.View style={[styles.skeletonNotificationTime, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonUnreadDot, { opacity: shimmerOpacity }]} />
          </View>
        </View>
        <Animated.View style={[styles.skeletonNotificationAction, { opacity: shimmerOpacity }]} />
      </View>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    // Debug logging to identify problematic timestamps
    console.log('🔍 formatTimestamp called with:', timestamp, 'type:', typeof timestamp);
    
    // Handle invalid or empty timestamps
    if (!timestamp || timestamp.trim() === '') {
      console.log('⚠️ Empty or null timestamp');
      return 'Unknown time';
    }

    // Check if the timestamp is already a relative time string (like "2 weeks ago", "3 days ago", etc.)
    const relativeTimePattern = /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i;
    const match = timestamp.match(relativeTimePattern);
    
    if (match) {
      console.log('✅ Detected relative time string, returning as-is:', timestamp);
      return timestamp; // Return the relative time string as-is
    }

    // Check for other common relative time patterns
    const commonRelativePatterns = [
      /^just\s+now$/i,
      /^a\s+few\s+minutes\s+ago$/i,
      /^a\s+few\s+hours\s+ago$/i,
      /^yesterday$/i,
      /^today$/i,
      /^(\d+)\s+weeks?\s+ago$/i,
      /^(\d+)\s+days?\s+ago$/i,
      /^(\d+)\s+hours?\s+ago$/i,
      /^(\d+)\s+minutes?\s+ago$/i
    ];

    for (const pattern of commonRelativePatterns) {
      if (pattern.test(timestamp)) {
        console.log('✅ Detected common relative time pattern, returning as-is:', timestamp);
        return timestamp;
      }
    }

    // Try to parse the timestamp as a date
    let date: Date;
    try {
      date = new Date(timestamp);
    } catch (error) {
      console.log('❌ Error parsing timestamp:', timestamp, 'Error:', error);
      return 'Invalid date';
    }
    
    const now = new Date();
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.log('❌ Invalid date created from timestamp:', timestamp);
      // Try alternative parsing methods
      const alternativeDate = new Date(timestamp.replace(' ', 'T')); // Try ISO format
      if (!isNaN(alternativeDate.getTime())) {
        console.log('✅ Alternative parsing worked');
        date = alternativeDate;
      } else {
        return 'Invalid date';
      }
    }
    
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    console.log('🔍 Time calculation - now:', now.getTime(), 'date:', date.getTime(), 'diffInHours:', diffInHours);
    
    // Handle negative time differences (future dates)
    if (diffInHours < 0) {
      console.log('⚠️ Future date detected, returning "Just now"');
      return 'Just now';
    }
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      console.log('🔍 diffInDays calculated:', diffInDays);
      // Additional check to ensure diffInDays is valid
      if (isNaN(diffInDays) || diffInDays < 0) {
        console.log('❌ Invalid diffInDays:', diffInDays);
        return 'Just now';
      }
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification,
        notification.actionRequired && styles.urgentNotification
      ]}
      onPress={() => handleNotificationAction(notification)}
    >
      <View style={styles.notificationHeader}>
        <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(notification.type) }]}>
          <MaterialIcons 
            name={getNotificationIcon(notification.type)} 
            size={20} 
            color="#fff" 
          />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationTitleRow}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(notification.isImportant, notification.actionRequired) }]}>
              <Text style={styles.priorityText}>
                {notification.actionRequired ? 'ACTION REQUIRED' : notification.isImportant ? 'IMPORTANT' : 'NORMAL'}
              </Text>
            </View>
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          <View style={styles.notificationMeta}>
            <View style={styles.categoryContainer}>
              <MaterialIcons 
                name={getCategoryIcon(notification.category || 'system')} 
                size={14} 
                color="#F56E0F" 
              />
              <Text style={styles.categoryText}>{notification.category || 'system'}</Text>
            </View>
            <Text style={styles.notificationTime}>{formatTimestamp(notification.timestamp || notification.created_at || notification.createdAt || '')}</Text>
          </View>
        </View>
        <View style={styles.notificationActions}>
          {!notification.isRead && <View style={styles.unreadDot} />}
          {notification.isImportant && (
            <MaterialIcons name="star" size={16} color="#fbbc04" />
          )}
        </View>
      </View>
      {notification.actionRequired && (
        <View style={styles.notificationAction}>
          <Text style={styles.actionText}>Action Required</Text>
          <MaterialIcons name="arrow-forward-ios" size={16} color="#F56E0F" />
        </View>
      )}
    </TouchableOpacity>
  );

  console.log('🔄 Render - loading state:', loading, 'notifications count:', notifications.length);

  if (loading) {
    console.log('🔄 Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header with integrated filter tabs */}
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                  All ({notifications.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
                onPress={() => setFilter('unread')}
              >
                <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
                  Unread ({notifications.filter(n => !n.isRead).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'important' && styles.activeFilterTab]}
                onPress={() => setFilter('important')}
              >
                <Text style={[styles.filterText, filter === 'important' && styles.activeFilterText]}>
                  Important ({notifications.filter(n => n.isImportant).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter === 'action-required' && styles.activeFilterTab]}
                onPress={() => setFilter('action-required')}
              >
                <Text style={[styles.filterText, filter === 'action-required' && styles.activeFilterText]}>
                  Action Required ({notifications.filter(n => n.actionRequired).length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <Text style={styles.headerSubtitle}>
            {notifications.filter(n => !n.isRead).length} unread notifications
          </Text>
        </View>
      </Animated.View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMarkAllAsRead}
        >
          <MaterialIcons name="done-all" size={20} color="#F56E0F" />
          <Text style={styles.actionButtonText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <Animated.ScrollView 
        style={[styles.notificationsList, { transform: [{ scale: scaleAnim }] }]} 
        showsVerticalScrollIndicator={false}
      >
        {showSkeleton ? (
          <>
            <SkeletonNotificationItem />
            <SkeletonNotificationItem />
            <SkeletonNotificationItem />
            <SkeletonNotificationItem />
            <SkeletonNotificationItem />
          </>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color="#F56E0F" />
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? 'You have no notifications yet'
                : `No ${filter.replace('-', ' ')} notifications found`
              }
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
        )}
      </Animated.ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#2A2A2E',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#2A2A2E',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'column',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 16,
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#F56E0F',
    fontWeight: '500',
  },
  filterScrollView: {
    flex: 1,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeFilterTab: {
    backgroundColor: '#F56E0F',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  activeFilterText: {
    color: '#FBFBFB',
    fontWeight: 'bold',
  },
  actionsContainer: {
    backgroundColor: '#1B1B1E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#1B1B1E',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  unreadNotification: {
    borderLeftWidth: 6,
    borderLeftColor: '#F56E0F',
    elevation: 8,
    shadowOpacity: 0.2,
  },
  urgentNotification: {
    borderLeftWidth: 6,
    borderLeftColor: '#F56E0F',
    elevation: 8,
    shadowOpacity: 0.2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    fontFamily: 'System',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  notificationMessage: {
    fontSize: 15,
    color: '#F56E0F',
    lineHeight: 22,
    fontWeight: '500',
    opacity: 0.9,
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    textTransform: 'capitalize',
    opacity: 0.7,
  },
  notificationTime: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 6,
    fontWeight: '500',
  },
  notificationActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F56E0F',
  },
  notificationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    fontSize: 15,
    color: '#F56E0F',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#878787',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
    fontWeight: '400',
  },
  // Skeleton Loading Styles
  skeletonNotificationItem: {
    backgroundColor: '#1B1B1E',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    opacity: 0.7,
  },
  skeletonNotificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  skeletonNotificationIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 24,
    marginRight: 16,
  },
  skeletonNotificationContent: {
    flex: 1,
  },
  skeletonNotificationTitle: {
    width: '70%',
    height: 18,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonNotificationMessage: {
    width: '90%',
    height: 15,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonNotificationMeta: {
    alignItems: 'flex-end',
  },
  skeletonNotificationTime: {
    width: 60,
    height: 13,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonUnreadDot: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 5,
  },
  skeletonNotificationAction: {
    width: '40%',
    height: 15,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
    marginTop: 16,
  },
});
