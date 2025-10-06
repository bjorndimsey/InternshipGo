import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import DashboardHome from './pages/DashboardHome';
import EventsPage from './pages/EventsPage';
import CompaniesPage from './pages/CompaniesPage';
import FavoritesPage from './pages/FavoritesPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import RequirementsPage from './pages/RequirementsPage';
import { apiService } from '../../lib/api';

const { width, height } = Dimensions.get('window');

interface StudentInternsDashboardProps {
  onLogout: () => void;
  currentUser: {
    id: string;
    email: string;
    user_type: string;
    google_id?: string;
  };
}

type MenuItem = {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<any>;
};

const navigationItems: MenuItem[] = [
  { id: 'home', title: 'Dashboard', icon: 'home-outline', component: DashboardHome },
  { id: 'requirements', title: 'Requirements', icon: 'document-text-outline', component: RequirementsPage },
  { id: 'events', title: 'Events', icon: 'calendar-outline', component: EventsPage },
  { id: 'companies', title: 'Companies', icon: 'business-outline', component: CompaniesPage },
  { id: 'favorites', title: 'Favorites', icon: 'heart-outline', component: FavoritesPage },
  { id: 'messages', title: 'Messages', icon: 'chatbubbles-outline', component: MessagesPage },
  { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', component: NotificationsPage },
  { id: 'profile', title: 'Profile', icon: 'person-outline', component: ProfilePage },
];

export default function StudentInternsDashboard({ onLogout, currentUser }: StudentInternsDashboardProps) {
  const [activeScreen, setActiveScreen] = useState('home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(0));
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{
    first_name?: string;
    last_name?: string;
    profile_picture?: string;
  } | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showAutoNotifications, setShowAutoNotifications] = useState(false);
  const [notificationsAnimating, setNotificationsAnimating] = useState(false);
  const [notificationAnimations] = useState(() => 
    Array.from({ length: 10 }, () => new Animated.Value(0))
  );
  const [notificationIconBounce] = useState(new Animated.Value(1));
  const [notificationIconShine] = useState(new Animated.Value(0));
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [logoutSuccessAnim] = useState(new Animated.Value(0));
  const [waveAnim] = useState(new Animated.Value(0));

  // Fetch user profile and unread counts when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser?.id) return;

      try {
        // Fetch user profile
        const profileResponse = await apiService.getProfile(currentUser.id);
        if (profileResponse.success && profileResponse.user) {
          setUserProfile({
            first_name: profileResponse.user.first_name,
            last_name: profileResponse.user.last_name,
            profile_picture: profileResponse.user.profile_picture,
          });
        }

        // Fetch unread message count
        const messagesResponse = await apiService.getConversations(currentUser.id);
        if (messagesResponse.success && messagesResponse.conversations) {
          const totalUnreadMessages = messagesResponse.conversations.reduce(
            (total: number, conv: any) => total + (conv.unreadCount || 0), 
            0
          );
          setUnreadMessageCount(totalUnreadMessages);
        }

        // Fetch notifications
        const notificationsResponse = await apiService.getStudentNotifications(currentUser.id) as any;
        if (notificationsResponse.success && notificationsResponse.notifications) {
          setNotifications(notificationsResponse.notifications);
          const unreadNotifications = notificationsResponse.notifications.filter(
            (notification: any) => !notification.isRead
          );
          setUnreadNotificationCount(unreadNotifications.length);
          
          // Start auto notification popup during stats counting (after 1 second)
          if (unreadNotifications.length > 0) {
            setTimeout(() => {
              setShowAutoNotifications(true);
              setNotificationsAnimating(true);
              
              // Animate all notifications appearing at once
              const animations = unreadNotifications.slice(0, 10).map((_: any, index: number) => 
                Animated.timing(notificationAnimations[index], {
                  toValue: 1,
                  duration: 500,
                  delay: index * 100, // Stagger the appearance
                  useNativeDriver: true,
                })
              );
              
              Animated.parallel(animations).start(() => {
                // After all notifications appear, wait 1.5 seconds then animate them back to icon
                setTimeout(() => {
                  const suckAnimations = unreadNotifications.slice(0, 10).map((_: any, index: number) => 
                    Animated.timing(notificationAnimations[index], {
                      toValue: 0,
                      duration: 1000,
                      delay: index * 50, // Stagger the sucking effect
                      useNativeDriver: true,
                    })
                  );
                  
                  Animated.parallel(suckAnimations).start(() => {
                    // Add bounce effect to notification icon after sucking
                    Animated.sequence([
                      Animated.timing(notificationIconBounce, {
                        toValue: 1.3,
                        duration: 200,
                        useNativeDriver: true,
                      }),
                      Animated.timing(notificationIconBounce, {
                        toValue: 0.9,
                        duration: 150,
                        useNativeDriver: true,
                      }),
                      Animated.timing(notificationIconBounce, {
                        toValue: 1.1,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(notificationIconBounce, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                    ]).start(() => {
                      // Add shine effect after bounce
                      Animated.sequence([
                        Animated.timing(notificationIconShine, {
                          toValue: 1,
                          duration: 300,
                          useNativeDriver: true,
                        }),
                        Animated.timing(notificationIconShine, {
                          toValue: 0,
                          duration: 200,
                          useNativeDriver: true,
                        }),
                      ]).start();
                    });
                    
                    setShowAutoNotifications(false);
                    setNotificationsAnimating(false);
                    // Reset all animations
                    notificationAnimations.forEach(anim => anim.setValue(0));
                  });
                }, 1500); // Show notifications for 1.5 seconds (shorter to sync with stats)
              });
            }, 1000); // Start during stats counting (1 second delay)
          }
        } else {
          setNotifications([]);
          setUnreadNotificationCount(0);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [currentUser?.id]);


  const toggleSidebar = () => {
    const toValue = sidebarVisible ? 0 : 1;
    setSidebarVisible(!sidebarVisible);
    
    Animated.timing(sidebarAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleNavigation = (screenId: string) => {
    setActiveScreen(screenId);
    if (sidebarVisible) {
      toggleSidebar();
    }
    
    // Refresh unread counts when navigating to messages or notifications
    if (screenId === 'messages' || screenId === 'notifications') {
      refreshUnreadCounts();
    }
    
    // Refresh user profile when navigating to profile page
    if (screenId === 'profile') {
      refreshUserProfile();
    }
  };

  const refreshUnreadCounts = async () => {
    if (!currentUser?.id) return;

    try {
      // Fetch unread message count
      const messagesResponse = await apiService.getConversations(currentUser.id);
      if (messagesResponse.success && messagesResponse.conversations) {
        const totalUnreadMessages = messagesResponse.conversations.reduce(
          (total: number, conv: any) => total + (conv.unreadCount || 0), 
          0
        );
        setUnreadMessageCount(totalUnreadMessages);
      }
    } catch (error) {
      console.error('Error refreshing unread counts:', error);
    }
  };

  const refreshUserProfile = async () => {
    if (!currentUser?.id) return;

    try {
      const profileResponse = await apiService.getProfile(currentUser.id);
      if (profileResponse.success && profileResponse.user) {
        setUserProfile({
          first_name: profileResponse.user.first_name,
          last_name: profileResponse.user.last_name,
          profile_picture: profileResponse.user.profile_picture,
        });
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const handleUnreadCountChange = (count: number) => {
    setUnreadMessageCount(count);
  };

  const handleUnreadNotificationCountChange = (count: number) => {
    setUnreadNotificationCount(count);
  };

  const toggleNotificationModal = () => {
    setShowNotificationModal(!showNotificationModal);
  };

  const clearNotification = async (notificationId: string) => {
    try {
      // Mark notification as read
      const response = await apiService.markNotificationAsRead(currentUser?.id || '', notificationId);
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
        setUnreadNotificationCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.isRead);
      for (const notification of unreadNotifications) {
        await apiService.markNotificationAsRead(currentUser?.id || '', notification.id);
      }
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      setShowLogoutModal(false);
      setShowLogoutSuccess(true);
      
      // Start success animation
      Animated.sequence([
        Animated.timing(logoutSuccessAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(1500), // Show success message for 1.5 seconds
        Animated.timing(logoutSuccessAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Execute logout after animation completes
        onLogout();
      });

      // Start wave animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 } // Wave 3 times
      ).start();
    } catch (error) {
      console.error('Error during logout:', error);
      setShowLogoutSuccess(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const ActiveComponent = navigationItems.find(item => item.id === activeScreen)?.component || DashboardHome;

  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu-outline" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.logo}>
              <Ionicons name="school-outline" size={24} color="#FF8400" />
            </View>
            <Text style={styles.headerTitle}>InternshipGo</Text>
            <Text style={styles.headerSubtitle}>Student</Text>
          </View>
          
          <View style={styles.headerRight}>
            <Animated.View style={{ transform: [{ scale: notificationIconBounce }] }}>
              <TouchableOpacity style={styles.notificationButton} onPress={toggleNotificationModal}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>{unreadNotificationCount}</Text>
                  </View>
                )}
                {/* Shine effect overlay */}
                <Animated.View 
                  style={[
                    styles.notificationShine,
                    {
                      opacity: notificationIconShine,
                      transform: [{
                        translateX: notificationIconShine.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-50, 50],
                        })
                      }]
                    }
                  ]} 
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Screen Content */}
        <View style={styles.screenContainer}>
          {activeScreen === 'profile' ? (
            <ProfilePage currentUser={currentUser} />
          ) : activeScreen === 'home' ? (
            <DashboardHome currentUser={currentUser} />
          ) : activeScreen === 'requirements' ? (
            <RequirementsPage currentUser={currentUser} />
          ) : activeScreen === 'messages' ? (
            <MessagesPage currentUser={currentUser ? {
              id: currentUser.id,
              name: currentUser.email.split('@')[0], // Use email prefix as name
              email: currentUser.email,
              user_type: currentUser.user_type
            } : null} onUnreadCountChange={handleUnreadCountChange} />
          ) : activeScreen === 'notifications' ? (
            <NotificationsPage currentUser={currentUser ? {
              id: currentUser.id,
              name: currentUser.email.split('@')[0], // Use email prefix as name
              email: currentUser.email,
              user_type: currentUser.user_type
            } : null} onUnreadCountChange={handleUnreadNotificationCountChange} />
          ) : (
            <ActiveComponent currentUser={currentUser} />
          )}
        </View>
      </View>

      {/* Sidebar Overlay */}
      {sidebarVisible && (
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={toggleSidebar}
          activeOpacity={1}
        />
      )}

      {/* Sidebar */}
      <Animated.View 
        style={[
          styles.sidebar,
          { transform: [{ translateX: sidebarTranslateX }] }
        ]}
      >
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarLogo}>
            <Ionicons name="school-outline" size={32} color="#FF8400" />
          </View>
          <Text style={styles.sidebarTitle}>InternshipGo</Text>
          <Text style={styles.sidebarSubtitle}>Student Dashboard</Text>
        </View>

        <View style={styles.navigation}>
          {navigationItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                activeScreen === item.id && styles.activeNavItem
              ]}
              onPress={() => handleNavigation(item.id)}
            >
              <Ionicons 
                name={item.icon as any} 
                size={20} 
                color={activeScreen === item.id ? '#FF8400' : '#666'} 
              />
              <Text style={[
                styles.navText,
                activeScreen === item.id && styles.activeNavText
              ]}>
                {item.title}
              </Text>
              {item.title === 'Messages' && unreadMessageCount > 0 && (
                <View style={styles.messageBadge}>
                  <Text style={styles.messageBadgeText}>{unreadMessageCount}</Text>
                </View>
              )}
              {item.title === 'Notifications' && unreadNotificationCount > 0 && (
                <View style={styles.notificationSidebarBadge}>
                  <Text style={styles.notificationSidebarText}>{unreadNotificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sidebarFooter}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              {userProfile?.profile_picture ? (
                <Image 
                  source={{ uri: userProfile.profile_picture }} 
                  style={styles.userAvatarImage}
                />
              ) : (
                <Text style={styles.userAvatarText}>
                  {userProfile?.first_name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                  {userProfile?.last_name?.charAt(0) || ''}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {userProfile?.first_name && userProfile?.last_name 
                  ? `${userProfile.first_name} ${userProfile.last_name}`
                  : currentUser?.email?.split('@')[0] || 'User'
                }
              </Text>
              <Text style={styles.userRole}>Student</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#dc3545" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Notification Modal */}
      {showNotificationModal && (
        <TouchableOpacity 
          style={styles.notificationModalOverlay}
          onPress={toggleNotificationModal}
          activeOpacity={1}
        >
          <TouchableOpacity 
            style={styles.notificationModal}
            onPress={(e) => e.stopPropagation()}
            activeOpacity={1}
          >
            <View style={styles.notificationModalHeader}>
              <Text style={styles.notificationModalTitle}>Notifications</Text>
              <TouchableOpacity onPress={clearAllNotifications}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification, index) => (
                  <View key={notification.id || index} style={styles.notificationItem}>
                    <View style={styles.notificationIconContainer}>
                      <View style={[
                        styles.notificationIcon,
                        { backgroundColor: notification.type === 'success' ? '#2D5A3D' : 
                                         notification.type === 'warning' ? '#F4D03F' : 
                                         notification.type === 'error' ? '#E8A598' : '#1E3A5F' }
                      ]}>
                        <Ionicons 
                          name={notification.type === 'success' ? 'checkmark' : 
                                notification.type === 'warning' ? 'warning' : 
                                notification.type === 'error' ? 'close' : 'information'} 
                          size={16} 
                          color="#fff" 
                        />
                      </View>
                    </View>
                    
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message || notification.title || 'New notification'}
                      </Text>
                      <View style={styles.notificationMeta}>
                        <Ionicons 
                          name={notification.isRead ? 'checkmark-circle' : 'time'} 
                          size={12} 
                          color={notification.isRead ? '#2D5A3D' : '#F4D03F'} 
                        />
                        <Text style={styles.notificationTime}>
                          {notification.created_at ? 
                            new Date(notification.created_at).toLocaleDateString() : 
                            'Just now'
                          }
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.clearNotificationButton}
                      onPress={() => clearNotification(notification.id)}
                    >
                      <Text style={styles.clearNotificationText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyNotifications}>
                  <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyNotificationsText}>No notifications</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => {
                setShowNotificationModal(false);
                handleNavigation('notifications');
              }}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <TouchableOpacity 
          style={styles.logoutModalOverlay}
          onPress={cancelLogout}
          activeOpacity={1}
        >
          <TouchableOpacity 
            style={styles.logoutModal}
            onPress={(e) => e.stopPropagation()}
            activeOpacity={1}
          >
            <View style={styles.logoutModalHeader}>
              <Ionicons name="log-out-outline" size={32} color="#dc3545" />
              <Text style={styles.logoutModalTitle}>Confirm Logout</Text>
            </View>
            
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout? You will need to sign in again to access your account.
            </Text>
            
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity 
                style={styles.logoutCancelButton}
                onPress={cancelLogout}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logoutConfirmButton}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Logout Success Animation */}
      {showLogoutSuccess && (
        <View style={styles.logoutSuccessOverlay}>
          <Animated.View 
            style={[
              styles.logoutSuccessContainer,
              {
                opacity: logoutSuccessAnim,
                transform: [
                  {
                    scale: logoutSuccessAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoutSuccessIcon,
                {
                  transform: [
                    {
                      scale: logoutSuccessAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 1.2, 1],
                      }),
                    },
                    {
                      rotate: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-20deg', '20deg'], // Wave from -20 to +20 degrees
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="hand-left" size={80} color="#F4D03F" />
            </Animated.View>
            
            <Animated.Text 
              style={[
                styles.logoutSuccessTitle,
                {
                  opacity: logoutSuccessAnim,
                  transform: [
                    {
                      translateY: logoutSuccessAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              Logout Successful!
            </Animated.Text>
            
            <Animated.Text 
              style={[
                styles.logoutSuccessMessage,
                {
                  opacity: logoutSuccessAnim,
                  transform: [
                    {
                      translateY: logoutSuccessAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              You have been logged out successfully.
            </Animated.Text>
          </Animated.View>
        </View>
      )}

      {/* Auto Notification Popup */}
      {showAutoNotifications && (() => {
        const unreadNotifications = notifications.filter(notification => !notification.isRead);
        const maxNotifications = Math.min(unreadNotifications.length, 10);
        
        if (maxNotifications === 0) return null;
        
        return (
          <View style={styles.autoNotificationOverlay}>
            {/* Animated Notifications */}
            {unreadNotifications.slice(0, maxNotifications).map((notification, index) => {
              // Responsive positioning logic
              const isMobile = width < 400;
              
              // Get the actual notification button position
              const actualNotificationButtonX = isMobile ? width - 30 : width - 40; // Actual button position
              const actualNotificationButtonY = 25; // Actual button Y position in header
              
              // Calculate notification width for proper centering
              const notificationWidth = isMobile ? Math.min(width - 40, 300) : 320;
              
              // Stack notifications vertically with proper spacing
              const stackOffset = index * 8;
              
              // Initial display position (below header)
              const displayY = 90;
              const displayX = isMobile ? (width - notificationWidth) / 2 : actualNotificationButtonX - notificationWidth + 20;
              
              // Entry animation - notifications appear from below
              const translateY = notificationAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [displayY + 100 + stackOffset, displayY + stackOffset],
              });
              
              const translateX = notificationAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0],
              });
              
              const scale = notificationAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              });
              
              const opacity = notificationAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              });
              
              // Sucking animation - notifications move to the notification button position
              const suckTranslateY = notificationAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [actualNotificationButtonY - displayY - stackOffset, displayY + stackOffset], // Move to exact button Y position
              });
              
              const suckTranslateX = notificationAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [actualNotificationButtonX - displayX, 0], // Move to button X position
              });
              
              const suckScale = notificationAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.01, 1], // Shrink to almost nothing as it reaches the icon
              });
              
              const suckOpacity = notificationAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1], // Fade to completely invisible as it reaches the icon
              });
              
              // Calculate left position for proper centering
              const leftPosition = displayX;
              
              return (
                <Animated.View
                  key={notification.id || index}
                  style={[
                    styles.autoNotificationItem,
                    {
                      transform: [
                        { translateY: notificationsAnimating ? suckTranslateY : translateY },
                        { translateX: notificationsAnimating ? suckTranslateX : translateX },
                        { scale: notificationsAnimating ? suckScale : scale },
                      ],
                      opacity: notificationsAnimating ? suckOpacity : opacity,
                      left: leftPosition, // Responsive positioning
                    },
                  ]}
                >
                  <View style={styles.autoNotificationContent}>
                    <View style={styles.autoNotificationIconContainer}>
                      <View style={[
                        styles.autoNotificationIcon,
                        { backgroundColor: notification.type === 'success' ? '#2D5A3D' : 
                                         notification.type === 'warning' ? '#F4D03F' : 
                                         notification.type === 'error' ? '#E8A598' : '#1E3A5F' }
                      ]}>
                        <Ionicons 
                          name={notification.type === 'success' ? 'checkmark' : 
                                notification.type === 'warning' ? 'warning' : 
                                notification.type === 'error' ? 'close' : 'information'} 
                          size={16} 
                          color="#fff" 
                        />
                      </View>
                    </View>
                    
                    <View style={styles.autoNotificationTextContainer}>
                      <Text style={styles.autoNotificationTitle} numberOfLines={1}>
                        {notification.title || 'New Notification'}
                      </Text>
                      <Text style={styles.autoNotificationMessage} numberOfLines={1}>
                        {notification.message || 'You have a new notification'}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8', // Soft cream background
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#1E3A5F', // Deep navy blue
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    position: 'relative' as const, // Enable absolute positioning for children
    elevation: 6,
  },
  menuButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingRight: width < 400 ? 60 : 40, // More padding to prevent overlap
    paddingLeft: width < 400 ? 20 : 0, // Add left padding on mobile
  },
  logo: {
    marginRight: width < 400 ? 8 : 12, // Less margin on mobile
  },
  headerTitle: {
    fontSize: width < 400 ? 20 : 24, // Smaller font on mobile
    fontWeight: 'bold' as const,
    color: '#fff',
    marginRight: width < 400 ? 8 : 12, // Less margin on mobile
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: width < 400 ? 14 : 16, // Smaller font on mobile
    color: '#F4D03F', // Bright yellow
    fontWeight: 'bold' as const,
    backgroundColor: 'rgba(244, 208, 63, 0.2)',
    paddingHorizontal: width < 400 ? 8 : 12, // Smaller padding on mobile
    paddingVertical: width < 400 ? 4 : 6, // Smaller padding on mobile
    borderRadius: 20,
    marginLeft: width < 400 ? 8 : 12, // Add margin on mobile
    marginRight: width < 400 ? 20 : 30, // Add right margin to prevent overlap
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: width < 400 ? 15 : 20, // Minimal margin to prevent overlap
    minWidth: 50, // Ensure minimum width for button
    position: 'absolute' as const, // Position absolutely to prevent flex conflicts
    right: width < 400 ? 15 : 20, // Position from right edge
  },
  notificationButton: {
    position: 'relative' as const,
    padding: width < 400 ? 8 : 12, // Smaller padding on mobile
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    minWidth: width < 400 ? 40 : 48, // Ensure minimum touch target
  },
  notificationBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    backgroundColor: '#E8A598', // Soft coral
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notificationCount: {
    color: '#02050a',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  notificationShine: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 8,
    width: 20,
    height: 20,
  },
  screenContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  sidebar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#1E3A5F', // Deep navy blue
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sidebarHeader: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarLogo: {
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'System',
  },
  sidebarSubtitle: {
    fontSize: 16,
    color: '#F4D03F', // Bright yellow
    fontWeight: '600' as const,
  },
  navigation: {
    flex: 1,
    paddingTop: 8,
  },
  navItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative' as const,
  },
  activeNavItem: {
    backgroundColor: 'rgba(244, 208, 63, 0.15)',
    borderRightWidth: 4,
    borderRightColor: '#F4D03F',
  },
  navText: {
    marginLeft: 16,
    fontSize: 17,
    color: '#fff',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#F4D03F',
    fontWeight: 'bold' as const,
  },
  messageBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 20,
    backgroundColor: '#2D5A3D', // Forest green
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  messageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold' as const,
  },
  notificationSidebarBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 20,
    backgroundColor: '#E8A598', // Soft coral
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notificationSidebarText: {
    color: '#02050a',
    fontSize: 11,
    fontWeight: 'bold' as const,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F4D03F', // Bright yellow
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 16,
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarText: {
    color: '#02050a',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 15,
    color: '#F4D03F',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#E8A598', // Soft coral
    fontWeight: '600',
  },
  // Notification Modal Styles
  notificationModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  notificationModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 350,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  notificationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  clearAllText: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  notificationList: {
    maxHeight: 300,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationIconContainer: {
    marginRight: 12,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  clearNotificationButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearNotificationText: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  viewAllButton: {
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  viewAllText: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  // Auto Notification Popup Styles
  autoNotificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 15,
    justifyContent: 'flex-start',
    alignItems: width < 400 ? 'center' : 'flex-end', // Center on mobile, right on desktop
    paddingTop: 100,
    paddingHorizontal: width < 400 ? 20 : 40, // Add horizontal padding for mobile
  },
  autoNotificationItem: {
    position: 'absolute',
    top: 0, // Will be positioned by transform
    left: 0, // Will be positioned by transform
    width: width < 400 ? Math.min(width - 40, 300) : 320, // Responsive width that fits screen
    maxWidth: width < 400 ? width - 40 : 320, // Ensure it doesn't exceed screen width
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 8,
  },
  autoNotificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  autoNotificationIconContainer: {
    marginRight: 12,
  },
  autoNotificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoNotificationTextContainer: {
    flex: 1,
  },
  autoNotificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 2,
  },
  autoNotificationMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  // Logout Modal Styles
  logoutModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoutModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoutModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginTop: 8,
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  logoutCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Logout Success Animation Styles
  logoutSuccessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutSuccessContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 280,
  },
  logoutSuccessIcon: {
    marginBottom: 20,
    transformOrigin: 'bottom center', // Rotate from bottom center for natural waving
  },
  logoutSuccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5A3D',
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutSuccessMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});