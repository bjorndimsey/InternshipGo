import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Company {
  id: string;
  name: string;
  profilePicture?: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  industry: string;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  contactPerson: string;
  status: 'active' | 'inactive';
}

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data - replace with real API call
      const mockCompanies: Company[] = [
        {
          id: '1',
          name: 'TechCorp Solutions',
          email: 'contact@techcorp.com',
          phone: '+1234567890',
          address: '123 Tech Street, Silicon Valley, CA',
          website: 'www.techcorp.com',
          industry: 'Technology',
          moaStatus: 'active',
          moaExpiryDate: '2024-12-31',
          contactPerson: 'John Smith',
          status: 'active',
        },
        {
          id: '2',
          name: 'DataFlow Inc',
          email: 'info@dataflow.com',
          phone: '+1234567891',
          address: '456 Data Avenue, New York, NY',
          website: 'www.dataflow.com',
          industry: 'Data Analytics',
          moaStatus: 'expired',
          moaExpiryDate: '2023-11-15',
          contactPerson: 'Sarah Johnson',
          status: 'inactive',
        },
        {
          id: '3',
          name: 'CloudTech Systems',
          email: 'hello@cloudtech.com',
          phone: '+1234567892',
          address: '789 Cloud Drive, Austin, TX',
          website: 'www.cloudtech.com',
          industry: 'Cloud Computing',
          moaStatus: 'pending',
          contactPerson: 'Mike Davis',
          status: 'active',
        },
        {
          id: '4',
          name: 'InnovateLab',
          email: 'team@innovatelab.com',
          phone: '+1234567893',
          address: '321 Innovation Blvd, Seattle, WA',
          website: 'www.innovatelab.com',
          industry: 'Research & Development',
          moaStatus: 'active',
          moaExpiryDate: '2025-06-30',
          contactPerson: 'Emily Wilson',
          status: 'active',
        },
      ];
      
      setCompanies(mockCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      Alert.alert('Error', 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = companies;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCompanies(filtered);
  };

  const handleAddCompany = () => {
    setShowAddModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowEditModal(true);
  };

  const handleViewCompany = (company: Company) => {
    Alert.alert(
      'Company Details',
      `Name: ${company.name}\nEmail: ${company.email}\nPhone: ${company.phone}\nAddress: ${company.address}\nWebsite: ${company.website}\nIndustry: ${company.industry}\nMOA Status: ${company.moaStatus}\nMOA Expiry: ${company.moaExpiryDate || 'N/A'}\nContact Person: ${company.contactPerson}\nStatus: ${company.status}`,
      [{ text: 'OK' }]
    );
  };

  const handleDeleteCompany = (company: Company) => {
    Alert.alert(
      'Delete Company',
      `Are you sure you want to delete ${company.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCompanies(companies.filter(c => c.id !== company.id));
          },
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ea4335';
      default: return '#666';
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
          <Text style={styles.companyContact}>Contact: {company.contactPerson}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(company.status) }]}>
              <Text style={styles.statusText}>{company.status.toUpperCase()}</Text>
            </View>
            <View style={[styles.moaBadge, { backgroundColor: getMOAStatusColor(company.moaStatus) }]}>
              <Text style={styles.moaText}>MOA: {company.moaStatus.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.companyDetails}>
        <Text style={styles.detailText}>📧 {company.email}</Text>
        <Text style={styles.detailText}>📱 {company.phone}</Text>
        <Text style={styles.detailText}>🌐 {company.website}</Text>
        <Text style={styles.detailText}>📍 {company.address}</Text>
        {company.moaExpiryDate && (
          <Text style={styles.detailText}>📅 MOA Expires: {company.moaExpiryDate}</Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => handleViewCompany(company)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => handleEditCompany(company)}
        >
          <MaterialIcons name="edit" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDeleteCompany(company)}
        >
          <MaterialIcons name="delete" size={16} color="#fff" />
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
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCompany}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Company</Text>
        </TouchableOpacity>
      </View>

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
            <MaterialIcons name="business" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No companies found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'Add your first company partner to get started'
              }
            </Text>
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedCompany(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {showAddModal ? 'Add New Company' : 'Edit Company'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {showAddModal ? 'Fill in the company details below' : 'Update the company information'}
            </Text>
            
            {/* Form fields would go here */}
            <View style={styles.modalPlaceholder}>
              <MaterialIcons name="business-center" size={48} color="#ccc" />
              <Text style={styles.modalPlaceholderText}>
                Company form implementation would go here
              </Text>
              <Text style={styles.modalPlaceholderSubtext}>
                Include fields for: Name, Email, Phone, Address, Website, Industry, Contact Person, MOA details
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedCompany(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  // Handle save logic here
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedCompany(null);
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
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
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#34a853',
  },
  editButton: {
    backgroundColor: '#fbbc04',
  },
  deleteButton: {
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
    padding: 30,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  modalPlaceholder: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 30,
  },
  modalPlaceholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalPlaceholderSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#4285f4',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
