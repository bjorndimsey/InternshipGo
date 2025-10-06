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
import { apiService, Coordinator as ApiCoordinator } from '../../../lib/api';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const BREAKPOINTS = {
  mobile: 699,
  tablet: 1024,
  laptop: 1100,
  desktop: 1400,
};

// Get screen size category
const getScreenSize = (screenWidth: number) => {
  if (screenWidth <= BREAKPOINTS.mobile) return 'mobile';
  if (screenWidth <= BREAKPOINTS.tablet) return 'tablet';
  if (screenWidth <= BREAKPOINTS.laptop) return 'laptop';
  return 'desktop';
};

// Get cards per row based on screen size
const getCardsPerRow = (screenWidth: number) => {
  const screenSize = getScreenSize(screenWidth);
  switch (screenSize) {
    case 'mobile': return 1;
    case 'tablet': return 2;
    case 'laptop':
    case 'desktop': return 3;
    default: return 3;
  }
};

interface Coordinator {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePicture?: string;
  program: string;
  address: string;
  status: 'active' | 'inactive';
  assignedInterns: number;
  joinDate: string;
  isAdminCoordinator: boolean;
  adminId?: string;
  adminPermissions?: {
    can_manage_coordinators: boolean;
    can_manage_interns: boolean;
    can_manage_companies: boolean;
    can_view_reports: boolean;
    can_manage_events?: boolean;
    can_manage_notifications?: boolean;
  };
  university: string;
  department: string;
  campusAssignment?: 'in-campus' | 'off-campus';
  assignedBy?: string;
  assignedAt?: string;
}

export default function CoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [filteredCoordinators, setFilteredCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    fetchCoordinators();
  }, []);

  useEffect(() => {
    filterCoordinators();
  }, [searchQuery, coordinators]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  const fetchCoordinators = async () => {
    try {
      setLoading(true);
      console.log('🚀 Frontend: Fetching coordinators...');
      const response = await apiService.getCoordinators();
      console.log('🚀 Frontend: API response:', response);
      
      if (response.success && response.coordinators) {
        // Map API response to component interface
        const mappedCoordinators: Coordinator[] = response.coordinators.map((coordinator: ApiCoordinator) => {
          console.log('🚀 Frontend: Mapping coordinator:', coordinator.firstName, 'Campus Assignment:', coordinator.campusAssignment);
          return {
            id: coordinator.id,
            userId: coordinator.userId,
            firstName: coordinator.firstName,
            lastName: coordinator.lastName,
            email: coordinator.email,
            phone: coordinator.phone,
            profilePicture: coordinator.profilePicture,
            program: coordinator.program,
            address: coordinator.address,
            status: coordinator.status,
            assignedInterns: coordinator.assignedInterns || 0,
            joinDate: coordinator.joinDate,
            isAdminCoordinator: coordinator.isAdminCoordinator,
            adminId: coordinator.adminId,
            adminPermissions: coordinator.adminPermissions,
            university: coordinator.university || 'University',
            department: coordinator.department || coordinator.program,
            campusAssignment: coordinator.campusAssignment,
            assignedBy: coordinator.assignedBy,
            assignedAt: coordinator.assignedAt,
          };
        });
        
        console.log('🚀 Frontend: Mapped coordinators:', mappedCoordinators);
        setCoordinators(mappedCoordinators);
      } else {
        console.error('Failed to fetch coordinators:', response.message);
        Alert.alert('Error', 'Failed to fetch coordinators. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching coordinators:', error);
      Alert.alert('Error', 'Failed to fetch coordinators. Please check your connection and try again.');
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
        coordinator.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coordinator.department.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCoordinators(filtered);
  };


  const handleEditCoordinator = (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setShowEditModal(true);
  };

  const handleUpdateCoordinator = async () => {
    if (!selectedCoordinator) return;

    try {
      const response = await apiService.updateCoordinator(selectedCoordinator.id, {
        firstName: selectedCoordinator.firstName,
        lastName: selectedCoordinator.lastName,
        email: selectedCoordinator.email,
        phone: selectedCoordinator.phone,
        program: selectedCoordinator.program,
        address: selectedCoordinator.address,
        isActive: selectedCoordinator.status === 'active',
      });

      if (response.success) {
        // Refresh the coordinators list
        await fetchCoordinators();
        setShowEditModal(false);
        setSelectedCoordinator(null);
        Alert.alert('Success', 'Coordinator updated successfully');
      } else {
        Alert.alert('Error', typeof response.message === 'string' ? response.message : 'Failed to update coordinator');
      }
    } catch (error) {
      console.error('Error updating coordinator:', error);
      Alert.alert('Error', 'Failed to update coordinator. Please try again.');
    }
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
          onPress: async () => {
            try {
              const response = await apiService.deleteCoordinator(coordinator.id);
              
              if (response.success) {
                // Refresh the coordinators list
                await fetchCoordinators();
                Alert.alert('Success', 'Coordinator deleted successfully');
              } else {
                Alert.alert('Error', typeof response.message === 'string' ? response.message : 'Failed to delete coordinator');
              }
            } catch (error) {
              console.error('Error deleting coordinator:', error);
              Alert.alert('Error', 'Failed to delete coordinator. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleViewDetails = (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setShowViewModal(true);
  };

  const handleViewStudents = async (coordinator: Coordinator) => {
    try {
      setSelectedCoordinator(coordinator);
      setLoading(true);
      console.log('🚀 Frontend: Fetching assigned students for coordinator:', coordinator.id);
      
      const response = await apiService.getCoordinatorInterns(coordinator.id);
      console.log('🚀 Frontend: Assigned students response:', response);
      
      if (response.success && response.interns) {
        setAssignedStudents(response.interns);
        setShowStudentsModal(true);
      } else {
        setAssignedStudents([]);
        setShowStudentsModal(true);
      }
    } catch (error) {
      console.error('❌ Frontend: Error fetching assigned students:', error);
      setAssignedStudents([]);
      setShowStudentsModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOffCampus = async (coordinator: Coordinator) => {
    console.log('🚀 Frontend: handleAssignOffCampus called for:', coordinator.firstName);
    
    // Direct assignment without Alert for testing
    try {
      console.log('🚀 Frontend: Starting off-campus assignment for:', coordinator.id);
      console.log('🚀 Frontend: Calling API service...');
      const response = await apiService.assignCoordinatorCampus(coordinator.id, 'off-campus', '1'); // TODO: Get actual admin user ID
      console.log('🚀 Frontend: API response:', response);
      if (response.success) {
        console.log('🚀 Frontend: Assignment successful, showing success modal');
        setSuccessMessage('Coordinator assigned to off-campus duties successfully!');
        setIsSuccess(true);
        setShowSuccessModal(true);
        // Refresh the coordinators list
        console.log('🚀 Frontend: Refreshing coordinators list...');
        await fetchCoordinators();
        console.log('🚀 Frontend: Coordinators list refreshed');
      } else {
        console.log('❌ Frontend: Assignment failed:', response.message);
        setSuccessMessage(response.message || 'Failed to assign coordinator to off-campus duties');
        setIsSuccess(false);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('❌ Frontend: Error assigning coordinator to off-campus:', error);
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSuccess(false);
      setShowSuccessModal(true);
    }
  };

  const handleAssignInCampus = async (coordinator: Coordinator) => {
    console.log('🚀 Frontend: handleAssignInCampus called for:', coordinator.firstName);
    
    // Direct assignment without Alert for testing
    try {
      console.log('🚀 Frontend: Starting in-campus assignment for:', coordinator.id);
      console.log('🚀 Frontend: Calling API service...');
      const response = await apiService.assignCoordinatorCampus(coordinator.id, 'in-campus', '1'); // TODO: Get actual admin user ID
      console.log('🚀 Frontend: API response:', response);
      if (response.success) {
        console.log('🚀 Frontend: Assignment successful, showing success modal');
        setSuccessMessage('Coordinator assigned to in-campus duties successfully!');
        setIsSuccess(true);
        setShowSuccessModal(true);
        // Refresh the coordinators list
        console.log('🚀 Frontend: Refreshing coordinators list...');
        await fetchCoordinators();
        console.log('🚀 Frontend: Coordinators list refreshed');
      } else {
        console.log('❌ Frontend: Assignment failed:', response.message);
        setSuccessMessage(response.message || 'Failed to assign coordinator to in-campus duties');
        setIsSuccess(false);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('❌ Frontend: Error assigning coordinator to in-campus:', error);
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSuccess(false);
      setShowSuccessModal(true);
    }
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

  // Render coordinator cards in responsive grid
  const renderCoordinatorCards = () => {
    const cardsPerRow = getCardsPerRow(screenData.width);
    const padding = 48; // 24px padding on each side
    const gap = 12; // Gap between cards
    const cardWidth = (screenData.width - padding - (cardsPerRow - 1) * gap) / cardsPerRow;
    
    return (
      <View style={styles.responsiveGrid}>
        {filteredCoordinators.map((coordinator) => (
          <View key={coordinator.id} style={[styles.coordinatorCardWrapper, { width: cardWidth }]}>
            <CoordinatorCard coordinator={coordinator} />
          </View>
        ))}
      </View>
    );
  };

  const CoordinatorCard = ({ coordinator }: { coordinator: Coordinator }) => {
    console.log('🚀 Frontend: Rendering coordinator card for:', coordinator.firstName, 'Campus Assignment:', coordinator.campusAssignment);
    console.log('🚀 Frontend: Rendering action buttons for:', coordinator.firstName);
    return (
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
          <Text style={styles.coordinatorPosition}>{coordinator.program}</Text>
          <Text style={styles.coordinatorDepartment}>{coordinator.department}</Text>
          <Text style={styles.coordinatorEmail}>{coordinator.email}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(coordinator.status) }]}>
            <Text style={styles.statusText}>{getStatusText(coordinator.status)}</Text>
          </View>
          {coordinator.campusAssignment && (
            <View style={[styles.campusBadge, { backgroundColor: coordinator.campusAssignment === 'in-campus' ? '#10b981' : '#f59e0b' }]}>
              <Text style={styles.campusText}>
                {coordinator.campusAssignment === 'in-campus' ? 'In-Campus' : 'Off-Campus'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.coordinatorDetails}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {Math.floor((new Date().getTime() - new Date(coordinator.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 365))}
            </Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {coordinator.isAdminCoordinator ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.statLabel}>Admin</Text>
          </View>
        </View>

        {/* Assigned Interns Section - Below Stats */}
        <View style={styles.assignedInternsSection}>
          <View style={styles.assignedInternsHeader}>
            <MaterialIcons name="people" size={20} color="#3b82f6" />
            <Text style={styles.assignedInternsTitle}>Assigned Interns</Text>
          </View>
          <View style={styles.assignedInternsContent}>
            <Text style={styles.assignedInternsCount}>{coordinator.assignedInterns}</Text>
            <Text style={styles.assignedInternsLabel}>Students</Text>
          </View>
        </View>

        <View style={styles.permissionsContainer}>
          <Text style={styles.permissionsLabel}>Permissions:</Text>
          <View style={styles.permissionsList}>
            {coordinator.adminPermissions?.can_manage_interns && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="school" size={16} color="#34a853" />
                <Text style={styles.permissionText}>Manage Interns</Text>
              </View>
            )}
            {coordinator.adminPermissions?.can_manage_companies && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="business-center" size={16} color="#34a853" />
                <Text style={styles.permissionText}>Manage Companies</Text>
              </View>
            )}
            {coordinator.adminPermissions?.can_manage_events && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="event" size={16} color="#34a853" />
                <Text style={styles.permissionText}>Create Events</Text>
              </View>
            )}
            {coordinator.adminPermissions?.can_view_reports && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="assessment" size={16} color="#34a853" />
                <Text style={styles.permissionText}>View Reports</Text>
              </View>
            )}
            {coordinator.adminPermissions?.can_manage_coordinators && (
              <View style={styles.permissionItem}>
                <MaterialIcons name="supervisor-account" size={16} color="#34a853" />
                <Text style={styles.permissionText}>Manage Coordinators</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.lastActive}>
          Join Date: {coordinator.joinDate}
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
          style={[styles.actionButton, styles.viewStudentsButton]} 
          onPress={() => handleViewStudents(coordinator)}
        >
          <MaterialIcons name="people" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Students</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.assignOffCampusButton]} 
          onPress={() => {
            console.log('🚀 Frontend: Off Campus button pressed for:', coordinator.firstName);
            setTestMessage(`Off Campus button pressed for ${coordinator.firstName}!`);
            console.log('🚀 Frontend: State updated with test message');
            handleAssignOffCampus(coordinator);
          }}
        >
          <MaterialIcons name="location-off" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Off Campus</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.assignInCampusButton]} 
          onPress={() => {
            console.log('🚀 Frontend: In Campus button pressed for:', coordinator.firstName);
            setTestMessage(`In Campus button pressed for ${coordinator.firstName}!`);
            console.log('🚀 Frontend: State updated with test message');
            handleAssignInCampus(coordinator);
          }}
        >
          <MaterialIcons name="location-on" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>In Campus</Text>
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
  };

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
      <View style={[styles.header, { 
        flexDirection: screenData.width <= BREAKPOINTS.mobile ? 'column' : 'row',
        alignItems: screenData.width <= BREAKPOINTS.mobile ? 'stretch' : 'center',
        gap: screenData.width <= BREAKPOINTS.mobile ? 15 : 0
      }]}>
        <Text style={[styles.headerTitle, { 
          textAlign: screenData.width <= BREAKPOINTS.mobile ? 'center' : 'left' 
        }]}>Coordinators Management</Text>
      </View>

      {/* Test Message Display */}
      {testMessage ? (
        <View style={{ backgroundColor: '#f0f0f0', padding: 10, margin: 10, borderRadius: 5 }}>
          <Text style={{ color: '#333', textAlign: 'center' }}>{testMessage}</Text>
        </View>
      ) : null}

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
          renderCoordinatorCards()
        )}
      </ScrollView>


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

      {/* View Coordinator Modal */}
      <Modal
        visible={showViewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Coordinator Details</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowViewModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedCoordinator && (
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>
                      {selectedCoordinator.firstName} {selectedCoordinator.lastName}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.email}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.phone}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Program:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.program}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Department:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.department}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.address}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>University:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.university}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedCoordinator.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(selectedCoordinator.status)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Assigned Interns:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.assignedInterns}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Join Date:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.joinDate}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Admin Status:</Text>
                    <Text style={styles.detailValue}>
                      {selectedCoordinator.isAdminCoordinator ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Campus Assignment:</Text>
                    <Text style={styles.detailValue}>
                      {selectedCoordinator.campusAssignment ? 
                        `${selectedCoordinator.campusAssignment === 'in-campus' ? 'In-Campus' : 'Off-Campus'}` : 
                        'Not Assigned'
                      }
                    </Text>
                  </View>
                  
                  {selectedCoordinator.campusAssignment && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Assigned At:</Text>
                        <Text style={styles.detailValue}>
                          {selectedCoordinator.assignedAt ? 
                            new Date(selectedCoordinator.assignedAt).toLocaleDateString() : 
                            'N/A'
                          }
                        </Text>
                      </View>
                    </>
                  )}
                  
                  {selectedCoordinator.adminPermissions && (
                    <View style={styles.permissionsSection}>
                      <Text style={styles.permissionsTitle}>Admin Permissions:</Text>
                      <View style={styles.permissionsList}>
                        {selectedCoordinator.adminPermissions.can_manage_coordinators && (
                          <View style={styles.permissionItem}>
                            <MaterialIcons name="supervisor-account" size={16} color="#34a853" />
                            <Text style={styles.permissionText}>Manage Coordinators</Text>
                          </View>
                        )}
                        {selectedCoordinator.adminPermissions.can_manage_interns && (
                          <View style={styles.permissionItem}>
                            <MaterialIcons name="school" size={16} color="#34a853" />
                            <Text style={styles.permissionText}>Manage Interns</Text>
                          </View>
                        )}
                        {selectedCoordinator.adminPermissions.can_manage_companies && (
                          <View style={styles.permissionItem}>
                            <MaterialIcons name="business-center" size={16} color="#34a853" />
                            <Text style={styles.permissionText}>Manage Companies</Text>
                          </View>
                        )}
                        {selectedCoordinator.adminPermissions.can_view_reports && (
                          <View style={styles.permissionItem}>
                            <MaterialIcons name="assessment" size={16} color="#34a853" />
                            <Text style={styles.permissionText}>View Reports</Text>
                          </View>
                        )}
                        {selectedCoordinator.adminPermissions.can_manage_events && (
                          <View style={styles.permissionItem}>
                            <MaterialIcons name="event" size={16} color="#34a853" />
                            <Text style={styles.permissionText}>Manage Events</Text>
                          </View>
                        )}
                        {selectedCoordinator.adminPermissions.can_manage_notifications && (
                          <View style={styles.permissionItem}>
                            <MaterialIcons name="notifications" size={16} color="#34a853" />
                            <Text style={styles.permissionText}>Manage Notifications</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowViewModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Students Modal */}
      <Modal
        visible={showStudentsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStudentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assigned Students - {selectedCoordinator?.firstName} {selectedCoordinator?.lastName}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowStudentsModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {assignedStudents.length === 0 ? (
                <View style={styles.emptyStudentsState}>
                  <MaterialIcons name="people-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyStudentsText}>No students assigned yet</Text>
                  <Text style={styles.emptyStudentsSubtext}>
                    This coordinator doesn't have any assigned students at the moment.
                  </Text>
                </View>
              ) : (
                <View style={styles.studentsList}>
                  {assignedStudents.map((student, index) => (
                    <View key={student.id || index} style={styles.studentCard}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>
                          {student.first_name} {student.last_name}
                        </Text>
                        <Text style={styles.studentId}>ID: {student.id_number}</Text>
                        <Text style={styles.studentMajor}>Major: {student.major}</Text>
                        <Text style={styles.studentYear}>Year: {student.year}</Text>
                        <Text style={styles.studentProgram}>Program: {student.program}</Text>
                        <Text style={styles.studentStatus}>
                          Status: <Text style={[styles.statusText, { color: student.status === 'active' ? '#10b981' : '#ef4444' }]}>
                            {student.status}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowStudentsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons 
                name={isSuccess ? "check-circle" : "error"} 
                size={64} 
                color={isSuccess ? "#10b981" : "#ef4444"} 
              />
            </View>
            <Text style={styles.successTitle}>{isSuccess ? "Success!" : "Error"}</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: isSuccess ? "#3b82f6" : "#ef4444" }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
    color: '#64748b',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  assignedInternsSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  assignedInternsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  assignedInternsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  assignedInternsContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  assignedInternsCount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3b82f6',
  },
  assignedInternsLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  coordinatorsList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  coordinatorCardWrapper: {
    marginBottom: 12,
  },
  coordinatorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  coordinatorHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  profileContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  profilePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  profileText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  coordinatorInfo: {
    flex: 1,
  },
  coordinatorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  coordinatorPosition: {
    fontSize: 13,
    color: '#3b82f6',
    marginBottom: 2,
    fontWeight: '600',
  },
  coordinatorDepartment: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
    fontWeight: '500',
  },
  coordinatorEmail: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  campusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  campusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.1,
  },
  coordinatorDetails: {
    marginBottom: 12,
  },
  permissionsContainer: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  permissionsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  permissionText: {
    fontSize: 10,
    color: '#475569',
    marginLeft: 4,
    fontWeight: '600',
  },
  lastActive: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 44, // Increased from 36 to 44 for better touch target
    marginVertical: 2, // Added margin for better spacing
  },
  viewButton: {
    backgroundColor: '#3b82f6',
  },
  viewStudentsButton: {
    backgroundColor: '#8b5cf6',
  },
  editButton: {
    backgroundColor: '#10b981',
  },
  assignOffCampusButton: {
    backgroundColor: '#f59e0b',
  },
  assignInCampusButton: {
    backgroundColor: '#8b5cf6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  closeModalButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalBody: {
    padding: 24,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    fontWeight: '500',
  },
  modalNote: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  detailsContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    letterSpacing: -0.2,
  },
  detailValue: {
    fontSize: 15,
    color: '#64748b',
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  permissionsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  permissionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  // Success Modal Styles
  successModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  successIconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  successMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  successButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  // Students Modal Styles
  emptyStudentsState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStudentsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStudentsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  studentsList: {
    gap: 12,
  },
  studentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  studentInfo: {
    gap: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#64748b',
  },
  studentMajor: {
    fontSize: 14,
    color: '#64748b',
  },
  studentYear: {
    fontSize: 14,
    color: '#64748b',
  },
  studentProgram: {
    fontSize: 14,
    color: '#64748b',
  },
  studentStatus: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
});
