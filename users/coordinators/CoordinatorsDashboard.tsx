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
import CompaniesPage from './pages/CompaniesPage';
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
  { name: 'Messages', screen: 'Messages', icon: 'chatbubbles-outline' },
  { name: 'Notifications', screen: 'Notifications', icon: 'notifications-outline' },
  { name: 'Profile', screen: 'Profile', icon: 'person-outline' },
];

export default function CoordinatorsDashboard({ onLogout, currentUser }: CoordinatorsDashboardProps) {
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(-250));

  const toggleSidebar = () => {
    const toValue = sidebarVisible ? -250 : 0;
    setSidebarVisible(!sidebarVisible);
    
    Animated.timing(sidebarAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const navigateToScreen = (screenName: string) => {
    setActiveScreen(screenName);
    toggleSidebar();
  };

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'Dashboard':
        return <DashboardHome currentUser={currentUser} />;
      case 'Interns':
        return <InternsPage currentUser={currentUser} />;
      case 'Companies':
        return <CompaniesPage />;
      case 'Events':
        return <EventsPage currentUser={currentUser} />;
      case 'Messages':
        return <MessagesPage />;
      case 'Notifications':
        return <NotificationsPage />;
      case 'Profile':
        return <ProfilePage currentUser={currentUser} />;
      default:
        return <DashboardHome currentUser={currentUser} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <Ionicons name="menu-outline" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.logo}>
              <Ionicons name="school-outline" size={24} color="#FF8400" />
            </View>
            <Text style={styles.headerTitle}>InternshipGo</Text>
            <Text style={styles.headerSubtitle}>Coordinator</Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={20} color="#666" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen Content */}
        <View style={styles.screenContainer}>
          {renderScreen()}
        </View>
      </View>

      {/* Overlay */}
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
          { transform: [{ translateX: sidebarAnimation }] }
        ]}
      >
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarLogo}>
            <Ionicons name="school-outline" size={32} color="#FF8400" />
          </View>
          <Text style={styles.sidebarTitle}>InternshipGo</Text>
          <Text style={styles.sidebarSubtitle}>Coordinator Dashboard</Text>
        </View>

        <View style={styles.navigationContainer}>
          {navigationItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.navigationItem,
                activeScreen === item.screen && styles.activeNavigationItem
              ]}
              onPress={() => navigateToScreen(item.screen)}
            >
              <Ionicons 
                name={item.icon as any} 
                size={20} 
                color={activeScreen === item.screen ? '#FF8400' : '#666'} 
              />
              <Text style={[
                styles.navigationText,
                activeScreen === item.screen && styles.activeNavigationText
              ]}>
                {item.name}
              </Text>
              {item.name === 'Messages' && (
                <View style={styles.messageBadge}>
                  <Text style={styles.messageBadgeText}>2</Text>
                </View>
              )}
              {item.name === 'Notifications' && (
                <View style={styles.notificationSidebarBadge}>
                  <Text style={styles.notificationSidebarText}>5</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sidebarFooter}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>MS</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>Dr. Maria Santos</Text>
              <Text style={styles.userRole}>Internship Coordinator</Text>
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
    width: 250,
    backgroundColor: '#fff',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center' as const,
  },
  sidebarLogo: {
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 4,
  },
  sidebarSubtitle: {
    fontSize: 14,
    color: '#FF8400',
    fontWeight: '600' as const,
  },
  navigationContainer: {
    flex: 1,
    paddingTop: 16,
  },
  navigationItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  activeNavigationItem: {
    backgroundColor: '#FF8400' + '10',
    borderLeftColor: '#FF8400',
  },
  navigationText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500' as const,
    flex: 1,
  },
  activeNavigationText: {
    color: '#FF8400',
    fontWeight: '600' as const,
  },
  messageBadge: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  messageBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold' as const,
  },
  notificationSidebarBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  notificationSidebarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold' as const,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc3545',
    backgroundColor: 'transparent',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '600' as const,
  },
});