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
import AttendanceVerificationPanel from '../components/AttendanceVerificationPanel';
import SupervisorEvaluationPanel from '../components/SupervisorEvaluationPanel';

const { width, height } = Dimensions.get('window');

interface Intern {
  id: string;
  student_id: string;
  applicationId?: number; // Application ID for finishing internship
  finishedAt?: string | null; // Timestamp when internship was finished
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
  started_at?: string; // Actual start date from applications table
  finished_at?: string; // Actual finish date from applications table
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
  // AM/PM session status tracking (separate from time tracking)
  amStatus?: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
  pmStatus?: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
  totalDailyHours?: number;
  remainingHours?: number;
  remainingDays?: number;
  // Verification fields
  attendanceRecordId?: number;
  verification_status?: 'pending' | 'accepted' | 'denied';
  verified_by?: number;
  verified_at?: string;
  verification_remarks?: string;
  // Daily attendance records
  dailyAttendance?: {
    [date: string]: {
      status: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
      amTimeIn?: string;
      amTimeOut?: string;
      pmTimeIn?: string;
      pmTimeOut?: string;
      amStatus?: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
      pmStatus?: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
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
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<any | null>(null);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<any[]>([]);
  const [selectedInternForVerification, setSelectedInternForVerification] = useState<Intern | null>(null);
  const [verificationPanelSlideAnim] = useState(new Animated.Value(width));
  const [showEvaluationPanel, setShowEvaluationPanel] = useState(false);
  const [selectedInternForEvaluation, setSelectedInternForEvaluation] = useState<Intern | null>(null);
  const [evaluationPanelSlideAnim] = useState(new Animated.Value(width));
  const [companyProfile, setCompanyProfile] = useState<any>(null);
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
  const [companyId, setCompanyId] = useState<string>('');
  
  // Finish internship states
  const [selectedInternIds, setSelectedInternIds] = useState<Set<string>>(new Set());
  const [isFinishingInternships, setIsFinishingInternships] = useState(false);
  const [showFinishValidationModal, setShowFinishValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    unverifiedAttendance: Array<{ name: string; issues: string[] }>;
    incompleteHours: Array<{ name: string; remainingHours: number }>;
  }>({ unverifiedAttendance: [], incompleteHours: [] });
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [detailPanelSlideAnim] = useState(new Animated.Value(width));
  const [detailDateRange, setDetailDateRange] = useState({
    start: new Date(),
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  });
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

  // Load today's attendance and calculate remaining hours when both companyId and interns are available
  useEffect(() => {
    console.log('🔄🔄🔄 Attendance loading effect triggered:', {
      companyId: !!companyId,
      companyIdValue: companyId,
      internsLength: interns.length,
      selectedDate: selectedDate.toISOString(),
      isToday: isSelectedDateToday(),
      shouldLoad: companyId && interns.length > 0,
      timestamp: new Date().toISOString()
    });
    
    if (companyId && interns.length > 0) {
      // Only load today's attendance if selected date is today
      // Otherwise, load attendance for the selected date
      if (isSelectedDateToday()) {
        console.log('🔄🔄🔄 Calling loadTodayAttendance from useEffect (selected date is today)');
      loadTodayAttendance();
      } else {
        console.log('🔄🔄🔄 Calling loadAttendanceForDate from useEffect (selected date is not today)');
        loadAttendanceForDate(selectedDate);
      }
      calculateRemainingHours(); // Calculate remaining hours from all attendance records
      checkAvailableDates(); // Check what dates are available
    } else {
      console.log('🔄🔄🔄 NOT calling load attendance - conditions not met');
    }
  }, [companyId, interns.length, selectedDate]);



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
      await calculateRemainingHours(); // Recalculate remaining hours after attendance update
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
              
              // totalDailyHours is for today only, not cumulative
              const totalDailyHours = attendanceRecord.total_hours || 0;

              const updatedIntern = {
                ...intern,
                amTimeIn: attendanceRecord.am_time_in || '',
                amTimeOut: attendanceRecord.am_time_out || '',
                pmTimeIn: attendanceRecord.pm_time_in || '',
                pmTimeOut: attendanceRecord.pm_time_out || '',
                totalDailyHours: totalDailyHours,
                // remainingHours and remainingDays are calculated separately in calculateRemainingHours()
                currentAttendanceStatus: attendanceRecord.status || 'not_marked',
                // Use the session-specific statuses from the database
                amStatus: attendanceRecord.am_status || 'not_marked',
                pmStatus: attendanceRecord.pm_status || 'not_marked',
                // Verification fields
                attendanceRecordId: attendanceRecord.id,
                verification_status: attendanceRecord.verification_status || 'pending',
                verified_by: attendanceRecord.verified_by || undefined,
                verified_at: attendanceRecord.verified_at || undefined,
                verification_remarks: attendanceRecord.verification_remarks || undefined
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

  // Calculate remaining hours for all interns based on cumulative attendance
  const calculateRemainingHours = async () => {
    if (!companyId || interns.length === 0) {
      console.log('⏳ Company ID or interns not available, skipping remaining hours calculation');
      return;
    }
    
    try {
      console.log('📊 Calculating remaining hours for all interns...');
      
      // Calculate remaining hours for each intern
      const updatedInterns = await Promise.all(
        interns.map(async (intern) => {
          try {
            // Get ALL attendance records for this intern (not just today)
            const attendanceResponse = await apiService.getAttendanceRecords(
              companyId,
              currentUser.id,
              { internId: intern.student_id }
            );

            if (attendanceResponse.success && Array.isArray(attendanceResponse.data)) {
              // Calculate total accumulated hours from ALL attendance records
              const totalAccumulatedHours = attendanceResponse.data.reduce((sum: number, record: any) => {
                return sum + (parseFloat(record.total_hours) || 0);
              }, 0);

              // Get total required hours from intern's totalHours (already parsed from hours_of_internship)
              const totalRequiredHours = intern.totalHours || 0;

              // Calculate remaining hours
              const remainingHours = Math.max(0, totalRequiredHours - totalAccumulatedHours);
              const remainingDays = Math.ceil(remainingHours / 8);

              console.log(`📊 Intern ${intern.first_name} ${intern.last_name}:`, {
                totalRequiredHours,
                totalAccumulatedHours,
                remainingHours,
                remainingDays
              });

              return {
                ...intern,
                remainingHours: totalRequiredHours > 0 ? remainingHours : undefined,
                remainingDays: totalRequiredHours > 0 ? remainingDays : undefined
              };
            }

            return intern;
          } catch (error) {
            console.error(`⚠️ Error calculating hours for intern ${intern.id}:`, error);
            return intern;
          }
        })
      );

      setInterns(updatedInterns);
      console.log('✅ Remaining hours calculated for all interns');
    } catch (error) {
      console.error('⚠️ Error calculating remaining hours:', error);
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
              
              const updatedIntern: Intern = {
                ...intern,
                amTimeIn: attendanceRecord.am_time_in || '',
                amTimeOut: attendanceRecord.am_time_out || '',
                pmTimeIn: attendanceRecord.pm_time_in || '',
                pmTimeOut: attendanceRecord.pm_time_out || '',
                totalDailyHours: attendanceRecord.total_hours || 0,
                currentAttendanceStatus: (attendanceRecord.status || 'not_marked') as 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked',
                // Use the session-specific statuses from the database
                amStatus: (attendanceRecord.am_status || 'not_marked') as 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked',
                pmStatus: (attendanceRecord.pm_status || 'not_marked') as 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked',
                // Verification fields
                attendanceRecordId: attendanceRecord.id,
                verification_status: (attendanceRecord.verification_status || 'pending') as 'pending' | 'accepted' | 'denied',
                verified_by: attendanceRecord.verified_by || undefined,
                verified_at: attendanceRecord.verified_at || undefined,
                verification_remarks: attendanceRecord.verification_remarks || undefined
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
                amStatus: 'not_marked' as const,
                pmStatus: 'not_marked' as const,
                totalDailyHours: 0,
                currentAttendanceStatus: 'not_marked' as const
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

  // Validate working hours before saving
  const validateWorkingHours = (): { isValid: boolean; errorMessage?: string } => {
    const { startTime, startPeriod, endTime, endPeriod, breakStart, breakStartPeriod, breakEnd, breakEndPeriod } = workingHours;
    
    // 1. Time format validation (HH:MM)
    const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeFormatRegex.test(startTime) || !timeFormatRegex.test(endTime) || 
        !timeFormatRegex.test(breakStart) || !timeFormatRegex.test(breakEnd)) {
      return { isValid: false, errorMessage: 'Please enter times in HH:MM format (e.g., 07:00, 11:30)' };
    }

    // 2. Parse times to minutes for comparison
    const startMinutes = convertTo24Hour(startTime, startPeriod);
    const endMinutes = convertTo24Hour(endTime, endPeriod);
    const breakStartMinutes = convertTo24Hour(breakStart, breakStartPeriod);
    const breakEndMinutes = convertTo24Hour(breakEnd, breakEndPeriod);

    // 3. Check if end time is after start time (handle midnight crossover)
    let totalWorkingMinutes = endMinutes - startMinutes;
    if (totalWorkingMinutes < 0) {
      // If negative, it means it spans midnight (e.g., 7 PM to 7 AM next day)
      totalWorkingMinutes += 24 * 60; // Add 24 hours
    }
    
    // 4. Validate minimum working hours (at least 1 hour)
    if (totalWorkingMinutes < 60) {
      return { isValid: false, errorMessage: 'Working hours must be at least 1 hour long' };
    }

    // 5. Validate maximum working hours (no more than 16 hours)
    if (totalWorkingMinutes > 16 * 60) {
      return { isValid: false, errorMessage: 'Working hours cannot exceed 16 hours per day' };
    }

    // 6. Validate break time is within working hours
    // Check if break start is after work start
    let breakStartRelative = breakStartMinutes - startMinutes;
    if (breakStartRelative < 0) {
      breakStartRelative += 24 * 60; // Handle midnight crossover
    }
    
    // Check if break end is before work end
    let breakEndRelative = breakEndMinutes - startMinutes;
    if (breakEndRelative < 0) {
      breakEndRelative += 24 * 60; // Handle midnight crossover
    }
    
    if (breakStartRelative < 0 || breakStartRelative > totalWorkingMinutes) {
      return { isValid: false, errorMessage: 'Lunch break start time must be within working hours' };
    }
    
    if (breakEndRelative < 0 || breakEndRelative > totalWorkingMinutes) {
      return { isValid: false, errorMessage: 'Lunch break end time must be within working hours' };
    }

    // 7. Validate break start is before break end
    let breakDuration = breakEndMinutes - breakStartMinutes;
    if (breakDuration < 0) {
      breakDuration += 24 * 60; // Handle midnight crossover
    }
    
    if (breakDuration <= 0) {
      return { isValid: false, errorMessage: 'Lunch break end time must be after break start time' };
    }

    // 8. Validate minimum break duration (at least 30 minutes)
    if (breakDuration < 30) {
      return { isValid: false, errorMessage: 'Lunch break must be at least 30 minutes long' };
    }
    
    // 9. Validate break doesn't overlap with start/end times
    if (breakStartRelative === 0) {
      return { isValid: false, errorMessage: 'Lunch break cannot start at the same time as work start' };
    }
    
    if (breakEndRelative >= totalWorkingMinutes) {
      return { isValid: false, errorMessage: 'Lunch break cannot end at or after work end time' };
    }

    return { isValid: true };
  };

  // Save working hours to backend
  const saveWorkingHours = async () => {
    if (!companyId) {
      Alert.alert('Error', 'Company information not loaded. Please try again.');
      return;
    }
    
    // Validate working hours before saving
    const validation = validateWorkingHours();
    if (!validation.isValid) {
      Alert.alert('Invalid Working Hours', validation.errorMessage || 'Please check your working hours settings.');
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

  // Handle verification panel
  const openVerificationPanel = async (intern: Intern) => {
    console.log('🔍 openVerificationPanel called for intern:', intern.first_name, intern.last_name);
    console.log('🔍 companyId:', companyId, 'currentUser.id:', currentUser.id);
    
    if (!companyId || !currentUser.id) {
      console.log('❌ Missing companyId or currentUser.id');
      Alert.alert('Error', 'Company information not available. Please refresh the page.');
      return;
    }

    try {
      // Fetch ALL attendance records for this intern (not just selected date)
      console.log('🔍 Fetching ALL attendance records for internId:', intern.student_id);
      
      const response = await apiService.getAttendanceRecords(companyId, currentUser.id, {
        internId: intern.student_id
        // No date filter - get all records
      });

      console.log('🔍 Attendance response:', response);

      if (response.success && response.data && response.data.length > 0) {
        // Sort by date (most recent first)
        const sortedRecords = response.data.sort((a: any, b: any) => {
          const dateA = new Date(a.attendance_date).getTime();
          const dateB = new Date(b.attendance_date).getTime();
          return dateB - dateA; // Most recent first
        });
        
        // Add intern info to each record
        const recordsWithInternInfo = sortedRecords.map((record: any) => ({
          ...record,
          first_name: intern.first_name,
          last_name: intern.last_name,
          profile_picture: intern.student_profile_picture,
        }));
        
        // Set all records and the first record (most recent) as selected by default
        setAllAttendanceRecords(recordsWithInternInfo);
        setSelectedAttendanceRecord(recordsWithInternInfo[0]);
        setSelectedInternForVerification(intern);
        setShowVerificationPanel(true);
        Animated.timing(verificationPanelSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        console.log('ℹ️ No attendance records found');
        Alert.alert('Info', 'No attendance records found for this intern.');
      }
    } catch (error) {
      console.error('❌ Error fetching attendance records:', error);
      Alert.alert('Error', 'Failed to load attendance records. Please try again.');
    }
  };

  const closeVerificationPanel = () => {
    Animated.timing(verificationPanelSlideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowVerificationPanel(false);
      setSelectedAttendanceRecord(null);
    });
  };

  // Evaluation Panel handlers
  const openEvaluationPanel = async (intern: Intern) => {
    if (!intern.finishedAt) {
      Alert.alert('Cannot Evaluate', 'This intern has not completed their internship yet.');
      return;
    }

    // Fetch company profile if not already loaded
    if (!companyProfile) {
      try {
        const response = await apiService.getCompanyProfileByUserId(currentUser.id);
        if (response.success && response.user) {
          setCompanyProfile({
            company_name: response.user.company_name,
            address: response.user.address,
            city: response.user.city || '',
            zip: response.user.zip || '',
            phone_number: response.user.phone_number,
            contact_person: response.user.contact_person,
          });
        }
      } catch (error) {
        console.error('Error fetching company profile:', error);
      }
    }

    setSelectedInternForEvaluation(intern);
    setShowEvaluationPanel(true);
    Animated.timing(evaluationPanelSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeEvaluationPanel = () => {
    Animated.timing(evaluationPanelSlideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowEvaluationPanel(false);
      setSelectedInternForEvaluation(null);
    });
  };

  const handleVerificationComplete = async () => {
    // Refresh attendance data after verification
    if (isSelectedDateToday()) {
      await loadTodayAttendance();
    } else {
      await loadAttendanceForDate(selectedDate);
    }
    closeVerificationPanel();
  };

  // Checkbox selection handlers
  const toggleInternSelection = (internId: string) => {
    const intern = interns.find(i => i.id === internId);
    // Don't allow selection of finished internships
    if (intern?.finishedAt) {
      return;
    }
    
    setSelectedInternIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(internId)) {
        newSet.delete(internId);
      } else {
        newSet.add(internId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredInternsByDate();
    // Filter out finished internships from selection
    const unfinishedInterns = filtered.filter(intern => !intern.finishedAt);
    const allSelected = unfinishedInterns.length > 0 && unfinishedInterns.every(intern => selectedInternIds.has(intern.id));
    
    if (allSelected) {
      // Deselect all
      setSelectedInternIds(new Set());
    } else {
      // Select all unfinished interns
      setSelectedInternIds(new Set(unfinishedInterns.map(intern => intern.id)));
    }
  };

  // Validate interns before finishing
  const validateInternsForFinishing = async (internIds: string[]): Promise<{
    isValid: boolean;
    unverifiedAttendance: Array<{ name: string; issues: string[] }>;
    incompleteHours: Array<{ name: string; remainingHours: number }>;
  }> => {
    const unverifiedAttendance: Array<{ name: string; issues: string[] }> = [];
    const incompleteHours: Array<{ name: string; remainingHours: number }> = [];

    for (const internId of internIds) {
      const intern = interns.find(i => i.id === internId);
      if (!intern) continue;

      // Skip if already finished
      if (intern.finishedAt) {
        continue;
      }

      const internName = `${intern.first_name} ${intern.last_name}`;
      const issues: string[] = [];

      // Check if hours are complete
      if (intern.remainingHours !== undefined && intern.remainingHours > 0) {
        incompleteHours.push({
          name: internName,
          remainingHours: intern.remainingHours
        });
      }

      // Check all attendance records are accepted
      try {
        const attendanceResponse = await apiService.getAttendanceRecords(
          companyId,
          currentUser.id,
          { internId: intern.student_id }
        );

        if (attendanceResponse.success && Array.isArray(attendanceResponse.data)) {
          const records = attendanceResponse.data;
          const pendingRecords = records.filter((r: any) => r.verification_status === 'pending');
          const deniedRecords = records.filter((r: any) => r.verification_status === 'denied');

          if (pendingRecords.length > 0) {
            issues.push(`${pendingRecords.length} pending attendance record(s)`);
          }
          if (deniedRecords.length > 0) {
            issues.push(`${deniedRecords.length} denied attendance record(s)`);
          }

          if (issues.length > 0) {
            unverifiedAttendance.push({ name: internName, issues });
          }
        }
      } catch (error) {
        console.error(`Error validating intern ${internId}:`, error);
        issues.push('Error checking attendance records');
        unverifiedAttendance.push({ name: internName, issues });
      }
    }

    return {
      isValid: unverifiedAttendance.length === 0 && incompleteHours.length === 0,
      unverifiedAttendance,
      incompleteHours
    };
  };

  // Handle finish internships
  const handleFinishInternships = async () => {
    const selectedIds = Array.from(selectedInternIds);
    
    if (selectedIds.length === 0) {
      Alert.alert('No Selection', 'Please select at least one intern to finish their internship.');
      return;
    }

    // Validate interns
    setIsFinishingInternships(true);
    const validation = await validateInternsForFinishing(selectedIds);
    setIsFinishingInternships(false);

    if (!validation.isValid) {
      setValidationErrors(validation);
      setShowFinishValidationModal(true);
      return;
    }

    // Show confirmation modal
    setShowFinishConfirmModal(true);
  };

  const handleConfirmFinishInternships = async () => {
    const selectedIds = Array.from(selectedInternIds);
    setShowFinishConfirmModal(false);
    setIsFinishingInternships(true);

    try {
      const finishPromises = selectedIds.map(async (internId) => {
        const intern = interns.find(i => i.id === internId);
        if (!intern || !intern.applicationId) {
          throw new Error(`Intern ${internId} not found or missing application ID`);
        }

        const response = await apiService.finishInternship(
          intern.applicationId.toString(),
          companyId
        );

        if (!response.success) {
          throw new Error(response.message || 'Failed to finish internship');
        }

        return { internId, success: true, internName: `${intern.first_name} ${intern.last_name}` };
      });

      const results = await Promise.allSettled(finishPromises);
      const successful: string[] = [];
      const failed: Array<{ name: string; error: string }> = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successful.push(result.value.internName);
        } else {
          const intern = interns.find(i => i.id === selectedIds[index]);
          failed.push({
            name: intern ? `${intern.first_name} ${intern.last_name}` : 'Unknown',
            error: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : 'Failed'
          });
        }
      });

      // Clear selection
      setSelectedInternIds(new Set());

      // Refresh interns list
      await fetchInterns();
      await loadTodayAttendance();
      await calculateRemainingHours();

      // Show success/error message
      if (successful.length > 0 && failed.length === 0) {
        setSuccessMessage(`Successfully finished internships for ${successful.length} intern(s): ${successful.join(', ')}`);
        setShowSuccessModal(true);
      } else if (successful.length > 0 && failed.length > 0) {
        setSuccessMessage(
          `Finished ${successful.length} internship(s) successfully. ` +
          `Failed for ${failed.length} intern(s): ${failed.map(f => f.name).join(', ')}`
        );
        setShowSuccessModal(true);
      } else {
        Alert.alert(
          'Error',
          `Failed to finish internships: ${failed.map(f => `${f.name} - ${f.error}`).join(', ')}`
        );
      }
    } catch (error: any) {
      console.error('Error finishing internships:', error);
      Alert.alert('Error', error.message || 'Failed to finish internships. Please try again.');
    } finally {
      setIsFinishingInternships(false);
    }
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
          applicationId: app.id, // Store application ID for finishing internship
          finishedAt: app.finished_at || null, // Store finished_at timestamp
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
          started_at: app.started_at, // Actual start date from applications table
          finished_at: app.finished_at, // Actual finish date from applications table
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
          // Parse hours_of_internship (e.g., "136 hours" -> 136)
          totalHours: (() => {
            if (!app.hours_of_internship) return 0;
            const match = app.hours_of_internship.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) || 0 : 0;
          })(),
          currentAttendanceStatus: 'not_marked' as const,
          amTimeIn: '',
          amTimeOut: '',
          pmTimeIn: '',
          pmTimeOut: '',
          totalDailyHours: 0,
          remainingHours: undefined, // Will be calculated after fetching attendance records
          remainingDays: undefined, // Will be calculated after fetching attendance records
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
        
        // Handle undefined and null values
        if ((aValue === undefined || aValue === null) && (bValue === undefined || bValue === null)) return 0;
        if (aValue === undefined || aValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bValue === undefined || bValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue! < bValue!) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue! > bValue!) {
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

  // Removed handleAttendanceToggle - students now submit their own attendance

  // Removed handleTimeOut - students now submit their own attendance times
  const handleTimeOut_removed = async (internId: string) => {
    console.log('🕐 ===== TIMEOUT FUNCTION STARTED =====');
    console.log('🕐 Time Out button clicked for intern:', internId);
    
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Manila',
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    console.log('🕐 Current time:', currentTime);
    console.log('🕐 Current interns state before update:', interns.map(i => ({
      id: i.id,
      name: i.first_name + ' ' + i.last_name,
      amTimeIn: i.amTimeIn,
      amTimeOut: i.amTimeOut,
      pmTimeIn: i.pmTimeIn,
      pmTimeOut: i.pmTimeOut,
      amStatus: i.amStatus,
      pmStatus: i.pmStatus
    })));
    console.log('🕐 Interns before update:', interns.find(i => i.id === internId));
    
    // Store updated values for backend save
    let updatedTimeValues: {
      amTimeOut: string;
      pmTimeOut: string;
      totalDailyHours: number;
      remainingHours: number;
      remainingDays: number;
      currentAttendanceStatus: string;
    } | null = null;

    setInterns(prevInterns => {
      const updatedInterns = prevInterns.map(intern => {
        if (intern.id === internId) {
          console.log('🕐 Processing time out for intern:', intern.first_name, intern.last_name);
          // Determine which session to update - allow time out anytime if there's a time in
          const hasAMTimeIn = intern.amTimeIn && intern.amTimeIn !== '--:--' && (!intern.amTimeOut || intern.amTimeOut === '' || intern.amTimeOut === '--:--');
          const hasPMTimeIn = intern.pmTimeIn && intern.pmTimeIn !== '--:--' && (!intern.pmTimeOut || intern.pmTimeOut === '' || intern.pmTimeOut === '--:--');
          
          // Check if PM is absent - if so, don't allow timeout
          const isPMAbsent = intern.pmStatus && (intern.pmStatus === 'absent' || intern.pmStatus === 'leave' || intern.pmStatus === 'sick');
          const isAMAbsent = intern.amStatus && (intern.amStatus === 'absent' || intern.amStatus === 'leave' || intern.amStatus === 'sick');
          
          // If there's any time in, allow time out (regardless of working hours)
          const canTimeOut = (hasAMTimeIn && !isAMAbsent) || (hasPMTimeIn && !isPMAbsent);
          
          console.log('🕐 ===== SESSION DETERMINATION =====');
          console.log('🕐 AM Time In:', intern.amTimeIn, 'AM Time Out:', intern.amTimeOut, 'Has AM Time In:', hasAMTimeIn);
          console.log('🕐 PM Time In:', intern.pmTimeIn, 'PM Time Out:', intern.pmTimeOut, 'Has PM Time In:', hasPMTimeIn);
          console.log('🕐 AM Status:', intern.amStatus, 'PM Status:', intern.pmStatus);
          console.log('🕐 Is AM Absent:', isAMAbsent, 'Is PM Absent:', isPMAbsent);
          console.log('🕐 Can Time Out:', canTimeOut);
          
          if (canTimeOut) {
            console.log('🕐 Processing time out for session');
          // Parse 12-hour format times
          const parseTime = (timeStr: string) => {
            // Handle empty or placeholder times
            if (!timeStr || timeStr === '--:--' || timeStr === '' || timeStr === '00:00') {
              throw new Error(`Invalid time format: ${timeStr}`);
            }
            
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
            
            // Determine which session to update - prioritize the session that needs time out
            // Only update one session at a time to prevent double timeouts
            if (hasAMTimeIn && !isAMAbsent) {
              updateAM = true;
              const timeInDate = parseTime(intern.amTimeIn!);
              const timeOutDate = parseTime(currentTime);
              sessionHours = Math.max(0, (timeOutDate.getTime() - timeInDate.getTime()) / (1000 * 60 * 60));
              console.log('🕐 ===== UPDATING AM SESSION =====');
              console.log('🕐 AM Time In:', intern.amTimeIn, 'AM Time Out:', currentTime, 'Hours:', sessionHours);
            } else if (hasPMTimeIn && !isPMAbsent) {
              updatePM = true;
              const timeInDate = parseTime(intern.pmTimeIn!);
              const timeOutDate = parseTime(currentTime);
              sessionHours = Math.max(0, (timeOutDate.getTime() - timeInDate.getTime()) / (1000 * 60 * 60));
              console.log('🕐 ===== UPDATING PM SESSION =====');
              console.log('🕐 PM Time In:', intern.pmTimeIn, 'PM Time Out:', currentTime, 'Hours:', sessionHours);
            } else {
              console.log('🕐 ===== NO SESSION TO UPDATE =====');
              console.log('🕐 Reason: hasAMTimeIn:', hasAMTimeIn, 'isAMAbsent:', isAMAbsent, 'hasPMTimeIn:', hasPMTimeIn, 'isPMAbsent:', isPMAbsent);
            }
            
            // Calculate new total daily hours
            const newTotalDailyHours = (intern.totalDailyHours || 0) + sessionHours;
            // Calculate remaining hours as: Total Internship Hours - Total Daily Hours
            const totalInternshipHours = intern.totalHours || 0;
            const newRemainingHours = Math.max(0, totalInternshipHours - newTotalDailyHours);
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
            
            // Store updated values for backend save
            updatedTimeValues = {
              amTimeOut: newIntern.amTimeOut || '--:--',
              pmTimeOut: newIntern.pmTimeOut || '--:--',
              totalDailyHours: newIntern.totalDailyHours || 0,
              remainingHours: newIntern.remainingHours || 0,
              remainingDays: newIntern.remainingDays || 0,
              currentAttendanceStatus: newIntern.currentAttendanceStatus || 'present'
            };
            
          return newIntern;
        }
        }
        return intern;
      });
      
      return updatedInterns;
    });

    // Backend save logic - use setTimeout to ensure state is updated
    setTimeout(async () => {
      try {
        console.log('🔄 ===== BACKEND SAVE PROCESS STARTED =====');
        console.log('🔄 Starting backend save process...');
        console.log('🔄 Company ID available:', !!companyId, 'Value:', companyId);
        console.log('🔄 Current User ID:', currentUser.id, 'Type:', typeof currentUser.id);
        
        if (companyId && updatedTimeValues) {
          // Get the intern data for backend save
          const intern = interns.find(i => i.id === internId);
          if (intern) {
            console.log('🔄 Backend save: Using updated time values:', {
              name: intern.first_name + ' ' + intern.last_name,
              amTimeIn: intern.amTimeIn,
              amTimeOut: updatedTimeValues.amTimeOut,
              pmTimeIn: intern.pmTimeIn,
              pmTimeOut: updatedTimeValues.pmTimeOut,
              totalDailyHours: updatedTimeValues.totalDailyHours
            });
            
            // Use the updated values from the stored values
            const updatedAmTimeOut = updatedTimeValues.amTimeOut;
            const updatedPmTimeOut = updatedTimeValues.pmTimeOut;
            
            console.log('🔄 DEBUG: Updated time values:', {
              updatedAmTimeOut,
              updatedPmTimeOut,
              currentTime
            });
            
            // Calculate total hours for backend save
            const parseTime = (timeStr: string) => {
              console.log('🕐 Parsing time:', timeStr);
              
              // Handle empty or placeholder times
              if (!timeStr || timeStr === '--:--' || timeStr === '' || timeStr === '00:00') {
                console.error('❌ Invalid time format:', timeStr);
                throw new Error(`Invalid time format: ${timeStr}`);
              }
              
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
            if (intern.amTimeIn && intern.amTimeIn !== '--:--' && updatedAmTimeOut && updatedAmTimeOut !== '--:--') {
              const amTimeInDate = parseTime(intern.amTimeIn);
              const amTimeOutDate = parseTime(updatedAmTimeOut);
              const amHours = Math.max(0.0167, (amTimeOutDate.getTime() - amTimeInDate.getTime()) / (1000 * 60 * 60)); // Minimum 1 minute
              totalHours += amHours;
              
              console.log('🕐 AM session calculation:', {
                amTimeIn: intern.amTimeIn,
                amTimeOut: updatedAmTimeOut,
                amTimeInDate: isNaN(amTimeInDate.getTime()) ? 'Invalid Date' : amTimeInDate.toISOString(),
                amTimeOutDate: isNaN(amTimeOutDate.getTime()) ? 'Invalid Date' : amTimeOutDate.toISOString(),
                timeDiffMs: amTimeOutDate.getTime() - amTimeInDate.getTime(),
                amHours: amHours,
                totalHours: totalHours
              });
            }
            
            // Calculate PM session hours
            if (intern.pmTimeIn && intern.pmTimeIn !== '--:--' && updatedPmTimeOut && updatedPmTimeOut !== '--:--') {
              const pmTimeInDate = parseTime(intern.pmTimeIn);
              const pmTimeOutDate = parseTime(updatedPmTimeOut);
              const pmHours = Math.max(0.0167, (pmTimeOutDate.getTime() - pmTimeInDate.getTime()) / (1000 * 60 * 60)); // Minimum 1 minute
              totalHours += pmHours;
              
              console.log('🕐 PM session calculation:', {
                pmTimeIn: intern.pmTimeIn,
                pmTimeOut: updatedPmTimeOut,
                pmTimeInDate: isNaN(pmTimeInDate.getTime()) ? 'Invalid Date' : pmTimeInDate.toISOString(),
                pmTimeOutDate: isNaN(pmTimeOutDate.getTime()) ? 'Invalid Date' : pmTimeOutDate.toISOString(),
                timeDiffMs: pmTimeOutDate.getTime() - pmTimeInDate.getTime(),
                pmHours: pmHours,
                totalHours: totalHours
              });
            }
            
            console.log('🕐 Time out calculation for backend save:', {
              currentTime,
              updatedAmTimeOut,
              updatedPmTimeOut,
              totalHours,
              totalHoursType: typeof totalHours,
              totalHoursIsNaN: isNaN(totalHours)
            });
            
            // Prepare attendance data for backend
            const currentDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
            console.log('📅 Date calculation for attendance:', {
              currentDate: currentDate,
              currentTime: new Date().toISOString(),
              manilaTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
            });
            
            const attendanceData = {
              internId: intern.student_id,
              attendanceDate: currentDate,
              status: (updatedTimeValues.currentAttendanceStatus === 'not_marked' ? 'present' : updatedTimeValues.currentAttendanceStatus) as 'present' | 'absent' | 'late' | 'leave' | 'sick',
              amTimeIn: intern.amTimeIn || '--:--',
              amTimeOut: updatedAmTimeOut || '--:--',
              pmTimeIn: intern.pmTimeIn || '--:--',
              pmTimeOut: updatedPmTimeOut || '--:--',
              amStatus: intern.amStatus || 'not_marked',
              pmStatus: intern.pmStatus || 'not_marked',
              totalHours: totalHours,
              totalDailyHours: updatedTimeValues.totalDailyHours,
              remainingHours: updatedTimeValues.remainingHours,
              remainingDays: updatedTimeValues.remainingDays
            };
            
            console.log('📊 Saving time out record:', {
              internId: attendanceData.internId,
              attendanceDate: attendanceData.attendanceDate,
              amTimeIn: attendanceData.amTimeIn,
              amTimeOut: attendanceData.amTimeOut,
              pmTimeIn: attendanceData.pmTimeIn,
              pmTimeOut: attendanceData.pmTimeOut,
              amStatus: attendanceData.amStatus,
              pmStatus: attendanceData.pmStatus,
              totalHours: attendanceData.totalHours
            });
            
            try {
              console.log('📊 ===== MAKING API CALL =====');
              console.log('📊 Making API call to save attendance record...');
              console.log('📊 API Call Details:', {
                companyId: companyId,
                userId: currentUser.id,
                attendanceData: attendanceData
              });
              
              const response = await apiService.saveAttendanceRecord(companyId, currentUser.id, attendanceData);
              console.log('📊 ===== API RESPONSE RECEIVED =====');
              console.log('📊 API Response received:', response);
              console.log('📊 Response type:', typeof response);
              console.log('📊 Response keys:', response ? Object.keys(response) : 'No response object');
              
              if (response && response.success) {
                console.log('✅ ===== BACKEND SAVE SUCCESSFUL =====');
                console.log('✅ Time out record saved successfully');
                console.log('✅ Response details:', response);
                
                setSuccessMessage(`Time out recorded at ${currentTime}`);
                setShowSuccessModal(true);
                
                // Refresh attendance data to ensure UI shows latest backend data
                await refreshAttendanceData();
                await calculateRemainingHours(); // Recalculate remaining hours after attendance update
              } else {
                console.log('❌ ===== BACKEND SAVE FAILED =====');
                console.log('❌ Response indicates failure:', response);
                setSuccessMessage('Failed to save time out record. Please try again.');
                setShowSuccessModal(true);
              }
            } catch (apiError) {
              console.error('❌ ===== API CALL ERROR =====');
              console.error('❌ API call failed:', apiError);
              console.error('❌ Error type:', typeof apiError);
              console.error('❌ Error message:', apiError instanceof Error ? apiError.message : 'Unknown error');
              console.error('❌ Error stack:', apiError instanceof Error ? apiError.stack : 'No stack trace');
              setSuccessMessage('Network error. Please check your connection and try again.');
              setShowSuccessModal(true);
            }
          }
        } else {
          console.log('📊 Company ID not available, skipping backend save');
        }
      } catch (error) {
        console.error('❌ ===== MAIN TIMEOUT ERROR =====');
        console.error('📊 Error saving time out record:', error);
        console.error('❌ Error type:', typeof error);
        console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      }
    }, 100); // Small delay to ensure state is updated
    
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

  // Check if current time is within AM working hours (before break)
  const isWithinAMWorkingHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const startMinutes = convertTo24Hour(workingHours.startTime, workingHours.startPeriod);
    const breakStartMinutes = convertTo24Hour(workingHours.breakStart, workingHours.breakStartPeriod);
    
    const currentMinutes = currentHour * 60 + currentMinute;
    
    return currentMinutes >= startMinutes && currentMinutes < breakStartMinutes;
  };

  // Check if current time is within PM working hours (after break)
  const isWithinPMWorkingHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const breakEndMinutes = convertTo24Hour(workingHours.breakEnd, workingHours.breakEndPeriod);
    const endMinutes = convertTo24Hour(workingHours.endTime, workingHours.endPeriod);
    
    const currentMinutes = currentHour * 60 + currentMinute;
    
    return currentMinutes >= breakEndMinutes && currentMinutes <= endMinutes;
  };

  // Check if AM session is completed (has both time in and time out)
  const isAMSessionCompleted = (intern: Intern) => {
    // AM session is completed if:
    // 1. Present/Late: has both time in and time out
    // 2. Absent/Leave: has status but no time tracking needed
    const hasTimeTracking = intern.amTimeIn && intern.amTimeOut && 
                           intern.amTimeOut !== '' && intern.amTimeOut !== '--:--';
    const hasStatusOnly = intern.amStatus && 
                         (intern.amStatus === 'absent' || intern.amStatus === 'leave' || intern.amStatus === 'sick');
    
    return hasTimeTracking || hasStatusOnly;
  };

  // Check if PM session is completed (has both time in and time out)
  const isPMSessionCompleted = (intern: Intern) => {
    // PM session is completed if:
    // 1. Present/Late: has both time in and time out
    // 2. Absent/Leave: has status but no time tracking needed
    const hasTimeTracking = intern.pmTimeIn && intern.pmTimeOut && 
                           intern.pmTimeOut !== '' && intern.pmTimeOut !== '--:--';
    const hasStatusOnly = intern.pmStatus && 
                         (intern.pmStatus === 'absent' || intern.pmStatus === 'leave' || intern.pmStatus === 'sick');
    
    return hasTimeTracking || hasStatusOnly;
  };

  // Check if the selected date is today
  const isSelectedDateToday = () => {
    const today = new Date();
    const selected = new Date(selectedDate);
    
    return today.getFullYear() === selected.getFullYear() &&
           today.getMonth() === selected.getMonth() &&
           today.getDate() === selected.getDate();
  };

  // Check if AM session is in progress (has time in but no time out)
  const isAMSessionInProgress = (intern: Intern) => {
    return intern.amTimeIn && (!intern.amTimeOut || intern.amTimeOut === '' || intern.amTimeOut === '--:--');
  };

  // Check if PM session is in progress (has time in but no time out)
  const isPMSessionInProgress = (intern: Intern) => {
    return intern.pmTimeIn && (!intern.pmTimeOut || intern.pmTimeOut === '' || intern.pmTimeOut === '--:--');
  };

  const isButtonDisabled = (intern: Intern, buttonType: 'present' | 'absent' | 'late' | 'leave') => {
    // Check if work is fully completed (both AM and PM sessions done)
    if (isAMSessionCompleted(intern) && isPMSessionCompleted(intern)) {
      return true; // Disable all buttons when work is done
    }
    
    // Determine which session we're in based on current time
    const isAMTime = isWithinAMWorkingHours();
    const isPMTime = isWithinPMWorkingHours();
    
    // If neither AM nor PM working hours, disable all buttons
    if (!isAMTime && !isPMTime) {
      return true;
    }
    
    // AM Session Logic
    if (isAMTime) {
      // If AM session is already completed, disable AM buttons
      if (isAMSessionCompleted(intern)) {
        return true;
      }
      
      // If AM session is in progress (time in but no time out), disable AM buttons
      if (isAMSessionInProgress(intern)) {
        return true;
      }
      
      // If intern has AM status (absent/leave/sick), disable AM buttons
      if (intern.amStatus && 
          (intern.amStatus === 'absent' || intern.amStatus === 'leave' || intern.amStatus === 'sick')) {
        return true;
      }
    }
    
    // PM Session Logic - PM buttons work independently of AM status
    if (isPMTime) {
      // If PM session is already completed, disable PM buttons
      if (isPMSessionCompleted(intern)) {
        return true;
      }
      
      // If PM session is in progress (time in but no time out), disable PM buttons
      if (isPMSessionInProgress(intern)) {
        return true;
      }
      
      // If intern has PM status (absent/leave/sick), disable PM buttons
      if (intern.pmStatus && 
          (intern.pmStatus === 'absent' || intern.pmStatus === 'leave' || intern.pmStatus === 'sick')) {
        return true;
      }
    }
    
    // Enable buttons if we're in the appropriate working hours and session is not completed/in progress
    return false;
  };

  const handleDisabledButtonPress = (intern: Intern, buttonType: 'present' | 'absent' | 'late' | 'leave') => {
    let reason = '';
    
    // Check if work is fully completed
    if (isAMSessionCompleted(intern) && isPMSessionCompleted(intern)) {
      reason = `${intern.first_name} ${intern.last_name} has completed work for today. Both AM and PM sessions are finished.`;
    } else {
      // Check if outside working hours
      const isAMTime = isWithinAMWorkingHours();
      const isPMTime = isWithinPMWorkingHours();
      
      if (!isAMTime && !isPMTime) {
        const now = new Date();
        const currentTimeString = now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour12: true,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        reason = `Attendance is disabled outside working hours.\n\nAM Session: ${workingHours.startTime} ${workingHours.startPeriod} - ${workingHours.breakStart} ${workingHours.breakStartPeriod}\nPM Session: ${workingHours.breakEnd} ${workingHours.breakEndPeriod} - ${workingHours.endTime} ${workingHours.endPeriod}\nCurrent time: ${currentTimeString}`;
      } else if (isAMTime) {
        if (isAMSessionCompleted(intern)) {
          reason = `${intern.first_name} ${intern.last_name} has already completed the AM session. PM session will be available at ${workingHours.breakEnd} ${workingHours.breakEndPeriod}.`;
        } else if (isAMSessionInProgress(intern)) {
          reason = `${intern.first_name} ${intern.last_name} is already clocked in for AM session. Please clock out first before changing attendance status.`;
        } else if (intern.amStatus && (intern.amStatus === 'absent' || intern.amStatus === 'leave' || intern.amStatus === 'sick')) {
          reason = `${intern.first_name} ${intern.last_name} is marked as ${intern.amStatus} for AM session. PM session will be available at ${workingHours.breakEnd} ${workingHours.breakEndPeriod}.`;
        }
      } else if (isPMTime) {
        if (isPMSessionCompleted(intern)) {
          reason = `${intern.first_name} ${intern.last_name} has already completed the PM session. Work is done for today!`;
        } else if (isPMSessionInProgress(intern)) {
          reason = `${intern.first_name} ${intern.last_name} is already clocked in for PM session. Please clock out first before changing attendance status.`;
        } else if (intern.pmStatus && (intern.pmStatus === 'absent' || intern.pmStatus === 'leave' || intern.pmStatus === 'sick')) {
          reason = `${intern.first_name} ${intern.last_name} is marked as ${intern.pmStatus} for PM session.`;
        }
      }
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
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading attendance data...</Text>
      </View>
    );
  }

  const renderTableHeader = () => {
    const filtered = getFilteredInternsByDate();
    // Only consider unfinished interns for "select all"
    const unfinishedInterns = filtered.filter(intern => !intern.finishedAt);
    const allSelected = unfinishedInterns.length > 0 && unfinishedInterns.every(intern => selectedInternIds.has(intern.id));
    
    return (
    <View style={styles.tableHeader}>
        {/* Checkbox Column */}
        <View style={[styles.headerCell, { flex: 0.5 }]}>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.checkboxContainer}>
            <MaterialIcons 
              name={allSelected ? 'check-box' : 'check-box-outline-blank'} 
              size={isDesktop ? 24 : 20} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
        
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
  };


  const renderMobileCard = (intern: Intern, index: number) => {
    const hasAMTimeIn = intern.amTimeIn && intern.amTimeIn !== '--:--' && (!intern.amTimeOut || intern.amTimeOut === '' || intern.amTimeOut === '--:--');
    const hasPMTimeIn = intern.pmTimeIn && intern.pmTimeIn !== '--:--' && (!intern.pmTimeOut || intern.pmTimeOut === '' || intern.pmTimeOut === '--:--');
    const hasAnyTimeIn = intern.amTimeIn || intern.pmTimeIn;
    const isFullyCompleted = isAMSessionCompleted(intern) && isPMSessionCompleted(intern);
    const isPMAbsent = intern.pmStatus && (intern.pmStatus === 'absent' || intern.pmStatus === 'leave' || intern.pmStatus === 'sick');
    const isAMAbsent = intern.amStatus && (intern.amStatus === 'absent' || intern.amStatus === 'leave' || intern.amStatus === 'sick');
    
    console.log('🔍 Button visibility check for intern:', {
      name: intern.first_name + ' ' + intern.last_name,
      hasAnyTimeIn,
      isFullyCompleted,
      amTimeIn: intern.amTimeIn,
      amTimeOut: intern.amTimeOut,
      pmTimeIn: intern.pmTimeIn,
      pmTimeOut: intern.pmTimeOut,
      shouldShowButtons: !hasAnyTimeIn && !isFullyCompleted
    });
    
    // Calculate total hours for the day
    const calculateTotalHours = () => {
      // Check if any session (AM or PM) is completed
      const amCompleted = intern.amTimeIn && intern.amTimeOut && intern.amTimeIn !== '--:--' && intern.amTimeOut !== '--:--';
      const pmCompleted = intern.pmTimeIn && intern.pmTimeOut && intern.pmTimeIn !== '--:--' && intern.pmTimeOut !== '--:--';
      
      // Only show work done if at least one session is completed
      if (!amCompleted && !pmCompleted) {
        console.log('🔢 No sessions completed, returning 0');
        return 0;
      }
      
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
      if (amCompleted) {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const amIn = parseTime(intern.amTimeIn!);
        const amOut = parseTime(intern.amTimeOut!);
        total += Math.max(0.0167, (amOut.getTime() - amIn.getTime()) / (1000 * 60 * 60)); // Minimum 1 minute
        } catch (error) {
          console.warn('Error parsing AM times:', error);
      }
      }
      
      if (pmCompleted) {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const pmIn = parseTime(intern.pmTimeIn!);
        const pmOut = parseTime(intern.pmTimeOut!);
        total += Math.max(0.0167, (pmOut.getTime() - pmIn.getTime()) / (1000 * 60 * 60)); // Minimum 1 minute
        } catch (error) {
          console.warn('Error parsing PM times:', error);
      }
      }
      
      console.log('🔢 Final calculated total hours:', total);
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

    const isSelected = selectedInternIds.has(intern.id);
    const isFinished = !!intern.finishedAt;

    return (
      <View style={[styles.mobileCardContent, isFinished && styles.finishedInternCard]}>
        {/* Header with Profile and Status */}
        <View style={styles.mobileCardHeader}>
          {/* Checkbox */}
          {isFinished ? (
            <View style={styles.mobileCheckboxContainer}>
              <MaterialIcons 
                name="check-box" 
                size={20} 
                color="#9E9E9E" 
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => toggleInternSelection(intern.id)} style={styles.mobileCheckboxContainer}>
              <MaterialIcons 
                name={isSelected ? 'check-box' : 'check-box-outline-blank'} 
                size={20} 
                color={isSelected ? '#4CAF50' : '#666'} 
              />
            </TouchableOpacity>
          )}
          
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
              <View style={styles.mobileInternNameRow}>
              <Text style={styles.mobileInternName}>
                {intern.first_name} {intern.last_name}
              </Text>
                {isFinished && (
                  <View style={styles.finishedBadge}>
                    <MaterialIcons name="check-circle" size={14} color="#fff" />
                    <Text style={styles.finishedBadgeText}>Completed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.mobileInternId}>Intern #{index + 1}</Text>
            </View>
          </View>
        </View>
        
        {/* Time Ranges - Modern Mobile Layout */}
        <View style={styles.mobileTimeSection}>
          <View style={styles.mobileTimeItem}>
            <View style={styles.mobileTimeIconContainer}>
              <MaterialIcons name="schedule" size={16} color="#F56E0F" />
            </View>
            <View style={styles.mobileTimeContent}>
              <Text style={styles.mobileTimeLabel}>AM Shift</Text>
              <Text style={styles.mobileTimeValue}>
                {intern.amTimeIn 
                  ? `${intern.amTimeIn.split(' ')[0]} → ${intern.amTimeOut ? intern.amTimeOut.split(' ')[0] : '--:--'}`
                  : '--:-- → --:--'
                }
              </Text>
            </View>
          </View>
          <View style={styles.mobileTimeItem}>
            <View style={styles.mobileTimeIconContainer}>
              <MaterialIcons name="schedule" size={16} color="#F56E0F" />
            </View>
            <View style={styles.mobileTimeContent}>
              <Text style={styles.mobileTimeLabel}>PM Shift</Text>
              <Text style={styles.mobileTimeValue}>
                {intern.pmTimeIn 
                  ? `${intern.pmTimeIn.split(' ')[0]} → ${intern.pmTimeOut ? intern.pmTimeOut.split(' ')[0] : '--:--'}`
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
      
      
        {/* Action Buttons Removed - Students now submit their own attendance */}


        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Verify Attendance Button */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => {
              console.log('🔍 Verify button clicked for intern:', intern.first_name, intern.last_name);
              openVerificationPanel(intern);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="verified-user" size={18} color="#F56E0F" />
          </TouchableOpacity>
          
          {/* Evaluation Button - Always visible, disabled if intern hasn't finished */}
          <TouchableOpacity
            style={[styles.evaluationButton, !isFinished && styles.disabledButton]}
            onPress={() => openEvaluationPanel(intern)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={!isFinished}
          >
            <MaterialIcons name="assessment" size={18} color={isFinished ? "#4CAF50" : "#9E9E9E"} />
          </TouchableOpacity>
          
          {/* Detail Arrow Button */}
          <TouchableOpacity
            style={styles.detailArrowButton}
            onPress={() => openDetailPanel(intern)}
          >
            <MaterialIcons name="arrow-back" size={20} color="#878787" />
          </TouchableOpacity>
        </View>

        {/* Time Out Button Removed - Students now submit their own attendance */}

        {/* Work Completed Message - Show if work is completed */}
        {isFullyCompleted && (
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
    const isSelected = selectedInternIds.has(intern.id);
    const isFinished = !!intern.finishedAt;
    const hasAMTimeIn = intern.amTimeIn && intern.amTimeIn !== '--:--' && (!intern.amTimeOut || intern.amTimeOut === '' || intern.amTimeOut === '--:--');
    const hasPMTimeIn = intern.pmTimeIn && intern.pmTimeIn !== '--:--' && (!intern.pmTimeOut || intern.pmTimeOut === '' || intern.pmTimeOut === '--:--');
    const hasAnyTimeIn = intern.amTimeIn || intern.pmTimeIn;
    const isFullyCompleted = isAMSessionCompleted(intern) && isPMSessionCompleted(intern);
    const isPMAbsent = intern.pmStatus && (intern.pmStatus === 'absent' || intern.pmStatus === 'leave' || intern.pmStatus === 'sick');
    const isAMAbsent = intern.amStatus && (intern.amStatus === 'absent' || intern.amStatus === 'leave' || intern.amStatus === 'sick');
    
    console.log('🔍 Button visibility check for intern:', {
      name: intern.first_name + ' ' + intern.last_name,
      hasAnyTimeIn,
      isFullyCompleted,
      amTimeIn: intern.amTimeIn,
      amTimeOut: intern.amTimeOut,
      pmTimeIn: intern.pmTimeIn,
      pmTimeOut: intern.pmTimeOut,
      shouldShowButtons: !hasAnyTimeIn && !isFullyCompleted
    });
    
    // Calculate total hours for the day
    const calculateTotalHours = () => {
      // Check if any session (AM or PM) is completed
      const amCompleted = intern.amTimeIn && intern.amTimeOut && intern.amTimeIn !== '--:--' && intern.amTimeOut !== '--:--';
      const pmCompleted = intern.pmTimeIn && intern.pmTimeOut && intern.pmTimeIn !== '--:--' && intern.pmTimeOut !== '--:--';
      
      // Only show work done if at least one session is completed
      if (!amCompleted && !pmCompleted) {
        console.log('🔢 No sessions completed, returning 0');
        return 0;
      }
      
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
      if (amCompleted) {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const amIn = parseTime(intern.amTimeIn!);
        const amOut = parseTime(intern.amTimeOut!);
        total += Math.max(0.0167, (amOut.getTime() - amIn.getTime()) / (1000 * 60 * 60)); // Minimum 1 minute
        } catch (error) {
          console.warn('Error parsing AM times:', error);
      }
      }
      
      if (pmCompleted) {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const pmIn = parseTime(intern.pmTimeIn!);
        const pmOut = parseTime(intern.pmTimeOut!);
        total += Math.max(0.0167, (pmOut.getTime() - pmIn.getTime()) / (1000 * 60 * 60)); // Minimum 1 minute
        } catch (error) {
          console.warn('Error parsing PM times:', error);
      }
      }
      
      console.log('🔢 Final calculated total hours:', total);
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
      <View style={[styles.tabletCardContent, isFinished && styles.finishedInternCard]}>
        {/* Header with Profile and Arrow */}
        <View style={styles.tabletCardHeader}>
          {/* Checkbox */}
          {isFinished ? (
            <View style={styles.tabletCheckboxContainer}>
              <MaterialIcons 
                name="check-box" 
                size={22} 
                color="#9E9E9E" 
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => toggleInternSelection(intern.id)} style={styles.tabletCheckboxContainer}>
              <MaterialIcons 
                name={isSelected ? 'check-box' : 'check-box-outline-blank'} 
                size={22} 
                color={isSelected ? '#4CAF50' : '#666'} 
              />
            </TouchableOpacity>
          )}
          
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
              <View style={styles.tabletInternNameRow}>
              <Text style={styles.tabletInternName}>
                {intern.first_name} {intern.last_name}
              </Text>
                {isFinished && (
                  <View style={styles.finishedBadge}>
                    <MaterialIcons name="check-circle" size={13} color="#FFD700" />
                    <Text style={styles.finishedBadgeText}>Completed</Text>
                  </View>
                )}
              </View>
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
                  {intern.amTimeIn 
                    ? `${intern.amTimeIn.split(' ')[0]} → ${intern.amTimeOut ? intern.amTimeOut.split(' ')[0] : '--:--'}`
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
                  {intern.pmTimeIn 
                    ? `${intern.pmTimeIn.split(' ')[0]} → ${intern.pmTimeOut ? intern.pmTimeOut.split(' ')[0] : '--:--'}`
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
          {isFullyCompleted ? (
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

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Verify Attendance Button */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => {
              console.log('🔍 Verify button clicked for intern:', intern.first_name, intern.last_name);
              openVerificationPanel(intern);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="verified-user" size={18} color="#F56E0F" />
          </TouchableOpacity>
          
          {/* Evaluation Button - Always visible, disabled if intern hasn't finished */}
          <TouchableOpacity
            style={[styles.evaluationButton, !isFinished && styles.disabledButton]}
            onPress={() => openEvaluationPanel(intern)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={!isFinished}
          >
            <MaterialIcons name="assessment" size={18} color={isFinished ? "#4CAF50" : "#9E9E9E"} />
          </TouchableOpacity>
          
          {/* Detail Arrow Button */}
          <TouchableOpacity
            style={styles.detailArrowButton}
            onPress={() => openDetailPanel(intern)}
          >
            <MaterialIcons name="arrow-back" size={20} color="#878787" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTableRow = ({ item: intern, index }: { item: Intern, index: number }) => {
    const hasAMTimeIn = intern.amTimeIn && intern.amTimeIn !== '--:--' && (!intern.amTimeOut || intern.amTimeOut === '' || intern.amTimeOut === '--:--');
    const hasPMTimeIn = intern.pmTimeIn && intern.pmTimeIn !== '--:--' && (!intern.pmTimeOut || intern.pmTimeOut === '' || intern.pmTimeOut === '--:--');
    const hasAnyTimeIn = intern.amTimeIn || intern.pmTimeIn;
    const isFullyCompleted = isAMSessionCompleted(intern) && isPMSessionCompleted(intern);
    const isPMAbsent = intern.pmStatus && (intern.pmStatus === 'absent' || intern.pmStatus === 'leave' || intern.pmStatus === 'sick');
    const isAMAbsent = intern.amStatus && (intern.amStatus === 'absent' || intern.amStatus === 'leave' || intern.amStatus === 'sick');
    
    console.log('🔍 Button visibility check for intern:', {
      name: intern.first_name + ' ' + intern.last_name,
      hasAnyTimeIn,
      isFullyCompleted,
      amTimeIn: intern.amTimeIn,
      amTimeOut: intern.amTimeOut,
      pmTimeIn: intern.pmTimeIn,
      pmTimeOut: intern.pmTimeOut,
      shouldShowButtons: !hasAnyTimeIn && !isFullyCompleted
    });
    
    // Calculate total hours for the day
    const calculateTotalHours = () => {
      // Check if any session (AM or PM) is completed
      const amCompleted = intern.amTimeIn && intern.amTimeOut && intern.amTimeIn !== '--:--' && intern.amTimeOut !== '--:--';
      const pmCompleted = intern.pmTimeIn && intern.pmTimeOut && intern.pmTimeIn !== '--:--' && intern.pmTimeOut !== '--:--';
      
      // Only show work done if at least one session is completed
      if (!amCompleted && !pmCompleted) {
        console.log('🔢 No sessions completed, returning 0');
        return 0;
      }
      
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
      if (amCompleted) {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const amIn = parseTime(intern.amTimeIn!);
        const amOut = parseTime(intern.amTimeOut!);
        total += Math.max(0.0167, (amOut.getTime() - amIn.getTime()) / (1000 * 60 * 60)); // Minimum 1 minute
        } catch (error) {
          console.warn('Error parsing AM times:', error);
      }
      }
      
      if (pmCompleted) {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return new Date(`2000-01-01T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
        };
        
        try {
        const pmIn = parseTime(intern.pmTimeIn!);
        const pmOut = parseTime(intern.pmTimeOut!);
        total += Math.max(0.0167, (pmOut.getTime() - pmIn.getTime()) / (1000 * 60 * 60)); // Minimum 1 minute
        } catch (error) {
          console.warn('Error parsing PM times:', error);
      }
      }
      
      console.log('🔢 Final calculated total hours:', total);
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

    const isSelected = selectedInternIds.has(intern.id);
    const isFinished = !!intern.finishedAt;

    return (
      <View style={[styles.tableRow, isDesktop && styles.desktopTableRow, isFinished && styles.finishedInternRow]}>
        {/* Checkbox Column */}
        <View style={[styles.cell, { flex: 0.5 }]}>
          {isFinished ? (
            <View style={styles.checkboxContainer}>
              <MaterialIcons 
                name="check-box" 
                size={isDesktop ? 24 : 20} 
                color="#9E9E9E" 
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => toggleInternSelection(intern.id)} style={styles.checkboxContainer}>
              <MaterialIcons 
                name={isSelected ? 'check-box' : 'check-box-outline-blank'} 
                size={isDesktop ? 24 : 20} 
                color={isSelected ? '#4CAF50' : '#666'} 
              />
            </TouchableOpacity>
          )}
        </View>
        
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
              <View style={styles.internNameRow}>
              <Text style={[styles.internName, isDesktop && styles.desktopInternName]}>
                {intern.first_name} {intern.last_name}
              </Text>
                {isFinished && (
                  <View style={styles.finishedBadge}>
                    <MaterialIcons name="check-circle" size={14} color="#FFD700" />
                    <Text style={styles.finishedBadgeText}>Completed</Text>
                  </View>
                )}
              </View>
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
          {/* Verification Status Badge */}
          {intern.verification_status && (
            <View style={[
              styles.verificationBadge,
              intern.verification_status === 'accepted' && styles.verificationBadgeAccepted,
              intern.verification_status === 'denied' && styles.verificationBadgeDenied,
              intern.verification_status === 'pending' && styles.verificationBadgePending
            ]}>
              <MaterialIcons 
                name={
                  intern.verification_status === 'accepted' ? 'check-circle' :
                  intern.verification_status === 'denied' ? 'cancel' : 'schedule'
                } 
                size={12} 
                color={
                  intern.verification_status === 'accepted' ? '#4CAF50' :
                  intern.verification_status === 'denied' ? '#EA4335' : '#F56E0F'
                } 
              />
              <Text style={[
                styles.verificationBadgeText,
                intern.verification_status === 'accepted' && styles.verificationBadgeTextAccepted,
                intern.verification_status === 'denied' && styles.verificationBadgeTextDenied,
                intern.verification_status === 'pending' && styles.verificationBadgeTextPending
              ]}>
                {intern.verification_status === 'accepted' ? 'Accepted' :
                 intern.verification_status === 'denied' ? 'Denied' : 'Pending'}
          </Text>
            </View>
          )}
        </View>
        
        {/* Actions Column */}
        <View style={[styles.cell, { flex: 1.2 }]} pointerEvents="box-none">
          <View style={styles.actionButtonsContainer} pointerEvents="box-none">
            
            {/* Verify Attendance Button - Always visible for verification */}
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => {
                console.log('🔍 Verify button clicked for intern:', intern.first_name, intern.last_name);
                openVerificationPanel(intern);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={false}
            >
              <MaterialIcons name="verified-user" size={18} color="#F56E0F" />
            </TouchableOpacity>
            
            {/* Evaluation Button - Only visible if intern has finished */}
            {isFinished && (
              <TouchableOpacity
                style={styles.evaluationButton}
                onPress={() => openEvaluationPanel(intern)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="assessment" size={18} color="#4CAF50" />
              </TouchableOpacity>
            )}
            
            {/* Show work completed message if work is done */}
            {isFullyCompleted && (
              <View style={styles.workCompletedCard} pointerEvents="none">
                <MaterialIcons name="check-circle" size={14} color="#4CAF50" />
                <Text style={styles.workCompletedTextSmall}>Work Done! 🎉</Text>
              </View>
            )}
            
            {/* Detail View Arrow - for cases without Time Out button */}
            {!hasAnyTimeIn && (
              <TouchableOpacity
                style={styles.detailArrowButton}
                onPress={() => openDetailPanel(intern)}
              >
                <MaterialIcons name="arrow-back" size={16} color="#1E3A5F" />
              </TouchableOpacity>
            )}
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
                <MaterialIcons name="calendar-today" size={isSmallMobile ? 16 : isTablet ? 18 : isDesktop ? 20 : 20} color="#F56E0F" />
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
                <MaterialIcons name="search" size={isSmallMobile ? 16 : isTablet ? 18 : isDesktop ? 20 : 20} color="#F56E0F" />
              </TouchableOpacity>

              {/* Finish Selected Internships Button */}
              {selectedInternIds.size > 0 && (
                <TouchableOpacity
                  style={[
                    styles.finishSelectedButton,
                    isSmallMobile && styles.smallMobileFinishSelectedButton,
                    isTablet && styles.tabletFinishSelectedButton,
                    isDesktop && styles.desktopFinishSelectedButton,
                    isFinishingInternships && styles.disabledButton
                  ]}
                  onPress={handleFinishInternships}
                  disabled={isFinishingInternships}
                >
                  {isFinishingInternships ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={isSmallMobile ? 16 : isTablet ? 18 : isDesktop ? 20 : 20} color="#fff" />
                      <Text style={[
                        styles.finishSelectedButtonText,
                        isSmallMobile && styles.smallMobileFinishSelectedButtonText,
                        isTablet && styles.tabletFinishSelectedButtonText,
                        isDesktop && styles.desktopFinishSelectedButtonText
                      ]}>
                        Finish ({selectedInternIds.size})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

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
                  placeholderTextColor="#878787"
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
                  <MaterialIcons name="close" size={isSmallMobile ? 16 : isTablet ? 18 : isDesktop ? 20 : 20} color="#878787" />
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
              <MaterialIcons name="school" size={64} color="#F56E0F" />
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
                    {/* Time control buttons removed - Students now submit their own attendance */}
                  </View>
                )}

                {/* Attendance buttons removed - Students now submit their own attendance */}
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

      {/* Attendance Verification Panel */}
      {showVerificationPanel && selectedAttendanceRecord && (
        <Animated.View 
          style={[
            styles.detailPanelContainer,
            {
              transform: [{ translateX: verificationPanelSlideAnim }]
            }
          ]}
        >
          <AttendanceVerificationPanel
            attendanceRecord={selectedAttendanceRecord}
            attendanceRecords={allAttendanceRecords}
            internName={selectedInternForVerification 
              ? `${selectedInternForVerification.first_name} ${selectedInternForVerification.last_name}`
              : 'Unknown Intern'}
            onClose={closeVerificationPanel}
            onVerificationComplete={handleVerificationComplete}
            isMobile={isMobile}
            isTablet={isTablet}
            isDesktop={isDesktop}
            companyId={companyId}
            currentUser={currentUser}
          />
        </Animated.View>
      )}

      {/* Supervisor Evaluation Panel */}
      {showEvaluationPanel && selectedInternForEvaluation && (
        <Animated.View 
          style={[
            styles.detailPanelContainer,
            {
              transform: [{ translateX: evaluationPanelSlideAnim }]
            }
          ]}
        >
          <SupervisorEvaluationPanel
            selectedIntern={selectedInternForEvaluation}
            onClose={closeEvaluationPanel}
            isMobile={isMobile}
            isTablet={isTablet}
            isDesktop={isDesktop}
            companyId={companyId}
            currentUser={currentUser}
            companyProfile={companyProfile}
            slideAnim={evaluationPanelSlideAnim}
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

      {/* Finish Validation Modal */}
      <Modal
        visible={showFinishValidationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFinishValidationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.validationModal}>
            <View style={styles.validationModalHeader}>
              <MaterialIcons name="warning" size={32} color="#F56E0F" />
              <Text style={styles.validationModalTitle}>Cannot Finish Internships</Text>
            </View>
            
            <ScrollView style={styles.validationModalContent}>
              <Text style={styles.validationModalMessage}>
                Please verify all attendance records and ensure hours are complete before finishing internships.
              </Text>
              
              {validationErrors.unverifiedAttendance.length > 0 && (
                <View style={styles.validationSection}>
                  <Text style={styles.validationSectionTitle}>
                    Unverified Attendance Records:
                  </Text>
                  {validationErrors.unverifiedAttendance.map((item, index) => (
                    <View key={index} style={styles.validationItem}>
                      <Text style={styles.validationItemName}>• {item.name}</Text>
                      {item.issues.map((issue, issueIndex) => (
                        <Text key={issueIndex} style={styles.validationItemIssue}>
                          {issue}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
              
              {validationErrors.incompleteHours.length > 0 && (
                <View style={styles.validationSection}>
                  <Text style={styles.validationSectionTitle}>
                    Incomplete Hours:
                  </Text>
                  {validationErrors.incompleteHours.map((item, index) => (
                    <View key={index} style={styles.validationItem}>
                      <Text style={styles.validationItemName}>
                        • {item.name}: {item.remainingHours.toFixed(1)} hours remaining
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            <View style={styles.validationModalActions}>
              <TouchableOpacity
                style={styles.validationModalButton}
                onPress={() => setShowFinishValidationModal(false)}
              >
                <Text style={styles.validationModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Finish Confirmation Modal */}
      <Modal
        visible={showFinishConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFinishConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmModalHeader}>
              <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
              <Text style={styles.confirmModalTitle}>Finish Internships</Text>
            </View>
            
            <View style={styles.confirmModalContent}>
              <Text style={styles.confirmModalMessage}>
                Are you sure you want to finish internships for {selectedInternIds.size} selected intern(s)?
              </Text>
              <Text style={styles.confirmModalSubtext}>
                This action will mark the internships as completed. Students will be notified.
              </Text>
            </View>
            
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalCancelButton]}
                onPress={() => setShowFinishConfirmModal(false)}
              >
                <Text style={styles.confirmModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalConfirmButton]}
                onPress={handleConfirmFinishInternships}
                disabled={isFinishingInternships}
              >
                {isFinishingInternships ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmModalConfirmButtonText}>Confirm</Text>
                )}
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
    backgroundColor: 'rgba(255, 255, 255, 0.79);',
    minWidth: 0, // Allow content to wrap properly
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#151419',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  // Header Section
  headerSection: {
    backgroundColor: '#2A2A2E',
    paddingHorizontal: '2%',
    paddingVertical: '1.5%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
    elevation: 3,
    shadowColor: '#F56E0F',
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
    color: '#FBFBFB',
    fontFamily: 'System',
    flexWrap: 'wrap',
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#878787',
    fontWeight: '400',
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  headerSearchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  headerSearchContainer: {
    overflow: 'hidden',
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    width: 300,
    minWidth: 200,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FBFBFB',
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
  viewToggleButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E',
  },
  activeToggleButton: {
    backgroundColor: '#F56E0F',
    borderColor: '#F56E0F',
  },
  // Controls Section
  controlsSection: {
    backgroundColor: '#1B1B1E',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  searchContainer: {
    // Removed marginBottom since no stats below
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FBFBFB',
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
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
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
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: '2%',
    minHeight: 44, // Accessibility: minimum touch target
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
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
    backgroundColor: '#2A2A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletProfileText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
  tabletProfileInfo: {
    flex: 1,
  },
  tabletInternName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  tabletInternId: {
    fontSize: 14,
    color: '#878787',
  },
  tabletDetailArrow: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
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
    color: '#878787',
    marginLeft: 6,
    marginRight: 8,
  },
  tabletTimeValue: {
    fontSize: 16,
    color: '#FBFBFB',
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
    color: '#878787',
    marginBottom: 4,
  },
  tabletHoursValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
  tabletRemainingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F56E0F',
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
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: '2%',
    minHeight: 44, // Accessibility: minimum touch target
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
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
    backgroundColor: '#2A2A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileProfileText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
  mobileProfileInfo: {
    flex: 1,
  },
  mobileInternName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 2,
  },
  mobileInternId: {
    fontSize: 12,
    color: '#878787',
  },
  mobileDetailArrow: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
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
    color: '#878787',
    marginBottom: 2,
  },
  mobileTimeValue: {
    fontSize: 14,
    color: '#FBFBFB',
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
    color: '#878787',
    marginBottom: 2,
  },
  mobileHoursValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
  mobileRemainingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F56E0F',
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
    backgroundColor: '#2A2A2E',
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
    overflow: 'visible',
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
    position: 'relative',
  },
  workDoneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workDoneBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  workDoneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateRestrictionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dateRestrictionBadge: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateRestrictionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonsGrid: {
    flexDirection: 'column',
    gap: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 4,
  },
  timeOutContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
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
  evaluationButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  verifyButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F56E0F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    position: 'relative',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  verificationBadgeAccepted: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  verificationBadgeDenied: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EA4335',
  },
  verificationBadgePending: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#F56E0F',
  },
  verificationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  verificationBadgeTextAccepted: {
    color: '#4CAF50',
  },
  verificationBadgeTextDenied: {
    color: '#EA4335',
  },
  verificationBadgeTextPending: {
    color: '#F56E0F',
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
    backgroundColor: 'rgba(52, 168, 83, 0.2)',
    borderColor: '#34a853',
  },
  lateActionButton: {
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderColor: '#F56E0F',
  },
  absentActionButton: {
    backgroundColor: 'rgba(234, 67, 53, 0.2)',
    borderColor: '#ea4335',
  },
  leaveActionButton: {
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    borderColor: '#9c27b0',
  },
  timeOutActionButton: {
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderColor: '#F56E0F',
  },
  presentButtonText: {
    color: '#34a853',
    fontSize: 12,
    fontWeight: '600',
  },
  lateButtonText: {
    color: '#F56E0F',
    fontSize: 12,
    fontWeight: '600',
  },
  absentButtonText: {
    color: '#ea4335',
    fontSize: 12,
    fontWeight: '600',
  },
  leaveButtonText: {
    color: '#9c27b0',
    fontSize: 12,
    fontWeight: '600',
  },
  timeOutButtonText: {
    color: '#F56E0F',
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
    color: '#2A2A2E',
    fontWeight: '500',
    textAlign: 'left',
  },
  desktopRowNumber: {
    fontSize: 16,
    color: '#2A2A2E',
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
    backgroundColor: 'transparent', // Transparent so only the panel has background
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
  // Checkbox styles
  checkboxContainer: {
    padding: 4,
  },
  mobileCheckboxContainer: {
    padding: 4,
    marginRight: 8,
  },
  tabletCheckboxContainer: {
    padding: 4,
    marginRight: 10,
  },
  // Finish Selected Button styles
  finishSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  smallMobileFinishSelectedButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabletFinishSelectedButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  desktopFinishSelectedButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  finishSelectedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  smallMobileFinishSelectedButtonText: {
    fontSize: 12,
  },
  tabletFinishSelectedButtonText: {
    fontSize: 13,
  },
  desktopFinishSelectedButtonText: {
    fontSize: 15,
  },
  // Validation Modal styles
  validationModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxWidth: 500,
    maxHeight: '80%',
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  validationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  validationModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
  validationModalContent: {
    padding: 20,
    maxHeight: 400,
  },
  validationModalMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  validationSection: {
    marginBottom: 16,
  },
  validationSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  validationItem: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  validationItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  validationItemIssue: {
    fontSize: 13,
    color: '#666',
    paddingLeft: 12,
    marginBottom: 2,
  },
  validationModalActions: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  validationModalButton: {
    backgroundColor: '#F56E0F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  validationModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Confirm Modal styles
  confirmModal: {
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
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  confirmModalContent: {
    padding: 20,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
  },
  confirmModalSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  confirmModalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmModalCancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmModalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalConfirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmModalConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Finished Internship Indicator Styles
  finishedInternRow: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  finishedInternCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  finishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#45a049',
  },
  finishedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  internNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  mobileInternNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tabletInternNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

