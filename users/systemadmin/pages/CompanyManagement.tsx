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
import { apiService } from '../../../lib/api';
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

interface CompanyData {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  industry?: string;
  profilePicture?: string;
  status: 'active' | 'inactive';
  is_active?: boolean;
  moaStatus?: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  contactPerson?: string;
  joinDate?: string;
  partnershipStatus?: string;
}

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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
    fetchCompanies();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [searchQuery, companies]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      // System admin should see ALL companies, not just those with partnerships
      const response = await apiService.getAllCompanies(true);
      
      if (response.success) {
        const responseData = response as any;
        const companiesData = responseData.companies || responseData.data?.companies || responseData.data || [];
        const mappedCompanies: CompanyData[] = companiesData.map((company: any) => ({
          id: company.id?.toString() || '',
          user_id: company.userId?.toString() || company.user_id?.toString() || '',
          name: company.name || company.company_name || 'N/A',
          email: company.email || '',
          phone: company.phone || company.phone_number || '',
          address: company.address || '',
          website: company.website || '',
          industry: company.industry || '',
          profilePicture: company.profilePicture || company.profile_picture || null,
          status: (company.status === 'inactive' || company.is_active === false) ? 'inactive' : 'active',
          is_active: company.status !== 'inactive' && company.is_active !== false,
          moaStatus: company.moaStatus || company.moa_status || 'pending',
          moaExpiryDate: company.moaExpiryDate || company.moa_expiry_date,
          contactPerson: company.contactPerson || company.contact_person || '',
          joinDate: company.joinDate || company.created_at,
          partnershipStatus: company.partnershipStatus || company.partnership_status || 'pending',
        }));
        
        // Sort by created_at (newest first)
        mappedCompanies.sort((a, b) => {
          const dateA = new Date(a.joinDate || 0).getTime();
          const dateB = new Date(b.joinDate || 0).getTime();
          return dateB - dateA;
        });
        
        setCompanies(mappedCompanies);
        setFilteredCompanies(mappedCompanies);
      } else {
        const errorMessage = typeof response.message === 'string' ? response.message : 'Failed to fetch companies';
        Alert.alert('Error', errorMessage);
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      Alert.alert('Error', 'Failed to fetch companies. Please try again.');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = companies;

    if (searchQuery) {
      filtered = filtered.filter(company => {
        return (
          company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    setFilteredCompanies(filtered);
  };

  const handleViewCompany = (company: CompanyData) => {
    setSelectedCompany(company);
    setShowViewModal(true);
  };

  const handleToggleStatus = async (company: CompanyData) => {
    console.log('🔄 handleToggleStatus called for company:', company.id, company.name);
    const newStatus: 'active' | 'inactive' = company.status === 'active' ? 'inactive' : 'active';
    const isActive = newStatus === 'active';
    const statusText = newStatus === 'active' ? 'enable' : 'disable';
    
    console.log('🔄 Current status:', company.status, 'New status:', newStatus, 'isActive:', isActive);
    
    // Show warning modal
    setWarningModalData({
      title: `${statusText === 'enable' ? 'Enable' : 'Disable'} Company`,
      message: `Are you sure you want to ${statusText} ${company.name}? ${!isActive ? 'They will not be able to login until re-enabled.' : 'They can now login to the system.'}`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          console.log('🔄 Calling API to update company status...');
          if (!company.id) {
            setSuccessModalData({
              title: 'Error',
              message: 'Company ID is missing. Please try again.'
            });
            setShowSuccessModal(true);
            return;
          }

          const response = await apiService.updateCompanyStatus(company.id, isActive);
          console.log('🔄 API response:', response);
          
          if (response.success) {
            // Update local state using functional updates
            setCompanies(prevCompanies => {
              const updated = prevCompanies.map(c => 
                c.id === company.id ? { 
                  ...c, 
                  status: newStatus,
                  is_active: isActive
                } : c
              );
              console.log('🔄 Updated companies:', updated.find(c => c.id === company.id));
              return updated;
            });
            
            // Also update filtered companies immediately
            setFilteredCompanies(prevFiltered => {
              const updated = prevFiltered.map(c => 
                c.id === company.id ? { 
                  ...c, 
                  status: newStatus,
                  is_active: isActive
                } : c
              );
              console.log('🔄 Updated filtered companies:', updated.find(c => c.id === company.id));
              return updated;
            });
            
            // Send email notification if account is disabled
            if (!isActive) {
              try {
                const companyEmail = company.email?.trim();
                const companyName = company.name || 'User';
                
                if (!companyEmail) {
                  console.warn('⚠️ Company email is missing, cannot send disabled email');
                } else {
                  console.log('📧 Preparing to send disabled email to company:', companyEmail);
                  const emailResult = await EmailService.sendAccountDisabledEmail(
                    companyEmail,
                    companyName
                  );
                  
                  if (emailResult.success) {
                    console.log('✅ Account disabled email sent successfully to:', companyEmail);
                  } else {
                    console.warn('⚠️ Failed to send account disabled email to:', companyEmail, 'Error:', emailResult.error);
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
              message: `Company ${statusText}d successfully. ${!isActive ? 'They cannot login until re-enabled. An email notification has been sent.' : 'They can now login.'}`
            });
            setShowSuccessModal(true);
          } else {
            console.error('🔄 API error:', response.message);
            setSuccessModalData({
              title: 'Error',
              message: response.message || 'Failed to update company status. Please try again.'
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('🔄 Error updating company status:', error);
          setSuccessModalData({
            title: 'Error',
            message: 'Failed to update company status. Please try again.'
          });
          setShowSuccessModal(true);
        }
      }
    });
    setShowWarningModal(true);
  };

  const handleDeleteCompany = (company: CompanyData) => {
    console.log('🗑️ handleDeleteCompany called for company:', company.id, company.name);
    
    // Show warning modal
    setWarningModalData({
      title: 'Delete Company',
      message: `Are you sure you want to delete ${company.name}? This action cannot be undone and will permanently remove the company and their account from the system.`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          console.log('🗑️ Calling API to delete company...');
          if (!company.id) {
            setSuccessModalData({
              title: 'Error',
              message: 'Company ID is missing. Please try again.'
            });
            setShowSuccessModal(true);
            return;
          }

          const response = await apiService.deleteCompany(company.id);
          console.log('🗑️ API response:', response);
          
          if (response.success) {
            // Update local state using functional updates
            setCompanies(prevCompanies => prevCompanies.filter(c => c.id !== company.id));
            // Also update filtered companies
            setFilteredCompanies(prevFiltered => prevFiltered.filter(c => c.id !== company.id));
            
            // Show success modal
            setSuccessModalData({
              title: 'Success',
              message: `Company ${company.name} has been deleted successfully.`
            });
            setShowSuccessModal(true);
          } else {
            console.error('🗑️ API error:', response.message);
            setSuccessModalData({
              title: 'Error',
              message: response.message || 'Failed to delete company. Please try again.'
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('🗑️ Error deleting company:', error);
          setSuccessModalData({
            title: 'Error',
            message: 'Failed to delete company. Please try again.'
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

  const getMOAStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'expired': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
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

  const renderCompanyTable = () => {
    return (
      <View style={styles.tableContainer}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <View style={[styles.tableHeaderCell, styles.tableCellName]}>
            <Text style={styles.tableHeaderText}>Company Name</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellEmail]}>
            <Text style={styles.tableHeaderText}>Email</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellIndustry]}>
            <Text style={styles.tableHeaderText}>Industry</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellMOA]}>
            <Text style={styles.tableHeaderText}>MOA Status</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellStatus]}>
            <Text style={styles.tableHeaderText}>Status</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellActions]}>
            <Text style={styles.tableHeaderText}>Actions</Text>
          </View>
        </View>
        
        {/* Table Rows */}
        {filteredCompanies.map((company, index) => (
          <View key={company.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
            <View style={[styles.tableCell, styles.tableCellName]}>
              <View style={styles.tableCellNameContent}>
                <View style={styles.tableProfileContainer}>
                  {company.profilePicture ? (
                    <Image source={{ uri: company.profilePicture }} style={styles.tableProfileImage} />
                  ) : (
                    <View style={styles.tableProfilePlaceholder}>
                      <Text style={styles.tableProfileText}>
                        {company.name?.charAt(0)?.toUpperCase() || 'C'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tableCellNameText} numberOfLines={1}>
                  {company.name}
                </Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.tableCellEmail]}>
              <Text style={styles.tableCellText} numberOfLines={1}>{company.email || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellIndustry]}>
              <Text style={styles.tableCellText} numberOfLines={1}>{company.industry || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellMOA]}>
              <View style={[styles.tableMOABadge, { backgroundColor: getMOAStatusColor(company.moaStatus) }]}>
                <Text style={styles.tableMOAText}>{(company.moaStatus || 'pending').toUpperCase()}</Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.tableCellStatus]}>
              <View style={[styles.tableStatusBadge, { backgroundColor: getStatusColor(company.status) }]}>
                <Text style={styles.tableStatusText}>{(company.status || 'active').toUpperCase()}</Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.tableCellActions]}>
              <View style={styles.tableActionButtons}>
                <TouchableOpacity 
                  ref={(ref) => { buttonRefs.current[`view-${company.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionView]} 
                  onPress={() => handleButtonPress(() => handleViewCompany(company), 'View Details')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('View Details', e, `view-${company.id}`)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('View Details', e, `view-${company.id}`)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('View Details', e, `view-${company.id}`),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons name="visibility" size={16} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity 
                  ref={(ref) => { buttonRefs.current[`toggle-${company.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionToggle]} 
                  onPress={() => handleButtonPress(() => handleToggleStatus(company), company.status === 'active' ? 'Disable Company' : 'Enable Company')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip(company.status === 'active' ? 'Disable Company' : 'Enable Company', e, `toggle-${company.id}`)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip(company.status === 'active' ? 'Disable Company' : 'Enable Company', e, `toggle-${company.id}`)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip(company.status === 'active' ? 'Disable Company' : 'Enable Company', e, `toggle-${company.id}`),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons 
                    name={company.status === 'active' ? 'block' : 'check-circle'} 
                    size={16} 
                    color={company.status === 'active' ? '#f59e0b' : '#10b981'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  ref={(ref) => { buttonRefs.current[`delete-${company.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionDelete]} 
                  onPress={() => handleButtonPress(() => handleDeleteCompany(company), 'Delete Company')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Delete Company', e, `delete-${company.id}`)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('Delete Company', e, `delete-${company.id}`)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('Delete Company', e, `delete-${company.id}`),
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
        <Text style={styles.loadingText}>Loading companies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Companies Management</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Companies Table */}
      <View style={styles.tableWrapper}>
        {filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="business" size={64} color="#6b7280" />
            <Text style={styles.emptyStateTitle}>No companies found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No companies registered yet'
              }
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.companiesList} 
            showsVerticalScrollIndicator={false}
            horizontal={dimensions.width < 768}
            showsHorizontalScrollIndicator={dimensions.width < 768}
            contentContainerStyle={dimensions.width < 768 ? { minWidth: 1000 } : undefined}
          >
            {renderCompanyTable()}
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
          setSelectedCompany(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Company Details</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedCompany(null);
                }}
              >
                <MaterialIcons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            {selectedCompany && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Company Name:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Industry:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.industry || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.address || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Website:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.website || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contact Person:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.contactPerson || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>MOA Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getMOAStatusColor(selectedCompany.moaStatus) }]}>
                      <Text style={styles.statusText}>{(selectedCompany.moaStatus || 'pending').toUpperCase()}</Text>
                    </View>
                  </View>
                  {selectedCompany.moaExpiryDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>MOA Expiry Date:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedCompany.moaExpiryDate)}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Partnership Status:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.partnershipStatus || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedCompany.status) }]}>
                      <Text style={styles.statusText}>{(selectedCompany.status || 'active').toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Join Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedCompany.joinDate)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedCompany(null);
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
  tableWrapper: {
    flex: 1,
    backgroundColor: '#1f1f23',
    width: '100%',
  },
  companiesList: {
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
  tableCellIndustry: {
    flex: isSmallScreen ? 0 : 1.5,
    width: isSmallScreen ? 150 : undefined,
    minWidth: 150,
  },
  tableCellMOA: {
    flex: isSmallScreen ? 0 : 1.2,
    width: isSmallScreen ? 120 : undefined,
    minWidth: 120,
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
  tableCellNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBFBFB',
    flex: 1,
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
  tableMOABadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tableMOAText: {
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
});
