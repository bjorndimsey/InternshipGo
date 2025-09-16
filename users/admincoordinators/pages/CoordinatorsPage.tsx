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

const { width } = Dimensions.get('window');

interface Coordinator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  employeeId: string;
  department: string;
  position: string;
  university: string;
  officeLocation: string;
  status: 'active' | 'inactive' | 'suspended';
  assignedCompanies: number;
  assignedInterns: number;
  joinDate: string;
  lastActive: string;
  permissions: {
    canManageInterns: boolean;
    canManageCompanies: boolean;
    canCreateEvents: boolean;
    canViewReports: boolean;
  };
}

export default function CoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [filteredCoordinators, setFilteredCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [newCoordinator, setNewCoordinator] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    employeeId: '',
    department: '',
    position: '',
    university: '',
    officeLocation: '',
  });

  useEffect(() => {
    fetchCoordinators();
  }, []);

  useEffect(() => {
    filterCoordinators();
  }, [searchQuery, coordinators]);

  const fetchCoordinators = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockCoordinators: Coordinator[] = [
        {
          id: '1',
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@university.edu',
          phoneNumber: '+1 (555) 123-4567',
          employeeId: 'EMP2024001',
          department: 'Computer Science',
          position: 'Internship Coordinator',
          university: 'University of Technology',
          officeLocation: 'Building A, Room 205',
          status: 'active',
          assignedCompanies: 3,
          assignedInterns: 15,
          joinDate: '2020-01-15',
          lastActive: '2024-01-25',
          permissions: {
            canManageInterns: true,
            canManageCompanies: true,
            canCreateEvents: true,
            canViewReports: true,
          },
        },
        {
          id: '2',
          firstName: 'Dr. Michael',
          lastName: 'Chen',
          email: 'michael.chen@university.edu',
          phoneNumber: '+1 (555) 234-5678',
          employeeId: 'EMP2024002',
          department: 'Data Science',
          position: 'Senior Coordinator',
          university: 'University of Technology',
          officeLocation: 'Building B, Room 310',
          status: 'active',
          assignedCompanies: 2,
          assignedInterns: 12,
          joinDate: '2019-08-20',
          lastActive: '2024-01-24',
          permissions: {
            canManageInterns: true,
            canManageCompanies: true,
            canCreateEvents: true,
            canViewReports: false,
          },
        },
        {
          id: '3',
          firstName: 'Dr. Emily',
          lastName: 'Rodriguez',
          email: 'emily.rodriguez@university.edu',
          phoneNumber: '+1 (555) 345-6789',
          employeeId: 'EMP2024003',
          department: 'Engineering',
          position: 'Coordinator',
          university: 'University of Technology',
          officeLocation: 'Building C, Room 150',
          status: 'inactive',
          assignedCompanies: 0,
          assignedInterns: 0,
          joinDate: '2021-03-10',
          lastActive: '2024-01-15',
          permissions: {
            canManageInterns: false,
            canManageCompanies: false,
            canCreateEvents: false,
            canViewReports: false,
          },
        },
        {
          id: '4',
          firstName: 'Dr. James',
          lastName: 'Wilson',
          email: 'james.wilson@university.edu',
          phoneNumber: '+1 (555) 456-7890',
          employeeId: 'EMP2024004',
          department: 'Business',
          position: 'Assistant Coordinator',
          university: 'University of Technology',
          officeLocation: 'Building D, Room 420',
          status: 'active',
          assignedCompanies: 1,
          assignedInterns: 8,
          joinDate: '2022-09-01',
          lastActive: '2024-01-26',
          permissions: {
            canManageInterns: true,
            canManageCompanies: false,
            canCreateEvents: true,
            canViewReports: false,
          },
        },
      ];
      
      setCoordinators(mockCoordinators);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCoordinators = () => {
    let filtered = coordinators;

    if (searchQuery) {
      filtered = filtered.filter(coordinator =>
        coordinator.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.department.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCoordinators(filtered);
  };

  const handleAddCoordinator = () => {
    if (!newCoordinator.firstName || !newCoordinator.lastName || !newCoordinator.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const coordinator: Coordinator = {
      id: Date.now().toString(),
      ...newCoordinator,
      status: 'active',
      assignedCompanies: 0,
      assignedInterns: 0,
      joinDate: new Date().toISOString().split('T')[0],
      lastActive: new Date().toISOString().split('T')[0],
      permissions: {
        canManageInterns: true,
        canManageCompanies: true,
        canCreateEvents: true,
        canViewReports: false,
      },
    };

    setCoordinators([coordinator, ...coordinators]);
    setNewCoordinator({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      employeeId: '',
      department: '',
      position: '',
      university: '',
      officeLocation: '',
    });
    setShowAddModal(false);
    Alert.alert('Success', 'Coordinator added successfully');
  };

  const handleEditCoordinator = (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setShowEditModal(true);
  };

  const handleUpdateCoordinator = () => {
    if (!selectedCoordinator) return;

    setCoordinators(coordinators.map(coordinator =>
      coordinator.id === selectedCoordinator.id ? selectedCoordinator : coordinator
    ));
    setShowEditModal(false);
    setSelectedCoordinator(null);
    Alert.alert('Success', 'Coordinator updated successfully');
  };

  const handleDeleteCoordinator = (coordinator: Coordinator) => {
    Alert.alert(
      'Delete Coordinator',
      `Are you sure you want to delete ${coordinator.firstName} ${coordinator.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setCoordinators(coordinators.filter(c => c.id !== coordinator.id));
            Alert.alert('Success', 'Coordinator deleted successfully');
          }
        },
      ]
    );
  };

  const handleViewDetails = (coordinator: Coordinator) => {
    Alert.alert(
      'Coordinator Details',
      `Name: ${coordinator.firstName} ${coordinator.lastName}\nEmail: ${coordinator.email}\nPhone: ${coordinator.phoneNumber}\nEmployee ID: ${coordinator.employeeId}\nDepartment: ${coordinator.department}\nPosition: ${coordinator.position}\nUniversity: ${coordinator.university}\nOffice: ${coordinator.officeLocation}\nStatus: ${coordinator.status}\nAssigned Companies: ${coordinator.assignedCompanies}\nAssigned Interns: ${coordinator.assignedInterns}\nJoin Date: ${coordinator.joinDate}\nLast Active: ${coordinator.lastActive}`,
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ea4335';
      case 'suspended': return '#fbbc04';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'suspended': return 'Suspended';
      default: return 'Unknown';
    }
  };

  const CoordinatorCard = ({ coordinator }: { coordinator: Coordinator }) => (
    <View style={styles.coordinatorCard}>
      <View style={styles.coordinatorHeader}>
        <View style={styles.profileContainer}>
          {coordinator.profilePicture ? (
            <Image source={{ uri: coordinator.profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileText}>
                {coordinator.firstName.charAt(0)}{coordinator.lastName.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.coordinatorInfo}>
          <Text style={styles.coordinatorName}>
            {coordinator.firstName} {coordinator.lastName}
          </Text>
          <Text style={styles.coordinatorPosition}>{coordinator.position}</Text>
          <Text style={styles.coordinatorDepartment}>{coordinator.department}</Text>
          <Text style={styles.coordinatorEmail}>{coordinator.email}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(coordinator.status) }]}>
            <Text style={styles.statusText}>{getStatusText(coordinator.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.coordinatorDetails}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{coordinator.assignedCompanies}</Text>
            <Text style={styles.statLabel}>Companies</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{coordinator.assignedInterns}</Text>
            <Text style={styles.statLabel}>Interns</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {Math.floor((new Date().getTime() - new Date(coordinator.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 365))}
            </Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
        </View>

        <View style={styles.permissionsContainer}>
          <Text style={styles.permissionsLabel}>Permissions:</Text>
          <View style={styles.permissionsList}>
            {coordinator.permissions.canManageInterns && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="school" size={16} color="#34a853" />
                <Text style={styles.permissionText}>Manage Interns</Text>
              </View>
            )}
            {coordinator.permissions.canManageCompanies && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="business-center" size={16} color="#34a853" />
                <Text style={styles.permissionText}>Manage Companies</Text>
              </View>
            )}
            {coordinator.permissions.canCreateEvents && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="event" size={16} color="#34a853" />
                <Text style={styles.permissionText}>Create Events</Text>
              </View>
            )}
            {coordinator.permissions.canViewReports && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="assessment" size={16} color="#34a853" />
                <Text style={styles.permissionText}>View Reports</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.lastActive}>
          Last active: {coordinator.lastActive}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => handleViewDetails(coordinator)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => handleEditCoordinator(coordinator)}
        >
          <MaterialIcons name="edit" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDeleteCoordinator(coordinator)}
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
        <Text style={styles.loadingText}>Loading coordinators...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Coordinators Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Coordinator</Text>
        </TouchableOpacity>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coordinators..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredCoordinators.length}</Text>
          <Text style={styles.statLabel}>Total Coordinators</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#34a853' }]}>
            {filteredCoordinators.filter(c => c.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ea4335' }]}>
            {filteredCoordinators.filter(c => c.status === 'inactive').length}
          </Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
            {filteredCoordinators.reduce((sum, c) => sum + c.assignedInterns, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Interns</Text>
        </View>
      </View>

      {/* Coordinators List */}
      <ScrollView style={styles.coordinatorsList} showsVerticalScrollIndicator={false}>
        {filteredCoordinators.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="supervisor-account" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No coordinators found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'Add your first coordinator to get started'
              }
            </Text>
          </View>
        ) : (
          filteredCoordinators.map((coordinator) => (
            <CoordinatorCard key={coordinator.id} coordinator={coordinator} />
          ))
        )}
      </ScrollView>

      {/* Add Coordinator Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Coordinator</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowAddModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.firstName}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, firstName: text})}
                  placeholder="Enter first name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.lastName}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, lastName: text})}
                  placeholder="Enter last name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.email}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, email: text})}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.phoneNumber}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, phoneNumber: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Employee ID</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.employeeId}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, employeeId: text})}
                  placeholder="Enter employee ID"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.department}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, department: text})}
                  placeholder="Enter department"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Position</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.position}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, position: text})}
                  placeholder="Enter position"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>University</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.university}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, university: text})}
                  placeholder="Enter university"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Office Location</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCoordinator.officeLocation}
                  onChangeText={(text) => setNewCoordinator({...newCoordinator, officeLocation: text})}
                  placeholder="Enter office location"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddCoordinator}
              >
                <Text style={styles.saveButtonText}>Add Coordinator</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Coordinator Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Coordinator</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowEditModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalNote}>
                Edit functionality will be implemented soon.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateCoordinator}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
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
  coordinatorsList: {
    flex: 1,
    padding: 20,
  },
  coordinatorCard: {
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
  coordinatorHeader: {
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
  coordinatorInfo: {
    flex: 1,
  },
  coordinatorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  coordinatorPosition: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  coordinatorDepartment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  coordinatorEmail: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    alignItems: 'flex-end',
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
  coordinatorDetails: {
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  permissionsContainer: {
    marginBottom: 10,
  },
  permissionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  lastActive: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
  editButton: {
    backgroundColor: '#34a853',
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
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
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
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a2e',
  },
  modalNote: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4285f4',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
