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
  TextInput,
  ActivityIndicator,
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
  const [showNoClassModal, setShowNoClassModal] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [noClassModalAnim] = useState(new Animated.Value(0));
  const [classCodeInput, setClassCodeInput] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [hasCoordinator, setHasCoordinator] = useState<boolean | null>(null);
  const [checkingCoordinator, setCheckingCoordinator] = useState(false);
  const [showClassReminderModal, setShowClassReminderModal] = useState(false);
  const [classReminderMinimized, setClassReminderMinimized] = useState(false);
  const [showLocationReminderModal, setShowLocationReminderModal] = useState(false);
  const [locationReminderMinimized, setLocationReminderMinimized] = useState(false);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);
  const [shouldOpenLocationPicker, setShouldOpenLocationPicker] = useState(false);
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<Record<string, any[]>>({});
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);

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
          
          // Check if user has location set
          const userData = profileResponse.user as any;
          const hasLocationSet = userData.latitude !== null && userData.latitude !== undefined && 
                                 userData.longitude !== null && userData.longitude !== undefined;
          setHasLocation(hasLocationSet);
          
          // Show location reminder modal if no location set
          if (!hasLocationSet) {
            setTimeout(() => {
              setShowLocationReminderModal(true);
            }, 2500); // Show after 2.5 seconds (after class modal if it appears)
          }
          
          // Get student database ID (from students table, not user_id)
          // The profile response should have the student ID in student_id or id field
          const studentIdValue = (profileResponse.user as any).student_id || (profileResponse.user as any).id;
          setStudentId(studentIdValue);
          
          // Check if student has enrolled classes
          // Note: getStudentClasses expects the students.id (database ID), not user_id
          if (studentIdValue) {
            try {
                const classesResponse = await apiService.getStudentClasses(studentIdValue) as any;
              if (classesResponse.success) {
                const classes = classesResponse.classes || [];
                const enrolledClassesList = classes.filter(
                  (cls: any) => cls.enrollmentStatus === 'enrolled'
                );
                setEnrolledClasses(enrolledClassesList);
                
                // Show modal only if no classes enrolled
                if (enrolledClassesList.length === 0) {
                  setTimeout(() => {
                    setShowNoClassModal(true);
                    // Animate modal appearance
                    Animated.timing(noClassModalAnim, {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true,
                    }).start();
                  }, 2000); // Show after 2 seconds
                }
              }
            } catch (error) {
              console.error('Error checking student classes:', error);
              setEnrolledClasses([]);
              // If there's an error (e.g., student not found in students table), show modal anyway
              setTimeout(() => {
                setShowNoClassModal(true);
                Animated.timing(noClassModalAnim, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
              }, 2000);
            }
          } else {
            setEnrolledClasses([]);
            // If no student ID found, show modal anyway
            setTimeout(() => {
              setShowNoClassModal(true);
              Animated.timing(noClassModalAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }, 2000);
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

  const refreshEnrolledClasses = async () => {
    if (!studentId) return;
    
    try {
      const classesResponse = await apiService.getStudentClasses(studentId) as any;
      if (classesResponse.success) {
        const classes = classesResponse.classes || [];
        const enrolledClassesList = classes.filter(
          (cls: any) => cls.enrollmentStatus === 'enrolled'
        );
        setEnrolledClasses(enrolledClassesList);
      }
    } catch (error) {
      console.error('Error refreshing enrolled classes:', error);
    }
  };

  const fetchClassStudents = async (classId: string) => {
    if (!classId || classStudents[classId]) return; // Don't fetch if already loaded
    
    try {
      setLoadingClassStudents(true);
      const response = await apiService.getClassStudents(classId) as any;
      if (response.success && response.students) {
        setClassStudents(prev => ({
          ...prev,
          [classId]: response.students || []
        }));
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const fetchAllClassStudents = async () => {
    if (enrolledClasses.length === 0) return;
    
    try {
      setLoadingClassStudents(true);
      const studentsPromises = enrolledClasses.map((cls: any) => 
        apiService.getClassStudents(cls.id.toString()) as Promise<any>
      );
      
      const responses = await Promise.all(studentsPromises);
      
      const studentsMap: Record<string, any[]> = {};
      responses.forEach((response, index) => {
        if (response.success && response.students) {
          const classId = enrolledClasses[index].id.toString();
          studentsMap[classId] = response.students || [];
        }
      });
      
      setClassStudents(prev => ({ ...prev, ...studentsMap }));
    } catch (error) {
      console.error('Error fetching all class students:', error);
    } finally {
      setLoadingClassStudents(false);
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
        
        // Re-check location status
        const userData = profileResponse.user as any;
        const hasLocationSet = userData.latitude !== null && userData.latitude !== undefined && 
                               userData.longitude !== null && userData.longitude !== undefined;
        setHasLocation(hasLocationSet);
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

  const checkStudentCoordinator = async (studentId: string) => {
    try {
      setCheckingCoordinator(true);
      // Check if student has requirements (which means they have a coordinator)
      const response = await apiService.getStudentRequirements(studentId);
      
      if (response.success && response.requirements && response.requirements.length > 0) {
        // Student has requirements, which means they have a coordinator
        setHasCoordinator(true);
      } else {
        // Check if student is an intern (has coordinator_id in interns table)
        // We can infer this from the requirements response - if no requirements, check intern status
        // For now, if no requirements, assume no coordinator
        setHasCoordinator(false);
      }
    } catch (error) {
      console.error('Error checking student coordinator:', error);
      // On error, assume no coordinator to be safe
      setHasCoordinator(false);
    } finally {
      setCheckingCoordinator(false);
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
            <Ionicons name="menu-outline" size={width < 400 ? 18 : 20} color="#F56E0F" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
          <View style={styles.logo}>
            <Ionicons name="school-outline" size={width < 400 ? 18 : 20} color="#F56E0F" />
          </View>
            <Text style={styles.headerTitle}>InternshipGo</Text>
            <Text style={styles.headerSubtitle}>Student</Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* Class Reminder Button */}
            <TouchableOpacity 
              style={styles.classReminderButton} 
              onPress={async () => {
                // Refresh enrolled classes before showing modal
                await refreshEnrolledClasses();
                setShowClassReminderModal(true);
                // Fetch students for all enrolled classes
                setTimeout(() => {
                  fetchAllClassStudents();
                }, 100);
              }}
            >
              <Ionicons name="school-outline" size={width < 400 ? 16 : 18} color="#fff" />
            </TouchableOpacity>
            
            <Animated.View style={{ transform: [{ scale: notificationIconBounce }] }}>
              <TouchableOpacity style={styles.notificationButton} onPress={toggleNotificationModal}>
                <Ionicons name="notifications-outline" size={width < 400 ? 16 : 18} color="#fff" />
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
            <ProfilePage 
              currentUser={currentUser} 
              autoOpenLocationPicker={shouldOpenLocationPicker}
              onLocationPickerOpened={() => setShouldOpenLocationPicker(false)}
            />
          ) : activeScreen === 'home' ? (
            <DashboardHome 
            currentUser={currentUser} 
            onNavigateToRequirements={() => setActiveScreen('requirements')}
          />
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
            <Ionicons name="school-outline" size={32} color="#F56E0F" />
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

      {/* Class Reminder Modal (Header) */}
      {showClassReminderModal && (
        <TouchableOpacity 
          style={styles.classReminderModalOverlay}
          onPress={() => {
            if (classReminderMinimized) {
              setShowClassReminderModal(false);
              setClassReminderMinimized(false);
            }
          }}
          activeOpacity={1}
        >
          <TouchableOpacity 
            style={styles.classReminderModal}
            onPress={(e) => e.stopPropagation()}
            activeOpacity={1}
          >
            {classReminderMinimized ? (
              <View style={styles.classReminderMinimizedContent}>
                <TouchableOpacity 
                  style={styles.classReminderExpandButton}
                  onPress={() => setClassReminderMinimized(false)}
                >
                  <Ionicons name="school-outline" size={16} color="#F56E0F" />
                  <Text style={styles.classReminderMinimizedText}>Class Reminder</Text>
                  <Ionicons name="chevron-up" size={16} color="#F56E0F" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.classReminderModalContent}>
                <View style={styles.classReminderModalHeader}>
                  <View style={styles.classReminderIconContainer}>
                    <Ionicons name="school-outline" size={24} color="#F56E0F" />
                  </View>
                  <Text style={styles.classReminderModalTitle}>Class Reminder</Text>
                  <TouchableOpacity 
                    style={styles.classReminderMinimizeButton}
                    onPress={() => setClassReminderMinimized(true)}
                  >
                    <Ionicons name="chevron-down" size={20} color="#878787" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.classReminderCloseButton}
                    onPress={() => {
                      setShowClassReminderModal(false);
                      setClassReminderMinimized(false);
                    }}
                  >
                    <Ionicons name="close" size={20} color="#878787" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.classReminderModalBody}>
                  {enrolledClasses.length > 0 ? (
                    // Show enrolled classes
                    <View style={styles.enrolledClassesContainer}>
                      <Text style={styles.enrolledClassesTitle}>
                        Your Enrolled Classes ({enrolledClasses.length})
                      </Text>
                      <ScrollView style={styles.enrolledClassesList} showsVerticalScrollIndicator={false}>
                        {enrolledClasses.map((cls: any, index: number) => {
                          const classId = cls.id?.toString() || '';
                          const students = classStudents[classId] || [];
                          const otherStudents = students.filter((s: any) => s.id?.toString() !== studentId?.toString());
                          const coordinator = cls.coordinator;
                          
                          return (
                            <View key={cls.id || index} style={styles.enrolledClassItem}>
                              <View style={styles.enrolledClassHeader}>
                                <View style={styles.enrolledClassIcon}>
                                  <Ionicons name="school" size={20} color="#F56E0F" />
                                </View>
                                <View style={styles.enrolledClassInfo}>
                                  <Text style={styles.enrolledClassName}>
                                    {cls.className || cls.class_name || 'Unnamed Class'}
                                  </Text>
                                  <Text style={styles.enrolledClassDetails}>
                                    {cls.schoolYear || cls.school_year || 'N/A'} • Code: {cls.classCode || cls.class_code || 'N/A'}
                                  </Text>
                                  {coordinator && (
                                    <View style={styles.coordinatorInfo}>
                                      <Ionicons name="person" size={14} color="#4285f4" />
                                      <Text style={styles.coordinatorText}>
                                        Coordinator: {coordinator.name || 'N/A'}
                                      </Text>
                                    </View>
                                  )}
                                  {otherStudents.length > 0 && (
                                    <View style={styles.enrolledStudentsInfo}>
                                      <Ionicons name="people" size={14} color="#F56E0F" />
                                      <Text style={styles.enrolledStudentsText}>
                                        {otherStudents.length} other intern{otherStudents.length !== 1 ? 's' : ''} enrolled
                                      </Text>
                                    </View>
                                  )}
                                  {loadingClassStudents && students.length === 0 && (
                                    <Text style={styles.loadingStudentsText}>Loading students...</Text>
                                  )}
                                </View>
                                <View style={styles.enrolledClassBadge}>
                                  <Ionicons name="checkmark-circle" size={20} color="#2D5A3D" />
                                </View>
                              </View>
                              
                              {/* Show other enrolled students */}
                              {otherStudents.length > 0 && (
                                <View style={styles.otherStudentsContainer}>
                                  <Text style={styles.otherStudentsTitle}>Other Enrolled Interns:</Text>
                                  <ScrollView 
                                    style={styles.otherStudentsList} 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false}
                                  >
                                    {otherStudents.map((student: any, studentIndex: number) => (
                                      <View key={student.id || studentIndex} style={styles.otherStudentItem}>
                                        <View style={styles.otherStudentAvatar}>
                                          {student.profilePicture ? (
                                            <Image 
                                              source={{ uri: student.profilePicture }} 
                                              style={styles.otherStudentAvatarImage}
                                            />
                                          ) : (
                                            <Text style={styles.otherStudentAvatarText}>
                                              {student.firstName?.charAt(0) || 'S'}{student.lastName?.charAt(0) || 'T'}
                                            </Text>
                                          )}
                                        </View>
                                        <Text style={styles.otherStudentName} numberOfLines={1}>
                                          {student.firstName} {student.lastName}
                                        </Text>
                                      </View>
                                    ))}
                                  </ScrollView>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : (
                    // Show enrollment form if no classes
                    <>
                      <Text style={styles.classReminderModalMessage}>
                        You haven't enrolled in any class yet. Enter the class code provided by your coordinator to enroll.
                      </Text>
                      
                      <View style={styles.classCodeInputContainer}>
                        <Text style={styles.classCodeLabel}>Class Code</Text>
                        <TextInput
                          style={[
                            styles.classCodeInput,
                            enrollError && styles.classCodeInputError
                          ]}
                          placeholder="Enter 6-character code"
                          placeholderTextColor="#878787"
                          value={classCodeInput}
                          onChangeText={(text) => {
                            setClassCodeInput(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                            setEnrollError('');
                          }}
                          maxLength={6}
                          autoCapitalize="characters"
                          editable={!enrolling}
                        />
                        {enrollError ? (
                          <Text style={styles.enrollErrorText}>{enrollError}</Text>
                        ) : null}
                      </View>
                    </>
                  )}
                </View>
                
                <View style={styles.classReminderModalFooter}>
                  {enrolledClasses.length > 0 ? (
                    // Show close button if enrolled
                    <TouchableOpacity 
                      style={styles.noClassModalCancelButton}
                      onPress={() => {
                        setShowClassReminderModal(false);
                        setClassReminderMinimized(false);
                      }}
                    >
                      <Text style={styles.noClassModalCancelText}>Close</Text>
                    </TouchableOpacity>
                  ) : (
                    // Show enroll form buttons if not enrolled
                    <>
                      <TouchableOpacity 
                        style={[
                          styles.noClassModalButton,
                          enrolling && styles.noClassModalButtonDisabled
                        ]}
                        onPress={async () => {
                          if (enrolling) return;
                          
                          if (!classCodeInput || classCodeInput.length !== 6) {
                            setEnrollError('Please enter a valid 6-character class code');
                            return;
                          }
                          
                          if (!studentId) {
                            setEnrollError('Student information not available');
                            return;
                          }
                          
                          try {
                            setEnrolling(true);
                            setEnrollError('');
                            
                            const response = await apiService.enrollStudent(classCodeInput, studentId) as any;
                            
                            if (response.success) {
                              setEnrollSuccess(true);
                              // Refresh enrolled classes after successful enrollment
                              if (studentId) {
                                try {
                                  const classesResponse = await apiService.getStudentClasses(studentId) as any;
                                  if (classesResponse.success) {
                                    const classes = classesResponse.classes || [];
                                    const enrolledClassesList = classes.filter(
                                      (cls: any) => cls.enrollmentStatus === 'enrolled'
                                    );
                                    setEnrolledClasses(enrolledClassesList);
                                  }
                                } catch (error) {
                                  console.error('Error refreshing classes:', error);
                                }
                              }
                              // Close modal after 2 seconds and refresh
                              setTimeout(async () => {
                                if (currentUser?.id) {
                                  try {
                                    const profileResponse = await apiService.getProfile(currentUser.id);
                                    if (profileResponse.success && profileResponse.user) {
                                      const studentIdValue = (profileResponse.user as any).student_id || (profileResponse.user as any).id;
                                      if (studentIdValue) {
                                        setStudentId(studentIdValue);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error refreshing profile:', error);
                                  }
                                }
                                
                                setShowClassReminderModal(false);
                                setClassReminderMinimized(false);
                                setClassCodeInput('');
                                setEnrollError('');
                                setEnrollSuccess(false);
                              }, 2000);
                            } else {
                              setEnrollError(response.message || 'Failed to enroll in class. Please check the code and try again.');
                            }
                          } catch (error: any) {
                            console.error('Error enrolling in class:', error);
                            setEnrollError(error.message || 'An error occurred. Please try again.');
                          } finally {
                            setEnrolling(false);
                          }
                        }}
                        disabled={enrolling}
                      >
                        {enrolling ? (
                          <View style={styles.enrollButtonContent}>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={styles.noClassModalButtonText}>Enrolling...</Text>
                          </View>
                        ) : (
                          <Text style={styles.noClassModalButtonText}>Enroll</Text>
                        )}
                      </TouchableOpacity>
                      
                      {!enrolling && (
                        <TouchableOpacity 
                          style={styles.noClassModalCancelButton}
                          onPress={() => {
                            setClassReminderMinimized(true);
                          }}
                        >
                          <Text style={styles.noClassModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Location Reminder Modal (Header) */}
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
                    setLocationReminderMinimized(false);
                    // Set flag to open location picker when profile page loads
                    setShouldOpenLocationPicker(true);
                    // Navigate to profile page
                    handleNavigation('profile');
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

      {/* No Class Reminder Modal */}
      {showNoClassModal && (
        <TouchableOpacity 
          style={styles.noClassModalOverlay}
          onPress={() => {
            if (!enrolling && !enrollSuccess) {
              Animated.timing(noClassModalAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                setShowNoClassModal(false);
                setClassCodeInput('');
                setEnrollError('');
                setEnrollSuccess(false);
              });
            }
          }}
          activeOpacity={1}
        >
          <TouchableOpacity 
            style={styles.noClassModal}
            onPress={(e) => e.stopPropagation()}
            activeOpacity={1}
          >
            <Animated.View
              style={[
                styles.noClassModalContent,
                {
                  opacity: noClassModalAnim,
                  transform: [
                    {
                      scale: noClassModalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {!enrollSuccess ? (
                <>
                  <View style={styles.noClassModalHeader}>
                    <View style={styles.noClassIconContainer}>
                      <Ionicons name="school-outline" size={48} color="#F56E0F" />
                    </View>
                    <Text style={styles.noClassModalTitle}>No Class Enrolled</Text>
                  </View>
                  
                  <View style={styles.noClassModalBody}>
                    <Text style={styles.noClassModalMessage}>
                      You haven't enrolled in any class yet. Enter the class code provided by your coordinator to enroll.
                    </Text>
                    
                    <View style={styles.classCodeInputContainer}>
                      <Text style={styles.classCodeLabel}>Class Code</Text>
                      <TextInput
                        style={[
                          styles.classCodeInput,
                          enrollError && styles.classCodeInputError
                        ]}
                        placeholder="Enter 6-character code"
                        placeholderTextColor="#878787"
                        value={classCodeInput}
                        onChangeText={(text) => {
                          setClassCodeInput(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                          setEnrollError('');
                        }}
                        maxLength={6}
                        autoCapitalize="characters"
                        editable={!enrolling}
                      />
                      {enrollError ? (
                        <Text style={styles.enrollErrorText}>{enrollError}</Text>
                      ) : null}
                    </View>
                  </View>
                  
                  <View style={styles.noClassModalFooter}>
                    <TouchableOpacity 
                      style={[
                        styles.noClassModalButton,
                        enrolling && styles.noClassModalButtonDisabled
                      ]}
                      onPress={async () => {
                        if (enrolling) return;
                        
                        if (!classCodeInput || classCodeInput.length !== 6) {
                          setEnrollError('Please enter a valid 6-character class code');
                          return;
                        }
                        
                        if (!studentId) {
                          setEnrollError('Student information not available');
                          return;
                        }
                        
                        try {
                          setEnrolling(true);
                          setEnrollError('');
                          
                          const response = await apiService.enrollStudent(classCodeInput, studentId) as any;
                          
                          if (response.success) {
                            setEnrollSuccess(true);
                            // Close modal after 2 seconds and refresh
                            setTimeout(async () => {
                              // Re-fetch user data to refresh classes
                              // This will check if student now has classes and won't show modal again
                              if (currentUser?.id) {
                                try {
                                  const profileResponse = await apiService.getProfile(currentUser.id);
                                  if (profileResponse.success && profileResponse.user) {
                                    const studentIdValue = (profileResponse.user as any).student_id || (profileResponse.user as any).id;
                                    if (studentIdValue) {
                                      setStudentId(studentIdValue);
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error refreshing profile:', error);
                                }
                              }
                              
                              Animated.timing(noClassModalAnim, {
                                toValue: 0,
                                duration: 200,
                                useNativeDriver: true,
                              }).start(() => {
                                setShowNoClassModal(false);
                                setClassCodeInput('');
                                setEnrollError('');
                                setEnrollSuccess(false);
                              });
                            }, 2000);
                          } else {
                            setEnrollError(response.message || 'Failed to enroll in class. Please check the code and try again.');
                          }
                        } catch (error: any) {
                          console.error('Error enrolling in class:', error);
                          setEnrollError(error.message || 'An error occurred. Please try again.');
                        } finally {
                          setEnrolling(false);
                        }
                      }}
                      disabled={enrolling}
                    >
                      {enrolling ? (
                        <View style={styles.enrollButtonContent}>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.noClassModalButtonText}>Enrolling...</Text>
                        </View>
                      ) : (
                        <Text style={styles.noClassModalButtonText}>Enroll</Text>
                      )}
                    </TouchableOpacity>
                    
                    {!enrolling && (
                      <TouchableOpacity 
                        style={styles.noClassModalCancelButton}
                        onPress={() => {
                          Animated.timing(noClassModalAnim, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: true,
                          }).start(() => {
                            setShowNoClassModal(false);
                            setClassCodeInput('');
                            setEnrollError('');
                            setEnrollSuccess(false);
                          });
                        }}
                      >
                        <Text style={styles.noClassModalCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.noClassModalHeader}>
                    <View style={[styles.noClassIconContainer, styles.successIconContainer]}>
                      <Ionicons name="checkmark-circle" size={48} color="#2D5A3D" />
                    </View>
                    <Text style={styles.noClassModalTitle}>Enrollment Successful!</Text>
                  </View>
                  
                  <View style={styles.noClassModalBody}>
                    <Text style={styles.noClassModalMessage}>
                      You have successfully enrolled in the class. The modal will close shortly.
                    </Text>
                  </View>
                </>
              )}
            </Animated.View>
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
    backgroundColor: '#151419', // Dark background
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1B1B1E', // Dark secondary background
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    position: 'relative' as const, // Enable absolute positioning for children
    elevation: 6,
  },
  menuButton: {
    padding: 8,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
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
    marginRight: width < 400 ? 6 : 8, // Less margin on mobile
  },
  headerTitle: {
    fontSize: width < 400 ? 16 : 18, // Smaller font
    fontWeight: 'bold' as const,
    color: '#fff',
    marginRight: width < 400 ? 6 : 8, // Less margin on mobile
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: width < 400 ? 11 : 12, // Smaller font
    color: '#F56E0F', // Primary orange
    fontWeight: 'bold' as const,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    paddingHorizontal: width < 400 ? 6 : 8, // Smaller padding
    paddingVertical: width < 400 ? 3 : 4, // Smaller padding
    borderRadius: 12,
    marginLeft: width < 400 ? 6 : 8, // Add margin on mobile
    marginRight: width < 400 ? 20 : 30, // Add right margin to prevent overlap
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginRight: width < 400 ? 15 : 20, // Minimal margin to prevent overlap
    minWidth: 50, // Ensure minimum width for button
    position: 'absolute' as const, // Position absolutely to prevent flex conflicts
    right: width < 400 ? 15 : 20, // Position from right edge
  },
  locationReminderButton: {
    position: 'relative' as const,
    padding: width < 400 ? 6 : 8, // Smaller padding
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
    minWidth: width < 400 ? 36 : 40, // Smaller minimum touch target
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  classReminderButton: {
    position: 'relative' as const,
    padding: width < 400 ? 6 : 8, // Smaller padding
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
    minWidth: width < 400 ? 36 : 40, // Smaller minimum touch target
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  notificationButton: {
    position: 'relative' as const,
    padding: width < 400 ? 6 : 8, // Smaller padding
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
    minWidth: width < 400 ? 36 : 40, // Smaller minimum touch target
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  notificationBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notificationCount: {
    color: '#FBFBFB', // Light text
    fontSize: 10,
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
    backgroundColor: '#1B1B1E', // Dark secondary background
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
    color: '#fff',
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
    color: '#fff',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#F56E0F',
    fontWeight: 'bold' as const,
  },
  messageBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 20,
    backgroundColor: '#F56E0F', // Primary orange
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
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notificationSidebarText: {
    color: '#FBFBFB', // Light text
    fontSize: 11,
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
    marginBottom: 20,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F56E0F', // Primary orange
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
    color: '#FBFBFB', // Light text
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
    borderColor: '#F56E0F', // Primary orange
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '600' as const,
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
    position: 'absolute',
    top: 70,
    right: width < 400 ? 20 : 30,
    backgroundColor: '#1B1B1E', // Dark secondary background
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
  clearAllText: {
    color: '#F56E0F', // Primary orange
    fontSize: 14,
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
    color: '#FBFBFB', // Light text
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#F56E0F', // Primary orange
    marginLeft: 4,
  },
  clearNotificationButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearNotificationText: {
    color: '#F56E0F', // Primary orange
    fontSize: 12,
    fontWeight: '500',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoNotificationTextContainer: {
    flex: 1,
  },
  autoNotificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 2,
  },
  autoNotificationMessage: {
    fontSize: 12,
    color: '#878787', // Muted gray
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
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    width: '100%',
    maxWidth: 350,
    elevation: 10,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
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
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#2A2A2E', // Dark input/gray background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  logoutCancelText: {
    color: '#878787', // Muted gray
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 8,
  },
  logoutConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  logoutSuccessIcon: {
    marginBottom: 20,
  },
  logoutSuccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 12,
    textAlign: 'center',
  },
  logoutSuccessMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  // No Class Modal Styles
  noClassModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noClassModal: {
    width: '100%',
    maxWidth: 400,
  },
  noClassModalContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  noClassModalHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  noClassIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  noClassModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FBFBFB',
    textAlign: 'center',
  },
  noClassModalBody: {
    padding: 24,
  },
  noClassModalMessage: {
    fontSize: 16,
    color: '#FBFBFB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  noClassModalSubMessage: {
    fontSize: 14,
    color: '#878787',
    textAlign: 'center',
    lineHeight: 20,
  },
  noClassModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
  },
  noClassModalButton: {
    backgroundColor: '#F56E0F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noClassModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noClassModalButtonDisabled: {
    opacity: 0.6,
  },
  noClassModalCancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  noClassModalCancelText: {
    color: '#878787',
    fontSize: 16,
    fontWeight: '600',
  },
  classCodeInputContainer: {
    marginTop: 20,
  },
  classCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 8,
  },
  classCodeInput: {
    backgroundColor: '#2A2A2E',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#FBFBFB',
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  classCodeInputError: {
    borderColor: '#E8A598',
  },
  enrollErrorText: {
    color: '#E8A598',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  enrollButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successIconContainer: {
    backgroundColor: 'rgba(45, 90, 61, 0.2)',
    borderColor: 'rgba(45, 90, 61, 0.3)',
  },
  checkingCoordinatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  checkingCoordinatorText: {
    fontSize: 14,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  noCoordinatorWarning: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noCoordinatorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F4D03F',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  noCoordinatorMessage: {
    fontSize: 14,
    color: '#FBFBFB',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  noCoordinatorSubMessage: {
    fontSize: 12,
    color: '#878787',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // Class Reminder Modal (Header) Styles
  classReminderModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 30,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: width < 400 ? 20 : 30,
  },
  classReminderModal: {
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
  classReminderModalContent: {
    overflow: 'hidden',
  },
  classReminderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  classReminderIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classReminderModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  classReminderMinimizeButton: {
    padding: 4,
    marginRight: 8,
  },
  classReminderCloseButton: {
    padding: 4,
  },
  classReminderModalBody: {
    padding: 20,
  },
  classReminderModalMessage: {
    fontSize: 14,
    color: '#FBFBFB',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  classReminderModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
  },
  classReminderMinimizedContent: {
    padding: 12,
  },
  classReminderExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  classReminderMinimizedText: {
    flex: 1,
    fontSize: 14,
    color: '#F56E0F',
    fontWeight: '600',
  },
  // Location Reminder Modal (Header) Styles
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
  locationReminderMinimizeButton: {
    padding: 4,
    marginRight: 8,
  },
  locationReminderCloseButton: {
    padding: 4,
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
    marginBottom: 12,
  },
  locationReminderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationReminderMinimizedContent: {
    padding: 12,
  },
  locationReminderExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  locationReminderMinimizedText: {
    flex: 1,
    fontSize: 14,
    color: '#F56E0F',
    fontWeight: '600',
  },
  // Enrolled Classes Display Styles
  enrolledClassesContainer: {
    width: '100%',
  },
  enrolledClassesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 16,
    textAlign: 'center',
  },
  enrolledClassesList: {
    maxHeight: 200,
  },
  enrolledClassItem: {
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  enrolledClassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enrolledClassIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  enrolledClassInfo: {
    flex: 1,
  },
  enrolledClassName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  enrolledClassDetails: {
    fontSize: 12,
    color: '#878787',
  },
  enrolledClassBadge: {
    marginLeft: 8,
  },
  coordinatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  coordinatorText: {
    fontSize: 12,
    color: '#4285f4',
    fontWeight: '500',
  },
  enrolledStudentsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  enrolledStudentsText: {
    fontSize: 12,
    color: '#F56E0F',
    fontWeight: '500',
  },
  loadingStudentsText: {
    fontSize: 11,
    color: '#878787',
    fontStyle: 'italic',
    marginTop: 4,
  },
  otherStudentsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
  },
  otherStudentsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 8,
  },
  otherStudentsList: {
    flexDirection: 'row',
  },
  otherStudentItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 60,
  },
  otherStudentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  otherStudentAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  otherStudentAvatarText: {
    color: '#FBFBFB',
    fontSize: 14,
    fontWeight: 'bold',
  },
  otherStudentName: {
    fontSize: 10,
    color: '#878787',
    textAlign: 'center',
  },
});