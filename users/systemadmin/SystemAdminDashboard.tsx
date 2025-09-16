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
import InternsManagement from './pages/InternsManagement';
import CompanyManagement from './pages/CompanyManagement';
import CoordinatorsManagement from './pages/CoordinatorsManagement';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

const { width, height } = Dimensions.get('window');

interface SystemAdminDashboardProps {
  onLogout: () => void;
}

type MenuItem = {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<any>;
  badge?: number;
};

const menuItems: MenuItem[] = [
  { id: 'home', title: 'Dashboard', icon: 'grid-outline', component: DashboardHome },
  { id: 'interns', title: 'Interns', icon: 'school-outline', component: InternsManagement },
  { id: 'coordinators', title: 'Coordinators', icon: 'people-outline', component: CoordinatorsManagement },
  { id: 'companies', title: 'Companies', icon: 'business-outline', component: CompanyManagement },
  { id: 'messages', title: 'Messages', icon: 'mail-outline', component: MessagesPage, badge: 3 },
  { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', component: NotificationsPage, badge: 5 },
  { id: 'profile', title: 'Profile', icon: 'person-outline', component: ProfilePage },
];

export default function SystemAdminDashboard({ onLogout }: SystemAdminDashboardProps) {
  const [activeScreen, setActiveScreen] = useState('home');

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <DashboardHome />;
      case 'interns':
        return <InternsManagement />;
      case 'coordinators':
        return <CoordinatorsManagement />;
      case 'companies':
        return <CompanyManagement />;
      case 'messages':
        return <MessagesPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={32} color="#FF8400" />
            <Text style={styles.logoText}>InternshipGo</Text>
          </View>
          <Text style={styles.roleText}>System Admin</Text>
        </View>

        <ScrollView style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                activeScreen === item.id && styles.activeMenuItem
              ]}
              onPress={() => setActiveScreen(item.id)}
            >
              <View style={styles.menuItemContent}>
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={activeScreen === item.id ? '#FF8400' : '#666'}
                />
                <Text style={[
                  styles.menuItemText,
                  activeScreen === item.id && styles.activeMenuItemText
                ]}>
                  {item.title}
                </Text>
              </View>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* User Profile Section */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>SA</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>System Admin</Text>
              <Text style={styles.userEmail}>admin@system.com</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>InternshipGo</Text>
            <Text style={styles.headerSubtitle}>System Administration Panel</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="search-outline" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={20} color="#666" />
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>5</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen Content */}
        <View style={styles.screenContent}>
          {renderScreen()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row' as const,
    backgroundColor: '#f8f9fa',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    flexDirection: 'column' as const,
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#333',
    marginLeft: 12,
  },
  roleText: {
    fontSize: 14,
    color: '#FF8400',
    fontWeight: '600' as const,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: '#FF840015',
  },
  menuItemContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  activeMenuItemText: {
    color: '#FF8400',
    fontWeight: '600' as const,
  },
  badge: {
    backgroundColor: '#FF8400',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold' as const,
  },
  userSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
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
    fontSize: 14,
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
  userEmail: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column' as const,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative' as const,
  },
  headerBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: '#FF8400',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold' as const,
  },
  screenContent: {
    flex: 1,
  },
});