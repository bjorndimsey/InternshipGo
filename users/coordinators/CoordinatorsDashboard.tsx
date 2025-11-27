import React, { useState, useEffect, useRef } from 'react';
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
import InternsPage from './pages/InternsPage';
import CompaniesPage from './pages/CompaniesPage';
import EventsPage from './pages/EventsPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import SubmissionsPage from './pages/SubmissionsPage';
import AttendanceTimeline from './pages/AttendanceTimeline';
import EvidencesPage from './pages/EvidencesPage';
import AssignedCompaniesPage from './pages/AssignedCompaniesPage';
import { apiService } from '../../lib/api';

const { width, height } = Dimensions.get('window');

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  id: string;
  user_type: string;
}

interface CoordinatorsDashboardProps {
  onLogout: () => void;
  currentUser: UserInfo | null;
}

type MenuItem = {
  name: string;
  screen: string;
  icon: string;
};

const navigationItems: MenuItem[] = [
  { name: 'Dashboard', screen: 'Dashboard', icon: 'home-outline' },
  { name: 'Interns', screen: 'Interns', icon: 'school-outline' },
  { name: 'Companies', screen: 'Companies', icon: 'business-outline' },
  { name: 'Events', screen: 'Events', icon: 'calendar-outline' },
  { name: 'Submissions', screen: 'Submissions', icon: 'document-text-outline' },
  { name: 'Messages', screen: 'Messages', icon: 'chatbubbles-outline' },
  { name: 'Notifications', screen: 'Notifications', icon: 'notifications-outline' },
  { name: 'Profile', screen: 'Profile', icon: 'person-outline' },
];

type SubMenuItem = {
  name: string;
  screen: string;
  icon: string;
  parent: string;
};

const subMenuItems: SubMenuItem[] = [
  { name: 'Interns List', screen: 'Interns', icon: 'people-outline', parent: 'Interns' },
  { name: 'Attendance Timeline', screen: 'AttendanceTimeline', icon: 'calendar-outline', parent: 'Interns' },
  { name: 'Evidence Submissions', screen: 'Evidences', icon: 'document-text-outline', parent: 'Interns' },
];

export default function CoordinatorsDashboard({ onLogout, currentUser }: CoordinatorsDashboardProps) {
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(0));
  const [expandedMenus, setExpandedMenus] = useState<{[key: string]: boolean}>({});
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const navigationScrollRef = useRef<ScrollView>(null);
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
  const [selectedIntern, setSelectedIntern] = useState<any>(null);
  const [showLocationReminderModal, setShowLocationReminderModal] = useState(false);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);
  const [shouldOpenLocationPicker, setShouldOpenLocationPicker] = useState(false);

  // Fetch user profile and unread counts when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser?.id) return;

      try {
        // Fetch user profile
        const profileResponse = await apiService.getProfile(currentUser.id);
        if (profileResponse.success && profileResponse.user) {
          console.log('🔍 Coordinator dashboard profile data:', profileResponse.user);
          console.log('🔍 Profile picture field:', profileResponse.user.profile_picture, profileResponse.user.profilePicture);
          
          const profileData = {
            first_name: profileResponse.user.first_name || profileResponse.user.firstName || '',
            last_name: profileResponse.user.last_name || profileResponse.user.lastName || '',
            profile_picture: profileResponse.user.profile_picture || profileResponse.user.profilePicture,
          };
          console.log('🔍 Setting user profile data:', profileData);
          setUserProfile(profileData);
          
          // Check if user has location set
          const userData = profileResponse.user as any;
          const hasLocationSet = userData.latitude !== null && userData.latitude !== undefined && 
                                 userData.longitude !== null && userData.longitude !== undefined;
          setHasLocation(hasLocationSet);
          
          // Show location reminder modal if no location set
          if (!hasLocationSet) {
            setTimeout(() => {
              setShowLocationReminderModal(true);
            }, 2500); // Show after 2.5 seconds
          }
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
        const coordinatorResponse = await apiService.getCoordinatorProfileByUserId(currentUser.id);
        if (coordinatorResponse.success && coordinatorResponse.user) {
          const coordinatorId = coordinatorResponse.user.id;
          const notificationsResponse = await apiService.getCoordinatorNotifications(coordinatorId, currentUser.id) as any;
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

  const toggleMenuExpansion = (menuName: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
    
    // Scroll to the expanded menu after a short delay to allow for animation
    setTimeout(() => {
      if (navigationScrollRef.current) {
        navigationScrollRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleNavigation = (screenName: string) => {
    setActiveScreen(screenName);
    if (sidebarVisible) {
      toggleSidebar();
    }
    
    // Scroll to the active item when navigating to a submenu
    if (screenName === 'AttendanceTimeline') {
      setTimeout(() => {
        if (navigationScrollRef.current) {
          navigationScrollRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
    
    // Refresh unread counts when navigating to messages or notifications
    if (screenName === 'Messages' || screenName === 'Notifications') {
      refreshUnreadCounts();
    }
    
    // Refresh user profile when navigating to profile page
    if (screenName === 'Profile') {
      refreshUserProfile();
    }
  };

  const refreshUserProfileWithLocation = async () => {
    if (!currentUser?.id) return;

    try {
      const profileResponse = await apiService.getProfile(currentUser.id);
      if (profileResponse.success && profileResponse.user) {
        const userData = profileResponse.user as any;
        const hasLocationSet = userData.latitude !== null && userData.latitude !== undefined && 
                               userData.longitude !== null && userData.longitude !== undefined;
        setHasLocation(hasLocationSet);
        
        if (hasLocationSet) {
          setShowLocationReminderModal(false);
        }
      }
    } catch (error) {
      console.error('Error refreshing user profile with location:', error);
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
        console.log('🔄 Refreshing coordinator profile:', profileResponse.user);
        setUserProfile({
          first_name: profileResponse.user.first_name || profileResponse.user.firstName || '',
          last_name: profileResponse.user.last_name || profileResponse.user.lastName || '',
          profile_picture: profileResponse.user.profile_picture || profileResponse.user.profilePicture,
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

  const renderScreen = () => {
    switch (activeScreen) {
      case 'Dashboard':
        return <DashboardHome currentUser={currentUser} />;
      case 'Interns':
        return <InternsPage 
          currentUser={currentUser} 
          onViewAssignedCompanies={(intern) => {
            setSelectedIntern(intern);
            setActiveScreen('AssignedCompanies');
          }}
        />;
      case 'AssignedCompanies':
        return <AssignedCompaniesPage 
          currentUser={currentUser} 
          selectedIntern={selectedIntern}
          onBack={() => {
            setActiveScreen('Interns');
            setSelectedIntern(null);
          }}
        />;
      case 'AttendanceTimeline':
        return currentUser ? <AttendanceTimeline currentUser={currentUser} /> : <DashboardHome currentUser={currentUser} />;
      case 'Evidences':
        return currentUser ? <EvidencesPage currentUser={currentUser} /> : <DashboardHome currentUser={currentUser} />;
      case 'Companies':
        return <CompaniesPage currentUser={currentUser} />;
      case 'Events':
        return <EventsPage currentUser={currentUser} />;
      case 'Submissions':
        return <SubmissionsPage currentUser={currentUser} />;
      case 'Messages':
        return <MessagesPage currentUser={currentUser} onUnreadCountChange={handleUnreadCountChange} />;
      case 'Notifications':
        return <NotificationsPage currentUser={currentUser} onUnreadCountChange={handleUnreadNotificationCountChange} />;
      case 'Profile':
        return <ProfilePage 
          currentUser={currentUser} 
          autoOpenLocationPicker={shouldOpenLocationPicker}
          onLocationPickerOpened={() => {
            setShouldOpenLocationPicker(false);
            refreshUserProfileWithLocation();
          }}
        />;
      default:
        return <DashboardHome currentUser={currentUser} />;
    }
  };

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
            <Ionicons name="menu-outline" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.logo}>
              <Ionicons name="school-outline" size={24} color="#FF8400" />
            </View>
            <Text style={styles.headerTitle}>InternshipGo</Text>
            <Text style={styles.headerSubtitle}>Coordinator</Text>
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
          {renderScreen()}
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
          <Text style={styles.sidebarSubtitle}>Coordinator Dashboard</Text>
        </View>

        <ScrollView 
          ref={navigationScrollRef}
          style={styles.navigation}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.navigationContent}
        >
          {navigationItems.map((item) => {
            const hasSubMenu = subMenuItems.some(subItem => subItem.parent === item.name);
            const isExpanded = expandedMenus[item.name];
            
            return (
              <View key={item.name}>
                <TouchableOpacity
                  style={[
                    styles.navItem,
                    activeScreen === item.screen && styles.activeNavItem
                  ]}
                  onPress={() => hasSubMenu ? toggleMenuExpansion(item.name) : handleNavigation(item.screen)}
                >
                  <Ionicons 
                    name={item.icon as any} 
                    size={20} 
                    color={activeScreen === item.screen ? '#FF8400' : '#666'} 
                  />
                  <Text style={[
                    styles.navText,
                    activeScreen === item.screen && styles.activeNavText
                  ]}>
                    {item.name}
                  </Text>
                  {hasSubMenu && (
                    <Ionicons 
                      name={isExpanded ? "chevron-down" : "chevron-forward"} 
                      size={16} 
                      color={activeScreen === item.screen ? '#FF8400' : '#666'} 
                      style={styles.subMenuIcon}
                    />
                  )}
                  {item.name === 'Messages' && unreadMessageCount > 0 && (
                    <View style={styles.messageBadge}>
                      <Text style={styles.messageBadgeText}>{unreadMessageCount}</Text>
                    </View>
                  )}
                  {item.name === 'Notifications' && unreadNotificationCount > 0 && (
                    <View style={styles.notificationSidebarBadge}>
                      <Text style={styles.notificationSidebarText}>{unreadNotificationCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* Sub Menu Items */}
                {hasSubMenu && isExpanded && (
                  <View style={styles.subMenu}>
                    {subMenuItems
                      .filter(subItem => subItem.parent === item.name)
                      .map((subItem) => (
                        <TouchableOpacity
                          key={subItem.name}
                          style={[
                            styles.subNavItem,
                            activeScreen === subItem.screen && styles.activeSubNavItem
                          ]}
                          onPress={() => handleNavigation(subItem.screen)}
                        >
                          <Ionicons 
                            name={subItem.icon as any} 
                            size={16} 
                            color={activeScreen === subItem.screen ? '#FF8400' : '#999'} 
                          />
                          <Text style={[
                            styles.subNavText,
                            activeScreen === subItem.screen && styles.activeSubNavText
                          ]}>
                            {subItem.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.sidebarFooter}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              {userProfile?.profile_picture ? (
                <Image 
                  source={{ uri: userProfile.profile_picture }} 
                  style={styles.userAvatarImage}
                  onLoad={() => console.log('✅ Profile picture loaded successfully')}
                  onError={(error) => console.log('❌ Profile picture failed to load:', error)}
                />
              ) : (
                <Text style={styles.userAvatarText}>
                  {userProfile?.first_name?.charAt(0) || currentUser?.email?.charAt(0) || 'C'}
                  {userProfile?.last_name?.charAt(0) || ''}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {userProfile?.first_name && userProfile?.last_name 
                  ? `${userProfile.first_name} ${userProfile.last_name}`
                  : currentUser?.email?.split('@')[0] || 'Coordinator'
                }
              </Text>
              <Text style={styles.userRole}>Internship Coordinator</Text>
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
          {/* Arrow pointing from notification icon to modal */}
          <View style={styles.notificationArrow} />
          
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
                handleNavigation('Notifications');
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

      {/* Location Reminder Modal */}
      {showLocationReminderModal && (
        <TouchableOpacity 
          style={styles.locationReminderModalOverlay}
          onPress={() => {
            // Prevent dismissing modal by clicking outside - location is mandatory
          }}
          activeOpacity={1}
        >
          <TouchableOpacity 
            style={styles.locationReminderModal}
            onPress={(e) => e.stopPropagation()}
            activeOpacity={1}
          >
            <View style={styles.locationReminderModalContent}>
              <View style={styles.locationReminderModalHeader}>
                <View style={styles.locationReminderIconContainer}>
                  <Ionicons name="location-outline" size={24} color="#F56E0F" />
                </View>
                <Text style={styles.locationReminderModalTitle}>Location Reminder</Text>
              </View>
              
              <View style={styles.locationReminderModalBody}>
                <Text style={styles.locationReminderModalMessage}>
                  You haven't set your location yet. Setting your location helps coordinators and companies find you for internship opportunities.
                </Text>
              </View>
              
              <View style={styles.locationReminderModalFooter}>
                <TouchableOpacity 
                  style={styles.locationReminderNavigateButton}
                  onPress={() => {
                    setShowLocationReminderModal(false);
                    // Set flag to open location picker when profile page loads
                    setShouldOpenLocationPicker(true);
                    // Navigate to profile page
                    handleNavigation('Profile');
                  }}
                >
                  <Ionicons name="location" size={18} color="#fff" />
                  <Text style={styles.locationReminderButtonText}>Set Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
                    
                    <Text style={styles.autoNotificationText} numberOfLines={2}>
                      {notification.title || 'New Notification'}
                    </Text>
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
    backgroundColor: '#151419', // Dark background
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
    backgroundColor: '#151419', // Dark background
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    position: 'relative' as const, // Enable absolute positioning for children
    elevation: 6,
  },
  menuButton: {
    padding: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
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
    color: '#FBFBFB', // Light text
    marginRight: width < 400 ? 8 : 12, // Less margin on mobile
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: width < 400 ? 14 : 16, // Smaller font on mobile
    color: '#F56E0F', // Primary orange
    fontWeight: 'bold' as const,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
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
    backgroundColor: '#151419', // Dark background
    zIndex: 2,
    shadowColor: '#F56E0F',
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
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  sidebarLogo: {
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#FBFBFB', // Light text
    marginBottom: 4,
    fontFamily: 'System',
  },
  sidebarSubtitle: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '600' as const,
  },
  navigation: {
    flex: 1,
    paddingTop: 8,
  },
  navigationContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  navItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
    position: 'relative' as const,
  },
  activeNavItem: {
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRightWidth: 4,
    borderRightColor: '#F56E0F',
  },
  navText: {
    marginLeft: 16,
    fontSize: 17,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  activeNavText: {
    color: '#F56E0F', // Primary orange
    fontWeight: 'bold' as const,
  },
  subMenuIcon: {
    marginLeft: 'auto',
  },
  subMenu: {
    backgroundColor: 'rgba(245, 110, 15, 0.05)',
    borderLeftWidth: 2,
    borderLeftColor: '#F56E0F',
    marginLeft: 20,
  },
  subNavItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.1)',
  },
  activeSubNavItem: {
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  subNavText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#878787', // Muted gray
    fontWeight: '400',
  },
  activeSubNavText: {
    color: '#F56E0F', // Primary orange
    fontWeight: '600' as const,
  },
  messageBadge: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 8,
  },
  messageBadgeText: {
    color: '#FBFBFB', // Light text
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  notificationSidebarBadge: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 8,
  },
  notificationSidebarText: {
    color: '#FBFBFB', // Light text
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
    padding: 24,
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F56E0F', // Primary orange
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  userAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarText: {
    color: '#FBFBFB', // Light text
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FBFBFB', // Light text
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#F56E0F', // Primary orange
    fontWeight: '500' as const,
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#878787', // Muted gray
    backgroundColor: 'rgba(135, 135, 135, 0.2)',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#878787', // Muted gray
    fontWeight: '600' as const,
  },
  // Notification Animation Styles
  notificationAnimationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  autoNotificationItem: {
    position: 'absolute',
    top: 0, // Will be positioned by transform
    left: 0, // Will be positioned by transform
    width: width < 400 ? Math.min(width - 40, 300) : 320, // Responsive width that fits screen
    maxWidth: width < 400 ? width - 40 : 320, // Ensure it doesn't exceed screen width
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 12,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
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
    backgroundColor: '#F56E0F', // Primary orange
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoNotificationText: {
    flex: 1,
    color: '#FBFBFB', // Light text
    fontSize: 14,
    fontWeight: '500',
  },
  // Notification Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notificationModalContent: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  notificationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  notificationList: {
    maxHeight: 400,
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#878787', // Muted gray
    marginTop: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.1)',
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
    color: '#FBFBFB', // Light text for better contrast
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: '500',
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#F56E0F', // Orange for better visibility
    marginLeft: 4,
    fontWeight: '600',
  },
  // Additional missing styles
  notificationModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  notificationArrow: {
    position: 'absolute',
    top: 60,
    right: width < 400 ? 45 : 55,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1B1B1E', // Dark background to match modal
    zIndex: 1001,
  },
  notificationModal: {
    position: 'absolute',
    top: 70,
    right: width < 400 ? 20 : 30,
    backgroundColor: '#1B1B1E', // Dark background
    borderRadius: 12,
    width: width < 400 ? width - 40 : 350,
    maxHeight: 500,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  clearAllText: {
    color: '#F56E0F', // Primary orange
    fontSize: 14,
    fontWeight: '600',
  },
  clearNotificationButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearNotificationText: {
    color: '#F56E0F', // Primary orange
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  viewAllText: {
    color: '#F56E0F', // Primary orange
    fontSize: 14,
    fontWeight: '600',
  },
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
    padding: 20,
  },
  logoutModal: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    width: '100%',
    maxWidth: 350,
    elevation: 10,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoutModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    textAlign: 'center',
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#878787', // Muted gray
    textAlign: 'center',
    marginTop: 8,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 20,
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  logoutCancelText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#dc3545',
    borderRadius: 8,
  },
  logoutConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
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
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    maxWidth: 300,
    elevation: 20,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoutSuccessIcon: {
    marginBottom: 20,
  },
  logoutSuccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 12,
    textAlign: 'center',
  },
  logoutSuccessMessage: {
    fontSize: 16,
    color: '#878787', // Muted gray
    textAlign: 'center',
    lineHeight: 24,
  },
  autoNotificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  // Location Reminder Modal Styles
  locationReminderModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationReminderModal: {
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    width: width < 400 ? width - 40 : 400,
    maxWidth: 400,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  locationReminderModalContent: {
    overflow: 'hidden',
  },
  locationReminderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  locationReminderIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationReminderModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  locationReminderModalBody: {
    padding: 20,
  },
  locationReminderModalMessage: {
    fontSize: 14,
    color: '#FBFBFB',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  locationReminderModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
  },
  locationReminderNavigateButton: {
    backgroundColor: '#F56E0F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  locationReminderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});