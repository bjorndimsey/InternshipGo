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
  type: 'info' | 'success' | 'warning' | 'error' | 'application' | 'moa' | 'intern';
  timestamp: string;
  isRead: boolean;
  isImportant: boolean;
  actionRequired: boolean;
  actionText?: string;
  relatedId?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important' | 'action-required'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [filter, notifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'New Application Received',
          message: 'John Doe has applied for the Software Developer Intern position. Review required.',
          type: 'application',
          timestamp: '2 hours ago',
          isRead: false,
          isImportant: true,
          actionRequired: true,
          actionText: 'Review Application',
          relatedId: 'app_1',
        },
        {
          id: '2',
          title: 'MOA Status Update',
          message: 'Your MOA with University of Technology has been approved and is now active.',
          type: 'moa',
          timestamp: '1 day ago',
          isRead: true,
          isImportant: false,
          actionRequired: false,
        },
        {
          id: '3',
          title: 'Intern Attendance Alert',
          message: 'Sarah Wilson has been absent for 3 consecutive days. Please check in.',
          type: 'intern',
          timestamp: '2 days ago',
          isRead: false,
          isImportant: true,
          actionRequired: true,
          actionText: 'Contact Intern',
          relatedId: 'intern_1',
        },
        {
          id: '4',
          title: 'Application Approved',
          message: 'Jane Smith\'s application for Data Analyst Intern has been approved.',
          type: 'success',
          timestamp: '3 days ago',
          isRead: true,
          isImportant: false,
          actionRequired: false,
        },
        {
          id: '5',
          title: 'System Maintenance',
          message: 'Scheduled maintenance will occur on Sunday from 2 AM to 4 AM.',
          type: 'info',
          timestamp: '1 week ago',
          isRead: true,
          isImportant: false,
          actionRequired: false,
        },
        {
          id: '6',
          title: 'MOA Expiry Warning',
          message: 'Your MOA with State University will expire in 30 days. Please renew.',
          type: 'warning',
          timestamp: '1 week ago',
          isRead: false,
          isImportant: true,
          actionRequired: true,
          actionText: 'Renew MOA',
          relatedId: 'moa_1',
        },
        {
          id: '7',
          title: 'Intern Performance Review',
          message: 'Mike Johnson\'s performance review is due. Please submit your feedback.',
          type: 'intern',
          timestamp: '2 weeks ago',
          isRead: true,
          isImportant: false,
          actionRequired: true,
          actionText: 'Submit Review',
          relatedId: 'review_1',
        },
        {
          id: '8',
          title: 'New Partnership Request',
          message: 'Tech University has requested a partnership. Review and respond.',
          type: 'moa',
          timestamp: '2 weeks ago',
          isRead: false,
          isImportant: true,
          actionRequired: true,
          actionText: 'Review Request',
          relatedId: 'partnership_1',
        },
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
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
    if (notification.actionText) {
      Alert.alert(
        'Action Required',
        `Perform action: ${notification.actionText}`,
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
      case 'info': return '#4285f4';
      case 'success': return '#34a853';
      case 'warning': return '#fbbc04';
      case 'error': return '#ea4335';
      case 'application': return '#9c27b0';
      case 'moa': return '#ff9800';
      case 'intern': return '#00bcd4';
      default: return '#666';
    }
  };

  const getPriorityColor = (isImportant: boolean, actionRequired: boolean) => {
    if (actionRequired) return '#ea4335';
    if (isImportant) return '#fbbc04';
    return '#666';
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
        <View style={styles.notificationIconContainer}>
          <MaterialIcons 
            name={getNotificationIcon(notification.type)} 
            size={24} 
            color={getNotificationColor(notification.type)} 
          />
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationTitleRow}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <View style={[
              styles.priorityIndicator, 
              { backgroundColor: getPriorityColor(notification.isImportant, notification.actionRequired) }
            ]} />
          </View>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <View style={styles.notificationFooter}>
            <Text style={styles.notificationTimestamp}>{notification.timestamp}</Text>
            {notification.actionRequired && (
              <Text style={styles.actionRequiredText}>Action Required</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(notification.id)}
        >
          <MaterialIcons name="delete" size={20} color="#ea4335" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.filter(n => !n.isRead).length} unread notifications
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
        >
          <MaterialIcons name="done-all" size={20} color="#4285f4" />
          <Text style={styles.markAllText}>Mark All Read</Text>
        </TouchableOpacity>
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

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredNotifications.length}</Text>
          <Text style={styles.statLabel}>Total Notifications</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ea4335' }]}>
            {filteredNotifications.filter(n => !n.isRead).length}
          </Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
            {filteredNotifications.filter(n => n.isImportant).length}
          </Text>
          <Text style={styles.statLabel}>Important</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ea4335' }]}>
            {filteredNotifications.filter(n => n.actionRequired).length}
          </Text>
          <Text style={styles.statLabel}>Action Required</Text>
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No notifications found</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? 'You\'re all caught up! No notifications at the moment.'
                : `No ${filter.replace('-', ' ')} notifications found`
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
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
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4285f4',
  },
  markAllText: {
    color: '#4285f4',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
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
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  notificationsList: {
    flex: 1,
    padding: 20,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  notificationIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea4335',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  actionRequiredText: {
    fontSize: 12,
    color: '#ea4335',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
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
