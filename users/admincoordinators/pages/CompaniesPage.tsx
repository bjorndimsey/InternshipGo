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
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  partnershipDate: string;
  assignedCoordinator?: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
          contactPerson: 'John Smith',
          contactEmail: 'john.smith@techcorp.com',
          contactPhone: '+1 (555) 123-4567',
          partnershipDate: '2023-01-15',
          assignedCoordinator: 'Dr. Sarah Johnson',
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
          contactPerson: 'Sarah Johnson',
          contactEmail: 'sarah.johnson@dataflow.com',
          contactPhone: '+1 (555) 234-5678',
          partnershipDate: '2023-03-20',
          assignedCoordinator: 'Dr. Michael Chen',
        },
        {
          id: '3',
          name: 'CloudTech Systems',
          industry: 'Cloud Computing',
          location: 'Austin, TX',
          moaStatus: 'expired',
          moaExpiryDate: '2023-12-31',
          availableSlots: 0,
          totalSlots: 6,
          description: 'Cloud infrastructure and DevOps solutions provider.',
          website: 'www.cloudtech.com',
          contactPerson: 'Mike Davis',
          contactEmail: 'mike.davis@cloudtech.com',
          contactPhone: '+1 (555) 345-6789',
          partnershipDate: '2022-08-10',
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
          contactPerson: 'Dr. Emily Chen',
          contactEmail: 'emily.chen@innovatelab.com',
          contactPhone: '+1 (555) 456-7890',
          partnershipDate: '2023-06-01',
          assignedCoordinator: 'Dr. Emily Rodriguez',
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
        company.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (company.assignedCoordinator && company.assignedCoordinator.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredCompanies(filtered);
  };

  const handleViewDetails = (company: Company) => {
    Alert.alert(
      'Company Details',
      `Name: ${company.name}\nIndustry: ${company.industry}\nLocation: ${company.location}\nMOA Status: ${company.moaStatus}\nAvailable Slots: ${company.availableSlots}/${company.totalSlots}\nDescription: ${company.description}\nWebsite: ${company.website}\nContact Person: ${company.contactPerson}\nContact Email: ${company.contactEmail}\nContact Phone: ${company.contactPhone}\nPartnership Date: ${company.partnershipDate}\n${company.assignedCoordinator ? `Assigned Coordinator: ${company.assignedCoordinator}` : 'No coordinator assigned'}`,
      [{ text: 'OK' }]
    );
  };

  const handleRemoveCompany = (company: Company) => {
    Alert.alert(
      'Remove Company',
      `Are you sure you want to remove ${company.name} from the partnership program?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setCompanies(companies.filter(c => c.id !== company.id));
            Alert.alert('Success', `${company.name} removed from partnership program`);
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
          <Text style={styles.contactPerson}>Contact: {company.contactPerson}</Text>
          {company.assignedCoordinator && (
            <Text style={styles.coordinatorAssigned}>
              Coordinator: {company.assignedCoordinator}
            </Text>
          )}
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.moaBadge, { backgroundColor: getMOAStatusColor(company.moaStatus) }]}>
            <Text style={styles.moaText}>{getMOAStatusText(company.moaStatus)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.companyDetails}>
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.locationText}>{company.location}</Text>
        </View>
        
        <View style={styles.contactContainer}>
          <View style={styles.contactItem}>
            <MaterialIcons name="email" size={16} color="#666" />
            <Text style={styles.contactText}>{company.contactEmail}</Text>
          </View>
          <View style={styles.contactItem}>
            <MaterialIcons name="phone" size={16} color="#666" />
            <Text style={styles.contactText}>{company.contactPhone}</Text>
          </View>
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
          <Text style={styles.moaDate}>
            {company.moaExpiryDate ? `Expires: ${company.moaExpiryDate}` : 'No expiry date'}
          </Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {company.description}
        </Text>

        <Text style={styles.partnershipDate}>
          Partnership since: {company.partnershipDate}
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
          style={[styles.actionButton, styles.removeButton]} 
          onPress={() => handleRemoveCompany(company)}
        >
          <MaterialIcons name="remove" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Remove</Text>
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
      {/* Search Section */}
      <View style={styles.searchSection}>
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

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredCompanies.length}</Text>
          <Text style={styles.statLabel}>Total Companies</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#34a853' }]}>
            {filteredCompanies.filter(c => c.moaStatus === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active MOA</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ea4335' }]}>
            {filteredCompanies.filter(c => c.moaStatus === 'expired').length}
          </Text>
          <Text style={styles.statLabel}>Expired MOA</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
            {filteredCompanies.reduce((sum, company) => sum + company.availableSlots, 0)}
          </Text>
          <Text style={styles.statLabel}>Available Slots</Text>
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
  searchSection: {
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
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statItem: {
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
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  contactPerson: {
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
  moaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moaText: {
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
  contactContainer: {
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
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
  moaDate: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  partnershipDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#4285f4',
  },
  removeButton: {
    backgroundColor: '#ea4335',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
