import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import { AttendanceRecordEntry } from '../utils/journalGenerator';
import { apiService } from '../../../lib/api';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

interface AttendanceHistoryPanelProps {
  visible: boolean;
  onClose: () => void;
  companyName: string;
  companyId: string;
  userId: string;
  records: AttendanceRecordEntry[];
  loading: boolean;
  onRecordUpdated?: () => void;
}

export default function AttendanceHistoryPanel({
  visible,
  onClose,
  companyName,
  companyId,
  userId,
  records,
  loading,
  onRecordUpdated,
}: AttendanceHistoryPanelProps) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordEntry | null>(null);
  const [editFormData, setEditFormData] = useState({
    amIn: '',
    amOut: '',
    pmIn: '',
    pmOut: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Reset filter when modal opens
      setSelectedMonth(null);
      // Fetch user name when modal opens
      fetchUserName();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, userId]);

  const fetchUserName = async () => {
    if (!userId) return;
    try {
      const response = await apiService.getProfile(userId);
      if (response.success && response.user) {
        const firstName = response.user.first_name || '';
        const lastName = response.user.last_name || '';
        setUserName(`${firstName} ${lastName}`.trim() || 'User');
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
      setUserName('User');
    }
  };

  // Get unique months from records
  const getAvailableMonths = () => {
    const monthSet = new Set<string>();
    records.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(monthKey);
    });
    return Array.from(monthSet).sort().reverse(); // Most recent first
  };

  // Format month for display
  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filter records by selected month
  const getFilteredRecords = () => {
    if (!selectedMonth) return records;
    return records.filter(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  };

  const filteredRecords = getFilteredRecords();
  const availableMonths = getAvailableMonths();
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    });
  };

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr || timeStr === '--:--') return '--:--';
    return timeStr.split(' ')[0]; // Remove AM/PM if present
  };

  const getVerificationBadge = (status: string | undefined) => {
    const verificationStatus = status || 'pending';
    if (verificationStatus === 'accepted') {
      return (
        <View style={styles.verificationBadgeAccepted}>
          <MaterialIcons name="check-circle" size={14} color="#4CAF50" />
          <Text style={styles.verificationBadgeTextAccepted}>Accepted</Text>
        </View>
      );
    } else if (verificationStatus === 'denied') {
      return (
        <View style={styles.verificationBadgeDenied}>
          <MaterialIcons name="cancel" size={14} color="#EA4335" />
          <Text style={styles.verificationBadgeTextDenied}>Denied</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.verificationBadgePending}>
          <MaterialIcons name="schedule" size={14} color="#F56E0F" />
          <Text style={styles.verificationBadgeTextPending}>Pending</Text>
        </View>
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      present: { bg: '#E8F5E8', text: '#2D5A3D' },
      late: { bg: '#FFF3E0', text: '#F56E0F' },
      absent: { bg: '#FFEBEE', text: '#EA4335' },
      leave: { bg: '#E3F2FD', text: '#2196F3' },
      sick: { bg: '#F3E5F5', text: '#9C27B0' },
      not_marked: { bg: '#F5F5F5', text: '#666' },
    };

    const color = statusColors[status] || statusColors.not_marked;
    const displayText = status.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    return (
      <View style={[styles.statusBadge, { backgroundColor: color.bg }]}>
        <Text style={[styles.statusBadgeText, { color: color.text }]}>{displayText}</Text>
      </View>
    );
  };

  const handleEditRecord = (record: AttendanceRecordEntry) => {
    setEditingRecord(record);
    setEditFormData({
      amIn: formatTime(record.amIn) || '',
      amOut: formatTime(record.amOut) || '',
      pmIn: formatTime(record.pmIn) || '',
      pmOut: formatTime(record.pmOut) || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    // Validate times
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const times = [editFormData.amIn, editFormData.amOut, editFormData.pmIn, editFormData.pmOut];
    const invalidTimes = times.filter(t => t && !timeRegex.test(t));

    if (invalidTimes.length > 0) {
      Alert.alert('Invalid Time', 'Please enter times in HH:MM format (e.g., 08:00)');
      return;
    }

    setIsSaving(true);
    try {
      // Calculate total hours
      let totalHours = 0;
      if (editFormData.amIn && editFormData.amOut) {
        const [amInH, amInM] = editFormData.amIn.split(':').map(Number);
        const [amOutH, amOutM] = editFormData.amOut.split(':').map(Number);
        const amInMinutes = amInH * 60 + amInM;
        const amOutMinutes = amOutH * 60 + amOutM;
        if (amOutMinutes > amInMinutes) {
          totalHours += (amOutMinutes - amInMinutes) / 60;
        }
      }
      if (editFormData.pmIn && editFormData.pmOut) {
        const [pmInH, pmInM] = editFormData.pmIn.split(':').map(Number);
        const [pmOutH, pmOutM] = editFormData.pmOut.split(':').map(Number);
        const pmInMinutes = pmInH * 60 + pmInM;
        const pmOutMinutes = pmOutH * 60 + pmOutM;
        if (pmOutMinutes > pmInMinutes) {
          totalHours += (pmOutMinutes - pmInMinutes) / 60;
        }
      }

      // Determine status
      let status: 'present' | 'absent' | 'late' | 'leave' | 'sick' = 'present';
      if (!editFormData.amIn && !editFormData.pmIn) {
        status = 'absent';
      } else {
        const amHour = editFormData.amIn ? parseInt(editFormData.amIn.split(':')[0]) : null;
        const pmHour = editFormData.pmIn ? parseInt(editFormData.pmIn.split(':')[0]) : null;
        if ((amHour !== null && amHour >= 9) || (pmHour !== null && pmHour >= 14)) {
          status = 'late';
        }
      }

      const attendanceData = {
        internId: userId,
        attendanceDate: editingRecord.date,
        status,
        amTimeIn: editFormData.amIn || undefined,
        amTimeOut: editFormData.amOut || undefined,
        pmTimeIn: editFormData.pmIn || undefined,
        pmTimeOut: editFormData.pmOut || undefined,
        amStatus: editFormData.amIn ? 'present' : 'not_marked' as 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked',
        pmStatus: editFormData.pmIn ? 'present' : 'not_marked' as 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked',
        totalHours: totalHours > 0 ? totalHours : undefined,
        notes: editingRecord.notes || undefined,
      };

      const response = await apiService.saveAttendanceRecord(companyId, userId, attendanceData);

      if (response.success) {
        Alert.alert('Success', 'Attendance record updated successfully');
        setEditingRecord(null);
        if (onRecordUpdated) {
          onRecordUpdated();
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to update attendance record');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to update attendance record. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadExcel = async () => {
    try {
      if (filteredRecords.length === 0) {
        Alert.alert('Info', 'No attendance records to export.');
        return;
      }

      Alert.alert('Processing', 'Preparing Excel file...');

      // Prepare data for Excel
      const excelData = filteredRecords.map((record, index) => {
        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'Asia/Manila',
        });

        const formatTimeForExcel = (timeStr: string | undefined) => {
          if (!timeStr || timeStr === '--:--') return 'N/A';
          return timeStr.split(' ')[0];
        };

        const getStatusText = (status: string) => {
          return status.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        };

        const getVerificationText = (status: string | undefined) => {
          const verificationStatus = status || 'pending';
          return verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1);
        };

        return {
          'No.': index + 1,
          'Date': formattedDate,
          'Status': getStatusText(record.status),
          'AM In': formatTimeForExcel(record.amIn),
          'AM Out': formatTimeForExcel(record.amOut),
          'PM In': formatTimeForExcel(record.pmIn),
          'PM Out': formatTimeForExcel(record.pmOut),
          'Total Hours': record.totalHours ? record.totalHours.toFixed(2) : '0.00',
          'Verification Status': getVerificationText(record.verification_status),
          'Notes': record.notes || 'N/A',
        };
      });

      // Create a new workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance History');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });

      // Create blob and download
      if (Platform.OS === 'web') {
        const blob = new Blob([excelBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${userName || 'Attendance'}_${companyName}_${selectedMonth ? formatMonthDisplay(selectedMonth).replace(/\s+/g, '_') : 'All_Months'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'Excel file downloaded successfully!');
      } else {
        Alert.alert(
          'Info', 
          'Excel download is available on web platform. Please use the web version to download the file.'
        );
      }
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      Alert.alert('Error', 'Failed to download Excel file. Please try again.');
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={24} color="#1E3A5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Attendance History</Text>
          <Text style={styles.subtitle}>{companyName}</Text>
          {userName && (
            <Text style={styles.userNameText}>{userName}</Text>
          )}
          
          {/* Month Filter and Download Button */}
          {!loading && records.length > 0 && (
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={styles.monthFilterButton}
                onPress={() => setShowMonthPicker(true)}
              >
                <MaterialIcons name="filter-list" size={18} color="#1E3A5F" />
                <Text style={styles.monthFilterText}>
                  {selectedMonth ? formatMonthDisplay(selectedMonth) : 'All Months'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#1E3A5F" />
              </TouchableOpacity>
              {selectedMonth && (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => setSelectedMonth(null)}
                >
                  <MaterialIcons name="close" size={16} color="#6c757d" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={downloadExcel}
              >
                <MaterialIcons name="download" size={18} color="#fff" />
                <Text style={styles.downloadButtonText}>Excel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F56E0F" />
              <Text style={styles.loadingText}>Loading attendance history...</Text>
            </View>
          ) : filteredRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {selectedMonth ? `No attendance records found for ${formatMonthDisplay(selectedMonth)}` : 'No attendance records found'}
              </Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.tableContainer}
              contentContainerStyle={styles.tableContainerContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <View style={styles.table}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <View style={[styles.headerCell, styles.dateCell]}>
                    <Text style={styles.headerText}>Date</Text>
                  </View>
                  <View style={[styles.headerCell, styles.statusCell]}>
                    <Text style={styles.headerText}>Status</Text>
                  </View>
                  <View style={[styles.headerCell, styles.timeCell]}>
                    <Text style={styles.headerText}>AM In</Text>
                  </View>
                  <View style={[styles.headerCell, styles.timeCell]}>
                    <Text style={styles.headerText}>AM Out</Text>
                  </View>
                  <View style={[styles.headerCell, styles.timeCell]}>
                    <Text style={styles.headerText}>PM In</Text>
                  </View>
                  <View style={[styles.headerCell, styles.timeCell]}>
                    <Text style={styles.headerText}>PM Out</Text>
                  </View>
                  <View style={[styles.headerCell, styles.hoursCell]}>
                    <Text style={styles.headerText}>Hours</Text>
                  </View>
                  <View style={[styles.headerCell, styles.verificationCell]}>
                    <Text style={styles.headerText}>Verification</Text>
                  </View>
                </View>

                {/* Table Rows */}
                {filteredRecords.map((record, index) => {
                  const isDenied = record.verification_status === 'denied';
                  return (
                  <View
                    key={record.id}
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                      isDenied && styles.tableRowDenied,
                    ]}
                  >
                    <View style={[styles.tableCell, styles.dateCell]}>
                      <Text style={styles.cellText}>{formatDate(record.date)}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.statusCell]}>
                      {getStatusBadge(record.status)}
                    </View>
                    <View style={[styles.tableCell, styles.timeCell]}>
                      <Text style={styles.cellText}>{formatTime(record.amIn)}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.timeCell]}>
                      <Text style={styles.cellText}>{formatTime(record.amOut)}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.timeCell]}>
                      <Text style={styles.cellText}>{formatTime(record.pmIn)}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.timeCell]}>
                      <Text style={styles.cellText}>{formatTime(record.pmOut)}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.hoursCell]}>
                      <Text style={styles.cellText}>
                        {record.totalHours ? record.totalHours.toFixed(2) : '0.00'}h
                      </Text>
                    </View>
                    <View style={[styles.tableCell, styles.verificationCell]}>
                      <View style={styles.verificationCellContent}>
                        {getVerificationBadge(record.verification_status)}
                        {isDenied && (
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEditRecord(record)}
                          >
                            <MaterialIcons name="edit" size={16} color="#F56E0F" />
                            <Text style={styles.editButtonText}>Edit</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                  );
                })}
                </View>
              </ScrollView>
            </ScrollView>
          )}
        </View>
      </Animated.View>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.monthPickerOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={styles.monthPickerContent} onStartShouldSetResponder={() => true}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.monthPickerList}>
              <TouchableOpacity
                style={[
                  styles.monthPickerItem,
                  !selectedMonth && styles.monthPickerItemSelected
                ]}
                onPress={() => {
                  setSelectedMonth(null);
                  setShowMonthPicker(false);
                }}
              >
                <Text style={[
                  styles.monthPickerItemText,
                  !selectedMonth && styles.monthPickerItemTextSelected
                ]}>
                  All Months
                </Text>
                {!selectedMonth && (
                  <MaterialIcons name="check" size={20} color="#F56E0F" />
                )}
              </TouchableOpacity>
              {availableMonths.map((monthKey) => (
                <TouchableOpacity
                  key={monthKey}
                  style={[
                    styles.monthPickerItem,
                    selectedMonth === monthKey && styles.monthPickerItemSelected
                  ]}
                  onPress={() => {
                    setSelectedMonth(monthKey);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={[
                    styles.monthPickerItemText,
                    selectedMonth === monthKey && styles.monthPickerItemTextSelected
                  ]}>
                    {formatMonthDisplay(monthKey)}
                  </Text>
                  {selectedMonth === monthKey && (
                    <MaterialIcons name="check" size={20} color="#F56E0F" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={!!editingRecord}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingRecord(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Attendance Times</Text>
              <TouchableOpacity onPress={() => setEditingRecord(null)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {editingRecord && (
              <View style={styles.editModalBody}>
                <Text style={styles.editModalDate}>
                  {formatDate(editingRecord.date)}
                </Text>
                <Text style={styles.editModalSubtext}>
                  Update your attendance times for this denied record
                </Text>

                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeInputLabel}>AM Time In</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={editFormData.amIn}
                    onChangeText={(text) => {
                      const formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                      if (formatted.length >= 2) {
                        setEditFormData({ ...editFormData, amIn: `${formatted.slice(0, 2)}:${formatted.slice(2)}` });
                      } else {
                        setEditFormData({ ...editFormData, amIn: formatted });
                      }
                    }}
                    placeholder="08:00"
                    maxLength={5}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeInputLabel}>AM Time Out</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={editFormData.amOut}
                    onChangeText={(text) => {
                      const formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                      if (formatted.length >= 2) {
                        setEditFormData({ ...editFormData, amOut: `${formatted.slice(0, 2)}:${formatted.slice(2)}` });
                      } else {
                        setEditFormData({ ...editFormData, amOut: formatted });
                      }
                    }}
                    placeholder="12:00"
                    maxLength={5}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeInputLabel}>PM Time In</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={editFormData.pmIn}
                    onChangeText={(text) => {
                      const formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                      if (formatted.length >= 2) {
                        setEditFormData({ ...editFormData, pmIn: `${formatted.slice(0, 2)}:${formatted.slice(2)}` });
                      } else {
                        setEditFormData({ ...editFormData, pmIn: formatted });
                      }
                    }}
                    placeholder="13:00"
                    maxLength={5}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeInputLabel}>PM Time Out</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={editFormData.pmOut}
                    onChangeText={(text) => {
                      const formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                      if (formatted.length >= 2) {
                        setEditFormData({ ...editFormData, pmOut: `${formatted.slice(0, 2)}:${formatted.slice(2)}` });
                      } else {
                        setEditFormData({ ...editFormData, pmOut: formatted });
                      }
                    }}
                    placeholder="17:00"
                    maxLength={5}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            <View style={styles.editModalFooter}>
              <TouchableOpacity
                style={[styles.editModalButton, styles.editModalCancelButton]}
                onPress={() => setEditingRecord(null)}
                disabled={isSaving}
              >
                <Text style={styles.editModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, styles.editModalSaveButton, isSaving && styles.disabledButton]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.editModalSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: isMobile ? width : Math.min(800, width * 0.8),
    height: height,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    marginBottom: 12,
    padding: 4,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  userNameText: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  monthFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flex: 1,
    maxWidth: 250,
  },
  monthFilterText: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '500',
    flex: 1,
  },
  clearFilterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F56E0F',
    borderWidth: 1,
    borderColor: '#F56E0F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6c757d',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  tableContainer: {
    flex: 1,
  },
  tableContainerContent: {
    paddingBottom: 20,
  },
  table: {
    minWidth: isMobile ? 800 : '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    borderBottomWidth: 2,
    borderBottomColor: '#F56E0F',
  },
  headerCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerText: {
    fontSize: isMobile ? 12 : 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 50,
  },
  tableRowEven: {
    backgroundColor: '#fff',
  },
  tableRowOdd: {
    backgroundColor: '#f8f9fa',
  },
  tableRowDenied: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#EA4335',
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  cellText: {
    fontSize: isMobile ? 11 : 13,
    color: '#1E3A5F',
    textAlign: 'center',
  },
  dateCell: {
    width: isMobile ? 100 : 120,
    minWidth: isMobile ? 100 : 120,
  },
  statusCell: {
    width: isMobile ? 80 : 100,
    minWidth: isMobile ? 80 : 100,
  },
  timeCell: {
    width: isMobile ? 70 : 80,
    minWidth: isMobile ? 70 : 80,
  },
  hoursCell: {
    width: isMobile ? 60 : 70,
    minWidth: isMobile ? 60 : 70,
  },
  verificationCell: {
    width: isMobile ? 120 : 150,
    minWidth: isMobile ? 120 : 150,
    borderRightWidth: 0,
  },
  verificationCellContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#F56E0F',
    marginTop: 4,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F56E0F',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  verificationBadgeAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 4,
  },
  verificationBadgeTextAccepted: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  verificationBadgeDenied: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EA4335',
    gap: 4,
  },
  verificationBadgeTextDenied: {
    color: '#EA4335',
    fontSize: 11,
    fontWeight: '600',
  },
  verificationBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F56E0F',
    gap: 4,
  },
  verificationBadgeTextPending: {
    color: '#F56E0F',
    fontSize: 11,
    fontWeight: '600',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  editModalBody: {
    padding: 20,
  },
  editModalDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  editModalSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 20,
  },
  timeInputGroup: {
    marginBottom: 16,
  },
  timeInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E3A5F',
    backgroundColor: '#f8f9fa',
  },
  editModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  editModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalCancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editModalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  editModalSaveButton: {
    backgroundColor: '#F56E0F',
  },
  editModalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  monthPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  monthPickerContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  monthPickerList: {
    maxHeight: 400,
  },
  monthPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthPickerItemSelected: {
    backgroundColor: '#FFF3E0',
  },
  monthPickerItemText: {
    fontSize: 16,
    color: '#1E3A5F',
  },
  monthPickerItemTextSelected: {
    fontWeight: '600',
    color: '#F56E0F',
  },
});

