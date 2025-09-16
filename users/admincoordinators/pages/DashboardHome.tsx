import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Company {
  id: string;
  name: string;
  profilePicture?: string;
  industry: string;
  location: string;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  availableSlots: number;
  totalSlots: number;
  description: string;
  website: string;
  schoolYear: string;
  partnerStatus: 'active' | 'inactive';
  coordinatorAssigned?: string;
}

interface AdminStats {
  activeInterns: number;
  activeCompanies: number;
  currentSchoolYear: string;
  totalApplications: number;
  pendingApprovals: number;
  totalCoordinators: number;
  activeCoordinators: number;
}

export default function DashboardHome() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    activeInterns: 0,
    activeCompanies: 0,
    currentSchoolYear: '2024-2025',
    totalApplications: 0,
    pendingApprovals: 0,
    totalCoordinators: 0,
    activeCoordinators: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2024-2025');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [searchQuery, selectedSchoolYear, companies]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockCompanies: Company[] = [
        {
          id: '1',
          name: 'TechCorp Solutions',
          industry: 'Technology',
          location: 'San Francisco, CA',
          moaStatus: 'active',
          moaExpiryDate: '2024-12-31',
          availableSlots: 5,
          totalSlots: 10,
          description: 'Leading technology company specializing in software development and AI solutions.',
          website: 'www.techcorp.com',
          schoolYear: '2024-2025',
          partnerStatus: 'active',
          coordinatorAssigned: 'Dr. Sarah Johnson',
        },
        {
          id: '2',
          name: 'DataFlow Inc',
          industry: 'Data Analytics',
          location: 'New York, NY',
          moaStatus: 'active',
          moaExpiryDate: '2024-11-15',
          availableSlots: 3,
          totalSlots: 8,
          description: 'Data analytics company focused on business intelligence and machine learning.',
          website: 'www.dataflow.com',
          schoolYear: '2024-2025',
          partnerStatus: 'active',
          coordinatorAssigned: 'Dr. Michael Chen',
        },
        {
          id: '3',
          name: 'CloudTech Systems',
          industry: 'Cloud Computing',
          location: 'Austin, TX',
          moaStatus: 'pending',
          availableSlots: 0,
          totalSlots: 6,
          description: 'Cloud infrastructure and DevOps solutions provider.',
          website: 'www.cloudtech.com',
          schoolYear: '2023-2024',
          partnerStatus: 'inactive',
        },
        {
          id: '4',
          name: 'InnovateLab',
          industry: 'Research & Development',
          location: 'Seattle, WA',
          moaStatus: 'active',
          moaExpiryDate: '2025-06-30',
          availableSlots: 7,
          totalSlots: 12,
          description: 'Innovation lab focused on emerging technologies and research.',
          website: 'www.innovatelab.com',
          schoolYear: '2024-2025',
          partnerStatus: 'active',
          coordinatorAssigned: 'Dr. Emily Rodriguez',
        },
      ];

      const mockStats: AdminStats = {
        activeInterns: 45,
        activeCompanies: 12,
        currentSchoolYear: '2024-2025',
        totalApplications: 78,
        pendingApprovals: 15,
        totalCoordinators: 8,
        activeCoordinators: 6,
      };
      
      setCompanies(mockCompanies);
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = companies;

    // Filter by school year
    filtered = filtered.filter(company => company.schoolYear === selectedSchoolYear);

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (company.coordinatorAssigned && company.coordinatorAssigned.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredCompanies(filtered);
  };

  const handleViewDetails = (company: Company) => {
    Alert.alert(
      'Company Details',
      `Name: ${company.name}\nIndustry: ${company.industry}\nLocation: ${company.location}\nMOA Status: ${company.moaStatus}\nAvailable Slots: ${company.availableSlots}/${company.totalSlots}\nDescription: ${company.description}\nWebsite: ${company.website}\nSchool Year: ${company.schoolYear}\nPartner Status: ${company.partnerStatus}\n${company.coordinatorAssigned ? `Assigned Coordinator: ${company.coordinatorAssigned}` : 'No coordinator assigned'}`,
      [{ text: 'OK' }]
    );
  };

  const handleViewProfile = (company: Company) => {
    Alert.alert(
      'Company Profile',
      `Viewing profile for ${company.name}`,
      [{ text: 'OK' }]
    );
  };

  const handlePartnerAction = (company: Company) => {
    const action = company.partnerStatus === 'active' ? 'Remove from Partners' : 'Add as Partner';
    Alert.alert(
      action,
      `${action} ${company.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: action, 
          onPress: () => {
            setCompanies(companies.map(c => 
              c.id === company.id 
                ? { ...c, partnerStatus: c.partnerStatus === 'active' ? 'inactive' : 'active' }
                : c
            ));
            Alert.alert('Success', `${action} completed for ${company.name}`);
          }
        },
      ]
    );
  };

  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'expired': return '#ea4335';
      case 'pending': return '#fbbc04';
      default: return '#666';
    }
  };

  const getMOAStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getPartnerStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ea4335';
      default: return '#666';
    }
  };

  const getPartnerStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Partner';
      case 'inactive': return 'Not Partner';
      default: return 'Unknown';
    }
  };

  const CompanyCard = ({ company }: { company: Company }) => (
    <View style={styles.companyCard}>
      <View style={styles.companyHeader}>
        <View style={styles.profileContainer}>
          {company.profilePicture ? (
            <Image source={{ uri: company.profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileText}>{company.name.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyIndustry}>{company.industry}</Text>
          <Text style={styles.schoolYear}>School Year: {company.schoolYear}</Text>
          {company.coordinatorAssigned && (
            <Text style={styles.coordinatorAssigned}>
              Coordinator: {company.coordinatorAssigned}
            </Text>
          )}
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.partnerBadge, { backgroundColor: getPartnerStatusColor(company.partnerStatus) }]}>
            <Text style={styles.partnerText}>{getPartnerStatusText(company.partnerStatus)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.companyDetails}>
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.locationText}>{company.location}</Text>
        </View>
        
        <View style={styles.slotsContainer}>
          <View style={styles.slotInfo}>
            <Text style={styles.slotLabel}>Available Slots</Text>
            <Text style={styles.slotValue}>{company.availableSlots}/{company.totalSlots}</Text>
          </View>
          <View style={styles.slotBar}>
            <View 
              style={[
                styles.slotFill, 
                { 
                  width: `${(company.availableSlots / company.totalSlots) * 100}%`,
                  backgroundColor: company.availableSlots > 0 ? '#34a853' : '#ea4335'
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.moaContainer}>
          <Text style={styles.moaLabel}>MOA Status:</Text>
          <View style={[styles.moaBadge, { backgroundColor: getMOAStatusColor(company.moaStatus) }]}>
            <Text style={styles.moaText}>{getMOAStatusText(company.moaStatus)}</Text>
          </View>
          {company.moaExpiryDate && (
            <Text style={styles.moaDate}>Expires: {company.moaExpiryDate}</Text>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {company.description}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => handleViewDetails(company)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.profileButton]} 
          onPress={() => handleViewProfile(company)}
        >
          <MaterialIcons name="person" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            company.partnerStatus === 'active' ? styles.removeButton : styles.partnerButton
          ]} 
          onPress={() => handlePartnerAction(company)}
        >
          <MaterialIcons 
            name={company.partnerStatus === 'active' ? 'remove' : 'add'} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.actionButtonText}>
            {company.partnerStatus === 'active' ? 'Remove' : 'Partner'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
        <Text style={styles.welcomeTitle}>Welcome back, Admin Coordinator!</Text>
        <Text style={styles.welcomeSubtitle}>
          Manage your internship program, coordinators, and track overall progress.
        </Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <MaterialIcons name="school" size={32} color="#4285f4" />
          <Text style={styles.statNumber}>{stats.activeInterns}</Text>
          <Text style={styles.statLabel}>Active Interns</Text>
          <Text style={styles.statSubLabel}>{stats.currentSchoolYear}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="business-center" size={32} color="#34a853" />
          <Text style={styles.statNumber}>{stats.activeCompanies}</Text>
          <Text style={styles.statLabel}>Active Companies</Text>
          <Text style={styles.statSubLabel}>{stats.currentSchoolYear}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="supervisor-account" size={32} color="#fbbc04" />
          <Text style={styles.statNumber}>{stats.activeCoordinators}</Text>
          <Text style={styles.statLabel}>Active Coordinators</Text>
          <Text style={styles.statSubLabel}>Out of {stats.totalCoordinators}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="assignment" size={32} color="#ea4335" />
          <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
          <Text style={styles.statLabel}>Pending Approvals</Text>
          <Text style={styles.statSubLabel}>Needs Review</Text>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search companies..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>
        
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>School Year:</Text>
          <TouchableOpacity style={styles.yearSelector}>
            <Text style={styles.yearText}>{selectedSchoolYear}</Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Companies Section */}
      <View style={styles.companiesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Partner Companies</Text>
          <Text style={styles.sectionSubtitle}>
            {filteredCompanies.length} companies for {selectedSchoolYear}
          </Text>
        </View>

        {filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="business-center" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No companies found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : `No companies available for ${selectedSchoolYear}`
              }
            </Text>
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
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
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  yearText: {
    fontSize: 14,
    color: '#1a1a2e',
    marginRight: 4,
  },
  companiesSection: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  companyHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  profileContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  companyIndustry: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  schoolYear: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  coordinatorAssigned: {
    fontSize: 12,
    color: '#4285f4',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  partnerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  partnerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyDetails: {
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  slotsContainer: {
    marginBottom: 10,
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  slotLabel: {
    fontSize: 14,
    color: '#666',
  },
  slotValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  slotBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  slotFill: {
    height: '100%',
    borderRadius: 3,
  },
  moaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moaLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  moaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  moaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDate: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#4285f4',
  },
  profileButton: {
    backgroundColor: '#34a853',
  },
  partnerButton: {
    backgroundColor: '#fbbc04',
  },
  removeButton: {
    backgroundColor: '#ea4335',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
