import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Animated,
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
  assignedCompanies?: number;
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

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
}

interface CoordinatorsPageProps {
  currentUser?: UserInfo | null;
}

export default function CoordinatorsPage({ currentUser }: CoordinatorsPageProps = {}) {
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAssignedCompaniesModal, setShowAssignedCompaniesModal] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [assignedCompanies, setAssignedCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [companyToUnassign, setCompanyToUnassign] = useState<any | null>(null);
  const [unassigning, setUnassigning] = useState(false);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; x: number; y: number; buttonWidth?: number }>({
    visible: false,
    text: '',
    x: 0,
    y: 0,
    buttonWidth: 0,
  });
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRefs = useRef<{ [key: string]: any }>({});

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
        // Map API response to component interface and fetch assigned companies count
        const mappedCoordinatorsPromises = response.coordinators.map(async (coordinator: ApiCoordinator) => {
          console.log('🚀 Frontend: Mapping coordinator:', coordinator.firstName, 'Campus Assignment:', coordinator.campusAssignment);
          
          // Get assigned companies count
          let assignedCompaniesCount = 0;
          try {
            const companiesResponse = await apiService.getCoordinatorAssignedCompanies(coordinator.id);
            if (companiesResponse.success && companiesResponse.companies) {
              assignedCompaniesCount = companiesResponse.companies.length;
            }
          } catch (error) {
            console.error('Error fetching assigned companies count:', error);
          }
          
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
            assignedCompanies: assignedCompaniesCount,
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
        
        const mappedCoordinators = await Promise.all(mappedCoordinatorsPromises);
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
      const adminUserId = currentUser?.id || '1'; // Get actual admin user ID
      const response = await apiService.assignCoordinatorCampus(coordinator.id, 'off-campus', adminUserId);
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
      const adminUserId = currentUser?.id || '1'; // Get actual admin user ID
      const response = await apiService.assignCoordinatorCampus(coordinator.id, 'in-campus', adminUserId);
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

  const handleAssignCompany = async (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setLoadingCompanies(true);
    try {
      // Fetch all companies and assigned companies in parallel
      const [allCompaniesResponse, assignedCompaniesResponse] = await Promise.all([
        apiService.getAllCompanies(true), // Fetch ALL companies
        apiService.getCoordinatorAssignedCompanies(coordinator.id) // Get already assigned companies
      ]);

      if (allCompaniesResponse.success && allCompaniesResponse.companies) {
        // Get list of company IDs already assigned to this coordinator
        const assignedCompanyIds = new Set<string>();
        const assignedCompaniesMap = new Map<string, any>();
        if (assignedCompaniesResponse.success && assignedCompaniesResponse.companies) {
          assignedCompaniesResponse.companies.forEach((company: any) => {
            if (company.id) {
              assignedCompanyIds.add(String(company.id));
              assignedCompaniesMap.set(String(company.id), {
                assignedAt: company.assignedAt,
                partnershipStatus: company.partnershipStatus,
                isAlreadyAssigned: true
              });
            }
          });
        }

        // Filter companies: Show only companies that are partnered with OTHER coordinators
        // (NOT partnered with current coordinator, but partnered with other coordinators)
        const filteredCompanies = allCompaniesResponse.companies.filter((company: any) => {
          const companyId = String(company.id);
          const isAssignedToCurrentCoordinator = assignedCompanyIds.has(companyId);
          
          // Exclude if already assigned to current coordinator
          if (isAssignedToCurrentCoordinator) {
            return false;
          }
          
          // Check if company has partnerships with OTHER coordinators
          let hasPartnershipWithOtherCoordinator = false;
          if (company.partnerships && Array.isArray(company.partnerships) && company.partnerships.length > 0) {
            hasPartnershipWithOtherCoordinator = company.partnerships.some((p: any) => 
              p.coordinator_user_id && parseInt(p.coordinator_user_id) !== parseInt(coordinator.userId)
            );
          }
          
          // Include only if partnered with OTHER coordinators (not current, but has other partnerships)
          return hasPartnershipWithOtherCoordinator;
        });

        // Mark which companies are already assigned and include their assignment details
        const companiesWithAssignmentStatus = filteredCompanies.map((company: any) => {
          const assignedInfo = assignedCompaniesMap.get(String(company.id));
          return {
            ...company,
            isAlreadyAssigned: !!assignedInfo,
            assignedAt: assignedInfo?.assignedAt || company.assignedAt,
            partnershipStatus: assignedInfo?.partnershipStatus || company.partnershipStatus || 'pending'
          };
        });

        setAvailableCompanies(companiesWithAssignmentStatus);
        setShowAssignModal(true);
      } else {
        Alert.alert('Error', typeof allCompaniesResponse.message === 'string' ? allCompaniesResponse.message : 'Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      Alert.alert('Error', 'Failed to fetch companies. Please try again.');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleConfirmAssignCompany = async (companyId: string) => {
    if (!selectedCoordinator || !currentUser?.id) {
      Alert.alert('Error', 'Missing coordinator or user information');
      return;
    }

    try {
      setLoadingCompanies(true);
      const response = await apiService.assignCoordinatorToCompany(
        selectedCoordinator.id,
        companyId,
        currentUser.id
      );

      if (response.success) {
        setSuccessMessage('Coordinator assigned to company successfully!');
        setIsSuccess(true);
        setShowSuccessModal(true);
        setShowAssignModal(false);
        await fetchCoordinators();
      } else {
        setSuccessMessage(response.message || 'Failed to assign coordinator to company');
        setIsSuccess(false);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error assigning coordinator to company:', error);
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSuccess(false);
      setShowSuccessModal(true);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleViewAssignedCompanies = async (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setLoadingCompanies(true);
    try {
      const response = await apiService.getCoordinatorAssignedCompanies(coordinator.id);
      if (response.success && response.companies) {
        setAssignedCompanies(response.companies);
        setShowAssignedCompaniesModal(true);
      } else {
        setAssignedCompanies([]);
        setShowAssignedCompaniesModal(true);
      }
    } catch (error) {
      console.error('Error fetching assigned companies:', error);
      setAssignedCompanies([]);
      setShowAssignedCompaniesModal(true);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleUnassignCompany = (company: any) => {
    setCompanyToUnassign(company);
    setShowUnassignModal(true);
  };

  const confirmUnassignCompany = async () => {
    if (!selectedCoordinator || !companyToUnassign) {
      Alert.alert('Error', 'Missing coordinator or company information');
      return;
    }

    try {
      setUnassigning(true);
      const response = await apiService.unassignCoordinatorFromCompany(
        selectedCoordinator.id,
        companyToUnassign.id
      );

      if (response.success) {
        setSuccessMessage(`Coordinator unassigned from ${companyToUnassign.name} successfully!`);
        setIsSuccess(true);
        setShowSuccessModal(true);
        setShowUnassignModal(false);
        setCompanyToUnassign(null);
        // Refresh assigned companies list
        await handleViewAssignedCompanies(selectedCoordinator);
        // Refresh coordinators list to update count
        await fetchCoordinators();
      } else {
        setSuccessMessage(response.message || 'Failed to unassign coordinator from company');
        setIsSuccess(false);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error unassigning coordinator from company:', error);
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSuccess(false);
      setShowSuccessModal(true);
    } finally {
      setUnassigning(false);
    }
  };

  const cancelUnassignCompany = () => {
    setShowUnassignModal(false);
    setCompanyToUnassign(null);
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

  const showTooltip = (text: string, event: any, buttonKey?: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    let x = 0;
    let y = 0;
    let buttonWidth = 32; // Default button width
    const tooltipHeight = 40; // Approximate tooltip height
    const arrowHeight = 6; // Arrow height
    const spacing = 4; // Spacing between tooltip and button
    
    if (Platform.OS === 'web') {
      // For web hover events - position tooltip above button, aligned with cursor
      if (event?.target) {
        const rect = event.target.getBoundingClientRect();
        buttonWidth = rect.width;
        
        // Use cursor position for horizontal alignment
        if (event.clientX !== undefined) {
          x = event.clientX;
        } else {
          x = rect.left + rect.width / 2; // Center of button
        }
        
        // Position tooltip above button - calculate Y position
        // The tooltip should appear above the button, with its bottom edge (arrow) just above button top
        const totalHeight = tooltipHeight + arrowHeight + spacing;
        
        // If cursor Y is available, try to position tooltip near cursor but above button
        if (event.clientY !== undefined) {
          // Calculate where tooltip bottom would be if positioned at cursor
          const tooltipBottomAtCursor = event.clientY;
          const tooltipTopAtCursor = tooltipBottomAtCursor - tooltipHeight - arrowHeight;
          
          // Ensure tooltip is above button (tooltip bottom should be above button top)
          if (tooltipTopAtCursor < rect.top - totalHeight) {
            // Cursor is high enough, position tooltip so its bottom is at cursor
            y = event.clientY - tooltipHeight - arrowHeight;
          } else {
            // Cursor is too low, position tooltip above button
            y = rect.top - totalHeight;
          }
        } else {
          // No cursor Y, position above button
          y = rect.top - totalHeight;
        }
      } else if (event?.clientX !== undefined && event?.clientY !== undefined) {
        // Fallback: use cursor position directly
        x = event.clientX;
        // Position tooltip above cursor
        y = event.clientY - tooltipHeight - arrowHeight - spacing;
      }
    } else if (event?.nativeEvent) {
      // For mobile press events - try to measure button
      const buttonRef = buttonKey ? buttonRefs.current[buttonKey] : null;
      if (buttonRef) {
        buttonRef.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          buttonWidth = width;
          setTooltip({
            visible: true,
            text,
            x: px + width / 2, // Center of button
            y: py - tooltipHeight - arrowHeight - spacing, // Above button with spacing
            buttonWidth: width,
          });
        });
        return;
      } else {
        // Fallback: use event coordinates
        const { pageX, pageY } = event.nativeEvent;
        x = pageX || 0;
        y = (pageY || 0) - tooltipHeight - arrowHeight - spacing;
      }
    }
    
    setTooltip({
      visible: true,
      text,
      x,
      y,
      buttonWidth,
    });
  };

  const hideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip(prev => ({ ...prev, visible: false }));
    }, 150);
  };

  const handleButtonPress = (action: () => void, tooltipText: string) => {
    hideTooltip();
    action();
  };

  // Render coordinator table
  const renderCoordinatorTable = () => {
    const isMobile = screenData.width <= BREAKPOINTS.mobile;
    
    if (isMobile) {
      // Mobile: Render as cards
      return (
        <View style={styles.mobileContainer}>
          {filteredCoordinators.map((coordinator) => (
            <View key={coordinator.id} style={styles.mobileCard}>
              <View style={styles.mobileCardHeader}>
                <View style={styles.mobileProfileContainer}>
                  {coordinator.profilePicture ? (
                    <Image source={{ uri: coordinator.profilePicture }} style={styles.mobileProfileImage} />
                  ) : (
                    <View style={styles.mobileProfilePlaceholder}>
                      <Text style={styles.mobileProfileText}>
                        {coordinator.firstName.charAt(0)}{coordinator.lastName.charAt(0)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.mobileCardInfo}>
                  <Text style={styles.mobileCardName}>
                    {coordinator.firstName} {coordinator.lastName}
                  </Text>
                  <Text style={styles.mobileCardEmail}>{coordinator.email}</Text>
                </View>
                <View style={[styles.mobileStatusBadge, { backgroundColor: getStatusColor(coordinator.status) }]}>
                  <Text style={styles.mobileStatusText}>{getStatusText(coordinator.status)}</Text>
                </View>
              </View>
              <View style={styles.mobileCardDetails}>
                <View style={styles.mobileDetailRow}>
                  <Text style={styles.mobileDetailLabel}>Program:</Text>
                  <Text style={styles.mobileDetailValue}>{coordinator.program}</Text>
                </View>
                <View style={styles.mobileDetailRow}>
                  <Text style={styles.mobileDetailLabel}>Department:</Text>
                  <Text style={styles.mobileDetailValue}>{coordinator.department}</Text>
                </View>
                <View style={styles.mobileDetailRow}>
                  <Text style={styles.mobileDetailLabel}>Assigned Interns:</Text>
                  <Text style={styles.mobileDetailValue}>{coordinator.assignedInterns}</Text>
                </View>
                <View style={styles.mobileDetailRow}>
                  <Text style={styles.mobileDetailLabel}>Assigned Companies:</Text>
                  <TouchableOpacity onPress={() => handleViewAssignedCompanies(coordinator)}>
                    <Text style={[styles.mobileDetailValue, { color: '#8b5cf6' }]}>{coordinator.assignedCompanies || 0}</Text>
                  </TouchableOpacity>
                </View>
                {coordinator.campusAssignment && (
                  <View style={styles.mobileDetailRow}>
                    <Text style={styles.mobileDetailLabel}>Campus:</Text>
                    <View style={[styles.mobileCampusBadge, { backgroundColor: coordinator.campusAssignment === 'in-campus' ? '#10b981' : '#f59e0b' }]}>
                      <Text style={styles.mobileCampusText}>
                        {coordinator.campusAssignment === 'in-campus' ? 'In-Campus' : 'Off-Campus'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.mobileActionButtons}>
                <TouchableOpacity 
                  style={[styles.mobileActionButton, styles.mobileViewButton]} 
                  onPress={() => handleButtonPress(() => handleViewDetails(coordinator), 'View Details')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('View Details', e)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('View Details', e),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons name="visibility" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.mobileActionButton, styles.mobileStudentsButton]} 
                  onPress={() => handleButtonPress(() => handleViewStudents(coordinator), 'View Students')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('View Students', e)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('View Students', e),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons name="people" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.mobileActionButton, styles.mobileOffCampusButton]} 
                  onPress={() => handleButtonPress(() => handleAssignOffCampus(coordinator), 'Assign Off-Campus')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Assign Off-Campus', e)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('Assign Off-Campus', e),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons name="location-off" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.mobileActionButton, styles.mobileInCampusButton]} 
                  onPress={() => handleButtonPress(() => handleAssignInCampus(coordinator), 'Assign In-Campus')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Assign In-Campus', e)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('Assign In-Campus', e),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons name="location-on" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.mobileActionButton, styles.mobileAssignButton]} 
                  onPress={() => handleButtonPress(() => handleAssignCompany(coordinator), 'Assign Company')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Assign Company', e)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('Assign Company', e),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons name="add-business" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.mobileActionButton, styles.mobileDeleteButton]} 
                  onPress={() => handleButtonPress(() => handleDeleteCoordinator(coordinator), 'Delete Coordinator')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Delete Coordinator', e)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('Delete Coordinator', e),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons name="delete" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      );
    }
    
    // Desktop/Tablet: Render as table
    return (
      <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.tableCellName]}>
              <Text style={styles.tableHeaderText}>Name</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellEmail]}>
              <Text style={styles.tableHeaderText}>Email</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellProgram]}>
              <Text style={styles.tableHeaderText}>Program</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellDepartment]}>
              <Text style={styles.tableHeaderText}>Department</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellStatus]}>
              <Text style={styles.tableHeaderText}>Status</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellCampus]}>
              <Text style={styles.tableHeaderText}>Campus</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellInterns]}>
              <Text style={styles.tableHeaderText}>Interns</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellCompanies]}>
              <Text style={styles.tableHeaderText}>Companies</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellAdmin]}>
              <Text style={styles.tableHeaderText}>Admin</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.tableCellActions]}>
              <Text style={styles.tableHeaderText}>Actions</Text>
            </View>
          </View>
          
          {/* Table Rows */}
          {filteredCoordinators.map((coordinator, index) => (
            <View key={coordinator.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
              <View style={[styles.tableCell, styles.tableCellName]}>
                <View style={styles.tableCellNameContent}>
                  <View style={styles.tableProfileContainer}>
                    {coordinator.profilePicture ? (
                      <Image source={{ uri: coordinator.profilePicture }} style={styles.tableProfileImage} />
                    ) : (
                      <View style={styles.tableProfilePlaceholder}>
                        <Text style={styles.tableProfileText}>
                          {coordinator.firstName.charAt(0)}{coordinator.lastName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tableCellNameText}>
                    {coordinator.firstName} {coordinator.lastName}
                  </Text>
                </View>
              </View>
              <View style={[styles.tableCell, styles.tableCellEmail]}>
                <Text style={styles.tableCellText} numberOfLines={1}>{coordinator.email}</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellProgram]}>
                <Text style={styles.tableCellText}>{coordinator.program}</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellDepartment]}>
                <Text style={styles.tableCellText}>{coordinator.department}</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellStatus]}>
                <View style={[styles.tableStatusBadge, { backgroundColor: getStatusColor(coordinator.status) }]}>
                  <Text style={styles.tableStatusText}>{getStatusText(coordinator.status)}</Text>
                </View>
              </View>
              <View style={[styles.tableCell, styles.tableCellCampus]}>
                {coordinator.campusAssignment ? (
                  <View style={[styles.tableCampusBadge, { backgroundColor: coordinator.campusAssignment === 'in-campus' ? '#10b981' : '#f59e0b' }]}>
                    <Text style={styles.tableCampusText}>
                      {coordinator.campusAssignment === 'in-campus' ? 'In-Campus' : 'Off-Campus'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.tableCellTextMuted}>-</Text>
                )}
              </View>
              <View style={[styles.tableCell, styles.tableCellInterns]}>
                <View style={styles.tableInternsContainer}>
                  <MaterialIcons name="people" size={16} color="#3b82f6" />
                  <Text style={styles.tableInternsText}>{coordinator.assignedInterns}</Text>
                </View>
              </View>
              <View style={[styles.tableCell, styles.tableCellCompanies]}>
                <TouchableOpacity 
                  style={styles.tableCompaniesContainer}
                  onPress={() => handleViewAssignedCompanies(coordinator)}
                >
                  <MaterialIcons name="business" size={16} color="#8b5cf6" />
                  <Text style={styles.tableCompaniesText}>{coordinator.assignedCompanies || 0}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.tableCell, styles.tableCellAdmin]}>
                {coordinator.isAdminCoordinator ? (
                  <View style={styles.tableAdminBadge}>
                    <MaterialIcons name="admin-panel-settings" size={14} color="#10b981" />
                    <Text style={styles.tableAdminText}>Yes</Text>
                  </View>
                ) : (
                  <Text style={styles.tableCellTextMuted}>No</Text>
                )}
              </View>
              <View style={[styles.tableCell, styles.tableCellActions]}>
                <View style={styles.tableActionButtons}>
                  <TouchableOpacity 
                    ref={(ref) => { buttonRefs.current[`view-${coordinator.id}`] = ref; }}
                    style={[styles.tableActionButton, styles.tableActionView]} 
                    onPress={() => handleButtonPress(() => handleViewDetails(coordinator), 'View Details')}
                    onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('View Details', e, `view-${coordinator.id}`)}
                    onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                    onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('View Details', e, `view-${coordinator.id}`)}
                    {...(Platform.OS === 'web' ? {
                      onMouseEnter: (e: any) => showTooltip('View Details', e, `view-${coordinator.id}`),
                      onMouseLeave: hideTooltip,
                    } : {})}
                  >
                    <MaterialIcons name="visibility" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    ref={(ref) => { buttonRefs.current[`students-${coordinator.id}`] = ref; }}
                    style={[styles.tableActionButton, styles.tableActionStudents]} 
                    onPress={() => handleButtonPress(() => handleViewStudents(coordinator), 'View Students')}
                    onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('View Students', e, `students-${coordinator.id}`)}
                    onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                    onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('View Students', e, `students-${coordinator.id}`)}
                    {...(Platform.OS === 'web' ? {
                      onMouseEnter: (e: any) => showTooltip('View Students', e, `students-${coordinator.id}`),
                      onMouseLeave: hideTooltip,
                    } : {})}
                  >
                    <MaterialIcons name="people" size={16} color="#8b5cf6" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    ref={(ref) => { buttonRefs.current[`offcampus-${coordinator.id}`] = ref; }}
                    style={[styles.tableActionButton, styles.tableActionOffCampus]} 
                    onPress={() => handleButtonPress(() => handleAssignOffCampus(coordinator), 'Assign Off-Campus')}
                    onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Assign Off-Campus', e, `offcampus-${coordinator.id}`)}
                    onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                    onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('Assign Off-Campus', e, `offcampus-${coordinator.id}`)}
                    {...(Platform.OS === 'web' ? {
                      onMouseEnter: (e: any) => showTooltip('Assign Off-Campus', e, `offcampus-${coordinator.id}`),
                      onMouseLeave: hideTooltip,
                    } : {})}
                  >
                    <MaterialIcons name="location-off" size={16} color="#f59e0b" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    ref={(ref) => { buttonRefs.current[`incampus-${coordinator.id}`] = ref; }}
                    style={[styles.tableActionButton, styles.tableActionInCampus]} 
                    onPress={() => handleButtonPress(() => handleAssignInCampus(coordinator), 'Assign In-Campus')}
                    onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Assign In-Campus', e, `incampus-${coordinator.id}`)}
                    onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                    onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('Assign In-Campus', e, `incampus-${coordinator.id}`)}
                    {...(Platform.OS === 'web' ? {
                      onMouseEnter: (e: any) => showTooltip('Assign In-Campus', e, `incampus-${coordinator.id}`),
                      onMouseLeave: hideTooltip,
                    } : {})}
                  >
                    <MaterialIcons name="location-on" size={16} color="#8b5cf6" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    ref={(ref) => { buttonRefs.current[`assign-${coordinator.id}`] = ref; }}
                    style={[styles.tableActionButton, styles.tableActionAssign]} 
                    onPress={() => handleButtonPress(() => handleAssignCompany(coordinator), 'Assign Company')}
                    onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Assign Company', e, `assign-${coordinator.id}`)}
                    onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                    onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('Assign Company', e, `assign-${coordinator.id}`)}
                    {...(Platform.OS === 'web' ? {
                      onMouseEnter: (e: any) => showTooltip('Assign Company', e, `assign-${coordinator.id}`),
                      onMouseLeave: hideTooltip,
                    } : {})}
                  >
                    <MaterialIcons name="add-business" size={16} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    ref={(ref) => { buttonRefs.current[`delete-${coordinator.id}`] = ref; }}
                    style={[styles.tableActionButton, styles.tableActionDelete]} 
                    onPress={() => handleButtonPress(() => handleDeleteCoordinator(coordinator), 'Delete Coordinator')}
                    onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Delete Coordinator', e, `delete-${coordinator.id}`)}
                    onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                    onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('Delete Coordinator', e, `delete-${coordinator.id}`)}
                    {...(Platform.OS === 'web' ? {
                      onMouseEnter: (e: any) => showTooltip('Delete Coordinator', e, `delete-${coordinator.id}`),
                      onMouseLeave: hideTooltip,
                    } : {})}
                  >
                    <MaterialIcons name="delete" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
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


      {/* Coordinators Table */}
      <View style={styles.tableWrapper}>
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
          <ScrollView style={styles.coordinatorsList} showsVerticalScrollIndicator={false}>
            {renderCoordinatorTable()}
          </ScrollView>
        )}
      </View>


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

      {/* Assign Company Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign Company - {selectedCoordinator?.firstName} {selectedCoordinator?.lastName}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowAssignModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingCompanies ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4285f4" />
                  <Text style={styles.loadingText}>Loading companies...</Text>
                </View>
              ) : availableCompanies.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="business" size={64} color="#ccc" />
                  <Text style={styles.emptyStateTitle}>No companies available</Text>
                  <Text style={styles.emptyStateText}>
                    No companies found in the system.
                  </Text>
                </View>
              ) : (
                <View style={styles.companiesList}>
                  {availableCompanies.map((company, index) => (
                    <TouchableOpacity
                      key={company.id || index}
                      style={[
                        styles.companyCard,
                        company.isAlreadyAssigned && styles.companyCardDisabled
                      ]}
                      onPress={() => !company.isAlreadyAssigned && handleConfirmAssignCompany(company.id)}
                      disabled={company.isAlreadyAssigned}
                    >
                      <View style={styles.companyCardContent}>
                        <View style={styles.companyCardHeader}>
                          <Text style={styles.companyCardName}>{company.name}</Text>
                          {company.isAlreadyAssigned && (
                            <View style={styles.alreadyAssignedBadge}>
                              <MaterialIcons name="check-circle" size={14} color="#10b981" />
                              <Text style={styles.alreadyAssignedText}>Assigned</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.companyCardIndustry}>Industry: {company.industry}</Text>
                        <Text style={styles.companyCardAddress}>{company.address}</Text>
                        {company.email && (
                          <Text style={styles.companyCardEmail}>{company.email}</Text>
                        )}
                        {company.isAlreadyAssigned && company.assignedAt && (
                          <View style={styles.companyCardFooter}>
                            <View style={styles.companyCardFooterLeft}>
                              <View style={[styles.statusBadge, { backgroundColor: company.partnershipStatus === 'approved' ? '#10b981' : '#f59e0b' }]}>
                                <Text style={styles.statusText}>
                                  {company.partnershipStatus === 'approved' ? 'Approved' : company.partnershipStatus || 'Pending'}
                                </Text>
                              </View>
                              <Text style={styles.companyCardDate}>
                                Assigned: {new Date(company.assignedAt).toLocaleDateString()}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assigned Companies Modal */}
      <Modal
        visible={showAssignedCompaniesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignedCompaniesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assigned Companies - {selectedCoordinator?.firstName} {selectedCoordinator?.lastName}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowAssignedCompaniesModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingCompanies ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4285f4" />
                  <Text style={styles.loadingText}>Loading companies...</Text>
                </View>
              ) : assignedCompanies.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="business" size={64} color="#ccc" />
                  <Text style={styles.emptyStateTitle}>No companies assigned</Text>
                  <Text style={styles.emptyStateText}>
                    This coordinator doesn't have any assigned companies yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.companiesList}>
                  {assignedCompanies.map((company, index) => (
                    <View key={company.id || index} style={styles.companyCard}>
                      <View style={styles.companyCardContent}>
                        <Text style={styles.companyCardName}>{company.name}</Text>
                        <Text style={styles.companyCardIndustry}>Industry: {company.industry}</Text>
                        <Text style={styles.companyCardAddress}>{company.address}</Text>
                        {company.email && (
                          <Text style={styles.companyCardEmail}>{company.email}</Text>
                        )}
                        <View style={styles.companyCardFooter}>
                          <View style={styles.companyCardFooterLeft}>
                            <View style={[styles.statusBadge, { backgroundColor: company.partnershipStatus === 'approved' ? '#10b981' : '#f59e0b' }]}>
                              <Text style={styles.statusText}>
                                {company.partnershipStatus === 'approved' ? 'Approved' : company.partnershipStatus}
                              </Text>
                            </View>
                            {company.assignedAt && (
                              <Text style={styles.companyCardDate}>
                                Assigned: {new Date(company.assignedAt).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={styles.unassignButton}
                            onPress={() => handleUnassignCompany(company)}
                          >
                            <MaterialIcons name="remove-circle" size={16} color="#ef4444" />
                            <Text style={styles.unassignButtonText}>Unassign</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAssignedCompaniesModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unassign Company Confirmation Modal */}
      <Modal
        visible={showUnassignModal}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelUnassignCompany}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons name="warning" size={48} color="#ef4444" style={styles.modalWarningIcon} />
            <Text style={styles.modalTitle}>Unassign Company</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to unassign {companyToUnassign?.name} from {selectedCoordinator?.firstName} {selectedCoordinator?.lastName}? This will remove the partnership between them.
            </Text>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={cancelUnassignCompany}
                disabled={unassigning}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { flex: 1, backgroundColor: '#ef4444' }]}
                onPress={confirmUnassignCompany}
                disabled={unassigning}
              >
                {unassigning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Unassign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tooltip */}
      {tooltip.visible && (
        <View 
          style={[
            styles.tooltip,
            {
              left: tooltip.x,
              top: tooltip.y,
              transform: [{ translateX: -50 }], // Center tooltip on button (50% of tooltip width)
            }
          ]}
          pointerEvents="none"
        >
          <Text style={styles.tooltipText}>{tooltip.text}</Text>
          <View style={styles.tooltipArrowDown} />
        </View>
      )}
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
  tableWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  coordinatorsList: {
    flex: 1,
  },
  // Table Styles
  tableContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 20,
    marginRight: 16,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    alignSelf: 'stretch',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#151419',
    borderBottomWidth: 2,
    borderBottomColor: '#F56E0F',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBFBFB',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 12,
    minHeight: 72,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  // Column Widths - Using flex for better width distribution
  tableCellName: {
    flex: 2,
    minWidth: 200,
  },
  tableCellEmail: {
    flex: 2.5,
    minWidth: 200,
  },
  tableCellProgram: {
    flex: 1.5,
    minWidth: 120,
  },
  tableCellDepartment: {
    flex: 1.5,
    minWidth: 120,
  },
  tableCellStatus: {
    flex: 1,
    minWidth: 90,
  },
  tableCellCampus: {
    flex: 1.2,
    minWidth: 110,
  },
  tableCellInterns: {
    flex: 1,
    minWidth: 90,
  },
  tableCellCompanies: {
    flex: 1,
    minWidth: 100,
  },
  tableCellAdmin: {
    flex: 1,
    minWidth: 90,
  },
  tableCellActions: {
    flex: 2,
    minWidth: 200,
  },
  // Table Cell Content
  tableCellNameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableProfileContainer: {
    marginRight: 12,
  },
  tableProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  tableProfilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  tableProfileText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  tableCellNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  tableCellText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  tableCellTextMuted: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  tableStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tableStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  tableCampusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tableCampusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  tableInternsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableInternsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  tableCompaniesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableCompaniesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  tableAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tableAdminText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  tableActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableActionView: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  tableActionStudents: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  tableActionOffCampus: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  tableActionInCampus: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  tableActionAssign: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  tableActionDelete: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  // Mobile Styles
  mobileContainer: {
    padding: 16,
    gap: 16,
  },
  mobileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobileProfileContainer: {
    marginRight: 12,
  },
  mobileProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  mobileProfilePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileProfileText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  mobileCardInfo: {
    flex: 1,
  },
  mobileCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  mobileCardEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  mobileStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mobileStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  mobileCardDetails: {
    marginBottom: 12,
    gap: 8,
  },
  mobileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  mobileDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  mobileDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  mobileCampusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mobileCampusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  mobileActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  mobileActionButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileViewButton: {
    backgroundColor: '#3b82f6',
  },
  mobileStudentsButton: {
    backgroundColor: '#8b5cf6',
  },
  mobileOffCampusButton: {
    backgroundColor: '#f59e0b',
  },
  mobileInCampusButton: {
    backgroundColor: '#8b5cf6',
  },
  mobileAssignButton: {
    backgroundColor: '#10b981',
  },
  mobileDeleteButton: {
    backgroundColor: '#ef4444',
  },
  // Modal Styles (for status badges and permissions)
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
    fontWeight: '600',
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
  modalMessage: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
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
  // Tooltip Styles
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    maxWidth: 200,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1e293b',
  },
  tooltipArrowDown: {
    position: 'absolute',
    top: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1e293b',
  },
  // Company Assignment Modal Styles
  companiesList: {
    gap: 12,
  },
  companyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  companyCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f1f5f9',
  },
  companyCardContent: {
    gap: 8,
  },
  companyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  companyCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  alreadyAssignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  alreadyAssignedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  companyCardIndustry: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  companyCardAddress: {
    fontSize: 13,
    color: '#94a3b8',
  },
  companyCardEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  companyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  companyCardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  companyCardDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  unassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  unassignButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  modalWarningIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
});
