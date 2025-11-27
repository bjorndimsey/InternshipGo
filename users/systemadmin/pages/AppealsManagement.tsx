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
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

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

interface Appeal {
  id: number;
  email: string;
  message: string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  reviewed_by?: number;
  reviewed_at?: string;
}

export default function AppealsManagement() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [filteredAppeals, setFilteredAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
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
    fetchAppeals();
  }, []);

  useEffect(() => {
    filterAppeals();
  }, [searchQuery, appeals]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllAppeals();
      
      if (response.success) {
        const responseData = response as any;
        const appealsData = responseData.appeals || responseData.data?.appeals || responseData.data || [];
        const mappedAppeals: Appeal[] = appealsData.map((appeal: any) => ({
          id: appeal.id || 0,
          email: appeal.email || '',
          message: appeal.message || '',
          status: appeal.status || 'pending',
          created_at: appeal.created_at || '',
          updated_at: appeal.updated_at || '',
          reviewed_by: appeal.reviewed_by || undefined,
          reviewed_at: appeal.reviewed_at || undefined,
        }));
        
        // Sort by created_at (newest first)
        mappedAppeals.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });
        
        setAppeals(mappedAppeals);
        setFilteredAppeals(mappedAppeals);
      } else {
        console.error('Failed to fetch appeals:', response.message);
        setAppeals([]);
        setFilteredAppeals([]);
      }
    } catch (error) {
      console.error('Error fetching appeals:', error);
      setAppeals([]);
      setFilteredAppeals([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAppeals = () => {
    if (!searchQuery.trim()) {
      setFilteredAppeals(appeals);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = appeals.filter(appeal =>
      appeal.email.toLowerCase().includes(query) ||
      appeal.message.toLowerCase().includes(query) ||
      appeal.status.toLowerCase().includes(query)
    );
    setFilteredAppeals(filtered);
  };

  const handleViewAppeal = (appeal: Appeal) => {
    setSelectedAppeal(appeal);
    setShowViewModal(true);
  };

  const handleApproveAppeal = (appeal: Appeal) => {
    setWarningModalData({
      title: 'Approve Appeal',
      message: `Are you sure you want to approve this appeal from ${appeal.email}? This will enable their account.`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          const response = await apiService.updateAppealStatus(appeal.id, 'approved');
          
          if (response.success) {
            // Update local state
            setAppeals(prevAppeals => prevAppeals.map(a => 
              a.id === appeal.id 
                ? { ...a, status: 'approved' as const, updated_at: new Date().toISOString() }
                : a
            ));
            setFilteredAppeals(prevFiltered => prevFiltered.map(a => 
              a.id === appeal.id 
                ? { ...a, status: 'approved' as const, updated_at: new Date().toISOString() }
                : a
            ));
            
            setSuccessModalData({
              title: 'Success',
              message: 'Appeal approved successfully. The user account has been enabled.'
            });
            setShowSuccessModal(true);
          } else {
            setSuccessModalData({
              title: 'Error',
              message: response.message || 'Failed to approve appeal. Please try again.'
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('Error approving appeal:', error);
          setSuccessModalData({
            title: 'Error',
            message: 'Failed to approve appeal. Please try again.'
          });
          setShowSuccessModal(true);
        }
      }
    });
    setShowWarningModal(true);
  };

  const handleRejectAppeal = (appeal: Appeal) => {
    setWarningModalData({
      title: 'Reject Appeal',
      message: `Are you sure you want to reject this appeal from ${appeal.email}? This action cannot be undone.`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          const response = await apiService.updateAppealStatus(appeal.id, 'rejected');
          
          if (response.success) {
            // Update local state
            setAppeals(prevAppeals => prevAppeals.map(a => 
              a.id === appeal.id 
                ? { ...a, status: 'rejected' as const, updated_at: new Date().toISOString() }
                : a
            ));
            setFilteredAppeals(prevFiltered => prevFiltered.map(a => 
              a.id === appeal.id 
                ? { ...a, status: 'rejected' as const, updated_at: new Date().toISOString() }
                : a
            ));
            
            setSuccessModalData({
              title: 'Success',
              message: 'Appeal rejected successfully.'
            });
            setShowSuccessModal(true);
          } else {
            setSuccessModalData({
              title: 'Error',
              message: response.message || 'Failed to reject appeal. Please try again.'
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('Error rejecting appeal:', error);
          setSuccessModalData({
            title: 'Error',
            message: 'Failed to reject appeal. Please try again.'
          });
          setShowSuccessModal(true);
        }
      }
    });
    setShowWarningModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'reviewed': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'reviewed': return 'Reviewed';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const showTooltip = (text: string, buttonId: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    const buttonRef = buttonRefs.current[buttonId];
    if (buttonRef) {
      buttonRef.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setTooltip({
          visible: true,
          text,
          x: pageX + width / 2,
          y: pageY - 10,
          buttonWidth: width,
        });
      });
    }
  };

  const hideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip({ visible: false, text: '', x: 0, y: 0 });
    }, 200);
  };

  const handleButtonPress = (buttonId: string, tooltipText: string) => {
    showTooltip(tooltipText, buttonId);
  };

  const renderAppealsTable = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F56E0F" />
          <Text style={styles.loadingText}>Loading appeals...</Text>
        </View>
      );
    }

    if (filteredAppeals.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={64} color="#6b7280" />
          <Text style={styles.emptyText}>No appeals found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try adjusting your search query' : 'All appeals have been processed'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal={isSmallScreen}
        showsHorizontalScrollIndicator={isSmallScreen}
        style={styles.tableScrollView}
        contentContainerStyle={isSmallScreen ? { minWidth: 1000 } : {}}
      >
        <View style={[styles.tableContainer, isSmallScreen && { minWidth: 1000 }]}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableCellEmail]}>Email</Text>
            <Text style={[styles.tableHeaderText, styles.tableCellMessage]}>Message</Text>
            <Text style={[styles.tableHeaderText, styles.tableCellStatus]}>Status</Text>
            <Text style={[styles.tableHeaderText, styles.tableCellDate]}>Date</Text>
            <Text style={[styles.tableHeaderText, styles.tableCellActions]}>Actions</Text>
          </View>

          {/* Table Body */}
          <View style={styles.tableBody}>
            {filteredAppeals.map((appeal, index) => (
              <View key={`appeal-${appeal.id}-${index}`} style={styles.tableRow}>
                <Text style={[styles.tableCellText, styles.tableCellEmail]} numberOfLines={1}>
                  {appeal.email}
                </Text>
                <Text style={[styles.tableCellText, styles.tableCellMessage]} numberOfLines={2}>
                  {appeal.message}
                </Text>
                <View style={[styles.tableCellStatus, styles.statusBadgeContainer]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appeal.status) }]}>
                    <Text style={styles.statusBadgeText}>{getStatusText(appeal.status)}</Text>
                  </View>
                </View>
                <Text style={[styles.tableCellText, styles.tableCellDate]}>
                  {formatDate(appeal.created_at)}
                </Text>
                <View style={styles.tableCellActions}>
                  <TouchableOpacity
                    ref={(ref) => { buttonRefs.current[`view-${appeal.id}`] = ref; }}
                    style={styles.actionButton}
                    onPress={() => handleViewAppeal(appeal)}
                    onPressIn={() => handleButtonPress(`view-${appeal.id}`, 'View Details')}
                    onPressOut={hideTooltip}
                    onHoverIn={() => handleButtonPress(`view-${appeal.id}`, 'View Details')}
                    onHoverOut={hideTooltip}
                  >
                    <MaterialIcons name="visibility" size={18} color="#3b82f6" />
                  </TouchableOpacity>
                  {appeal.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        ref={(ref) => { buttonRefs.current[`approve-${appeal.id}`] = ref; }}
                        style={styles.actionButton}
                        onPress={() => handleApproveAppeal(appeal)}
                        onPressIn={() => handleButtonPress(`approve-${appeal.id}`, 'Approve Appeal')}
                        onPressOut={hideTooltip}
                        onHoverIn={() => handleButtonPress(`approve-${appeal.id}`, 'Approve Appeal')}
                        onHoverOut={hideTooltip}
                      >
                        <MaterialIcons name="check-circle" size={18} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        ref={(ref) => { buttonRefs.current[`reject-${appeal.id}`] = ref; }}
                        style={styles.actionButton}
                        onPress={() => handleRejectAppeal(appeal)}
                        onPressIn={() => handleButtonPress(`reject-${appeal.id}`, 'Reject Appeal')}
                        onPressOut={hideTooltip}
                        onHoverIn={() => handleButtonPress(`reject-${appeal.id}`, 'Reject Appeal')}
                        onHoverOut={hideTooltip}
                      >
                        <MaterialIcons name="cancel" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Account Appeals</Text>
          <Text style={styles.headerSubtitle}>Manage and review account restoration appeals</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email, message, or status..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Appeals Table */}
      {renderAppealsTable()}

      {/* View Appeal Modal */}
      <Modal
        visible={showViewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appeal Details</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <MaterialIcons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            {selectedAppeal && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Email</Text>
                  <Text style={styles.modalValue}>{selectedAppeal.email}</Text>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAppeal.status) }]}>
                    <Text style={styles.statusBadgeText}>{getStatusText(selectedAppeal.status)}</Text>
                  </View>
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Submitted</Text>
                  <Text style={styles.modalValue}>{formatDate(selectedAppeal.created_at)}</Text>
                </View>
                {selectedAppeal.updated_at && (
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Last Updated</Text>
                    <Text style={styles.modalValue}>{formatDate(selectedAppeal.updated_at)}</Text>
                  </View>
                )}
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Message</Text>
                  <Text style={styles.modalMessage}>{selectedAppeal.message}</Text>
                </View>
              </ScrollView>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowViewModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
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
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.warningModalContent}>
            <View style={styles.warningModalHeader}>
              <MaterialIcons name="warning" size={40} color="#f59e0b" />
              <Text style={styles.warningModalTitle}>{warningModalData?.title}</Text>
            </View>
            <Text style={styles.warningModalMessage}>{warningModalData?.message}</Text>
            <View style={styles.warningModalButtons}>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonCancel]}
                onPress={() => setShowWarningModal(false)}
              >
                <Text style={styles.warningModalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonConfirm]}
                onPress={() => {
                  warningModalData?.onConfirm();
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
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalHeader}>
              <MaterialIcons name="check-circle" size={40} color="#10b981" />
              <Text style={styles.successModalTitle}>{successModalData?.title}</Text>
            </View>
            <Text style={styles.successModalMessage}>{successModalData?.message}</Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccessModal(false)}
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
              left: tooltip.x - (tooltip.buttonWidth || 0) / 2,
              top: tooltip.y - 40,
            },
          ]}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#2A2A2E',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FBFBFB',
  },
  clearButton: {
    padding: 4,
  },
  tableScrollView: {
    flex: 1,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3a3a3e',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f1f23',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: 14,
    color: '#FBFBFB',
  },
  tableCellEmail: {
    flex: isSmallScreen ? 0 : 1.5,
    minWidth: isSmallScreen ? 200 : 0,
    marginRight: 16,
  },
  tableCellMessage: {
    flex: isSmallScreen ? 0 : 2,
    minWidth: isSmallScreen ? 300 : 0,
    marginRight: 16,
  },
  tableCellStatus: {
    flex: isSmallScreen ? 0 : 1,
    minWidth: isSmallScreen ? 120 : 0,
    marginRight: 16,
  },
  tableCellDate: {
    flex: isSmallScreen ? 0 : 1.2,
    minWidth: isSmallScreen ? 150 : 0,
    marginRight: 16,
  },
  tableCellActions: {
    flex: isSmallScreen ? 0 : 0.8,
    minWidth: isSmallScreen ? 120 : 0,
    flexDirection: 'row',
    gap: 8,
  },
  statusBadgeContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1f1f23',
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
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
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
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
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  modalBody: {
    padding: 20,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 16,
    color: '#FBFBFB',
  },
  modalMessage: {
    fontSize: 16,
    color: '#FBFBFB',
    lineHeight: 24,
    backgroundColor: '#1f1f23',
    padding: 16,
    borderRadius: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3e',
  },
  modalButton: {
    backgroundColor: '#F56E0F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  warningModalContent: {
    backgroundColor: '#2A2A2E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  warningModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  warningModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginTop: 12,
  },
  warningModalMessage: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  warningModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  warningModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  warningModalButtonCancel: {
    backgroundColor: '#2A2A2E',
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
  successModalContent: {
    backgroundColor: '#2A2A2E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  successModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginTop: 12,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
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
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1f1f23',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3e',
    zIndex: 1000,
  },
  tooltipText: {
    fontSize: 12,
    color: '#FBFBFB',
  },
  tooltipArrowDown: {
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
    borderTopColor: '#1f1f23',
  },
});

