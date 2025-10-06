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
  Animated,
  Platform,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DatePicker from '@react-native-community/datetimepicker';
import { apiService } from '../../../lib/api';
import TimelineView from './TimelineView';
import AttendanceDetailsPanel from '../components/AttendanceDetailsPanel';

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

interface AttendancePageProps {
  currentUser: {
    id: string;
    email: string;
    user_type: string;
  };
}

export default function AttendancePage({ currentUser }: AttendancePageProps) {
  const [screenWidth, setScreenWidth] = useState(width);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [dateFilterLoading, setDateFilterLoading] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  // Responsive breakpoints
  const isMobile = screenWidth <= 767;
  const isTablet = screenWidth >= 768 && screenWidth <= 1199;
  const isDesktop = screenWidth >= 1200;
  const isSmallMobile = screenWidth < 480;

  // Update screen width on resize
  useEffect(() => {
    const onChange = (result: { window: { width: number; height: number } }) => {
      setScreenWidth(result.window.width);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Debug logging
  console.log('Screen width:', screenWidth);
  console.log('isMobile:', isMobile);
  console.log('isTablet:', isTablet);
  console.log('isDesktop:', isDesktop);
  const [attendanceRecords, setAttendanceRecords] = useState<{[key: string]: any[]}>({});
  const [buttonAnimations, setButtonAnimations] = useState<{[key: string]: Animated.Value}>({});
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [showInternModal, setShowInternModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'timeline'>('list');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedInternDetail, setSelectedInternDetail] = useState<Intern | null>(null);
  const [showWorkingTimeModal, setShowWorkingTimeModal] = useState(false);
  const [showDisabledAlert, setShowDisabledAlert] = useState(false);
  const [disabledReason, setDisabledReason] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Debug modal state changes
  useEffect(() => {
    console.log('🔄 Success modal state changed:', {
      showSuccessModal,
      successMessage
    });
  }, [showSuccessModal, successMessage]);
  const [workCompletedInterns, setWorkCompletedInterns] = useState<Set<string>>(new Set());
  const [companyId, setCompanyId] = useState<string>('');
  const [detailPanelSlideAnim] = useState(new Animated.Value(width));
  const [detailDateRange, setDetailDateRange] = useState({
    start: new Date(),
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workingHours, setWorkingHours] = useState({
    startTime: '07:00', // Default 7:00 AM
    startPeriod: 'AM',
    endTime: '07:00',   // Default 7:00 PM
    endPeriod: 'PM',
    breakStart: '11:00', // 11:00 AM
    breakStartPeriod: 'AM',
    breakEnd: '01:00',    // 1:00 PM
    breakEndPeriod: 'PM'
  });
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false);

  useEffect(() => {
    fetchCompanyId();
    fetchInterns();
  }, []);

  // Reload working hours when companyId is available
  useEffect(() => {
    if (companyId) {
      loadWorkingHours();
    }
  }, [companyId]);

  // Load today's attendance when both companyId and interns are available
  useEffect(() => {
    console.log('🔄🔄🔄 Attendance loading effect triggered:', {
      companyId: !!companyId,
      companyIdValue: companyId,
      internsLength: interns.length,
      shouldLoad: companyId && interns.length > 0,
      timestamp: new Date().toISOString()
    });
    
    if (companyId && interns.length > 0) {
      console.log('🔄🔄🔄 Calling loadTodayAttendance from useEffect');
      loadTodayAttendance();
      checkAvailableDates(); // Check what dates are available
    } else {
      console.log('🔄🔄🔄 NOT calling loadTodayAttendance - conditions not met');
    }
  }, [companyId, interns.length]);



  // Fetch company ID from user ID
  const fetchCompanyId = async () => {
    try {
      const response = await apiService.getCompanyProfileByUserId(currentUser.id);
      if (response.success && response.user) {
        setCompanyId(response.user.id);
        console.log('🏢 Company ID fetched:', response.user.id);
      } else {
        console.error('❌ Failed to get company profile');
        Alert.alert('Error', 'Failed to load company information');
      }
    } catch (error) {
      console.error('❌ Error fetching company ID:', error);
      Alert.alert('Error', 'Failed to load company information');
    }
  };

  // Load working hours from backend
  const loadWorkingHours = async () => {
    if (!companyId) {
      console.log('⏳ Company ID not available yet, skipping working hours load');
      return;
    }
    
    try {
      setWorkingHoursLoading(true);
      const response = await apiService.getWorkingHours(companyId, currentUser.id);
      
      if (response.success && response.data) {
        setWorkingHours({
          startTime: response.data.start_time || '07:00',
          startPeriod: response.data.start_period || 'AM',
          endTime: response.data.end_time || '07:00',
          endPeriod: response.data.end_period || 'PM',
          breakStart: response.data.break_start || '11:00',
          breakStartPeriod: response.data.break_start_period || 'AM',
          breakEnd: response.data.break_end || '01:00',
          breakEndPeriod: response.data.break_end_period || 'PM'
        });
        console.log('🕐 Working hours loaded:', response.data);
        // Don't show success modal for loading existing hours
      } else {
        console.log('No working hours found, using defaults');
        // Show info message for first time setup
        setSuccessMessage('Welcome! Please set your working hours below.');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error loading working hours:', error);
      Alert.alert('Error', 'Failed to load working hours. Please try again.');
    } finally {
      setWorkingHoursLoading(false);
    }
  };

  // Manual refresh function for testing
  const refreshAttendanceData = async () => {
    console.log('🔄 Manual refresh triggered');
    if (companyId && interns.length > 0) {
      await loadTodayAttendance();
    } else {
      console.log('❌ Cannot refresh - missing companyId or interns');
    }
  };

  // Handle success modal close with data refresh
  const handleSuccessModalClose = async () => {
    setShowSuccessModal(false);
    // Refresh attendance data to ensure UI shows latest data
    if (companyId) {
      console.log('🔄 Refreshing data after success modal close');
      await loadTodayAttendance();
    }
  };


  // Load today's attendance data
  const loadTodayAttendance = async () => {
    console.log('🔄🔄🔄 loadTodayAttendance FUNCTION CALLED!');
    console.log('🔄 loadTodayAttendance called with:', {
      companyId: !!companyId,
      companyIdValue: companyId,
      internsLength: interns.length,
      timestamp: new Date().toISOString()
    });
    
    if (!companyId) {
      console.log('⏳ Company ID not available yet, skipping attendance load');
      return;
    }
    
    if (interns.length === 0) {
      console.log('⏳ Interns not loaded yet, skipping attendance load');
      return;
    }
    
    try {
      console.log('📊 Loading today\'s attendance...');
      const response = await apiService.getTodayAttendance(companyId, currentUser.id);
      
      if (response.success && response.data) {
        console.log('✅✅✅ Today\'s attendance loaded from backend:', response.data);
        console.log('✅ Raw response data length:', response.data.length);
        console.log('✅ First record details:', response.data[0] ? {
          user_id: response.data[0].user_id,
          am_time_in: response.data[0].am_time_in,
          am_time_out: response.data[0].am_time_out,
          pm_time_in: response.data[0].pm_time_in,
          pm_time_out: response.data[0].pm_time_out,
          total_hours: response.data[0].total_hours
        } : 'No records');
        console.log('📊 Available interns:', interns.map(i => ({
          name: i.first_name + ' ' + i.last_name,
          student_id: i.student_id,
          student_id_type: typeof i.student_id
        })));
        
        console.log('📊 Attendance records from backend:', response.data.map((record: any) => ({
          user_id: record.user_id,
          user_id_type: typeof record.user_id,
          am_time_in: record.am_time_in,
          am_time_out: record.am_time_out,
          pm_time_in: record.pm_time_in,
          pm_time_out: record.pm_time_out,
          total_hours: record.total_hours
        })));
        
        // Update interns with existing attendance data
        setInterns(prevInterns => {
          console.log('🔄 setInterns called in loadTodayAttendance with prevInterns:', prevInterns.map(i => ({
            name: i.first_name + ' ' + i.last_name,
            amTimeIn: i.amTimeIn,
            amTimeOut: i.amTimeOut,
            pmTimeIn: i.pmTimeIn,
            pmTimeOut: i.pmTimeOut,
            totalDailyHours: i.totalDailyHours
          })));
          
          const updatedInterns = prevInterns.map(intern => {
            // Find matching attendance record
            const attendanceRecord = response.data.find((record: any) => {
              const matches = record.user_id === parseInt(intern.student_id);
              console.log('🔍 Checking match:', {
                recordUserId: record.user_id,
                recordUserIdType: typeof record.user_id,
                internStudentId: intern.student_id,
                internStudentIdType: typeof intern.student_id,
                parsedStudentId: parseInt(intern.student_id),
                parsedStudentIdType: typeof parseInt(intern.student_id),
                matches: matches,
                strictEqual: record.user_id === parseInt(intern.student_id),
                looseEqual: record.user_id == intern.student_id
              });
              return matches;
            });
            
            if (attendanceRecord) {
              console.log('📊 Updating intern with attendance data:', {
                internName: intern.first_name + ' ' + intern.last_name,
                studentId: intern.student_id,
                attendanceRecord: {
                  am_time_in: attendanceRecord.am_time_in,
                  am_time_out: attendanceRecord.am_time_out,
                  pm_time_in: attendanceRecord.pm_time_in,
                  pm_time_out: attendanceRecord.pm_time_out,
                  total_hours: attendanceRecord.total_hours,
                  status: attendanceRecord.status
                }
              });
              
              const updatedIntern = {
                ...intern,
                amTimeIn: attendanceRecord.am_time_in || '',
                amTimeOut: attendanceRecord.am_time_out || '',
                pmTimeIn: attendanceRecord.pm_time_in || '',
                pmTimeOut: attendanceRecord.pm_time_out || '',
                totalDailyHours: attendanceRecord.total_hours || 0,
                currentAttendanceStatus: attendanceRecord.status || 'not_marked'
              };
              
              console.log('📊 Updated intern data:', {
                name: updatedIntern.first_name + ' ' + updatedIntern.last_name,
                pmTimeOut: updatedIntern.pmTimeOut,
                pmTimeIn: updatedIntern.pmTimeIn,
                amTimeOut: updatedIntern.amTimeOut,
                amTimeIn: updatedIntern.amTimeIn
              });
              
              return updatedIntern;
            } else {
              console.log('❌ No attendance record found for intern:', {
                name: intern.first_name + ' ' + intern.last_name,
                studentId: intern.student_id
              });
            }
            
            return intern;
          });
          
          console.log('📊 All updated interns after processing:', updatedInterns.map(i => ({
            name: i.first_name + ' ' + i.last_name,
            pmTimeOut: i.pmTimeOut,
            pmTimeIn: i.pmTimeIn,
            amTimeOut: i.amTimeOut,
            amTimeIn: i.amTimeIn
          })));
          
          // Check for completed work and update workCompletedInterns state
          const completedInternIds = new Set<string>();
          const requiredDailyHours = calculateRequiredDailyHours();
          
          updatedInterns.forEach(intern => {
            // Check if intern has worked the required daily hours
            const hasWorkedRequiredHours = intern.totalDailyHours && intern.totalDailyHours > 0 && intern.totalDailyHours >= requiredDailyHours;
            
            // Check for valid PM Time Out (not empty, '--:--', or '0h 0m')
            const hasValidPMTimeOut = intern.pmTimeOut && 
                                    intern.pmTimeOut !== '' && 
                                    intern.pmTimeOut !== '--:--' && 
                                    intern.pmTimeOut !== '0h 0m';
            
            // Check for valid AM Time Out (not empty or '--:--')
            const hasValidAMTimeOut = intern.amTimeOut && 
                                    intern.amTimeOut !== '' && 
                                    intern.amTimeOut !== '--:--';
            
            // Work is completed if they have worked required hours OR have completed any valid session
            const hasAnyValidSession = (intern.amTimeIn && hasValidAMTimeOut) || (intern.pmTimeIn && hasValidPMTimeOut);
            
            const isWorkCompleted = hasWorkedRequiredHours || hasAnyValidSession;
            
            console.log('🔍 Work completion check for intern:', intern.first_name, intern.last_name, {
              totalDailyHours: intern.totalDailyHours,
              requiredDailyHours: requiredDailyHours,
              hasWorkedRequiredHours,
              amTimeIn: intern.amTimeIn,
              amTimeOut: intern.amTimeOut,
              pmTimeIn: intern.pmTimeIn,
              pmTimeOut: intern.pmTimeOut,
              hasValidAMTimeOut,
              hasValidPMTimeOut,
              hasAnyValidSession,
              isWorkCompleted
            });
            
            if (isWorkCompleted) {
              completedInternIds.add(intern.id);
              console.log('🎉 Work completed for intern:', intern.first_name, intern.last_name, {
                totalDailyHours: intern.totalDailyHours,
                requiredDailyHours: requiredDailyHours,
                hasWorkedRequiredHours,
                hasAnyValidSession
              });
            }
          });
          
          if (completedInternIds.size > 0) {
            setWorkCompletedInterns(completedInternIds);
            console.log('🎉 Updated workCompletedInterns:', Array.from(completedInternIds));
          }
          
          return updatedInterns;
        });
        
        console.log('🔄 setInterns completed in loadTodayAttendance');
      } else {
        console.log('ℹ️ No attendance records found for today');
      }
    } catch (error) {
      console.error('Error loading today\'s attendance:', error);
    }
  };

  // Check what dates are available in the database
  const checkAvailableDates = async () => {
    if (!companyId) return;
    
    try {
      console.log('🔍 Checking available dates in database...');
      const response = await apiService.getAttendanceRecords(companyId, currentUser.id, {});
      
      if (response.success && response.data) {
        const dates = response.data.map((record: any) => record.attendance_date);
        const uniqueDates = [...new Set(dates)].sort();
        console.log('📅 Available dates in database:', uniqueDates);
      }
    } catch (error) {
      console.error('Error checking available dates:', error);
    }
  };

  // Load attendance for a specific date
  const loadAttendanceForDate = async (date: Date) => {
    if (!companyId) {
      console.log('⏳ Company ID not available yet, skipping attendance load');
      return;
    }
    
    if (interns.length === 0) {
      console.log('⏳ Interns not loaded yet, skipping attendance load');
      return;
    }
    
    // Set loading state immediately
    setDateFilterLoading(true);
    console.log('🔄 Starting date filter loading for:', date);
    
    try {
      // Convert date to YYYY-MM-DD format for database query
      const dateString = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      console.log('📅 Loading attendance for date:', dateString);
      console.log('📅 Date format check - Database expects YYYY-MM-DD, got:', dateString);
      
      const response = await apiService.getAttendanceRecords(companyId, currentUser.id, {
        startDate: dateString,
        endDate: dateString
      });
      
      console.log('📊 API Response for date filtering:', {
        dateString,
        responseSuccess: response.success,
        responseData: response.data,
        responseDataLength: response.data?.length || 0
      });
      
      if (response.success && response.data) {
        console.log('✅✅✅ Attendance loaded for date:', dateString, response.data);
        
        // Update interns with attendance data for the selected date
        console.log('🔄 Updating interns state with filtered data...');
        setInterns(prevInterns => {
          const updatedInterns = prevInterns.map(intern => {
            // Find matching attendance record
            const attendanceRecord = response.data.find((record: any) => {
              return record.user_id === parseInt(intern.student_id);
            });
            
            if (attendanceRecord) {
              console.log('📊 Updating intern with attendance data for date:', dateString, {
                internName: intern.first_name + ' ' + intern.last_name,
                studentId: intern.student_id,
                attendanceRecord: {
                  am_time_in: attendanceRecord.am_time_in,
                  am_time_out: attendanceRecord.am_time_out,
                  pm_time_in: attendanceRecord.pm_time_in,
                  pm_time_out: attendanceRecord.pm_time_out,
                  total_hours: attendanceRecord.total_hours,
                  status: attendanceRecord.status
                }
              });
              
              const updatedIntern = {
                ...intern,
                amTimeIn: attendanceRecord.am_time_in || '',
                amTimeOut: attendanceRecord.am_time_out || '',
                pmTimeIn: attendanceRecord.pm_time_in || '',
                pmTimeOut: attendanceRecord.pm_time_out || '',
                totalDailyHours: attendanceRecord.total_hours || 0,
                currentAttendanceStatus: attendanceRecord.status || 'not_marked'
              };
              
              return updatedIntern;
            } else {
              console.log('❌ No attendance record found for intern on date:', dateString, {
                name: intern.first_name + ' ' + intern.last_name,
                studentId: intern.student_id
              });
              
              // Reset attendance data for this date
              return {
                ...intern,
                amTimeIn: '',
                amTimeOut: '',
                pmTimeIn: '',
                pmTimeOut: '',
                totalDailyHours: 0,
                currentAttendanceStatus: 'not_marked'
              };
            }
          });
          
          console.log('✅ Interns state updated successfully');
          return updatedInterns;
        });
      } else {
        console.log('ℹ️ No attendance records found for date:', dateString);
        console.log('📊 Full API response when no data:', response);
        
        // Reset all attendance data for the selected date
        setInterns(prevInterns => {
          console.log('🔄 Resetting attendance data for all interns for date:', dateString);
          return prevInterns.map(intern => ({
            ...intern,
            amTimeIn: '',
            amTimeOut: '',
            pmTimeIn: '',
            pmTimeOut: '',
            totalDailyHours: 0,
            currentAttendanceStatus: 'not_marked'
          }));
        });
      }
    } catch (error) {
      console.error('Error loading attendance for date:', error);
    } finally {
      // Add a small delay to ensure UI updates are visible
      setTimeout(() => {
        setDateFilterLoading(false);
        console.log('✅ Date filter loading completed');
      }, 100);
    }
  };

  // Save working hours to backend
  const saveWorkingHours = async () => {
    if (!companyId) {
      Alert.alert('Error', 'Company information not loaded. Please try again.');
      return;
    }
    
    try {
      setWorkingHoursLoading(true);
      const response = await apiService.setWorkingHours(companyId, currentUser.id, workingHours);
      
      if (response.success) {
        setSuccessMessage('Working hours updated successfully!');
        setShowSuccessModal(true);
        setShowWorkingTimeModal(false);
        console.log('🕐 Working hours saved:', response.data);
        
        // Refresh attendance data to recalculate work completion status
        if (companyId) {
          loadTodayAttendance();
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to save working hours');
      }
    } catch (error) {
      console.error('Error saving working hours:', error);
      Alert.alert('Error', 'Failed to save working hours. Please try again.');
    } finally {
      setWorkingHoursLoading(false);
    }
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    filterInterns();
  }, [searchQuery, interns, sortConfig]);


  // Handle detail panel slide animations
  const openDetailPanel = (intern: Intern) => {
    console.log('🔥 DETAIL PANEL OPENING for intern:', intern.id, intern.first_name);
    setSelectedInternDetail(intern);
    setShowDetailPanel(true);
    Animated.timing(detailPanelSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDetailPanel = () => {
    Animated.timing(detailPanelSlideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowDetailPanel(false);
      setSelectedInternDetail(null);
    });
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      Animated.timing(searchAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        searchInputRef.current?.focus();
      });
    } else {
      Animated.timing(searchAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setSearchQuery('');
    }
  };

  const fetchInterns = async () => {
    try {
      setLoading(true);
      console.log('Fetching approved applications for company:', currentUser.id);
      
      const response = await apiService.getApprovedApplications(currentUser.id);
      
      if (response.success && response.applications) {
        console.log('Approved applications fetched:', response.applications);
        
        // Transform approved applications to intern format
        const transformedInterns: Intern[] = response.applications.map((app: any) => ({
          id: app.id.toString(),
          student_id: app.student_id.toString(),
          first_name: app.first_name || 'Unknown',
          last_name: app.last_name || 'Student',
          student_email: app.student_email || 'N/A',
          student_profile_picture: app.student_profile_picture,
          major: app.major || 'N/A',
          year: app.year || 'N/A',
          position: app.position || 'Intern',
          department: app.department || 'N/A',
          expected_start_date: app.expected_start_date,
          expected_end_date: app.expected_end_date,
          applied_at: app.applied_at,
          status: 'active' as const,
          // Location data
          student_latitude: app.student_latitude,
          student_longitude: app.student_longitude,
          // Student identification
          id_number: app.id_number || 'N/A',
          // Default values for display
          attendance: {
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
            sick: 0,
            totalDays: 0,
          },
          performance: {
            rating: 0,
            feedback: 'No feedback available yet',
            lastReview: 'N/A',
          },
          documents: {
            resume: !!app.resume_url,
            transcript: !!app.transcript_url,
            recommendationLetter: false,
            medicalClearance: false,
            insurance: false,
          },
          // New attendance fields
          totalHours: parseInt(app.hours_of_internship) || 0,
          currentAttendanceStatus: 'not_marked' as const,
          amTimeIn: '',
          amTimeOut: '',
          pmTimeIn: '',
          pmTimeOut: '',
          totalDailyHours: 0,
          remainingHours: parseInt(app.hours_of_internship) || 0,
          remainingDays: Math.ceil((parseInt(app.hours_of_internship) || 0) / 8), // Assuming 8 hours per day
        }));
        
        // Preserve existing attendance data when updating interns
        setInterns(prevInterns => {
          if (prevInterns.length === 0) {
            // First time loading, use transformed data
            return transformedInterns;
          } else {
            // Update existing interns with new data but preserve attendance info
            return transformedInterns.map(newIntern => {
              const existingIntern = prevInterns.find(prev => prev.student_id === newIntern.student_id);
              if (existingIntern) {
                // Preserve attendance data from existing intern
                return {
                  ...newIntern,
                  currentAttendanceStatus: existingIntern.currentAttendanceStatus,
                  amTimeIn: existingIntern.amTimeIn,
                  amTimeOut: existingIntern.amTimeOut,
                  pmTimeIn: existingIntern.pmTimeIn,
                  pmTimeOut: existingIntern.pmTimeOut,
                  totalDailyHours: existingIntern.totalDailyHours,
                  remainingHours: existingIntern.remainingHours,
                  remainingDays: existingIntern.remainingDays
                };
              }
              return newIntern;
            });
          }
        });
      } else {
        console.log('No approved applications found or error:', response);
        setInterns([]);
      }
    } catch (error) {
      console.error('Error fetching approved applications:', error);
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

  const filterInterns = () => {
    let filtered = interns;

    if (searchQuery) {
      filtered = filtered.filter(intern =>
        intern.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.id_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.position.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof Intern];
        let bValue = b[sortConfig.key as keyof Intern];
        
        // Handle undefined values
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredInterns(filtered);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAttendanceToggle = async (internId: string, status: 'present' | 'absent' | 'late' | 'leave' | 'sick') => {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Manila',
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const currentDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const currentHour = new Date().getHours();
    
    console.log('📊 Attendance action:', { internId, status, currentTime, currentDate });
    
    setInterns(prevInterns => 
      prevInterns.map(intern => {
        if (intern.id === internId) {
          // Determine if this is AM or PM session
          const isAMSession = currentHour < 12;
          
          // Calculate hours based on status
          let hoursToDeduct = 0;
          if (status === 'present' || status === 'late') {
            // For present/late, we'll calculate hours when they check out
            hoursToDeduct = 0;
          } else if (status === 'leave' || status === 'sick') {
            // For leave/sick, deduct 8 hours (full day)
            hoursToDeduct = 8;
          } else if (status === 'absent') {
            // For absent, deduct 8 hours (full day)
            hoursToDeduct = 8;
          }

          const newIntern = { 
            ...intern, 
            currentAttendanceStatus: status,
            // Set AM or PM time in based on current time
            amTimeIn: (status === 'present' || status === 'late') && isAMSession ? currentTime : intern.amTimeIn,
            pmTimeIn: (status === 'present' || status === 'late') && !isAMSession ? currentTime : intern.pmTimeIn,
            // Reset time out for new session
            amTimeOut: (status === 'present' || status === 'late') && isAMSession ? '' : intern.amTimeOut,
            pmTimeOut: (status === 'present' || status === 'late') && !isAMSession ? '' : intern.pmTimeOut,
            remainingHours: Math.max(0, (intern.remainingHours || intern.totalHours || 0) - hoursToDeduct),
            remainingDays: Math.ceil(Math.max(0, (intern.remainingHours || intern.totalHours || 0) - hoursToDeduct) / 8),
            attendance: {
              ...intern.attendance!,
              [status]: (intern.attendance?.[status] || 0) + 1,
              totalDays: (intern.attendance?.totalDays || 0) + 1,
            },
            dailyAttendance: {
              ...intern.dailyAttendance,
              [currentDate]: {
                status,
                amTimeIn: (status === 'present' || status === 'late') && isAMSession ? currentTime : intern.amTimeIn,
                amTimeOut: intern.amTimeOut,
                pmTimeIn: (status === 'present' || status === 'late') && !isAMSession ? currentTime : intern.pmTimeIn,
                pmTimeOut: intern.pmTimeOut,
                totalHours: hoursToDeduct
              }
            }
          };
          
          return newIntern;
        }
        return intern;
      })
    );

    // Save to backend
    try {
      if (companyId) {
        // Get the current intern data before the update
        const currentIntern = interns.find(i => i.id === internId);
        if (currentIntern) {
          // Determine if this is AM or PM session
          const isAMSession = currentHour < 12;
          
          // Calculate the correct time in values based on the action
          const amTimeIn = (status === 'present' || status === 'late') && isAMSession ? currentTime : currentIntern.amTimeIn;
          const pmTimeIn = (status === 'present' || status === 'late') && !isAMSession ? currentTime : currentIntern.pmTimeIn;
          
          const attendanceData = {
            internId: currentIntern.student_id, // Use student_id for backend
            attendanceDate: currentDate,
            status: status as 'present' | 'absent' | 'late' | 'leave' | 'sick',
            amTimeIn: amTimeIn || undefined,
            amTimeOut: currentIntern.amTimeOut || undefined,
            pmTimeIn: pmTimeIn || undefined,
            pmTimeOut: currentIntern.pmTimeOut || undefined,
            totalHours: currentIntern.totalDailyHours || 0,
            notes: undefined
          };

          console.log('📊 Saving attendance record:', attendanceData);
          
          const response = await apiService.saveAttendanceRecord(companyId, currentUser.id, attendanceData);
          
          if (response.success) {
            console.log('📊 Attendance record saved successfully');
            
            // Refresh data to ensure UI shows latest backend data
            setTimeout(async () => {
              if (companyId) {
                console.log('🔄 Refreshing data after successful attendance save');
                await loadTodayAttendance();
              }
            }, 100);
          } else {
            console.error('📊 Failed to save attendance record:', response.message);
          }
        }
      } else {
        console.log('📊 Company ID not available, skipping backend save');
      }
    } catch (error) {
      console.error('📊 Error saving attendance record:', error);
    }

    // Show success feedback
    const statusMessages = {
      present: 'Marked as Present',
      late: 'Marked as Late',
      absent: 'Marked as Absent',
      leave: 'Marked as Leave',
      sick: 'Marked as Sick'
    };
    
    setSuccessMessage(`${statusMessages[status]} at ${currentTime}`);
    setShowSuccessModal(true);
  };

  const handleTimeOut = async (internId: string) => {
    console.log('🕐 Time Out button clicked for intern:', internId);
    
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Manila',
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    console.log('🕐 Current time:', currentTime);
    console.log('🕐 Interns before update:', interns.find(i => i.id === internId));
    
    setInterns(prevInterns => 
      prevInterns.map(intern => {
        if (intern.id === internId) {
          console.log('🕐 Processing time out for intern:', intern.first_name, intern.last_name);
          // Determine which session to update - allow time out anytime if there's a time in
          const hasAMTimeIn = intern.amTimeIn && (!intern.amTimeOut || intern.amTimeOut === '');
          const hasPMTimeIn = intern.pmTimeIn && (!intern.pmTimeOut || intern.pmTimeOut === '');
          
          // If there's any time in, allow time out (regardless of working hours)
          const canTimeOut = intern.amTimeIn || intern.pmTimeIn;
          
          console.log('🕐 AM Time In:', intern.amTimeIn, 'AM Time Out:', intern.amTimeOut, 'Has AM Time In:', hasAMTimeIn);
          console.log('🕐 PM Time In:', intern.pmTimeIn, 'PM Time Out:', intern.pmTimeOut, 'Has PM Time In:', hasPMTimeIn);
          console.log('🕐 Can Time Out:', canTimeOut);
          
          if (canTimeOut) {
            console.log('🕐 Processing time out for session');
          // Parse 12-hour format times
          const parseTime = (timeStr: string) => {
            const [time, period] = timeStr.split(' ');
            const [hours, minutes] = time.split(':').map(Number);
            let hour24 = hours;
            if (period === 'PM' && hours !== 12) hour24 += 12;
            if (period === 'AM' && hours === 12) hour24 = 0;
            return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
          };
          
            let sessionHours = 0;
            let updateAM = false;
            let updatePM = false;
            
            // Determine which session to update
            if (hasAMTimeIn) {
              updateAM = true;
              const timeInDate = parseTime(intern.amTimeIn!);
              const timeOutDate = parseTime(currentTime);
              sessionHours = Math.max(0, (timeOutDate.getTime() - timeInDate.getTime()) / (1000 * 60 * 60));
            } else if (hasPMTimeIn) {
              updatePM = true;
              const timeInDate = parseTime(intern.pmTimeIn!);
              const timeOutDate = parseTime(currentTime);
              sessionHours = Math.max(0, (timeOutDate.getTime() - timeInDate.getTime()) / (1000 * 60 * 60));
            } else if (intern.pmTimeIn) {
              // If PM time in exists but PM time out also exists, update PM time out anyway
              updatePM = true;
              const timeInDate = parseTime(intern.pmTimeIn!);
              const timeOutDate = parseTime(currentTime);
              sessionHours = Math.max(0, (timeOutDate.getTime() - timeInDate.getTime()) / (1000 * 60 * 60));
            } else if (intern.amTimeIn) {
              // If AM time in exists but AM time out also exists, update AM time out anyway
              updateAM = true;
              const timeInDate = parseTime(intern.amTimeIn!);
              const timeOutDate = parseTime(currentTime);
              sessionHours = Math.max(0, (timeOutDate.getTime() - timeInDate.getTime()) / (1000 * 60 * 60));
            }
            
            // Calculate new total daily hours
            const newTotalDailyHours = (intern.totalDailyHours || 0) + sessionHours;
            const newRemainingHours = Math.max(0, (intern.remainingHours || intern.totalHours || 0) - sessionHours);
            const newRemainingDays = Math.ceil(newRemainingHours / 8);
            
            // Check if both sessions are completed
            const amCompleted = intern.amTimeIn && (updateAM ? currentTime : intern.amTimeOut);
            const pmCompleted = intern.pmTimeIn && (updatePM ? currentTime : intern.pmTimeOut);
            const bothSessionsCompleted = amCompleted && pmCompleted;
            
          const newIntern = {
            ...intern,
              // Update the appropriate time out
              amTimeOut: updateAM ? currentTime : intern.amTimeOut,
              pmTimeOut: updatePM ? currentTime : intern.pmTimeOut,
              // Calculate total daily hours
              totalDailyHours: newTotalDailyHours,
              remainingHours: newRemainingHours,
              remainingDays: newRemainingDays,
              // Update status based on completion
              currentAttendanceStatus: bothSessionsCompleted ? 
                (intern.currentAttendanceStatus === 'late' ? 'late' : 'present') : 
                intern.currentAttendanceStatus
            };
          
            console.log('🕐 Updated intern:', {
              name: newIntern.first_name + ' ' + newIntern.last_name,
              updateAM: updateAM,
              updatePM: updatePM,
              amTimeOut: newIntern.amTimeOut,
              pmTimeOut: newIntern.pmTimeOut,
              totalDailyHours: newIntern.totalDailyHours,
              remainingHours: newIntern.remainingHours
            });
            
          return newIntern;
        }
        }
        return intern;
      })
    );

    // Save to backend - use the calculated values from the state update
    try {
      console.log('🔄 Starting backend save process...');
      console.log('  - Company ID available:', !!companyId);
      console.log('  - Current User ID:', currentUser.id);
      
      if (companyId) {
        // Find the current intern to get basic info
        const currentIntern = interns.find(i => i.id === internId);
        if (currentIntern) {
          // Use the same logic as in the state update to determine what to save
          const hasAMTimeIn = currentIntern.amTimeIn && (!currentIntern.amTimeOut || currentIntern.amTimeOut === '');
          const hasPMTimeIn = currentIntern.pmTimeIn && (!currentIntern.pmTimeOut || currentIntern.pmTimeOut === '');
          
          let updateAM = false;
          let updatePM = false;
          
          if (hasAMTimeIn) {
            updateAM = true;
          } else if (hasPMTimeIn) {
            updatePM = true;
          } else if (currentIntern.pmTimeIn) {
            updatePM = true;
          } else if (currentIntern.amTimeIn) {
            updateAM = true;
          }
          
          // Calculate the updated values that should be saved
          const updatedAmTimeOut = updateAM ? currentTime : currentIntern.amTimeOut;
          const updatedPmTimeOut = updatePM ? currentTime : currentIntern.pmTimeOut;
          
          // Calculate total hours for backend save
          const parseTime = (timeStr: string) => {
            console.log('🕐 Parsing time:', timeStr);
            const [time, period] = timeStr.split(' ');
            const [hours, minutes] = time.split(':').map(Number);
            let hour24 = hours;
            if (period === 'PM' && hours !== 12) hour24 += 12;
            if (period === 'AM' && hours === 12) hour24 = 0;
            
            const dateString = `2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
            console.log('🕐 Created date string:', dateString);
            
            const date = new Date(dateString);
            console.log('🕐 Created date object:', date, 'Valid:', !isNaN(date.getTime()));
            
            if (isNaN(date.getTime())) {
              console.error('❌ Invalid date created from:', timeStr, '->', dateString);
              throw new Error(`Invalid time format: ${timeStr}`);
            }
            
            return date;
          };
          
          let totalHours = 0;
          
          // Calculate AM session hours
          if (currentIntern.amTimeIn && updatedAmTimeOut) {
            const amTimeInDate = parseTime(currentIntern.amTimeIn);
            const amTimeOutDate = parseTime(updatedAmTimeOut);
            const amHours = Math.max(0, (amTimeOutDate.getTime() - amTimeInDate.getTime()) / (1000 * 60 * 60));
            totalHours += amHours;
            
            console.log('🕐 AM session calculation:', {
              amTimeIn: currentIntern.amTimeIn,
              amTimeOut: updatedAmTimeOut,
              amTimeInDate: isNaN(amTimeInDate.getTime()) ? 'Invalid Date' : amTimeInDate.toISOString(),
              amTimeOutDate: isNaN(amTimeOutDate.getTime()) ? 'Invalid Date' : amTimeOutDate.toISOString(),
              timeDiffMs: amTimeOutDate.getTime() - amTimeInDate.getTime(),
              amHours: amHours,
              totalHours: totalHours
            });
          }
          
          // Calculate PM session hours
          if (currentIntern.pmTimeIn && updatedPmTimeOut) {
            const pmTimeInDate = parseTime(currentIntern.pmTimeIn);
            const pmTimeOutDate = parseTime(updatedPmTimeOut);
            const pmHours = Math.max(0, (pmTimeOutDate.getTime() - pmTimeInDate.getTime()) / (1000 * 60 * 60));
            totalHours += pmHours;
            
            console.log('🕐 PM session calculation:', {
              pmTimeIn: currentIntern.pmTimeIn,
              pmTimeOut: updatedPmTimeOut,
              pmTimeInDate: isNaN(pmTimeInDate.getTime()) ? 'Invalid Date' : pmTimeInDate.toISOString(),
              pmTimeOutDate: isNaN(pmTimeOutDate.getTime()) ? 'Invalid Date' : pmTimeOutDate.toISOString(),
              timeDiffMs: pmTimeOutDate.getTime() - pmTimeInDate.getTime(),
              pmHours: pmHours,
              totalHours: totalHours
            });
          }
          
          console.log('🕐 Time out calculation for backend save:', {
            updateAM,
            updatePM,
            currentTime,
            currentInternAmTimeOut: currentIntern.amTimeOut,
            currentInternPmTimeOut: currentIntern.pmTimeOut,
            updatedAmTimeOut,
            updatedPmTimeOut,
            totalHours,
            totalHoursType: typeof totalHours,
            totalHoursIsNaN: isNaN(totalHours)
          });
          
          const currentDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
          console.log('📅 Date calculation for attendance:', {
            currentDate: currentDate,
            currentTime: new Date().toISOString(),
            manilaTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
          });
          
          const attendanceData = {
            internId: currentIntern.student_id, // Use student_id for backend
            attendanceDate: currentDate,
            status: (currentIntern.currentAttendanceStatus === 'not_marked' ? 'present' : currentIntern.currentAttendanceStatus) as 'present' | 'absent' | 'late' | 'leave' | 'sick',
            amTimeIn: currentIntern.amTimeIn || undefined,
            amTimeOut: updatedAmTimeOut || undefined,
            pmTimeIn: currentIntern.pmTimeIn || undefined,
            pmTimeOut: updatedPmTimeOut || undefined,
            totalHours: totalHours,
            notes: undefined
          };

          console.log('📊 Saving time out record:', attendanceData);
          
          try {
            console.log('📊 Making API call to save attendance record...');
            const response = await apiService.saveAttendanceRecord(companyId, currentUser.id, attendanceData);
            console.log('📊 API Response received:', response);
            console.log('📊 Response type:', typeof response);
            console.log('📊 Response keys:', response ? Object.keys(response) : 'No response object');
            
            if (response && response.success) {
              console.log('✅ Time out record saved successfully');
              console.log('🔄 Setting success modal state...');
              setSuccessMessage('Time out recorded successfully!');
              setShowSuccessModal(true);
              console.log('✅ Success modal state set - showSuccessModal should be true');
              
              // Refresh data to ensure UI shows latest backend data
              setTimeout(async () => {
                if (companyId) {
                  console.log('🔄 Refreshing data after successful time out save');
                  await loadTodayAttendance();
                }
              }, 100);
            } else {
              console.error('❌ Failed to save time out record:', {
                response: response,
                message: response?.message || 'Unknown error',
                success: response?.success
              });
              setSuccessMessage('Failed to save time out record. Please try again.');
              setShowSuccessModal(true);
            }
          } catch (apiError) {
            console.error('❌ API call failed:', apiError);
            setSuccessMessage('Network error. Please check your connection and try again.');
            setShowSuccessModal(true);
          }
        }
      } else {
        console.log('📊 Company ID not available, skipping backend save');
      }
    } catch (error) {
      console.error('📊 Error saving time out record:', error);
    }
    
    // Check if work is completed for the day and show action buttons again
    setTimeout(() => {
      const updatedIntern = interns.find(i => i.id === internId);
      console.log('🕐 Interns after update:', updatedIntern);
      
      if (updatedIntern) {
        // Check if intern has worked the required daily hours
        const requiredDailyHours = calculateRequiredDailyHours();
        const hasWorkedRequiredHours = updatedIntern.totalDailyHours && updatedIntern.totalDailyHours > 0 && updatedIntern.totalDailyHours >= requiredDailyHours;
        
        // Check for valid PM Time Out (not empty, '--:--', or '0h 0m')
        const hasValidPMTimeOut = updatedIntern.pmTimeOut && 
                                updatedIntern.pmTimeOut !== '' && 
                                updatedIntern.pmTimeOut !== '--:--' && 
                                updatedIntern.pmTimeOut !== '0h 0m';
        
        // Check for valid AM Time Out (not empty or '--:--')
        const hasValidAMTimeOut = updatedIntern.amTimeOut && 
                                updatedIntern.amTimeOut !== '' && 
                                updatedIntern.amTimeOut !== '--:--';
        
        // Work is completed if they have worked required hours OR have completed any valid session
        const hasAnyValidSession = (updatedIntern.amTimeIn && hasValidAMTimeOut) || (updatedIntern.pmTimeIn && hasValidPMTimeOut);
        
        const isWorkCompleted = hasWorkedRequiredHours || hasAnyValidSession;
        
        console.log('🔍 Time out work completion check for intern:', updatedIntern.first_name, updatedIntern.last_name, {
          totalDailyHours: updatedIntern.totalDailyHours,
          requiredDailyHours: requiredDailyHours,
          hasWorkedRequiredHours,
          amTimeIn: updatedIntern.amTimeIn,
          amTimeOut: updatedIntern.amTimeOut,
          pmTimeIn: updatedIntern.pmTimeIn,
          pmTimeOut: updatedIntern.pmTimeOut,
          hasValidAMTimeOut,
          hasValidPMTimeOut,
          hasAnyValidSession,
          isWorkCompleted
        });
        
        if (isWorkCompleted) {
          // Mark work as completed for this intern
          setWorkCompletedInterns(prev => new Set([...prev, internId]));
          
          // Show completion alert
          setSuccessMessage(`Today's work is done for ${updatedIntern.first_name} ${updatedIntern.last_name}! 🎉`);
          setShowSuccessModal(true);
          
          console.log('🎉 Work completed for intern:', updatedIntern.first_name, updatedIntern.last_name, {
            totalDailyHours: updatedIntern.totalDailyHours,
            requiredDailyHours: requiredDailyHours,
            hasWorkedRequiredHours,
            hasAnyValidSession
          });
        } else {
          // Work not completed yet, show action buttons again
          setWorkCompletedInterns(prev => {
            const newSet = new Set(prev);
            newSet.delete(internId);
            return newSet;
          });
          console.log('⏰ Work not completed yet, action buttons should be visible');
        }
      }
    }, 100);
  };


  const getButtonAnimation = (internId: string, buttonType: string) => {
    const key = `${internId}_${buttonType}`;
    if (!buttonAnimations[key]) {
      setButtonAnimations(prev => ({
        ...prev,
        [key]: new Animated.Value(1)
      }));
      return new Animated.Value(1);
    }
    return buttonAnimations[key];
  };

  const handleButtonPressIn = (internId: string, buttonType: string) => {
    const animation = getButtonAnimation(internId, buttonType);
    Animated.spring(animation, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = (internId: string, buttonType: string) => {
    const animation = getButtonAnimation(internId, buttonType);
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = (time: string, period: string) => {
    const [hour, minute] = time.split(':').map(Number);
    let hour24 = hour;
    
    if (period === 'AM' && hour === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    }
    
    return hour24 * 60 + minute;
  };

  // Calculate required daily hours based on working hours
  const calculateRequiredDailyHours = () => {
    const startMinutes = convertTo24Hour(workingHours.startTime, workingHours.startPeriod);
    const endMinutes = convertTo24Hour(workingHours.endTime, workingHours.endPeriod);
    const breakStartMinutes = convertTo24Hour(workingHours.breakStart, workingHours.breakStartPeriod);
    const breakEndMinutes = convertTo24Hour(workingHours.breakEnd, workingHours.breakEndPeriod);
    
    // Calculate total working minutes
    const totalWorkingMinutes = endMinutes - startMinutes;
    
    // Calculate break minutes
    const breakMinutes = breakEndMinutes - breakStartMinutes;
    
    // Calculate actual working minutes (total - break)
    const actualWorkingMinutes = totalWorkingMinutes - breakMinutes;
    
    // Convert to hours
    return actualWorkingMinutes / 60;
  };

  // Check if current time is within working hours
  const isWithinWorkingHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Convert working hours to 24-hour format
    const startMinutes = convertTo24Hour(workingHours.startTime, workingHours.startPeriod);
    const endMinutes = convertTo24Hour(workingHours.endTime, workingHours.endPeriod);
    const breakStartMinutes = convertTo24Hour(workingHours.breakStart, workingHours.breakStartPeriod);
    const breakEndMinutes = convertTo24Hour(workingHours.breakEnd, workingHours.breakEndPeriod);
    
    const currentMinutes = currentHour * 60 + currentMinute;
    
    // Check if within working hours but not during break time
    const isWorkingTime = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    const isBreakTime = currentMinutes >= breakStartMinutes && currentMinutes <= breakEndMinutes;
    
    return isWorkingTime && !isBreakTime;
  };

  const isButtonDisabled = (intern: Intern, buttonType: 'present' | 'absent' | 'late' | 'leave') => {
    const currentStatus = intern.currentAttendanceStatus;
    
    // Check if outside working hours
    if (!isWithinWorkingHours()) {
      return true; // Disable all buttons outside working hours
    }
    
    // If intern is present or late and has time in but no time out, disable attendance buttons
    if ((currentStatus === 'present' || currentStatus === 'late')) {
      const hasAMTimeIn = intern.amTimeIn && !intern.amTimeOut;
      const hasPMTimeIn = intern.pmTimeIn && !intern.pmTimeOut;
      
      if (hasAMTimeIn || hasPMTimeIn) {
      return true; // All attendance buttons disabled until time out
      }
    }
    
    // If intern is absent, leave, or sick, disable all buttons (no time out needed)
    if (currentStatus === 'absent' || currentStatus === 'leave' || currentStatus === 'sick') {
      return true;
    }
    
    // If no status is set, enable all buttons
    return false;
  };

  const handleDisabledButtonPress = (intern: Intern, buttonType: 'present' | 'absent' | 'late' | 'leave') => {
    const currentStatus = intern.currentAttendanceStatus;
    let reason = '';
    
    // Check if outside working hours
    if (!isWithinWorkingHours()) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeString = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Check if it's break time
      const startMinutes = convertTo24Hour(workingHours.startTime, workingHours.startPeriod);
      const endMinutes = convertTo24Hour(workingHours.endTime, workingHours.endPeriod);
      const breakStartMinutes = convertTo24Hour(workingHours.breakStart, workingHours.breakStartPeriod);
      const breakEndMinutes = convertTo24Hour(workingHours.breakEnd, workingHours.breakEndPeriod);
      const currentMinutes = currentHour * 60 + currentMinute;
      
      const isBreakTime = currentMinutes >= breakStartMinutes && currentMinutes <= breakEndMinutes;
      const isBeforeWork = currentMinutes < startMinutes;
      const isAfterWork = currentMinutes > endMinutes;
      
      if (isBreakTime) {
        reason = `Attendance is disabled during break time (${workingHours.breakStart} ${workingHours.breakStartPeriod} - ${workingHours.breakEnd} ${workingHours.breakEndPeriod}).\n\nCurrent time: ${currentTimeString}`;
      } else if (isBeforeWork) {
        reason = `Attendance is disabled before working hours.\n\nWorking hours: ${workingHours.startTime} ${workingHours.startPeriod} - ${workingHours.endTime} ${workingHours.endPeriod}\nCurrent time: ${currentTimeString}`;
      } else if (isAfterWork) {
        reason = `Attendance is disabled after working hours.\n\nWorking hours: ${workingHours.startTime} ${workingHours.startPeriod} - ${workingHours.endTime} ${workingHours.endPeriod}\nCurrent time: ${currentTimeString}`;
      } else {
        reason = `Attendance is disabled outside working hours.\n\nWorking hours: ${workingHours.startTime} ${workingHours.startPeriod} - ${workingHours.endTime} ${workingHours.endPeriod}\nCurrent time: ${currentTimeString}`;
      }
    } else if ((currentStatus === 'present' || currentStatus === 'late')) {
      const hasAMTimeIn = intern.amTimeIn && !intern.amTimeOut;
      const hasPMTimeIn = intern.pmTimeIn && !intern.pmTimeOut;
      
      if (hasAMTimeIn || hasPMTimeIn) {
        reason = `${intern.first_name} ${intern.last_name} is already clocked in. Please clock out first before changing attendance status.`;
      }
    } else if (currentStatus === 'absent' || currentStatus === 'leave' || currentStatus === 'sick') {
      reason = `${intern.first_name} ${intern.last_name} is marked as ${currentStatus}. Cannot change attendance status.`;
    }
    
    setDisabledReason(reason);
    setShowDisabledAlert(true);
  };

  const getFilteredAttendanceRecords = () => {
    const allRecords: any[] = [];
    const selectedDateString = selectedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    
    Object.entries(attendanceRecords).forEach(([key, records]) => {
      const [internId, date] = key.split('_');
      if (date === selectedDateString) {
        records.forEach(record => {
          const intern = interns.find(i => i.id === internId);
          allRecords.push({
            ...record,
            internName: intern ? `${intern.first_name} ${intern.last_name}` : 'Unknown',
            internId
          });
        });
      }
    });
    
    return allRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getFilteredInternsByDate = () => {
    const selectedDateString = selectedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    
    return filteredInterns.map(intern => {
      const dailyRecord = intern.dailyAttendance?.[selectedDateString];
      if (dailyRecord) {
        return {
          ...intern,
          currentAttendanceStatus: dailyRecord.status,
          amTimeIn: dailyRecord.amTimeIn || '',
          amTimeOut: dailyRecord.amTimeOut || '',
          pmTimeIn: dailyRecord.pmTimeIn || '',
          pmTimeOut: dailyRecord.pmTimeOut || '',
          totalDailyHours: dailyRecord.totalHours || 0
        };
      }
      return intern;
    });
  };

  const getTotalHoursForDate = (date: Date) => {
    let totalHours = 0;
    const dateString = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    Object.entries(attendanceRecords).forEach(([key, records]) => {
      const [, recordDate] = key.split('_');
      if (recordDate === dateString) {
        records.forEach(record => {
          totalHours += record.hours || 0;
        });
      }
    });
    return totalHours;
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading attendance data...</Text>
      </View>
    );
  }

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, { flex: 0.6 }]}>
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>#</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.headerCell, { flex: 2.2 }]} 
        onPress={() => handleSort('first_name')}
      >
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>Intern Name</Text>
        <MaterialIcons 
          name={sortConfig?.key === 'first_name' ? 
            (sortConfig.direction === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down') : 
            'unfold-more'
          } 
          size={isDesktop ? 20 : 16} 
          color="#fff" 
        />
      </TouchableOpacity>
      
      <View style={[styles.headerCell, { flex: 1.1 }]}>
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>AM Time In</Text>
      </View>
      
      <View style={[styles.headerCell, { flex: 1.1 }]}>
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>AM Time Out</Text>
      </View>
      
      <View style={[styles.headerCell, { flex: 1.1 }]}>
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>PM Time In</Text>
      </View>
      
      <View style={[styles.headerCell, { flex: 1.1 }]}>
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>PM Time Out</Text>
      </View>
      
      <View style={[styles.headerCell, { flex: 1.1 }]}>
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>Total Hours</Text>
      </View>
      
      <View style={[styles.headerCell, { flex: 1.1 }]}>
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>Remaining Hours</Text>
      </View>
      
      <View style={[styles.headerCell, { flex: 1.2 }]}>
        <Text style={[styles.headerText, isDesktop && styles.desktopHeaderText]}>Actions</Text>
      </View>
    </View>
  );


  const renderMobileCard = (intern: Intern, index: number) => {
    const hasAMTimeIn = intern.amTimeIn && (!intern.amTimeOut || intern.amTimeOut === '');
    const hasPMTimeIn = intern.pmTimeIn && (!intern.pmTimeOut || intern.pmTimeOut === '');
    const hasAnyTimeIn = intern.amTimeIn || intern.pmTimeIn;
    const isFullyCompleted = intern.amTimeIn && intern.amTimeOut && intern.pmTimeIn && intern.pmTimeOut && 
      intern.amTimeOut !== '' && intern.pmTimeOut !== '';
    
    console.log('🔍 Button visibility check for intern:', {
      name: intern.first_name + ' ' + intern.last_name,
      hasAnyTimeIn,
      isFullyCompleted,
      workCompleted: workCompletedInterns.has(intern.id),
      amTimeIn: intern.amTimeIn,
      amTimeOut: intern.amTimeOut,
      pmTimeIn: intern.pmTimeIn,
      pmTimeOut: intern.pmTimeOut,
      shouldShowButtons: !hasAnyTimeIn && !isFullyCompleted && !workCompletedInterns.has(intern.id)
    });
    
    // Calculate total hours for the day
    const calculateTotalHours = () => {
      console.log('🔢 calculateTotalHours for intern:', {
        name: intern.first_name + ' ' + intern.last_name,
        totalDailyHours: intern.totalDailyHours,
        amTimeIn: intern.amTimeIn,
        amTimeOut: intern.amTimeOut,
        pmTimeIn: intern.pmTimeIn,
        pmTimeOut: intern.pmTimeOut
      });
      
      // Use the totalDailyHours from the database if available, otherwise calculate from times
      if (intern.totalDailyHours !== undefined && intern.totalDailyHours !== null && !isNaN(intern.totalDailyHours)) {
        console.log('🔢 Using totalDailyHours from database:', intern.totalDailyHours);
        return intern.totalDailyHours;
      }
      
      // Fallback calculation if totalDailyHours is not available
      let total = 0;
      if (intern.amTimeIn && intern.amTimeOut && intern.amTimeIn !== '--:--' && intern.amTimeOut !== '--:--') {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const amIn = parseTime(intern.amTimeIn);
        const amOut = parseTime(intern.amTimeOut);
        total += Math.max(0, (amOut.getTime() - amIn.getTime()) / (1000 * 60 * 60));
        } catch (error) {
          console.warn('Error parsing AM times:', error);
      }
      }
      
      if (intern.pmTimeIn && intern.pmTimeOut && intern.pmTimeIn !== '--:--' && intern.pmTimeOut !== '--:--') {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const pmIn = parseTime(intern.pmTimeIn);
        const pmOut = parseTime(intern.pmTimeOut);
        total += Math.max(0, (pmOut.getTime() - pmIn.getTime()) / (1000 * 60 * 60));
        } catch (error) {
          console.warn('Error parsing PM times:', error);
      }
      }
      
      return total;
    };

    const totalHours = calculateTotalHours();
    const formatHours = (hours: number) => {
      console.log('🔢 formatHours called with:', { hours, type: typeof hours, isNaN: isNaN(hours) });
      
      if (isNaN(hours) || hours === null || hours === undefined) {
        return '0h 0m';
      }
      
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${h}h ${m}m`;
    };

    return (
      <View style={styles.mobileCardContent}>
        {/* Header with Profile and Status */}
        <View style={styles.mobileCardHeader}>
          <View style={styles.mobileProfileSection}>
            <View style={styles.mobileProfileContainer}>
              {intern.student_profile_picture ? (
                <Image 
                  source={{ uri: intern.student_profile_picture }} 
                  style={styles.mobileProfileImage}
                />
              ) : (
                <View style={styles.mobileProfilePlaceholder}>
                  <Text style={styles.mobileProfileText}>
                    {intern.first_name.charAt(0)}{intern.last_name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.mobileProfileInfo}>
              <Text style={styles.mobileInternName}>
                {intern.first_name} {intern.last_name}
              </Text>
              <Text style={styles.mobileInternId}>Intern #{index + 1}</Text>
            </View>
          </View>
        </View>
        
        {/* Time Ranges - Modern Mobile Layout */}
        <View style={styles.mobileTimeSection}>
          <View style={styles.mobileTimeItem}>
            <View style={styles.mobileTimeIconContainer}>
              <MaterialIcons name="schedule" size={16} color="#1E3A5F" />
            </View>
            <View style={styles.mobileTimeContent}>
              <Text style={styles.mobileTimeLabel}>AM Shift</Text>
              <Text style={styles.mobileTimeValue}>
                {intern.amTimeIn && intern.amTimeOut 
                  ? `${intern.amTimeIn.split(' ')[0]} → ${intern.amTimeOut.split(' ')[0]}`
                  : '--:-- → --:--'
                }
              </Text>
            </View>
          </View>
          <View style={styles.mobileTimeItem}>
            <View style={styles.mobileTimeIconContainer}>
              <MaterialIcons name="schedule" size={16} color="#1E3A5F" />
            </View>
            <View style={styles.mobileTimeContent}>
              <Text style={styles.mobileTimeLabel}>PM Shift</Text>
              <Text style={styles.mobileTimeValue}>
                {intern.pmTimeIn && intern.pmTimeOut 
                  ? `${intern.pmTimeIn.split(' ')[0]} → ${intern.pmTimeOut.split(' ')[0]}`
                  : '--:-- → --:--'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Hours Summary - Modern Cards */}
        <View style={styles.mobileHoursSection}>
          <View style={styles.mobileHoursCard}>
            <Text style={styles.mobileHoursLabel}>Total Hours</Text>
            <Text style={styles.mobileHoursValue}>{formatHours(totalHours)}</Text>
          </View>
          <View style={styles.mobileHoursCard}>
            <Text style={styles.mobileHoursLabel}>Remaining Hours</Text>
            <Text style={styles.mobileRemainingValue}>{formatHours(intern.remainingHours || 0)}</Text>
          </View>
        </View>
      
      
        {/* Action Buttons - Modern Mobile Layout */}
        {!hasAnyTimeIn && !isFullyCompleted && !workCompletedInterns.has(intern.id) && (
          <View style={styles.mobileActionsSection}>
            <View style={styles.mobileButtonsGrid}>
              <TouchableOpacity
                style={[
                  styles.mobileActionButton, 
                  styles.presentActionButton,
                  isButtonDisabled(intern, 'present') && styles.disabledButton
                ]}
                onPress={() => {
                  if (isButtonDisabled(intern, 'present')) {
                    handleDisabledButtonPress(intern, 'present');
                  } else {
                    handleAttendanceToggle(intern.id, 'present');
                  }
                }}
              >
                <MaterialIcons name="check" size={14} color="#fff" />
                <Text style={styles.presentButtonText}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mobileActionButton, 
                  styles.lateActionButton,
                  isButtonDisabled(intern, 'late') && styles.disabledButton
                ]}
                onPress={() => {
                  if (isButtonDisabled(intern, 'late')) {
                    handleDisabledButtonPress(intern, 'late');
                  } else {
                    handleAttendanceToggle(intern.id, 'late');
                  }
                }}
              >
                <MaterialIcons name="schedule" size={14} color="#fff" />
                <Text style={styles.lateButtonText}>Late</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mobileActionButton, 
                  styles.absentActionButton,
                  isButtonDisabled(intern, 'absent') && styles.disabledButton
                ]}
                onPress={() => {
                  if (isButtonDisabled(intern, 'absent')) {
                    handleDisabledButtonPress(intern, 'absent');
                  } else {
                    handleAttendanceToggle(intern.id, 'absent');
                  }
                }}
              >
                <MaterialIcons name="close" size={14} color="#fff" />
                <Text style={styles.absentButtonText}>Absent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mobileActionButton, 
                  styles.leaveActionButton,
                  isButtonDisabled(intern, 'leave') && styles.disabledButton
                ]}
                onPress={() => {
                  if (isButtonDisabled(intern, 'leave')) {
                    handleDisabledButtonPress(intern, 'leave');
                  } else {
                    handleAttendanceToggle(intern.id, 'leave');
                  }
                }}
              >
                <MaterialIcons name="event-busy" size={14} color="#fff" />
                <Text style={styles.leaveButtonText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Detail Arrow Button */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.detailArrowButton}
            onPress={() => openDetailPanel(intern)}
          >
            <MaterialIcons name="arrow-back" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Time Out Button - Show if there's a time in but no time out and work not completed */}
        {hasAnyTimeIn && !workCompletedInterns.has(intern.id) && (
          <View style={styles.mobileActionsSection}>
            <TouchableOpacity
              style={[styles.mobileActionButton, styles.timeOutActionButton]}
              onPress={() => handleTimeOut(intern.id)}
            >
              <MaterialIcons name="logout" size={14} color="#fff" />
              <Text style={styles.timeOutButtonText}>Time Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Work Completed Message - Show if work is completed */}
        {workCompletedInterns.has(intern.id) && (
          <View style={styles.mobileActionsSection}>
            <View style={styles.workCompletedCard}>
              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.workCompletedTextSmall}>Work Done! 🎉</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderTabletCard = (intern: Intern, index: number) => {
    const hasAMTimeIn = intern.amTimeIn && (!intern.amTimeOut || intern.amTimeOut === '');
    const hasPMTimeIn = intern.pmTimeIn && (!intern.pmTimeOut || intern.pmTimeOut === '');
    const hasAnyTimeIn = intern.amTimeIn || intern.pmTimeIn;
    const isFullyCompleted = intern.amTimeIn && intern.amTimeOut && intern.pmTimeIn && intern.pmTimeOut && 
      intern.amTimeOut !== '' && intern.pmTimeOut !== '';
    
    console.log('🔍 Button visibility check for intern:', {
      name: intern.first_name + ' ' + intern.last_name,
      hasAnyTimeIn,
      isFullyCompleted,
      workCompleted: workCompletedInterns.has(intern.id),
      amTimeIn: intern.amTimeIn,
      amTimeOut: intern.amTimeOut,
      pmTimeIn: intern.pmTimeIn,
      pmTimeOut: intern.pmTimeOut,
      shouldShowButtons: !hasAnyTimeIn && !isFullyCompleted && !workCompletedInterns.has(intern.id)
    });
    
    // Calculate total hours for the day
    const calculateTotalHours = () => {
      console.log('🔢 calculateTotalHours for intern:', {
        name: intern.first_name + ' ' + intern.last_name,
        totalDailyHours: intern.totalDailyHours,
        amTimeIn: intern.amTimeIn,
        amTimeOut: intern.amTimeOut,
        pmTimeIn: intern.pmTimeIn,
        pmTimeOut: intern.pmTimeOut
      });
      
      // Use the totalDailyHours from the database if available, otherwise calculate from times
      if (intern.totalDailyHours !== undefined && intern.totalDailyHours !== null && !isNaN(intern.totalDailyHours)) {
        console.log('🔢 Using totalDailyHours from database:', intern.totalDailyHours);
        return intern.totalDailyHours;
      }
      
      // Fallback calculation if totalDailyHours is not available
      let total = 0;
      if (intern.amTimeIn && intern.amTimeOut && intern.amTimeIn !== '--:--' && intern.amTimeOut !== '--:--') {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const amIn = parseTime(intern.amTimeIn);
        const amOut = parseTime(intern.amTimeOut);
        total += Math.max(0, (amOut.getTime() - amIn.getTime()) / (1000 * 60 * 60));
        } catch (error) {
          console.warn('Error parsing AM times:', error);
      }
      }
      
      if (intern.pmTimeIn && intern.pmTimeOut && intern.pmTimeIn !== '--:--' && intern.pmTimeOut !== '--:--') {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const pmIn = parseTime(intern.pmTimeIn);
        const pmOut = parseTime(intern.pmTimeOut);
        total += Math.max(0, (pmOut.getTime() - pmIn.getTime()) / (1000 * 60 * 60));
        } catch (error) {
          console.warn('Error parsing PM times:', error);
      }
      }
      
      return total;
    };

    const totalHours = calculateTotalHours();
    const formatHours = (hours: number) => {
      console.log('🔢 formatHours called with:', { hours, type: typeof hours, isNaN: isNaN(hours) });
      
      if (isNaN(hours) || hours === null || hours === undefined) {
        return '0h 0m';
      }
      
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${h}h ${m}m`;
    };

    return (
      <View style={styles.tabletCardContent}>
        {/* Header with Profile and Arrow */}
        <View style={styles.tabletCardHeader}>
          <View style={styles.tabletProfileSection}>
            <View style={styles.tabletProfileContainer}>
              {intern.student_profile_picture ? (
                <Image 
                  source={{ uri: intern.student_profile_picture }} 
                  style={styles.tabletProfileImage}
                />
              ) : (
                <View style={styles.tabletProfilePlaceholder}>
                  <Text style={styles.tabletProfileText}>
                    {intern.first_name.charAt(0)}{intern.last_name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.tabletProfileInfo}>
              <Text style={styles.tabletInternName}>
                {intern.first_name} {intern.last_name}
              </Text>
              <Text style={styles.tabletInternId}>Intern #{index + 1}</Text>
            </View>
          </View>
        </View>
        
        {/* Time Ranges - Modern Layout */}
        <View style={styles.tabletTimeSection}>
          <View style={styles.tabletTimeRow}>
            <View style={styles.tabletTimeItem}>
              <View style={styles.tabletTimeIconContainer}>
                <MaterialIcons name="schedule" size={18} color="#1E3A5F" />
              </View>
              <View style={styles.tabletTimeContent}>
                <Text style={styles.tabletTimeLabel}>AM Shift</Text>
                <Text style={styles.tabletTimeValue}>
                  {intern.amTimeIn && intern.amTimeOut 
                    ? `${intern.amTimeIn.split(' ')[0]} → ${intern.amTimeOut.split(' ')[0]}`
                    : '--:-- → --:--'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.tabletTimeItem}>
              <View style={styles.tabletTimeIconContainer}>
                <MaterialIcons name="schedule" size={18} color="#1E3A5F" />
              </View>
              <View style={styles.tabletTimeContent}>
                <Text style={styles.tabletTimeLabel}>PM Shift</Text>
                <Text style={styles.tabletTimeValue}>
                  {intern.pmTimeIn && intern.pmTimeOut 
                    ? `${intern.pmTimeIn.split(' ')[0]} → ${intern.pmTimeOut.split(' ')[0]}`
                    : '--:-- → --:--'
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Hours Summary - Modern Cards */}
        <View style={styles.tabletHoursSection}>
          <View style={styles.tabletHoursCard}>
            <Text style={styles.tabletHoursLabel}>Total Hours</Text>
            <Text style={styles.tabletHoursValue}>{formatHours(totalHours)}</Text>
          </View>
          <View style={styles.tabletHoursCard}>
            <Text style={styles.tabletHoursLabel}>Remaining Hours</Text>
            <Text style={styles.tabletRemainingValue}>{formatHours(intern.remainingHours || 0)}</Text>
          </View>
        </View>


        {/* Action Buttons - Modern Layout */}
        <View style={styles.tabletActionsSection}>
          {!hasAnyTimeIn && !isFullyCompleted && !workCompletedInterns.has(intern.id) ? (
            <View style={styles.tabletButtonsGrid}>
              <View style={styles.tabletButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.tabletActionButton, 
                    styles.presentActionButton,
                    isButtonDisabled(intern, 'present') && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (isButtonDisabled(intern, 'present')) {
                      handleDisabledButtonPress(intern, 'present');
                    } else {
                      handleAttendanceToggle(intern.id, 'present');
                    }
                  }}
                >
                  <MaterialIcons name="check" size={16} color="#fff" />
                  <Text style={styles.presentButtonText}>Present</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabletActionButton, 
                    styles.lateActionButton,
                    isButtonDisabled(intern, 'late') && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (isButtonDisabled(intern, 'late')) {
                      handleDisabledButtonPress(intern, 'late');
                    } else {
                      handleAttendanceToggle(intern.id, 'late');
                    }
                  }}
                >
                  <MaterialIcons name="schedule" size={16} color="#fff" />
                  <Text style={styles.lateButtonText}>Late</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tabletButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.tabletActionButton, 
                    styles.absentActionButton,
                    isButtonDisabled(intern, 'absent') && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (isButtonDisabled(intern, 'absent')) {
                      handleDisabledButtonPress(intern, 'absent');
                    } else {
                      handleAttendanceToggle(intern.id, 'absent');
                    }
                  }}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                  <Text style={styles.absentButtonText}>Absent</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabletActionButton, 
                    styles.leaveActionButton,
                    isButtonDisabled(intern, 'leave') && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (isButtonDisabled(intern, 'leave')) {
                      handleDisabledButtonPress(intern, 'leave');
                    } else {
                      handleAttendanceToggle(intern.id, 'leave');
                    }
                  }}
                >
                  <MaterialIcons name="event-busy" size={16} color="#fff" />
                  <Text style={styles.leaveButtonText}>Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : hasAnyTimeIn && !workCompletedInterns.has(intern.id) ? (
            <TouchableOpacity
              style={[styles.tabletActionButton, styles.timeOutActionButton]}
              onPress={() => handleTimeOut(intern.id)}
            >
              <MaterialIcons name="logout" size={16} color="#fff" />
              <Text style={styles.timeOutButtonText}>Time Out</Text>
            </TouchableOpacity>
          ) : workCompletedInterns.has(intern.id) ? (
            <View style={styles.workCompletedCard}>
              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.workCompletedTextSmall}>Work Done! 🎉</Text>
            </View>
          ) : (
            <View style={[
              styles.finalStatusBadge, 
              { 
                backgroundColor: intern.currentAttendanceStatus === 'present' ? '#e8f5e8' : 
                               intern.currentAttendanceStatus === 'late' ? '#fff8e1' : '#f5f5f5',
                borderColor: intern.currentAttendanceStatus === 'present' ? '#34a853' : 
                           intern.currentAttendanceStatus === 'late' ? '#fbbc04' : '#6c757d'
              }
            ]}>
              <Text style={[
                styles.finalStatusText,
                {
                  color: intern.currentAttendanceStatus === 'present' ? '#34a853' : 
                         intern.currentAttendanceStatus === 'late' ? '#f57c00' : '#6c757d'
                }
              ]}>
                {intern.currentAttendanceStatus === 'late' ? 'Late' : 'Present'}
              </Text>
            </View>
          )}
        </View>

        {/* Detail Arrow Button */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.detailArrowButton}
            onPress={() => openDetailPanel(intern)}
          >
            <MaterialIcons name="arrow-back" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTableRow = ({ item: intern, index }: { item: Intern, index: number }) => {
    const hasAMTimeIn = intern.amTimeIn && (!intern.amTimeOut || intern.amTimeOut === '');
    const hasPMTimeIn = intern.pmTimeIn && (!intern.pmTimeOut || intern.pmTimeOut === '');
    const hasAnyTimeIn = intern.amTimeIn || intern.pmTimeIn;
    const isFullyCompleted = intern.amTimeIn && intern.amTimeOut && intern.pmTimeIn && intern.pmTimeOut && 
      intern.amTimeOut !== '' && intern.pmTimeOut !== '';
    
    console.log('🔍 Button visibility check for intern:', {
      name: intern.first_name + ' ' + intern.last_name,
      hasAnyTimeIn,
      isFullyCompleted,
      workCompleted: workCompletedInterns.has(intern.id),
      amTimeIn: intern.amTimeIn,
      amTimeOut: intern.amTimeOut,
      pmTimeIn: intern.pmTimeIn,
      pmTimeOut: intern.pmTimeOut,
      shouldShowButtons: !hasAnyTimeIn && !isFullyCompleted && !workCompletedInterns.has(intern.id)
    });
    
    // Calculate total hours for the day
    const calculateTotalHours = () => {
      console.log('🔢 calculateTotalHours for intern:', {
        name: intern.first_name + ' ' + intern.last_name,
        totalDailyHours: intern.totalDailyHours,
        amTimeIn: intern.amTimeIn,
        amTimeOut: intern.amTimeOut,
        pmTimeIn: intern.pmTimeIn,
        pmTimeOut: intern.pmTimeOut
      });
      
      // Use the totalDailyHours from the database if available, otherwise calculate from times
      if (intern.totalDailyHours !== undefined && intern.totalDailyHours !== null && !isNaN(intern.totalDailyHours)) {
        console.log('🔢 Using totalDailyHours from database:', intern.totalDailyHours);
        return intern.totalDailyHours;
      }
      
      // Fallback calculation if totalDailyHours is not available
      let total = 0;
      if (intern.amTimeIn && intern.amTimeOut && intern.amTimeIn !== '--:--' && intern.amTimeOut !== '--:--') {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const amIn = parseTime(intern.amTimeIn);
        const amOut = parseTime(intern.amTimeOut);
        total += Math.max(0, (amOut.getTime() - amIn.getTime()) / (1000 * 60 * 60));
        } catch (error) {
          console.warn('Error parsing AM times:', error);
      }
      }
      
      if (intern.pmTimeIn && intern.pmTimeOut && intern.pmTimeIn !== '--:--' && intern.pmTimeOut !== '--:--') {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const pmIn = parseTime(intern.pmTimeIn);
        const pmOut = parseTime(intern.pmTimeOut);
        total += Math.max(0, (pmOut.getTime() - pmIn.getTime()) / (1000 * 60 * 60));
        } catch (error) {
          console.warn('Error parsing PM times:', error);
      }
      }
      
      return total;
    };

    const totalHours = calculateTotalHours();
    const formatHours = (hours: number) => {
      console.log('🔢 formatHours called with:', { hours, type: typeof hours, isNaN: isNaN(hours) });
      
      if (isNaN(hours) || hours === null || hours === undefined) {
        return '0h 0m';
      }
      
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${h}h ${m}m`;
    };

    return (
      <View style={[styles.tableRow, isDesktop && styles.desktopTableRow]}>
        {/* Row Number Column */}
        <View style={[styles.cell, { flex: 0.6 }]}>
          <Text style={[styles.rowNumber, isDesktop && styles.desktopRowNumber]}>{index + 1}</Text>
        </View>
        
        {/* Intern Name Column */}
        <View style={[styles.cell, { flex: 2.2 }]}>
          <View style={styles.internInfo}>
            <View style={styles.profileContainer}>
              {intern.student_profile_picture ? (
                <Image 
                  source={{ uri: intern.student_profile_picture }} 
                  style={isDesktop ? styles.desktopProfileImage : styles.profileImage}
                />
              ) : (
                <View style={[styles.profilePlaceholder, isDesktop && styles.desktopProfilePlaceholder]}>
                  <Text style={styles.profileText}>
                    {intern.first_name.charAt(0)}{intern.last_name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.internDetails}>
              <Text style={[styles.internName, isDesktop && styles.desktopInternName]}>
                {intern.first_name} {intern.last_name}
              </Text>
            </View>
          </View>
        </View>
        
        {/* AM Time In Column */}
        <View style={[styles.cell, { flex: 1.1 }]}>
          <Text style={[styles.timeText, isDesktop && styles.desktopTimeText]}>
            {intern.amTimeIn || '--:--'}
          </Text>
        </View>
        
        {/* AM Time Out Column */}
        <View style={[styles.cell, { flex: 1.1 }]}>
          <Text style={[styles.timeText, isDesktop && styles.desktopTimeText]}>
            {intern.amTimeOut || '--:--'}
          </Text>
        </View>
        
        {/* PM Time In Column */}
        <View style={[styles.cell, { flex: 1.1 }]}>
          <Text style={[styles.timeText, isDesktop && styles.desktopTimeText]}>
            {intern.pmTimeIn || '--:--'}
          </Text>
        </View>
        
        {/* PM Time Out Column */}
        <View style={[styles.cell, { flex: 1.1 }]}>
          <Text style={[styles.timeText, isDesktop && styles.desktopTimeText]}>
            {intern.pmTimeOut || '--:--'}
          </Text>
        </View>
        
        {/* Total Hours Column */}
        <View style={[styles.cell, { flex: 1.1 }]}>
          <Text style={[styles.hoursText, isDesktop && styles.desktopHoursText]}>
            {formatHours(totalHours)}
          </Text>
        </View>
        
        {/* Remaining Hours Column */}
        <View style={[styles.cell, { flex: 1.1 }]}>
          <Text style={[styles.remainingText, isDesktop && styles.desktopRemainingText]}>
            {formatHours(intern.remainingHours || 0)}
          </Text>
        </View>
        
        {/* Actions Column */}
        <View style={[styles.cell, { flex: 1.2 }]}>
          <View style={styles.actionButtonsContainer}>
            
            {/* Show status buttons only if no time in or fully completed */}
            {!hasAnyTimeIn && !isFullyCompleted && !workCompletedInterns.has(intern.id) && (
              <View style={styles.buttonsGrid}>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.attendanceActionButton, 
                      styles.presentActionButton,
                      isButtonDisabled(intern, 'present') && styles.disabledButton
                    ]}
                    onPress={() => {
                      if (isButtonDisabled(intern, 'present')) {
                        handleDisabledButtonPress(intern, 'present');
                      } else {
                        handleAttendanceToggle(intern.id, 'present');
                      }
                    }}
                  >
                    <Text style={styles.presentButtonText}>Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.attendanceActionButton, 
                      styles.lateActionButton,
                      isButtonDisabled(intern, 'late') && styles.disabledButton
                    ]}
                    onPress={() => {
                      if (isButtonDisabled(intern, 'late')) {
                        handleDisabledButtonPress(intern, 'late');
                      } else {
                        handleAttendanceToggle(intern.id, 'late');
                      }
                    }}
                  >
                    <Text style={styles.lateButtonText}>Late</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.attendanceActionButton, 
                      styles.absentActionButton,
                      isButtonDisabled(intern, 'absent') && styles.disabledButton
                    ]}
                    onPress={() => {
                      if (isButtonDisabled(intern, 'absent')) {
                        handleDisabledButtonPress(intern, 'absent');
                      } else {
                        handleAttendanceToggle(intern.id, 'absent');
                      }
                    }}
                  >
                    <Text style={styles.absentButtonText}>Absent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.attendanceActionButton, 
                      styles.leaveActionButton,
                      isButtonDisabled(intern, 'leave') && styles.disabledButton
                    ]}
                    onPress={() => {
                      if (isButtonDisabled(intern, 'leave')) {
                        handleDisabledButtonPress(intern, 'leave');
                      } else {
                        handleAttendanceToggle(intern.id, 'leave');
                      }
                    }}
                  >
                    <Text style={styles.leaveButtonText}>Leave</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Show Time Out button if there's a time in but no time out and work not completed */}
            {hasAnyTimeIn && !workCompletedInterns.has(intern.id) && (
              <TouchableOpacity
                style={[styles.attendanceActionButton, styles.timeOutActionButton]}
                onPress={() => handleTimeOut(intern.id)}
              >
                <Text style={styles.timeOutButtonText}>Time Out</Text>
              </TouchableOpacity>
            )}
            
            {/* Show work completed message if work is done */}
            {workCompletedInterns.has(intern.id) && (
              <View style={styles.workCompletedCard}>
                <MaterialIcons name="check-circle" size={14} color="#4CAF50" />
                <Text style={styles.workCompletedTextSmall}>Work Done! 🎉</Text>
              </View>
            )}
            
            {/* Show final status if fully completed but work not marked as completed */}
            {isFullyCompleted && !workCompletedInterns.has(intern.id) && (
              <View style={[
                styles.finalStatusBadge, 
                { 
                  backgroundColor: intern.currentAttendanceStatus === 'present' ? '#e8f5e8' : 
                                 intern.currentAttendanceStatus === 'late' ? '#fff8e1' : '#f5f5f5',
                  borderColor: intern.currentAttendanceStatus === 'present' ? '#34a853' : 
                             intern.currentAttendanceStatus === 'late' ? '#fbbc04' : '#6c757d'
                }
              ]}>
                <Text style={[
                  styles.finalStatusText,
                  {
                    color: intern.currentAttendanceStatus === 'present' ? '#34a853' : 
                           intern.currentAttendanceStatus === 'late' ? '#f57c00' : '#6c757d'
                  }
                ]}>
                  {intern.currentAttendanceStatus === 'late' ? 'Late' : 'Present'}
                </Text>
              </View>
            )}
            
            {/* Detail View Arrow */}
          <TouchableOpacity
              style={styles.detailArrowButton}
              onPress={() => openDetailPanel(intern)}
          >
              <MaterialIcons name="arrow-back" size={16} color="#1E3A5F" />
          </TouchableOpacity>
        </View>
                  </View>
      </View>
    );
  };


  return (
    <View style={[
      styles.container, 
      isSmallMobile && styles.smallMobileContainer,
      isMobile && styles.mobileContainer, 
      isTablet && styles.tabletContainer, 
      isDesktop && styles.desktopContainer
    ]}>
      {/* Header Section */}
      <View style={[
        styles.headerSection,
        isSmallMobile && styles.smallMobileHeaderSection,
        isTablet && styles.tabletHeaderSection,
        isDesktop && styles.desktopHeaderSection
      ]}>
        <View style={[
          styles.headerContent,
          isSmallMobile && styles.smallMobileHeaderContent,
          isTablet && styles.tabletHeaderContent,
          isDesktop && styles.desktopHeaderContent
        ]}>
          <View style={[
            styles.headerLeft,
            isSmallMobile && styles.smallMobileHeaderLeft
          ]}>
            <View style={styles.titleSection}>
              <View style={[
                styles.titleWithActions,
                isSmallMobile && styles.smallMobileTitleWithActions
              ]}>
                <View style={styles.titleContainer}>
                <Text style={[
                  styles.pageTitle,
                  isSmallMobile && styles.smallMobilePageTitle,
                  isTablet && styles.tabletPageTitle,
                  isDesktop && styles.desktopPageTitle
                ]}>
                  Intern Attendance
                </Text>
                  <View style={styles.selectedDateContainer}>
                    <Text style={[
                      styles.selectedDateText,
                      isSmallMobile && styles.smallMobileSelectedDateText,
                      isTablet && styles.tabletSelectedDateText,
                      isDesktop && styles.desktopSelectedDateText
                    ]}>
                      {selectedDate.toLocaleDateString('en-US', { 
                        timeZone: 'Asia/Manila',
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                    {dateFilterLoading && (
                      <ActivityIndicator 
                        size="small" 
                        color="#1E3A5F" 
                        style={styles.dateLoadingIndicator}
                      />
                    )}
                  </View>
                </View>
                <View style={[
                  styles.headerActions,
                  isSmallMobile && styles.smallMobileHeaderActions,
                  isTablet && styles.tabletHeaderActions,
                  isDesktop && styles.desktopHeaderActions
                ]}>
              <TouchableOpacity
                style={[
                  styles.setWorkingTimeButton,
                  isSmallMobile && styles.smallMobileSetWorkingTimeButton,
                  isTablet && styles.tabletSetWorkingTimeButton,
                  isDesktop && styles.desktopSetWorkingTimeButton
                ]}
              onPress={() => setShowWorkingTimeModal(true)}
              >
                <MaterialIcons 
                  name="access-time" 
                  size={isSmallMobile ? 16 : isTablet ? 18 : isDesktop ? 20 : 20} 
                  color="#fff" 
                />
                <Text style={[
                  styles.setWorkingTimeButtonText,
                  isSmallMobile && styles.smallMobileSetWorkingTimeButtonText,
                  isTablet && styles.tabletSetWorkingTimeButtonText,
                  isDesktop && styles.desktopSetWorkingTimeButtonText
                ]}>
                  {isSmallMobile ? 'Set Time' : 'Set Working Time'}
                </Text>
              </TouchableOpacity>

              {/* Date Picker Button */}
              <TouchableOpacity 
                style={[
                  styles.headerDateButton,
                  isSmallMobile && styles.smallMobileHeaderDateButton,
                  isTablet && styles.tabletHeaderDateButton,
                  isDesktop && styles.desktopHeaderDateButton
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={isSmallMobile ? 16 : isTablet ? 18 : isDesktop ? 20 : 20} color="#1E3A5F" />
              </TouchableOpacity>

              {/* Search Button */}
              <TouchableOpacity 
                style={[
                  styles.headerSearchButton,
                  isSmallMobile && styles.smallMobileHeaderSearchButton,
                  isTablet && styles.tabletHeaderSearchButton,
                  isDesktop && styles.desktopHeaderSearchButton
                ]}
                onPress={toggleSearch}
              >
                <MaterialIcons name="search" size={isSmallMobile ? 16 : isTablet ? 18 : isDesktop ? 20 : 20} color="#1E3A5F" />
              </TouchableOpacity>

              {/* Animated Search Input */}
              <Animated.View
                style={[
                  styles.headerSearchContainer,
                  isSmallMobile && styles.smallMobileHeaderSearchContainer,
                  isTablet && styles.tabletHeaderSearchContainer,
                  isDesktop && styles.desktopHeaderSearchContainer,
                  {
                    opacity: searchAnimation,
                    height: searchAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, isSmallMobile ? 40 : isTablet ? 45 : isDesktop ? 50 : 50],
                    }),
                    marginTop: searchAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 8],
                    }),
                  },
                ]}
              >
                <TextInput
                  ref={searchInputRef}
                  style={[
                    styles.headerSearchInput,
                    isSmallMobile && styles.smallMobileHeaderSearchInput,
                    isTablet && styles.tabletHeaderSearchInput,
                    isDesktop && styles.desktopHeaderSearchInput
                  ]}
                  placeholder="Search interns by name, ID, or position..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                <TouchableOpacity 
                  style={[
                    styles.headerSearchCloseButton,
                    isSmallMobile && styles.smallMobileHeaderSearchCloseButton,
                    isTablet && styles.tabletHeaderSearchCloseButton,
                    isDesktop && styles.desktopHeaderSearchCloseButton
                  ]}
                  onPress={toggleSearch}
                >
                  <MaterialIcons name="close" size={isSmallMobile ? 16 : isTablet ? 18 : isDesktop ? 20 : 20} color="#666" />
                </TouchableOpacity>
              </Animated.View>
                </View>
              </View>
              <Text style={[
                styles.pageSubtitle,
                isSmallMobile && styles.smallMobilePageSubtitle,
                isTablet && styles.tabletPageSubtitle,
                isDesktop && styles.desktopPageSubtitle
              ]}>
                Track and manage intern working hours efficiently
              </Text>
              

            </View>
            

            {/* Date Picker Modal */}
            <Modal
              visible={showDatePicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerTitle}>Select Date</Text>
                    <TouchableOpacity 
                      style={styles.datePickerCloseButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <MaterialIcons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  
                  <DatePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setSelectedDate(selectedDate);
                        loadAttendanceForDate(selectedDate);
                      }
                    }}
                    maximumDate={new Date()}
                    style={styles.datePicker}
                  />
                  
                  <View style={styles.datePickerActions}>
                    <TouchableOpacity 
                      style={styles.datePickerTodayButton}
                      onPress={() => {
                        const today = new Date();
                        setSelectedDate(today);
                        setShowDatePicker(false);
                        loadAttendanceForDate(today);
                      }}
                    >
                      <Text style={styles.datePickerTodayText}>Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
          <View style={[
            styles.headerRight,
            isSmallMobile && styles.smallMobileHeaderRight,
            isTablet && styles.tabletHeaderRight,
            isDesktop && styles.desktopHeaderRight
          ]}>
            <View style={[
              styles.clockContainer,
              isSmallMobile && styles.smallMobileClockContainer,
              isTablet && styles.tabletClockContainer,
              isDesktop && styles.desktopClockContainer
            ]}>
              <View style={[
                styles.analogClock,
                isSmallMobile && styles.smallMobileAnalogClock,
                isTablet && styles.tabletAnalogClock,
                isDesktop && styles.desktopAnalogClock
              ]}>
                {/* Clock Face */}
                <View style={[
                  styles.clockFace,
                  isSmallMobile && styles.smallMobileClockFace,
                  isTablet && styles.tabletClockFace,
                  isDesktop && styles.desktopClockFace
                ]}>
                  
                  {/* Hour Hand */}
                  <View
                    style={[
                      styles.hourHand,
                      isSmallMobile && styles.smallMobileHourHand,
                      isTablet && styles.tabletHourHand,
                      {
                        transform: [
                          { rotate: `${(currentTime.getHours() % 12) * 30 + (currentTime.getMinutes() * 0.5)}deg` }
                        ],
                      },
                    ]}
                  />
                  
                  {/* Minute Hand */}
                  <View
                    style={[
                      styles.minuteHand,
                      isSmallMobile && styles.smallMobileMinuteHand,
                      isTablet && styles.tabletMinuteHand,
                      {
                        transform: [
                          { rotate: `${currentTime.getMinutes() * 6 + (currentTime.getSeconds() * 0.1)}deg` }
                        ],
                      },
                    ]}
                  />
                  
                  {/* Second Hand */}
                  <View
                    style={[
                      styles.secondHand,
                      isSmallMobile && styles.smallMobileSecondHand,
                      isTablet && styles.tabletSecondHand,
                      {
                        transform: [
                          { rotate: `${currentTime.getSeconds() * 6}deg` }
                        ],
                      },
                    ]}
                  />
                  
                  {/* Center Dot */}
                  <View style={[
                    styles.centerDot,
                    isSmallMobile && styles.smallMobileCenterDot,
                    isTablet && styles.tabletCenterDot
                  ]} />
                </View>
              </View>
              <View style={styles.clockContent}>
                <Text style={[
                  styles.clockTime,
                  isSmallMobile && styles.smallMobileClockTime,
                  isTablet && styles.tabletClockTime,
                  isDesktop && styles.desktopClockTime
                ]}>
                  {currentTime.toLocaleTimeString('en-US', { 
                    timeZone: 'Asia/Manila',
                    hour12: true, 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </Text>
                <Text style={[
                  styles.clockDate,
                  isSmallMobile && styles.smallMobileClockDate,
                  isTablet && styles.tabletClockDate,
                  isDesktop && styles.desktopClockDate
                ]}>
                  {currentTime.toLocaleDateString('en-US', { 
                    timeZone: 'Asia/Manila',
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={[
        styles.tabContainer,
        isSmallMobile && styles.smallMobileTabContainer,
        isTablet && styles.tabletTabContainer,
        isDesktop && styles.desktopTabContainer
      ]}>
            <TouchableOpacity
          style={[
            styles.tabButton, 
            activeTab === 'list' && styles.activeTab,
            isSmallMobile && styles.smallMobileTabButton,
            isTablet && styles.tabletTabButton,
            isDesktop && styles.desktopTabButton
          ]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'list' && styles.activeTabText,
            isSmallMobile && styles.smallMobileTabText,
            isTablet && styles.tabletTabText,
            isDesktop && styles.desktopTabText
          ]}>
            {isSmallMobile ? 'List' : 'Attendance List'}
          </Text>
            </TouchableOpacity>
            <TouchableOpacity
          style={[
            styles.tabButton, 
            activeTab === 'timeline' && styles.activeTab,
            isSmallMobile && styles.smallMobileTabButton,
            isTablet && styles.tabletTabButton,
            isDesktop && styles.desktopTabButton
          ]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'timeline' && styles.activeTabText,
            isSmallMobile && styles.smallMobileTabText,
            isTablet && styles.tabletTabText,
            isDesktop && styles.desktopTabText
          ]}>
            Timeline View
          </Text>
            </TouchableOpacity>
      </View>


      {/* Main Content */}
      {activeTab === 'list' ? (
        /* Responsive Layout */
        <View style={[
          styles.responsiveContainer,
          isDesktop && styles.desktopResponsiveContainer,
          isTablet && styles.tabletResponsiveContainer,
          isMobile && styles.mobileResponsiveContainer
        ]}>
          {getFilteredInternsByDate().length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="school" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No interns found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? 'Try adjusting your search criteria'
                  : 'No interns available for the selected date'
                }
              </Text>
            </View>
          ) : isDesktop ? (
            /* Desktop Table Layout */
            <View style={styles.tableContainer}>
              <FlatList
                data={getFilteredInternsByDate()}
                renderItem={renderTableRow}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderTableHeader}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.tableContent}
              />
            </View>
          ) : isTablet ? (
            /* Tablet Card Layout */
            <ScrollView 
              style={styles.tabletScrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.tabletContent}
            >
              {getFilteredInternsByDate().map((intern, index) => (
                <View key={intern.id} style={styles.tabletCard}>
                  {renderTabletCard(intern, index)}
                </View>
              ))}
            </ScrollView>
          ) : (
            /* Mobile Card Layout */
            <ScrollView 
              style={styles.mobileScrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.mobileContent}
            >
              {getFilteredInternsByDate().map((intern, index) => (
                <View key={intern.id} style={styles.mobileCard}>
                  {renderMobileCard(intern, index)}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        /* Timeline View */
        <TimelineView 
          interns={interns}
          filteredInterns={filteredInterns}
          companyId={companyId}
          currentUser={currentUser}
        />
      )}

      {/* Intern Detail Modal */}
      <Modal
        visible={showInternModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInternModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedIntern ? `${selectedIntern.first_name} ${selectedIntern.last_name}` : ''}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowInternModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedIntern && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.internDetailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Student ID:</Text>
                    <Text style={styles.detailValue}>{selectedIntern.id_number || selectedIntern.student_id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Position:</Text>
                    <Text style={styles.detailValue}>{selectedIntern.position}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Department:</Text>
                    <Text style={styles.detailValue}>{selectedIntern.department || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedIntern.student_email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Hours:</Text>
                    <Text style={styles.detailValue}>{selectedIntern.totalHours || 0} hours</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Remaining Hours:</Text>
                    <Text style={[styles.detailValue, { color: '#ea4335' }]}>
                      {selectedIntern.remainingHours || 0} hours ({selectedIntern.remainingDays || 0} days)
                    </Text>
                  </View>
                  
                  {/* Current Session Info for Present/Late */}
                  {(selectedIntern.currentAttendanceStatus === 'present' || selectedIntern.currentAttendanceStatus === 'late') && (
                    <>
                      {selectedIntern.amTimeIn && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>AM Check-in Time:</Text>
                          <Text style={[styles.detailValue, { color: '#34a853' }]}>
                            {selectedIntern.amTimeIn}
                          </Text>
                        </View>
                      )}
                      {selectedIntern.amTimeOut && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>AM Check-out Time:</Text>
                          <Text style={[styles.detailValue, { color: '#ea4335' }]}>
                            {selectedIntern.amTimeOut}
                          </Text>
                        </View>
                      )}
                      {selectedIntern.pmTimeIn && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>PM Check-in Time:</Text>
                          <Text style={[styles.detailValue, { color: '#34a853' }]}>
                            {selectedIntern.pmTimeIn}
                          </Text>
                        </View>
                      )}
                      {selectedIntern.pmTimeOut && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>PM Check-out Time:</Text>
                          <Text style={[styles.detailValue, { color: '#ea4335' }]}>
                            {selectedIntern.pmTimeOut}
                          </Text>
                        </View>
                      )}
                      {selectedIntern.totalDailyHours && selectedIntern.totalDailyHours > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Today's Hours:</Text>
                          <Text style={[styles.detailValue, { color: '#1E3A5F' }]}>
                            {selectedIntern.totalDailyHours.toFixed(1)} hours
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
                
                {/* Time Controls for Present/Late */}
                {(selectedIntern.currentAttendanceStatus === 'present' || selectedIntern.currentAttendanceStatus === 'late') && (
                  <View style={styles.timeControlsSection}>
                    <Text style={styles.actionsTitle}>Time Controls</Text>
                    <View style={styles.timeControlButtons}>
                      {(selectedIntern.amTimeIn && !selectedIntern.amTimeOut) || (selectedIntern.pmTimeIn && !selectedIntern.pmTimeOut) ? (
                        <TouchableOpacity
                          style={[styles.timeControlButton, styles.timeOutControlButton]}
                          onPress={() => {
                            handleTimeOut(selectedIntern.id);
                            setShowInternModal(false);
                          }}
                        >
                          <MaterialIcons name="logout" size={20} color="#fff" />
                          <Text style={styles.timeControlButtonText}>Check Out</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.timeControlButton, styles.timeInControlButton]}
                          onPress={() => {
                            handleAttendanceToggle(selectedIntern.id, 'present');
                            setShowInternModal(false);
                          }}
                        >
                          <MaterialIcons name="login" size={20} color="#fff" />
                          <Text style={styles.timeControlButtonText}>Check In Again</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.attendanceActions}>
                  <Text style={styles.actionsTitle}>Mark Attendance</Text>
                  <View style={styles.attendanceButtons}>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.presentActionButton]}
                      onPress={() => {
                        handleAttendanceToggle(selectedIntern.id, 'present');
                        setShowInternModal(false);
                      }}
                    >
                      <MaterialIcons name="check" size={20} color="#fff" />
                      <Text style={styles.attendanceButtonText}>Present</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.lateActionButton]}
                      onPress={() => {
                        handleAttendanceToggle(selectedIntern.id, 'late');
                        setShowInternModal(false);
                      }}
                    >
                      <MaterialIcons name="schedule" size={20} color="#fff" />
                      <Text style={styles.attendanceButtonText}>Late</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.absentActionButton]}
                      onPress={() => {
                        handleAttendanceToggle(selectedIntern.id, 'absent');
                        setShowInternModal(false);
                      }}
                    >
                      <MaterialIcons name="close" size={20} color="#fff" />
                      <Text style={styles.attendanceButtonText}>Absent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.leaveActionButton]}
                      onPress={() => {
                        handleAttendanceToggle(selectedIntern.id, 'leave');
                        setShowInternModal(false);
                      }}
                    >
                      <MaterialIcons name="event-busy" size={20} color="#fff" />
                      <Text style={styles.attendanceButtonText}>Leave</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.sickButton]}
                      onPress={() => {
                        handleAttendanceToggle(selectedIntern.id, 'sick');
                        setShowInternModal(false);
                      }}
                    >
                      <MaterialIcons name="sick" size={20} color="#fff" />
                      <Text style={styles.attendanceButtonText}>Sick</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
                      setSelectedDate(date);
                      loadAttendanceForDate(date);
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
                  onChangeText={(text) => {
                    const date = new Date(text);
                    if (!isNaN(date.getTime())) {
                      setSelectedDate(date);
                      loadAttendanceForDate(date);
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
                    setSelectedDate(today);
                    setShowDatePicker(false);
                    loadAttendanceForDate(today);
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

      {/* Detailed Attendance Panel */}
      {showDetailPanel && (
        <Animated.View 
          style={[
            styles.detailPanelContainer,
            {
              transform: [{ translateX: detailPanelSlideAnim }]
            }
          ]}
        >
          <AttendanceDetailsPanel
            selectedInternDetail={selectedInternDetail}
            onClose={closeDetailPanel}
            isMobile={isMobile}
            isTablet={isTablet}
            isDesktop={isDesktop}
            companyId={companyId}
            currentUser={currentUser}
          />
        </Animated.View>
      )}

      {/* Working Time Modal */}
      <Modal
        visible={showWorkingTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorkingTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.workingTimeModal}>
            <View style={styles.workingTimeHeader}>
              <Text style={styles.workingTimeTitle}>Set Working Hours</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowWorkingTimeModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.workingTimeContent}>
              <Text style={styles.workingTimeDescription}>
                Set the working hours for your interns. Attendance buttons will only be enabled during these hours.
              </Text>
              
              <View style={styles.timeInputSection}>
                <View style={styles.timeInputRow}>
                  <Text style={styles.timeInputLabel}>Start Time:</Text>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={styles.timeInput}
                      value={workingHours.startTime}
                      onChangeText={(text) => setWorkingHours(prev => ({ ...prev, startTime: text }))}
                      placeholder="07:00"
                      keyboardType="numeric"
                    />
                    <View style={styles.periodSelector}>
                      <TouchableOpacity
                        style={[
                          styles.periodButton,
                          workingHours.startPeriod === 'AM' && styles.periodButtonActive
                        ]}
                        onPress={() => setWorkingHours(prev => ({ ...prev, startPeriod: 'AM' }))}
                      >
                        <Text style={[
                          styles.periodButtonText,
                          workingHours.startPeriod === 'AM' && styles.periodButtonTextActive
                        ]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.periodButton,
                          workingHours.startPeriod === 'PM' && styles.periodButtonActive
                        ]}
                        onPress={() => setWorkingHours(prev => ({ ...prev, startPeriod: 'PM' }))}
                      >
                        <Text style={[
                          styles.periodButtonText,
                          workingHours.startPeriod === 'PM' && styles.periodButtonTextActive
                        ]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                <View style={styles.timeInputRow}>
                  <Text style={styles.timeInputLabel}>End Time:</Text>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={styles.timeInput}
                      value={workingHours.endTime}
                      onChangeText={(text) => setWorkingHours(prev => ({ ...prev, endTime: text }))}
                      placeholder="07:00"
                      keyboardType="numeric"
                    />
                    <View style={styles.periodSelector}>
                      <TouchableOpacity
                        style={[
                          styles.periodButton,
                          workingHours.endPeriod === 'AM' && styles.periodButtonActive
                        ]}
                        onPress={() => setWorkingHours(prev => ({ ...prev, endPeriod: 'AM' }))}
                      >
                        <Text style={[
                          styles.periodButtonText,
                          workingHours.endPeriod === 'AM' && styles.periodButtonTextActive
                        ]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.periodButton,
                          workingHours.endPeriod === 'PM' && styles.periodButtonActive
                        ]}
                        onPress={() => setWorkingHours(prev => ({ ...prev, endPeriod: 'PM' }))}
                      >
                        <Text style={[
                          styles.periodButtonText,
                          workingHours.endPeriod === 'PM' && styles.periodButtonTextActive
                        ]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                <View style={styles.timeInputRow}>
                  <Text style={styles.timeInputLabel}>Lunch Break Start:</Text>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={styles.timeInput}
                      value={workingHours.breakStart}
                      onChangeText={(text) => setWorkingHours(prev => ({ ...prev, breakStart: text }))}
                      placeholder="11:00"
                      keyboardType="numeric"
                    />
                    <View style={styles.periodSelector}>
                      <TouchableOpacity
                        style={[
                          styles.periodButton,
                          workingHours.breakStartPeriod === 'AM' && styles.periodButtonActive
                        ]}
                        onPress={() => setWorkingHours(prev => ({ ...prev, breakStartPeriod: 'AM' }))}
                      >
                        <Text style={[
                          styles.periodButtonText,
                          workingHours.breakStartPeriod === 'AM' && styles.periodButtonTextActive
                        ]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.periodButton,
                          workingHours.breakStartPeriod === 'PM' && styles.periodButtonActive
                        ]}
                        onPress={() => setWorkingHours(prev => ({ ...prev, breakStartPeriod: 'PM' }))}
                      >
                        <Text style={[
                          styles.periodButtonText,
                          workingHours.breakStartPeriod === 'PM' && styles.periodButtonTextActive
                        ]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                <View style={styles.timeInputRow}>
                  <Text style={styles.timeInputLabel}>Lunch Break End:</Text>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={styles.timeInput}
                      value={workingHours.breakEnd}
                      onChangeText={(text) => setWorkingHours(prev => ({ ...prev, breakEnd: text }))}
                      placeholder="01:00"
                      keyboardType="numeric"
                    />
                    <View style={styles.periodSelector}>
                      <TouchableOpacity
                        style={[
                          styles.periodButton,
                          workingHours.breakEndPeriod === 'AM' && styles.periodButtonActive
                        ]}
                        onPress={() => setWorkingHours(prev => ({ ...prev, breakEndPeriod: 'AM' }))}
                      >
                        <Text style={[
                          styles.periodButtonText,
                          workingHours.breakEndPeriod === 'AM' && styles.periodButtonTextActive
                        ]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.periodButton,
                          workingHours.breakEndPeriod === 'PM' && styles.periodButtonActive
                        ]}
                        onPress={() => setWorkingHours(prev => ({ ...prev, breakEndPeriod: 'PM' }))}
                      >
                        <Text style={[
                          styles.periodButtonText,
                          workingHours.breakEndPeriod === 'PM' && styles.periodButtonTextActive
                        ]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.currentStatus}>
                <Text style={styles.statusLabel}>Current Status:</Text>
                <Text style={[
                  styles.workingTimeStatusText,
                  { color: isWithinWorkingHours() ? '#34a853' : '#ea4335' }
                ]}>
                  {isWithinWorkingHours() ? 'Within Working Hours' : 'Outside Working Hours'}
                </Text>
              </View>
              
              <View style={styles.workingTimeActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowWorkingTimeModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, workingHoursLoading && styles.disabledButton]}
                  onPress={saveWorkingHours}
                  disabled={workingHoursLoading}
                >
                  <Text style={styles.saveButtonText}>
                    {workingHoursLoading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Disabled Button Alert Modal */}
      <Modal
        visible={showDisabledAlert}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDisabledAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.disabledAlertModal}>
            <View style={styles.disabledAlertHeader}>
              <MaterialIcons name="info" size={24} color="#ff9800" />
              <Text style={styles.disabledAlertTitle}>Action Disabled</Text>
            </View>
            
            <View style={styles.disabledAlertContent}>
              <Text style={styles.disabledAlertMessage}>
                {disabledReason}
              </Text>
            </View>
            
            <View style={styles.disabledAlertActions}>
              <TouchableOpacity
                style={styles.disabledAlertButton}
                onPress={() => setShowDisabledAlert(false)}
              >
                <Text style={styles.disabledAlertButtonText}>OK</Text>
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
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successModalHeader}>
              <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
              <Text style={styles.successModalTitle}>Success!</Text>
            </View>
            
            <View style={styles.successModalContent}>
              <Text style={styles.successModalMessage}>
                {successMessage}
              </Text>
            </View>
            
            <View style={styles.successModalActions}>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={handleSuccessModalClose}
              >
                <Text style={styles.successModalButtonText}>OK</Text>
              </TouchableOpacity>
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
    backgroundColor: '#f8f9fa',
    minWidth: 0, // Allow content to wrap properly
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  // Header Section
  headerSection: {
    backgroundColor: '#fff',
    paddingHorizontal: '2%',
    paddingVertical: '1.5%',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    minWidth: 0, // Allow text to wrap properly
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleSection: {
    flex: 1,
    minWidth: 0, // Allow text to wrap properly
  },
  titleWithActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E3A5F',
    fontFamily: 'System',
    flexWrap: 'wrap',
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '400',
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  headerSearchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  headerSearchContainer: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    width: 300,
    minWidth: 200,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E3A5F',
    paddingVertical: 8,
  },
  headerSearchCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minWidth: 200,
  },
  analogClock: {
    width: 70,
    height: 70,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockFace: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#1E3A5F',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hourHand: {
    position: 'absolute',
    width: 4,
    height: 20,
    backgroundColor: '#1E3A5F',
    borderRadius: 2,
    top: 15,
    left: 33,
    transformOrigin: '50% 100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  minuteHand: {
    position: 'absolute',
    width: 3,
    height: 26,
    backgroundColor: '#1E3A5F',
    borderRadius: 1.5,
    top: 9,
    left: 33.5,
    transformOrigin: '50% 100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  secondHand: {
    position: 'absolute',
    width: 1.5,
    height: 30,
    backgroundColor: '#ea4335',
    borderRadius: 0.75,
    top: 5,
    left: 34.25,
    transformOrigin: '50% 100%',
    shadowColor: '#ea4335',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  centerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E3A5F',
    top: 31,
    left: 31,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  clockContent: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
  },
  clockTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A5F',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clockDate: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  viewToggleButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  activeToggleButton: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  // Controls Section
  controlsSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchContainer: {
    // Removed marginBottom since no stats below
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E3A5F',
    marginLeft: 8,
  },
  // Responsive Container
  responsiveContainer: {
    flex: 1,
    minWidth: 0, // Allow content to wrap properly
  },
  desktopResponsiveContainer: {
    paddingHorizontal: '2%',
    paddingVertical: '1%',
  },
  tabletResponsiveContainer: {
    paddingHorizontal: '3%',
    paddingVertical: '1.5%',
  },
  mobileResponsiveContainer: {
    paddingHorizontal: '4%',
    paddingVertical: '2%',
  },
  
  // Table Styles
  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  desktopTableContainer: {
    marginHorizontal: 24,
    marginVertical: 16,
  },
  tabletTableContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  tabletScrollView: {
    flex: 1,
  },
  tabletContent: {
    padding: 16,
    gap: 16,
  },
  tabletCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: '2%',
    minHeight: 44, // Accessibility: minimum touch target
  },
  tabletCardContent: {
    padding: 20,
  },
  tabletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabletProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tabletProfileContainer: {
    marginRight: 12,
  },
  tabletProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  tabletProfilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletProfileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  tabletProfileInfo: {
    flex: 1,
  },
  tabletInternName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  tabletInternId: {
    fontSize: 14,
    color: '#6c757d',
  },
  tabletDetailArrow: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletTimeSection: {
    marginBottom: 16,
  },
  tabletTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabletTimeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  tabletTimeLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 6,
    marginRight: 8,
  },
  tabletTimeValue: {
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  tabletHoursSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  tabletHoursItem: {
    flex: 1,
  },
  tabletHoursLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  tabletHoursValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  tabletRemainingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  tabletActionsSection: {
    alignItems: 'center',
  },
  // Mobile Styles
  mobileTableContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
  mobileScrollView: {
    flex: 1,
  },
  mobileContent: {
    padding: 12,
    gap: 12,
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: '2%',
    minHeight: 44, // Accessibility: minimum touch target
  },
  mobileCardContent: {
    padding: 16,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobileProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mobileProfileContainer: {
    marginRight: 12,
  },
  mobileProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  mobileProfilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileProfileText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  mobileProfileInfo: {
    flex: 1,
  },
  mobileInternName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 2,
  },
  mobileInternId: {
    fontSize: 12,
    color: '#6c757d',
  },
  mobileDetailArrow: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileTimeSection: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  mobileTimeItem: {
    marginBottom: 8,
  },
  mobileTimeLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  mobileTimeValue: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '500',
  },
  mobileHoursSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  mobileHoursItem: {
    flex: 1,
  },
  mobileHoursLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  mobileHoursValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  mobileRemainingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  mobileActionsSection: {
    alignItems: 'center',
  },
  
  // Responsive Styles for All Screen Sizes
  // Small Mobile Styles (< 480px)
  smallMobileContainer: {
    paddingHorizontal: '2%',
    paddingVertical: '1%',
  },
  smallMobileHeaderSection: {
    paddingHorizontal: '3%',
    paddingVertical: '2%',
  },
  smallMobileHeaderContent: {
    flexDirection: 'column',
    gap: 12,
    flex: 1,
    minWidth: 0, // Allow text to wrap properly
  },
  smallMobileHeaderLeft: {
    flexDirection: 'column',
    gap: 8,
  },
  smallMobileTitleWithActions: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 4,
  },
  smallMobilePageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  smallMobilePageSubtitle: {
    fontSize: 14, // Minimum readable font size
    lineHeight: 18,
  },
  smallMobileHeaderSearchButton: {
    padding: 6,
  },
  smallMobileHeaderSearchContainer: {
    paddingHorizontal: 10,
    width: 200,
    minWidth: 150,
  },
  smallMobileHeaderSearchInput: {
    fontSize: 12,
    paddingVertical: 6,
  },
  smallMobileHeaderSearchCloseButton: {
    padding: 2,
    marginLeft: 6,
  },
  smallMobileHeaderActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'flex-start',
  },
  smallMobileSetWorkingTimeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smallMobileSetWorkingTimeButtonText: {
    fontSize: 14, // Minimum readable font size
    fontWeight: '600',
  },
  smallMobileTabContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallMobileTabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  smallMobileTabText: {
    fontSize: 14, // Minimum readable font size
    fontWeight: '500',
  },
  smallMobileControlsSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallMobileSearchContainer: {
    // No additional styles needed
  },
  smallMobileSearchInputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallMobileSearchInput: {
    fontSize: 14,
    paddingVertical: 8,
  },
  smallMobileHeaderRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  smallMobileClockContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    minWidth: 160,
  },
  smallMobileAnalogClock: {
    width: 50,
    height: 50,
  },
  smallMobileClockFace: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
  },
  smallMobileHourHand: {
    position: 'absolute',
    width: 3,
    height: 16,
    backgroundColor: '#1E3A5F',
    borderRadius: 1.5,
    top: 12,
    left: 23.5,
    transformOrigin: '50% 100%',
  },
  smallMobileMinuteHand: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#1E3A5F',
    borderRadius: 1,
    top: 8,
    left: 24,
    transformOrigin: '50% 100%',
  },
  smallMobileSecondHand: {
    position: 'absolute',
    width: 1,
    height: 22,
    backgroundColor: '#ea4335',
    borderRadius: 0.5,
    top: 4,
    left: 24.5,
    transformOrigin: '50% 100%',
  },
  smallMobileCenterDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E3A5F',
    top: 22,
    left: 22,
  },
  smallMobileClockTime: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  smallMobileClockDate: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // Tablet Styles (768px - 1199px)
  tabletHeaderSection: {
    paddingHorizontal: '2.5%',
    paddingVertical: '1.5%',
  },
  tabletHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabletPageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabletPageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  tabletHeaderSearchButton: {
    padding: 8,
  },
  tabletHeaderSearchContainer: {
    paddingHorizontal: 14,
    width: 250,
    minWidth: 180,
  },
  tabletHeaderSearchInput: {
    fontSize: 16,
    paddingVertical: 10,
  },
  tabletHeaderSearchCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  tabletHeaderActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-start',
  },
  tabletSetWorkingTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabletSetWorkingTimeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabletTabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabletTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
  },
  tabletTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabletControlsSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabletSearchContainer: {
    // No additional styles needed
  },
  tabletSearchInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabletSearchInput: {
    fontSize: 16,
    paddingVertical: 10,
  },
  tabletHeaderRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletClockContainer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
    minWidth: 180,
  },
  tabletAnalogClock: {
    width: 60,
    height: 60,
  },
  tabletClockFace: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
  },
  tabletHourHand: {
    position: 'absolute',
    width: 3.5,
    height: 18,
    backgroundColor: '#1E3A5F',
    borderRadius: 1.75,
    top: 13,
    left: 28.25,
    transformOrigin: '50% 100%',
  },
  tabletMinuteHand: {
    position: 'absolute',
    width: 2.5,
    height: 23,
    backgroundColor: '#1E3A5F',
    borderRadius: 1.25,
    top: 8.5,
    left: 28.75,
    transformOrigin: '50% 100%',
  },
  tabletSecondHand: {
    position: 'absolute',
    width: 1.25,
    height: 26,
    backgroundColor: '#ea4335',
    borderRadius: 0.625,
    top: 4.5,
    left: 29.375,
    transformOrigin: '50% 100%',
  },
  tabletCenterDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#1E3A5F',
    top: 26.5,
    left: 26.5,
  },
  tabletClockTime: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tabletClockDate: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Desktop Styles (1200px+)
  desktopHeaderSection: {
    paddingHorizontal: '2%',
    paddingVertical: '1.5%',
  },
  desktopHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  desktopPageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  desktopPageSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  desktopHeaderSearchButton: {
    padding: 10,
  },
  desktopHeaderSearchContainer: {
    paddingHorizontal: 16,
    width: 300,
    minWidth: 200,
  },
  desktopHeaderSearchInput: {
    fontSize: 18,
    paddingVertical: 12,
  },
  desktopHeaderSearchCloseButton: {
    padding: 6,
    marginLeft: 12,
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'flex-start',
  },
  desktopSetWorkingTimeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopSetWorkingTimeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  desktopTabContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  desktopTabButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
  },
  desktopTabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  desktopControlsSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  desktopSearchContainer: {
    // No additional styles needed
  },
  desktopSearchInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  desktopSearchInput: {
    fontSize: 18,
    paddingVertical: 12,
  },
  desktopHeaderRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopClockContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    minWidth: 200,
  },
  desktopAnalogClock: {
    width: 70,
    height: 70,
  },
  desktopClockFace: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
  },
  desktopClockTime: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  desktopClockDate: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Large Desktop Styles (1440px+)
  largeDesktopContainer: {
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  largeDesktopHeaderSection: {
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  largeDesktopPageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  largeDesktopPageSubtitle: {
    fontSize: 18,
    lineHeight: 28,
  },
  largeDesktopHeaderActions: {
    flexDirection: 'row',
    gap: 20,
  },
  largeDesktopSetWorkingTimeButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  largeDesktopSetWorkingTimeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  largeDesktopTabContainer: {
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  largeDesktopTabButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    flex: 1,
  },
  largeDesktopTabText: {
    fontSize: 18,
    fontWeight: '500',
  },
  largeDesktopControlsSection: {
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  largeDesktopSearchInputContainer: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  largeDesktopSearchInput: {
    fontSize: 20,
    paddingVertical: 14,
  },
  
  // Working Time Modal Styles
  workingTimeModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  workingTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  workingTimeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  workingTimeContent: {
    padding: 24,
  },
  workingTimeDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 24,
  },
  timeInputSection: {
    marginBottom: 24,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E3A5F',
    flex: 1,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1E3A5F',
    width: 80,
    textAlign: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minWidth: 40,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#1E3A5F',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  currentStatus: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  workingTimeStatusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  workingTimeActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E3A5F',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  
  // Disabled Alert Modal Styles
  disabledAlertModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  disabledAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  disabledAlertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  disabledAlertContent: {
    padding: 20,
  },
  disabledAlertMessage: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    textAlign: 'center',
  },
  disabledAlertActions: {
    padding: 20,
    paddingTop: 0,
  },
  disabledAlertButton: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledAlertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Success Modal Styles
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    gap: 12,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  successModalContent: {
    padding: 20,
    paddingTop: 0,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
  },
  successModalActions: {
    padding: 20,
    paddingTop: 10,
  },
  successModalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableContent: {
    paddingBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  desktopHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  desktopTableRow: {
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  cell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  internInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  desktopProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopProfilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  internDetails: {
    flex: 1,
  },
  internName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  desktopInternName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  studentId: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  desktopStudentId: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  department: {
    fontSize: 12,
    color: '#6c757d',
  },
  desktopDepartment: {
    fontSize: 14,
    color: '#6c757d',
  },
  cellText: {
    fontSize: 14,
    color: '#1E3A5F',
    textAlign: 'center',
  },
  desktopCellText: {
    fontSize: 16,
    color: '#1E3A5F',
    textAlign: 'center',
  },
  remainingText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 2,
  },
  desktopRemainingText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
  },
  hoursContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  desktopStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E3A5F',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  desktopProgressText: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
    minHeight: 40,
    zIndex: 5,
  },
  buttonsGrid: {
    flexDirection: 'column',
    gap: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 4,
  },
  detailArrowButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    zIndex: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  attendanceActionButton: {
    paddingHorizontal: '2.5%',
    paddingVertical: '1.5%',
    borderRadius: 16,
    minWidth: 55,
    minHeight: 44, // Accessibility: minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  // Responsive button sizes
  smallMobileAttendanceActionButton: {
    paddingHorizontal: '2%',
    paddingVertical: '1%',
    borderRadius: 12,
    minWidth: 45,
    minHeight: 44, // Accessibility: minimum touch target
  },
  tabletAttendanceActionButton: {
    paddingHorizontal: '3%',
    paddingVertical: '2%',
    borderRadius: 18,
    minWidth: 60,
    minHeight: 44, // Accessibility: minimum touch target
  },
  desktopAttendanceActionButton: {
    paddingHorizontal: '4%',
    paddingVertical: '2.5%',
    borderRadius: 20,
    minWidth: 70,
    minHeight: 44, // Accessibility: minimum touch target
  },
  largeDesktopAttendanceActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    minWidth: 80,
    height: 40,
  },
  presentActionButton: {
    backgroundColor: '#e8f5e8',
    borderColor: '#34a853',
  },
  lateActionButton: {
    backgroundColor: '#fff8e1',
    borderColor: '#fbbc04',
  },
  absentActionButton: {
    backgroundColor: '#ffebee',
    borderColor: '#ea4335',
  },
  leaveActionButton: {
    backgroundColor: '#f3e5f5',
    borderColor: '#9c27b0',
  },
  timeOutActionButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1E3A5F',
  },
  presentButtonText: {
    color: '#34a853',
    fontSize: 12,
    fontWeight: '600',
  },
  lateButtonText: {
    color: '#f57c00',
    fontSize: 12,
    fontWeight: '600',
  },
  absentButtonText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '600',
  },
  leaveButtonText: {
    color: '#7b1fa2',
    fontSize: 12,
    fontWeight: '600',
  },
  timeOutButtonText: {
    color: '#1E3A5F',
    fontSize: 12,
    fontWeight: '600',
  },
  // Responsive button text sizes
  smallMobileButtonText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabletButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  desktopButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  largeDesktopButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowNumber: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '500',
    textAlign: 'left',
  },
  desktopRowNumber: {
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '500',
    textAlign: 'left',
  },
  finalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  finalStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Time Display Styles
  timeDisplayContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeDisplayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeDisplayText: {
    fontSize: 12,
    color: '#1E3A5F',
    marginLeft: 6,
    fontWeight: '500',
  },
  inProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34a853',
    marginRight: 6,
  },
  inProgressText: {
    fontSize: 11,
    color: '#34a853',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#fff',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal Styles
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
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    flex: 1,
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  internDetailCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  attendanceActions: {
    marginTop: 20,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 16,
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  sickButton: {
    backgroundColor: '#ff5722',
  },
  attendanceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Time Controls Section
  timeControlsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  timeControlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  timeControlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timeOutControlButton: {
    backgroundColor: '#ea4335',
  },
  timeInControlButton: {
    backgroundColor: '#34a853',
  },
  timeControlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New Button Styles
  setWorkingTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  setWorkingTimeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingHorizontal: 24,
  },
  tabButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1E3A5F',
  },
  tabText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1E3A5F',
    fontWeight: '600',
  },
  // Time Text Styles
  timeText: {
    fontSize: 14,
    color: '#1E3A5F',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  desktopTimeText: {
    fontSize: 16,
    color: '#1E3A5F',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  // Hours Text Styles
  hoursText: {
    fontSize: 14,
    color: '#1E3A5F',
    textAlign: 'center',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  desktopHoursText: {
    fontSize: 16,
    color: '#1E3A5F',
    textAlign: 'center',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  // Detail Panel Styles
  detailPanelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    backgroundColor: '#f8f9fa',
    zIndex: 1000,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approvedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34a853',
  },
  approvedText: {
    fontSize: 12,
    color: '#34a853',
    fontWeight: '600',
  },
  dayContent: {
    gap: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  timelineBarContainer: {
    position: 'relative',
    height: 40,
    marginVertical: 8,
  },
  timelineBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  timelineSegment: {
    position: 'absolute',
    height: '100%',
    borderRadius: 10,
  },
  timelineMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timelineMarker: {
    flex: 1,
    alignItems: 'center',
  },
  timelineMarkerText: {
    fontSize: 10,
    color: '#6c757d',
  },
  timelineBarEmpty: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  timelineBarEmptyText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  durationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  durationLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  durationValue: {
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: 'bold',
  },
  // Responsive Styles
  mobileContainer: {
    paddingHorizontal: '4%',
  },
  tabletContainer: {
    paddingHorizontal: '3%',
  },
  desktopContainer: {
    paddingHorizontal: '2%',
  },
  
  // Modern Tablet Card Styles
  tabletTimeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tabletTimeContent: {
    flex: 1,
  },
  tabletHoursCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flex: 1,
    marginHorizontal: 4,
  },
  tabletButtonsGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  tabletButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabletActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  // Modern Mobile Card Styles
  mobileTimeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mobileTimeContent: {
    flex: 1,
  },
  mobileHoursCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flex: 1,
    marginHorizontal: 4,
  },
  mobileButtonsGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mobileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 70,
    gap: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // Work Completed Styles
  workCompletedSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  workCompletedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 8,
  },
  workCompletedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  workCompletedTextSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  
  // Date Picker Styles
  headerDateButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  smallMobileHeaderDateButton: {
    padding: 6,
  },
  tabletHeaderDateButton: {
    padding: 7,
  },
  desktopHeaderDateButton: {
    padding: 8,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
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
  datePickerCloseButton: {
    padding: 4,
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  datePickerTodayButton: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  datePickerTodayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
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
    color: '#1E3A5F',
    marginBottom: 20,
  },
  todayButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
  
  // Selected Date Display Styles
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 2,
  },
  dateLoadingIndicator: {
    marginTop: 2,
  },
  smallMobileSelectedDateText: {
    fontSize: 12,
  },
  tabletSelectedDateText: {
    fontSize: 13,
  },
  desktopSelectedDateText: {
    fontSize: 14,
  },
});
