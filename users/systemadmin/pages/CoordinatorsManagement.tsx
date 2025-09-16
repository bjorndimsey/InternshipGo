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
import { apiService, Coordinator } from '../../../lib/api';

const { width } = Dimensions.get('window');

// Remove the local interface since we're importing it from api.ts

export default function CoordinatorsManagement() {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [filteredCoordinators, setFilteredCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    program: '',
    address: '',
    password: ''
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
      const response = await apiService.getCoordinators();
      
      if (response.success && response.coordinators) {
        setCoordinators(response.coordinators);
      } else {
        throw new Error(response.message || 'Failed to fetch coordinators');
      }
    } catch (error) {
      console.error('Error fetching coordinators:', error);
      Alert.alert('Error', 'Failed to fetch coordinators');
    } finally {
      setLoading(false);
    }
  };

  const filterCoordinators = () => {
    let filtered = coordinators;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(coordinator =>
        coordinator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.department.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCoordinators(filtered);
  };

  const handleAddCoordinator = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      program: '',
      address: '',
      password: ''
    });
    setShowAddModal(true);
  };

  const handleEditCoordinator = (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setFormData({
      firstName: coordinator.firstName,
      lastName: coordinator.lastName,
      email: coordinator.email,
      phone: coordinator.phone,
      program: coordinator.program,
      address: coordinator.address,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleViewCoordinator = (coordinator: Coordinator) => {
    const adminInfo = coordinator.isAdminCoordinator 
      ? `\nAdmin Status: Active\nAdmin ID: ${coordinator.adminId}\nPermissions: ${JSON.stringify(coordinator.adminPermissions, null, 2)}`
      : '\nAdmin Status: Not an Admin';
      
    Alert.alert(
      'Coordinator Details',
      `Name: ${coordinator.name}\nEmail: ${coordinator.email}\nPhone: ${coordinator.phone}\nProgram: ${coordinator.program}\nDepartment: ${coordinator.department}\nUniversity: ${coordinator.university}\nAssigned Interns: ${coordinator.assignedInterns}\nAdmin Coordinator: ${coordinator.isAdminCoordinator ? 'Yes' : 'No'}${adminInfo}\nStatus: ${coordinator.status}\nJoin Date: ${new Date(coordinator.joinDate).toLocaleDateString()}`,
      [{ text: 'OK' }]
    );
  };

  const handleDeleteCoordinator = async (coordinator: Coordinator) => {
    Alert.alert(
      'Delete Coordinator',
      `Are you sure you want to delete ${coordinator.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteCoordinator(coordinator.id);
              if (response.success) {
                setCoordinators(coordinators.filter(c => c.id !== coordinator.id));
                Alert.alert('Success', 'Coordinator deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete coordinator');
              }
            } catch (error) {
              console.error('Error deleting coordinator:', error);
              Alert.alert('Error', 'Failed to delete coordinator');
            }
          },
        },
      ]
    );
  };

  const handleToggleAdminStatus = async (coordinator: Coordinator) => {
    console.log('🔧 handleToggleAdminStatus called for coordinator:', coordinator.name, 'isAdmin:', coordinator.isAdminCoordinator);
    
    // For testing, let's bypass the Alert and directly assign admin
    console.log('🔧 TESTING: Bypassing Alert dialog and directly assigning admin...');
    
    try {
      console.log('🔧 Making API call...');
      setLoading(true);
      
      const response = await apiService.toggleCoordinatorAdminStatus(
        coordinator.id, 
        !coordinator.isAdminCoordinator,
        1 // System admin ID - in real app, get from auth context
      );
      
      console.log('🔧 API response:', response);
      
      if (response.success) {
        console.log('🔧 Updating coordinator list...');
        // Update the coordinator in the list
        setCoordinators(coordinators.map(c => 
          c.id === coordinator.id 
            ? { 
                ...c, 
                isAdminCoordinator: !c.isAdminCoordinator,
                adminId: !c.isAdminCoordinator ? 'new-admin-id' : undefined,
                adminPermissions: !c.isAdminCoordinator ? {
                  can_manage_coordinators: true,
                  can_manage_interns: true,
                  can_manage_companies: true,
                  can_view_reports: true
                } : undefined
              }
            : c
        ));
        
        console.log('🔧 SUCCESS: Admin status updated!');
        Alert.alert(
          'Success', 
          `Coordinator admin status ${!coordinator.isAdminCoordinator ? 'enabled' : 'disabled'} successfully`,
          [{ text: 'OK' }]
        );
      } else {
        console.error('🔧 API error:', response.message);
        Alert.alert('Error', response.message || 'Failed to update admin status');
      }
    } catch (error) {
      console.error('🔧 Error toggling admin status:', error);
      Alert.alert('Error', 'Failed to update admin status');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoordinator = async () => {
    try {
      if (showAddModal) {
        // Create new coordinator
        const response = await apiService.createCoordinator(formData);
        if (response.success && response.coordinator) {
          setCoordinators([response.coordinator, ...coordinators]);
          setShowAddModal(false);
          Alert.alert('Success', 'Coordinator created successfully');
        } else {
          Alert.alert('Error', response.message || 'Failed to create coordinator');
        }
      } else if (showEditModal && selectedCoordinator) {
        // Update existing coordinator
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          program: formData.program,
          address: formData.address
        };
        
        const response = await apiService.updateCoordinator(selectedCoordinator.id, updateData);
        if (response.success) {
          // Refresh the coordinators list
          await fetchCoordinators();
          setShowEditModal(false);
          setSelectedCoordinator(null);
          Alert.alert('Success', 'Coordinator updated successfully');
        } else {
          Alert.alert('Error', response.message || 'Failed to update coordinator');
        }
      }
    } catch (error) {
      console.error('Error saving coordinator:', error);
      Alert.alert('Error', 'Failed to save coordinator');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ea4335';
      default: return '#666';
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
              <Text style={styles.profileText}>{coordinator.name.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.coordinatorInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.coordinatorName}>{coordinator.name}</Text>
            {coordinator.isAdminCoordinator && (
              <View style={styles.adminBadge}>
                <MaterialIcons name="admin-panel-settings" size={16} color="#fff" />
                <Text style={styles.adminText}>ADMIN</Text>
              </View>
            )}
          </View>
          {coordinator.isAdminCoordinator && coordinator.adminPermissions && (
            <View style={styles.permissionsContainer}>
              <Text style={styles.permissionsText}>
                Permissions: {Object.entries(coordinator.adminPermissions)
                  .filter(([_, value]) => value)
                  .map(([key, _]) => key.replace('can_', '').replace(/_/g, ' '))
                  .join(', ')}
              </Text>
            </View>
          )}
          <Text style={styles.coordinatorDepartment}>{coordinator.program}</Text>
          <Text style={styles.coordinatorUniversity}>{coordinator.university}</Text>
          <Text style={styles.assignedInterns}>
            Assigned Interns: {coordinator.assignedInterns}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(coordinator.status) }]}>
              <Text style={styles.statusText}>{coordinator.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.joinDate}>Joined: {new Date(coordinator.joinDate).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.coordinatorDetails}>
        <Text style={styles.detailText}>📧 {coordinator.email}</Text>
        <Text style={styles.detailText}>📱 {coordinator.phone}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]} 
          onPress={() => handleViewCoordinator(coordinator)}
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
          style={[styles.actionButton, coordinator.isAdminCoordinator ? styles.removeAdminButton : styles.assignAdminButton]} 
          onPress={() => {
            console.log('🔧 Admin button pressed for:', coordinator.name);
            handleToggleAdminStatus(coordinator);
          }}
        >
          <MaterialIcons name={coordinator.isAdminCoordinator ? "remove" : "add"} size={16} color="#fff" />
          <Text style={styles.actionButtonText}>
            {coordinator.isAdminCoordinator ? 'Remove Admin' : 'Assign Admin'}
          </Text>
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
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCoordinator}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Coordinator</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
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

      {/* Coordinators List */}
      <ScrollView style={styles.coordinatorsList} showsVerticalScrollIndicator={false}>
        {filteredCoordinators.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="people" size={64} color="#ccc" />
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

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedCoordinator(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {showAddModal ? 'Add New Coordinator' : 'Edit Coordinator'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {showAddModal ? 'Fill in the coordinator details below' : 'Update the coordinator information'}
            </Text>
            
            {/* Form fields */}
            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({...formData, firstName: text})}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({...formData, lastName: text})}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="Enter email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Program *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.program}
                  onChangeText={(text) => setFormData({...formData, program: text})}
                  placeholder="Enter program"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  placeholder="Enter address"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {showAddModal && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.password}
                    onChangeText={(text) => setFormData({...formData, password: text})}
                    placeholder="Enter password"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedCoordinator(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveCoordinator}
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  coordinatorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginRight: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbbc04',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 2,
  },
  permissionsContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  permissionsText: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  coordinatorDepartment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  coordinatorUniversity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  assignedInterns: {
    fontSize: 14,
    color: '#4285f4',
    fontWeight: '600',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  coordinatorDetails: {
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
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#34a853',
  },
  editButton: {
    backgroundColor: '#fbbc04',
  },
  assignAdminButton: {
    backgroundColor: '#9c27b0',
  },
  removeAdminButton: {
    backgroundColor: '#ff9800',
  },
  deleteButton: {
    backgroundColor: '#ea4335',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 10,
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
    maxHeight: '80%',
  },
  formContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
