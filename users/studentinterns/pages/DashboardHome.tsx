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
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import CompanyLocationMap from '../../../components/CompanyLocationMap';
import ResumeUploadModal from '../../../components/ResumeUploadModal';

const { width } = Dimensions.get('window');

interface Company {
  id: string;
  userId?: string; // Add user_id from users table
  name: string;
  profilePicture?: string;
  industry: string;
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  availableSlots: number;
  totalSlots: number;
  description: string;
  website: string;
  isFavorite: boolean;
  rating: number;
  partnershipStatus: 'approved' | 'pending' | 'rejected';
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
  google_id?: string;
}

interface DashboardHomeProps {
  currentUser: UserInfo;
}

export default function DashboardHome({ currentUser }: DashboardHomeProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ latitude: number; longitude: number; profilePicture?: string } | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedCompanyForApplication, setSelectedCompanyForApplication] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
    fetchCurrentUserLocation();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.getAllCompanies();
      
      if (response.success && response.companies) {
        // Filter companies with approved partnership status
        const approvedCompanies = response.companies.filter((company: any) => 
          company.partnershipStatus === 'approved'
        );
        
        setCompanies(approvedCompanies);
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserLocation = async () => {
    try {
      if (!currentUser) {
        return;
      }

      const response = await apiService.getProfile(currentUser.id);
      
      if (response.success && response.user) {
        const user = response.user;
        
        // Check if user has saved location coordinates
        if (user.latitude !== null && user.longitude !== null && user.latitude !== undefined && user.longitude !== undefined) {
          setCurrentUserLocation({
            latitude: user.latitude,
            longitude: user.longitude,
            profilePicture: user.profilePicture
          });
        }
      }
    } catch (error) {
      console.error('Error fetching current user location:', error);
    }
  };

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
  };

  const handleViewLocation = (company: Company) => {
    setSelectedCompany(company);
    setShowLocationMap(true);
  };

  const closeLocationMap = () => {
    setShowLocationMap(false);
  };

  const handleToggleFavorite = (companyId: string) => {
    setCompanies(companies.map(company => 
      company.id === companyId 
        ? { ...company, isFavorite: !company.isFavorite }
        : company
    ));
  };

  const handleApply = (company: Company) => {
    setSelectedCompanyForApplication(company);
    setShowResumeModal(true);
  };

  const handleApplicationSubmitted = () => {
    // Refresh companies or show success message
    Alert.alert('Success', 'Your application has been submitted successfully!');
  };

  const closeResumeModal = () => {
    setShowResumeModal(false);
    setSelectedCompanyForApplication(null);
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
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#fbbc04" />
            <Text style={styles.ratingText}>{company.rating}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => handleToggleFavorite(company.id)}
        >
          <MaterialIcons 
            name={company.isFavorite ? "favorite" : "favorite-border"} 
            size={24} 
            color={company.isFavorite ? "#ea4335" : "#666"} 
          />
        </TouchableOpacity>
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
           style={[
             styles.actionButton, 
             styles.applyButton,
             company.availableSlots === 0 && styles.disabledButton
           ]} 
           onPress={() => handleApply(company)}
           disabled={company.availableSlots === 0}
         >
           <MaterialIcons name="send" size={16} color="#fff" />
           <Text style={styles.actionButtonText}>
             {company.availableSlots === 0 ? 'Full' : 'Apply'}
           </Text>
         </TouchableOpacity>
       </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading companies...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome back, Student!</Text>
        <Text style={styles.welcomeSubtitle}>
          Discover amazing internship opportunities with our partner companies.
        </Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <MaterialIcons name="business-center" size={32} color="#4285f4" />
          <Text style={styles.statNumber}>{companies.length}</Text>
          <Text style={styles.statLabel}>Partner Companies</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="work" size={32} color="#34a853" />
          <Text style={styles.statNumber}>
            {companies.reduce((sum, company) => sum + company.availableSlots, 0)}
          </Text>
          <Text style={styles.statLabel}>Available Slots</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="favorite" size={32} color="#ea4335" />
          <Text style={styles.statNumber}>
            {companies.filter(company => company.isFavorite).length}
          </Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
      </View>

      {/* Companies Section */}
      <View style={styles.companiesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Internships</Text>
          <Text style={styles.sectionSubtitle}>
            {companies.filter(c => c.availableSlots > 0).length} companies with open positions
          </Text>
        </View>

        {companies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="business-center" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No companies available</Text>
            <Text style={styles.emptyStateText}>
              Check back later for new internship opportunities
            </Text>
          </View>
        ) : (
          companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </View>

      {/* Company Details Modal */}
      {selectedCompany && (
        <Modal
          visible={!!selectedCompany}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedCompany(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalProfileContainer}>
                  {selectedCompany.profilePicture ? (
                    <Image source={{ uri: selectedCompany.profilePicture }} style={styles.modalProfileImage} />
                  ) : (
                    <View style={styles.modalProfilePlaceholder}>
                      <Text style={styles.modalProfileText}>{selectedCompany.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.modalProfileInfo}>
                    <Text style={styles.modalTitle}>{selectedCompany.name}</Text>
                    <Text style={styles.modalSubtitle}>{selectedCompany.industry}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setSelectedCompany(null)}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.modalInfo}>
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="business" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Company Name:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.name}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="category" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Industry:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.industry}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="location-on" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Address:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.address}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="email" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Website:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.website}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="check-circle" size={20} color={selectedCompany.moaStatus === 'active' ? '#34a853' : '#ea4335'} />
                    <Text style={styles.modalInfoLabel}>MOA Status:</Text>
                    <Text style={[styles.modalInfoValue, { color: selectedCompany.moaStatus === 'active' ? '#34a853' : '#ea4335' }]}>
                      {selectedCompany.moaStatus.toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="school" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>School Year:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.schoolYear || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="work" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Available Slots:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.availableSlots}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="group" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Total Slots:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.totalSlots}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="percent" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Fill Rate:</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedCompany.totalSlots > 0 ? Math.round((selectedCompany.availableSlots / selectedCompany.totalSlots) * 100) : 0}%
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <MaterialIcons name="description" size={20} color="#666" />
                    <Text style={styles.modalInfoLabel}>Description:</Text>
                    <Text style={styles.modalInfoValue}>{selectedCompany.description}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.locationButton]}
                  onPress={() => handleViewLocation(selectedCompany)}
                >
                  <MaterialIcons name="location-on" size={16} color="#fff" />
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>View Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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

      {/* Resume Upload Modal */}
      {selectedCompanyForApplication && (
        <ResumeUploadModal
          visible={showResumeModal}
          onClose={closeResumeModal}
          onApplicationSubmitted={handleApplicationSubmitted}
          companyName={selectedCompanyForApplication.name}
          companyId={selectedCompanyForApplication.id}
          studentId={currentUser.id}
          position="Intern"
        />
      )}
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
    gap: 15,
  },
  statCard: {
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
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  favoriteButton: {
    padding: 8,
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
     gap: 12,
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
  locationButton: {
    backgroundColor: '#34a853',
  },
  applyButton: {
    backgroundColor: '#fbbc04',
  },
  disabledButton: {
    backgroundColor: '#ccc',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  modalProfilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalProfileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  modalProfileInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalInfo: {
    gap: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 100,
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#1a1a2e',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  locationButton: {
    backgroundColor: '#34a853',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
