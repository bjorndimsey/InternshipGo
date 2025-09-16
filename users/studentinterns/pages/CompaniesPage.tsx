import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
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
  isFavorite: boolean;
  rating: number;
  dailyTasks: string[];
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDailyTasks, setShowDailyTasks] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [searchQuery, companies]);

  const fetchCompanies = async () => {
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
          isFavorite: false,
          rating: 4.8,
          dailyTasks: [
            'Complete coding assessment',
            'Attend company orientation',
            'Setup development environment',
            'Review project documentation',
          ],
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
          isFavorite: true,
          rating: 4.6,
          dailyTasks: [
            'Data analysis training',
            'SQL practice exercises',
            'Attend team meetings',
            'Complete project assignments',
          ],
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
          isFavorite: false,
          rating: 4.4,
          dailyTasks: [
            'Cloud platform training',
            'DevOps tool setup',
            'Infrastructure monitoring',
            'Security best practices',
          ],
        },
      ];
      
      setCompanies(mockCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = companies;

    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCompanies(filtered);
  };

  const handleViewDetails = (company: Company) => {
    Alert.alert(
      'Company Details',
      `Name: ${company.name}\nIndustry: ${company.industry}\nLocation: ${company.location}\nMOA Status: ${company.moaStatus}\nAvailable Slots: ${company.availableSlots}/${company.totalSlots}\nDescription: ${company.description}\nWebsite: ${company.website}\nRating: ${company.rating}/5`,
      [{ text: 'OK' }]
    );
  };

  const handleToggleFavorite = (companyId: string) => {
    setCompanies(companies.map(company => 
      company.id === companyId 
        ? { ...company, isFavorite: !company.isFavorite }
        : company
    ));
  };

  const handleDailyTasks = (company: Company) => {
    setSelectedCompany(company);
    setShowDailyTasks(true);
  };

  const handleApply = (company: Company) => {
    Alert.alert(
      'Apply to Internship',
      `Apply to ${company.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Apply', 
          onPress: () => {
            Alert.alert('Success', `Application submitted to ${company.name}!`);
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
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.tasksButton]} 
          onPress={() => handleDailyTasks(company)}
        >
          <MaterialIcons name="assignment" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Daily Tasks</Text>
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
    <View style={styles.container}>
      {/* Search */}
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

      {/* Companies List */}
      <ScrollView style={styles.companiesList} showsVerticalScrollIndicator={false}>
        {filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="business-center" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No companies found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No companies available at the moment'
              }
            </Text>
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </ScrollView>

      {/* Daily Tasks Modal */}
      <Modal
        visible={showDailyTasks}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDailyTasks(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Daily Tasks - {selectedCompany?.name}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowDailyTasks(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tasksList}>
              {selectedCompany?.dailyTasks.map((task, index) => (
                <View key={index} style={styles.taskItem}>
                  <View style={styles.taskNumber}>
                    <Text style={styles.taskNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.taskText}>{task}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  searchContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  companiesList: {
    flex: 1,
    padding: 20,
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
  tasksButton: {
    backgroundColor: '#fbbc04',
  },
  applyButton: {
    backgroundColor: '#34a853',
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
    maxWidth: 400,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  closeModalButton: {
    padding: 4,
  },
  tasksList: {
    maxHeight: 400,
    padding: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a2e',
  },
});
