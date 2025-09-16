import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  isRead: boolean;
  isImportant: boolean;
  action?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Application Status Update',
          message: 'Your application to TechCorp Solutions has been accepted! Please check your email for next steps.',
          type: 'success',
          timestamp: '2 hours ago',
          isRead: false,
          isImportant: true,
          action: 'View Details',
        },
        {
          id: '2',
          title: 'Interview Scheduled',
          message: 'Your interview with DataFlow Inc has been scheduled for Friday, January 26th at 2:00 PM.',
          type: 'info',
          timestamp: '1 day ago',
          isRead: false,
          isImportant: true,
          action: 'View Calendar',
        },
        {
          id: '3',
          title: 'Daily Task Reminder',
          message: 'You have 3 pending daily tasks for your current internship. Please complete them before the deadline.',
          type: 'warning',
          timestamp: '2 days ago',
          isRead: true,
          isImportant: false,
          action: 'View Tasks',
        },
        {
          id: '4',
          title: 'New Internship Opportunities',
          message: '5 new internship opportunities have been posted in your field. Check them out!',
          type: 'info',
          timestamp: '3 days ago',
          isRead: true,
          isImportant: false,
          action: 'Browse Jobs',
        },
        {
          id: '5',
          title: 'Profile Update Required',
          message: 'Please update your profile information to complete your application process.',
          type: 'warning',
          timestamp: '1 week ago',
          isRead: true,
          isImportant: false,
          action: 'Update Profile',
        },
        {
          id: '6',
          title: 'System Maintenance',
          message: 'The system will be under maintenance on Sunday, January 28th from 2:00 AM to 6:00 AM.',
          type: 'info',
          timestamp: '1 week ago',
          isRead: true,
          isImportant: false,
        },
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      isRead: true
    })));
    Alert.alert('Success', 'All notifications marked as read');
  };

  const handleNotificationAction = (notification: Notification) => {
    if (notification.action) {
      Alert.alert(
        'Action',
        `Would you like to ${notification.action.toLowerCase()}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes', onPress: () => {
            Alert.alert('Success', `Action completed: ${notification.action}`);
            handleMarkAsRead(notification.id);
          }},
        ]
      );
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
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return '#34a853';
      case 'info': return '#4285f4';
      case 'warning': return '#fbbc04';
      case 'error': return '#ea4335';
      default: return '#666';
    }
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
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          {notifications.filter(n => !n.isRead).length} unread notifications
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

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMarkAllAsRead}
        >
          <MaterialIcons name="done-all" size={20} color="#4285f4" />
          <Text style={styles.actionButtonText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color="#ccc" />
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
  actionsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4285f4',
    marginLeft: 8,
    fontWeight: '500',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#4285f4',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285f4',
  },
  notificationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 14,
    color: '#4285f4',
    fontWeight: '500',
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
