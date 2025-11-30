import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService, Coordinator } from '../../../lib/api';
import { EmailService } from '../../../lib/emailService';

const { width } = Dimensions.get('window');

// Responsive helper functions
const getResponsiveSize = (size: number) => {
  const scale = width / 375;
  return Math.max(size * scale, size * 0.8);
};

const getResponsiveFontSize = (size: number) => {
  const scale = width / 375;
  return Math.max(size * scale, size * 0.85);
};

const isSmallScreen = width < 768;

interface CoordinatorData {
  id: string;
  user_id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  program?: string;
  department?: string;
  university?: string;
  profilePicture?: string;
  status: 'active' | 'inactive';
  is_active?: boolean;
  joinDate?: string;
  isAdminCoordinator?: boolean;
  adminId?: string;
  adminPermissions?: {
    can_manage_coordinators: boolean;
    can_manage_interns: boolean;
    can_manage_companies: boolean;
    can_view_reports: boolean;
    can_manage_events?: boolean;
    can_manage_notifications?: boolean;
  };
  assignedInterns?: number;
}

export default function CoordinatorsManagement() {
  const [coordinators, setCoordinators] = useState<CoordinatorData[]>([]);
  const [filteredCoordinators, setFilteredCoordinators] = useState<CoordinatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCoordinator, setSelectedCoordinator] = useState<CoordinatorData | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showProgramFilterModal, setShowProgramFilterModal] = useState(false);
  const [warningModalData, setWarningModalData] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [successModalData, setSuccessModalData] = useState<{ title: string; message: string } | null>(null);
  const [dimensions, setDimensions] = useState({ width, height: Dimensions.get('window').height });
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; x: number; y: number; buttonWidth?: number }>({
    visible: false,
    text: '',
    x: 0,
    y: 0,
  });
  const buttonRefs = useRef<{ [key: string]: any }>({});
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCoordinators();
  }, []);

  useEffect(() => {
    filterCoordinators();
  }, [searchQuery, programFilter, coordinators]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  const fetchCoordinators = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCoordinators();
      
      if (response.success && response.coordinators) {
        const coordinatorsArray = Array.isArray(response.coordinators) ? response.coordinators : [];
        const mappedCoordinators: CoordinatorData[] = coordinatorsArray.map((coord: any) => ({
          id: coord.id?.toString() || '',
          user_id: coord.userId?.toString() || coord.user_id?.toString() || '',
          name: coord.name || `${coord.firstName || ''} ${coord.lastName || ''}`.trim() || 'N/A',
          firstName: coord.firstName || coord.first_name,
          lastName: coord.lastName || coord.last_name,
          email: coord.email || '',
          phone: coord.phone || coord.phone_number,
          program: coord.program || '',
          department: coord.department || coord.program || '',
          university: coord.university || '',
          profilePicture: coord.profilePicture || coord.profile_picture,
          status: (coord.status === 'inactive' || coord.is_active === false) ? 'inactive' : 'active',
          is_active: coord.status !== 'inactive' && coord.is_active !== false,
          joinDate: coord.joinDate || coord.created_at,
          isAdminCoordinator: coord.isAdminCoordinator || false,
          adminId: coord.adminId,
          adminPermissions: coord.adminPermissions,
          assignedInterns: coord.assignedInterns || 0,
        }));
        setCoordinators(mappedCoordinators);
      } else {
        const errorMessage = typeof response.message === 'string' ? response.message : 'Failed to fetch coordinators';
        Alert.alert('Error', errorMessage);
        setCoordinators([]);
      }
    } catch (error) {
      console.error('Error fetching coordinators:', error);
      Alert.alert('Error', 'Failed to fetch coordinators. Please try again.');
      setCoordinators([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCoordinators = () => {
    let filtered = coordinators;

    if (searchQuery) {
      filtered = filtered.filter(coordinator => {
        const fullName = `${coordinator.firstName || ''} ${coordinator.lastName || ''}`.toLowerCase();
        return (
          fullName.includes(searchQuery.toLowerCase()) ||
          coordinator.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coordinator.program?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coordinator.department?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    if (programFilter) {
      filtered = filtered.filter(coordinator => 
        coordinator.program?.toLowerCase() === programFilter.toLowerCase()
      );
    }

    setFilteredCoordinators(filtered);
  };

  const getUniquePrograms = () => {
    const programs = coordinators
      .map(c => c.program)
      .filter((p): p is string => !!p && p.trim() !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return programs;
  };

  const availablePrograms = ['BSIT', 'BITM', 'BSMATH', 'BSCE', 'BSMRS'];

  const handleViewCoordinator = (coordinator: CoordinatorData) => {
    setSelectedCoordinator(coordinator);
    setShowViewModal(true);
  };

  const handleToggleStatus = async (coordinator: CoordinatorData) => {
    console.log('🔄 handleToggleStatus called for coordinator:', coordinator.id, coordinator.name);
    const newStatus: 'active' | 'inactive' = coordinator.status === 'active' ? 'inactive' : 'active';
    const isActive = newStatus === 'active';
    const statusText = newStatus === 'active' ? 'enable' : 'disable';
    
    console.log('🔄 Current status:', coordinator.status, 'New status:', newStatus, 'isActive:', isActive);
    
    // Show warning modal
    setWarningModalData({
      title: `${statusText === 'enable' ? 'Enable' : 'Disable'} Coordinator`,
      message: `Are you sure you want to ${statusText} ${coordinator.name}? ${!isActive ? 'They will not be able to login until re-enabled.' : 'They can now login to the system.'}`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          console.log('🔄 Calling API to update coordinator status...');
          if (!coordinator.id) {
            setSuccessModalData({
              title: 'Error',
              message: 'Coordinator ID is missing. Please try again.'
            });
            setShowSuccessModal(true);
            return;
          }

          const response = await apiService.updateCoordinatorStatus(coordinator.id, isActive);
          console.log('🔄 API response:', response);
          
          if (response.success) {
            // Update local state using functional updates
            setCoordinators(prevCoordinators => {
              const updated = prevCoordinators.map(c => 
                c.id === coordinator.id ? { 
                  ...c, 
                  status: newStatus,
                  is_active: isActive
                } : c
              );
              console.log('🔄 Updated coordinators:', updated.find(c => c.id === coordinator.id));
              return updated;
            });
            
            // Also update filtered coordinators immediately
            setFilteredCoordinators(prevFiltered => {
              const updated = prevFiltered.map(c => 
                c.id === coordinator.id ? { 
                  ...c, 
                  status: newStatus,
                  is_active: isActive
                } : c
              );
              console.log('🔄 Updated filtered coordinators:', updated.find(c => c.id === coordinator.id));
              return updated;
            });
            
            // Send email notification if account is disabled
            if (!isActive) {
              try {
                const coordinatorEmail = coordinator.email?.trim();
                const coordinatorName = coordinator.name || `${coordinator.firstName || ''} ${coordinator.lastName || ''}`.trim() || 'User';
                
                if (!coordinatorEmail) {
                  console.warn('⚠️ Coordinator email is missing, cannot send disabled email');
                } else {
                  console.log('📧 Preparing to send disabled email to coordinator:', coordinatorEmail);
                  const emailResult = await EmailService.sendAccountDisabledEmail(
                    coordinatorEmail,
                    coordinatorName
                  );
                  
                  if (emailResult.success) {
                    console.log('✅ Account disabled email sent successfully to:', coordinatorEmail);
                  } else {
                    console.warn('⚠️ Failed to send account disabled email to:', coordinatorEmail, 'Error:', emailResult.error);
                    // Don't fail the operation if email fails
                  }
                }
              } catch (emailError) {
                console.error('Error sending account disabled email:', emailError);
                // Don't fail the operation if email fails
              }
            }
            
            // Show success modal
            setSuccessModalData({
              title: 'Success',
              message: `Coordinator ${statusText}d successfully. ${!isActive ? 'They cannot login until re-enabled. An email notification has been sent.' : 'They can now login.'}`
            });
            setShowSuccessModal(true);
          } else {
            console.error('🔄 API error:', response.message);
            setSuccessModalData({
              title: 'Error',
              message: response.message || 'Failed to update coordinator status. Please try again.'
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('🔄 Error updating coordinator status:', error);
          setSuccessModalData({
            title: 'Error',
            message: 'Failed to update coordinator status. Please try again.'
          });
          setShowSuccessModal(true);
        }
      }
    });
    setShowWarningModal(true);
  };

  const handleToggleAdminStatus = async (coordinator: CoordinatorData) => {
    console.log('👑 handleToggleAdminStatus called for coordinator:', coordinator.id, coordinator.name);
    const newAdminStatus = !coordinator.isAdminCoordinator;
    const actionText = newAdminStatus ? 'assign' : 'unassign';
    
    // Show warning modal
    setWarningModalData({
      title: `${newAdminStatus ? 'Assign' : 'Unassign'} Admin Coordinator`,
      message: `Are you sure you want to ${actionText} admin coordinator status to ${coordinator.name}? ${newAdminStatus ? 'They will have admin privileges and can manage coordinators, interns, companies, and view reports.' : 'They will lose admin privileges.'}`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          console.log('👑 Calling API to toggle admin status...');
          if (!coordinator.id) {
            setSuccessModalData({
              title: 'Error',
              message: 'Coordinator ID is missing. Please try again.'
            });
            setShowSuccessModal(true);
            return;
          }

          // Get current user ID (system admin) for assignedBy
          // TODO: Get actual system admin user ID from auth context
          const assignedBy = 1; // Default to 1 for system admin
          
          const response = await apiService.toggleCoordinatorAdminStatus(coordinator.id, newAdminStatus, assignedBy);
          console.log('👑 API response:', response);
          
          if (response.success) {
            // Update local state using functional updates
            setCoordinators(prevCoordinators => {
              const updated = prevCoordinators.map(c => 
                c.id === coordinator.id ? { 
                  ...c, 
                  isAdminCoordinator: newAdminStatus,
                  adminPermissions: newAdminStatus ? {
                    can_manage_coordinators: true,
                    can_manage_interns: true,
                    can_manage_companies: true,
                    can_view_reports: true,
                    can_manage_events: true,
                    can_manage_notifications: true
                  } : undefined
                } : c
              );
              console.log('👑 Updated coordinators:', updated.find(c => c.id === coordinator.id));
              return updated;
            });
            
            // Also update filtered coordinators immediately
            setFilteredCoordinators(prevFiltered => {
              const updated = prevFiltered.map(c => 
                c.id === coordinator.id ? { 
                  ...c, 
                  isAdminCoordinator: newAdminStatus,
                  adminPermissions: newAdminStatus ? {
                    can_manage_coordinators: true,
                    can_manage_interns: true,
                    can_manage_companies: true,
                    can_view_reports: true,
                    can_manage_events: true,
                    can_manage_notifications: true
                  } : undefined
                } : c
              );
              console.log('👑 Updated filtered coordinators:', updated.find(c => c.id === coordinator.id));
              return updated;
            });
            
            // Show success modal
            setSuccessModalData({
              title: 'Success',
              message: `Admin coordinator status ${actionText}ed successfully for ${coordinator.name}.`
            });
            setShowSuccessModal(true);
          } else {
            console.error('👑 API error:', response.message);
            setSuccessModalData({
              title: 'Error',
              message: response.message || `Failed to ${actionText} admin coordinator status. Please try again.`
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('👑 Error toggling admin status:', error);
          setSuccessModalData({
            title: 'Error',
            message: `Failed to ${actionText} admin coordinator status. Please try again.`
          });
          setShowSuccessModal(true);
        }
      }
    });
    setShowWarningModal(true);
  };

  const handleDeleteCoordinator = (coordinator: CoordinatorData) => {
    console.log('🗑️ handleDeleteCoordinator called for coordinator:', coordinator.id, coordinator.name);
    
    // Show warning modal
    setWarningModalData({
      title: 'Delete Coordinator',
      message: `Are you sure you want to delete ${coordinator.name}? This action cannot be undone and will permanently remove the coordinator and their account from the system.`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          console.log('🗑️ Calling API to delete coordinator...');
          if (!coordinator.id) {
            setSuccessModalData({
              title: 'Error',
              message: 'Coordinator ID is missing. Please try again.'
            });
            setShowSuccessModal(true);
            return;
          }

          const response = await apiService.deleteCoordinator(coordinator.id);
          console.log('🗑️ API response:', response);
          
          if (response.success) {
            // Update local state using functional updates
            setCoordinators(prevCoordinators => prevCoordinators.filter(c => c.id !== coordinator.id));
            // Also update filtered coordinators
            setFilteredCoordinators(prevFiltered => prevFiltered.filter(c => c.id !== coordinator.id));
            
            // Show success modal
            setSuccessModalData({
              title: 'Success',
              message: `Coordinator ${coordinator.name} has been deleted successfully.`
            });
            setShowSuccessModal(true);
          } else {
            console.error('🗑️ API error:', response.message);
            setSuccessModalData({
              title: 'Error',
              message: response.message || 'Failed to delete coordinator. Please try again.'
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('🗑️ Error deleting coordinator:', error);
          setSuccessModalData({
            title: 'Error',
            message: 'Failed to delete coordinator. Please try again.'
          });
          setShowSuccessModal(true);
        }
      }
    });
    setShowWarningModal(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#ef4444';
      default: return '#10b981';
    }
  };

  const getFullName = (coordinator: CoordinatorData) => {
    return coordinator.name || `${coordinator.firstName || ''} ${coordinator.lastName || ''}`.trim() || 'N/A';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  const showTooltip = (text: string, event: any, buttonKey?: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    let x = 0;
    let y = 0;
    let buttonWidth = 36;
    const tooltipHeight = 40;
    const arrowHeight = 6;
    const spacing = 4;
    
    if (Platform.OS === 'web') {
      if (event?.target) {
        const rect = event.target.getBoundingClientRect();
        buttonWidth = rect.width;
        
        if (event.clientX !== undefined) {
          x = event.clientX;
        } else {
          x = rect.left + rect.width / 2;
        }
        
        const totalHeight = tooltipHeight + arrowHeight + spacing;
        
        if (event.clientY !== undefined) {
          const tooltipBottomAtCursor = event.clientY;
          const tooltipTopAtCursor = tooltipBottomAtCursor - tooltipHeight - arrowHeight;
          
          if (tooltipTopAtCursor < rect.top - totalHeight) {
            y = event.clientY - tooltipHeight - arrowHeight;
          } else {
            y = rect.top - totalHeight;
          }
        } else {
          y = rect.top - totalHeight;
        }
      } else if (event?.clientX !== undefined && event?.clientY !== undefined) {
        x = event.clientX;
        y = event.clientY - tooltipHeight - arrowHeight - spacing;
      }
    } else if (event?.nativeEvent) {
      const buttonRef = buttonKey ? buttonRefs.current[buttonKey] : null;
      if (buttonRef) {
        buttonRef.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          buttonWidth = width;
          setTooltip({
            visible: true,
            text,
            x: px + width / 2,
            y: py - tooltipHeight - arrowHeight - spacing,
            buttonWidth: width,
          });
        });
        return;
      } else {
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

  const renderCoordinatorTable = () => {
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
                        {coordinator.firstName?.charAt(0)?.toUpperCase() || 'C'}
                        {coordinator.lastName?.charAt(0)?.toUpperCase() || 'O'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.tableCellNameTextContainer}>
                  <Text style={styles.tableCellNameText} numberOfLines={1}>
                    {getFullName(coordinator)}
                  </Text>
                  {coordinator.isAdminCoordinator && (
                    <View style={styles.adminBadge}>
                      <MaterialIcons name="admin-panel-settings" size={12} color="#9c27b0" />
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={[styles.tableCell, styles.tableCellEmail]}>
              <Text style={styles.tableCellText} numberOfLines={1}>{coordinator.email || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellProgram]}>
              <Text style={styles.tableCellText} numberOfLines={1}>{coordinator.program || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellDepartment]}>
              <Text style={styles.tableCellText} numberOfLines={1}>{coordinator.department || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellStatus]}>
              <View style={[styles.tableStatusBadge, { backgroundColor: getStatusColor(coordinator.status) }]}>
                <Text style={styles.tableStatusText}>{(coordinator.status || 'active').toUpperCase()}</Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.tableCellActions]}>
              <View style={styles.tableActionButtons}>
                <TouchableOpacity 
                  ref={(ref) => { buttonRefs.current[`view-${coordinator.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionView]} 
                  onPress={() => handleButtonPress(() => handleViewCoordinator(coordinator), 'View Details')}
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
                  ref={(ref) => { buttonRefs.current[`toggle-${coordinator.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionToggle]} 
                  onPress={() => handleButtonPress(() => handleToggleStatus(coordinator), coordinator.status === 'active' ? 'Disable Coordinator' : 'Enable Coordinator')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip(coordinator.status === 'active' ? 'Disable Coordinator' : 'Enable Coordinator', e, `toggle-${coordinator.id}`)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip(coordinator.status === 'active' ? 'Disable Coordinator' : 'Enable Coordinator', e, `toggle-${coordinator.id}`)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip(coordinator.status === 'active' ? 'Disable Coordinator' : 'Enable Coordinator', e, `toggle-${coordinator.id}`),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons 
                    name={coordinator.status === 'active' ? 'block' : 'check-circle'} 
                    size={16} 
                    color={coordinator.status === 'active' ? '#f59e0b' : '#10b981'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  ref={(ref) => { buttonRefs.current[`admin-${coordinator.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionAdmin, coordinator.isAdminCoordinator && styles.tableActionAdminActive]} 
                  onPress={() => handleButtonPress(() => handleToggleAdminStatus(coordinator), coordinator.isAdminCoordinator ? 'Unassign Admin Coordinator' : 'Assign Admin Coordinator')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip(coordinator.isAdminCoordinator ? 'Unassign Admin Coordinator' : 'Assign Admin Coordinator', e, `admin-${coordinator.id}`)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip(coordinator.isAdminCoordinator ? 'Unassign Admin Coordinator' : 'Assign Admin Coordinator', e, `admin-${coordinator.id}`)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip(coordinator.isAdminCoordinator ? 'Unassign Admin Coordinator' : 'Assign Admin Coordinator', e, `admin-${coordinator.id}`),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons 
                    name={coordinator.isAdminCoordinator ? 'admin-panel-settings' : 'person-add'} 
                    size={16} 
                    color={coordinator.isAdminCoordinator ? '#9c27b0' : '#9c27b0'} 
                  />
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
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading coordinators...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Coordinators Management</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coordinators..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
        <View style={styles.filterContainer}>
          <MaterialIcons name="filter-list" size={20} color="#9ca3af" style={styles.filterIcon} />
          <TouchableOpacity
            style={styles.filterDropdown}
            onPress={() => setShowProgramFilterModal(true)}
          >
            <Text style={styles.filterText}>
              {programFilter ? `Program: ${programFilter}` : 'All Programs'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#9ca3af" />
          </TouchableOpacity>
          {programFilter !== '' && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setProgramFilter('')}
            >
              <MaterialIcons name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Coordinators Table */}
      <View style={styles.tableWrapper}>
        {filteredCoordinators.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="people" size={64} color="#6b7280" />
            <Text style={styles.emptyStateTitle}>No coordinators found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No coordinators registered yet'
              }
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.coordinatorsList} 
            showsVerticalScrollIndicator={false}
            horizontal={dimensions.width < 768}
            showsHorizontalScrollIndicator={dimensions.width < 768}
            contentContainerStyle={dimensions.width < 768 ? { minWidth: 1000 } : undefined}
          >
            {renderCoordinatorTable()}
          </ScrollView>
        )}
      </View>

      {/* View Modal */}
      <Modal
        visible={showViewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowViewModal(false);
          setSelectedCoordinator(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Coordinator Details</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedCoordinator(null);
                }}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {selectedCoordinator && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{getFullName(selectedCoordinator)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Program:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.program || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Department:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.department || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>University:</Text>
                    <Text style={styles.detailValue}>{selectedCoordinator.university || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedCoordinator.status) }]}>
                      <Text style={styles.statusText}>{(selectedCoordinator.status || 'active').toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Join Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedCoordinator.joinDate)}</Text>
                  </View>
                  {selectedCoordinator.isAdminCoordinator && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Admin Status:</Text>
                        <Text style={styles.detailValue}>Active</Text>
                      </View>
                      {selectedCoordinator.adminPermissions && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Permissions:</Text>
                          <Text style={styles.detailValue}>
                            {Object.entries(selectedCoordinator.adminPermissions)
                              .filter(([_, value]) => value)
                              .map(([key, _]) => key.replace('can_', '').replace(/_/g, ' '))
                              .join(', ')}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedCoordinator(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Warning Modal */}
      <Modal
        visible={showWarningModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowWarningModal(false);
          setWarningModalData(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.warningModalHeader}>
              <MaterialIcons name="warning" size={32} color="#f59e0b" />
              <Text style={styles.warningModalTitle}>
                {warningModalData?.title || 'Warning'}
              </Text>
            </View>
            <Text style={styles.warningModalMessage}>
              {warningModalData?.message || ''}
            </Text>
            <View style={styles.warningModalButtons}>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonCancel]}
                onPress={() => {
                  setShowWarningModal(false);
                  setWarningModalData(null);
                }}
              >
                <Text style={styles.warningModalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonConfirm]}
                onPress={() => {
                  if (warningModalData?.onConfirm) {
                    warningModalData.onConfirm();
                  }
                }}
              >
                <Text style={styles.warningModalButtonConfirmText}>Confirm</Text>
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
        onRequestClose={() => {
          setShowSuccessModal(false);
          setSuccessModalData(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.successModalHeader}>
              <MaterialIcons name="check-circle" size={32} color="#10b981" />
              <Text style={styles.successModalTitle}>
                {successModalData?.title || 'Success'}
              </Text>
            </View>
            <Text style={styles.successModalMessage}>
              {successModalData?.message || ''}
            </Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => {
                setShowSuccessModal(false);
                setSuccessModalData(null);
              }}
            >
              <Text style={styles.successModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Program Filter Modal */}
      <Modal
        visible={showProgramFilterModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowProgramFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.programFilterModalContent}>
            <View style={styles.programFilterModalHeader}>
              <Text style={styles.programFilterModalTitle}>Select Program</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowProgramFilterModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.programFilterModalBody}>
              <TouchableOpacity
                style={[
                  styles.programFilterOption,
                  programFilter === '' && styles.programFilterOptionSelected
                ]}
                onPress={() => {
                  setProgramFilter('');
                  setShowProgramFilterModal(false);
                }}
              >
                <Text style={[
                  styles.programFilterOptionText,
                  programFilter === '' && styles.programFilterOptionTextSelected
                ]}>
                  All Programs
                </Text>
                {programFilter === '' && (
                  <MaterialIcons name="check" size={20} color="#F56E0F" />
                )}
              </TouchableOpacity>
              {availablePrograms.map((program) => (
                <TouchableOpacity
                  key={program}
                  style={[
                    styles.programFilterOption,
                    programFilter === program && styles.programFilterOptionSelected
                  ]}
                  onPress={() => {
                    setProgramFilter(program);
                    setShowProgramFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.programFilterOptionText,
                    programFilter === program && styles.programFilterOptionTextSelected
                  ]}>
                    {program}
                  </Text>
                  {programFilter === program && (
                    <MaterialIcons name="check" size={20} color="#F56E0F" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
              transform: [{ translateX: -50 }],
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
    backgroundColor: '#1f1f23',
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
    color: '#9ca3af',
  },
  header: {
    backgroundColor: '#2A2A2E',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  searchSection: {
    backgroundColor: '#2A2A2E',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f23',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FBFBFB',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f23',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3a3a3e',
    flex: 1,
    minHeight: 44,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  clearFilterButton: {
    padding: 8,
    backgroundColor: '#1f1f23',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  tableWrapper: {
    flex: 1,
    backgroundColor: '#1f1f23',
    width: '100%',
  },
  coordinatorsList: {
    flex: 1,
  },
  tableContainer: {
    backgroundColor: '#2A2A2E',
    borderWidth: 1,
    borderColor: '#3a3a3e',
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 24,
    marginRight: 24,
    marginVertical: 20,
    minWidth: isSmallScreen ? 1000 : undefined,
    width: isSmallScreen ? undefined : '100%',
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
    borderBottomColor: '#3a3a3e',
    paddingVertical: 16,
    paddingHorizontal: 12,
    minHeight: 72,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#1f1f23',
  },
  tableCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  tableCellName: {
    flex: isSmallScreen ? 0 : 2,
    width: isSmallScreen ? 200 : undefined,
    minWidth: 200,
  },
  tableCellEmail: {
    flex: isSmallScreen ? 0 : 2.5,
    width: isSmallScreen ? 200 : undefined,
    minWidth: 200,
  },
  tableCellProgram: {
    flex: isSmallScreen ? 0 : 1.5,
    width: isSmallScreen ? 150 : undefined,
    minWidth: 150,
  },
  tableCellDepartment: {
    flex: isSmallScreen ? 0 : 1.5,
    width: isSmallScreen ? 150 : undefined,
    minWidth: 150,
  },
  tableCellStatus: {
    flex: isSmallScreen ? 0 : 1,
    width: isSmallScreen ? 90 : undefined,
    minWidth: 90,
  },
  tableCellActions: {
    flex: isSmallScreen ? 0 : 1.5,
    width: isSmallScreen ? 150 : undefined,
    minWidth: 150,
  },
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
    borderColor: '#3a3a3e',
  },
  tableProfilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F56E0F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3e',
  },
  tableProfileText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  tableCellNameTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tableCellNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBFBFB',
    flexShrink: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 39, 176, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9c27b0',
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9c27b0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCellText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tableStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tableStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableActionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tableActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1f1f23',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  tableActionView: {
    borderColor: '#3b82f6',
  },
  tableActionToggle: {
    borderColor: '#f59e0b',
  },
  tableActionDelete: {
    borderColor: '#ef4444',
  },
  tableActionAdmin: {
    borderColor: '#9c27b0',
  },
  tableActionAdminActive: {
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#2A2A2E',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FBFBFB',
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBFBFB',
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3e',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F56E0F',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Tooltip Styles
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1f1f23',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10000,
    borderWidth: 1,
    borderColor: '#3a3a3e',
    maxWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    color: '#FBFBFB',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
    borderBottomColor: '#1f1f23',
  },
  // Warning Modal Styles
  confirmModalContent: {
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  warningModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  warningModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FBFBFB',
    flex: 1,
  },
  warningModalMessage: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  warningModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  warningModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  warningModalButtonCancel: {
    backgroundColor: '#1f1f23',
    borderWidth: 2,
    borderColor: '#3a3a3e',
  },
  warningModalButtonConfirm: {
    backgroundColor: '#F56E0F',
  },
  warningModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  warningModalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Success Modal Styles
  successModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FBFBFB',
    flex: 1,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  successModalButton: {
    backgroundColor: '#F56E0F',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Program Filter Modal Styles
  programFilterModalContent: {
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  programFilterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  programFilterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FBFBFB',
  },
  programFilterModalBody: {
    padding: 8,
    maxHeight: 400,
  },
  programFilterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#1f1f23',
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  programFilterOptionSelected: {
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderColor: '#F56E0F',
  },
  programFilterOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9ca3af',
  },
  programFilterOptionTextSelected: {
    color: '#FBFBFB',
    fontWeight: '600',
  },
});
