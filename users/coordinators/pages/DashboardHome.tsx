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
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import FileUploadModal from '../../../components/FileUploadModal';
import CompanyLocationMap from '../../../components/CompanyLocationMap';

const { width } = Dimensions.get('window');

interface Company {
  id: string;
  userId: string;
  name: string;
  profilePicture?: string;
  industry: string;
  address: string; // Changed from location to address to match schema
  email: string;
  status: 'active' | 'inactive';
  joinDate: string;
  updatedAt: string;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  availableSlots: number;
  totalSlots: number;
  description: string;
  website: string;
  schoolYear: string;
  partnerStatus: 'active' | 'inactive';
  partnershipStatus: 'pending' | 'approved' | 'rejected';
  latitude?: number;
  longitude?: number;
}

interface InternStats {
  activeInterns: number;
  activeCompanies: number;
  currentSchoolYear: string;
  totalApplications: number;
  pendingApprovals: number;
}

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  id: string;
}

interface DashboardHomeProps {
  currentUser: UserInfo | null;
}

export default function DashboardHome({ currentUser }: DashboardHomeProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<InternStats>({
    activeInterns: 0,
    activeCompanies: 0,
    currentSchoolYear: '2024-2025',
    totalApplications: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2024-2025');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedCompanyForUpload, setSelectedCompanyForUpload] = useState<Company | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ latitude: number; longitude: number; profilePicture?: string } | null>(null);

  useEffect(() => {
    fetchData();
    fetchCurrentUserLocation();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [searchQuery, selectedSchoolYear, companies]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching companies from API...');
      const response = await apiService.getCompanies();
      
      if (response.success && response.companies && Array.isArray(response.companies)) {
        console.log('✅ Companies fetched successfully:', response.companies.length);
        console.log('📊 Sample company data:', response.companies[0]);
        setCompanies(response.companies);
        
        // Calculate stats from real data - only count pending companies
        const pendingCompanies = response.companies.filter(c => 
          c.status === 'active' && (c.partnershipStatus === 'pending' || !c.partnershipStatus)
        ).length;
        const mockStats: InternStats = {
          activeInterns: 0, // This would need to be calculated from internships table
          activeCompanies: pendingCompanies, // Now shows pending companies count
          currentSchoolYear: '2024-2025',
          totalApplications: 0, // This would need to be calculated from applications table
          pendingApprovals: 0, // This would need to be calculated from applications table
        };
        setStats(mockStats);
      } else {
        console.error('❌ Failed to fetch companies:', response.message);
        setCompanies([]); // Set empty array as fallback
        Alert.alert('Error', response.message || 'Failed to fetch companies');
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setCompanies([]); // Set empty array as fallback
      Alert.alert('Error', 'Failed to fetch companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserLocation = async () => {
    try {
      if (!currentUser) {
        console.log('No current user found for location');
        return;
      }

      console.log('Fetching current user location for ID:', currentUser.id);
      const response = await apiService.getProfile(currentUser.id);
      
      if (response.success && response.user) {
        const user = response.user;
        console.log('User profile data:', user);
        
        // Check if user has saved location coordinates
        if (user.latitude !== null && user.longitude !== null && user.latitude !== undefined && user.longitude !== undefined) {
          console.log('User has saved location:', user.latitude, user.longitude);
          setCurrentUserLocation({
            latitude: user.latitude,
            longitude: user.longitude,
            profilePicture: user.profilePicture
          });
        } else {
          console.log('User has no saved location');
        }
      } else {
        console.log('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching current user location:', error);
    }
  };

  const filterCompanies = () => {
    let filtered = companies;

    // Filter to only show pending companies (not approved or rejected)
    filtered = filtered.filter(company => 
      company.partnershipStatus === 'pending' || 
      !company.partnershipStatus // Include companies without partnership status set (legacy data)
    );

    // Filter by school year
    filtered = filtered.filter(company => company.schoolYear === selectedSchoolYear);

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCompanies(filtered);
  };

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
    setSelectedCompany(null);
  };

  const handleViewProfile = (company: Company) => {
    Alert.alert(
      'Company Profile',
      `Viewing profile for ${company.name}`,
      [{ text: 'OK' }]
    );
  };

  const handlePartnerAction = (company: Company) => {
    setSelectedCompanyForUpload(company);
    setShowFileUploadModal(true);
  };

  const handleFileUploadSuccess = (url: string, publicId: string) => {
    console.log('File uploaded successfully:', { url, publicId });
    // Here you can save the MOA URL to your database
    // For example: updateCompanyMOA(selectedCompanyForUpload?.id, url, publicId);
  };

  const closeFileUploadModal = () => {
    setShowFileUploadModal(false);
    setSelectedCompanyForUpload(null);
  };

  const handleViewLocation = () => {
    if (selectedCompany) {
      setShowLocationMap(true);
    }
  };

  const closeLocationMap = () => {
    setShowLocationMap(false);
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
          <Text style={styles.locationText}>{company.address}</Text>
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
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.partnerButton]} 
          onPress={() => handlePartnerAction(company)}
        >
          <MaterialIcons name="handshake" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Partner</Text>
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
        <Text style={styles.welcomeTitle}>Welcome back, Coordinator!</Text>
        <Text style={styles.welcomeSubtitle}>
          Manage your internship program and track student progress.
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
          <MaterialIcons name="business-center" size={32} color="#fbbc04" />
          <Text style={styles.statNumber}>{stats.activeCompanies}</Text>
          <Text style={styles.statLabel}>Pending Companies</Text>
          <Text style={styles.statSubLabel}>{stats.currentSchoolYear}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="assignment" size={32} color="#fbbc04" />
          <Text style={styles.statNumber}>{stats.totalApplications}</Text>
          <Text style={styles.statLabel}>Total Applications</Text>
          <Text style={styles.statSubLabel}>This Year</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="pending" size={32} color="#ea4335" />
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
              placeholder="Search pending companies..."
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
          <Text style={styles.sectionTitle}>Pending Companies</Text>
          <Text style={styles.sectionSubtitle}>
            {filteredCompanies.length} pending companies for {selectedSchoolYear}
          </Text>
        </View>

        {filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="business-center" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No pending companies found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : `No pending companies available for ${selectedSchoolYear}`
              }
            </Text>
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </View>

      {/* Company Details Modal */}
      <Modal
        visible={showCompanyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCompanyModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeCompanyModal}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedCompany && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <View style={styles.modalTitleRow}>
                      <Image
                        source={{ uri: selectedCompany.profilePicture || 'https://via.placeholder.com/50x50?text=Company' }}
                        style={styles.modalProfilePicture}
                        defaultSource={{ uri: 'https://via.placeholder.com/50x50?text=Company' }}
                      />
                      <View style={styles.modalTitleTextContainer}>
                        <Text style={styles.modalTitle}>Company Details</Text>
                        <Text style={styles.modalSubtitle}>{selectedCompany.name}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Modal Body */}
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Company Profile Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Company Profile</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="business" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Company Name</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.name}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="work" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Industry</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.industry}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="location-on" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Address</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.address}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="email" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Email</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.email}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="language" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Website</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.website}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Status Information Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Status Information</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="check-circle" size={20} color={selectedCompany.status === 'active' ? '#34a853' : '#ea4335'} />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Account Status</Text>
                          <Text style={[styles.modalInfoValue, { color: selectedCompany.status === 'active' ? '#34a853' : '#ea4335' }]}>
                            {selectedCompany.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="handshake" size={20} color={selectedCompany.partnerStatus === 'active' ? '#34a853' : '#ea4335'} />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Partner Status</Text>
                          <Text style={[styles.modalInfoValue, { color: selectedCompany.partnerStatus === 'active' ? '#34a853' : '#ea4335' }]}>
                            {selectedCompany.partnerStatus.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="description" size={20} color={selectedCompany.moaStatus === 'active' ? '#34a853' : selectedCompany.moaStatus === 'pending' ? '#fbbc04' : '#ea4335'} />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>MOA Status</Text>
                          <Text style={[styles.modalInfoValue, { color: selectedCompany.moaStatus === 'active' ? '#34a853' : selectedCompany.moaStatus === 'pending' ? '#fbbc04' : '#ea4335' }]}>
                            {selectedCompany.moaStatus.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="school" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>School Year</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.schoolYear}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Capacity & Opportunities Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Capacity & Opportunities</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="people" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Available Slots</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.availableSlots}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="group" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Total Slots</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.totalSlots}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="trending-up" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Utilization</Text>
                          <Text style={styles.modalInfoValue}>
                            {selectedCompany.totalSlots > 0 ? Math.round((selectedCompany.availableSlots / selectedCompany.totalSlots) * 100) : 0}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Additional Details Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Additional Details</Text>
                    <View style={styles.modalInfoCard}>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="info" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Description</Text>
                          <Text style={styles.modalInfoValue}>{selectedCompany.description}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="calendar-today" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Join Date</Text>
                          <Text style={styles.modalInfoValue}>{new Date(selectedCompany.joinDate).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="update" size={20} color="#4285f4" />
                        <View style={styles.modalInfoContent}>
                          <Text style={styles.modalInfoLabel}>Last Updated</Text>
                          <Text style={styles.modalInfoValue}>{new Date(selectedCompany.updatedAt).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Modal Footer */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.locationButton]}
                    onPress={handleViewLocation}
                  >
                    <MaterialIcons name="location-on" size={16} color="#fff" />
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>View All Locations</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* File Upload Modal */}
      <FileUploadModal
        visible={showFileUploadModal}
        onClose={closeFileUploadModal}
        onUploadSuccess={handleFileUploadSuccess}
        companyName={selectedCompanyForUpload?.name || ''}
        companyId={selectedCompanyForUpload?.id || ''}
        uploadedBy={currentUser?.id || ''}
      />

      {/* Company Location Map */}
      <CompanyLocationMap
        visible={showLocationMap}
        onClose={closeLocationMap}
        companies={companies}
        currentUserLocation={currentUserLocation || undefined}
        selectedCompany={selectedCompany || undefined}
        selectedCoordinatorUserId={selectedCompany?.userId}
        onViewPictures={(companyId) => {
          console.log('📸 View Pictures clicked from map for company:', companyId);
          // Handle view pictures if needed
        }}
      />
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  modalTitleTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  modalInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  locationButton: {
    backgroundColor: '#34a853',
    borderColor: '#34a853',
  },
  contactButton: {
    backgroundColor: '#4285f4',
    borderColor: '#4285f4',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
});
