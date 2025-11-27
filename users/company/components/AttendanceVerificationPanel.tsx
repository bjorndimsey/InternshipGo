import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isMobile = width < 768;
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;

interface AttendanceRecord {
  id: number;
  user_id: number;
  company_id: number;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'sick';
  am_time_in?: string;
  am_time_out?: string;
  pm_time_in?: string;
  pm_time_out?: string;
  total_hours?: number;
  notes?: string;
  verification_status?: 'pending' | 'accepted' | 'denied';
  verified_by?: number;
  verified_at?: string;
  verification_remarks?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
}

interface AttendanceVerificationPanelProps {
  attendanceRecord: AttendanceRecord | null;
  attendanceRecords?: AttendanceRecord[]; // All attendance records for the intern
  internName: string;
  onClose: () => void;
  onVerificationComplete: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  companyId: string;
  currentUser: {
    id: string;
    email: string;
    user_type: string;
  };
}

export default function AttendanceVerificationPanel({
  attendanceRecord,
  attendanceRecords,
  internName,
  onClose,
  onVerificationComplete,
  isMobile,
  isTablet,
  isDesktop,
  companyId,
  currentUser,
}: AttendanceVerificationPanelProps) {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(attendanceRecord);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>([]);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<{
    record: AttendanceRecord;
    status: 'accepted' | 'denied';
  } | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');

  // Use attendanceRecords array if provided, otherwise use single attendanceRecord
  const allRecords = attendanceRecords && attendanceRecords.length > 0 
    ? attendanceRecords 
    : (attendanceRecord ? [attendanceRecord] : []);

  useEffect(() => {
    // Update local records when prop changes
    setLocalRecords(allRecords);
    // Set selected record to the first one (most recent) when records change
    if (allRecords.length > 0 && !selectedRecord) {
      setSelectedRecord(allRecords[0]);
    }
  }, [allRecords]);

  useEffect(() => {
    if (selectedRecord) {
      // Set initial remarks if they exist
      if (selectedRecord.verification_remarks) {
        setRemarks(selectedRecord.verification_remarks);
      } else {
        setRemarks('');
      }
    }
  }, [selectedRecord]);

  if (!selectedRecord || allRecords.length === 0) return null;

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr || timeStr === '--:--') return '--:--';
    return timeStr.split(' ')[0];
  };

  const formatHours = (hours: number | undefined) => {
    if (!hours) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
  };

  const handleVerify = async (status: 'accepted' | 'denied', record: AttendanceRecord, remarksText?: string) => {
    if (!record) return;

    setLoading(true);
    try {
      const response = await apiService.verifyAttendanceRecord(companyId, currentUser.id, {
        attendanceId: record.id,
        verificationStatus: status,
        remarks: remarksText?.trim() || undefined,
      });

      if (response.success) {
        // Update the record in local state
        const updatedRecords = localRecords.length > 0 ? localRecords : allRecords;
        const newRecords = updatedRecords.map(r => 
          r.id === record.id 
            ? { ...r, ...response.data, verification_status: status, verification_remarks: remarksText?.trim() || undefined }
            : r
        );
        
        setLocalRecords(newRecords);
        
        // Update selected record if it's the one being verified
        if (selectedRecord?.id === record.id) {
          const updated = newRecords.find(r => r.id === record.id);
          if (updated) {
            setSelectedRecord(updated);
          }
        }
        
        Alert.alert(
          'Success',
          `Attendance ${status === 'accepted' ? 'accepted' : 'denied'} successfully`,
          [
            {
              text: 'OK',
              onPress: () => {
                onVerificationComplete();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to verify attendance');
      }
    } catch (error: any) {
      console.error('Error verifying attendance:', error);
      Alert.alert('Error', 'Failed to verify attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVerification = () => {
    if (!pendingVerification) return;
    
    handleVerify(pendingVerification.status, pendingVerification.record, tempRemarks);
    setShowRemarksModal(false);
    setPendingVerification(null);
    setTempRemarks('');
  };

  const getVerificationStatusBadge = (record: AttendanceRecord) => {
    const status = record.verification_status || 'pending';
    if (status === 'accepted') {
      return (
        <View style={styles.statusBadgeAccepted}>
          <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.statusBadgeTextAccepted}>Accepted</Text>
        </View>
      );
    } else if (status === 'denied') {
      return (
        <View style={styles.statusBadgeDenied}>
          <MaterialIcons name="cancel" size={16} color="#EA4335" />
          <Text style={styles.statusBadgeTextDenied}>Denied</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.statusBadgePending}>
          <MaterialIcons name="schedule" size={16} color="#F56E0F" />
          <Text style={styles.statusBadgeTextPending}>Pending</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1E3A5F" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Verify Attendance</Text>
            <Text style={styles.headerSubtitle}>{internName}</Text>
          </View>
        </View>
        {selectedRecord && getVerificationStatusBadge(selectedRecord)}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Attendance Records Table */}
        {allRecords.length > 0 && (
          <View style={styles.recordsTableSection}>
            <Text style={styles.recordsListTitle}>All Attendance Records</Text>
            {isMobile ? (
              // Mobile: Vertical card layout
              <View style={styles.mobileRecordsContainer}>
                {(localRecords.length > 0 ? localRecords : allRecords).map((record, index) => (
                  <View
                    key={record.id}
                    style={[
                      styles.mobileRecordCard,
                      selectedRecord?.id === record.id && styles.mobileRecordCardSelected
                    ]}
                  >
                    <View style={styles.mobileRecordHeader}>
                      <Text style={styles.mobileRecordDate}>
                        {new Date(record.attendance_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      <View style={[
                        styles.mobileStatusBadge,
                        record.status === 'present' && styles.mobileStatusBadgePresent,
                        record.status === 'late' && styles.mobileStatusBadgeLate,
                        record.status === 'absent' && styles.mobileStatusBadgeAbsent,
                      ]}>
                        <Text style={styles.mobileStatusBadgeText}>
                          {record.status?.toUpperCase() || 'N/A'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.mobileRecordTimes}>
                      <View style={styles.mobileTimeRow}>
                        <Text style={styles.mobileTimeLabel}>AM:</Text>
                        <Text style={styles.mobileTimeValue}>
                          {formatTime(record.am_time_in)} - {formatTime(record.am_time_out)}
                        </Text>
                      </View>
                      <View style={styles.mobileTimeRow}>
                        <Text style={styles.mobileTimeLabel}>PM:</Text>
                        <Text style={styles.mobileTimeValue}>
                          {formatTime(record.pm_time_in)} - {formatTime(record.pm_time_out)}
                        </Text>
                      </View>
                      <View style={styles.mobileTimeRow}>
                        <Text style={styles.mobileTimeLabel}>Hours:</Text>
                        <Text style={styles.mobileTimeValue}>{formatHours(record.total_hours)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.mobileRecordActions}>
                      <View style={styles.verificationActions}>
                        {record.verification_status && record.verification_status !== 'pending' ? (
                          <>
                            {getVerificationStatusBadge(record)}
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.acceptButtonSmall, record.verification_status === 'accepted' && styles.tableActionButtonActive]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setPendingVerification({ record, status: 'accepted' });
                                setTempRemarks(record.verification_remarks || '');
                                setShowRemarksModal(true);
                              }}
                              disabled={loading}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons name="check-circle" size={isMobile ? 18 : 14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.denyButtonSmall, record.verification_status === 'denied' && styles.tableActionButtonActive]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setPendingVerification({ record, status: 'denied' });
                                setTempRemarks(record.verification_remarks || '');
                                setShowRemarksModal(true);
                              }}
                              disabled={loading}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons name="cancel" size={isMobile ? 18 : 14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.remarksButton]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setTempRemarks(record.verification_remarks || '');
                                setPendingVerification({ 
                                  record, 
                                  status: record.verification_status as 'accepted' | 'denied' 
                                });
                                setShowRemarksModal(true);
                              }}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons name="comment" size={isMobile ? 18 : 14} color="#6c757d" />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.acceptButtonSmall]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setPendingVerification({ record, status: 'accepted' });
                                setTempRemarks('');
                                setShowRemarksModal(true);
                              }}
                              disabled={loading}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons name="check-circle" size={isMobile ? 18 : 14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.denyButtonSmall]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setPendingVerification({ record, status: 'denied' });
                                setTempRemarks('');
                                setShowRemarksModal(true);
                              }}
                              disabled={loading}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons name="cancel" size={isMobile ? 18 : 14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.remarksButton]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setTempRemarks(record.verification_remarks || '');
                                setShowRemarksModal(true);
                              }}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons name="comment" size={isMobile ? 18 : 14} color="#6c757d" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              // Desktop/Tablet: Table layout
              isDesktop ? (
                // Desktop: Full width table, no horizontal scroll
                <View style={styles.tableContainer}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Date</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>AM In</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>AM Out</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>PM In</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>PM Out</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Hours</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Verification</Text>
                  </View>
                  
                  {/* Table Rows */}
                  {(localRecords.length > 0 ? localRecords : allRecords).map((record, index) => (
                    <TouchableOpacity
                      key={record.id}
                      style={[
                        styles.tableRow,
                        selectedRecord?.id === record.id && styles.tableRowSelected,
                        index % 2 === 0 && styles.tableRowEven
                      ]}
                      onPress={() => setSelectedRecord(record)}
                    >
                      <Text style={[styles.tableCellText, { flex: 1.5 }]}>
                        {new Date(record.attendance_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      <View style={[styles.tableCell, { flex: 1 }]}>
                        <View style={[
                          styles.statusBadgeSmall,
                          record.status === 'present' && styles.statusBadgePresent,
                          record.status === 'late' && styles.statusBadgeLate,
                          record.status === 'absent' && styles.statusBadgeAbsent,
                        ]}>
                          <Text style={styles.statusBadgeTextSmall}>
                            {record.status?.toUpperCase() || 'N/A'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.tableCellText, { flex: 1 }]}>
                        {formatTime(record.am_time_in)}
                      </Text>
                      <Text style={[styles.tableCellText, { flex: 1 }]}>
                        {formatTime(record.am_time_out)}
                      </Text>
                      <Text style={[styles.tableCellText, { flex: 1 }]}>
                        {formatTime(record.pm_time_in)}
                      </Text>
                      <Text style={[styles.tableCellText, { flex: 1 }]}>
                        {formatTime(record.pm_time_out)}
                      </Text>
                      <Text style={[styles.tableCellText, { flex: 1 }]}>
                        {formatHours(record.total_hours)}
                      </Text>
                      <View style={[styles.tableCell, { flex: 1.2 }]}>
                        <View style={styles.verificationActions}>
                          {/* Always show Accept/Deny buttons - allow editing even if already verified */}
                          <TouchableOpacity
                            style={[
                              styles.tableActionButton,
                              styles.acceptButtonSmall,
                              record.verification_status === 'accepted' && styles.tableActionButtonActive
                            ]}
                            onPress={() => {
                              setSelectedRecord(record);
                              setPendingVerification({ record, status: 'accepted' });
                              setTempRemarks(record.verification_remarks || '');
                              setShowRemarksModal(true);
                            }}
                            disabled={loading}
                          >
                            <MaterialIcons name="check-circle" size={14} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.tableActionButton,
                              styles.denyButtonSmall,
                              record.verification_status === 'denied' && styles.tableActionButtonActive
                            ]}
                            onPress={() => {
                              setSelectedRecord(record);
                              setPendingVerification({ record, status: 'denied' });
                              setTempRemarks(record.verification_remarks || '');
                              setShowRemarksModal(true);
                            }}
                            disabled={loading}
                          >
                            <MaterialIcons name="cancel" size={14} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.remarksButton]}
                            onPress={() => {
                              setSelectedRecord(record);
                              setPendingVerification(null); // Not a new verification, just viewing/editing remarks
                              setTempRemarks(record.verification_remarks || '');
                              setShowRemarksModal(true);
                            }}
                          >
                            <MaterialIcons name="comment" size={14} color="#6c757d" />
                          </TouchableOpacity>
                        </View>
                        {/* Show current status badge below buttons if verified */}
                        {record.verification_status && record.verification_status !== 'pending' && (
                          <View style={styles.statusBadgeContainer}>
                            {getVerificationStatusBadge(record)}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // Tablet: Horizontal scroll if needed
                <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScrollContainer}>
                  <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Date</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1 }]}>AM In</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1 }]}>AM Out</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1 }]}>PM In</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1 }]}>PM Out</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Hours</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Verification</Text>
                    </View>
                    
                    {/* Table Rows */}
                    {(localRecords.length > 0 ? localRecords : allRecords).map((record, index) => (
                      <TouchableOpacity
                        key={record.id}
                        style={[
                          styles.tableRow,
                          selectedRecord?.id === record.id && styles.tableRowSelected,
                          index % 2 === 0 && styles.tableRowEven
                        ]}
                        onPress={() => setSelectedRecord(record)}
                      >
                        <Text style={[styles.tableCellText, { flex: 1.5 }]}>
                          {new Date(record.attendance_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                        <View style={[styles.tableCell, { flex: 1 }]}>
                          <View style={[
                            styles.statusBadgeSmall,
                            record.status === 'present' && styles.statusBadgePresent,
                            record.status === 'late' && styles.statusBadgeLate,
                            record.status === 'absent' && styles.statusBadgeAbsent,
                          ]}>
                            <Text style={styles.statusBadgeTextSmall}>
                              {record.status?.toUpperCase() || 'N/A'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.tableCellText, { flex: 1 }]}>
                          {formatTime(record.am_time_in)}
                        </Text>
                        <Text style={[styles.tableCellText, { flex: 1 }]}>
                          {formatTime(record.am_time_out)}
                        </Text>
                        <Text style={[styles.tableCellText, { flex: 1 }]}>
                          {formatTime(record.pm_time_in)}
                        </Text>
                        <Text style={[styles.tableCellText, { flex: 1 }]}>
                          {formatTime(record.pm_time_out)}
                        </Text>
                        <Text style={[styles.tableCellText, { flex: 1 }]}>
                          {formatHours(record.total_hours)}
                        </Text>
                        <View style={[styles.tableCell, { flex: 1.2 }]}>
                          <View style={styles.verificationActions}>
                            {/* Always show Accept/Deny buttons - allow editing even if already verified */}
                            <TouchableOpacity
                              style={[
                                styles.tableActionButton,
                                styles.acceptButtonSmall,
                                record.verification_status === 'accepted' && styles.tableActionButtonActive
                              ]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setPendingVerification({ record, status: 'accepted' });
                                setTempRemarks(record.verification_remarks || '');
                                setShowRemarksModal(true);
                              }}
                              disabled={loading}
                            >
                              <MaterialIcons name="check-circle" size={14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.tableActionButton,
                                styles.denyButtonSmall,
                                record.verification_status === 'denied' && styles.tableActionButtonActive
                              ]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setPendingVerification({ record, status: 'denied' });
                                setTempRemarks(record.verification_remarks || '');
                                setShowRemarksModal(true);
                              }}
                              disabled={loading}
                            >
                              <MaterialIcons name="cancel" size={14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.remarksButton]}
                              onPress={() => {
                                setSelectedRecord(record);
                                setPendingVerification(null); // Not a new verification, just viewing/editing remarks
                                setTempRemarks(record.verification_remarks || '');
                                setShowRemarksModal(true);
                              }}
                            >
                              <MaterialIcons name="comment" size={14} color="#6c757d" />
                            </TouchableOpacity>
                          </View>
                          {/* Show current status badge below buttons if verified */}
                          {record.verification_status && record.verification_status !== 'pending' && (
                            <View style={styles.statusBadgeContainer}>
                              {getVerificationStatusBadge(record)}
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )
            )}
          </View>
        )}

        {/* Selected Record Details - Only show notes if record is selected */}
        {selectedRecord && selectedRecord.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student Notes</Text>
            <Text style={styles.notesText}>{selectedRecord.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Remarks Modal */}
      <Modal
        visible={showRemarksModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowRemarksModal(false);
          setPendingVerification(null);
          setTempRemarks('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pendingVerification 
                  ? `${pendingVerification.record.verification_status && pendingVerification.record.verification_status !== 'pending'
                      ? 'Edit Verification'
                      : pendingVerification.status === 'accepted' ? 'Accept' : 'Deny'} Attendance`
                  : 'View Remarks'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRemarksModal(false);
                  setPendingVerification(null);
                  setTempRemarks('');
                }}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {pendingVerification && (
                <View style={styles.modalInfoSection}>
                  <Text style={styles.modalInfoText}>
                    Date: {new Date(pendingVerification.record.attendance_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.modalInfoText}>
                    Status: {pendingVerification.record.status?.toUpperCase() || 'N/A'}
                  </Text>
                </View>
              )}

              <View style={styles.modalRemarksSection}>
                <Text style={styles.modalRemarksLabel}>
                  Remarks {pendingVerification ? '' : ''}
                </Text>
                <TextInput
                  style={styles.modalRemarksInput}
                  placeholder="Add any remarks about this attendance..."
                  placeholderTextColor="#878787"
                  value={tempRemarks}
                  onChangeText={setTempRemarks}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!!pendingVerification}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRemarksModal(false);
                  setPendingVerification(null);
                  setTempRemarks('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              {pendingVerification && (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    pendingVerification.status === 'accepted' ? styles.modalAcceptButton : styles.modalDenyButton,
                    loading && styles.modalButtonDisabled
                  ]}
                  onPress={handleConfirmVerification}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>
                      {pendingVerification.status === 'accepted' ? 'Accept' : 'Deny'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
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
    backgroundColor: '#fff',
    width: width,
    height: height,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isMobile ? 16 : 20,
    paddingVertical: isMobile ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: isMobile ? 16 : isTablet ? 18 : 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  headerSubtitle: {
    fontSize: isMobile ? 12 : isTablet ? 13 : 14,
    color: '#6c757d',
    marginTop: 2,
  },
  statusBadgeAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusBadgeTextAccepted: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadgeDenied: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EA4335',
  },
  statusBadgeTextDenied: {
    color: '#EA4335',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F56E0F',
  },
  statusBadgeTextPending: {
    color: '#F56E0F',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: isMobile ? 12 : isTablet ? 16 : 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  statusContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusPresent: {
    backgroundColor: '#E8F5E8',
  },
  statusLate: {
    backgroundColor: '#FFF3E0',
  },
  statusAbsent: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  notesText: {
    fontSize: 14,
    color: '#1E3A5F',
    lineHeight: 20,
  },
  verificationSection: {
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#e9ecef',
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 16,
  },
  remarksContainer: {
    marginBottom: 20,
  },
  remarksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E3A5F',
    minHeight: 100,
    backgroundColor: '#f8f9fa',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  verifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  denyButton: {
    backgroundColor: '#EA4335',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  currentVerificationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  currentVerificationLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  currentVerificationRemarks: {
    fontSize: 12,
    color: '#1E3A5F',
    fontStyle: 'italic',
  },
  recordsTableSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  recordsListTitle: {
    fontSize: isMobile ? 14 : isTablet ? 15 : 16,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 12,
  },
  tableScrollContainer: {
    maxHeight: isMobile ? height * 0.4 : height * 0.5,
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    ...(isDesktop ? { width: '100%', flex: 1 } : { minWidth: isMobile ? width * 0.9 : isTablet ? 700 : 800 }),
  },
  mobileRecordsContainer: {
    gap: 12,
  },
  mobileRecordCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 12,
  },
  mobileRecordCardSelected: {
    borderColor: '#F56E0F',
    borderWidth: 2,
    backgroundColor: '#FFF3E0',
  },
  mobileRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mobileRecordDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  mobileStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mobileStatusBadgePresent: {
    backgroundColor: '#E8F5E8',
  },
  mobileStatusBadgeLate: {
    backgroundColor: '#FFF3E0',
  },
  mobileStatusBadgeAbsent: {
    backgroundColor: '#FFEBEE',
  },
  mobileStatusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  mobileRecordTimes: {
    gap: 6,
    marginBottom: 12,
  },
  mobileTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileTimeLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  mobileTimeValue: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  mobileRecordActions: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
    zIndex: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: isMobile ? 10 : 12,
    paddingHorizontal: isMobile ? 6 : 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
  },
  tableHeaderText: {
    fontSize: isMobile ? 10 : isTablet ? 11 : 12,
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: isMobile ? 4 : 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: isMobile ? 10 : 12,
    paddingHorizontal: isMobile ? 6 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    alignItems: 'center',
    minHeight: isMobile ? 60 : 50,
  },
  tableRowEven: {
    backgroundColor: '#f8f9fa',
  },
  tableRowSelected: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#F56E0F',
  },
  tableCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: isMobile ? 11 : isTablet ? 12 : 13,
    color: '#1E3A5F',
    textAlign: 'center',
    paddingHorizontal: isMobile ? 2 : 4,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusBadgePresent: {
    backgroundColor: '#E8F5E8',
  },
  statusBadgeLate: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeAbsent: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  verificationActions: {
    flexDirection: 'row',
    gap: isMobile ? 8 : 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableActionButton: {
    width: isMobile ? 36 : 28,
    height: isMobile ? 36 : 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 3,
  },
  tableActionButtonActive: {
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  acceptButtonSmall: {
    backgroundColor: '#4CAF50',
  },
  denyButtonSmall: {
    backgroundColor: '#EA4335',
  },
  remarksButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  remarksButtonSmall: {
    marginLeft: 6,
    padding: 4,
  },
  verificationCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeStatusButton: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusBadgeContainer: {
    marginTop: 4,
    alignItems: 'center',
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
    width: isMobile ? '95%' : '100%',
    maxWidth: isMobile ? width * 0.95 : isTablet ? 450 : 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: isMobile ? 16 : isTablet ? 17 : 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: isMobile ? 16 : 20,
    maxHeight: isMobile ? height * 0.4 : 400,
  },
  modalInfoSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#1E3A5F',
    marginBottom: 4,
  },
  modalRemarksSection: {
    marginBottom: 20,
  },
  modalRemarksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  modalRemarksInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E3A5F',
    minHeight: 120,
    backgroundColor: '#f8f9fa',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: isMobile ? 8 : 12,
    padding: isMobile ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    paddingVertical: isMobile ? 10 : 12,
    paddingHorizontal: isMobile ? 16 : 24,
    borderRadius: 8,
    minWidth: isMobile ? 80 : 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  modalAcceptButton: {
    backgroundColor: '#4CAF50',
  },
  modalDenyButton: {
    backgroundColor: '#EA4335',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

