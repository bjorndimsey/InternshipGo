import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DatePicker from '@react-native-community/datetimepicker';
import { apiService } from '../../../lib/api';

const { width, height } = Dimensions.get('window');

interface Intern {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  student_email: string;
  student_profile_picture?: string;
  major: string;
  year: string;
  position: string;
  department?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  applied_at: string;
  status: 'active' | 'inactive' | 'completed' | 'terminated';
  // Location data
  student_latitude?: number;
  student_longitude?: number;
  // Student identification
  id_number?: string;
  // Additional fields for display
  attendance?: {
    present: number;
    absent: number;
    late: number;
    leave: number;
    sick: number;
    totalDays: number;
  };
  performance?: {
    rating: number;
    feedback: string;
    lastReview: string;
  };
  documents?: {
    resume: boolean;
    transcript: boolean;
    recommendationLetter: boolean;
    medicalClearance: boolean;
    insurance: boolean;
  };
  // New fields for attendance tracking
  totalHours?: number;
  currentAttendanceStatus?: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
  // AM/PM time tracking
  amTimeIn?: string;
  amTimeOut?: string;
  pmTimeIn?: string;
  pmTimeOut?: string;
  totalDailyHours?: number;
  remainingHours?: number;
  remainingDays?: number;
  // Daily attendance records
  dailyAttendance?: {
    [date: string]: {
      status: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
      amTimeIn?: string;
      amTimeOut?: string;
      pmTimeIn?: string;
      pmTimeOut?: string;
      totalHours: number;
    };
  };
}

interface AttendanceDetailsPanelProps {
  selectedInternDetail: Intern | null;
  onClose: () => void;
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

export default function AttendanceDetailsPanel({
  selectedInternDetail,
  onClose,
  isMobile,
  isTablet,
  isDesktop,
  companyId,
  currentUser,
}: AttendanceDetailsPanelProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<{[key: string]: any[]}>({});

  if (!selectedInternDetail) return null;

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return '--:--';
    return timeStr.split(' ')[0];
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Fetch attendance records for the selected intern and selected date
  const fetchAttendanceRecords = async (date?: Date) => {
    if (!companyId || !currentUser.id || !selectedInternDetail) {
      return;
    }

    const targetDate = date || selectedDate;
    const dateString = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const cacheKey = `${selectedInternDetail.student_id}-${dateString}`;

    // Check cache first
    if (cache[cacheKey]) {
      setAttendanceRecords(cache[cacheKey]);
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.getAttendanceRecords(companyId, currentUser.id, {
        startDate: dateString,
        endDate: dateString,
        internId: selectedInternDetail.student_id
      });

      if (response.success && response.data) {
        setAttendanceRecords(response.data);
        // Cache the result
        setCache(prev => ({
          ...prev,
          [cacheKey]: response.data
        }));
      } else {
        setAttendanceRecords([]);
        // Cache empty result to avoid repeated API calls
        setCache(prev => ({
          ...prev,
          [cacheKey]: []
        }));
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced date change handler
  const handleDateChange = React.useCallback((newDate: Date) => {
    setSelectedDate(newDate);
    // Small delay to avoid rapid API calls
    setTimeout(() => {
      fetchAttendanceRecords(newDate);
    }, 100);
  }, [selectedInternDetail, companyId, currentUser.id]);

  // Fetch records when component mounts
  React.useEffect(() => {
    fetchAttendanceRecords();
  }, [companyId, currentUser.id, selectedInternDetail]);

  const getTimeSegments = (record: any) => {
    const segments = [];
    
    if (record?.amTimeIn && record?.amTimeOut) {
      segments.push({
        start: record.amTimeIn.split(' ')[0],
        end: record.amTimeOut.split(' ')[0],
        type: 'am',
        color: '#4CAF50'
      });
    }
    
    if (record?.pmTimeIn && record?.pmTimeOut) {
      segments.push({
        start: record.pmTimeIn.split(' ')[0],
        end: record.pmTimeOut.split(' ')[0],
        type: 'pm',
        color: '#2196F3'
      });
    }
    
    return segments;
  };

  const renderTimelineBar = (segments: any[], totalHours: number) => {
    if (segments.length === 0) {
      return (
        <View style={[
          styles.timelineBarEmpty,
          isTablet && styles.timelineBarEmptyTablet,
          isMobile && styles.timelineBarEmptyMobile
        ]}>
          <Text style={[
            styles.timelineBarEmptyText,
            isTablet && styles.timelineBarEmptyTextTablet,
            isMobile && styles.timelineBarEmptyTextMobile
          ]}>No activity recorded</Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.timelineBarContainer,
        isTablet && styles.timelineBarContainerTablet,
        isMobile && styles.timelineBarContainerMobile
      ]}>
        <View style={[
          styles.timelineBar,
          isTablet && styles.timelineBarTablet,
          isMobile && styles.timelineBarMobile
        ]}>
          {segments.map((segment, index) => {
            const startHour = parseInt(segment.start.split(':')[0]);
            const startMin = parseInt(segment.start.split(':')[1]);
            const endHour = parseInt(segment.end.split(':')[0]);
            const endMin = parseInt(segment.end.split(':')[1]);
            
            const startPercent = ((startHour - 9) * 60 + startMin) / (15 * 60) * 100;
            const widthPercent = ((endHour - startHour) * 60 + (endMin - startMin)) / (15 * 60) * 100;
            
            return (
              <View
                key={index}
                style={[
                  styles.timelineSegment,
                  isTablet && styles.timelineSegmentTablet,
                  isMobile && styles.timelineSegmentMobile,
                  {
                    left: `${Math.max(0, startPercent)}%`,
                    width: `${Math.max(2, widthPercent)}%`,
                    backgroundColor: segment.color
                  }
                ]}
              />
            );
          })}
        </View>
        <View style={styles.timelineMarkers}>
          {[9, 11, 13, 15, 17, 19, 21, 23].map((hour, index) => (
            <View key={index} style={styles.timelineMarker}>
              <Text style={styles.timelineMarkerText}>{hour}:00</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const getAttendanceHistory = () => {
    // Use real attendance records from database
    const record = attendanceRecords.find((r: any) => 
      r.user_id === parseInt(selectedInternDetail.student_id) ||
      r.intern_id === parseInt(selectedInternDetail.student_id) ||
      r.student_id === parseInt(selectedInternDetail.student_id)
    );

    const today = new Date();
    return [{
      date: selectedDate,
      isToday: selectedDate.toDateString() === today.toDateString(),
      record: record ? {
        status: record.status,
        amTimeIn: record.am_time_in,
        amTimeOut: record.am_time_out,
        pmTimeIn: record.pm_time_in,
        pmTimeOut: record.pm_time_out,
        totalHours: record.total_hours || 0
      } : null
    }];
  };

  const attendanceHistory = getAttendanceHistory();

  return (
    <View style={styles.detailPanel}>
      {/* Header */}
      <View style={[
        styles.detailHeader,
        isTablet && styles.detailHeaderTablet,
        isMobile && styles.detailHeaderMobile
      ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
        >
          <MaterialIcons name="arrow-forward" size={24} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={[
          styles.detailTitle,
          isTablet && styles.detailTitleTablet,
          isMobile && styles.detailTitleMobile
        ]}>Attendance Details</Text>
        <TouchableOpacity 
          style={styles.calendarIconContainer}
          onPress={() => setShowDatePicker(true)}
        >
          <MaterialIcons name="calendar-today" size={24} color="#1E3A5F" />
        </TouchableOpacity>
      </View>

      {/* Intern Summary Card */}
      <View style={[
        styles.internSummaryCard,
        isTablet && styles.internSummaryCardTablet,
        isMobile && styles.internSummaryCardMobile
      ]}>
        <View style={[
          styles.internSummaryContent,
          isTablet && styles.internSummaryContentTablet,
          isMobile && styles.internSummaryContentMobile
        ]}>
          <View style={[
            styles.internSummaryLeft,
            isTablet && styles.internSummaryLeftTablet,
            isMobile && styles.internSummaryLeftMobile
          ]}>
             <View style={[
               styles.detailProfileContainer,
               isTablet && styles.detailProfileContainerTablet,
               isMobile && styles.detailProfileContainerMobile
             ]}>
              {selectedInternDetail.student_profile_picture ? (
                <Image 
                  source={{ uri: selectedInternDetail.student_profile_picture }} 
                  style={styles.detailProfileImage}
                />
              ) : (
                <View style={styles.detailProfilePlaceholder}>
                   <Text style={[
                     styles.detailProfileText,
                     isTablet && styles.detailProfileTextTablet,
                     isMobile && styles.detailProfileTextMobile
                   ]}>
                    {selectedInternDetail.first_name.charAt(0)}{selectedInternDetail.last_name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.detailProfileInfo}>
               <Text style={[
                 styles.detailProfileName,
                 isTablet && styles.detailProfileNameTablet,
                 isMobile && styles.detailProfileNameMobile
               ]}>
                {selectedInternDetail.first_name} {selectedInternDetail.last_name}
              </Text>
              <View style={[
                styles.statusBadge,
                isTablet && styles.statusBadgeTablet,
                isMobile && styles.statusBadgeMobile
              ]}>
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          </View>
          <View style={[
            styles.internSummaryRight,
            isTablet && styles.internSummaryRightTablet,
            isMobile && styles.internSummaryRightMobile
          ]}>
            <View style={[
              styles.summaryMetrics,
              isTablet && styles.summaryMetricsTablet,
              isMobile && styles.summaryMetricsMobile
            ]}>
              <View style={[
                styles.summaryMetric,
                isTablet && styles.summaryMetricTablet,
                isMobile && styles.summaryMetricMobile
              ]}>
                <Text style={[
                  styles.summaryMetricLabel,
                  isTablet && styles.summaryMetricLabelTablet,
                  isMobile && styles.summaryMetricLabelMobile
                ]}>Last Clocked In</Text>
                <Text style={[
                  styles.summaryMetricValue,
                  isTablet && styles.summaryMetricValueTablet,
                  isMobile && styles.summaryMetricValueMobile
                ]}>A few seconds ago</Text>
              </View>
              <View style={[
                styles.summaryMetric,
                isTablet && styles.summaryMetricTablet,
                isMobile && styles.summaryMetricMobile
              ]}>
                <Text style={[
                  styles.summaryMetricLabel,
                  isTablet && styles.summaryMetricLabelTablet,
                  isMobile && styles.summaryMetricLabelMobile
                ]}>Last Messaged</Text>
                <Text style={[
                  styles.summaryMetricValue,
                  isTablet && styles.summaryMetricValueTablet,
                  isMobile && styles.summaryMetricValueMobile
                ]}>2 Days ago</Text>
              </View>
              <View style={[
                styles.summaryMetric,
                isTablet && styles.summaryMetricTablet,
                isMobile && styles.summaryMetricMobile
              ]}>
                <Text style={[
                  styles.summaryMetricLabel,
                  isTablet && styles.summaryMetricLabelTablet,
                  isMobile && styles.summaryMetricLabelMobile
                ]}>Intern ID</Text>
                <Text style={[
                  styles.summaryMetricValue,
                  isTablet && styles.summaryMetricValueTablet,
                  isMobile && styles.summaryMetricValueMobile
                ]}>#{selectedInternDetail.id_number || selectedInternDetail.student_id}</Text>
              </View>
              <View style={[
                styles.summaryMetric,
                isTablet && styles.summaryMetricTablet,
                isMobile && styles.summaryMetricMobile
              ]}>
                <Text style={[
                  styles.summaryMetricLabel,
                  isTablet && styles.summaryMetricLabelTablet,
                  isMobile && styles.summaryMetricLabelMobile
                ]}>Remaining Hours</Text>
                <Text style={[
                  styles.summaryMetricValue,
                  isTablet && styles.summaryMetricValueTablet,
                  isMobile && styles.summaryMetricValueMobile
                ]}>
                  {formatHours(selectedInternDetail.remainingHours || 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>


      {/* Attendance History */}
      <ScrollView style={[
        styles.attendanceHistory,
        isTablet && styles.attendanceHistoryTablet,
        isMobile && styles.attendanceHistoryMobile
      ]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading attendance data...</Text>
          </View>
        ) : (
          attendanceHistory.map((day, index) => {
          const segments = getTimeSegments(day.record);
          const totalHours = day.record?.totalHours || 0;
          
          return (
            <View key={index} style={[
              styles.dayCard,
              isTablet && styles.dayCardTablet,
              isMobile && styles.dayCardMobile
            ]}>
              <View style={[
                styles.dayHeader,
                isTablet && styles.dayHeaderTablet,
                isMobile && styles.dayHeaderMobile
              ]}>
                <Text style={[
                  styles.dayTitle,
                  isTablet && styles.dayTitleTablet,
                  isMobile && styles.dayTitleMobile
                ]}>
                  {day.isToday ? 'Today' : day.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                {day.record?.status === 'present' && (
                  <View style={styles.approvedBadge}>
                    <View style={styles.approvedDot} />
                    <Text style={styles.approvedText}>Approved</Text>
                  </View>
                )}
              </View>
              
              <View style={[
                styles.dayContent,
                isTablet && styles.dayContentTablet,
                isMobile && styles.dayContentMobile
              ]}>
                <View style={[
                  styles.timeInfo,
                  isTablet && styles.timeInfoTablet,
                  isMobile && styles.timeInfoMobile
                ]}>
                  <Text style={[
                    styles.timeLabel,
                    isTablet && styles.timeLabelTablet,
                    isMobile && styles.timeLabelMobile
                  ]}>Clock-in:</Text>
                  <Text style={[
                    styles.timeValue,
                    isTablet && styles.timeValueTablet,
                    isMobile && styles.timeValueMobile
                  ]}>
                    {formatTime(day.record?.amTimeIn || day.record?.pmTimeIn || undefined)}
                  </Text>
                </View>
                
                {renderTimelineBar(segments, totalHours)}
                
                <View style={[
                  styles.timeInfo,
                  isTablet && styles.timeInfoTablet,
                  isMobile && styles.timeInfoMobile
                ]}>
                  <Text style={[
                    styles.timeLabel,
                    isTablet && styles.timeLabelTablet,
                    isMobile && styles.timeLabelMobile
                  ]}>Clock-out:</Text>
                  <Text style={[
                    styles.timeValue,
                    isTablet && styles.timeValueTablet,
                    isMobile && styles.timeValueMobile
                  ]}>
                    {formatTime(day.record?.pmTimeOut || day.record?.amTimeOut || undefined)}
                  </Text>
                </View>
                
                <View style={[
                  styles.durationInfo,
                  isTablet && styles.durationInfoTablet,
                  isMobile && styles.durationInfoMobile
                ]}>
                  <Text style={[
                    styles.durationLabel,
                    isTablet && styles.durationLabelTablet,
                    isMobile && styles.durationLabelMobile
                  ]}>Duration:</Text>
                  <Text style={[
                    styles.durationValue,
                    isTablet && styles.durationValueTablet,
                    isMobile && styles.durationValueMobile
                  ]}>
                    {totalHours > 0 ? formatHours(totalHours) : '-'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowDatePicker(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContent}>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (!isNaN(date.getTime())) {
                      handleDateChange(date);
                    }
                  }}
                  style={{
                    width: '100%',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    padding: '12px',
                    fontSize: 16,
                    color: '#333',
                    outline: 'none',
                  }}
                />
              ) : (
                <TextInput
                  style={styles.dateInput}
                  value={selectedDate.toISOString().split('T')[0]}
                  onChangeText={(text: string) => {
                    const date = new Date(text);
                    if (!isNaN(date.getTime())) {
                      handleDateChange(date);
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numeric"
                />
              )}
              
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={styles.todayButton}
                  onPress={() => {
                    const today = new Date();
                    handleDateChange(today);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.todayButtonText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  detailPanel: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    flex: 1,
    textAlign: 'center',
  },
  calendarIconContainer: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  internSummaryCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxWidth: '100%',
  },
  internSummaryContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    flexWrap: 'wrap',
  },
  internSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 0,
  },
  detailProfileContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  detailProfileContainerTablet: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  detailProfileContainerMobile: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  detailProfileImage: {
    width: '100%',
    height: '100%',
  },
  detailProfilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailProfileTextTablet: {
    fontSize: 18,
  },
  detailProfileTextMobile: {
    fontSize: 20,
  },
  detailProfileInfo: {
    flex: 1,
  },
  detailProfileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 2,
  },
  detailProfileNameTablet: {
    fontSize: 16,
    marginBottom: 6,
  },
  detailProfileNameMobile: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeTablet: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeMobile: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    color: '#34a853',
    fontSize: 12,
    fontWeight: '600',
  },
  internSummaryRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  summaryMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  summaryMetric: {
    width: '48%',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 0,
  },
  summaryMetricLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  summaryMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  attendanceHistory: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  dayCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    maxWidth: '100%',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
    flexShrink: 1,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  approvedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34a853',
    marginRight: 6,
  },
  approvedText: {
    color: '#34a853',
    fontSize: 12,
    fontWeight: '600',
  },
  dayContent: {
    gap: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    flex: 1,
  },
  timeValue: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  durationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  durationLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    flex: 1,
  },
  durationValue: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  timelineBarContainer: {
    height: 32,
    marginVertical: 12,
    position: 'relative',
    maxWidth: '100%',
  },
  timelineBar: {
    height: 32,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    maxWidth: '100%',
  },
  timelineSegment: {
    position: 'absolute',
    top: 0,
    height: 32,
    borderRadius: 16,
  },
  timelineMarkers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    maxWidth: '100%',
  },
  timelineMarker: {
    alignItems: 'center',
  },
  timelineMarkerText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
    flexShrink: 1,
  },
  timelineBarEmpty: {
    height: 32,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  timelineBarEmptyText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  
  // Responsive Detail Panel Styles
  detailHeaderTablet: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailHeaderMobile: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  detailTitleTablet: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailTitleMobile: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  
  // Responsive Intern Summary Card
  internSummaryCardTablet: {
    margin: 16,
    padding: 16,
    borderRadius: 10,
    maxWidth: '100%',
  },
  internSummaryCardMobile: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: '100%',
  },
  internSummaryContentTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  internSummaryContentMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  internSummaryLeftTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  internSummaryLeftMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  internSummaryRightTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  internSummaryRightMobile: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  summaryMetricsTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
    minWidth: 0,
  },
  summaryMetricsMobile: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  summaryMetricTablet: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 0,
  },
  summaryMetricMobile: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    alignItems: 'center',
    width: '100%',
  },
  summaryMetricLabelTablet: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6c757d',
  },
  summaryMetricLabelMobile: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6c757d',
  },
  summaryMetricValueTablet: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  summaryMetricValueMobile: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  
  // Responsive Date Range Selector
  dateRangeSelectorTablet: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  dateRangeSelectorMobile: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
  dateRangeButtonTablet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dateRangeButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dateRangeTextTablet: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateRangeTextMobile: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Responsive Attendance History
  attendanceHistoryTablet: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  attendanceHistoryMobile: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  dayCardTablet: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: '100%',
  },
  dayCardMobile: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    borderRadius: 6,
    maxWidth: '100%',
  },
  dayHeaderTablet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dayHeaderMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  dayTitleTablet: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    flexShrink: 1,
  },
  dayTitleMobile: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A5F',
    flexShrink: 1,
  },
  dayContentTablet: {
    gap: 8,
  },
  dayContentMobile: {
    gap: 6,
  },
  timeInfoTablet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  timeInfoMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 2,
    gap: 2,
  },
  timeLabelTablet: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    flex: 1,
  },
  timeLabelMobile: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  timeValueTablet: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  timeValueMobile: {
    fontSize: 11,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  durationInfoTablet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  durationInfoMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 2,
    gap: 2,
  },
  durationLabelTablet: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    flex: 1,
  },
  durationLabelMobile: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  durationValueTablet: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  durationValueMobile: {
    fontSize: 11,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  timelineBarContainerTablet: {
    height: 20,
    marginTop: 8,
    maxWidth: '100%',
  },
  timelineBarContainerMobile: {
    height: 16,
    marginTop: 6,
    maxWidth: '100%',
  },
  timelineBarTablet: {
    height: 20,
    borderRadius: 10,
    maxWidth: '100%',
  },
  timelineBarMobile: {
    height: 16,
    borderRadius: 8,
    maxWidth: '100%',
  },
  timelineSegmentTablet: {
    height: 20,
    borderRadius: 10,
  },
  timelineSegmentMobile: {
    height: 16,
    borderRadius: 8,
  },
  timelineBarEmptyTablet: {
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  timelineBarEmptyMobile: {
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  timelineBarEmptyTextTablet: {
    fontSize: 10,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  timelineBarEmptyTextMobile: {
    fontSize: 9,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  
  // Date Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  closeModalButton: {
    padding: 4,
  },
  datePickerContent: {
    padding: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  todayButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
  },
  todayButtonText: {
    color: '#1E3A5F',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
});
