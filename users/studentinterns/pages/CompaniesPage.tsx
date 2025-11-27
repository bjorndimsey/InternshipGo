import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import DatePicker from '@react-native-community/datetimepicker';
import { apiService } from '../../../lib/api';
import { CloudinaryService } from '../../../lib/cloudinaryService';
import {
  AttendanceRecordEntry,
  EvidenceEntry,
  PersonalInformationData,
  StudentProfileDetails,
  HTEInformationData,
  CompanyDtrData,
  CertificateEntry,
  TrainingScheduleEntry,
  InternFeedbackFormData,
  SupervisorEvaluationFormData,
  buildPersonalInformation,
  generateJournalPdf,
  openGeneratedJournal,
} from '../utils/journalGenerator';
import Confetti from '../components/Confetti';
import AttendanceHistoryPanel from '../components/AttendanceHistoryModal';

const { width } = Dimensions.get('window');

// Helper function to get current date in Manila timezone (Asia/Manila, UTC+8) in YYYY-MM-DD format
const getManilaDateString = (): string => {
  const now = new Date();
  // Get current date in Manila timezone
  const manilaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  // Format as YYYY-MM-DD
  const year = manilaDate.getFullYear();
  const month = String(manilaDate.getMonth() + 1).padStart(2, '0');
  const day = String(manilaDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface Company {
  id: string;
  name: string;
  profilePicture?: string;
  industry: string;
  location: string;
  moaStatus: 'active' | 'expired' | 'pending';
  moaExpiryDate?: string;
  availableSlots: number;
  totalSlots: number;
  description: string;
  website: string;
  rating: number;
  dailyTasks: string[];
  partnership_status: string;
  user_id: number;
  applicationStatus?: 'pending' | 'under-review' | 'approved' | 'rejected';
  appliedAt?: string;
  hoursOfInternship?: string | null;
  remainingHours?: number;
  applicationId?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  hasSupervisorEvaluation?: boolean;
}

interface CompaniesPageProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
}

interface PendingJournalContext {
  companies: Company[];
  personalInfo: PersonalInformationData;
}

const transformCompanyRecords = (companiesData: any[]): Company[] => {
  if (!companiesData || companiesData.length === 0) {
    return [];
  }

  return companiesData.map((company: any) => ({
    id: company.id?.toString() || '',
    name: company.company_name,
    profilePicture: company.profile_picture,
    industry: company.industry,
    location: company.address,
    moaStatus:
      company.moa_status === 'active'
        ? 'active'
        : company.moa_status === 'expired'
        ? 'expired'
        : 'pending',
    moaExpiryDate: company.moa_expiry_date,
    availableSlots: company.available_slots || 0,
    totalSlots: company.total_slots || 10,
    description: company.description || `Leading company in ${company.industry} industry`,
    website: company.website || `www.${(company.company_name || '').toLowerCase().replace(/\s+/g, '')}.com`,
    rating: company.rating || 4.5,
    dailyTasks: [
      'Complete assigned projects',
      'Attend team meetings',
      'Participate in training sessions',
      'Submit progress reports',
    ],
    partnership_status: company.partnership_status,
    user_id: company.user_id,
    applicationStatus: company.application_status || 'approved',
    appliedAt: company.applied_at,
    hoursOfInternship: company.hours_of_internship || null,
    applicationId: company.application_id || null,
    startedAt: company.started_at || null,
    finishedAt: company.finished_at || null,
  }));
};

const formatDateDisplay = (dateStr?: string | null) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTimeDisplay = (dateStr?: string | null) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatStatusLabel = (status?: string | null) => {
  if (!status) return 'N/A';
  return status
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function CompaniesPage({ currentUser }: CompaniesPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDailyTasks, setShowDailyTasks] = useState(false);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isDownloadingJournal, setIsDownloadingJournal] = useState(false);
  
  // Daily Tasks Modal States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskImage, setTaskImage] = useState<string | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  // Attendance Time States
  const [amTimeIn, setAmTimeIn] = useState('');
  const [amTimeOut, setAmTimeOut] = useState('');
  const [pmTimeIn, setPmTimeIn] = useState('');
  const [pmTimeOut, setPmTimeOut] = useState('');
  // Date Picker States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Working Hours States
  const [workingHours, setWorkingHours] = useState<{
    startTime: string;
    startPeriod: string;
    endTime: string;
    endPeriod: string;
    breakStart?: string;
    breakStartPeriod?: string;
    breakEnd?: string;
    breakEndPeriod?: string;
  } | null>(null);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false);
  // Validation Error States
  const [timeValidationErrors, setTimeValidationErrors] = useState<{
    amTimeIn?: string;
    amTimeOut?: string;
    pmTimeIn?: string;
    pmTimeOut?: string;
  }>({});
  
  // Success Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [studentProfile, setStudentProfile] = useState<StudentProfileDetails | null>(null);
  const [studentProfileLoading, setStudentProfileLoading] = useState(false);
  const [studentProfileError, setStudentProfileError] = useState<string | null>(null);
  const [missingPersonalInfoFields, setMissingPersonalInfoFields] = useState<string[]>([]);
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
  const [pendingJournalContext, setPendingJournalContext] = useState<PendingJournalContext | null>(null);
  const [personalInfoFormData, setPersonalInfoFormData] = useState<Record<string, string>>({});
  const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showMissingInfoSelectionModal, setShowMissingInfoSelectionModal] = useState(false);
  const [isStartingInternship, setIsStartingInternship] = useState<string | null>(null);
  const [showStartInternshipModal, setShowStartInternshipModal] = useState(false);
  const [companyToStart, setCompanyToStart] = useState<Company | null>(null);
  const [showNotStartedModal, setShowNotStartedModal] = useState(false);
  const [companyNotStarted, setCompanyNotStarted] = useState<Company | null>(null);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const [companyFinished, setCompanyFinished] = useState<Company | null>(null);
  const [showInfoCompleteModal, setShowInfoCompleteModal] = useState(false);
  const [showActiveInternshipModal, setShowActiveInternshipModal] = useState(false);
  const [activeCompanyName, setActiveCompanyName] = useState<string>('');
  const [activeCompanyRemainingHours, setActiveCompanyRemainingHours] = useState<number | undefined>(undefined);
  const [companyToStartBlocked, setCompanyToStartBlocked] = useState<Company | null>(null);
  const [showMissingHteModal, setShowMissingHteModal] = useState(false);
  const [missingHteCompanyNames, setMissingHteCompanyNames] = useState<string[]>([]);
  const [missingHteCompanies, setMissingHteCompanies] = useState<Company[]>([]);
  const [showHTEInfoModal, setShowHTEInfoModal] = useState(false);
  const [hteInfoFormData, setHteInfoFormData] = useState<Record<string, string>>({});
  const [hteValidationErrors, setHteValidationErrors] = useState<Record<string, string>>({});
  const [htePhoto, setHtePhoto] = useState<string | null>(null);
  const [isUploadingHtePhoto, setIsUploadingHtePhoto] = useState(false);
  const [isSavingHteInfo, setIsSavingHteInfo] = useState(false);
  const [selectedCompanyForHte, setSelectedCompanyForHte] = useState<Company | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedCompanyId, setCompletedCompanyId] = useState<string | null>(null);
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
  const [attendanceHistoryRecords, setAttendanceHistoryRecords] = useState<AttendanceRecordEntry[]>([]);
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  
  // Certificate States
  const [certificates, setCertificates] = useState<{[companyId: string]: {id: string; certificateUrl: string}}>({});
  const [downloadingCertificate, setDownloadingCertificate] = useState<string | null>(null);
  
  // Training Schedule States
  const [showTrainingScheduleModal, setShowTrainingScheduleModal] = useState(false);
  const [trainingSchedules, setTrainingSchedules] = useState<TrainingScheduleEntry[]>([]);
  const [isLoadingTrainingSchedules, setIsLoadingTrainingSchedules] = useState(false);
  const [isSavingTrainingSchedule, setIsSavingTrainingSchedule] = useState(false);
  const [sectionATotalHours, setSectionATotalHours] = useState<number>(0);
  const [trainingScheduleForm, setTrainingScheduleForm] = useState({
    taskClassification: '',
    toolsDeviceSoftwareUsed: '',
    totalHours: '',
  });
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  
  // Intern Feedback Form States
  const [showInternFeedbackFormModal, setShowInternFeedbackFormModal] = useState(false);
  const [isLoadingFeedbackForm, setIsLoadingFeedbackForm] = useState(false);
  const [isSavingFeedbackForm, setIsSavingFeedbackForm] = useState(false);
  const [showFeedbackFormSuccessModal, setShowFeedbackFormSuccessModal] = useState(false);
  const [selectedCompanyForFeedback, setSelectedCompanyForFeedback] = useState<Company | null>(null);
  const [existingFeedbackFormId, setExistingFeedbackFormId] = useState<string | null>(null);
  const [feedbackFormData, setFeedbackFormData] = useState({
    companyId: '',
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    question5: '',
    question6: '',
    question7: '',
    problemsMet: '',
    otherConcerns: '',
    formDate: getManilaDateString(),
  });
  const [feedbackFormErrors, setFeedbackFormErrors] = useState<{[key: string]: string}>({});
  
  // Attendance States
  const [attendanceStatus, setAttendanceStatus] = useState<{[companyId: string]: 'present' | 'late' | 'absent' | 'leave' | 'not_marked'}>({});
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [modalAttendanceStatus, setModalAttendanceStatus] = useState<'present' | 'late' | 'absent' | 'leave' | 'not_marked'>('not_marked');
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchCompanies();
    fetchTodayAttendance();
    
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);


  useEffect(() => {
    if (currentUser?.id) {
      fetchStudentProfile();
    }
  }, [currentUser?.id]);

  // Shimmer animation for skeleton loading
  useEffect(() => {
    if (showSkeleton) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [showSkeleton]);

  useEffect(() => {
    filterCompanies();
  }, [searchQuery, companies]);

  const fetchTodayAttendance = async () => {
    if (!currentUser) {
      console.log('❌ No current user found for attendance check');
      return;
    }

    setAttendanceLoading(true);
    try {
      console.log('🚀 ===== ATTENDANCE FETCH STARTED =====');
      console.log('📅 Current User ID:', currentUser.id, 'Type:', typeof currentUser.id);
      
      // Get all companies the student is assigned to
      console.log('📅 Step 1: Fetching student companies...');
      const response = await apiService.getStudentCompanies(currentUser.id);
      console.log('📅 Student companies response:', response);
      
      if (response.success && response.companies && response.companies.length > 0) {
        console.log('📅 Step 2: Found companies:', response.companies.map((c: any) => ({ id: c.id, name: c.company_name })));
        
        const newAttendanceStatus: {[companyId: string]: 'present' | 'late' | 'absent' | 'leave' | 'not_marked'} = {};
        
        // Check attendance for each company
        for (let i = 0; i < response.companies.length; i++) {
          const companyId = response.companies[i].id.toString();
          const companyName = response.companies[i].company_name;
          console.log(`📅 Step 3-${i}: Checking attendance for company ${companyId} (${companyName})...`);
          
          // Try getTodayAttendance first
          const attendanceResponse = await apiService.getTodayAttendance(companyId, currentUser.id);
          console.log(`📅 Company ${companyId} getTodayAttendance response:`, {
            success: attendanceResponse.success,
            dataLength: attendanceResponse.data ? attendanceResponse.data.length : 0
          });
          
          let foundAttendance = false;
          
          // Check if we got any data
          if (attendanceResponse.success && attendanceResponse.data && attendanceResponse.data.length > 0) {
            const studentRecord = attendanceResponse.data.find((record: any) => {
              const recordUserId = parseInt(record.user_id);
              const currentUserId = parseInt(currentUser.id);
              return recordUserId === currentUserId;
            });
            
            if (studentRecord) {
              console.log(`✅ SUCCESS: Found attendance record in company ${companyId}:`, studentRecord.status);
              newAttendanceStatus[companyId] = studentRecord.status || 'not_marked';
              foundAttendance = true;
            }
          }
          
          // If not found, try getAttendanceRecords as fallback
          if (!foundAttendance) {
            console.log(`📅 Step 4-${i}: Trying getAttendanceRecords for company ${companyId}...`);
            const today = new Date();
            const dateString = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
            
            const fallbackResponse = await apiService.getAttendanceRecords(companyId, currentUser.id, {
              startDate: dateString,
              endDate: dateString,
              internId: currentUser.id
            });
            
            if (fallbackResponse.success && fallbackResponse.data && fallbackResponse.data.length > 0) {
              const studentRecord = fallbackResponse.data.find((record: any) => {
                const recordUserId = parseInt(record.user_id);
                const currentUserId = parseInt(currentUser.id);
                return recordUserId === currentUserId;
              });
              
              if (studentRecord) {
                console.log(`✅ FALLBACK SUCCESS: Found attendance record in company ${companyId}:`, studentRecord.status);
                newAttendanceStatus[companyId] = studentRecord.status || 'not_marked';
                foundAttendance = true;
              }
            }
          }
          
          // If still no attendance found, mark as not_marked
          if (!foundAttendance) {
            console.log(`📅 No attendance record found for company ${companyId}`);
            newAttendanceStatus[companyId] = 'not_marked';
          }
        }
        
        console.log('📅 Final attendance status for all companies:', newAttendanceStatus);
        setAttendanceStatus(newAttendanceStatus);
        
      } else {
        console.log('❌ No companies found for this student');
        console.log('📅 Companies response:', response);
        setAttendanceStatus({});
      }
    } catch (error) {
      console.error('❌ Error fetching attendance:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      setAttendanceStatus({});
    } finally {
      setAttendanceLoading(false);
      console.log('🚀 ===== ATTENDANCE FETCH COMPLETED =====');
    }
  };

  const refreshAttendance = async () => {
    console.log('🔄 Manually refreshing attendance...');
    await fetchTodayAttendance();
  };

  const fetchCertificatesForCompanies = async (companyList: Company[]) => {
    if (!currentUser?.id || !companyList || companyList.length === 0) {
      console.log('⚠️ fetchCertificatesForCompanies: Missing requirements', {
        hasCurrentUser: !!currentUser?.id,
        currentUserId: currentUser?.id,
        companyListLength: companyList?.length
      });
      return;
    }

    console.log('🔍 fetchCertificatesForCompanies: Starting fetch for', companyList.length, 'companies');
    console.log('🔍 Current user ID:', currentUser.id);

    try {
      const certificatesMap: {[companyId: string]: {id: string; certificateUrl: string}} = {};

      // Fetch certificates for each company
      for (const company of companyList) {
        try {
          console.log(`📋 Fetching certificates for company:`, {
            companyId: company.id,
            companyName: company.name,
            companyUserId: company.user_id
          });
          
          const response = await apiService.getCompanyCertificates(company.id);
          
          console.log(`📋 API Response for company ${company.id}:`, {
            success: response.success,
            message: response.message,
            certificatesCount: (response as any).certificates?.length || 0
          });
          
          if (response.success) {
            const certificates = (response as any).certificates;
            if (certificates && Array.isArray(certificates)) {
              console.log(`📋 Found ${certificates.length} total certificates for company ${company.id}`);
              
              // Log all certificates for debugging
              certificates.forEach((cert: any, index: number) => {
                console.log(`  Certificate ${index + 1}:`, {
                  id: cert.id,
                  student_id: cert.student_id,
                  company_id: cert.company_id,
                  generated_at: cert.generated_at
                });
              });
              
              // Filter certificates for current student and sort by ID DESC (newest first)
              const currentUserId = currentUser.id.toString();
              console.log(`🔍 Filtering for current user ID: ${currentUserId}`);
              
              const studentCertificates = certificates
                .filter((cert: any) => {
                  const certStudentId = cert.student_id?.toString();
                  const matches = certStudentId === currentUserId;
                  console.log(`  Certificate ${cert.id}: student_id=${certStudentId}, matches=${matches}`);
                  return matches;
                })
                .sort((a: any, b: any) => {
                  // Sort by ID DESC (higher ID = newer) or by generated_at DESC if available
                  if (a.generated_at && b.generated_at) {
                    return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
                  }
                  // Fallback to ID comparison
                  const idA = parseInt(a.id) || 0;
                  const idB = parseInt(b.id) || 0;
                  return idB - idA;
                });

              console.log(`📋 Found ${studentCertificates.length} certificates for current user`);

              // Get the newest certificate (first in sorted array)
              const newestCertificate = studentCertificates[0];

              if (newestCertificate) {
                console.log(`✅ Found newest certificate for company ${company.id}:`, {
                  certificateId: newestCertificate.id,
                  studentId: newestCertificate.student_id,
                  generatedAt: newestCertificate.generated_at,
                  certificateUrl: newestCertificate.certificate_url
                });
                certificatesMap[company.id] = {
                  id: newestCertificate.id.toString(),
                  certificateUrl: newestCertificate.certificate_url
                };
              } else {
                console.log(`⚠️ No certificate found for current user in company ${company.id}`);
              }
            } else {
              console.log(`⚠️ Certificates is not an array for company ${company.id}:`, certificates);
            }
          } else {
            console.log(`❌ API call failed for company ${company.id}:`, response.message);
          }
        } catch (error) {
          console.error(`❌ Error fetching certificates for company ${company.id}:`, error);
        }
      }

      console.log('📋 Final certificates map:', certificatesMap);
      setCertificates(certificatesMap);
    } catch (error) {
      console.error('❌ Error fetching certificates:', error);
    }
  };

  const fetchSupervisorEvaluationStatus = async (companyList: Company[]) => {
    if (!currentUser?.id || !companyList || companyList.length === 0) {
      return;
    }

    console.log('📋 Fetching supervisor evaluation status for', companyList.length, 'companies');

    try {
      // Only check finished companies
      const finishedCompanies = companyList.filter(c => c.finishedAt !== null && c.finishedAt !== undefined);
      
      if (finishedCompanies.length === 0) {
        console.log('ℹ️ No finished companies, skipping evaluation status check');
        return;
      }

      // Update companies with evaluation status
      const updatedCompanies = await Promise.all(
        companyList.map(async (company) => {
          // Only check if company is finished
          if (company.finishedAt) {
            try {
              const evalResponse = await apiService.getSupervisorEvaluation(currentUser.id, company.id);
              
              if (evalResponse.success && (evalResponse as any).evaluationForm) {
                console.log(`✅ Supervisor evaluation found for company: ${company.name}`);
                return {
                  ...company,
                  hasSupervisorEvaluation: true
                };
              } else {
                console.log(`ℹ️ No supervisor evaluation found for company: ${company.name}`);
                return {
                  ...company,
                  hasSupervisorEvaluation: false
                };
              }
            } catch (error) {
              console.error(`❌ Error checking evaluation status for company ${company.id}:`, error);
              return {
                ...company,
                hasSupervisorEvaluation: false
              };
            }
          }
          
          // For non-finished companies, no evaluation status
          return company;
        })
      );

      setCompanies(updatedCompanies);
      console.log('✅ Supervisor evaluation status updated for all companies');
    } catch (error) {
      console.error('❌ Error fetching supervisor evaluation status:', error);
    }
  };

  const handleDownloadCertificate = async (company: Company) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User information not available.');
      return;
    }

    const certificate = certificates[company.id];
    if (!certificate) {
      Alert.alert('Error', 'Certificate not found for this company.');
      return;
    }

    try {
      setDownloadingCertificate(company.id);
      
      // First, verify the certificate belongs to the current user by fetching it
      console.log(`🔍 Verifying certificate ${certificate.id} ownership for user ${currentUser.id}...`);
      const response = await apiService.getCompanyCertificates(company.id);
      
      if (response.success) {
        const certificates = (response as any).certificates;
        if (certificates && Array.isArray(certificates)) {
          // Find the certificate by ID and verify it belongs to current user
          const cert = certificates.find((c: any) => {
            const certId = c.id?.toString();
            const certStudentId = c.student_id?.toString();
            const currentUserId = currentUser.id.toString();
            return certId === certificate.id && certStudentId === currentUserId;
          });

          if (!cert) {
            Alert.alert('Error', 'Certificate not found or does not belong to you.');
            return;
          }

          console.log(`✅ Certificate verified:`, {
            certificateId: cert.id,
            studentId: cert.student_id,
            belongsToUser: cert.student_id?.toString() === currentUser.id.toString()
          });

          // Download the certificate
          await apiService.downloadCertificate(certificate.id);
          Alert.alert('Success', 'Certificate downloaded successfully!');
        } else {
          Alert.alert('Error', 'Failed to verify certificate ownership.');
        }
      } else {
        Alert.alert('Error', 'Failed to verify certificate ownership.');
      }
    } catch (error: any) {
      console.error('Error downloading certificate:', error);
      Alert.alert('Error', error.message || 'Failed to download certificate. Please try again.');
    } finally {
      setDownloadingCertificate(null);
    }
  };

  const fetchCompanies = async (): Promise<Company[]> => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      setError(null);
      
      if (!currentUser) {
        console.log('No current user found');
        setCompanies([]);
        setError('No user found. Please log in again.');
        return [];
      }

      console.log('📅 Fetching companies for student:', currentUser.id);
      const response = await apiService.getStudentCompanies(currentUser.id);
      
      if (response.success && response.companies) {
        console.log('✅ Companies fetched successfully:', response.companies.length);
        
        // Transform the data to match our interface
        let transformedCompanies = transformCompanyRecords(response.companies);
        
        // Debug: Log company data to verify applicationId and startedAt
        console.log('📋 Transformed companies data:', transformedCompanies.map(c => ({
          id: c.id,
          name: c.name,
          applicationStatus: c.applicationStatus,
          applicationId: c.applicationId,
          startedAt: c.startedAt
        })));

        // Calculate remaining hours for each company based on hours_of_internship and attendance
        try {
          // Fetch attendance records for all companies to calculate accumulated hours
          const attendancePromises = transformedCompanies.map(async (company) => {
            try {
              // Get attendance records for this company
              const attendanceResponse = await apiService.getAttendanceRecords(
                company.id,
                currentUser.id,
                { internId: currentUser.id }
              );

              if (attendanceResponse.success && Array.isArray(attendanceResponse.data)) {
                // Calculate total accumulated hours from all attendance records
                const totalAccumulatedHours = attendanceResponse.data.reduce((sum: number, record: any) => {
                  return sum + (parseFloat(record.total_hours) || 0);
                }, 0);

                // Parse hours_of_internship (e.g., "136 hours" -> 136)
                let totalRequiredHours = 0;
                if (company.hoursOfInternship) {
                  // Extract numeric value from string (e.g., "136 hours" -> 136)
                  const match = company.hoursOfInternship.match(/(\d+(?:\.\d+)?)/);
                  if (match) {
                    totalRequiredHours = parseFloat(match[1]) || 0;
                  }
                }

                // Calculate remaining hours
                const remainingHours = Math.max(0, totalRequiredHours - totalAccumulatedHours);

                console.log(`📊 Company ${company.name}:`, {
                  hoursOfInternship: company.hoursOfInternship,
                  totalRequiredHours,
                  totalAccumulatedHours,
                  remainingHours
                });

                return {
                  ...company,
                  remainingHours: totalRequiredHours > 0 ? remainingHours : undefined
                };
              }

              return company;
            } catch (error) {
              console.error(`⚠️ Error calculating hours for company ${company.id}:`, error);
              return company;
            }
          });

          transformedCompanies = await Promise.all(attendancePromises);
          console.log('✅ Remaining hours calculated for all companies');
          
          // Note: Confetti is now only shown when the user clicks "Finish Internship" button,
          // not automatically when hours reach 0
        } catch (hoursError) {
          console.error('⚠️ Error calculating remaining hours:', hoursError);
          // Continue without remaining hours if calculation fails
        }

        setCompanies(transformedCompanies);
        
        // Fetch certificates after companies are loaded
        if (currentUser?.id && transformedCompanies.length > 0) {
          fetchCertificatesForCompanies(transformedCompanies);
          // Fetch supervisor evaluation status for finished companies
          fetchSupervisorEvaluationStatus(transformedCompanies);
        }
        
        return transformedCompanies;
      } else {
        console.log('❌ Failed to fetch companies:', response.message);
        setCompanies([]);
        Alert.alert('Info', response.message || 'No companies available. You may not have any approved applications.');
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching companies:', error);
      setCompanies([]);
      setError('Failed to load companies. Please try again.');
      return [];
    } finally {
      setLoading(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const filterCompanies = () => {
    let filtered = companies;

    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCompanies(filtered);
  };

  const fetchStudentProfile = async (): Promise<StudentProfileDetails | null> => {
    if (!currentUser?.id) {
      return null;
    }

    if (studentProfileLoading) {
      return studentProfile;
    }

    setStudentProfileLoading(true);
    setStudentProfileError(null);

    try {
      const response = await apiService.getProfile(currentUser.id);

      if (response.success && response.user) {
        const user = response.user;
        const normalizedProfile: StudentProfileDetails = {
          id: user.id?.toString() || currentUser.id.toString(),
          email: user.email || currentUser.email,
          firstName: user.first_name || '',
          middleName: user.middle_name || '',
          lastName: user.last_name || '',
          age: typeof user.age === 'number' ? user.age : user.age ? Number(user.age) : undefined,
          year: user.year || '',
          dateOfBirth: user.date_of_birth || '',
          program: user.program || '',
          major: user.major || '',
          address: user.address || '',
          permanentAddress: user.permanent_address || user.address || '',
          presentAddress: user.present_address || user.address || '',
          phoneNumber: user.phone_number || '',
          sex: user.sex || user.gender || '',
          civilStatus: user.civil_status || '',
          religion: user.religion || '',
          citizenship: user.citizenship || '',
          academicYear: user.academic_year || '',
          fatherName: user.father_name || '',
          fatherOccupation: user.father_occupation || '',
          motherName: user.mother_name || '',
          motherOccupation: user.mother_occupation || '',
          emergencyContactName: user.emergency_contact_name || '',
          emergencyContactRelationship: user.emergency_contact_relationship || '',
          emergencyContactNumber: user.emergency_contact_number || '',
          emergencyContactAddress: user.emergency_contact_address || '',
          photoUrl: user.photo_url || '',
        };

        setStudentProfile(normalizedProfile);
        // Store raw user data for missing field detection (attach to profile object)
        (normalizedProfile as any)._rawUser = user;
        return normalizedProfile;
      }

      setStudentProfileError(response.message || 'Failed to fetch student profile.');
      return null;
    } catch (error) {
      console.error('Error fetching student profile:', error);
      setStudentProfileError('Failed to fetch student profile.');
      return null;
    } finally {
      setStudentProfileLoading(false);
    }
  };

  const ensureStudentProfile = async () => {
    // Always fetch fresh data to ensure we have the latest personal info
    const freshProfile = await fetchStudentProfile();
    return freshProfile || studentProfile;
  };

  const gatherAttendanceRecordsForJournal = async (companyList: Company[]): Promise<AttendanceRecordEntry[]> => {
    if (!currentUser?.id || !companyList?.length) {
      return [];
    }

    const userIdString = currentUser.id.toString();

    const attendanceResults = await Promise.all(
      companyList.map(async (company) => {
        try {
          const response = await apiService.getAttendanceRecords(company.id, currentUser.id, {
            internId: currentUser.id,
          });

          if (response.success && Array.isArray(response.data)) {
            return response.data
              .filter((record: any) => {
                const recordUserId = (record.user_id ?? record.userId ?? '').toString();
                return !recordUserId || recordUserId === userIdString;
              })
              .map((record: any, index: number) => ({
                id: `${company.id}-${record.id ?? index}-${record.attendance_date ?? index}`,
                companyId: company.id,
                companyName: company.name,
                date: record.attendance_date || record.attendanceDate || '',
                status: record.status || 'not_marked',
                amIn: record.am_time_in || record.amTimeIn || '--:--',
                amOut: record.am_time_out || record.amTimeOut || '--:--',
                pmIn: record.pm_time_in || record.pmTimeIn || '--:--',
                pmOut: record.pm_time_out || record.pmTimeOut || '--:--',
                totalHours: typeof record.total_hours === 'number'
                  ? record.total_hours
                  : Number(record.total_hours || 0),
                notes: record.notes || record.description || null,
                verification_status: record.verification_status || 'pending',
                verified_by: record.verified_by || undefined,
                verified_at: record.verified_at || undefined,
                verification_remarks: record.verification_remarks || undefined,
              }));
          }
        } catch (error) {
          console.error(`Error fetching attendance for company ${company.id}`, error);
        }

        return [];
      })
    );

    return attendanceResults
      .flat()
      .filter(record => !!record.date)
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
  };

  const gatherEvidenceEntriesForJournal = async (companyList: Company[]): Promise<EvidenceEntry[]> => {
    if (!currentUser?.id) {
      return [];
    }

    try {
      const response = await apiService.getEvidences(currentUser.id, { limit: 200 });

      if (response.success && Array.isArray(response.data)) {
        const companyNameMap = companyList.reduce<Record<string, string>>((acc, company) => {
          acc[company.id] = company.name;
          return acc;
        }, {});

        const mappedEntries = response.data.map((entry: any, index: number) => ({
          id: entry.id?.toString() || `${index}-${entry.submitted_at}`,
          companyId: entry.company_id?.toString() || '',
          companyName:
            entry.companies?.company_name ||
            companyNameMap[entry.company_id?.toString() || ''] ||
            'N/A',
          title: entry.task_title || 'Untitled Entry',
          notes: entry.task_notes || 'No description provided.',
          submittedAt: entry.submitted_at || new Date().toISOString(),
          imageUrl: entry.image_url,
        }));
        
        console.log('📊 Mapped evidence entries:', mappedEntries.length, mappedEntries);
        return mappedEntries;
      }
    } catch (error) {
      console.error('Error fetching evidences for journal:', error);
    }

    return [];
  };

  const proceedJournalGeneration = async (context: PendingJournalContext) => {
    if (!currentUser) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    try {
      const [attendanceEntries, evidenceEntries] = await Promise.all([
        gatherAttendanceRecordsForJournal(context.companies),
        gatherEvidenceEntriesForJournal(context.companies),
      ]);

      // Debug: Log the fetched data
      console.log('📊 Attendance Entries:', attendanceEntries.length, attendanceEntries);
      console.log('📊 Evidence Entries:', evidenceEntries.length, evidenceEntries);

      if (!attendanceEntries.length && !evidenceEntries.length) {
        Alert.alert(
          'Info',
          'No attendance or evidence records found to include in the OJT Journal yet.'
        );
        return;
      }

      // Fetch HTE information for all started companies (finished + active)
      // Sort: finished first (by finishedAt, oldest first), then active (by startedAt)
      // Limit to 3 companies (for pages 16-18)
      const startedCompaniesForHte = companies
        .filter(c => c.startedAt !== null && c.startedAt !== undefined)
        .sort((a, b) => {
          // Finished companies first
          if (a.finishedAt && !b.finishedAt) return -1;
          if (!a.finishedAt && b.finishedAt) return 1;
          // If both finished, sort by finishedAt (oldest first)
          if (a.finishedAt && b.finishedAt) {
            return new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime();
          }
          // If both active, sort by startedAt (oldest first)
          if (a.startedAt && b.startedAt) {
            return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
          }
          return 0;
        })
        .slice(0, 3); // Limit to 3 companies

      console.log('📋 Started companies for HTE info:', startedCompaniesForHte.map(c => ({
        id: c.id,
        name: c.name,
        finishedAt: c.finishedAt,
        startedAt: c.startedAt
      })));

      const hteInfoArray: Array<{ hteInfo: HTEInformationData; companyId: string; companyName: string }> = [];
      const companySignatureUrls: Record<string, string> = {};
      const missingHteCompanies: Company[] = [];

      // Fetch HTE information for each company
      for (const company of startedCompaniesForHte) {
        try {
          console.log('📋 Fetching HTE information for company:', company.id, company.name);
          const hteResponse = await apiService.getHTEInformation(currentUser.id, company.id);
          
          if (hteResponse.success && (hteResponse as any).hteInfo) {
            const hteData = (hteResponse as any).hteInfo;
            
            // Check if HTE info is complete (all required fields filled)
            const requiredFields = [
              'nature_of_hte',
              'head_of_hte',
              'head_position',
              'immediate_supervisor',
              'supervisor_position',
              'telephone_no',
              'mobile_no',
              'email_address'
            ];
            
            const isComplete = requiredFields.every(field => {
              const value = hteData[field];
              return value && value.toString().trim().length > 0;
            });

            const hteInfo: HTEInformationData = {
              companyName: hteData.company_name || company.name || '',
              companyAddress: hteData.company_address || company.location || '',
              natureOfHte: hteData.nature_of_hte || '',
              headOfHte: hteData.head_of_hte || '',
              headPosition: hteData.head_position || '',
              immediateSupervisor: hteData.immediate_supervisor || '',
              supervisorPosition: hteData.supervisor_position || '',
              telephoneNo: hteData.telephone_no || '',
              mobileNo: hteData.mobile_no || '',
              emailAddress: hteData.email_address || '',
              htePhotoUrl: hteData.hte_photo_url || undefined,
            };

            if (isComplete) {
              hteInfoArray.push({ hteInfo, companyId: company.id, companyName: company.name });
              console.log('✅ HTE information complete for company:', company.name);
            } else {
              missingHteCompanies.push(company);
              console.log('⚠️ HTE information incomplete for company:', company.name);
            }
          } else {
            missingHteCompanies.push(company);
            console.log('ℹ️ No HTE information found for company:', company.name);
          }

          // Fetch company user's signature
          try {
            const companyUserId = company.user_id;
            if (companyUserId) {
              console.log('📋 Fetching company user profile for signature:', companyUserId);
              const companyProfileResponse = await apiService.getProfile(companyUserId.toString());
              
              if (companyProfileResponse.success && companyProfileResponse.user) {
                const userData = companyProfileResponse.user as any;
                const signatureUrl = userData.signature || undefined;
                if (signatureUrl) {
                  companySignatureUrls[company.id] = signatureUrl;
                  console.log('✅ Company signature URL for', company.name, ':', signatureUrl);
                }
              }
            }
          } catch (sigError) {
            console.error('❌ Error fetching company signature:', sigError);
          }
        } catch (hteError) {
          console.error('❌ Error fetching HTE information for company', company.id, ':', hteError);
          missingHteCompanies.push(company);
        }
      }

      // Check if there are missing HTE info companies
      if (missingHteCompanies.length > 0) {
        const missingCompanyNames = missingHteCompanies.map(c => c.name);
        setMissingHteCompanyNames(missingCompanyNames);
        setMissingHteCompanies(missingHteCompanies); // Store the actual company objects
        setShowMissingHteModal(true);
        return; // Stop journal generation, user needs to fill HTE info first
      }

      console.log('📄 Generating PDF with:', {
        attendanceCount: attendanceEntries.length,
        evidenceCount: evidenceEntries.length,
        personalInfo: context.personalInfo,
        hteInfoCount: hteInfoArray.length,
      });

      // Ensure we have the latest student profile with photoUrl
      const latestProfile = await ensureStudentProfile();
      console.log('📷 Student Profile photoUrl:', latestProfile?.photoUrl);

      // Pass photoUrl to generateJournalPdf through currentUser
      const userWithPhoto = {
        ...currentUser,
        photoUrl: latestProfile?.photoUrl || studentProfile?.photoUrl || null,
      };
      
      console.log('📷 User with photo:', { photoUrl: userWithPhoto.photoUrl });
      
      // Fetch feedback form data for ALL finished companies
      let feedbackFormDataArray: InternFeedbackFormData[] = [];
      try {
        const finishedCompanies = companies.filter(c => c.finishedAt !== null && c.finishedAt !== undefined);
        if (finishedCompanies.length > 0) {
          // Fetch feedback forms for all finished companies
          for (const company of finishedCompanies) {
            try {
              const feedbackResponse = await apiService.getFeedbackForm(currentUser.id, company.id);
              
              if (feedbackResponse.success && (feedbackResponse as any).feedbackForm) {
                const form = (feedbackResponse as any).feedbackForm;
                const feedbackFormData: InternFeedbackFormData = {
                  id: form.id.toString(),
                  studentId: form.student_id.toString(),
                  companyId: form.company_id.toString(),
                  question1: form.question_1,
                  question2: form.question_2,
                  question3: form.question_3,
                  question4: form.question_4,
                  question5: form.question_5,
                  question6: form.question_6,
                  question7: form.question_7,
                  problemsMet: form.problems_met || '',
                  otherConcerns: form.other_concerns || '',
                  formDate: form.form_date || form.created_at,
                  createdAt: form.created_at,
                  updatedAt: form.updated_at,
                };
                feedbackFormDataArray.push(feedbackFormData);
                console.log(`✅ Fetched feedback form data for company ${company.name}:`, feedbackFormData);
              }
            } catch (companyFeedbackError) {
              console.error(`❌ Error fetching feedback form for company ${company.id}:`, companyFeedbackError);
              // Continue with other companies even if one fails
            }
          }
          
          if (feedbackFormDataArray.length > 0) {
            console.log(`✅ Fetched ${feedbackFormDataArray.length} feedback form(s) total`);
          } else {
            console.log('ℹ️ No feedback forms found for finished companies');
          }
        }
      } catch (feedbackError) {
        console.error('❌ Error fetching feedback forms:', feedbackError);
        // Continue without feedback form data if fetch fails
      }
      
      // Group attendance entries by companyId
      const attendanceByCompany: Record<string, AttendanceRecordEntry[]> = {};
      attendanceEntries.forEach(entry => {
        if (!attendanceByCompany[entry.companyId]) {
          attendanceByCompany[entry.companyId] = [];
        }
        attendanceByCompany[entry.companyId].push(entry);
      });

      // Sort entries within each company by date
      Object.keys(attendanceByCompany).forEach(companyId => {
        attendanceByCompany[companyId].sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
      });

      // Get all started companies (finished + active), sorted: finished first, then active
      const startedCompanies = companies
        .filter(c => c.startedAt !== null && c.startedAt !== undefined)
        .sort((a, b) => {
          // Finished companies first
          if (a.finishedAt && !b.finishedAt) return -1;
          if (!a.finishedAt && b.finishedAt) return 1;
          // If both finished, sort by finishedAt (oldest first)
          if (a.finishedAt && b.finishedAt) {
            return new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime();
          }
          // If both active, sort by startedAt (oldest first)
          if (a.startedAt && b.startedAt) {
            return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
          }
          return 0;
        });

      // Create company-specific data structure for DTR pages
      const companyDtrData = startedCompanies.map(company => {
        const companyId = company.id;
        const hteInfo = hteInfoArray.find(item => item.companyId === companyId)?.hteInfo;
        const companyAttendance = attendanceByCompany[companyId] || [];
        
        return {
          companyId,
          companyName: hteInfo?.companyName || company.name || '',
          companyAddress: hteInfo?.companyAddress || company.location || '',
          attendanceEntries: companyAttendance,
          signatureUrl: companySignatureUrls[companyId] || undefined,
          finishedAt: company.finishedAt || null, // Include finished status
          hoursOfInternship: company.hoursOfInternship || null, // Include hours of internship limit
        };
      });

      // Extract HTE info array for HTE pages (pages 16-18)
      const hteInfoList = hteInfoArray.map(item => item.hteInfo);
      
      // Keep full hteInfoArray with companyId for feedback form matching
      
      // Fetch certificates for the student from all companies
      const certificates: CertificateEntry[] = [];
      try {
        console.log('📋 Fetching certificates for journal generation...');
        
        // Get unique company IDs from started companies
        const companyIds = [...new Set(startedCompanies.map(c => c.id))];
        
        // Fetch certificates for each company
        for (const companyId of companyIds) {
          try {
            const certResponse = await apiService.getCompanyCertificates(companyId);
            
            if (certResponse.success && (certResponse as any).certificates) {
              const companyCerts = (certResponse as any).certificates as any[];
              
              // Filter certificates for current student and get the newest one per company
              const currentUserId = currentUser.id.toString();
              const studentCerts = companyCerts
                .filter((cert: any) => {
                  const certStudentId = cert.student_id?.toString();
                  return certStudentId === currentUserId;
                })
                .sort((a: any, b: any) => {
                  // Sort by generated_at DESC (newest first)
                  if (a.generated_at && b.generated_at) {
                    return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
                  }
                  // Fallback to ID DESC (higher ID = newer)
                  const idA = parseInt(a.id) || 0;
                  const idB = parseInt(b.id) || 0;
                  return idB - idA;
                });
              
              // Get the newest certificate for this company
              const newestCert = studentCerts[0];
              
              if (newestCert) {
                // Find company name
                const company = startedCompanies.find(c => c.id === companyId);
                const companyName = company?.name || '';
                
                certificates.push({
                  id: newestCert.id.toString(),
                  companyId: companyId,
                  companyName: companyName,
                  certificateUrl: newestCert.certificate_url || '',
                  generatedAt: newestCert.generated_at || new Date().toISOString(),
                  totalHours: newestCert.total_hours || undefined,
                  startDate: newestCert.start_date || undefined,
                  endDate: newestCert.end_date || undefined,
                  templateId: newestCert.template_id || '',
                });
                
                console.log(`✅ Found certificate for company ${companyName} (ID: ${companyId})`);
              }
            }
          } catch (certError) {
            console.error(`❌ Error fetching certificates for company ${companyId}:`, certError);
            // Continue with other companies even if one fails
          }
        }
        
        // Sort certificates by generated_at DESC (newest first), limit to 2 for pages 45-46
        certificates.sort((a, b) => {
          const dateA = new Date(a.generatedAt);
          const dateB = new Date(b.generatedAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        console.log(`📋 Found ${certificates.length} certificate(s) for journal generation`);
      } catch (error) {
        console.error('❌ Error fetching certificates:', error);
        // Continue without certificates if fetch fails
      }
      
      // Fetch training schedules for the student
      let trainingSchedules: TrainingScheduleEntry[] = [];
      try {
        console.log('📋 Fetching training schedules for journal generation...');
        const trainingResponse = await apiService.getTrainingSchedules(currentUser.id);
        
        if (trainingResponse.success && (trainingResponse as any).schedules) {
          trainingSchedules = (trainingResponse as any).schedules.map((s: any) => ({
            id: s.id.toString(),
            taskClassification: s.task_classification || '',
            toolsDeviceSoftwareUsed: s.tools_device_software_used || '',
            totalHours: parseFloat(s.total_hours) || 0,
          }));
          console.log(`✅ Fetched ${trainingSchedules.length} training schedule entries.`);
        }
      } catch (trainingError) {
        console.error('❌ Error fetching training schedules for journal:', trainingError);
        // Continue without training schedules if fetch fails
      }
      
      // Fetch student signature URL
      let studentSignatureUrl: string | undefined = undefined;
      try {
        console.log('📋 Fetching student signature for journal generation...');
        const studentProfileResponse = await apiService.getProfile(currentUser.id.toString());
        
        if (studentProfileResponse.success && studentProfileResponse.user) {
          const userData = studentProfileResponse.user as any;
          studentSignatureUrl = userData.signature || userData.esignature || undefined;
          if (studentSignatureUrl) {
            console.log('✅ Found student signature URL for journal.');
          } else {
            console.log('⚠️ No student signature found.');
          }
        }
      } catch (sigError) {
        console.error('❌ Error fetching student signature:', sigError);
        // Continue without signature if fetch fails
      }
      
      // Fetch supervisor evaluation forms for finished companies
      let supervisorEvaluationFormsArray: SupervisorEvaluationFormData[] = [];
      try {
        const finishedCompanies = companies.filter(c => c.finishedAt !== null && c.finishedAt !== undefined);
        if (finishedCompanies.length > 0) {
          console.log(`📋 Fetching supervisor evaluation forms for ${finishedCompanies.length} finished company(ies)`);
          
          for (const company of finishedCompanies) {
            try {
              const evalResponse = await apiService.getSupervisorEvaluation(currentUser.id, company.id);
              
              if (evalResponse.success && (evalResponse as any).evaluationForm) {
                const evalData = (evalResponse as any).evaluationForm;
                
                // Get company signature from companySignatureUrls (already fetched earlier for started companies)
                // If not found, fetch it now for finished companies
                let companySignatureUrl = companySignatureUrls[company.id];
                if (!companySignatureUrl) {
                  try {
                    const companyUserId = company.user_id;
                    if (companyUserId) {
                      console.log('📋 Fetching company user profile for signature (finished company):', companyUserId);
                      const companyProfileResponse = await apiService.getProfile(companyUserId.toString());
                      
                      if (companyProfileResponse.success && companyProfileResponse.user) {
                        const userData = companyProfileResponse.user as any;
                        companySignatureUrl = userData.signature || undefined;
                        if (companySignatureUrl) {
                          companySignatureUrls[company.id] = companySignatureUrl;
                          console.log('✅ Company signature URL for', company.name, ':', companySignatureUrl);
                        }
                      }
                    }
                  } catch (sigError) {
                    console.error('❌ Error fetching company signature for finished company:', sigError);
                  }
                }
                
                // Transform API response to SupervisorEvaluationFormData interface
                const transformedForm: SupervisorEvaluationFormData = {
                  id: evalData.id?.toString() || '',
                  studentId: evalData.student_id?.toString() || currentUser.id,
                  companyId: evalData.company_id?.toString() || company.id,
                  applicationId: evalData.application_id?.toString(),
                  // Section I: COMPANY AND SUPERVISOR
                  organizationCompanyName: evalData.organization_company_name || '',
                  address: evalData.address || '',
                  city: evalData.city || '',
                  zip: evalData.zip || '',
                  supervisorPosition: evalData.supervisor_position || '',
                  supervisorPhone: evalData.supervisor_phone || undefined,
                  supervisorEmail: evalData.supervisor_email || undefined,
                  // Section II: ON-THE-JOB TRAINING DATA
                  startDate: evalData.start_date || '',
                  endDate: evalData.end_date || '',
                  totalHours: parseFloat(evalData.total_hours) || 0,
                  descriptionOfDuties: evalData.description_of_duties || '',
                  // Section III: PERFORMANCE EVALUATION
                  question1Performance: evalData.question_1_performance || 'Good',
                  question2SkillsCareer: evalData.question_2_skills_career ?? true,
                  question2Elaboration: evalData.question_2_elaboration || undefined,
                  question3FulltimeCandidate: evalData.question_3_fulltime_candidate ?? true,
                  question4InterestOtherTrainees: evalData.question_4_interest_other_trainees ?? true,
                  question4Elaboration: evalData.question_4_elaboration || undefined,
                  // Work Performance (6 items, 1-5 rating)
                  workPerformance1: evalData.work_performance_1 || undefined,
                  workPerformance2: evalData.work_performance_2 || undefined,
                  workPerformance3: evalData.work_performance_3 || undefined,
                  workPerformance4: evalData.work_performance_4 || undefined,
                  workPerformance5: evalData.work_performance_5 || undefined,
                  workPerformance6: evalData.work_performance_6 || undefined,
                  // Communication Skills (2 items, 1-5 rating)
                  communication1: evalData.communication_1 || undefined,
                  communication2: evalData.communication_2 || undefined,
                  // Professional Conduct (3 items, 1-5 rating)
                  professionalConduct1: evalData.professional_conduct_1 || undefined,
                  professionalConduct2: evalData.professional_conduct_2 || undefined,
                  professionalConduct3: evalData.professional_conduct_3 || undefined,
                  // Punctuality (3 items, 1-5 rating)
                  punctuality1: evalData.punctuality_1 || undefined,
                  punctuality2: evalData.punctuality_2 || undefined,
                  punctuality3: evalData.punctuality_3 || undefined,
                  // Flexibility (2 items, 1-5 rating)
                  flexibility1: evalData.flexibility_1 || undefined,
                  flexibility2: evalData.flexibility_2 || undefined,
                  // Attitude (5 items, 1-5 rating)
                  attitude1: evalData.attitude_1 || undefined,
                  attitude2: evalData.attitude_2 || undefined,
                  attitude3: evalData.attitude_3 || undefined,
                  attitude4: evalData.attitude_4 || undefined,
                  attitude5: evalData.attitude_5 || undefined,
                  // Reliability (4 items, 1-5 rating)
                  reliability1: evalData.reliability_1 || undefined,
                  reliability2: evalData.reliability_2 || undefined,
                  reliability3: evalData.reliability_3 || undefined,
                  reliability4: evalData.reliability_4 || undefined,
                  // Total score
                  totalScore: evalData.total_score ? parseFloat(evalData.total_score) : undefined,
                  // Supervisor signature
                  supervisorName: evalData.supervisor_name || undefined,
                  supervisorSignatureUrl: evalData.supervisor_signature_url || undefined,
                  // Company signature (from users.signature)
                  companySignatureUrl: companySignatureUrl,
                  evaluationDate: evalData.evaluation_date || new Date().toISOString().split('T')[0],
                  createdAt: evalData.created_at || '',
                  updatedAt: evalData.updated_at || '',
                };
                
                supervisorEvaluationFormsArray.push(transformedForm);
                console.log(`✅ Fetched supervisor evaluation form for company: ${company.name}`);
              } else {
                console.log(`ℹ️ No supervisor evaluation form found for company: ${company.name}`);
              }
            } catch (error) {
              console.error(`❌ Error fetching evaluation for company ${company.name} (${company.id}):`, error);
              // Continue with other companies even if one fails
            }
          }
          
          console.log(`📋 Total supervisor evaluation forms fetched: ${supervisorEvaluationFormsArray.length}`);
        } else {
          console.log('ℹ️ No finished companies found, skipping supervisor evaluation form fetch');
        }
      } catch (evalError) {
        console.error('❌ Error fetching supervisor evaluation forms:', evalError);
        // Continue without evaluation forms if fetch fails
      }
      
      const journalUri = await generateJournalPdf(
        userWithPhoto,
        context.personalInfo,
        companyDtrData,
        evidenceEntries,
        hteInfoList,
        certificates.length > 0 ? certificates : undefined,
        trainingSchedules.length > 0 ? trainingSchedules : undefined,
        studentSignatureUrl,
        feedbackFormDataArray.length > 0 ? feedbackFormDataArray : undefined,
        hteInfoArray, // Pass full array with companyId for feedback form matching
        supervisorEvaluationFormsArray.length > 0 ? supervisorEvaluationFormsArray : undefined
      );

      await openGeneratedJournal(journalUri);
    } catch (error) {
      console.error('Error generating journal data:', error);
      Alert.alert('Error', 'Failed to generate the OJT Journal. Please try again.');
    } finally {
      setPendingJournalContext(null);
    }
  };

  // Map field labels to database field names
  const getFieldDbName = (fieldLabel: string): string => {
    const fieldMap: Record<string, string> = {
      'Name of Intern': 'fullName', // This is computed, not stored
      'Date of Birth': 'date_of_birth',
      'Age': 'age',
      'Sex': 'sex',
      'Civil Status': 'civil_status',
      'Year Level': 'year',
      'Academic Year': 'academic_year',
      'Religion': 'religion',
      'Permanent Address': 'permanent_address',
      'Present Address': 'present_address',
      'Contact Number': 'phone_number',
      'Email Address': 'email', // This is in users table
      'Citizenship': 'citizenship',
      "Father's Name": 'father_name',
      "Father's Occupation": 'father_occupation',
      "Mother's Name": 'mother_name',
      "Mother's Occupation": 'mother_occupation',
      'Emergency Contact Name': 'emergency_contact_name',
      'Emergency Relationship': 'emergency_contact_relationship',
      'Emergency Contact Number': 'emergency_contact_number',
      'Emergency Contact Address': 'emergency_contact_address',
    };
    return fieldMap[fieldLabel] || '';
  };

  const validatePersonalInfo = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate all missing fields are filled
    missingPersonalInfoFields.forEach((field) => {
      const value = personalInfoFormData[field]?.trim();
      if (!value || value.length === 0) {
        errors[field] = `${field} is required`;
      } else {
        // Additional field-specific validations
        if (field === 'Email Address' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[field] = 'Please enter a valid email address';
          }
        }
        if (field === 'Contact Number' || field === 'Emergency Contact Number') {
          // Remove common phone number characters for validation
          const phoneDigits = value.replace(/[\s\-\(\)\+]/g, '');
          if (phoneDigits.length !== 11) {
            errors[field] = 'Mobile number must be exactly 11 digits';
          } else if (!/^\d+$/.test(phoneDigits)) {
            errors[field] = 'Mobile number must contain only digits';
          } else if (!phoneDigits.startsWith('09')) {
            errors[field] = 'Mobile number must start with 09';
          }
        }
        if (field === 'Age' && value) {
          const ageNum = parseInt(value, 10);
          if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
            errors[field] = 'Please enter a valid age (1-150)';
          }
        }
        if (field === 'Academic Year' && value) {
          const yearRegex = /^\d{4}-\d{4}$/;
          if (!yearRegex.test(value)) {
            errors[field] = 'Please enter academic year in format YYYY-YYYY (e.g., 2024-2025)';
          }
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePersonalInfo = async () => {
    if (!currentUser?.id || !studentProfile) {
      Alert.alert('Error', 'Unable to save. Please try again.');
      return;
    }

    // Validate all fields before saving
    if (!validatePersonalInfo()) {
      Alert.alert(
        'Validation Error',
        'Please fill in all required fields correctly before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsSavingPersonalInfo(true);

      // Map form data to database fields
      const updateData: Record<string, any> = {};
      
      Object.entries(personalInfoFormData).forEach(([fieldLabel, value]) => {
        const dbField = getFieldDbName(fieldLabel);
        if (dbField && value.trim()) {
          updateData[dbField] = value.trim();
        }
      });

      // Add photo URL if uploaded
      if (profilePhoto) {
        updateData.photo_url = profilePhoto;
      }

      // Note: emergency_contact_address column has been removed from the database
      // Emergency contact address now uses the permanent_address value (handled in backend/PDF generation)

      if (Object.keys(updateData).length === 0) {
        Alert.alert('Info', 'No data to save.');
        return;
      }

      // Call API to update student profile
      const response = await apiService.updateStudentProfile(currentUser.id, updateData);
      
      if (response.success) {
        // Clear validation errors
        setValidationErrors({});
        // Refresh student profile to get updated data
        await fetchStudentProfile();
        
        // Close modal first
        setShowMissingInfoModal(false);
        setMissingPersonalInfoFields([]);
        setPersonalInfoFormData({});
        
        // If we have pending journal context, proceed with journal generation
        if (pendingJournalContext) {
          try {
            setIsDownloadingJournal(true);
            await proceedJournalGeneration(pendingJournalContext);
          } catch (error) {
            console.error('Error generating journal after save:', error);
            Alert.alert('Error', 'Personal information saved, but failed to generate journal. Please try again.');
          } finally {
            setIsDownloadingJournal(false);
            setPendingJournalContext(null);
          }
        } else {
          Alert.alert('Success', 'Personal information saved successfully!');
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to save personal information.');
      }
    } catch (error) {
      console.error('Error saving personal information:', error);
      Alert.alert('Error', 'Failed to save personal information. Please try again.');
    } finally {
      setIsSavingPersonalInfo(false);
    }
  };

  const handlePickProfilePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
          return;
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: Platform.OS !== 'web',
        aspect: Platform.OS === 'web' ? undefined : [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingPhoto(true);
        const asset = result.assets[0];
        
        // Convert URI to blob for Cloudinary upload
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        // Upload to Cloudinary using the main image service
        const uploadResult = await CloudinaryService.uploadImage(
          blob,
          'student-profile-photos'
        );
        
        if (uploadResult.success && uploadResult.url) {
          setProfilePhoto(uploadResult.url);
          Alert.alert('Success', 'Photo uploaded successfully!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload photo');
        }
      }
    } catch (error) {
      console.error('Error picking profile photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleMissingInfoCancel = () => {
    setShowMissingInfoModal(false);
    setMissingPersonalInfoFields([]);
    setPendingJournalContext(null);
    setPersonalInfoFormData({});
    setValidationErrors({});
    setProfilePhoto(null);
  };

  const handleMissingInfoContinue = async () => {
    if (!pendingJournalContext) {
      handleMissingInfoCancel();
      return;
    }

    setShowMissingInfoModal(false);
    setMissingPersonalInfoFields([]);
    setPersonalInfoFormData({});
    setProfilePhoto(null);

    try {
      setIsDownloadingJournal(true);
      await proceedJournalGeneration(pendingJournalContext);
    } finally {
      setIsDownloadingJournal(false);
    }
  };

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyDetails(true);
  };

  const handleStartInternship = async (company: Company) => {
    console.log('🚀 handleStartInternship called with company:', {
      id: company.id,
      name: company.name,
      applicationStatus: company.applicationStatus,
      applicationId: company.applicationId,
      startedAt: company.startedAt,
      currentUserId: currentUser?.id
    });

    if (!currentUser?.id) {
      console.log('❌ No current user found');
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    // Check if application is approved
    if (company.applicationStatus !== 'approved') {
      console.log('❌ Application not approved:', company.applicationStatus);
      Alert.alert(
        'Cannot Start Internship',
        'Your application must be approved before you can start the internship.'
      );
      return;
    }

    // Check if application ID exists
    if (!company.applicationId) {
      console.log('❌ Application ID not found for company:', company.id);
      Alert.alert('Error', 'Application ID not found. Please try refreshing the page.');
      return;
    }

    // Check if already started
    if (company.startedAt) {
      console.log('ℹ️ Internship already started:', company.startedAt);
      Alert.alert('Info', 'You have already started your internship with this company.');
      return;
    }

    // Check if already finished
    if (company.finishedAt) {
      console.log('ℹ️ Internship already finished:', company.finishedAt);
      Alert.alert(
        'Internship Completed',
        'This internship has already been completed and cannot be started again.'
      );
      return;
    }

    // Check if user has an active internship with another company that's not completed
    // Only block if remainingHours is explicitly > 0 (meaning there are hours left to complete)
    const activeInternship = companies.find(c => 
      c.id !== company.id && 
      c.startedAt !== null && 
      c.startedAt !== undefined &&
      c.remainingHours !== undefined &&
      c.remainingHours > 0
    );

    if (activeInternship) {
      console.log('⚠️ User has active internship with another company:', {
        name: activeInternship.name,
        remainingHours: activeInternship.remainingHours,
        startedAt: activeInternship.startedAt
      });
      setActiveCompanyName(activeInternship.name);
      setActiveCompanyRemainingHours(activeInternship.remainingHours);
      setCompanyToStartBlocked(company);
      setShowActiveInternshipModal(true);
      return;
    }

    console.log('✅ All checks passed, showing confirmation modal');
    setCompanyToStart(company);
    setShowStartInternshipModal(true);
  };

  const handleConfirmStartInternship = async () => {
    if (!companyToStart || !currentUser?.id) {
      console.log('❌ Missing company or user data');
      return;
    }

    console.log('✅ User confirmed, starting internship...');
    try {
      setIsStartingInternship(companyToStart.id);
      setShowStartInternshipModal(false);
      
      console.log('📡 Calling API to start internship:', {
        applicationId: companyToStart.applicationId,
        studentId: currentUser.id,
        url: `/applications/${companyToStart.applicationId}/start`
      });
      
      // Call API to mark internship as started
      const response = await apiService.startInternship(
        companyToStart.applicationId!.toString(),
        currentUser.id
      );
      
      console.log('📡 API Response received:', {
        success: response.success,
        message: response.message,
        application: (response as any).application,
        fullResponse: response
      });
      
      if (response.success) {
        console.log('✅ Internship started successfully');
      Alert.alert(
          'Success',
          `You have successfully started your internship with ${companyToStart.name}!`,
          [{ 
            text: 'OK',
            onPress: () => {
              console.log('✅ User acknowledged success');
            }
          }]
        );
        
        // Refresh companies to get updated data
        console.log('🔄 Refreshing companies list...');
        await fetchCompanies();
        console.log('✅ Companies list refreshed');
      } else {
        console.log('❌ API returned error:', {
          message: response.message,
          error: response.error,
          fullResponse: response
        });
        Alert.alert(
          'Error', 
          response.message || response.error || 'Failed to start internship. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error starting internship:', {
        error,
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      Alert.alert(
        'Error', 
        error?.message || 'Failed to start internship. Please try again.'
      );
    } finally {
      setIsStartingInternship(null);
      setCompanyToStart(null);
      console.log('🏁 Finished starting internship process');
    }
  };

  const handleCancelStartInternship = () => {
    console.log('❌ User cancelled starting internship');
    setShowStartInternshipModal(false);
    setCompanyToStart(null);
  };


  const handleGetOJTJournal = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    try {
      setIsDownloadingJournal(true);

      const companiesForJournal =
        companies.length > 0 ? companies : await fetchCompanies();

      if (!companiesForJournal.length) {
        Alert.alert('Info', 'No approved companies available for generating the OJT Journal.');
        return;
      }

      const profile = await ensureStudentProfile();

      if (!profile) {
        Alert.alert('Error', studentProfileError || 'Unable to load your profile details.');
        return;
      }

      // Get raw user data if available (stored in profile._rawUser)
      const rawUser = (profile as any)._rawUser;
      const { personalInfo, missingFields } = buildPersonalInformation(profile, currentUser.email, rawUser);

      // Debug: Log the personal info data
      console.log('📋 Personal Info Data:', personalInfo);
      console.log('📋 Missing Fields:', missingFields);
      console.log('📋 Profile Data:', {
        sex: profile.sex,
        civilStatus: profile.civilStatus,
        religion: profile.religion,
        citizenship: profile.citizenship,
        permanentAddress: profile.permanentAddress,
        presentAddress: profile.presentAddress,
        academicYear: profile.academicYear,
        fatherName: profile.fatherName,
        motherName: profile.motherName,
        emergencyContactName: profile.emergencyContactName,
      });

      // Store the context for later use
      setPendingJournalContext({ companies: companiesForJournal, personalInfo });

      // Always show selection modal first with two options:
      // 1. Missing Personal Information
      // 2. Missing HTE Information
      setShowMissingInfoSelectionModal(true);
    } catch (error) {
      console.error('Error getting OJT journal:', error);
      Alert.alert('Error', 'Failed to generate the OJT Journal. Please try again.');
    } finally {
      setIsDownloadingJournal(false);
    }
  };

  const handleGetOJTJournalDirect = async () => {
    if (!pendingJournalContext) {
      setShowMissingInfoSelectionModal(false);
      return;
    }

    const profile = studentProfile || await ensureStudentProfile();
    if (!profile) {
      Alert.alert('Error', 'Unable to load your profile details.');
      setShowMissingInfoSelectionModal(false);
      return;
    }

    // Get raw user data if available
    const rawUser = (profile as any)._rawUser;
    const { personalInfo, missingFields } = buildPersonalInformation(profile, currentUser.email, rawUser);

    setShowMissingInfoSelectionModal(false);

    // If there are missing fields, show the input modal
    // Otherwise, proceed directly to journal generation
    if (missingFields.length > 0) {
      console.log('📋 Missing fields detected, showing input modal');
      setMissingPersonalInfoFields(missingFields);
      setShowMissingInfoModal(true);
      // Update context with latest personal info
      setPendingJournalContext({ ...pendingJournalContext, personalInfo });
    } else {
      console.log('✅ All personal information complete, generating journal directly');
      // All personal information is complete, proceed directly to journal generation
      try {
        setIsDownloadingJournal(true);
        await proceedJournalGeneration(pendingJournalContext);
      } catch (error) {
        console.error('Error generating journal:', error);
        Alert.alert('Error', 'Failed to generate the OJT Journal. Please try again.');
      } finally {
        setIsDownloadingJournal(false);
        setPendingJournalContext(null);
      }
    }
  };

  const handleMissingPersonalInfoClick = async () => {
    if (!pendingJournalContext) return;
    
    const profile = studentProfile;
    if (!profile) return;

    // Get raw user data if available
    const rawUser = (profile as any)._rawUser;
    const { personalInfo, missingFields } = buildPersonalInformation(profile, currentUser.email, rawUser);

    setShowMissingInfoSelectionModal(false);
    
    // If there are missing fields, show the input modal
    if (missingFields.length > 0) {
      console.log('📋 Missing fields detected, showing input modal');
      setMissingPersonalInfoFields(missingFields);
      setShowMissingInfoModal(true);
    } else {
      // All fields are complete, show info complete modal
      console.log('✅ All personal information is already complete');
      setShowInfoCompleteModal(true);
    }
  };

  const handleMissingHTEInfoClick = async () => {
    setShowMissingInfoSelectionModal(false);
    setShowMissingHteModal(false);
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    try {
      // Find the most recently started company from the missing HTE companies list
      // Filter to only companies that are in the missing list and have startedAt
      const missingCompaniesWithStartedAt = missingHteCompanies.filter(c => 
        c.startedAt !== null && c.startedAt !== undefined
      );
      
      let startedCompany: Company | null = null;
      
      if (missingCompaniesWithStartedAt.length > 0) {
        // Sort by startedAt (most recent first) and get the first one
        startedCompany = missingCompaniesWithStartedAt.sort((a, b) => {
          const dateA = new Date(a.startedAt!).getTime();
          const dateB = new Date(b.startedAt!).getTime();
          return dateB - dateA; // Most recent first
        })[0];
        
        console.log('📋 Selected most recently started company from missing HTE list:', startedCompany.name, 'startedAt:', startedCompany.startedAt);
      } else {
        // Fallback: if no missing companies have startedAt, find any started company
        startedCompany = companies.find(c => c.startedAt !== null && c.startedAt !== undefined) || null;
        
        if (!startedCompany) {
          Alert.alert(
            'No Active Internship',
            'You need to start an internship first before filling HTE information.'
          );
          return;
        }
        
        console.log('📋 Fallback: Using any started company:', startedCompany.name);
      }
      
      if (!startedCompany) {
        Alert.alert(
          'No Active Internship',
          'You need to start an internship first before filling HTE information.'
        );
        return;
      }

      // Set the selected company
      setSelectedCompanyForHte(startedCompany);
      
      // Try to fetch existing HTE information
      try {
        const hteResponse = await apiService.getHTEInformation(currentUser.id, startedCompany.id);
        
        if (hteResponse.success && (hteResponse as any).hteInfo) {
          // Pre-fill with existing data
          const existingData = (hteResponse as any).hteInfo;
          const initialFormData: Record<string, string> = {
            companyName: existingData.company_name || startedCompany.name || '',
            companyAddress: existingData.company_address || startedCompany.location || '',
            natureOfHte: existingData.nature_of_hte || '',
            headOfHte: existingData.head_of_hte || '',
            headPosition: existingData.head_position || '',
            immediateSupervisor: existingData.immediate_supervisor || '',
            supervisorPosition: existingData.supervisor_position || '',
            telephoneNo: existingData.telephone_no || '',
            mobileNo: existingData.mobile_no || '',
            emailAddress: existingData.email_address || '',
          };
          
          setHteInfoFormData(initialFormData);
          setHtePhoto(existingData.hte_photo_url || null);
        } else {
          // No existing data, use defaults
          const initialFormData: Record<string, string> = {
            companyName: startedCompany.name || '',
            companyAddress: startedCompany.location || '',
            natureOfHte: '',
            headOfHte: '',
            headPosition: '',
            immediateSupervisor: '',
            supervisorPosition: '',
            telephoneNo: '',
            mobileNo: '',
            emailAddress: '',
          };
          
          setHteInfoFormData(initialFormData);
          setHtePhoto(null);
        }
      } catch (fetchError) {
        console.error('Error fetching HTE information:', fetchError);
        // Continue with default values if fetch fails
        const initialFormData: Record<string, string> = {
          companyName: startedCompany.name || '',
          companyAddress: startedCompany.location || '',
          natureOfHte: '',
          headOfHte: '',
          headPosition: '',
          immediateSupervisor: '',
          supervisorPosition: '',
          telephoneNo: '',
          mobileNo: '',
          emailAddress: '',
        };
        
        setHteInfoFormData(initialFormData);
        setHtePhoto(null);
      }

      setHteValidationErrors({});
      setShowHTEInfoModal(true);
    } catch (error) {
      console.error('Error preparing HTE information:', error);
      Alert.alert('Error', 'Failed to load company information. Please try again.');
    }
  };

  const handlePickHtePhoto = async () => {
    try {
      setIsUploadingHtePhoto(true);
      console.log('📷 Opening image library for HTE photo...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📷 Selected asset:', asset);
        
        // Convert URI to blob for Cloudinary upload
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        // Upload to Cloudinary
        const uploadResult = await CloudinaryService.uploadImage(
          blob,
          'hte-photos'
        );
        
        if (uploadResult.success && uploadResult.url) {
          setHtePhoto(uploadResult.url);
          Alert.alert('Success', 'HTE photo uploaded successfully!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload photo');
        }
      }
    } catch (error) {
      console.error('Error picking HTE photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    } finally {
      setIsUploadingHtePhoto(false);
    }
  };

  const validateHteInfo = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required fields validation
    const requiredFields = [
      'natureOfHte',
      'headOfHte',
      'headPosition',
      'immediateSupervisor',
      'supervisorPosition',
      'telephoneNo',
      'mobileNo',
      'emailAddress'
    ];

    requiredFields.forEach((field) => {
      const value = hteInfoFormData[field]?.trim();
      if (!value || value.length === 0) {
        const fieldLabel = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
        errors[field] = `${fieldLabel} is required`;
      }
    });

    // Email validation
    if (hteInfoFormData.emailAddress) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(hteInfoFormData.emailAddress.trim())) {
        errors.emailAddress = 'Please enter a valid email address';
      }
    }

    // Phone number validation
    if (hteInfoFormData.telephoneNo) {
      const phoneDigits = hteInfoFormData.telephoneNo.replace(/[\s\-\(\)\+]/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        errors.telephoneNo = 'Please enter a valid telephone number (7-15 digits)';
      }
    }

    if (hteInfoFormData.mobileNo) {
      const mobileDigits = hteInfoFormData.mobileNo.replace(/[\s\-\(\)\+]/g, '');
      if (mobileDigits.length !== 11) {
        errors.mobileNo = 'Mobile number must be exactly 11 digits';
      } else if (!/^\d+$/.test(mobileDigits)) {
        errors.mobileNo = 'Mobile number must contain only digits';
      } else if (!mobileDigits.startsWith('09')) {
        errors.mobileNo = 'Mobile number must start with 09';
      }
    }

    setHteValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveHteInfo = async () => {
    if (!currentUser?.id || !selectedCompanyForHte) {
      Alert.alert('Error', 'Unable to save. Please try again.');
      return;
    }

    if (!validateHteInfo()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsSavingHteInfo(true);

    try {
      const hteData = {
        companyName: hteInfoFormData.companyName || selectedCompanyForHte.name,
        companyAddress: hteInfoFormData.companyAddress || selectedCompanyForHte.location,
        htePhotoUrl: htePhoto,
        natureOfHte: hteInfoFormData.natureOfHte,
        headOfHte: hteInfoFormData.headOfHte,
        headPosition: hteInfoFormData.headPosition,
        immediateSupervisor: hteInfoFormData.immediateSupervisor,
        supervisorPosition: hteInfoFormData.supervisorPosition,
        telephoneNo: hteInfoFormData.telephoneNo,
        mobileNo: hteInfoFormData.mobileNo,
        emailAddress: hteInfoFormData.emailAddress,
      };

      console.log('💾 Saving HTE information:', hteData);

      const response = await apiService.saveHTEInformation(
        currentUser.id,
        selectedCompanyForHte.id,
        hteData
      );

      if (response.success) {
        Alert.alert('Success', 'HTE information saved successfully!');
        setShowHTEInfoModal(false);
        setHteInfoFormData({});
        setHtePhoto(null);
        setSelectedCompanyForHte(null);
      } else {
        Alert.alert('Error', response.message || 'Failed to save HTE information. Please try again.');
      }
    } catch (error: any) {
      console.error('Error saving HTE information:', error);
      Alert.alert('Error', error.message || 'Failed to save HTE information. Please try again.');
    } finally {
      setIsSavingHteInfo(false);
    }
  };

  const handleHteInfoCancel = () => {
    setShowHTEInfoModal(false);
    setHteInfoFormData({});
    setHteValidationErrors({});
    setHtePhoto(null);
    setSelectedCompanyForHte(null);
  };

  // Training Schedule Handlers
  const handleTrainingScheduleClick = async () => {
    setShowMissingInfoSelectionModal(false);
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    try {
      setIsLoadingTrainingSchedules(true);
      
      // Fetch training schedules
      const response = await apiService.getTrainingSchedules(currentUser.id);
      
      if (response.success && (response as any).schedules) {
        setTrainingSchedules((response as any).schedules.map((s: any) => ({
          id: s.id.toString(),
          taskClassification: s.task_classification || '',
          toolsDeviceSoftwareUsed: s.tools_device_software_used || '',
          totalHours: parseFloat(s.total_hours) || 0,
        })));
      } else {
        setTrainingSchedules([]);
      }
      
      // Calculate Section A total hours from attendance records
      // Only count accepted attendance records and cap at hoursOfInternship for each company
      try {
        const startedCompanies = companies.filter(c => c.startedAt !== null && c.startedAt !== undefined);
        let totalSectionAHours = 0;
        
        for (const company of startedCompanies) {
          try {
            // Only calculate if internship is finished
            const isFinished = company.finishedAt !== null && company.finishedAt !== undefined;
            if (!isFinished) {
              continue; // Skip companies that haven't finished their internship
            }
            
            const attendanceResponse = await apiService.getAttendanceRecords(company.id, currentUser.id, {
              internId: currentUser.id,
            });
            
            if (attendanceResponse.success && Array.isArray(attendanceResponse.data)) {
              // Only count hours from accepted attendance records
              const acceptedRecords = attendanceResponse.data.filter((record: any) => 
                record.verification_status === 'accepted'
              );
              
              const calculatedHours = acceptedRecords.reduce((sum: number, record: any) => {
                const hours = typeof record.total_hours === 'number' ? record.total_hours : Number(record.total_hours || 0);
                return sum + hours;
              }, 0);
              
              // Cap the total hours at hoursOfInternship if it exists
              const maxHours = company.hoursOfInternship 
                ? parseFloat(company.hoursOfInternship) || calculatedHours
                : calculatedHours;
              const companyTotalHours = Math.min(calculatedHours, maxHours);
              
              totalSectionAHours += companyTotalHours;
            }
          } catch (attendanceError) {
            console.error(`Error fetching attendance for company ${company.id}:`, attendanceError);
            // Continue with other companies even if one fails
          }
        }
        
        setSectionATotalHours(totalSectionAHours);
        console.log(`📊 Section A Total Hours (capped): ${totalSectionAHours.toFixed(2)}`);
      } catch (error) {
        console.error('Error calculating Section A total hours:', error);
        setSectionATotalHours(0);
      }
      
      setTrainingScheduleForm({
        taskClassification: '',
        toolsDeviceSoftwareUsed: '',
        totalHours: '',
      });
      setEditingScheduleId(null);
      setShowTrainingScheduleModal(true);
    } catch (error) {
      console.error('Error fetching training schedules:', error);
      Alert.alert('Error', 'Failed to load training schedules. Please try again.');
      setTrainingSchedules([]);
      setSectionATotalHours(0);
      setShowTrainingScheduleModal(true);
    } finally {
      setIsLoadingTrainingSchedules(false);
    }
  };

  const handleSaveTrainingSchedule = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    if (!trainingScheduleForm.taskClassification.trim()) {
      Alert.alert('Validation Error', 'Please enter Task/Job Classification.');
      return;
    }

    if (!trainingScheduleForm.toolsDeviceSoftwareUsed.trim()) {
      Alert.alert('Validation Error', 'Please enter Tools/Device/Software Used.');
      return;
    }

    const totalHours = parseFloat(trainingScheduleForm.totalHours);
    if (isNaN(totalHours) || totalHours <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid Total Hours (must be greater than 0).');
      return;
    }

    // Check if adding this entry would exceed Section A total
    const currentTotalB = trainingSchedules.reduce((sum, s) => sum + s.totalHours, 0);
    const newTotalB = editingScheduleId 
      ? currentTotalB - (trainingSchedules.find(s => s.id === editingScheduleId)?.totalHours || 0) + totalHours
      : currentTotalB + totalHours;
    
    if (sectionATotalHours > 0 && newTotalB > sectionATotalHours) {
      Alert.alert(
        'Total Hours Exceeded',
        `The total hours in Section B (${newTotalB.toFixed(2)}) would exceed Section A total (${sectionATotalHours.toFixed(2)}). Please adjust the hours.`
      );
      return;
    }

    setIsSavingTrainingSchedule(true);

    try {
              if (editingScheduleId) {
                // Update existing schedule
                const response = await apiService.updateTrainingSchedule(editingScheduleId, {
                  taskClassification: trainingScheduleForm.taskClassification.trim(),
                  toolsDeviceSoftwareUsed: trainingScheduleForm.toolsDeviceSoftwareUsed.trim(),
                  totalHours: totalHours,
                }, currentUser.id);

        if (response.success) {
          Alert.alert('Success', 'Training schedule updated successfully!');
          // Refresh schedules
          await handleTrainingScheduleClick();
        } else {
          Alert.alert('Error', response.message || 'Failed to update training schedule. Please try again.');
        }
      } else {
        // Create new schedule
        const response = await apiService.createTrainingSchedule({
          studentId: currentUser.id,
          taskClassification: trainingScheduleForm.taskClassification.trim(),
          toolsDeviceSoftwareUsed: trainingScheduleForm.toolsDeviceSoftwareUsed.trim(),
          totalHours: totalHours,
        });

        if (response.success) {
          Alert.alert('Success', 'Training schedule added successfully!');
          // Refresh schedules
          await handleTrainingScheduleClick();
        } else {
          Alert.alert('Error', response.message || 'Failed to create training schedule. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error saving training schedule:', error);
      Alert.alert('Error', error.message || 'Failed to save training schedule. Please try again.');
    } finally {
      setIsSavingTrainingSchedule(false);
    }
  };

  const handleEditTrainingSchedule = (schedule: TrainingScheduleEntry) => {
    setTrainingScheduleForm({
      taskClassification: schedule.taskClassification,
      toolsDeviceSoftwareUsed: schedule.toolsDeviceSoftwareUsed,
      totalHours: schedule.totalHours.toString(),
    });
    setEditingScheduleId(schedule.id);
  };

  const handleDeleteTrainingSchedule = async (scheduleId: string) => {
    Alert.alert(
      'Delete Training Schedule',
      'Are you sure you want to delete this training schedule entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
                    onPress: async () => {
                      try {
                        const response = await apiService.deleteTrainingSchedule(scheduleId, currentUser.id);
                        if (response.success) {
                Alert.alert('Success', 'Training schedule deleted successfully!');
                // Refresh schedules
                await handleTrainingScheduleClick();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete training schedule. Please try again.');
              }
            } catch (error: any) {
              console.error('Error deleting training schedule:', error);
              Alert.alert('Error', error.message || 'Failed to delete training schedule. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCancelTrainingSchedule = () => {
    setShowTrainingScheduleModal(false);
    setTrainingScheduleForm({
      taskClassification: '',
      toolsDeviceSoftwareUsed: '',
      totalHours: '',
    });
    setEditingScheduleId(null);
  };

  // Intern Feedback Form Handlers
  const handleInternFeedbackFormClick = async () => {
    setShowMissingInfoSelectionModal(false);
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    // Filter companies with finishedAt set
    const finishedCompanies = companies.filter(c => c.finishedAt !== null && c.finishedAt !== undefined);
    
    if (finishedCompanies.length === 0) {
      Alert.alert(
        'No Finished Internships',
        'You need to have at least one finished internship before you can submit a feedback form.'
      );
      return;
    }

    // Reset form data
    setFeedbackFormData({
      companyId: '',
      question1: '',
      question2: '',
      question3: '',
      question4: '',
      question5: '',
      question6: '',
      question7: '',
      problemsMet: '',
      otherConcerns: '',
      formDate: getManilaDateString(),
    });
    setFeedbackFormErrors({});
    setExistingFeedbackFormId(null);
    setSelectedCompanyForFeedback(null);
    setShowInternFeedbackFormModal(true);
  };

  const handleCompanySelectForFeedback = async (companyId: string) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    const selectedCompany = companies.find(c => c.id === companyId);
    if (!selectedCompany) {
      Alert.alert('Error', 'Company not found.');
      return;
    }

    setSelectedCompanyForFeedback(selectedCompany);
    setIsLoadingFeedbackForm(true);

    try {
      // Fetch existing feedback form for this company
      const response = await apiService.getFeedbackForm(currentUser.id, companyId);
      
      if (response.success && (response as any).feedbackForm) {
        const existingForm = (response as any).feedbackForm;
        setExistingFeedbackFormId(existingForm.id.toString());
        
        // Pre-fill form with existing data
        setFeedbackFormData({
          companyId: companyId,
          question1: existingForm.question_1 || '',
          question2: existingForm.question_2 || '',
          question3: existingForm.question_3 || '',
          question4: existingForm.question_4 || '',
          question5: existingForm.question_5 || '',
          question6: existingForm.question_6 || '',
          question7: existingForm.question_7 || '',
          problemsMet: existingForm.problems_met || '',
          otherConcerns: existingForm.other_concerns || '',
          formDate: getManilaDateString(), // Update to current date when editing
        });
      } else {
        // No existing form, start fresh
        setExistingFeedbackFormId(null);
        setFeedbackFormData({
          companyId: companyId,
          question1: '',
          question2: '',
          question3: '',
          question4: '',
          question5: '',
          question6: '',
          question7: '',
          problemsMet: '',
          otherConcerns: '',
          formDate: getManilaDateString(),
        });
      }
    } catch (error) {
      console.error('Error fetching feedback form:', error);
      Alert.alert('Error', 'Failed to load feedback form. Please try again.');
      // Start fresh if fetch fails
      setExistingFeedbackFormId(null);
      setFeedbackFormData({
        companyId: companyId,
        question1: '',
        question2: '',
        question3: '',
        question4: '',
        question5: '',
        question6: '',
        question7: '',
        problemsMet: '',
        otherConcerns: '',
        formDate: getManilaDateString(),
      });
    } finally {
      setIsLoadingFeedbackForm(false);
    }
  };

  const validateFeedbackForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    // Validate all 7 questions
    for (let i = 1; i <= 7; i++) {
      const questionKey = `question${i}` as keyof typeof feedbackFormData;
      if (!feedbackFormData[questionKey] || feedbackFormData[questionKey].trim() === '') {
        errors[questionKey] = `Question ${i} is required`;
      } else if (!['SA', 'A', 'N', 'D', 'SD'].includes(feedbackFormData[questionKey])) {
        errors[questionKey] = `Question ${i} must be SA, A, N, D, or SD`;
      }
    }

    // Validate Problems Met
    if (!feedbackFormData.problemsMet.trim()) {
      errors.problemsMet = 'Problems Met is required';
    }

    // Validate Other Concerns
    if (!feedbackFormData.otherConcerns.trim()) {
      errors.otherConcerns = 'Other Concerns is required';
    }

    // Validate company selection
    if (!feedbackFormData.companyId) {
      errors.companyId = 'Please select a company';
    }

    setFeedbackFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitFeedbackForm = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    if (!validateFeedbackForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsSavingFeedbackForm(true);

    try {
      const formData = {
        studentId: currentUser.id,
        companyId: feedbackFormData.companyId,
        question1: feedbackFormData.question1,
        question2: feedbackFormData.question2,
        question3: feedbackFormData.question3,
        question4: feedbackFormData.question4,
        question5: feedbackFormData.question5,
        question6: feedbackFormData.question6,
        question7: feedbackFormData.question7,
        problemsMet: feedbackFormData.problemsMet.trim(),
        otherConcerns: feedbackFormData.otherConcerns.trim(),
        formDate: feedbackFormData.formDate,
      };

      let response;
      if (existingFeedbackFormId) {
        // Update existing form
        response = await apiService.updateFeedbackForm(existingFeedbackFormId, formData, currentUser.id);
      } else {
        // Create new form
        response = await apiService.createFeedbackForm(formData);
      }

      if (response.success) {
        setShowFeedbackFormSuccessModal(true);
        // Don't close modal yet, wait for user to close success modal
      } else {
        Alert.alert('Error', response.message || 'Failed to save feedback form. Please try again.');
      }
    } catch (error: any) {
      console.error('Error saving feedback form:', error);
      Alert.alert('Error', error.message || 'Failed to save feedback form. Please try again.');
    } finally {
      setIsSavingFeedbackForm(false);
    }
  };

  const handleCloseFeedbackFormModal = () => {
    setShowInternFeedbackFormModal(false);
    setFeedbackFormData({
      companyId: '',
      question1: '',
      question2: '',
      question3: '',
      question4: '',
      question5: '',
      question6: '',
      question7: '',
      problemsMet: '',
      otherConcerns: '',
      formDate: getManilaDateString(),
    });
    setFeedbackFormErrors({});
    setExistingFeedbackFormId(null);
    setSelectedCompanyForFeedback(null);
  };

  const handleCloseFeedbackFormSuccessModal = () => {
    setShowFeedbackFormSuccessModal(false);
    handleCloseFeedbackFormModal();
  };

  const handleViewAttendanceHistory = async (company: Company) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User information not available.');
      return;
    }

    setSelectedCompany(company);
    setAttendanceHistoryLoading(true);
    setShowAttendanceHistory(true);

    try {
      const response = await apiService.getAttendanceRecords(company.id, currentUser.id, {
        internId: currentUser.id,
      });

      if (response.success && Array.isArray(response.data)) {
        const records: AttendanceRecordEntry[] = response.data
          .filter((record: any) => {
            const recordUserId = (record.user_id ?? record.userId ?? '').toString();
            const userIdString = currentUser.id.toString();
            return !recordUserId || recordUserId === userIdString;
          })
          .map((record: any) => ({
            id: `${company.id}-${record.id}-${record.attendance_date}`,
            companyId: company.id,
            companyName: company.name,
            date: record.attendance_date || record.attendanceDate || '',
            status: record.status || 'not_marked',
            amIn: record.am_time_in || record.amTimeIn || '--:--',
            amOut: record.am_time_out || record.amTimeOut || '--:--',
            pmIn: record.pm_time_in || record.pmTimeIn || '--:--',
            pmOut: record.pm_time_out || record.pmTimeOut || '--:--',
            totalHours: typeof record.total_hours === 'number'
              ? record.total_hours
              : Number(record.total_hours || 0),
            notes: record.notes || record.description || null,
            verification_status: record.verification_status || 'pending',
            verified_by: record.verified_by || undefined,
            verified_at: record.verified_at || undefined,
            verification_remarks: record.verification_remarks || undefined,
          }))
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime(); // Most recent first
          });

        setAttendanceHistoryRecords(records);
      } else {
        setAttendanceHistoryRecords([]);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      Alert.alert('Error', 'Failed to load attendance history. Please try again.');
      setAttendanceHistoryRecords([]);
    } finally {
      setAttendanceHistoryLoading(false);
    }
  };

  // Fetch working hours for a company
  const fetchWorkingHours = async (companyId: string) => {
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
      } else {
        // If no working hours found, set to null (will show error)
        setWorkingHours(null);
      }
    } catch (error) {
      console.error('Error fetching working hours:', error);
      setWorkingHours(null);
    } finally {
      setWorkingHoursLoading(false);
    }
  };

  const handleCloseDailyTasksModal = () => {
    setShowDailyTasks(false);
    setWorkingHours(null);
    setTimeValidationErrors({});
  };

  const handleDailyTasks = async (company: Company) => {
    // Check if internship has been finished
    if (company.finishedAt) {
      setCompanyFinished(company);
      setShowFinishedModal(true);
      return;
    }

    // Check if internship has been started
    if (!company.startedAt) {
      setCompanyNotStarted(company);
      setShowNotStartedModal(true);
      return;
    }

    setSelectedCompany(company);
    setShowDailyTasks(true);
    // Reset form when opening modal
    setTaskTitle('');
    setTaskNotes('');
    setTaskImage(null);
    setAmTimeIn('');
    setAmTimeOut('');
    setPmTimeIn('');
    setPmTimeOut('');
    setSelectedDate(new Date()); // Reset to today's date
    setTimeValidationErrors({}); // Reset validation errors
    
    // Fetch working hours for this company
    await fetchWorkingHours(company.id);
  };

  const pickImage = async () => {
    try {
      console.log('📷 Opening image library...');
      
      // On web, we don't need to request permissions
      if (Platform.OS !== 'web') {
        // Request permissions for mobile
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
          return;
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: Platform.OS !== 'web', // Disable editing on web for better compatibility
        aspect: Platform.OS === 'web' ? undefined : [4, 3], // Remove aspect ratio constraint on web
        quality: 0.8,
      });

      console.log('📷 Image picker result:', result);

      if (!result.canceled) {
        const asset = result.assets[0];
        console.log('📷 Selected asset:', asset);
        
        // Convert URI to blob for Cloudinary upload
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        console.log('📷 Blob created:', blob);
        
        // Upload to Cloudinary evidence service
        const uploadResult = await CloudinaryService.uploadEvidenceImage(
          blob,
          currentUser.id,
          selectedCompany?.id
        );
        
        console.log('📷 Upload result:', uploadResult);
        
        if (uploadResult.success && uploadResult.url) {
          setTaskImage(uploadResult.url);
          Alert.alert('Success', 'Image uploaded successfully!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload image');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      console.log('📸 Opening camera...');
      
      // On web, camera might not be available, so fallback to image picker
      if (Platform.OS === 'web') {
        console.log('📸 Camera not available on web, using image picker instead');
        pickImage();
        return;
      }
      
      // Request permissions for mobile
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your camera.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📸 Camera result:', result);

      if (!result.canceled) {
        const asset = result.assets[0];
        console.log('📸 Captured asset:', asset);
        
        // Convert URI to blob for Cloudinary upload
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        console.log('📸 Blob created:', blob);
        
        // Upload to Cloudinary evidence service
        const uploadResult = await CloudinaryService.uploadEvidenceImage(
          blob,
          currentUser.id,
          selectedCompany?.id
        );
        
        console.log('📸 Upload result:', uploadResult);
        
        if (uploadResult.success && uploadResult.url) {
          setTaskImage(uploadResult.url);
          Alert.alert('Success', 'Image uploaded successfully!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload image');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const showImagePicker = () => {
    console.log('🖼️ Image picker triggered');
    
    // Check if running on web
    if (Platform.OS === 'web') {
      // On web, directly open file picker
      pickImage();
    } else {
      // On mobile, show alert with options
      Alert.alert(
        'Select Image',
        'Choose how you want to add an image',
        [
          { text: 'Camera', onPress: takePhoto },
          { text: 'Gallery', onPress: pickImage },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };


  // Validate times against working hours
  const validateTimesAgainstWorkingHours = (): boolean => {
    if (!workingHours) {
      // If no working hours set, show error
      Alert.alert(
        'Working Hours Not Set',
        'This company has not set their working hours yet. Please contact your supervisor to set the working hours before submitting attendance.'
      );
      return false;
    }

    const errors: {
      amTimeIn?: string;
      amTimeOut?: string;
      pmTimeIn?: string;
      pmTimeOut?: string;
    } = {};

    // Helper function to convert time string to minutes
    // For AM fields: treat as 24-hour format (00:00 - 23:59)
    // For PM fields: if hour is 1-11, add 12 (1:00 PM = 13:00), if 12 keep as 12 (noon), if 13+ keep as is
    const timeToMinutes = (timeStr: string, isPMField: boolean = false): number => {
      if (!timeStr || timeStr === '--:--') return -1;
      const [hours, minutes] = timeStr.split(':').map(Number);
      let hour24 = hours || 0;
      
      // For PM fields, convert 12-hour format to 24-hour format
      if (isPMField) {
        if (hour24 >= 1 && hour24 <= 11) {
          // 1:00 PM - 11:59 PM → 13:00 - 23:59
          hour24 += 12;
        } else if (hour24 === 12) {
          // 12:00 PM (noon) → 12:00
          hour24 = 12;
        } else if (hour24 >= 13 && hour24 <= 23) {
          // Already in 24-hour format (13:00 - 23:59)
          hour24 = hour24;
        } else if (hour24 === 0) {
          // 00:00 (midnight) in PM field doesn't make sense, but treat as 12:00 PM (noon)
          hour24 = 12;
        }
      }
      // For AM fields, treat as-is (already in 24-hour format)
      
      return hour24 * 60 + (minutes || 0);
    };

    // Helper function to convert working hours time (12-hour format) to minutes in 24-hour format
    const workingTimeToMinutes = (timeStr: string, period: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      return hour24 * 60 + (minutes || 0);
    };

    // Get working hours boundaries in minutes
    const startMinutes = workingTimeToMinutes(workingHours.startTime, workingHours.startPeriod);
    const endMinutes = workingTimeToMinutes(workingHours.endTime, workingHours.endPeriod);
    const breakStartMinutes = workingHours.breakStart && workingHours.breakStartPeriod
      ? workingTimeToMinutes(workingHours.breakStart, workingHours.breakStartPeriod)
      : null;
    const breakEndMinutes = workingHours.breakEnd && workingHours.breakEndPeriod
      ? workingTimeToMinutes(workingHours.breakEnd, workingHours.breakEndPeriod)
      : null;

    // AM Session boundaries (start to break start, or start to end if no break)
    const amSessionStart = startMinutes;
    const amSessionEnd = breakStartMinutes !== null ? breakStartMinutes : endMinutes;

    // PM Session boundaries (break end to end, or start to end if no break)
    const pmSessionStart = breakEndMinutes !== null ? breakEndMinutes : (breakStartMinutes !== null ? breakStartMinutes : startMinutes);
    const pmSessionEnd = endMinutes;

    // Format working hours for error messages
    const formatWorkingHours = () => {
      const amEnd = breakStartMinutes !== null 
        ? `${workingHours.breakStart} ${workingHours.breakStartPeriod}`
        : `${workingHours.endTime} ${workingHours.endPeriod}`;
      const pmStart = breakEndMinutes !== null
        ? `${workingHours.breakEnd} ${workingHours.breakEndPeriod}`
        : (breakStartMinutes !== null ? `${workingHours.breakStart} ${workingHours.breakStartPeriod}` : `${workingHours.startTime} ${workingHours.startPeriod}`);
      
      return `AM Session: ${workingHours.startTime} ${workingHours.startPeriod} - ${amEnd}\nPM Session: ${pmStart} - ${workingHours.endTime} ${workingHours.endPeriod}`;
    };

    // Validate AM Time In (should be between start and break start, or start and end if no break)
    if (amTimeIn) {
      const amInMinutes = timeToMinutes(amTimeIn, false); // AM field, treat as 24-hour format
      if (amInMinutes < amSessionStart || amInMinutes > amSessionEnd) {
        errors.amTimeIn = `AM Time In (${amTimeIn}) is outside working hours.\n${formatWorkingHours()}`;
      }
    }

    // Validate AM Time Out (should be between start and break start, or start and end if no break)
    if (amTimeOut) {
      const amOutMinutes = timeToMinutes(amTimeOut, false); // AM field, treat as 24-hour format
      if (amOutMinutes < amSessionStart || amOutMinutes > amSessionEnd) {
        errors.amTimeOut = `AM Time Out (${amTimeOut}) is outside working hours.\n${formatWorkingHours()}`;
      }
      // Also check that AM Time Out is after AM Time In
      if (amTimeIn) {
        const amInMinutes = timeToMinutes(amTimeIn, false);
        if (amOutMinutes <= amInMinutes) {
          errors.amTimeOut = 'AM Time Out must be after AM Time In.';
        }
      }
    }

    // Validate PM Time In (should be between break end and end, or start and end if no break)
    if (pmTimeIn) {
      const pmInMinutes = timeToMinutes(pmTimeIn, true); // PM field, convert 12-hour to 24-hour
      if (pmInMinutes < pmSessionStart || pmInMinutes > pmSessionEnd) {
        errors.pmTimeIn = `PM Time In (${pmTimeIn}) is outside working hours.\n${formatWorkingHours()}`;
      }
    }

    // Validate PM Time Out (should be between break end and end, or start and end if no break)
    if (pmTimeOut) {
      const pmOutMinutes = timeToMinutes(pmTimeOut, true); // PM field, convert 12-hour to 24-hour
      if (pmOutMinutes < pmSessionStart || pmOutMinutes > pmSessionEnd) {
        errors.pmTimeOut = `PM Time Out (${pmTimeOut}) is outside working hours.\n${formatWorkingHours()}`;
      }
      // Also check that PM Time Out is after PM Time In
      if (pmTimeIn) {
        const pmInMinutes = timeToMinutes(pmTimeIn, true);
        if (pmOutMinutes <= pmInMinutes) {
          errors.pmTimeOut = 'PM Time Out must be after PM Time In.';
        }
      }
    }

    setTimeValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTask = async () => {
    if (!selectedCompany?.id) {
      Alert.alert('Error', 'No company selected.');
      return;
    }

    // Check if internship has been finished
    if (selectedCompany.finishedAt) {
      setCompanyFinished(selectedCompany);
      setShowFinishedModal(true);
      return;
    }

    // Check if internship has been started
    if (!selectedCompany.startedAt) {
      setCompanyNotStarted(selectedCompany);
      setShowNotStartedModal(true);
      return;
    }

    if (!taskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }

    if (!taskNotes.trim()) {
      Alert.alert('Error', 'Please enter task notes.');
      return;
    }

    // Validate at least one time is entered
    if (!amTimeIn && !amTimeOut && !pmTimeIn && !pmTimeOut) {
      Alert.alert('Error', 'Please enter at least one attendance time (AM Time In, AM Time Out, PM Time In, or PM Time Out).');
      return;
    }

    // Validate times against working hours
    if (!validateTimesAgainstWorkingHours()) {
      // Validation errors are already set in state and will be displayed inline
      Alert.alert('Validation Error', 'Please correct the time entries that are outside working hours.');
      return;
    }

    setIsSubmittingTask(true);
    
    try {
      console.log('📝 Submitting attendance evidence with times...');
      
      // Get selected date in YYYY-MM-DD format
      const attendanceDate = selectedDate.toISOString().split('T')[0];
      
      // Helper function to parse time string (HH:MM) to minutes
      const parseTimeToMinutes = (timeStr: string): number => {
        if (!timeStr || timeStr === '--:--') return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
      };
      
      // Calculate total hours if times are provided
      let totalHours = 0;
      if (amTimeIn && amTimeOut) {
        const amInMinutes = parseTimeToMinutes(amTimeIn);
        const amOutMinutes = parseTimeToMinutes(amTimeOut);
        if (amOutMinutes > amInMinutes) {
          totalHours += (amOutMinutes - amInMinutes) / 60;
        }
      }
      if (pmTimeIn && pmTimeOut) {
        const pmInMinutes = parseTimeToMinutes(pmTimeIn);
        const pmOutMinutes = parseTimeToMinutes(pmTimeOut);
        if (pmOutMinutes > pmInMinutes) {
          totalHours += (pmOutMinutes - pmInMinutes) / 60;
        }
      }

      // Determine status based on times entered
      let attendanceStatus = 'present';
      if (!amTimeIn && !pmTimeIn) {
        attendanceStatus = 'absent';
      } else {
        // Check if late (AM time in after 9:00 or PM time in after 14:00)
        const amHour = amTimeIn ? parseInt(amTimeIn.split(':')[0]) : null;
        const pmHour = pmTimeIn ? parseInt(pmTimeIn.split(':')[0]) : null;
        if ((amHour !== null && amHour >= 9) || (pmHour !== null && pmHour >= 14)) {
          attendanceStatus = 'late';
        }
      }

      // Submit attendance record first
      const attendanceData = {
        internId: currentUser.id,
        attendanceDate: attendanceDate,
        status: attendanceStatus as 'present' | 'absent' | 'late' | 'leave' | 'sick',
        amTimeIn: amTimeIn || undefined,
        amTimeOut: amTimeOut || undefined,
        pmTimeIn: pmTimeIn || undefined,
        pmTimeOut: pmTimeOut || undefined,
        amStatus: amTimeIn ? 'present' : 'not_marked' as 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked',
        pmStatus: pmTimeIn ? 'present' : 'not_marked' as 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked',
        totalHours: totalHours > 0 ? totalHours : undefined,
        notes: taskNotes.trim(),
      };

      console.log('📊 Attendance data:', attendanceData);
      
      const attendanceResponse = await apiService.saveAttendanceRecord(
        selectedCompany.id,
        currentUser.id,
        attendanceData
      );

      if (!attendanceResponse.success) {
        console.error('❌ Failed to save attendance:', attendanceResponse.message);
        Alert.alert('Error', attendanceResponse.message || 'Failed to save attendance. Please try again.');
        setIsSubmittingTask(false);
        return;
      }

      console.log('✅ Attendance saved successfully');
      
      // Prepare evidence data for submission
      const evidenceData = {
        title: taskTitle.trim(),
        description: taskNotes.trim(),
        imageUrl: taskImage || undefined,
        companyId: selectedCompany.id,
        userId: currentUser.id,
        submittedAt: new Date().toISOString(),
      };

      console.log('📝 Evidence data:', evidenceData);
      
      // Submit evidence to backend
      const evidenceResponse = await apiService.submitEvidence(evidenceData);
      
      if (evidenceResponse.success) {
        console.log('✅ Evidence submitted successfully:', evidenceResponse);
        
        // Set success message and show modal
        setSuccessMessage(`Attendance and evidence submitted successfully for ${selectedCompany.name}!`);
        setShowSuccessModal(true);
        
        // Close daily tasks modal and reset form
        handleCloseDailyTasksModal();
        setTaskTitle('');
        setTaskNotes('');
        setTaskImage(null);
        setAmTimeIn('');
        setAmTimeOut('');
        setPmTimeIn('');
        setPmTimeOut('');
        
        // Refresh attendance status and companies (to update remaining hours)
        await fetchTodayAttendance();
        await fetchCompanies();
      } else {
        console.error('❌ Failed to submit evidence:', evidenceResponse.message);
        Alert.alert('Error', evidenceResponse.message || 'Attendance saved but failed to submit evidence. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error submitting attendance and evidence:', error);
      Alert.alert('Error', 'Failed to submit attendance and evidence. Please try again.');
    } finally {
      setIsSubmittingTask(false);
    }
  };


  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2D5A3D'; // Forest green
      case 'expired': return '#E8A598'; // Soft coral
      case 'pending': return '#F56E0F'; // Primary orange
      default: return '#1E3A5F'; // Deep navy blue
    }
  };

  const getMOAStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#2D5A3D'; // Forest green
      case 'rejected': return '#E8A598'; // Soft coral
      case 'under-review': return '#F56E0F'; // Primary orange
      case 'pending': return '#1E3A5F'; // Deep navy blue
      default: return '#1E3A5F';
    }
  };

  const getApplicationStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'under-review': return 'Under Review';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#2D5A3D'; // Forest green
      case 'late': return '#F56E0F'; // Primary orange
      case 'absent': return '#E8A598'; // Soft coral
      case 'leave': return '#1E3A5F'; // Deep navy blue
      case 'not_marked': return '#999'; // Gray
      default: return '#999';
    }
  };

  const getAttendanceStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'absent': return 'Absent';
      case 'leave': return 'On Leave';
      case 'not_marked': return 'Not Marked';
      default: return 'Unknown';
    }
  };

  const getAttendanceStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return 'check-circle';
      case 'late': return 'schedule';
      case 'absent': return 'cancel';
      case 'leave': return 'event-busy';
      case 'not_marked': return 'help-outline';
      default: return 'help-outline';
    }
  };

  const toggleCompanyExpansion = (companyId: string) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
  };

  // Enhanced Status Badge Component
  const StatusBadge = ({ status, type }: { status: string; type: 'moa' | 'application' }) => {
    const getStatusConfig = () => {
      if (type === 'moa') {
        switch (status) {
          case 'active': return { color: '#2D5A3D', text: 'Active', icon: 'check-circle' };
          case 'expired': return { color: '#E8A598', text: 'Expired', icon: 'cancel' };
          case 'pending': return { color: '#F56E0F', text: 'Pending', icon: 'schedule' };
          default: return { color: '#1E3A5F', text: 'Unknown', icon: 'help' };
        }
      } else {
        switch (status) {
          case 'approved': return { color: '#2D5A3D', text: 'Approved', icon: 'check-circle' };
          case 'rejected': return { color: '#E8A598', text: 'Rejected', icon: 'cancel' };
          case 'under-review': return { color: '#F56E0F', text: 'Under Review', icon: 'schedule' };
          case 'pending': return { color: '#1E3A5F', text: 'Pending', icon: 'hourglass-empty' };
          default: return { color: '#1E3A5F', text: 'Unknown', icon: 'help' };
        }
      }
    };
    
    const config = getStatusConfig();
    
    return (
      <View style={[styles.enhancedStatusBadge, { backgroundColor: config.color }]}>
        <MaterialIcons name={config.icon as any} size={14} color="#fff" />
        <Text style={styles.enhancedStatusText}>{config.text}</Text>
      </View>
    );
  };

  // Skeleton Components
  const SkeletonCompanyCard = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonCompanyCard}>
        <View style={styles.skeletonCompanyHeader}>
          <Animated.View style={[styles.skeletonProfileContainer, { opacity: shimmerOpacity }]}>
            <Animated.View style={[styles.skeletonProfileImage, { opacity: shimmerOpacity }]} />
          </Animated.View>
          <View style={styles.skeletonCompanyInfo}>
            <Animated.View style={[styles.skeletonCompanyName, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonCompanyIndustry, { opacity: shimmerOpacity }]} />
          </View>
          <Animated.View style={[styles.skeletonExpandIcon, { opacity: shimmerOpacity }]} />
        </View>
      </View>
    );
  };

  const CompanyCard = ({ company }: { company: Company }) => {
    const isExpanded = expandedCompany === company.id;
    const companyId = company.id.toString();
    const companyAttendanceStatus = attendanceStatus[companyId] || 'not_marked';
    
    return (
      <Animated.View 
        style={[
          styles.enhancedCompanyCard,
          { 
            transform: [{ scale: isExpanded ? 1.02 : 1 }],
            elevation: isExpanded ? 12 : 6,
          }
        ]}
      >
        <TouchableOpacity 
          onPress={() => toggleCompanyExpansion(company.id)}
          style={styles.cardTouchable}
        >
          <View style={styles.companyHeader}>
            <View style={styles.profileContainer}>
              {company.profilePicture ? (
                <Image source={{ uri: company.profilePicture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileText}>{company.name.charAt(0)}</Text>
                </View>
              )}
            </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyIndustry}>{company.industry}</Text>
            {/* Finished Internship Status in Header */}
            {company.finishedAt && (
              <View style={styles.finishedHeaderBadge}>
                <MaterialIcons name="check-circle" size={14} color="#FFD700" />
                <Text style={styles.finishedHeaderText}>Internship Completed</Text>
              </View>
            )}
            {/* Supervisor Evaluation Status Indicator */}
            {company.finishedAt && company.hasSupervisorEvaluation && (
              <View style={styles.evaluationBadge}>
                <MaterialIcons name="assessment" size={14} color="#2D5A3D" />
                <Text style={styles.evaluationBadgeText}>Evaluation Received</Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[
                styles.headerActionButton, 
                styles.tasksButton
              ]} 
              onPress={() => handleDailyTasks(company)}
            >
              <MaterialIcons 
                name="assignment" 
                size={18} 
                color="#fff" 
              />
            </TouchableOpacity>
            {company.startedAt && (
              <TouchableOpacity 
                style={[
                  styles.headerActionButton, 
                  styles.historyButton
                ]} 
                onPress={() => handleViewAttendanceHistory(company)}
              >
                <MaterialIcons 
                  name="history" 
                  size={18} 
                  color="#fff" 
                />
              </TouchableOpacity>
            )}
            <MaterialIcons 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={24} 
              color="#F56E0F" 
            />
          </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <Animated.View style={styles.expandedContent}>
            <View style={styles.companyDetails}>
              <View style={styles.locationContainer}>
                <MaterialIcons name="location-on" size={18} color="#F56E0F" />
                <Text style={styles.locationText}>{company.location}</Text>
              </View>
              
              <View style={styles.slotsContainer}>
                <View style={styles.slotInfo}>
                  <Text style={styles.slotLabel}>Available Slots:</Text>
                  <Text style={styles.slotValue}>{company.availableSlots}/{company.totalSlots}</Text>
                </View>
              </View>

              {company.remainingHours !== undefined && company.remainingHours !== null && (
                <View style={styles.hoursContainer}>
                  <View style={styles.hoursInfo}>
                    <MaterialIcons name="schedule" size={18} color="#F56E0F" />
                    <Text style={styles.hoursLabel}>Remaining Hours:</Text>
                    <Text style={styles.hoursValue}>{company.remainingHours.toFixed(1)} hours</Text>
                  </View>
                </View>
              )}

              {company.hoursOfInternship && (
                <View style={styles.hoursContainer}>
                  <View style={styles.hoursInfo}>
                    <MaterialIcons name="access-time" size={18} color="#F56E0F" />
                    <Text style={styles.hoursLabel}>Hours of Internship:</Text>
                    <Text style={styles.hoursValue}>{company.hoursOfInternship}</Text>
                  </View>
                </View>
              )}

              {/* Finished Internship Completion Date */}
              {company.finishedAt && (
                <View style={styles.finishedDateContainer}>
                  <Text style={styles.finishedDateText}>
                    Completed on: {new Date(company.finishedAt).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                  MOA Status: <Text style={styles.statusValue}>{getMOAStatusText(company.moaStatus)}</Text>
                </Text>
                {company.moaExpiryDate && (
                  <Text style={styles.statusDate}>Expires: {company.moaExpiryDate}</Text>
                )}
              </View>

              {company.applicationStatus && (
                <View style={styles.statusContainer}>
                  <Text style={styles.statusText}>
                    Application Status: <Text style={styles.statusValue}>{getApplicationStatusText(company.applicationStatus)}</Text>
                  </Text>
                  {company.appliedAt && (
                    <Text style={styles.statusDate}>Applied: {new Date(company.appliedAt).toLocaleDateString()}</Text>
                  )}
                </View>
              )}

              <Text style={styles.description} numberOfLines={3}>
                {company.description}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => handleViewDetails(company)}
              >
                <MaterialIcons name="visibility" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
              
              {/* Download Certificate Button - Only enabled if certificate exists */}
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.downloadCertificateButton,
                  (!certificates[company.id] || downloadingCertificate === company.id) && styles.disabledButton
                ]} 
                onPress={() => handleDownloadCertificate(company)}
                disabled={!certificates[company.id] || downloadingCertificate === company.id}
              >
                {downloadingCertificate === company.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="download" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Download Certificate</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Start Internship Button - Only show if application is approved, not started, and not finished */}
              {company.applicationStatus === 'approved' && !company.startedAt && !company.finishedAt && (
                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    styles.startInternshipButton,
                    isStartingInternship === company.id && styles.disabledButton
                  ]} 
                  onPress={() => {
                    console.log('🔘 Start Internship button pressed for company:', company.id);
                    handleStartInternship(company);
                  }}
                  disabled={isStartingInternship === company.id}
                >
                  {isStartingInternship === company.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="play-arrow" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Start Internship</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

            </View>
          </Animated.View>
        )}
      </Animated.View>
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

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#E8A598" />
        <Text style={styles.errorTitle}>Error Loading Companies</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCompanies}>
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Confetti Celebration */}
      <Confetti 
        active={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
      
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>Companies</Text>
          <Text style={styles.headerSubtitle}>
            {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} available
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.ojtJournalButton,
            isDownloadingJournal && styles.disabledButton,
          ]}
          onPress={handleGetOJTJournal}
          disabled={isDownloadingJournal}
        >
          {isDownloadingJournal ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
          <MaterialIcons name="description" size={18} color="#fff" />
          <Text style={styles.ojtJournalButtonText}>Get OJT Journal</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#F56E0F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Companies List */}
      <Animated.ScrollView 
        style={[styles.companiesList, { transform: [{ scale: scaleAnim }] }]} 
        showsVerticalScrollIndicator={false}
      >
        {showSkeleton ? (
          <>
            <SkeletonCompanyCard />
            <SkeletonCompanyCard />
            <SkeletonCompanyCard />
          </>
        ) : filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="business-center" size={64} color="#02050a" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No companies found' : 'No approved companies'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No companies have approved your application yet. Apply to companies first, then wait for approval.'
              }
            </Text>
            {!searchQuery && (
              <View style={styles.infoContainer}>
                <MaterialIcons name="info" size={20} color="#F56E0F" />
                <Text style={styles.infoText}>
                  Only companies that have approved your application will appear here.
                </Text>
              </View>
            )}
          </View>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </Animated.ScrollView>

      {/* Missing Info Selection Modal */}
      <Modal
        visible={showMissingInfoSelectionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowMissingInfoSelectionModal(false);
          setPendingJournalContext(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.missingInfoSelectionModalContent}>
            <View style={styles.missingInfoSelectionHeader}>
              <Text style={styles.missingInfoSelectionTitle}>Missing Information</Text>
              <TouchableOpacity
                style={[
                  styles.getOJTJournalHeaderButton,
                  isDownloadingJournal && { opacity: 0.6 }
                ]}
                onPress={handleGetOJTJournalDirect}
                disabled={isDownloadingJournal}
              >
                {isDownloadingJournal ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="description" size={18} color="#fff" />
                    <Text style={styles.getOJTJournalHeaderButtonText}>Get OJT Journal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.missingInfoSelectionText}>
              Please select which information you would like to fill:
            </Text>
            <View style={styles.missingInfoSelectionButtons}>
              <TouchableOpacity
                style={styles.missingInfoSelectionButton}
                onPress={handleMissingPersonalInfoClick}
              >
                <MaterialIcons name="person" size={24} color="#fff" />
                <Text style={styles.missingInfoSelectionButtonText}>Missing Personal Information</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.missingInfoSelectionButton}
                onPress={handleMissingHTEInfoClick}
              >
                <MaterialIcons name="schedule" size={24} color="#fff" />
                <Text style={styles.missingInfoSelectionButtonText}>Missing HTE Information</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.missingInfoSelectionButton}
                onPress={handleTrainingScheduleClick}
              >
                <MaterialIcons name="assignment" size={24} color="#fff" />
                <Text style={styles.missingInfoSelectionButtonText}>Training Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.missingInfoSelectionButton,
                  !companies.some(c => c.finishedAt !== null && c.finishedAt !== undefined) && styles.disabledButton
                ]}
                onPress={handleInternFeedbackFormClick}
                disabled={!companies.some(c => c.finishedAt !== null && c.finishedAt !== undefined)}
              >
                <MaterialIcons name="feedback" size={24} color="#fff" />
                <Text style={styles.missingInfoSelectionButtonText}>Intern Feedback Form</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.missingInfoSelectionCancelButton}
              onPress={() => {
                setShowMissingInfoSelectionModal(false);
                setPendingJournalContext(null);
              }}
            >
              <Text style={styles.missingInfoSelectionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Missing Info Modal */}
      <Modal
        visible={showMissingInfoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleMissingInfoCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.missingInfoModalContent}>
            <Text style={styles.missingInfoTitle}>Missing Personal Information</Text>
            <Text style={styles.missingInfoText}>
              Please fill in the following missing fields. These details are required to complete your
              Personal Information page:
            </Text>
            <ScrollView 
              style={styles.missingInfoList} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Photo Upload Section */}
              <View style={styles.missingInfoInputGroup}>
                <Text style={styles.missingInfoInputLabel}>Profile Photo (Optional)</Text>
                <TouchableOpacity 
                  style={styles.photoUploadContainer} 
                  onPress={handlePickProfilePhoto}
                  activeOpacity={0.7}
                  disabled={isUploadingPhoto}
                >
                  {profilePhoto ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: profilePhoto }} style={styles.photoPreview} />
                      <TouchableOpacity 
                        style={styles.removePhotoButton}
                        onPress={() => setProfilePhoto(null)}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoUploadPlaceholder}>
                      <MaterialIcons name="add-a-photo" size={32} color="#F56E0F" />
                      <Text style={styles.photoUploadText}>
                        {isUploadingPhoto ? 'Uploading...' : (Platform.OS === 'web' ? 'Click to select photo' : 'Tap to add photo')}
                      </Text>
                      {isUploadingPhoto && <ActivityIndicator size="small" color="#F56E0F" style={{ marginTop: 8 }} />}
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {missingPersonalInfoFields.map((field) => {
                const hasError = !!validationErrors[field];
                return (
                  <View key={field} style={styles.missingInfoInputGroup}>
                    <Text style={styles.missingInfoInputLabel}>{field} *</Text>
                    <TextInput
                      style={[
                        styles.missingInfoInput,
                        hasError && styles.missingInfoInputError
                      ]}
                      value={personalInfoFormData[field] || ''}
                      onChangeText={(text) => {
                        let processedText = text;
                        
                        // Auto-format mobile numbers to start with 09
                        if (field === 'Contact Number' || field === 'Emergency Contact Number') {
                          // Only allow digits
                          let digitsOnly = text.replace(/[^0-9]/g, '');
                          
                          // If user starts typing and it doesn't start with 0, add 0
                          if (digitsOnly.length > 0 && !digitsOnly.startsWith('0')) {
                            // If first digit is 9, prepend 0
                            if (digitsOnly.startsWith('9')) {
                              digitsOnly = '0' + digitsOnly;
                            } else {
                              // Otherwise, force start with 09
                              digitsOnly = '09' + digitsOnly;
                            }
                          } else if (digitsOnly.length > 1 && digitsOnly.startsWith('0') && digitsOnly[1] !== '9') {
                            // If starts with 0 but second digit is not 9, replace second digit with 9
                            digitsOnly = '09' + digitsOnly.slice(2);
                          } else if (digitsOnly.length === 1 && digitsOnly === '0') {
                            // If only 0 is entered, keep it (user will type 9 next)
                            digitsOnly = '0';
                          } else if (digitsOnly.length === 1 && digitsOnly !== '0' && digitsOnly !== '9') {
                            // If first digit is not 0 or 9, force 09
                            digitsOnly = '09' + digitsOnly;
                          }
                          
                          // Limit to 11 characters
                          digitsOnly = digitsOnly.slice(0, 11);
                          processedText = digitsOnly;
                        }
                        
                        setPersonalInfoFormData({ ...personalInfoFormData, [field]: processedText });
                        // Clear error when user starts typing
                        if (validationErrors[field]) {
                          const newErrors = { ...validationErrors };
                          delete newErrors[field];
                          setValidationErrors(newErrors);
                        }
                      }}
                      placeholder={
                        field === 'Contact Number' || field === 'Emergency Contact Number'
                          ? '09XXXXXXXXX (11 digits)'
                          : `Enter ${field.toLowerCase()}`
                      }
                      multiline={field.includes('Address')}
                      numberOfLines={field.includes('Address') ? 3 : 1}
                      keyboardType={
                        field === 'Age' || field.includes('Number') 
                          ? 'phone-pad' 
                          : field === 'Email Address'
                          ? 'email-address'
                          : 'default'
                      }
                      maxLength={
                        field === 'Contact Number' || field === 'Emergency Contact Number'
                          ? 11
                          : undefined
                      }
                    />
                    {(field === 'Contact Number' || field === 'Emergency Contact Number') && personalInfoFormData[field] && (
                      <Text style={[
                        styles.missingInfoErrorText, 
                        { 
                          color: personalInfoFormData[field].length === 11 && personalInfoFormData[field].startsWith('09') 
                            ? '#28a745' 
                            : '#666' 
                        }
                      ]}>
                        {personalInfoFormData[field].length}/11 digits {personalInfoFormData[field].startsWith('09') ? '✓' : '(must start with 09)'}
                      </Text>
                    )}
                    {hasError && (
                      <Text style={styles.missingInfoErrorText}>{validationErrors[field]}</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.missingInfoButtons}>
              <TouchableOpacity
                style={styles.missingInfoSecondaryButton}
                onPress={handleMissingInfoCancel}
                disabled={isSavingPersonalInfo}
              >
                <Text style={[styles.missingInfoButtonText, { color: '#1a1a2e' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.missingInfoPrimaryButton, isSavingPersonalInfo && styles.disabledButton]}
                onPress={handleSavePersonalInfo}
                disabled={isSavingPersonalInfo}
              >
                {isSavingPersonalInfo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.missingInfoButtonText}>Save & Continue</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.missingInfoTertiaryButton}
                onPress={handleMissingInfoContinue}
                disabled={isDownloadingJournal || isSavingPersonalInfo}
              >
                <Text style={[styles.missingInfoButtonText, { color: '#666' }]}>
                  Skip (Use N/A)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* HTE Information Modal */}
      <Modal
        visible={showHTEInfoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleHteInfoCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.hteInfoModalContent}>
            <Text style={styles.hteInfoModalTitle}>HTE Information</Text>
            <Text style={styles.hteInfoModalText}>
              Please fill in the Host Training Establishment (HTE) information for {selectedCompanyForHte?.name}:
            </Text>
            <ScrollView 
              style={styles.hteInfoList} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Company Name and Address (Read-only, pre-filled) */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Name of the HTE:</Text>
                <TextInput
                  style={[styles.hteInfoInput, styles.hteInfoInputReadOnly]}
                  value={hteInfoFormData.companyName || ''}
                  editable={false}
                  placeholder="Company name"
                />
              </View>

              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Address:</Text>
                <TextInput
                  style={[styles.hteInfoInput, styles.hteInfoInputReadOnly]}
                  value={hteInfoFormData.companyAddress || ''}
                  editable={false}
                  placeholder="Company address"
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* HTE Photo Upload */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Select Photo:</Text>
                <TouchableOpacity 
                  style={styles.htePhotoUploadContainer} 
                  onPress={handlePickHtePhoto}
                  activeOpacity={0.7}
                  disabled={isUploadingHtePhoto}
                >
                  {htePhoto ? (
                    <View style={styles.htePhotoPreviewContainer}>
                      <Image source={{ uri: htePhoto }} style={styles.htePhotoPreview} />
                      <TouchableOpacity 
                        style={styles.removePhotoButton}
                        onPress={() => setHtePhoto(null)}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.htePhotoUploadPlaceholder}>
                      <MaterialIcons name="add-a-photo" size={32} color="#F56E0F" />
                      <Text style={styles.htePhotoUploadText}>
                        {isUploadingHtePhoto ? 'Uploading...' : (Platform.OS === 'web' ? 'Click to select photo' : 'Tap to add photo')}
                      </Text>
                      {isUploadingHtePhoto && <ActivityIndicator size="small" color="#F56E0F" style={{ marginTop: 8 }} />}
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Nature of HTE */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Nature of HTE: *</Text>
                <TextInput
                  style={[
                    styles.hteInfoInput,
                    hteValidationErrors.natureOfHte && styles.hteInfoInputError
                  ]}
                  value={hteInfoFormData.natureOfHte || ''}
                  onChangeText={(text) => {
                    setHteInfoFormData({ ...hteInfoFormData, natureOfHte: text });
                    if (hteValidationErrors.natureOfHte) {
                      const newErrors = { ...hteValidationErrors };
                      delete newErrors.natureOfHte;
                      setHteValidationErrors(newErrors);
                    }
                  }}
                  placeholder="Enter nature of HTE"
                />
                {hteValidationErrors.natureOfHte && (
                  <Text style={styles.hteInfoErrorText}>{hteValidationErrors.natureOfHte}</Text>
                )}
              </View>

              {/* Head of HTE */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Head of the HTE: *</Text>
                <TextInput
                  style={[
                    styles.hteInfoInput,
                    hteValidationErrors.headOfHte && styles.hteInfoInputError
                  ]}
                  value={hteInfoFormData.headOfHte || ''}
                  onChangeText={(text) => {
                    setHteInfoFormData({ ...hteInfoFormData, headOfHte: text });
                    if (hteValidationErrors.headOfHte) {
                      const newErrors = { ...hteValidationErrors };
                      delete newErrors.headOfHte;
                      setHteValidationErrors(newErrors);
                    }
                  }}
                  placeholder="Enter head of HTE name"
                />
                {hteValidationErrors.headOfHte && (
                  <Text style={styles.hteInfoErrorText}>{hteValidationErrors.headOfHte}</Text>
                )}
              </View>

              {/* Head Position */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Position: *</Text>
                <TextInput
                  style={[
                    styles.hteInfoInput,
                    hteValidationErrors.headPosition && styles.hteInfoInputError
                  ]}
                  value={hteInfoFormData.headPosition || ''}
                  onChangeText={(text) => {
                    setHteInfoFormData({ ...hteInfoFormData, headPosition: text });
                    if (hteValidationErrors.headPosition) {
                      const newErrors = { ...hteValidationErrors };
                      delete newErrors.headPosition;
                      setHteValidationErrors(newErrors);
                    }
                  }}
                  placeholder="Enter position"
                />
                {hteValidationErrors.headPosition && (
                  <Text style={styles.hteInfoErrorText}>{hteValidationErrors.headPosition}</Text>
                )}
              </View>

              {/* Immediate Supervisor */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Immediate Supervisor of the Trainee: *</Text>
                <TextInput
                  style={[
                    styles.hteInfoInput,
                    hteValidationErrors.immediateSupervisor && styles.hteInfoInputError
                  ]}
                  value={hteInfoFormData.immediateSupervisor || ''}
                  onChangeText={(text) => {
                    setHteInfoFormData({ ...hteInfoFormData, immediateSupervisor: text });
                    if (hteValidationErrors.immediateSupervisor) {
                      const newErrors = { ...hteValidationErrors };
                      delete newErrors.immediateSupervisor;
                      setHteValidationErrors(newErrors);
                    }
                  }}
                  placeholder="Enter immediate supervisor name"
                />
                {hteValidationErrors.immediateSupervisor && (
                  <Text style={styles.hteInfoErrorText}>{hteValidationErrors.immediateSupervisor}</Text>
                )}
              </View>

              {/* Supervisor Position/Designation */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Position/Designation: *</Text>
                <TextInput
                  style={[
                    styles.hteInfoInput,
                    hteValidationErrors.supervisorPosition && styles.hteInfoInputError
                  ]}
                  value={hteInfoFormData.supervisorPosition || ''}
                  onChangeText={(text) => {
                    setHteInfoFormData({ ...hteInfoFormData, supervisorPosition: text });
                    if (hteValidationErrors.supervisorPosition) {
                      const newErrors = { ...hteValidationErrors };
                      delete newErrors.supervisorPosition;
                      setHteValidationErrors(newErrors);
                    }
                  }}
                  placeholder="Enter position/designation"
                />
                {hteValidationErrors.supervisorPosition && (
                  <Text style={styles.hteInfoErrorText}>{hteValidationErrors.supervisorPosition}</Text>
                )}
              </View>

              {/* Contact Information Section */}
              <Text style={styles.hteInfoSectionLabel}>Contact Information:</Text>

              {/* Telephone No */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Telephone No: *</Text>
                <TextInput
                  style={[
                    styles.hteInfoInput,
                    hteValidationErrors.telephoneNo && styles.hteInfoInputError
                  ]}
                  value={hteInfoFormData.telephoneNo || ''}
                  onChangeText={(text) => {
                    setHteInfoFormData({ ...hteInfoFormData, telephoneNo: text });
                    if (hteValidationErrors.telephoneNo) {
                      const newErrors = { ...hteValidationErrors };
                      delete newErrors.telephoneNo;
                      setHteValidationErrors(newErrors);
                    }
                  }}
                  placeholder="Enter telephone number"
                  keyboardType="phone-pad"
                />
                {hteValidationErrors.telephoneNo && (
                  <Text style={styles.hteInfoErrorText}>{hteValidationErrors.telephoneNo}</Text>
                )}
              </View>

              {/* Mobile No */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Mobile No: *</Text>
                <TextInput
                  style={[
                    styles.hteInfoInput,
                    hteValidationErrors.mobileNo && styles.hteInfoInputError
                  ]}
                  value={hteInfoFormData.mobileNo || ''}
                  onChangeText={(text) => {
                    // Only allow digits
                    let digitsOnly = text.replace(/[^0-9]/g, '');
                    
                    // If user starts typing and it doesn't start with 0, add 0
                    if (digitsOnly.length > 0 && !digitsOnly.startsWith('0')) {
                      // If first digit is 9, prepend 0
                      if (digitsOnly.startsWith('9')) {
                        digitsOnly = '0' + digitsOnly;
                      } else {
                        // Otherwise, force start with 09
                        digitsOnly = '09' + digitsOnly;
                      }
                    } else if (digitsOnly.length > 1 && digitsOnly.startsWith('0') && digitsOnly[1] !== '9') {
                      // If starts with 0 but second digit is not 9, replace second digit with 9
                      digitsOnly = '09' + digitsOnly.slice(2);
                    } else if (digitsOnly.length === 1 && digitsOnly === '0') {
                      // If only 0 is entered, keep it (user will type 9 next)
                      digitsOnly = '0';
                    } else if (digitsOnly.length === 1 && digitsOnly !== '0' && digitsOnly !== '9') {
                      // If first digit is not 0 or 9, force 09
                      digitsOnly = '09' + digitsOnly;
                    }
                    
                    // Limit to 11 characters
                    digitsOnly = digitsOnly.slice(0, 11);
                    
                    setHteInfoFormData({ ...hteInfoFormData, mobileNo: digitsOnly });
                    if (hteValidationErrors.mobileNo) {
                      const newErrors = { ...hteValidationErrors };
                      delete newErrors.mobileNo;
                      setHteValidationErrors(newErrors);
                    }
                  }}
                  placeholder="09XXXXXXXXX (11 digits)"
                  keyboardType="phone-pad"
                  maxLength={11}
                />
                {hteInfoFormData.mobileNo && (
                  <Text style={[
                    styles.hteInfoErrorText, 
                    { 
                      color: hteInfoFormData.mobileNo.length === 11 && hteInfoFormData.mobileNo.startsWith('09') 
                        ? '#28a745' 
                        : '#666' 
                    }
                  ]}>
                    {hteInfoFormData.mobileNo.length}/11 digits {hteInfoFormData.mobileNo.startsWith('09') ? '✓' : '(must start with 09)'}
                  </Text>
                )}
                {hteValidationErrors.mobileNo && (
                  <Text style={styles.hteInfoErrorText}>{hteValidationErrors.mobileNo}</Text>
                )}
              </View>

              {/* Email Address */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Email Address: *</Text>
                <TextInput
                  style={[
                    styles.hteInfoInput,
                    hteValidationErrors.emailAddress && styles.hteInfoInputError
                  ]}
                  value={hteInfoFormData.emailAddress || ''}
                  onChangeText={(text) => {
                    setHteInfoFormData({ ...hteInfoFormData, emailAddress: text });
                    if (hteValidationErrors.emailAddress) {
                      const newErrors = { ...hteValidationErrors };
                      delete newErrors.emailAddress;
                      setHteValidationErrors(newErrors);
                    }
                  }}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {hteValidationErrors.emailAddress && (
                  <Text style={styles.hteInfoErrorText}>{hteValidationErrors.emailAddress}</Text>
                )}
              </View>
            </ScrollView>
            <View style={styles.hteInfoButtons}>
              <TouchableOpacity
                style={styles.hteInfoSecondaryButton}
                onPress={handleHteInfoCancel}
                disabled={isSavingHteInfo}
              >
                <Text style={[styles.hteInfoButtonText, { color: '#1a1a2e' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.hteInfoPrimaryButton, isSavingHteInfo && styles.disabledButton]}
                onPress={handleSaveHteInfo}
                disabled={isSavingHteInfo}
              >
                {isSavingHteInfo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.hteInfoButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Daily Tasks Modal */}
      <Modal
        visible={showDailyTasks}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDailyTasksModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Submit Attendance & Evidence - {selectedCompany?.name}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={handleCloseDailyTasksModal}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.taskFormContainer} showsVerticalScrollIndicator={false}>
              {/* Date Picker Section */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Attendance Date *</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.datePickerButton}>
                    <MaterialIcons name="calendar-today" size={20} color="#F56E0F" />
                    {/* @ts-ignore - React Native Web supports HTML input elements */}
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value);
                          if (!isNaN(date.getTime())) {
                            setSelectedDate(date);
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: 16,
                        color: '#1a1a2e',
                        backgroundColor: 'transparent',
                        padding: 0,
                        marginLeft: 8,
                        fontFamily: 'inherit',
                      }}
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <MaterialIcons name="calendar-today" size={20} color="#F56E0F" />
                      <Text style={styles.datePickerText}>
                        {selectedDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DatePicker
                        value={selectedDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (date) {
                            setSelectedDate(date);
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </View>

              {/* Attendance Times Section */}
              <View style={styles.attendanceTimesSection}>
                <Text style={styles.sectionTitle}>Attendance Times</Text>
                
                {/* AM Session */}
                <View style={styles.timeSessionContainer}>
                  <Text style={styles.sessionLabel}>AM Session</Text>
                  <View style={styles.timeInputRow}>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.inputLabel}>AM Time In</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          timeValidationErrors.amTimeIn && styles.textInputError
                        ]}
                        placeholder="HH:MM (e.g., 08:00)"
                        value={amTimeIn}
                        onChangeText={(text) => {
                          // Format as HH:MM
                          const formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                          if (formatted.length >= 2) {
                            setAmTimeIn(`${formatted.slice(0, 2)}:${formatted.slice(2)}`);
                          } else {
                            setAmTimeIn(formatted);
                          }
                          // Clear error when user types
                          if (timeValidationErrors.amTimeIn) {
                            setTimeValidationErrors(prev => ({ ...prev, amTimeIn: undefined }));
                          }
                        }}
                        placeholderTextColor="#999"
                        maxLength={5}
                        keyboardType="numeric"
                      />
                      {timeValidationErrors.amTimeIn && (
                        <Text style={styles.timeValidationErrorText}>{timeValidationErrors.amTimeIn}</Text>
                      )}
                    </View>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.inputLabel}>AM Time Out</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          timeValidationErrors.amTimeOut && styles.textInputError
                        ]}
                        placeholder="HH:MM (e.g., 12:00)"
                        value={amTimeOut}
                        onChangeText={(text) => {
                          // Format as HH:MM
                          const formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                          if (formatted.length >= 2) {
                            setAmTimeOut(`${formatted.slice(0, 2)}:${formatted.slice(2)}`);
                          } else {
                            setAmTimeOut(formatted);
                          }
                          // Clear error when user types
                          if (timeValidationErrors.amTimeOut) {
                            setTimeValidationErrors(prev => ({ ...prev, amTimeOut: undefined }));
                          }
                        }}
                        placeholderTextColor="#999"
                        maxLength={5}
                        keyboardType="numeric"
                      />
                      {timeValidationErrors.amTimeOut && (
                        <Text style={styles.timeValidationErrorText}>{timeValidationErrors.amTimeOut}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* PM Session */}
                <View style={styles.timeSessionContainer}>
                  <Text style={styles.sessionLabel}>PM Session</Text>
                  <View style={styles.timeInputRow}>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.inputLabel}>PM Time In</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          timeValidationErrors.pmTimeIn && styles.textInputError
                        ]}
                        placeholder="HH:MM (e.g., 13:00)"
                        value={pmTimeIn}
                        onChangeText={(text) => {
                          // Format as HH:MM
                          const formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                          if (formatted.length >= 2) {
                            setPmTimeIn(`${formatted.slice(0, 2)}:${formatted.slice(2)}`);
                          } else {
                            setPmTimeIn(formatted);
                          }
                          // Clear error when user types
                          if (timeValidationErrors.pmTimeIn) {
                            setTimeValidationErrors(prev => ({ ...prev, pmTimeIn: undefined }));
                          }
                        }}
                        placeholderTextColor="#999"
                        maxLength={5}
                        keyboardType="numeric"
                      />
                      {timeValidationErrors.pmTimeIn && (
                        <Text style={styles.timeValidationErrorText}>{timeValidationErrors.pmTimeIn}</Text>
                      )}
                    </View>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.inputLabel}>PM Time Out</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          timeValidationErrors.pmTimeOut && styles.textInputError
                        ]}
                        placeholder="HH:MM (e.g., 17:00)"
                        value={pmTimeOut}
                        onChangeText={(text) => {
                          // Format as HH:MM
                          const formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                          if (formatted.length >= 2) {
                            setPmTimeOut(`${formatted.slice(0, 2)}:${formatted.slice(2)}`);
                          } else {
                            setPmTimeOut(formatted);
                          }
                          // Clear error when user types
                          if (timeValidationErrors.pmTimeOut) {
                            setTimeValidationErrors(prev => ({ ...prev, pmTimeOut: undefined }));
                          }
                        }}
                        placeholderTextColor="#999"
                        maxLength={5}
                        keyboardType="numeric"
                      />
                      {timeValidationErrors.pmTimeOut && (
                        <Text style={styles.timeValidationErrorText}>{timeValidationErrors.pmTimeOut}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Task Title Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Task Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter task title..."
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Task Notes Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Task Notes *</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="Describe what you did today..."
                  value={taskNotes}
                  onChangeText={setTaskNotes}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Image Upload Section */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Photo Evidence (Optional)</Text>
                <TouchableOpacity 
                  style={styles.imageUploadContainer} 
                  onPress={showImagePicker}
                  activeOpacity={0.7}
                >
                  {taskImage ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: taskImage }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => setTaskImage(null)}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imageUploadPlaceholder}>
                      <MaterialIcons name="add-a-photo" size={32} color="#F56E0F" />
                      <Text style={styles.imageUploadText}>
                        {Platform.OS === 'web' ? 'Click to select image' : 'Tap to add image'}
                      </Text>
                      <Text style={styles.imageUploadSubtext}>
                        {Platform.OS === 'web' ? 'Choose from files' : 'Camera or Gallery'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmittingTask && styles.submitButtonDisabled]}
                onPress={handleSubmitTask}
                disabled={isSubmittingTask}
              >
                {isSubmittingTask ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit Attendance & Evidence</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Company Details Modal */}
      <Modal
        visible={showCompanyDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompanyDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Company Details - {selectedCompany?.name}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowCompanyDetails(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.companyDetailsList}>
              {selectedCompany && (
                <>
                  {/* Company Header */}
                  <View style={styles.companyDetailsHeader}>
                    <View style={styles.companyDetailsProfileContainer}>
                      {selectedCompany.profilePicture ? (
                        <Image source={{ uri: selectedCompany.profilePicture }} style={styles.companyDetailsProfileImage} />
                      ) : (
                        <View style={styles.companyDetailsProfilePlaceholder}>
                          <Text style={styles.companyDetailsProfileText}>{selectedCompany.name.charAt(0)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.companyDetailsInfo}>
                      <Text style={styles.companyDetailsName}>{selectedCompany.name}</Text>
                      <Text style={styles.companyDetailsIndustry}>{selectedCompany.industry}</Text>
                    </View>
                  </View>

                  {/* Company Information */}
                  <View style={styles.companyDetailsSection}>
                    <Text style={styles.companyDetailsSectionTitle}>Company Information</Text>
                    
                    <View style={styles.companyDetailsInfoRow}>
                      <MaterialIcons name="location-on" size={20} color="#666" />
                      <Text style={styles.companyDetailsInfoLabel}>Location:</Text>
                      <Text style={styles.companyDetailsInfoValue}>{selectedCompany.location}</Text>
                    </View>
                    
                    <View style={styles.companyDetailsInfoRow}>
                      <MaterialIcons name="business" size={20} color="#666" />
                      <Text style={styles.companyDetailsInfoLabel}>Industry:</Text>
                      <Text style={styles.companyDetailsInfoValue}>{selectedCompany.industry}</Text>
                    </View>
                    
                    <View style={styles.companyDetailsInfoRow}>
                      <MaterialIcons name="people" size={20} color="#666" />
                      <Text style={styles.companyDetailsInfoLabel}>Available Slots:</Text>
                      <Text style={styles.companyDetailsInfoValue}>
                        {selectedCompany.availableSlots}/{selectedCompany.totalSlots}
                      </Text>
                    </View>
                    
                    <View style={styles.companyDetailsInfoRow}>
                      <MaterialIcons name="link" size={20} color="#666" />
                      <Text style={styles.companyDetailsInfoLabel}>Website:</Text>
                      <Text style={styles.companyDetailsInfoValue}>{selectedCompany.website}</Text>
                    </View>
                  </View>

                  {/* MOA Status */}
                  <View style={styles.companyDetailsSection}>
                    <Text style={styles.companyDetailsSectionTitle}>MOA Status</Text>
                    <View style={styles.companyDetailsStatusContainer}>
                      <View style={[styles.companyDetailsStatusBadge, { backgroundColor: getMOAStatusColor(selectedCompany.moaStatus) }]}>
                        <Text style={styles.companyDetailsStatusText}>{getMOAStatusText(selectedCompany.moaStatus)}</Text>
                      </View>
                      {selectedCompany.moaExpiryDate && (
                        <Text style={styles.companyDetailsStatusDate}>
                          Expires: {selectedCompany.moaExpiryDate}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Application Status */}
                  {selectedCompany.applicationStatus && (
                    <View style={styles.companyDetailsSection}>
                      <Text style={styles.companyDetailsSectionTitle}>Application Status</Text>
                      <View style={styles.companyDetailsStatusContainer}>
                        <View style={[styles.companyDetailsStatusBadge, { backgroundColor: getApplicationStatusColor(selectedCompany.applicationStatus) }]}>
                          <Text style={styles.companyDetailsStatusText}>{getApplicationStatusText(selectedCompany.applicationStatus)}</Text>
                        </View>
                        {selectedCompany.appliedAt && (
                          <Text style={styles.companyDetailsStatusDate}>
                            Applied: {new Date(selectedCompany.appliedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Description */}
                  <View style={styles.companyDetailsSection}>
                    <Text style={styles.companyDetailsSectionTitle}>About the Company</Text>
                    <Text style={styles.companyDetailsDescription}>{selectedCompany.description}</Text>
                  </View>

                  {/* Daily Tasks */}
                  <View style={styles.companyDetailsSection}>
                    <Text style={styles.companyDetailsSectionTitle}>Daily Tasks</Text>
                    {selectedCompany.dailyTasks.map((task, index) => (
                      <View key={index} style={styles.companyDetailsTaskItem}>
                        <View style={styles.companyDetailsTaskNumber}>
                          <Text style={styles.companyDetailsTaskNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.companyDetailsTaskText}>{task}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Absent Modal */}
      <Modal
        visible={showAbsentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAbsentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.absentModalContent}>
            <View style={styles.absentModalHeader}>
              <MaterialIcons 
                name={getAttendanceStatusIcon(modalAttendanceStatus)} 
                size={48} 
                color={getAttendanceStatusColor(modalAttendanceStatus)} 
              />
              <Text style={styles.absentModalTitle}>
                {modalAttendanceStatus === 'absent' ? 'You are Absent Today' : 'You are On Leave Today'}
              </Text>
            </View>
            
            <View style={styles.absentModalContent}>
              <Text style={styles.absentModalMessage}>
                {modalAttendanceStatus === 'absent' 
                  ? 'You are marked as absent for today. Daily tasks are not available when you are absent.'
                  : 'You are on leave today. Daily tasks are not available when you are on leave.'
                }
              </Text>
              
              <View style={styles.absentModalStatusContainer}>
                <View style={[
                  styles.absentModalStatusBadge, 
                  { backgroundColor: getAttendanceStatusColor(modalAttendanceStatus) }
                ]}>
                  <Text style={styles.absentModalStatusText}>
                    {getAttendanceStatusText(modalAttendanceStatus)}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.absentModalButton}
              onPress={() => setShowAbsentModal(false)}
            >
              <Text style={styles.absentModalButtonText}>Understood</Text>
            </TouchableOpacity>
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
        <View style={styles.successModalOverlay}>
          <Animated.View style={styles.successModalContent}>
            <View style={styles.successModalHeader}>
              <View style={styles.successIconContainer}>
                <MaterialIcons name="check-circle" size={48} color="#2D5A3D" />
              </View>
              <Text style={styles.successModalTitle}>Success!</Text>
              <Text style={styles.successModalMessage}>{successMessage}</Text>
            </View>
            
            <View style={styles.successModalActions}>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={() => setShowSuccessModal(false)}
              >
                <MaterialIcons name="done" size={20} color="#fff" />
                <Text style={styles.successModalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Start Internship Confirmation Modal */}
      <Modal
        visible={showStartInternshipModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancelStartInternship}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.startInternshipModalContent}>
            <MaterialIcons name="play-arrow" size={48} color="#4285f4" />
            <Text style={styles.startInternshipModalTitle}>Start Internship</Text>
            <Text style={styles.startInternshipModalText}>
              Are you sure you want to start your internship with {companyToStart?.name}?
            </Text>
            <Text style={styles.startInternshipModalSubtext}>
              Once started, you'll be able to submit attendance and evidence.
            </Text>
            <View style={styles.startInternshipModalButtons}>
              <TouchableOpacity
                style={[styles.startInternshipModalButton, styles.startInternshipCancelButton]}
                onPress={handleCancelStartInternship}
              >
                <Text style={styles.startInternshipCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startInternshipModalButton, styles.startInternshipConfirmButton]}
                onPress={handleConfirmStartInternship}
                disabled={isStartingInternship === companyToStart?.id}
              >
                {isStartingInternship === companyToStart?.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.startInternshipConfirmButtonText}>Start</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Internship Not Started Modal */}
      <Modal
        visible={showNotStartedModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowNotStartedModal(false);
          setCompanyNotStarted(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notStartedModalContent}>
            <MaterialIcons name="error-outline" size={64} color="#dc3545" />
            <Text style={styles.notStartedModalTitle}>Internship Not Started</Text>
            <Text style={styles.notStartedModalText}>
              You need to start your internship with {companyNotStarted?.name} before you can submit attendance and evidence.
            </Text>
            <Text style={styles.notStartedModalSubtext}>
              Please click the "Start Internship" button first.
            </Text>
            <View style={styles.notStartedModalButtons}>
              <TouchableOpacity
                style={[styles.notStartedModalButton, styles.notStartedModalCloseButton]}
                onPress={() => {
                  setShowNotStartedModal(false);
                  setCompanyNotStarted(null);
                }}
              >
                <Text style={styles.notStartedModalCloseButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notStartedModalButton, styles.notStartedModalStartButton]}
                onPress={() => {
                  setShowNotStartedModal(false);
                  if (companyNotStarted) {
                    handleStartInternship(companyNotStarted);
                  }
                  setCompanyNotStarted(null);
                }}
              >
                <MaterialIcons name="play-arrow" size={18} color="#fff" />
                <Text style={styles.notStartedModalStartButtonText}>Start Internship</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Active Internship Blocking Modal */}
      <Modal
        visible={showActiveInternshipModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowActiveInternshipModal(false);
          setActiveCompanyName('');
          setActiveCompanyRemainingHours(undefined);
          setCompanyToStartBlocked(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.activeInternshipModalContent}>
            <MaterialIcons name="warning" size={64} color="#ff9800" />
            <Text style={styles.activeInternshipModalTitle}>Complete Current Internship First</Text>
            <Text style={styles.activeInternshipModalText}>
              You currently have an active internship with {activeCompanyName} that needs to be completed before you can start a new one.
            </Text>
            {activeCompanyRemainingHours !== undefined && activeCompanyRemainingHours > 0 && (
              <Text style={styles.activeInternshipModalHours}>
                Remaining hours: {activeCompanyRemainingHours.toFixed(1)} hours
              </Text>
            )}
            <Text style={styles.activeInternshipModalSubtext}>
              Please complete all required hours for your current internship before starting a new one.
            </Text>
            <TouchableOpacity
              style={styles.activeInternshipModalButton}
              onPress={() => {
                setShowActiveInternshipModal(false);
                setActiveCompanyName('');
                setActiveCompanyRemainingHours(undefined);
                setCompanyToStartBlocked(null);
              }}
            >
              <Text style={styles.activeInternshipModalButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Internship Finished Modal */}
      <Modal
        visible={showFinishedModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowFinishedModal(false);
          setCompanyFinished(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.finishedModalContent}>
            <MaterialIcons name="check-circle" size={64} color="#FFD700" />
            <Text style={styles.finishedModalTitle}>Internship Completed</Text>
            <Text style={styles.finishedModalText}>
              Your internship with {companyFinished?.name} has been completed.
            </Text>
            {companyFinished?.finishedAt && (
              <Text style={styles.finishedModalDate}>
                Completed on: {new Date(companyFinished.finishedAt).toLocaleDateString()}
              </Text>
            )}
            <Text style={styles.finishedModalSubtext}>
              You can no longer submit attendance or evidence for this internship as it has already been finished.
            </Text>
            <TouchableOpacity
              style={styles.finishedModalButton}
              onPress={() => {
                setShowFinishedModal(false);
                setCompanyFinished(null);
              }}
            >
              <Text style={styles.finishedModalButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Info Complete Modal */}
      <Modal
        visible={showInfoCompleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowInfoCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoCompleteModalContent}>
            <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
            <Text style={styles.infoCompleteModalTitle}>Information Complete</Text>
            <Text style={styles.infoCompleteModalText}>
              All your personal information is already filled. You can use the "Get OJT Journal" button to generate your journal.
            </Text>
            <TouchableOpacity
              style={styles.infoCompleteModalButton}
              onPress={() => setShowInfoCompleteModal(false)}
            >
              <Text style={styles.infoCompleteModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Missing HTE Information Modal */}
      <Modal
        visible={showMissingHteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowMissingHteModal(false);
          setMissingHteCompanyNames([]);
          setMissingHteCompanies([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.missingHteModalContent}>
            <MaterialIcons name="warning" size={64} color="#F56E0F" />
            <Text style={styles.missingHteModalTitle}>Missing HTE Information</Text>
            <Text style={styles.missingHteModalText}>
              Please fill in the HTE information for the following companies before generating the journal:
            </Text>
            <ScrollView style={styles.missingHteCompanyList} showsVerticalScrollIndicator={true}>
              {missingHteCompanyNames.map((companyName, index) => (
                <View key={index} style={styles.missingHteCompanyItem}>
                  <MaterialIcons name="business" size={20} color="#F56E0F" />
                  <Text style={styles.missingHteCompanyName}>{companyName}</Text>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.missingHteModalSubtext}>
              Click "Missing HTE Information" to fill them in.
            </Text>
            <TouchableOpacity
              style={styles.missingHteModalButton}
              onPress={() => {
                setShowMissingHteModal(false);
                setMissingHteCompanyNames([]);
                // Open the HTE info modal (will use missingHteCompanies state)
                handleMissingHTEInfoClick();
              }}
            >
              <Text style={styles.missingHteModalButtonText}>Fill HTE Information</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.missingHteModalCancelButton}
              onPress={() => {
                setShowMissingHteModal(false);
                setMissingHteCompanyNames([]);
                setMissingHteCompanies([]);
              }}
            >
              <Text style={styles.missingHteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Training Schedule Modal */}
      <Modal
        visible={showTrainingScheduleModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancelTrainingSchedule}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.hteInfoModalContent}>
            <Text style={styles.hteInfoModalTitle}>Training Schedule</Text>
            <Text style={styles.hteInfoModalText}>
              Add your training schedule entries. The total hours must match the Total Internship Hours Summary (Section A).
            </Text>
            
            {/* Form Section */}
            <ScrollView 
              style={styles.hteInfoList} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Task/Job Classification *</Text>
                <TextInput
                  style={styles.hteInfoInput}
                  value={trainingScheduleForm.taskClassification}
                  onChangeText={(text) => setTrainingScheduleForm({ ...trainingScheduleForm, taskClassification: text })}
                  placeholder="e.g., Designing layouts"
                />
              </View>

              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Tools/Device/Software Used *</Text>
                <TextInput
                  style={styles.hteInfoInput}
                  value={trainingScheduleForm.toolsDeviceSoftwareUsed}
                  onChangeText={(text) => setTrainingScheduleForm({ ...trainingScheduleForm, toolsDeviceSoftwareUsed: text })}
                  placeholder="e.g., laptop, software names"
                />
              </View>

              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Total Hours *</Text>
                <TextInput
                  style={styles.hteInfoInput}
                  value={trainingScheduleForm.totalHours}
                  onChangeText={(text) => {
                    // Only allow numbers and decimal point
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = cleaned.split('.');
                    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                    setTrainingScheduleForm({ ...trainingScheduleForm, totalHours: formatted });
                  }}
                  placeholder="e.g., 40.5"
                  keyboardType="decimal-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.hteInfoPrimaryButton, isSavingTrainingSchedule && styles.disabledButton]}
                onPress={handleSaveTrainingSchedule}
                disabled={isSavingTrainingSchedule}
              >
                {isSavingTrainingSchedule ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.hteInfoButtonText}>
                    {editingScheduleId ? 'Update Entry' : 'Add Entry'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* List of Existing Entries */}
              {isLoadingTrainingSchedules ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#F56E0F" />
                  <Text style={{ marginTop: 8, color: '#666' }}>Loading schedules...</Text>
                </View>
              ) : trainingSchedules.length > 0 ? (
                <>
                  <Text style={[styles.hteInfoSectionLabel, { marginTop: 24 }]}>Existing Entries:</Text>
                  {trainingSchedules.map((schedule) => (
                    <View key={schedule.id} style={{
                      backgroundColor: '#f8f9fa',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#e0e0e0',
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 }}>
                        {schedule.taskClassification}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                        Tools: {schedule.toolsDeviceSoftwareUsed}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#F56E0F' }}>
                          {schedule.totalHours} hours
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => handleEditTrainingSchedule(schedule)}
                            style={{ padding: 6 }}
                          >
                            <MaterialIcons name="edit" size={18} color="#4285f4" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteTrainingSchedule(schedule.id)}
                            style={{ padding: 6 }}
                          >
                            <MaterialIcons name="delete" size={18} color="#EA4335" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                  <View style={{
                    backgroundColor: '#e8f5e9',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: '#4CAF50',
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#2D5A3D', textAlign: 'center', marginBottom: 8 }}>
                      Section B (Training Schedule) Total: {trainingSchedules.reduce((sum, s) => sum + s.totalHours, 0).toFixed(2)} hours
                    </Text>
                    <View style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: '#4CAF50',
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#2D5A3D', textAlign: 'center', marginBottom: 4 }}>
                        Section A (Total Internship Hours Summary): {sectionATotalHours.toFixed(2)} hours
                      </Text>
                      {Math.abs(trainingSchedules.reduce((sum, s) => sum + s.totalHours, 0) - sectionATotalHours) < 0.01 ? (
                        <Text style={{ fontSize: 12, color: '#4CAF50', textAlign: 'center', marginTop: 4, fontWeight: '600' }}>
                          ✓ Hours Match - Signature will be placed
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 12, color: '#EA4335', textAlign: 'center', marginTop: 4, fontWeight: '600' }}>
                          ⚠ Hours do not match - Please adjust entries
                        </Text>
                      )}
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>No training schedule entries yet.</Text>
                  <View style={{
                    backgroundColor: '#e8f5e9',
                    padding: 12,
                    borderRadius: 8,
                    width: '100%',
                    borderWidth: 1,
                    borderColor: '#4CAF50',
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#2D5A3D', textAlign: 'center' }}>
                      Section A (Total Internship Hours Summary): {sectionATotalHours.toFixed(2)} hours
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.hteInfoButtons}>
              <TouchableOpacity
                style={styles.hteInfoSecondaryButton}
                onPress={handleCancelTrainingSchedule}
                disabled={isSavingTrainingSchedule}
              >
                <Text style={[styles.hteInfoButtonText, { color: '#1a1a2e' }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Intern Feedback Form Modal */}
      <Modal
        visible={showInternFeedbackFormModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseFeedbackFormModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.hteInfoModalContent}>
            <Text style={styles.hteInfoModalTitle}>Intern Feedback Form</Text>
            <Text style={styles.hteInfoModalText}>
              Please provide your feedback about your internship experience. All fields are required.
            </Text>
            
            <ScrollView 
              style={styles.hteInfoList} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Company Dropdown */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Company *</Text>
                <View style={[styles.hteInfoInput, { paddingVertical: 0 }]}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                  }}>
                    {companies.filter(c => c.finishedAt !== null && c.finishedAt !== undefined).length > 0 ? (
                      <View style={{ flex: 1 }}>
                        {companies
                          .filter(c => c.finishedAt !== null && c.finishedAt !== undefined)
                          .map((company) => (
                            <TouchableOpacity
                              key={company.id}
                              style={{
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                backgroundColor: feedbackFormData.companyId === company.id ? '#E8F5E8' : '#f8f9fa',
                                marginBottom: 8,
                                borderWidth: 1,
                                borderColor: feedbackFormData.companyId === company.id ? '#4CAF50' : '#e0e0e0',
                              }}
                              onPress={() => handleCompanySelectForFeedback(company.id)}
                            >
                              <Text style={{
                                fontSize: 14,
                                color: '#1a1a2e',
                                fontWeight: feedbackFormData.companyId === company.id ? '600' : '400',
                              }}>
                                {company.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 14, color: '#999' }}>No finished internships available</Text>
                    )}
                  </View>
                </View>
                {feedbackFormErrors.companyId && (
                  <Text style={styles.hteInfoErrorText}>{feedbackFormErrors.companyId}</Text>
                )}
              </View>

              {/* Date Field */}
              <View style={styles.hteInfoInputGroup}>
                <Text style={styles.hteInfoInputLabel}>Date *</Text>
                <TextInput
                  style={[styles.hteInfoInput, styles.hteInfoInputReadOnly]}
                  value={feedbackFormData.formDate}
                  editable={false}
                  placeholder="Date will be auto-filled"
                />
              </View>

              {/* Loading State */}
              {isLoadingFeedbackForm && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#F56E0F" />
                  <Text style={{ marginTop: 8, color: '#666' }}>Loading feedback form...</Text>
                </View>
              )}

              {/* Questions */}
              {!isLoadingFeedbackForm && feedbackFormData.companyId && (
                <>
                  <Text style={[styles.hteInfoSectionLabel, { marginTop: 16 }]}>Please rate the following statements:</Text>
                  
                  {[
                    { num: 1, text: 'My training is aligned with my field of specialization.' },
                    { num: 2, text: 'My training is challenging.' },
                    { num: 3, text: 'I have opportunities for learning.' },
                    { num: 4, text: 'I am aware with the policies of the HTE.' },
                    { num: 5, text: 'I have positive working relationship with my site supervisor and other employees of the HTE.' },
                    { num: 6, text: 'I am aware of the risks and hazards of my working environment.' },
                    { num: 7, text: 'My department is committed to ensuring the health and safety of the Interns.' },
                  ].map((question) => {
                    const questionKey = `question${question.num}` as keyof typeof feedbackFormData;
                    const hasError = !!feedbackFormErrors[questionKey];
                    return (
                      <View key={question.num} style={styles.hteInfoInputGroup}>
                        <Text style={styles.hteInfoInputLabel}>
                          {question.num}. {question.text} *
                        </Text>
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'space-around',
                          marginTop: 8,
                          padding: 8,
                          backgroundColor: hasError ? '#fff5f5' : '#f8f9fa',
                          borderRadius: 8,
                          borderWidth: hasError ? 2 : 1,
                          borderColor: hasError ? '#dc3545' : '#e0e0e0',
                        }}>
                          {['SA', 'A', 'N', 'D', 'SD'].map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={{
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 6,
                                backgroundColor: feedbackFormData[questionKey] === option ? '#F56E0F' : 'transparent',
                                minWidth: 50,
                                alignItems: 'center',
                              }}
                              onPress={() => {
                                setFeedbackFormData({ ...feedbackFormData, [questionKey]: option });
                                if (feedbackFormErrors[questionKey]) {
                                  setFeedbackFormErrors({ ...feedbackFormErrors, [questionKey]: '' });
                                }
                              }}
                            >
                              <Text style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: feedbackFormData[questionKey] === option ? '#fff' : '#1a1a2e',
                              }}>
                                {option}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {hasError && (
                          <Text style={styles.hteInfoErrorText}>{feedbackFormErrors[questionKey]}</Text>
                        )}
                      </View>
                    );
                  })}

                  {/* Problems Met */}
                  <View style={styles.hteInfoInputGroup}>
                    <Text style={styles.hteInfoInputLabel}>Problems Met *</Text>
                    <TextInput
                      style={[
                        styles.hteInfoInput,
                        { height: 100, textAlignVertical: 'top' },
                        feedbackFormErrors.problemsMet && styles.hteInfoInputError
                      ]}
                      value={feedbackFormData.problemsMet}
                      onChangeText={(text) => {
                        setFeedbackFormData({ ...feedbackFormData, problemsMet: text });
                        if (feedbackFormErrors.problemsMet) {
                          setFeedbackFormErrors({ ...feedbackFormErrors, problemsMet: '' });
                        }
                      }}
                      placeholder="Describe any problems you encountered during your internship..."
                      multiline
                      numberOfLines={4}
                    />
                    {feedbackFormErrors.problemsMet && (
                      <Text style={styles.hteInfoErrorText}>{feedbackFormErrors.problemsMet}</Text>
                    )}
                  </View>

                  {/* Other Concerns */}
                  <View style={styles.hteInfoInputGroup}>
                    <Text style={styles.hteInfoInputLabel}>Other Concerns *</Text>
                    <TextInput
                      style={[
                        styles.hteInfoInput,
                        { height: 100, textAlignVertical: 'top' },
                        feedbackFormErrors.otherConcerns && styles.hteInfoInputError
                      ]}
                      value={feedbackFormData.otherConcerns}
                      onChangeText={(text) => {
                        setFeedbackFormData({ ...feedbackFormData, otherConcerns: text });
                        if (feedbackFormErrors.otherConcerns) {
                          setFeedbackFormErrors({ ...feedbackFormErrors, otherConcerns: '' });
                        }
                      }}
                      placeholder="Share any other concerns or feedback..."
                      multiline
                      numberOfLines={4}
                    />
                    {feedbackFormErrors.otherConcerns && (
                      <Text style={styles.hteInfoErrorText}>{feedbackFormErrors.otherConcerns}</Text>
                    )}
                  </View>

                  {/* Legend */}
                  <View style={{
                    backgroundColor: '#f8f9fa',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 8,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#e0e0e0',
                  }}>
                    <Text style={[styles.hteInfoSectionLabel, { marginTop: 0, marginBottom: 8 }]}>Legend:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <Text style={{ fontSize: 12, color: '#666' }}>SA - Strongly agree</Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>A - Agree</Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>N - Neutral</Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>D - Disagree</Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>SD - Strongly disagree</Text>
                    </View>
                  </View>
                </>
              )}

              {/* Submit Button */}
              {!isLoadingFeedbackForm && feedbackFormData.companyId && (
                <TouchableOpacity
                  style={[styles.hteInfoPrimaryButton, isSavingFeedbackForm && styles.disabledButton]}
                  onPress={handleSubmitFeedbackForm}
                  disabled={isSavingFeedbackForm}
                >
                  {isSavingFeedbackForm ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.hteInfoButtonText}>
                      {existingFeedbackFormId ? 'Update Feedback Form' : 'Submit Feedback Form'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.hteInfoButtons}>
              <TouchableOpacity
                style={styles.hteInfoSecondaryButton}
                onPress={handleCloseFeedbackFormModal}
                disabled={isSavingFeedbackForm}
              >
                <Text style={[styles.hteInfoButtonText, { color: '#1a1a2e' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Feedback Form Success Modal */}
      <Modal
        visible={showFeedbackFormSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseFeedbackFormSuccessModal}
      >
        <View style={styles.successModalOverlay}>
          <Animated.View style={styles.successModalContent}>
            <View style={styles.successModalHeader}>
              <View style={styles.successIconContainer}>
                <MaterialIcons name="check-circle" size={48} color="#2D5A3D" />
              </View>
              <Text style={styles.successModalTitle}>Success!</Text>
              <Text style={styles.successModalMessage}>
                {existingFeedbackFormId 
                  ? 'Your feedback form has been updated successfully!'
                  : 'Your feedback form has been submitted successfully!'
                }
              </Text>
            </View>
            
            <View style={styles.successModalActions}>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={handleCloseFeedbackFormSuccessModal}
              >
                <MaterialIcons name="done" size={20} color="#fff" />
                <Text style={styles.successModalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Attendance History Panel */}
      <AttendanceHistoryPanel
        visible={showAttendanceHistory}
        onClose={() => setShowAttendanceHistory(false)}
        companyName={selectedCompany?.name || ''}
        companyId={selectedCompany?.id || ''}
        userId={currentUser?.id || ''}
        records={attendanceHistoryRecords}
        loading={attendanceHistoryLoading}
        onRecordUpdated={async () => {
          // Refresh attendance records after update
          if (selectedCompany) {
            await handleViewAttendanceHistory(selectedCompany);
          }
        }}
      />

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8', // Soft cream background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#02050a',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F1E8',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8A598',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'System',
  },
  errorText: {
    fontSize: 16,
    color: '#02050a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.7,
    fontWeight: '400',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D5A3D',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#2D5A3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  header: {
    backgroundColor: '#2A2A2E', // Dark secondaryA
    padding: 24,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGradient: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
  },
  companiesList: {
    flex: 1,
    padding: 20,
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  enhancedCompanyCard: {
    backgroundColor: '#1B1B1E', // Dark secondary
    borderRadius: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  cardTouchable: {
    padding: 24,
  },
  expandedContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
  },
  enhancedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  enhancedStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  statusText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 15,
    color: '#F56E0F',
    fontWeight: 'bold',
  },
  statusDate: {
    fontSize: 12,
    color: '#F56E0F',
    marginTop: 4,
  },
  companyHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  profileContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  companyInfo: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  companyName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    fontFamily: 'System',
  },
  companyIndustry: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    marginBottom: 6,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  companyDetails: {
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 10,
    fontWeight: '500',
  },
  slotsContainer: {
    marginBottom: 10,
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  slotValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F56E0F',
    marginLeft: 8,
  },
  hoursContainer: {
    marginBottom: 10,
  },
  hoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  hoursValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F56E0F',
  },
  slotBar: {
    height: 8,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  slotFill: {
    height: '100%',
    borderRadius: 3,
  },
  moaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  moaLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  moaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  moaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDate: {
    fontSize: 12,
    color: '#999',
  },
  applicationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  applicationLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  applicationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  applicationText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  applicationDate: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    opacity: 0.9,
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#2D5A3D', // Forest green
  },
  startInternshipButton: {
    backgroundColor: '#4285f4', // Blue
  },
  downloadCertificateButton: {
    backgroundColor: '#2D5A3D', // Forest green
  },
  // Removed finishInternshipButton - companies now finish internships
  tasksButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  historyButton: {
    backgroundColor: '#1E3A5F', // Dark blue
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#02050a',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#02050a',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
    fontWeight: '400',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#F56E0F',
  },
  infoText: {
    fontSize: 14,
    color: '#02050a',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
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
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  closeModalButton: {
    padding: 4,
  },
  tasksList: {
    maxHeight: 400,
    padding: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a2e',
  },
  // Company Details Modal Styles
  companyDetailsList: {
    maxHeight: 500,
    padding: 20,
  },
  companyDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  companyDetailsProfileContainer: {
    marginRight: 16,
  },
  companyDetailsProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  companyDetailsProfilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyDetailsProfileText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  companyDetailsInfo: {
    flex: 1,
  },
  companyDetailsName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  companyDetailsIndustry: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  companyDetailsRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyDetailsRatingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  companyDetailsSection: {
    marginBottom: 24,
  },
  companyDetailsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  companyDetailsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  companyDetailsInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
    minWidth: 100,
  },
  companyDetailsInfoValue: {
    fontSize: 14,
    color: '#1a1a2e',
    flex: 1,
    marginLeft: 8,
  },
  companyDetailsStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyDetailsStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  companyDetailsStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyDetailsStatusDate: {
    fontSize: 14,
    color: '#666',
  },
  companyDetailsDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  companyDetailsTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  companyDetailsTaskNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyDetailsTaskNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyDetailsTaskText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a2e',
  },
  // Skeleton Loading Styles
  skeletonCompanyCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    overflow: 'hidden',
    opacity: 0.7,
    padding: 24,
  },
  skeletonCompanyHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  skeletonProfileContainer: {
    marginRight: 15,
  },
  skeletonProfileImage: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 30,
  },
  skeletonCompanyInfo: {
    flex: 1,
  },
  skeletonCompanyName: {
    width: '70%',
    height: 22,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
    marginBottom: 6,
  },
  skeletonCompanyIndustry: {
    width: '50%',
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonRating: {
    width: 60,
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 6,
  },
  skeletonExpandIcon: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 12,
  },
  // Task Form Styles
  taskFormContainer: {
    flex: 1,
    padding: 20,
  },
  attendanceTimesSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  timeSessionContainer: {
    marginBottom: 16,
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a2e',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#f8f9fa',
  },
  textInputError: {
    borderColor: '#EA4335',
    borderWidth: 2,
    backgroundColor: '#FFEBEE',
  },
  timeValidationErrorText: {
    fontSize: 12,
    color: '#EA4335',
    marginTop: 4,
    marginLeft: 4,
    lineHeight: 16,
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageUploadContainer: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    minHeight: 120,
    justifyContent: 'center',
  },
  imageUploadPlaceholder: {
    alignItems: 'center',
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginTop: 8,
  },
  imageUploadSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#E8A598',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D5A3D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Attendance Status Styles
  attendanceStatusContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  attendanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendanceStatusLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 12,
  },
  attendanceStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attendanceStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  attendanceStatusMessage: {
    fontSize: 12,
    color: '#F56E0F',
    fontStyle: 'italic',
    marginTop: 4,
  },
  attendanceStatusMessageContainer: {
    marginTop: 4,
  },
  refreshAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F56E0F',
    alignSelf: 'flex-start',
  },
  refreshAttendanceText: {
    fontSize: 12,
    color: '#F56E0F',
    fontWeight: '600',
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#666',
  },
  
  // Absent Modal Styles
  absentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  absentModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  absentModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 12,
    textAlign: 'center',
  },
  absentModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  absentModalStatusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  absentModalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  absentModalStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  absentModalButton: {
    backgroundColor: '#2D5A3D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  absentModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  successModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5A3D',
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  successModalActions: {
    width: '100%',
  },
  successModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D5A3D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#2D5A3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  missingInfoModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 600,
    width: '90%',
    maxHeight: '90%',
  },
  missingInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  missingInfoText: {
    fontSize: 14,
    color: '#4a4a4a',
    marginBottom: 12,
    lineHeight: 20,
  },
  missingInfoList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  missingInfoItem: {
    fontSize: 14,
    color: '#1a1a2e',
    marginBottom: 6,
  },
  missingInfoButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  missingInfoSecondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  missingInfoPrimaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#F56E0F',
  },
  missingInfoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  missingInfoTertiaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  missingInfoInputGroup: {
    marginBottom: 16,
  },
  missingInfoInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  missingInfoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a2e',
    backgroundColor: '#fff',
    minHeight: 44,
    textAlignVertical: 'top',
  },
  missingInfoInputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  missingInfoErrorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  ojtJournalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F56E0F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  ojtJournalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoUploadContainer: {
    borderWidth: 2,
    borderColor: '#F56E0F',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    backgroundColor: '#fafafa',
  },
  photoUploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  photoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  startInternshipModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startInternshipModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 16,
    marginBottom: 8,
  },
  startInternshipModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  startInternshipModalSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  startInternshipModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  startInternshipModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  startInternshipCancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  startInternshipCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  startInternshipConfirmButton: {
    backgroundColor: '#4285f4',
  },
  startInternshipConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notStartedModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notStartedModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 16,
    marginBottom: 8,
  },
  notStartedModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  notStartedModalSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  notStartedModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  notStartedModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    flexDirection: 'row',
    gap: 8,
  },
  notStartedModalCloseButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  notStartedModalCloseButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  notStartedModalStartButton: {
    backgroundColor: '#4285f4',
  },
  notStartedModalStartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeInternshipModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeInternshipModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff9800',
    marginTop: 16,
    marginBottom: 8,
  },
  activeInternshipModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  activeInternshipModalHours: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff9800',
    textAlign: 'center',
    marginBottom: 12,
  },
  activeInternshipModalSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  activeInternshipModalButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#ff9800',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  activeInternshipModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingInfoSelectionModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 500,
    width: '90%',
    alignItems: 'center',
  },
  missingInfoSelectionHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missingInfoSelectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  getOJTJournalHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F56E0F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  getOJTJournalHeaderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  missingInfoSelectionText: {
    fontSize: 14,
    color: '#4a4a4a',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  missingInfoSelectionButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  missingInfoSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F56E0F',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  missingInfoSelectionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  missingInfoSelectionCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  missingInfoSelectionCancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  hteInfoModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    maxHeight: '90%',
    maxWidth: 600,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  hteInfoModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  hteInfoModalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  hteInfoList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  hteInfoInputGroup: {
    marginBottom: 16,
  },
  hteInfoSectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginTop: 8,
    marginBottom: 12,
  },
  hteInfoInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  hteInfoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a2e',
    backgroundColor: '#fff',
    minHeight: 44,
  },
  hteInfoInputReadOnly: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  hteInfoInputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  hteInfoErrorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  htePhotoUploadContainer: {
    borderWidth: 2,
    borderColor: '#F56E0F',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    backgroundColor: '#fafafa',
  },
  htePhotoUploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  htePhotoUploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  htePhotoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  htePhotoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  hteInfoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  hteInfoPrimaryButton: {
    flex: 1,
    backgroundColor: '#F56E0F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  hteInfoSecondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  hteInfoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Removed finishInternshipModal styles - companies now finish internships
  finishedHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  finishedHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
  },
  evaluationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(45, 90, 61, 0.15)',
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(45, 90, 61, 0.3)',
  },
  evaluationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D5A3D',
  },
  finishedDateContainer: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  finishedDateText: {
    fontSize: 12,
    color: '#FFD700',
    fontStyle: 'italic',
  },
  finishedModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  finishedModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 16,
    marginBottom: 8,
  },
  finishedModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  finishedModalDate: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  finishedModalSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  finishedModalButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  finishedModalButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCompleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoCompleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  infoCompleteModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  infoCompleteModalButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  infoCompleteModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  missingHteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  missingHteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F56E0F',
    marginTop: 16,
    marginBottom: 8,
  },
  missingHteModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  missingHteCompanyList: {
    width: '100%',
    marginBottom: 16,
    maxHeight: 150,
  },
  missingHteCompanyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffe0e0',
  },
  missingHteCompanyName: {
    fontSize: 14,
    color: '#1a1a2e',
    marginLeft: 8,
    fontWeight: '600',
  },
  missingHteModalSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  missingHteModalButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#F56E0F',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 12,
  },
  missingHteModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  missingHteModalCancelButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingHteModalCancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Attendance History Modal Styles
  attendanceHistoryModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 800,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  attendanceHistoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  attendanceHistoryModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    flex: 1,
  },
  attendanceHistoryScrollView: {
    maxHeight: 600,
  },
  attendanceHistoryLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceHistoryLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6c757d',
  },
  attendanceHistoryEmptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceHistoryEmptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  attendanceHistoryList: {
    padding: 16,
  },
  attendanceHistoryItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  attendanceHistoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceHistoryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
    flex: 1,
  },
  attendanceHistoryItemContent: {
    gap: 8,
  },
  attendanceHistoryTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  attendanceHistoryTimeItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
  },
  attendanceHistoryTimeLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  attendanceHistoryTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  attendanceHistorySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  attendanceHistorySummaryItem: {
    flex: 1,
  },
  attendanceHistorySummaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  attendanceHistorySummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  attendanceHistoryNotesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  attendanceHistoryNotesLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '600',
  },
  attendanceHistoryNotesValue: {
    fontSize: 13,
    color: '#1E3A5F',
    lineHeight: 18,
  },
  attendanceHistoryRemarksContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  attendanceHistoryRemarksLabel: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
    fontWeight: '600',
  },
  attendanceHistoryRemarksValue: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  attendanceHistoryVerifiedAt: {
    fontSize: 11,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
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
});
