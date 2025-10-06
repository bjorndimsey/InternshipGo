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
  type: 'info' | 'success' | 'warning' | 'error' | 'application' | 'assignment' | 'requirement' | 'attendance';
  timestamp: string;
  isRead: boolean;
  isImportant: boolean;
  action?: string;
  status?: string;
  data?: any;
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();
      
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

  // Update unread count when notifications change
  useEffect(() => {
    updateUnreadCount();
  }, [notifications]);

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      setShowSkeleton(true);
      console.log('🔔 Fetching notifications for student:', currentUser.id);
      
      const response = await apiService.getStudentNotifications(currentUser.id) as NotificationResponse;
      
      if (response.success && response.notifications) {
        console.log('🔔 Notifications fetched:', response.notifications.length);
        setNotifications(response.notifications);
      } else {
        console.error('❌ Failed to fetch notifications:', response.message);
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser?.id) return;
    
    try {
      await apiService.markNotificationAsRead(notificationId, currentUser.id);
      setNotifications(notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      ));
      
      // Update unread count in dashboard
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
    if (!currentUser?.id) return;
    
    try {
      await apiService.markAllNotificationsAsRead(currentUser.id);
      setNotifications(notifications.map(notification => ({
        ...notification,
        isRead: true
      })));
      
      // Update unread count in dashboard
      updateUnreadCount();
      
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleNotificationAction = (notification: Notification) => {
    if (notification.action) {
      // Handle different notification types directly
      if (notification.type === 'application') {
        Alert.alert('Application Details', 
          `Company: ${notification.data?.companyName}\nPosition: ${notification.data?.position}\nStatus: ${notification.status}\n${notification.data?.notes ? `Notes: ${notification.data.notes}` : ''}`
        );
        handleMarkAsRead(notification.id);
      } else if (notification.type === 'assignment') {
        Alert.alert('Coordinator Assignment', 
          `You have been assigned to ${notification.data?.coordinatorName} as your internship coordinator.`
        );
        handleMarkAsRead(notification.id);
      } else if (notification.type === 'requirement') {
        // Enhanced requirement details with submission status and feedback
        const isApproved = notification.data?.submissionStatus === 'approved';
        const isRejected = notification.data?.submissionStatus === 'rejected';
        const isNewRequirement = !isApproved && !isRejected && !notification.data?.submittedAt;
        
        let details = `Requirement: ${notification.data?.requirementName}\n`;
        details += `Description: ${notification.data?.description || 'No description provided'}\n`;
        details += `Due Date: ${notification.data?.dueDate ? new Date(notification.data.dueDate).toLocaleDateString() : 'No due date'}\n`;
        details += `Required: ${notification.data?.isRequired ? 'Yes' : 'No'}\n`;
        details += `Status: ${isApproved ? '✅ Approved' : isRejected ? '❌ Needs Revision' : isNewRequirement ? '📝 New Assignment' : 'Pending'}\n`;
        
        if (isNewRequirement) {
          details += `\n👨‍🏫 Assigned by: ${notification.data?.coordinatorName || 'Your Coordinator'}\n`;
          details += `\n📋 Action Required: Please review and submit this requirement.`;
        } else if (isApproved || isRejected) {
          details += `\n📅 Submitted: ${notification.data?.submittedAt ? new Date(notification.data.submittedAt).toLocaleString() : 'N/A'}\n`;
          details += `📅 Reviewed: ${notification.data?.reviewedAt ? new Date(notification.data.reviewedAt).toLocaleString() : 'N/A'}\n`;
          details += `👨‍🏫 Coordinator: ${notification.data?.coordinatorName || 'Unknown'}\n`;
          
          if (notification.data?.coordinatorFeedback) {
            details += `\n💬 Feedback:\n${notification.data.coordinatorFeedback}`;
          } else if (isApproved) {
            details += `\n💬 Feedback: Great work! Your submission has been approved.`;
          } else if (isRejected) {
            details += `\n💬 Feedback: Please review the requirements and resubmit.`;
          }
        }
        
        Alert.alert(
          isApproved ? '🎉 Requirement Approved!' : 
          isRejected ? '📝 Requirement Needs Revision' : 
          isNewRequirement ? '📋 New Requirement Assigned' :
          'Requirement Details', 
          details
        );
        handleMarkAsRead(notification.id);
      } else if (notification.type === 'attendance') {
        // Enhanced attendance details for students
        let details = `Status: ${notification.data?.status.toUpperCase()}\n`;
        details += `Company: ${notification.data?.companyName}\n`;
        details += `Date: ${notification.data?.attendanceDate}\n`;
        details += `AM Time In: ${notification.data?.amTimeIn || '--:--'}\n`;
        details += `AM Time Out: ${notification.data?.amTimeOut || '--:--'}\n`;
        details += `PM Time In: ${notification.data?.pmTimeIn || '--:--'}\n`;
        details += `PM Time Out: ${notification.data?.pmTimeOut || '--:--'}\n`;
        details += `Total Hours: ${notification.data?.totalHours ? `${notification.data.totalHours.toFixed(2)}h` : '0h'}`;
        
        Alert.alert('Attendance Details', details);
        handleMarkAsRead(notification.id);
      } else {
        Alert.alert('Success', `Action completed: ${notification.action}`);
        handleMarkAsRead(notification.id);
      }
    } else {
      handleMarkAsRead(notification.id);
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'important':
        return notifications.filter(n => n.isImportant);
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'application': return 'work';
      case 'assignment': return 'person';
      case 'requirement': return 'assignment';
      case 'attendance': return 'schedule';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return '#2D5A3D'; // Forest green
      case 'info': return '#1E3A5F'; // Deep navy blue
      case 'warning': return '#F4D03F'; // Bright yellow
      case 'error': return '#E8A598'; // Soft coral
      case 'application': return '#2D5A3D'; // Forest green
      case 'assignment': return '#F4D03F'; // Bright yellow
      case 'requirement': return '#1E3A5F'; // Deep navy blue
      case 'attendance': return '#FF8400'; // Orange
      default: return '#1E3A5F'; // Deep navy blue
    }
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

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification
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
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        <View style={styles.notificationMeta}>
          <Text style={styles.notificationTime}>{notification.timestamp}</Text>
          {!notification.isRead && <View style={styles.unreadDot} />}
          {notification.isImportant && (
            <MaterialIcons name="priority-high" size={16} color="#ea4335" />
          )}
        </View>
      </View>
      {notification.action && (
        <View style={styles.notificationAction}>
          <Text style={styles.actionText}>{notification.action}</Text>
          <MaterialIcons name="arrow-forward-ios" size={16} color="#4285f4" />
        </View>
      )}
    </TouchableOpacity>
  );

  const filteredNotifications = getFilteredNotifications();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
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
          <MaterialIcons name="done-all" size={20} color="#fff" />
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
            <MaterialIcons name="notifications-none" size={64} color="#02050a" />
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? 'You have no notifications yet'
                : `No ${filter} notifications found`
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
    backgroundColor: '#F5F1E8', // Soft cream background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#02050a',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#1E3A5F', // Deep navy blue
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
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
    color: '#F4D03F', // Bright yellow
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
    backgroundColor: '#F4D03F', // Bright yellow
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  activeFilterText: {
    color: '#02050a', // Dark navy text on yellow
    fontWeight: 'bold',
  },
  actionsContainer: {
    backgroundColor: '#2D5A3D', // Forest green
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#1E3A5F', // Deep navy blue
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  unreadNotification: {
    borderLeftWidth: 6,
    borderLeftColor: '#F4D03F', // Bright yellow
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
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    fontFamily: 'System',
  },
  notificationMessage: {
    fontSize: 15,
    color: '#F4D03F', // Bright yellow
    lineHeight: 22,
    fontWeight: '500',
    opacity: 0.9,
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  notificationTime: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 6,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F4D03F', // Bright yellow
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
    color: '#F4D03F', // Bright yellow
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#02050a',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#02050a',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
    fontWeight: '400',
  },
  // Skeleton Loading Styles
  skeletonNotificationItem: {
    backgroundColor: '#1E3A5F',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    opacity: 0.7,
  },
  skeletonNotificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  skeletonNotificationIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 24,
    marginRight: 16,
  },
  skeletonNotificationContent: {
    flex: 1,
  },
  skeletonNotificationTitle: {
    width: '70%',
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonNotificationMessage: {
    width: '90%',
    height: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonNotificationMeta: {
    alignItems: 'flex-end',
  },
  skeletonNotificationTime: {
    width: 60,
    height: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonUnreadDot: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 5,
  },
  skeletonNotificationAction: {
    width: '40%',
    height: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginTop: 16,
  },
});
