import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

// Custom hook for responsive breakpoints
const useResponsive = () => {
  const [screenData, setScreenData] = useState(() => {
    const { width } = Dimensions.get('window');
    return { width };
  });

  useEffect(() => {
    const onChange = (result: { window: { width: number; height: number } }) => {
      setScreenData({ width: result.window.width });
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const isMobile = screenData.width <= 767;
  const isTablet = screenData.width >= 768 && screenData.width <= 1199;
  const isDesktop = screenData.width >= 1200;
  const isSmallMobile = screenData.width < 480;

  return { isMobile, isTablet, isDesktop, isSmallMobile, width: screenData.width };
};

interface Intern {
  id: string;
  student_id: string;
  user_id: number;
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
  // Company information
  company_id?: string;
  company_name?: string;
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

interface AttendanceTimelineProps {
  currentUser: {
    id: string;
    email: string;
    user_type: string;
  };
}

export default function AttendanceTimeline({ currentUser }: AttendanceTimelineProps) {
  const { isMobile, isTablet, isDesktop, isSmallMobile, width } = useResponsive();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Calculate which week of the month we're currently in
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstMonday.setDate(firstDay.getDate() + daysToMonday);
    
    const daysDiff = Math.ceil((today.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(daysDiff / 7);
  }); // Calculate current week of month
  const [attendanceRecords, setAttendanceRecords] = useState<{[key: string]: any[]}>({});
  const [selectedCompany, setSelectedCompany] = useState<string>('all');


  // Fetch interns assigned to this coordinator
  const fetchInterns = async () => {
    if (!currentUser?.id) {
      return;
    }

    setLoading(true);

    try {
      // Get coordinator profile to get coordinator ID
      const coordinatorResponse = await apiService.getCoordinatorProfileByUserId(currentUser.id);
      if (!coordinatorResponse.success || !coordinatorResponse.user) {
        setInterns([]);
        setFilteredInterns([]);
        return;
      }

      const coordinatorId = coordinatorResponse.user.id;

      // Fetch interns assigned to this coordinator
      const response = await apiService.getCoordinatorInterns(coordinatorId);

      if (response.success && response.interns) {
        setInterns(response.interns);
        setFilteredInterns(response.interns);
      } else {
        setInterns([]);
        setFilteredInterns([]);
      }
    } catch (error) {
      console.error('Error fetching interns:', error);
      Alert.alert('Error', 'Failed to fetch interns. Please try again.');
      setInterns([]);
      setFilteredInterns([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance records for the current week
  const fetchAttendanceRecords = async () => {
    if (!currentUser?.id || filteredInterns.length === 0) {
      return;
    }

    setLoading(true);

    try {
      const weekDates = getWeekDates(currentMonth, currentWeek);
      const startDate = weekDates[0].toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const endDate = weekDates[6].toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

      // Get unique company IDs from filtered interns
      const companyIds = [...new Set(filteredInterns.map(intern => intern.company_id).filter(Boolean))];
      if (companyIds.length === 0) {
        setAttendanceRecords({});
        setLoading(false);
        return;
      }

      // Fetch attendance records for all companies
      const allRecords: any[] = [];
      for (const companyId of companyIds) {
        if (!companyId) continue; // Skip undefined company IDs
        try {
          const response = await apiService.getAttendanceRecords(companyId.toString(), currentUser.id, {
            startDate: startDate,
            endDate: endDate
          });

          if (response.success && response.data) {
            // Filter records to only include interns handled by this coordinator
            const filteredRecords = response.data.filter((record: any) => {
              const matches = filteredInterns.some(intern => 
                record.user_id === intern.user_id || 
                record.user_id === parseInt(intern.user_id.toString())
              );
              return matches;
            });
            allRecords.push(...filteredRecords);
          }
        } catch (error) {
          console.error(`Error fetching attendance for company ${companyId}:`, error);
        }
      }

      if (allRecords.length > 0) {
        // Group records by date for easy lookup (same as TimelineView.tsx)
        const groupedRecords: {[key: string]: any[]} = {};
        allRecords.forEach((record: any) => {
          // Use attendance_date field (same as TimelineView.tsx)
          const dateKey = record.attendance_date || record.date || record.created_at?.split('T')[0];
          
          if (dateKey) {
            if (!groupedRecords[dateKey]) {
              groupedRecords[dateKey] = [];
            }
            groupedRecords[dateKey].push(record);
          }
        });

        setAttendanceRecords(groupedRecords);
      } else {
        setAttendanceRecords({});
      }
    } catch (error) {
      console.error('❌ Error fetching attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchInterns();
  }, [currentUser?.id]);

  // Fetch attendance records when interns or week changes
  useEffect(() => {
    if (filteredInterns.length > 0) {
      fetchAttendanceRecords();
    }
  }, [currentMonth, currentWeek, filteredInterns]);

  // Filter interns by company
  const filterInternsByCompany = (companyId: string) => {
    setSelectedCompany(companyId);
    if (companyId === 'all') {
      setFilteredInterns(interns);
    } else {
      const filtered = interns.filter(intern => intern.company_id === companyId);
      setFilteredInterns(filtered);
    }
  };

  // Get unique companies from interns
  const getUniqueCompanies = () => {
    const companies = interns.reduce((acc: any[], intern) => {
      if (intern.company_id && intern.company_name) {
        const existing = acc.find(c => c.id === intern.company_id);
        if (!existing) {
          acc.push({
            id: intern.company_id,
            name: intern.company_name
          });
        }
      }
      return acc;
    }, []);
    return companies;
  };

  // Timeline View Functions
  const getWeekDates = (month: Date, weekOffset: number = 0) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Get first day of month and find the Monday of that week
    const firstDay = new Date(year, monthIndex, 1);
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstMonday.setDate(firstDay.getDate() + daysToMonday);
    
    // Add week offset (each week is 7 days)
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (weekOffset * 7));
    
    // Generate 7 days starting from the target Monday
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(targetMonday);
      date.setDate(targetMonday.getDate() + i);
      weekDates.push(date);
    }
    
    return weekDates;
  };

  const getTotalWeeksInMonth = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Get first day of month and find the Monday of that week
    const firstDay = new Date(year, monthIndex, 1);
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstMonday.setDate(firstDay.getDate() + daysToMonday);
    
    // Get last day of month
    const lastDay = new Date(year, monthIndex + 1, 0);
    
    // Calculate how many weeks we need to cover the entire month
    const daysDiff = Math.ceil((lastDay.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
    return Math.ceil(daysDiff / 7);
  };

  const getAttendanceStatus = (intern: Intern, date: Date) => {
    const dateString = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    
    // Check if it's weekend
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Look for attendance record in the fetched data
    const dayRecords = attendanceRecords[dateString] || [];
    
    
    const attendanceRecord = dayRecords.find((record: any) => {
      // Match using user_id (from users table)
      const matches = record.user_id === intern.user_id || 
             record.user_id === parseInt(intern.user_id.toString());
      
      
      return matches;
    });
    
    if (!attendanceRecord) {
      if (isWeekend) {
        return { status: 'weekend', code: 'W', color: '#fbbc04' };
      }
      return { status: 'not_marked', code: '', color: '#f5f5f5' };
    }
    
    // Check if it's weekend and present
    if (isWeekend && attendanceRecord.status === 'present') {
      return { status: 'weekend_present', code: 'W/P', color: '#9c27b0' };
    }
    
    // Regular status mapping (same as TimelineView.tsx)
    switch (attendanceRecord.status) {
      case 'present':
        return { status: 'present', code: 'P', color: '#34a853' };
      case 'late':
        return { status: 'late', code: 'L', color: '#fbbc04' };
      case 'absent':
        return { status: 'absent', code: 'A', color: '#ea4335' };
      case 'leave':
        return { status: 'leave', code: 'L', color: '#ff9800' };
      case 'sick':
        return { status: 'sick', code: 'S', color: '#ff5722' };
      default:
        return { status: 'not_marked', code: '', color: '#f5f5f5' };
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
    // Reset to first week when changing months
    setCurrentWeek(0);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const totalWeeks = getTotalWeeksInMonth(currentMonth);
    
    if (direction === 'prev') {
      if (currentWeek > 0) {
        setCurrentWeek(prev => prev - 1);
      } else {
        // Go to previous month's last week
        const prevMonth = new Date(currentMonth);
        prevMonth.setMonth(currentMonth.getMonth() - 1);
        const prevMonthWeeks = getTotalWeeksInMonth(prevMonth);
        setCurrentMonth(prevMonth);
        setCurrentWeek(prevMonthWeeks - 1);
      }
    } else {
      if (currentWeek < totalWeeks - 1) {
        setCurrentWeek(prev => prev + 1);
      } else {
        // Go to next month's first week
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(currentMonth.getMonth() + 1);
        setCurrentMonth(nextMonth);
        setCurrentWeek(0);
      }
    }
  };

  const renderTimelineView = () => {
    const weekDates = getWeekDates(currentMonth, currentWeek);
    const totalWeeks = getTotalWeeksInMonth(currentMonth);
    const companies = getUniqueCompanies();
    
    return (
      <View style={styles.timelineView}>
        {/* Company Filter */}
        {companies.length > 0 && (
          <View style={styles.companyFilter}>
            <Text style={styles.filterLabel}>Filter by Company:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.companyFilterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedCompany === 'all' && styles.activeFilterButton
                ]}
                onPress={() => filterInternsByCompany('all')}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedCompany === 'all' && styles.activeFilterButtonText
                ]}>
                  All Companies
                </Text>
              </TouchableOpacity>
              {companies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.filterButton,
                    selectedCompany === company.id && styles.activeFilterButton
                  ]}
                  onPress={() => filterInternsByCompany(company.id)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedCompany === company.id && styles.activeFilterButtonText
                  ]}>
                    {company.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Month and Week Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
          >
            <MaterialIcons name="chevron-left" size={24} color="#F56E0F" />
          </TouchableOpacity>
          
          <View style={styles.monthTitleContainer}>
            <Text style={styles.monthTitle}>
              {currentMonth.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </Text>
            <Text style={styles.weekIndicator}>
              Week {currentWeek + 1} of {totalWeeks}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
          >
            <MaterialIcons name="chevron-right" size={24} color="#F56E0F" />
          </TouchableOpacity>
        </View>

        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity
            style={[styles.weekNavButton, currentWeek === 0 && styles.disabledButton]}
            onPress={() => navigateWeek('prev')}
            disabled={currentWeek === 0}
          >
            <MaterialIcons name="chevron-left" size={20} color={currentWeek === 0 ? "#878787" : "#F56E0F"} />
            <Text style={[styles.weekNavText, currentWeek === 0 && styles.disabledText]}>Previous Week</Text>
          </TouchableOpacity>
          
          <View style={styles.weekInfo}>
            <Text style={styles.weekDateRange}>
              {weekDates[0].toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })} - {weekDates[6].toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
            <TouchableOpacity
              style={styles.currentWeekButton}
              onPress={() => {
                const today = new Date();
                setCurrentMonth(today);
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                const firstMonday = new Date(firstDay);
                const dayOfWeek = firstDay.getDay();
                const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                firstMonday.setDate(firstDay.getDate() + daysToMonday);
                const daysDiff = Math.ceil((today.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
                setCurrentWeek(Math.floor(daysDiff / 7));
              }}
            >
              <Text style={styles.currentWeekButtonText}>Go to Current Week</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.weekNavButton, currentWeek === totalWeeks - 1 && styles.disabledButton]}
            onPress={() => navigateWeek('next')}
            disabled={currentWeek === totalWeeks - 1}
          >
            <Text style={[styles.weekNavText, currentWeek === totalWeeks - 1 && styles.disabledText]}>Next Week</Text>
            <MaterialIcons name="chevron-right" size={20} color={currentWeek === totalWeeks - 1 ? "#878787" : "#F56E0F"} />
          </TouchableOpacity>
        </View>

        {/* Fixed Header Row */}
        <View style={styles.timelineHeader}>
          <View style={[
            styles.timelineCell, 
            styles.employeeHeaderCell,
            isDesktop && styles.desktopEmployeeHeaderCell
          ]}>
            <Text style={styles.timelineHeaderText}>Interns</Text>
          </View>
          {weekDates.map((date, index) => (
            <View key={index} style={[
              styles.timelineCell,
              isMobile && styles.mobileTimelineCell,
              isTablet && styles.tabletTimelineCell,
              isDesktop && styles.desktopTimelineCell
            ]}>
              <Text style={styles.timelineHeaderText}>
                {date.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
              <Text style={styles.timelineSubHeaderText}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
            </View>
          ))}
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading attendance data...</Text>
          </View>
        )}

        {/* No Interns Message */}
        {!loading && filteredInterns.length === 0 && (
          <View style={styles.noDataContainer}>
            <MaterialIcons name="school" size={48} color="#ccc" />
            <Text style={styles.noDataText}>
              {interns.length === 0 
                ? 'No interns assigned to you yet' 
                : 'No interns found for the selected company'
              }
            </Text>
          </View>
        )}


        {/* Scrollable Intern Rows */}
        {!loading && filteredInterns.length > 0 && (
          <ScrollView 
            style={styles.timelineScrollContainer}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.timelineScrollContent}
          >
            {isDesktop ? (
              /* Desktop: Full width grid with vertical scroll for rows only */
              <View style={[styles.timelineGrid, styles.desktopTimelineGrid]}>
                {/* Employee Rows */}
                {filteredInterns.map((intern) => (
                  <View key={intern.id} style={styles.timelineRow}>
                    {/* Employee Info */}
                    <View style={[styles.timelineCell, styles.employeeCell, styles.desktopEmployeeCell]}>
                      <View style={styles.employeeInfo}>
                        <View style={styles.profileContainer}>
                          {intern.student_profile_picture ? (
                            <Image 
                              source={{ uri: intern.student_profile_picture }} 
                              style={styles.timelineProfileImage}
                            />
                          ) : (
                            <View style={styles.timelineProfilePlaceholder}>
                              <Text style={styles.timelineProfileText}>
                                {intern.first_name.charAt(0)}{intern.last_name.charAt(0)}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.employeeDetails}>
                          <Text style={styles.employeeName}>
                            {intern.first_name} {intern.last_name}
                          </Text>
                          <Text style={styles.employeeId}>{intern.id_number || intern.student_id}</Text>
                          {intern.company_name && (
                            <Text style={styles.employeeCompany}>{intern.company_name}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    {/* Attendance Status for each day */}
                    {weekDates.map((date, index) => {
                      const attendanceStatus = getAttendanceStatus(intern, date);
                      return (
                        <View key={index} style={[styles.timelineCell, styles.desktopTimelineCell]}>
                          <View style={[
                            styles.statusBox,
                            { backgroundColor: attendanceStatus.color }
                          ]}>
                            <Text style={styles.statusCode}>
                              {attendanceStatus.code}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ) : (
              /* Mobile/Tablet: Horizontal scroll for columns, vertical scroll for rows */
              <ScrollView 
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={[
                  styles.timelineScrollContent,
                  styles.timelineScrollContentMobile
                ]}
              >
                <View style={[
                  styles.timelineGrid,
                  (isMobile || isTablet) && styles.mobileTimelineGrid
                ]}>
                  {/* Employee Rows */}
                  {filteredInterns.map((intern) => (
                    <View key={intern.id} style={styles.timelineRow}>
                      {/* Employee Info */}
                      <View style={[
                        styles.timelineCell, 
                        styles.employeeCell
                      ]}>
                        <View style={styles.employeeInfo}>
                          <View style={styles.profileContainer}>
                            {intern.student_profile_picture ? (
                              <Image 
                                source={{ uri: intern.student_profile_picture }} 
                                style={styles.timelineProfileImage}
                              />
                            ) : (
                              <View style={styles.timelineProfilePlaceholder}>
                                <Text style={styles.timelineProfileText}>
                                  {intern.first_name.charAt(0)}{intern.last_name.charAt(0)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.employeeDetails}>
                            <Text style={styles.employeeName}>
                              {intern.first_name} {intern.last_name}
                            </Text>
                            <Text style={styles.employeeId}>{intern.id_number || intern.student_id}</Text>
                            {intern.company_name && (
                              <Text style={styles.employeeCompany}>{intern.company_name}</Text>
                            )}
                          </View>
                        </View>
                      </View>
                      
                      {/* Attendance Status for each day */}
                      {weekDates.map((date, index) => {
                        const attendanceStatus = getAttendanceStatus(intern, date);
                        return (
                          <View key={index} style={[
                            styles.timelineCell,
                            isMobile && styles.mobileTimelineCell,
                            isTablet && styles.tabletTimelineCell
                          ]}>
                            <View style={[
                              styles.statusBox,
                              { backgroundColor: attendanceStatus.color }
                            ]}>
                              <Text style={styles.statusCode}>
                                {attendanceStatus.code}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </ScrollView>
        )}
        
        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend:</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#34a853' }]}>
                <Text style={styles.legendCode}>P</Text>
              </View>
              <Text style={styles.legendText}>P - Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#ea4335' }]}>
                <Text style={styles.legendCode}>A</Text>
              </View>
              <Text style={styles.legendText}>A - Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#fbbc04' }]}>
                <Text style={styles.legendCode}>L</Text>
              </View>
              <Text style={styles.legendText}>L - Late</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#fbbc04' }]}>
                <Text style={styles.legendCode}>W</Text>
              </View>
              <Text style={styles.legendText}>W - Weekend</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#9c27b0' }]}>
                <Text style={styles.legendCode}>W/P</Text>
              </View>
              <Text style={styles.legendText}>W/P - Weekend Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#ff9800' }]}>
                <Text style={styles.legendCode}>L</Text>
              </View>
              <Text style={styles.legendText}>L - Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#ff5722' }]}>
                <Text style={styles.legendCode}>S</Text>
              </View>
              <Text style={styles.legendText}>S - Sick</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[
      styles.timelineContainer,
      isTablet && styles.tabletTimelineContainer,
      isMobile && styles.mobileTimelineContainer,
      isDesktop && styles.desktopTimelineContainer
    ]}>
      {renderTimelineView()}
    </View>
  );
}

const styles = StyleSheet.create({
  // Timeline View Styles
  timelineContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  timelineView: {
    flex: 1,
  },
  companyFilter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  companyFilterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
    backgroundColor: '#2A2A2E', // Dark background
  },
  navButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  weekIndicator: {
    fontSize: 10,
    color: '#F56E0F', // Primary orange
    marginTop: 2,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2A2A2E', // Dark secondary background
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  weekNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    gap: 3,
  },
  disabledButton: {
    backgroundColor: '#878787', // Muted gray
    borderColor: 'rgba(245, 110, 15, 0.1)',
  },
  weekNavText: {
    fontSize: 11,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  disabledText: {
    color: '#878787', // Muted gray
  },
  weekInfo: {
    alignItems: 'center',
  },
  weekDateRange: {
    fontSize: 11,
    color: '#FBFBFB', // Light text
    fontWeight: '600',
  },
  currentWeekButton: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 4,
  },
  currentWeekButtonText: {
    fontSize: 10,
    color: '#FBFBFB', // Light text
    fontWeight: '600',
  },
  timelineScrollContainer: {
    flex: 1,
    maxHeight: 400, // Set a maximum height to enable scrolling
  },
  timelineScrollContent: {
    flexGrow: 1, // Allow content to grow and enable scrolling
  },
  timelineScrollContentMobile: {
    minWidth: 600, // Wider minimum width for mobile scrolling
  },
  timelineGrid: {
    minWidth: 600, // Minimum width to ensure proper layout
    flex: 1, // Allow grid to take available space
  },
  // Mobile timeline grid needs to be wider to trigger horizontal scroll
  mobileTimelineGrid: {
    minWidth: 600, // Wider for mobile to ensure horizontal scroll
  },
  // Desktop timeline grid should use full width
  desktopTimelineGrid: {
    minWidth: undefined,
    width: '100%',
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    backgroundColor: '#151419', // Dark background
    paddingVertical: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    minHeight: 70,
  },
  timelineCell: {
    width: 100, // Fixed width for consistent horizontal scrolling
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#f1f3f4',
  },
  // Desktop cells use flex instead of fixed width
  desktopTimelineCell: {
    flex: 1,
    width: undefined,
    minWidth: 0, // Allow flex to work properly
  },
  // Responsive cell widths
  mobileTimelineCell: {
    width: 70, // Smaller width for mobile
  },
  tabletTimelineCell: {
    width: 80, // Medium width for tablet
  },
  employeeHeaderCell: {
    width: 160, // Fixed width for employee column
    backgroundColor: '#151419', // Dark background
  },
  employeeCell: {
    width: 160, // Fixed width for employee column
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  // Desktop employee cells use flex
  desktopEmployeeHeaderCell: {
    flex: 2,
    width: undefined,
    minWidth: 0, // Allow flex to work properly
  },
  desktopEmployeeCell: {
    flex: 2,
    width: undefined,
    minWidth: 0, // Allow flex to work properly
  },
  timelineHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  timelineSubHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileContainer: {
    marginRight: 12,
  },
  timelineProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  } as any,
  timelineProfilePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineProfileText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 2,
  },
  employeeId: {
    fontSize: 16,
    color: '#6c757d',
  },
  employeeCompany: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '500',
    marginTop: 2,
  },
  statusBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  statusCode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    flexWrap: 'wrap',
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E3A5F',
    marginRight: 10,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendCode: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  legendText: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 12,
  },
  // Responsive Styles
  tabletTimelineContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  mobileTimelineContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
  desktopTimelineContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    width: '100%', // Ensure full width on desktop
  },
});
