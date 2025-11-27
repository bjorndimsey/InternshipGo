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

interface Student {
  id: string;
  user_id?: string;
  id_number?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone_number?: string;
  major?: string;
  year?: string;
  university?: string;
  gpa?: number;
  profile_picture?: string;
  created_at?: string;
  status?: 'active' | 'inactive';
  is_active?: boolean;
}

export default function InternsManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
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
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchQuery, students]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllStudents();
      
      if (response.success) {
        const responseData = response as any;
        const studentsData = responseData.students || responseData.data?.students || responseData.data || [];
        const mappedStudents: Student[] = studentsData.map((student: any) => ({
          id: student.id?.toString() || '',
          user_id: student.user_id?.toString() || '',
          id_number: student.id_number || '',
          first_name: student.first_name || '',
          middle_name: student.middle_name || '',
          last_name: student.last_name || '',
          email: student.email || '',
          phone_number: student.phone_number || '',
          major: student.major || '',
          year: student.year || '',
          university: student.university || '',
          gpa: student.gpa || 0,
          profile_picture: student.profile_picture || null,
          created_at: student.created_at || '',
          is_active: student.is_active !== undefined ? student.is_active : true,
          status: student.is_active === false ? 'inactive' : 'active',
        }));
        setStudents(mappedStudents);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch students');
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to fetch students. Please try again.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchQuery) {
      filtered = filtered.filter(student => {
        const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase();
        return (
          fullName.includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.id_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.university?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    setFilteredStudents(filtered);
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const handleToggleStatus = async (student: Student) => {
    console.log('🔄 handleToggleStatus called for student:', student.id, student.first_name, student.last_name);
    const newStatus: 'active' | 'inactive' = student.status === 'active' ? 'inactive' : 'active';
    const isActive = newStatus === 'active';
    const statusText = newStatus === 'active' ? 'enable' : 'disable';
    
    console.log('🔄 Current status:', student.status, 'New status:', newStatus, 'isActive:', isActive);
    
    // Show warning modal
    setWarningModalData({
      title: `${statusText === 'enable' ? 'Enable' : 'Disable'} Student`,
      message: `Are you sure you want to ${statusText} ${student.first_name} ${student.last_name}? ${!isActive ? 'They will not be able to login until re-enabled.' : 'They can now login to the system.'}`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          console.log('🔄 Calling API to update student status...');
          if (!student.id) {
            setSuccessModalData({
              title: 'Error',
              message: 'Student ID is missing. Please try again.'
            });
            setShowSuccessModal(true);
            return;
          }

          const response = await apiService.updateStudentStatus(student.id, isActive);
          console.log('🔄 API response:', response);
          
          if (response.success) {
            // Update local state using functional updates to ensure we have the latest state
            // The useEffect will automatically update filteredStudents when students changes
            setStudents(prevStudents => {
              const updated = prevStudents.map(s => 
                s.id === student.id ? { 
                  ...s, 
                  status: newStatus,
                  is_active: isActive
                } : s
              );
              console.log('🔄 Updated students:', updated.find(s => s.id === student.id));
              return updated;
            });
            
            // Also update filteredStudents immediately for instant UI update
            // This prevents the need to wait for useEffect to run
            setFilteredStudents(prevFiltered => {
              const updated = prevFiltered.map(s => 
                s.id === student.id ? { 
                  ...s, 
                  status: newStatus,
                  is_active: isActive
                } : s
              );
              console.log('🔄 Updated filtered students:', updated.find(s => s.id === student.id));
              return updated;
            });
            
            // Send email notification if account is disabled
            if (!isActive) {
              try {
                const studentEmail = student.email?.trim();
                const studentName = `${student.first_name} ${student.last_name}`.trim() || 'User';
                
                if (!studentEmail) {
                  console.warn('⚠️ Student email is missing, cannot send disabled email');
                } else {
                  console.log('📧 Preparing to send disabled email to student:', studentEmail);
                  const emailResult = await EmailService.sendAccountDisabledEmail(
                    studentEmail,
                    studentName
                  );
                  
                  if (emailResult.success) {
                    console.log('✅ Account disabled email sent successfully to:', studentEmail);
                  } else {
                    console.warn('⚠️ Failed to send account disabled email to:', studentEmail, 'Error:', emailResult.error);
                    // Don't fail the operation if email fails
                  }
                }
              } catch (emailError) {
                console.error('Error sending account disabled email:', emailError);
                // Don't fail the operation if email fails
              }
            }
            
            // Force a re-render by updating a dummy state (if needed)
            // Actually, the state updates above should trigger a re-render automatically
            
            // Show success modal
            setSuccessModalData({
              title: 'Success',
              message: `Student ${statusText}d successfully. ${!isActive ? 'They cannot login until re-enabled. An email notification has been sent.' : 'They can now login.'}`
            });
            setShowSuccessModal(true);
          } else {
            console.error('🔄 API error:', response.message);
            setSuccessModalData({
              title: 'Error',
              message: response.message || 'Failed to update student status. Please try again.'
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('🔄 Error updating student status:', error);
          setSuccessModalData({
            title: 'Error',
            message: 'Failed to update student status. Please try again.'
          });
          setShowSuccessModal(true);
        }
      }
    });
    setShowWarningModal(true);
  };

  const handleDeleteStudent = (student: Student) => {
    console.log('🗑️ handleDeleteStudent called for student:', student.id, student.first_name, student.last_name);
    
    // Show warning modal
    setWarningModalData({
      title: 'Delete Student',
      message: `Are you sure you want to delete ${student.first_name} ${student.last_name}? This action cannot be undone and will permanently remove the student and their account from the system.`,
      onConfirm: async () => {
        setShowWarningModal(false);
        try {
          console.log('🗑️ Calling API to delete student...');
          if (!student.id) {
            setSuccessModalData({
              title: 'Error',
              message: 'Student ID is missing. Please try again.'
            });
            setShowSuccessModal(true);
            return;
          }

          const response = await apiService.deleteStudent(student.id);
          console.log('🗑️ API response:', response);
          
          if (response.success) {
            // Update local state using functional updates
            setStudents(prevStudents => prevStudents.filter(s => s.id !== student.id));
            // Also update filtered students
            setFilteredStudents(prevFiltered => prevFiltered.filter(s => s.id !== student.id));
            
            // Show success modal
            setSuccessModalData({
              title: 'Success',
              message: `Student ${student.first_name} ${student.last_name} has been deleted successfully.`
            });
            setShowSuccessModal(true);
          } else {
            console.error('🗑️ API error:', response.message);
            setSuccessModalData({
              title: 'Error',
              message: response.message || 'Failed to delete student. Please try again.'
            });
            setShowSuccessModal(true);
          }
        } catch (error) {
          console.error('🗑️ Error deleting student:', error);
          setSuccessModalData({
            title: 'Error',
            message: 'Failed to delete student. Please try again.'
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

  const getFullName = (student: Student) => {
    const parts = [
      student.first_name,
      student.middle_name && student.middle_name !== 'N/A' ? student.middle_name : null,
      student.last_name
    ].filter(part => part && part.trim() !== '');
    return parts.join(' ').trim();
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

  const renderStudentTable = () => {
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
          <View style={[styles.tableHeaderCell, styles.tableCellId]}>
            <Text style={styles.tableHeaderText}>ID Number</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellYear]}>
            <Text style={styles.tableHeaderText}>Year</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellMajor]}>
            <Text style={styles.tableHeaderText}>Major</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellStatus]}>
            <Text style={styles.tableHeaderText}>Status</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.tableCellActions]}>
            <Text style={styles.tableHeaderText}>Actions</Text>
          </View>
        </View>
        
        {/* Table Rows */}
        {filteredStudents.map((student, index) => (
          <View key={student.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
            <View style={[styles.tableCell, styles.tableCellName]}>
              <View style={styles.tableCellNameContent}>
                <View style={styles.tableProfileContainer}>
                  {student.profile_picture ? (
                    <Image source={{ uri: student.profile_picture }} style={styles.tableProfileImage} />
                  ) : (
                    <View style={styles.tableProfilePlaceholder}>
                      <Text style={styles.tableProfileText}>
                        {student.first_name?.charAt(0)?.toUpperCase() || 'S'}
                        {student.last_name?.charAt(0)?.toUpperCase() || 'T'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tableCellNameText} numberOfLines={1}>
                  {getFullName(student)}
                </Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.tableCellEmail]}>
              <Text style={styles.tableCellText} numberOfLines={1}>{student.email || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellId]}>
              <Text style={styles.tableCellText}>{student.id_number || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellYear]}>
              <Text style={styles.tableCellText}>{student.year || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellMajor]}>
              <Text style={styles.tableCellText} numberOfLines={1}>{student.major || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.tableCellStatus]}>
              <View style={[styles.tableStatusBadge, { backgroundColor: getStatusColor(student.status) }]}>
                <Text style={styles.tableStatusText}>{(student.status || 'active').toUpperCase()}</Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.tableCellActions]}>
              <View style={styles.tableActionButtons}>
                <TouchableOpacity 
                  ref={(ref) => { buttonRefs.current[`view-${student.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionView]} 
                  onPress={() => handleButtonPress(() => handleViewStudent(student), 'View Details')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('View Details', e, `view-${student.id}`)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('View Details', e, `view-${student.id}`)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('View Details', e, `view-${student.id}`),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons name="visibility" size={16} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity 
                  ref={(ref) => { buttonRefs.current[`toggle-${student.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionToggle]} 
                  onPress={() => handleButtonPress(() => handleToggleStatus(student), student.status === 'active' ? 'Disable Student' : 'Enable Student')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip(student.status === 'active' ? 'Disable Student' : 'Enable Student', e, `toggle-${student.id}`)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip(student.status === 'active' ? 'Disable Student' : 'Enable Student', e, `toggle-${student.id}`)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip(student.status === 'active' ? 'Disable Student' : 'Enable Student', e, `toggle-${student.id}`),
                    onMouseLeave: hideTooltip,
                  } : {})}
                >
                  <MaterialIcons 
                    name={student.status === 'active' ? 'block' : 'check-circle'} 
                    size={16} 
                    color={student.status === 'active' ? '#f59e0b' : '#10b981'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  ref={(ref) => { buttonRefs.current[`delete-${student.id}`] = ref; }}
                  style={[styles.tableActionButton, styles.tableActionDelete]} 
                  onPress={() => handleButtonPress(() => handleDeleteStudent(student), 'Delete Student')}
                  onPressIn={(e) => Platform.OS === 'web' ? null : showTooltip('Delete Student', e, `delete-${student.id}`)}
                  onPressOut={Platform.OS === 'web' ? undefined : hideTooltip}
                  onLongPress={(e) => Platform.OS === 'web' ? null : showTooltip('Delete Student', e, `delete-${student.id}`)}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: (e: any) => showTooltip('Delete Student', e, `delete-${student.id}`),
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
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Interns Management</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Students Table */}
      <View style={styles.tableWrapper}>
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="school" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No students found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No students registered yet'
              }
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.studentsList} 
            showsVerticalScrollIndicator={false}
            horizontal={dimensions.width < 768}
            showsHorizontalScrollIndicator={dimensions.width < 768}
            contentContainerStyle={dimensions.width < 768 ? { minWidth: 1000 } : undefined}
          >
            {renderStudentTable()}
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
          setSelectedStudent(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedStudent(null);
                }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedStudent && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{getFullName(selectedStudent)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedStudent.email || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID Number:</Text>
                    <Text style={styles.detailValue}>{selectedStudent.id_number || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{selectedStudent.phone_number || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>University:</Text>
                    <Text style={styles.detailValue}>{selectedStudent.university || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Major:</Text>
                    <Text style={styles.detailValue}>{selectedStudent.major || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Year:</Text>
                    <Text style={styles.detailValue}>{selectedStudent.year || 'N/A'}</Text>
                  </View>
                  
                  {selectedStudent.gpa && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>GPA:</Text>
                      <Text style={styles.detailValue}>{selectedStudent.gpa.toFixed(2)}</Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedStudent.status) }]}>
                      <Text style={styles.statusText}>{(selectedStudent.status || 'active').toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registered Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedStudent.created_at)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedStudent(null);
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
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
  tableWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  studentsList: {
    flex: 1,
  },
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
  tableCellId: {
    flex: isSmallScreen ? 0 : 1.5,
    width: isSmallScreen ? 120 : undefined,
    minWidth: 120,
  },
  tableCellYear: {
    flex: isSmallScreen ? 0 : 1,
    width: isSmallScreen ? 90 : undefined,
    minWidth: 90,
  },
  tableCellMajor: {
    flex: isSmallScreen ? 0 : 1.5,
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
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#ffffff',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
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
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
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
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    color: '#ffffff',
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
    borderBottomColor: '#1e293b',
  },
  // Warning Modal Styles
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
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
    color: '#1e293b',
    flex: 1,
  },
  warningModalMessage: {
    fontSize: 16,
    color: '#475569',
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
    backgroundColor: '#f1f5f9',
  },
  warningModalButtonConfirm: {
    backgroundColor: '#f59e0b',
  },
  warningModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
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
    color: '#1e293b',
    flex: 1,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  successModalButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 100,
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
