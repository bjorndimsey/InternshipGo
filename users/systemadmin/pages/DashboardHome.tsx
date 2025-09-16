import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalInterns: number;
  totalCoordinators: number;
  totalAdminCoordinators: number;
  totalCompanies: number;
  activeInternships: number;
  pendingApplications: number;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInterns: 0,
    totalCoordinators: 0,
    totalAdminCoordinators: 0,
    totalCompanies: 0,
    activeInternships: 0,
    pendingApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data - replace with real API call
      setStats({
        totalInterns: 156,
        totalCoordinators: 12,
        totalAdminCoordinators: 3,
        totalCompanies: 45,
        activeInternships: 89,
        pendingApplications: 23,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    onPress 
  }: {
    title: string;
    value: number;
    icon: string;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.statCardContent}>
        <View style={styles.statCardHeader}>
          <View style={[styles.statIcon, { backgroundColor: color }]}>
            <MaterialIcons name={icon} size={24} color="#fff" />
          </View>
          <MaterialIcons name="arrow-forward" size={20} color="#999" />
        </View>
        <Text style={styles.statValue}>{value.toLocaleString()}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ 
    title, 
    description, 
    icon, 
    color, 
    onPress 
  }: {
    title: string;
    description: string;
    icon: string;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.quickActionCard, { borderColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionDescription}>{description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome back, Admin!</Text>
        <Text style={styles.welcomeSubtitle}>
          Here's what's happening with your internship program today.
        </Text>
      </View>

      {/* Statistics Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Interns"
          value={stats.totalInterns}
          icon="school"
          color="#4285f4"
        />
        <StatCard
          title="Coordinators"
          value={stats.totalCoordinators}
          icon="people"
          color="#34a853"
        />
        <StatCard
          title="Admin Coordinators"
          value={stats.totalAdminCoordinators}
          icon="admin-panel-settings"
          color="#fbbc04"
        />
        <StatCard
          title="Companies"
          value={stats.totalCompanies}
          icon="business"
          color="#ea4335"
        />
        <StatCard
          title="Active Internships"
          value={stats.activeInternships}
          icon="work"
          color="#9c27b0"
        />
        <StatCard
          title="Pending Applications"
          value={stats.pendingApplications}
          icon="pending"
          color="#ff9800"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Add New Intern"
            description="Register a new intern to the system"
            icon="person-add"
            color="#4285f4"
            onPress={() => {}}
          />
          <QuickActionCard
            title="Add Company"
            description="Register a new company partner"
            icon="business-center"
            color="#34a853"
            onPress={() => {}}
          />
          <QuickActionCard
            title="Assign Coordinator"
            description="Assign coordinator to manage interns"
            icon="assignment-ind"
            color="#fbbc04"
            onPress={() => {}}
          />
          <QuickActionCard
            title="View Reports"
            description="Generate and view system reports"
            icon="assessment"
            color="#ea4335"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#4285f4' }]}>
              <MaterialIcons name="person-add" size={16} color="#fff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New intern registered</Text>
              <Text style={styles.activityDescription}>John Doe joined the program</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#34a853' }]}>
              <MaterialIcons name="business" size={16} color="#fff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New company added</Text>
              <Text style={styles.activityDescription}>TechCorp joined as partner</Text>
              <Text style={styles.activityTime}>4 hours ago</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#fbbc04' }]}>
              <MaterialIcons name="assignment" size={16} color="#fff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Internship assigned</Text>
              <Text style={styles.activityDescription}>Sarah Wilson assigned to TechCorp</Text>
              <Text style={styles.activityTime}>6 hours ago</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
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
  welcomeSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardContent: {
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quickActionsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  quickActionsGrid: {
    gap: 15,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 14,
    color: '#666',
  },
  recentActivitySection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  activityCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
});
