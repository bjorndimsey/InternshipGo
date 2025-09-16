import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import DashboardHome from './pages/DashboardHome';
import InternsPage from './pages/InternsPage';
import CoordinatorsPage from './pages/CoordinatorsPage';
import ApplicationsPage from './pages/ApplicationsPage';
import EventsPage from './pages/EventsPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

const { width, height } = Dimensions.get('window');

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  id: string;
}

interface CompanyDashboardProps {
  onLogout: () => void;
  currentUser: UserInfo | null;
}

type MenuItem = {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<any>;
};

const navigationItems: MenuItem[] = [
  { id: 'home', title: 'Dashboard', icon: 'home-outline', component: DashboardHome },
  { id: 'interns', title: 'Interns', icon: 'school-outline', component: InternsPage },
  { id: 'coordinators', title: 'Coordinators', icon: 'people-outline', component: CoordinatorsPage },
  { id: 'applications', title: 'Applications', icon: 'document-text-outline', component: ApplicationsPage },
  { id: 'events', title: 'Events', icon: 'calendar-outline', component: EventsPage },
  { id: 'messages', title: 'Messages', icon: 'chatbubbles-outline', component: MessagesPage },
  { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', component: NotificationsPage },
  { id: 'profile', title: 'Profile', icon: 'person-outline', component: ProfilePage },
];

export default function CompanyDashboard({ onLogout, currentUser }: CompanyDashboardProps) {
  const [activeScreen, setActiveScreen] = useState('home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(0));

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
  };

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const ActiveComponent = navigationItems.find(item => item.id === activeScreen)?.component || DashboardHome;

  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 0],
  });

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.logo}>
              <Ionicons name="briefcase" size={20} color="#FF8400" />
            </View>
            <Text style={styles.headerTitle}>InternshipGo</Text>
            <Text style={styles.headerSubtitle}>Company</Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#666" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen Content */}
        <View style={styles.screenContainer}>
          {activeScreen === 'profile' ? (
            <ProfilePage currentUser={currentUser} />
          ) : activeScreen === 'coordinators' ? (
            <CoordinatorsPage currentUser={currentUser} />
          ) : activeScreen === 'applications' ? (
            <ApplicationsPage currentUser={currentUser ? {
              id: currentUser.id,
              email: currentUser.email,
              user_type: 'company'
            } : { id: '', email: '', user_type: 'company' }} />
          ) : activeScreen === 'interns' ? (
            <InternsPage currentUser={currentUser ? {
              id: currentUser.id,
              email: currentUser.email,
              user_type: 'company'
            } : { id: '', email: '', user_type: 'company' }} />
          ) : activeScreen === 'events' ? (
            <EventsPage currentUser={currentUser ? {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              user_type: 'company'
            } : { id: '', name: '', email: '', user_type: 'company' }} />
          ) : (
            <ActiveComponent />
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
            <Ionicons name="briefcase" size={24} color="#FF8400" />
          </View>
          <Text style={styles.sidebarTitle}>InternshipGo</Text>
          <Text style={styles.sidebarSubtitle}>Company Dashboard</Text>
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
              {item.title === 'Messages' && (
                <View style={styles.messageBadge}>
                  <Text style={styles.messageBadgeText}>4</Text>
                </View>
              )}
              {item.title === 'Notifications' && (
                <View style={styles.notificationSidebarBadge}>
                  <Text style={styles.notificationSidebarText}>3</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sidebarFooter}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>TC</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>Tech Corp</Text>
              <Text style={styles.userRole}>Company</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#dc3545" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  logo: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#333',
    marginRight: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FF8400',
    fontWeight: '600' as const,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  notificationButton: {
    position: 'relative' as const,
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notificationCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold' as const,
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
    width: 280,
    backgroundColor: '#fff',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center' as const,
  },
  sidebarLogo: {
    marginBottom: 8,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#333',
  },
  sidebarSubtitle: {
    fontSize: 14,
    color: '#FF8400',
    fontWeight: '600' as const,
  },
  navigation: {
    flex: 1,
    paddingTop: 20,
  },
  navItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 12,
    borderRadius: 8,
    position: 'relative' as const,
  },
  activeNavItem: {
    backgroundColor: '#FF840020',
  },
  navText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
    fontWeight: '500' as const,
  },
  activeNavText: {
    color: '#FF8400',
    fontWeight: '600' as const,
  },
  messageBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 15,
    backgroundColor: '#28a745',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  messageBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold' as const,
  },
  notificationSidebarBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 15,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notificationSidebarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold' as const,
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 15,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF8400',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#dc3545',
    marginLeft: 16,
    fontWeight: '500' as const,
  },
});