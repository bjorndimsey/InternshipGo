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

interface Intern {
  id: string;
  name: string;
  age: number;
  academicYear: string;
  profilePicture?: string;
  email: string;
  phone: string;
  university: string;
  course: string;
  status: 'active' | 'inactive' | 'graduated';
}

const academicYears = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'];

export default function InternsManagement() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    filterInterns();
  }, [searchQuery, selectedYear, interns]);

  const fetchInterns = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data - replace with real API call
      const mockInterns: Intern[] = [
        {
          id: '1',
          name: 'John Doe',
          age: 20,
          academicYear: '3rd Year',
          email: 'john.doe@email.com',
          phone: '+1234567890',
          university: 'University of Technology',
          course: 'Computer Science',
          status: 'active',
        },
        {
          id: '2',
          name: 'Sarah Wilson',
          age: 21,
          academicYear: '4th Year',
          email: 'sarah.wilson@email.com',
          phone: '+1234567891',
          university: 'State University',
          course: 'Information Technology',
          status: 'active',
        },
        {
          id: '3',
          name: 'Mike Johnson',
          age: 19,
          academicYear: '2nd Year',
          email: 'mike.johnson@email.com',
          phone: '+1234567892',
          university: 'Tech Institute',
          course: 'Software Engineering',
          status: 'inactive',
        },
        {
          id: '4',
          name: 'Emily Davis',
          age: 22,
          academicYear: 'Graduate',
          email: 'emily.davis@email.com',
          phone: '+1234567893',
          university: 'Metro University',
          course: 'Data Science',
          status: 'graduated',
        },
      ];
      
      setInterns(mockInterns);
    } catch (error) {
      console.error('Error fetching interns:', error);
      Alert.alert('Error', 'Failed to fetch interns');
    } finally {
      setLoading(false);
    }
  };

  const filterInterns = () => {
    let filtered = interns;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(intern =>
        intern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.university.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by academic year
    if (selectedYear !== 'All') {
      filtered = filtered.filter(intern => intern.academicYear === selectedYear);
    }

    setFilteredInterns(filtered);
  };

  const handleAddIntern = () => {
    setShowAddModal(true);
  };

  const handleEditIntern = (intern: Intern) => {
    setSelectedIntern(intern);
    setShowEditModal(true);
  };

  const handleViewIntern = (intern: Intern) => {
    Alert.alert(
      'Intern Details',
      `Name: ${intern.name}\nAge: ${intern.age}\nAcademic Year: ${intern.academicYear}\nEmail: ${intern.email}\nPhone: ${intern.phone}\nUniversity: ${intern.university}\nCourse: ${intern.course}\nStatus: ${intern.status}`,
      [{ text: 'OK' }]
    );
  };

  const handleDeleteIntern = (intern: Intern) => {
    Alert.alert(
      'Delete Intern',
      `Are you sure you want to delete ${intern.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setInterns(interns.filter(i => i.id !== intern.id));
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ff9800';
      case 'graduated': return '#9c27b0';
      default: return '#666';
    }
  };

  const InternCard = ({ intern }: { intern: Intern }) => (
    <View style={styles.internCard}>
      <View style={styles.internHeader}>
        <View style={styles.profileContainer}>
          {intern.profilePicture ? (
            <Image source={{ uri: intern.profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileText}>{intern.name.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.internInfo}>
          <Text style={styles.internName}>{intern.name}</Text>
          <Text style={styles.internAge}>Age: {intern.age}</Text>
          <Text style={styles.internYear}>{intern.academicYear}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(intern.status) }]}>
            <Text style={styles.statusText}>{intern.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.internDetails}>
        <Text style={styles.detailText}>📧 {intern.email}</Text>
        <Text style={styles.detailText}>📱 {intern.phone}</Text>
        <Text style={styles.detailText}>🏫 {intern.university}</Text>
        <Text style={styles.detailText}>📚 {intern.course}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => handleViewIntern(intern)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => handleEditIntern(intern)}
        >
          <MaterialIcons name="edit" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDeleteIntern(intern)}
        >
          <MaterialIcons name="delete" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading interns...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddIntern}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Intern</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search interns..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Academic Year:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['All', ...academicYears].map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.filterChip,
                  selectedYear === year && styles.activeFilterChip
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedYear === year && styles.activeFilterChipText
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Interns List */}
      <ScrollView style={styles.internsList} showsVerticalScrollIndicator={false}>
        {filteredInterns.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="school" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No interns found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedYear !== 'All' 
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first intern to get started'
              }
            </Text>
          </View>
        ) : (
          filteredInterns.map((intern) => (
            <InternCard key={intern.id} intern={intern} />
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
          setSelectedIntern(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {showAddModal ? 'Add New Intern' : 'Edit Intern'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {showAddModal ? 'Fill in the intern details below' : 'Update the intern information'}
            </Text>
            
            {/* Form fields would go here */}
            <View style={styles.modalPlaceholder}>
              <MaterialIcons name="person-add" size={48} color="#ccc" />
              <Text style={styles.modalPlaceholderText}>
                Form implementation would go here
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedIntern(null);
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
                  setSelectedIntern(null);
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
    marginBottom: 15,
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
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  activeFilterChip: {
    backgroundColor: '#4285f4',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  internsList: {
    flex: 1,
    padding: 20,
  },
  internCard: {
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
  internHeader: {
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
  internInfo: {
    flex: 1,
  },
  internName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  internAge: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  internYear: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  internDetails: {
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
