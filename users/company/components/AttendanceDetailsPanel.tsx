import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Fetch ALL attendance records for the selected intern
  const fetchAttendanceRecords = async () => {
    if (!companyId || !currentUser.id || !selectedInternDetail) {
      return;
    }

    setLoading(true);
    try {
      // Fetch all records without date filtering
      const response = await apiService.getAttendanceRecords(companyId, currentUser.id, {
        internId: selectedInternDetail.student_id
        // No date filter - get all records
      });

      if (response.success && response.data) {
        // Sort by date descending (most recent first)
        const sortedRecords = response.data.sort((a: any, b: any) => {
          const dateA = new Date(a.attendance_date).getTime();
          const dateB = new Date(b.attendance_date).getTime();
          return dateB - dateA;
        });
        setAttendanceRecords(sortedRecords);
      } else {
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch records when component mounts
  React.useEffect(() => {
    fetchAttendanceRecords();
  }, [companyId, currentUser.id, selectedInternDetail]);

  const parseTimeTo24Hour = (timeStr: string, isPM: boolean = false) => {
    if (!timeStr || timeStr === '--:--' || timeStr === '') return null;
    
    // Backend sends times in 12-hour format with AM/PM (e.g., "07:00 AM", "12:00 PM", "01:00 PM")
    // Extract time part and period
    const trimmed = timeStr.trim();
    const upperTimeStr = trimmed.toUpperCase();
    
    // Check if time string contains AM/PM indicator
    const hasAM = upperTimeStr.includes('AM');
    const hasPM = upperTimeStr.includes('PM');
    
    // Extract time part (remove AM/PM)
    const timePart = trimmed.replace(/\s*(AM|PM)/i, '').trim();
    const parts = timePart.split(':');
    let hour = parseInt(parts[0]);
    const minute = parseInt(parts[1] || '0');
    
    // Validate parsed values
    if (isNaN(hour) || isNaN(minute)) {
      console.warn('Invalid time format:', timeStr);
      return null;
    }
    
    // Convert to 24-hour format - prioritize AM/PM indicator in string
    if (hasAM) {
      if (hour === 12) hour = 0; // 12 AM = 0:00
      // Other AM hours stay as is (1-11 AM = 1-11)
    } else if (hasPM) {
      if (hour !== 12) hour += 12; // 1 PM = 13:00, 2 PM = 14:00, etc.
      // 12 PM stays 12:00 (noon)
    } else {
      // No AM/PM indicator in string - use isPM parameter as fallback
      // If isPM is true and hour is 1-11, it's likely PM time in 12-hour format
      if (isPM && hour >= 1 && hour <= 11) {
        hour += 12; // Convert 1-11 PM to 13-23
      }
      // If hour is already 13-23, it's already in 24-hour format
      // If hour is 0, it's midnight (12 AM)
      // If hour is 12 and isPM is false, it's noon (12 PM) - but this is ambiguous, assume noon
      if (hour === 12 && !isPM) {
        // Could be 12 PM (noon) or 12 AM (midnight) - default to noon if isPM is false
        // Actually, if isPM is false and hour is 12, it's more likely 12 PM (noon) in 24-hour format
        // But to be safe, we'll keep it as 12
      }
    }
    
    return { hour, minute };
  };

  const getTimeSegments = (record: any) => {
    const segments = [];
    
    // AM segment (should be blue) - 7 AM to 12 PM
    // Get values from record, handling both camelCase and snake_case
    const amTimeIn = record?.amTimeIn || record?.am_time_in;
    const amTimeOut = record?.amTimeOut || record?.am_time_out;
    
    if (amTimeIn && amTimeOut && amTimeIn !== '--:--' && amTimeOut !== '--:--') {
      const amIn = parseTimeTo24Hour(amTimeIn, false);
      const amOut = parseTimeTo24Hour(amTimeOut, false);
      
      if (amIn && amOut) {
        segments.push({
          startHour: amIn.hour,
          startMin: amIn.minute,
          endHour: amOut.hour,
          endMin: amOut.minute,
          type: 'am',
          color: '#2196F3' // Blue for AM
        });
      }
    }
    
    // PM segment (should be green) - 1 PM to 12 AM
    // Get values from record, handling both camelCase and snake_case
    const pmTimeIn = record?.pmTimeIn || record?.pm_time_in;
    const pmTimeOut = record?.pmTimeOut || record?.pm_time_out;
    
    if (pmTimeIn && pmTimeOut && pmTimeIn !== '--:--' && pmTimeOut !== '--:--') {
      // For PM times, pass true as isPM parameter (fallback if no AM/PM in string)
      const pmIn = parseTimeTo24Hour(pmTimeIn, true);
      const pmOut = parseTimeTo24Hour(pmTimeOut, true);
      
      if (pmIn && pmOut) {
        // Ensure PM times are in afternoon/evening (13-23) or midnight (0)
        // If parsed hour is 1-12, it might be in 12-hour format without PM indicator
        let pmInHour = pmIn.hour;
        let pmOutHour = pmOut.hour;
        
        // Check if the time string has PM indicator
        const pmInHasPM = (pmTimeIn || '').toUpperCase().includes('PM');
        const pmOutHasPM = (pmTimeOut || '').toUpperCase().includes('PM');
        
        // If no PM indicator and hour is 1-11, convert to 13-23
        if (!pmInHasPM && pmInHour >= 1 && pmInHour <= 11) {
          pmInHour += 12;
        }
        if (!pmOutHasPM && pmOutHour >= 1 && pmOutHour <= 11) {
          pmOutHour += 12;
        }
        
        // If hour is 12 and no AM/PM indicator, assume PM (noon)
        if (!pmInHasPM && !(pmTimeIn || '').toUpperCase().includes('AM') && pmInHour === 12) {
          // Keep as 12 (noon)
        }
        if (!pmOutHasPM && !(pmTimeOut || '').toUpperCase().includes('AM') && pmOutHour === 12) {
          // Keep as 12 (noon)
        }
        
        segments.push({
          startHour: pmInHour,
          startMin: pmIn.minute,
          endHour: pmOutHour,
          endMin: pmOut.minute,
          type: 'pm',
          color: '#4CAF50' // Green for PM
        });
      }
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
      <View>
        {/* Timeline Legend */}
        <View style={[
          styles.timelineLegend,
          isTablet && styles.timelineLegendTablet,
          isMobile && styles.timelineLegendMobile
        ]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
            <Text style={[
              styles.legendText,
              isTablet && styles.legendTextTablet,
              isMobile && styles.legendTextMobile
            ]}>AM</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={[
              styles.legendText,
              isTablet && styles.legendTextTablet,
              isMobile && styles.legendTextMobile
            ]}>PM</Text>
          </View>
        </View>
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
              const { startHour, startMin, endHour, endMin } = segment;
              
              // Timeline spans from 7 AM (7) to 12 AM (24, treated as 24 for calculation)
              const timelineStartHour = 7;
              const timelineEndHour = 24; // 12 AM (midnight)
              const totalHours = timelineEndHour - timelineStartHour; // 17 hours
              const totalMinutes = totalHours * 60; // 1020 minutes
              
              // Calculate start position (minutes from 7 AM)
              const startMinutesFrom7AM = (startHour - timelineStartHour) * 60 + startMin;
              const startPercent = (startMinutesFrom7AM / totalMinutes) * 100;
              
              // Calculate duration in minutes
              const durationMinutes = (endHour - startHour) * 60 + (endMin - startMin);
              const widthPercent = (durationMinutes / totalMinutes) * 100;
              
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
            {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((hour, index) => {
              // Format hour for display: 7-11 AM, 12 PM, 1-11 PM, 12 AM (24 -> 12 AM)
              let displayHour = hour === 24 ? 12 : hour > 12 ? hour - 12 : hour;
              let period = hour === 24 ? 'AM' : hour < 12 ? 'AM' : hour === 12 ? 'PM' : 'PM';
              
              return (
                <View key={index} style={styles.timelineMarker}>
                  <Text style={styles.timelineMarkerText}>
                    {displayHour} {period}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const getAttendanceHistory = () => {
    // Convert all attendance records to history format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return attendanceRecords.map((record: any) => {
      const recordDate = new Date(record.attendance_date);
      recordDate.setHours(0, 0, 0, 0);
      const isToday = recordDate.getTime() === today.getTime();
      
      // Map all time fields - handle both snake_case and camelCase
      return {
        date: recordDate,
        isToday: isToday,
        record: {
          status: record.status,
          amTimeIn: record.am_time_in || record.amTimeIn || null,
          amTimeOut: record.am_time_out || record.amTimeOut || null,
          pmTimeIn: record.pm_time_in || record.pmTimeIn || null,
          pmTimeOut: record.pm_time_out || record.pmTimeOut || null,
          totalHours: record.total_hours || record.totalHours || 0
        }
      };
    });
  };

  const attendanceHistory = getAttendanceHistory();

  return (
    <View style={styles.detailPanel}>
      {/* Header with Back Button */}
      <View style={[
        styles.detailHeader,
        isTablet && styles.detailHeaderTablet,
        isMobile && styles.detailHeaderMobile
      ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
        >
          <MaterialIcons name="arrow-back" size={24} color="#F56E0F" />
        </TouchableOpacity>
        <Text style={[
          styles.detailTitle,
          isTablet && styles.detailTitleTablet,
          isMobile && styles.detailTitleMobile
        ]}>Attendance Details</Text>
        <View style={{ width: 40 }} />
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
        ) : attendanceHistory.length > 0 ? (
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
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
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
        ) : (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="event-busy" size={48} color="#6c757d" />
            <Text style={styles.emptyStateText}>No attendance records found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  detailPanel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.79);',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2A2A2E',
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
    color: '#F56E0F',
    flex: 1,
    textAlign: 'center',
  },
  calendarIconContainer: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.79);',
    borderWidth: 1,
    borderColor: '#F56E0',
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
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  internSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  detailProfileContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailProfileContainerTablet: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  detailProfileContainerMobile: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailProfileTextTablet: {
    fontSize: 14,
  },
  detailProfileTextMobile: {
    fontSize: 16,
  },
  detailProfileInfo: {
    flex: 1,
  },
  detailProfileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 2,
  },
  detailProfileNameTablet: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailProfileNameMobile: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusBadgeTablet: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeMobile: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'center',
  },
  statusText: {
    color: '#34a853',
    fontSize: 10,
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
  timelineLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  timelineLegendTablet: {
    gap: 12,
    marginBottom: 6,
  },
  timelineLegendMobile: {
    gap: 10,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  legendTextTablet: {
    fontSize: 10,
  },
  legendTextMobile: {
    fontSize: 9,
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
    paddingHorizontal: 4,
    maxWidth: '100%',
  },
  timelineMarker: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  timelineMarkerText: {
    fontSize: 8,
    color: '#999',
    fontWeight: '500',
    textAlign: 'center',
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
    marginTop: 16,
  },
});
