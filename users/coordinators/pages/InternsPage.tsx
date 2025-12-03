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
  Platform,
  Animated,
  Clipboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
// DateTimePicker is not supported on web, so we'll use a conditional import
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (error) {
    console.log('DateTimePicker not available:', error);
  }
}
import { apiService } from '../../../lib/api';
import { CloudinaryService } from '../../../lib/cloudinaryService';
import * as XLSX from 'xlsx';
import AttendanceHistoryPanel from '../../studentinterns/components/AttendanceHistoryModal';
import { AttendanceRecordEntry } from '../../studentinterns/utils/journalGenerator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive breakpoints
const isMobile = screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isDesktop = screenWidth >= 1024;

interface Requirement {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  dueDate?: string;
  fileUrl?: string;
  fileName?: string;
  filePublicId?: string;
  uploadedAt?: string;
  completed: boolean;
  submissionStatus?: 'submitted' | 'approved' | 'rejected' | 'needs_revision';
  submittedAt?: string;
  coordinatorFeedback?: string;
}

interface Intern {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  studentId: string;
  userId?: string; // User ID for fetching applications
  academicYear: string;
  major: string;
  university: string;
  gpa: string;
  schoolYear: string;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
  internshipCompany?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
  requirements: Requirement[];
}

interface Company {
  id: string;
  company_name: string;
  industry: string;
  company_address: string;
  company_profile_picture?: string;
  status: string;
  application_date?: string;
}

interface Class {
  id: string;
  className: string;
  schoolYear: string;
  classCode: string;
  studentCount: number;
  status?: string;
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
}

interface InternsPageProps {
  currentUser: UserInfo | null;
  onViewAssignedCompanies?: (intern: Intern) => void;
}

export default function InternsPage({ currentUser, onViewAssignedCompanies }: InternsPageProps) {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('2024-2025');
  const [showRequirements, setShowRequirements] = useState(false);
  const [showAddInternModal, setShowAddInternModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [addInternEmail, setAddInternEmail] = useState('');
  const [addInternStudentId, setAddInternStudentId] = useState('');
  const [addInternSchoolYear, setAddInternSchoolYear] = useState('2024-2025');
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [studentFound, setStudentFound] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  const [dimensions, setDimensions] = useState({ width: screenWidth, height: screenHeight });
  
  // Requirements management states
  const [newRequirement, setNewRequirement] = useState({
    name: '',
    description: '',
    isRequired: true,
    dueDate: '',
    fileUrl: '',
    fileName: '',
    schoolYear: '2024-2025', // Default to current selected school year
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInternDetails, setSelectedInternDetails] = useState<Intern | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [showAddInternYearSelector, setShowAddInternYearSelector] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showAssignedCompanyModal, setShowAssignedCompanyModal] = useState(false);
  const [assignedCompanies, setAssignedCompanies] = useState<Company[]>([]);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [internToDelete, setInternToDelete] = useState<Intern | null>(null);
  const [deletingIntern, setDeletingIntern] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [className, setClassName] = useState('');
  const [selectedClassSchoolYear, setSelectedClassSchoolYear] = useState('');
  const [showClassYearDropdown, setShowClassYearDropdown] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [showAttendanceHistoryModal, setShowAttendanceHistoryModal] = useState(false);
  const [selectedInternForAttendance, setSelectedInternForAttendance] = useState<Intern | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordEntry[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [selectedCompanyForAttendance, setSelectedCompanyForAttendance] = useState<Company | null>(null);
  const [showCompanySelectorModal, setShowCompanySelectorModal] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const schoolYears = [
    '2023-2024', 
    '2024-2025', 
    '2025-2026', 
    '2026-2027', 
    '2027-2028', 
    '2028-2029', 
    '2029-2030', 
    '2030-2031', 
    '2031-2032', 
    '2032-2033', 
    '2033-2034', 
    '2034-2035'
  ];

  useEffect(() => {
    fetchInterns();
    fetchClasses();
  }, []);

  useEffect(() => {
    // Refresh classes when a new class is created
    if (!showCreateClassModal) {
      fetchClasses();
    }
  }, [showCreateClassModal]);

  useEffect(() => {
    filterInterns();
  }, [searchQuery, selectedSchoolYear, interns]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      
      if (!currentUser) {
        console.log('No current user found for fetching classes');
        setClasses([]);
        setLoadingClasses(false);
        return;
      }

      console.log('Fetching classes for coordinator:', currentUser.id);
      
      const response = await apiService.getCoordinatorClasses(currentUser.id) as any;
      
      if (response.success && response.classes) {
        console.log('✅ Classes fetched successfully:', response.classes.length);
        
        const transformedClasses: Class[] = (response.classes || []).map((cls: any) => ({
          id: cls.id?.toString() || '',
          className: cls.className || cls.class_name || '',
          schoolYear: cls.schoolYear || cls.school_year || '',
          classCode: cls.classCode || cls.class_code || '',
          studentCount: cls.studentCount || 0,
          status: cls.status || 'active'
        }));
        
        setClasses(transformedClasses);
      } else {
        console.log('No classes found or error:', response.message);
        setClasses([]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const copyClassCode = async (classCode: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Clipboard API
        await navigator.clipboard.writeText(classCode);
      } else {
        // React Native: Use Clipboard from react-native
        if (Clipboard && Clipboard.setString) {
          Clipboard.setString(classCode);
        }
      }
      Alert.alert('Success', `Class code "${classCode}" copied to clipboard!`);
    } catch (error) {
      console.error('Error copying class code:', error);
      Alert.alert('Error', 'Failed to copy class code. Please try again.');
    }
  };

  const fetchInterns = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        console.log('No current user found');
        setInterns([]);
        setLoading(false);
        return;
      }

      console.log('Fetching interns for coordinator:', currentUser.id);
      
      // First, fetch the coordinator's requirements to filter by
      const coordinatorRequirementsResponse = await apiService.getCoordinatorRequirements(currentUser.id);
      const coordinatorRequirementIds = new Set<string>();
      
      if (coordinatorRequirementsResponse.success && coordinatorRequirementsResponse.requirements) {
        coordinatorRequirementsResponse.requirements.forEach((req: any) => {
          // Ensure requirement_id is stored as string for consistent comparison
          const reqId = String(req.requirement_id || '');
          if (reqId) {
            coordinatorRequirementIds.add(reqId);
          }
        });
        console.log('📋 Coordinator requirement IDs:', Array.from(coordinatorRequirementIds));
        console.log('📋 Coordinator requirement details:', coordinatorRequirementsResponse.requirements.map((r: any) => ({
          requirement_id: r.requirement_id,
          type: typeof r.requirement_id,
          name: r.requirement_name
        })));
      }
      
      // Fetch interns from the database
      const response = await apiService.getCoordinatorInterns(currentUser.id);
      
      if (response.success && response.interns) {
        console.log('✅ Interns fetched successfully:', response.interns.length);
        
        // Transform the data to match the Intern interface and fetch requirements
        const transformedInterns: Intern[] = await Promise.all(
          response.interns.map(async (intern: any) => {
            console.log('🔍 Intern data received:', {
              id: intern.id,
              first_name: intern.first_name,
              last_name: intern.last_name,
              profile_picture: intern.profile_picture,
              profilePicture: intern.profilePicture
            });
            // Fetch requirements and submissions for this student
            const [requirements, submissions] = await Promise.all([
              fetchStudentRequirements(intern.student_id),
              fetchStudentSubmissions(intern.student_id)
            ]);
            
            console.log(`📋 Student ${intern.student_id} (intern ${intern.id}) - All Requirements:`, requirements.length);
            console.log(`📋 Student ${intern.student_id} (intern ${intern.id}) - All Submissions:`, submissions.length);
            
            // Debug: Log requirement IDs for this student
            if (requirements.length > 0) {
              console.log(`📋 Student ${intern.student_id} - Requirement IDs:`, requirements.map((r: any) => ({
                requirement_id: r.requirement_id,
                type: typeof r.requirement_id,
                name: r.requirement_name || r.name
              })));
            }
            
            // Filter requirements to only include those from this coordinator
            // Ensure both sides are strings for comparison
            const coordinatorRequirements = requirements.filter((req: any) => {
              const reqId = String(req.requirement_id || req.id || '');
              const matches = coordinatorRequirementIds.has(reqId);
              if (!matches && req.requirement_id) {
                console.log(`❌ Requirement ${req.requirement_id} (${typeof req.requirement_id}) not found in coordinator set for student ${intern.student_id}`);
              }
              return matches;
            });
            
            // Filter submissions to only include those from this coordinator
            const coordinatorSubmissions = submissions.filter((sub: any) => {
              const subId = String(sub.requirement_id || '');
              return coordinatorRequirementIds.has(subId);
            });
            
            console.log(`📋 Student ${intern.student_id} (intern ${intern.id}) - Coordinator Requirements:`, coordinatorRequirements.length);
            console.log(`📋 Student ${intern.student_id} (intern ${intern.id}) - Coordinator Submissions:`, coordinatorSubmissions.length);
            
            // Create a map of all requirements (both assigned and submitted)
            const allRequirements = new Map();
            
            // Add assigned requirements (only from this coordinator)
            coordinatorRequirements.forEach((req: any) => {
              const reqId = String(req.requirement_id || req.id || '');
              allRequirements.set(reqId, {
                id: reqId,
                requirement_id: reqId,
                name: req.requirement_name || req.name,
                description: req.requirement_description || req.description,
                isRequired: req.is_required || req.isRequired,
                dueDate: req.due_date || req.dueDate,
                fileUrl: req.file_url || req.fileUrl,
                fileName: req.file_name || req.fileName,
                submissionStatus: undefined,
                submittedAt: undefined,
                coordinatorFeedback: undefined,
                completed: false
              });
            });
            
            // Add submitted requirements (only from this coordinator)
            coordinatorSubmissions.forEach((sub: any) => {
              const subId = String(sub.requirement_id || '');
              const existingReq = allRequirements.get(subId);
              if (existingReq) {
                // Update existing requirement with submission data
                allRequirements.set(subId, {
                  ...existingReq,
                  submissionStatus: sub.status,
                  submittedAt: sub.submitted_at,
                  coordinatorFeedback: sub.coordinator_feedback,
                  completed: sub.status === 'approved'
                });
              } else {
                // Add new requirement from submission
                allRequirements.set(subId, {
                  id: subId,
                  requirement_id: subId,
                  name: sub.requirement_name,
                  description: sub.requirement_description,
                  isRequired: sub.is_required,
                  dueDate: sub.due_date,
                  fileUrl: sub.submitted_file_url,
                  fileName: sub.submitted_file_name,
                  completed: sub.status === 'approved',
                  submissionStatus: sub.status,
                  submittedAt: sub.submitted_at,
                  coordinatorFeedback: sub.coordinator_feedback
                });
              }
            });
            
            const requirementsWithStatus = Array.from(allRequirements.values());
            
            console.log(`📋 Student ${intern.student_id} (intern ${intern.id}) - Final requirements:`, requirementsWithStatus.length);
            console.log(`📋 Student ${intern.student_id} (intern ${intern.id}) - Approved requirements:`, requirementsWithStatus.filter(r => r.submissionStatus === 'approved').length);
            
            return {
          id: intern.id,
          firstName: intern.first_name,
          lastName: intern.last_name,
          email: intern.email,
          phoneNumber: intern.phone_number || 'N/A',
          profilePicture: intern.profile_picture || intern.profilePicture,
          studentId: intern.id_number,
          userId: intern.user_id, // Store user_id for fetching applications (from backend response)
          academicYear: intern.year,
          major: intern.major,
          university: intern.university || 'Davao Oriental State University',
          gpa: intern.gpa || 'N/A',
          schoolYear: intern.school_year,
          status: intern.status || 'active',
          internshipCompany: intern.internship_company || undefined,
          internshipStartDate: intern.internship_start_date || undefined,
          internshipEndDate: intern.internship_end_date || undefined,
              requirements: requirementsWithStatus,
            };
          })
        );
        
        setInterns(transformedInterns);
      } else {
        console.log('No interns found or error:', response.message);
        setInterns([]);
      }
    } catch (error) {
      console.error('Error fetching interns:', error);
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentRequirements = async (studentId: string) => {
    try {
      const response = await apiService.getStudentRequirements(studentId);
      if (response.success) {
        return response.requirements || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching student requirements:', error);
      return [];
    }
  };

  const fetchStudentSubmissions = async (studentId: string) => {
    try {
      const response = await apiService.getStudentSubmissions(studentId);
      if (response.success) {
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching student submissions:', error);
      return [];
    }
  };

  const filterInterns = () => {
    let filtered = interns;

    // Filter by school year
    filtered = filtered.filter(intern => intern.schoolYear === selectedSchoolYear);

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(intern =>
        intern.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (intern.internshipCompany && intern.internshipCompany.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredInterns(filtered);
  };

  const handleViewDetails = (intern: Intern) => {
    setSelectedInternDetails(intern);
    setShowDetailsModal(true);
  };


  const handleDeleteIntern = (intern: Intern) => {
    console.log('🗑️ Delete intern called for:', intern.id, intern.firstName, intern.lastName);
    setInternToDelete(intern);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteIntern = async () => {
    if (!internToDelete) return;
    
    try {
      setDeletingIntern(true);
      console.log('🗑️ Calling delete API for intern:', internToDelete.id);
      // Call API to delete intern from database
      const response = await apiService.deleteIntern(internToDelete.id);
      
      console.log('🗑️ Delete API response:', response);
      
      if (response.success) {
        console.log('🗑️ Delete successful, updating state...');
        
        // If the deleted intern was selected, clear the selection first
        setSelectedIntern(prev => {
          if (prev && prev.id === internToDelete.id) {
            console.log('🗑️ Clearing selected intern');
            return null;
          }
          return prev;
        });
        
        setSelectedInternDetails(prev => {
          if (prev && prev.id === internToDelete.id) {
            console.log('🗑️ Clearing selected intern details and closing modal');
            setShowDetailsModal(false);
            return null;
          }
          return prev;
        });
        
        // Collapse the card if it was expanded
        setExpandedCard(prev => {
          if (prev === internToDelete.id) {
            console.log('🗑️ Collapsing expanded card');
            return null;
          }
          return prev;
        });
        
        // Remove from local state using functional updates to avoid stale closures
        setInterns(prevInterns => {
          const updated = prevInterns.filter(i => i.id !== internToDelete.id);
          console.log('🗑️ Updated interns list:', updated.length, 'remaining');
          return updated;
        });
        
        // Also remove from filteredInterns to update UI immediately
        setFilteredInterns(prevFiltered => {
          const updated = prevFiltered.filter(i => i.id !== internToDelete.id);
          console.log('🗑️ Updated filtered interns list:', updated.length, 'remaining');
          return updated;
        });
        
        console.log('🗑️ Delete complete');
        setShowDeleteConfirmModal(false);
        setInternToDelete(null);
        Alert.alert('Success', 'Intern deleted successfully');
      } else {
        console.log('🗑️ Delete failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to delete intern');
      }
    } catch (error) {
      console.error('🗑️ Error deleting intern:', error);
      Alert.alert('Error', 'Failed to delete intern. Please try again.');
    } finally {
      setDeletingIntern(false);
    }
  };

  const cancelDeleteIntern = () => {
    setShowDeleteConfirmModal(false);
    setInternToDelete(null);
  };

  const handleRequirements = (intern: Intern) => {
    setSelectedIntern(intern);
    setShowRequirements(true);
  };

  const refreshInternRequirements = async () => {
    if (selectedIntern && currentUser) {
      // First, fetch the coordinator's requirements to filter by
      const coordinatorRequirementsResponse = await apiService.getCoordinatorRequirements(currentUser.id);
      const coordinatorRequirementIds = new Set<string>();
      
      if (coordinatorRequirementsResponse.success && coordinatorRequirementsResponse.requirements) {
        coordinatorRequirementsResponse.requirements.forEach((req: any) => {
          // Ensure requirement_id is stored as string for consistent comparison
          const reqId = String(req.requirement_id || '');
          if (reqId) {
            coordinatorRequirementIds.add(reqId);
          }
        });
      }
      
      // Refresh the specific intern's requirements
      const [requirements, submissions] = await Promise.all([
        fetchStudentRequirements(selectedIntern.studentId),
        fetchStudentSubmissions(selectedIntern.studentId)
      ]);
      
      // Filter requirements to only include those from this coordinator
      // Ensure both sides are strings for comparison
      const coordinatorRequirements = requirements.filter((req: any) => {
        const reqId = String(req.requirement_id || req.id || '');
        return coordinatorRequirementIds.has(reqId);
      });
      
      // Filter submissions to only include those from this coordinator
      const coordinatorSubmissions = submissions.filter((sub: any) => {
        const subId = String(sub.requirement_id || '');
        return coordinatorRequirementIds.has(subId);
      });
      
      // Create a map of all requirements (both assigned and submitted)
      const allRequirements = new Map();
      
      // Add assigned requirements (only from this coordinator)
      coordinatorRequirements.forEach((req: any) => {
        const reqId = String(req.requirement_id || req.id || '');
        allRequirements.set(reqId, {
          id: reqId,
          requirement_id: reqId,
          name: req.requirement_name || req.name,
          description: req.requirement_description || req.description,
          isRequired: req.is_required || req.isRequired,
          dueDate: req.due_date || req.dueDate,
          fileUrl: req.file_url || req.fileUrl,
          fileName: req.file_name || req.fileName,
          submissionStatus: undefined,
          submittedAt: undefined,
          coordinatorFeedback: undefined,
          completed: false
        });
      });
      
      // Add submitted requirements (only from this coordinator)
      coordinatorSubmissions.forEach((sub: any) => {
        const subId = String(sub.requirement_id || '');
        const existingReq = allRequirements.get(subId);
        if (existingReq) {
          // Update existing requirement with submission data
          allRequirements.set(subId, {
            ...existingReq,
            submissionStatus: sub.status,
            submittedAt: sub.submitted_at,
            coordinatorFeedback: sub.coordinator_feedback,
            completed: sub.status === 'approved'
          });
        } else {
          // Add new requirement from submission
          allRequirements.set(subId, {
            id: subId,
            requirement_id: subId,
            name: sub.requirement_name,
            description: sub.requirement_description,
            isRequired: sub.is_required,
            dueDate: sub.due_date,
            fileUrl: sub.submitted_file_url,
            fileName: sub.submitted_file_name,
            completed: sub.status === 'approved',
            submissionStatus: sub.status,
            submittedAt: sub.submitted_at,
            coordinatorFeedback: sub.coordinator_feedback
          });
        }
      });
      
      const requirementsWithStatus = Array.from(allRequirements.values());
      
      // Update the selected intern with new requirements
      setSelectedIntern(prev => prev ? { ...prev, requirements: requirementsWithStatus } : null);
      
      // Also update the main interns list
      setInterns(prev => prev.map(intern => 
        intern.id === selectedIntern.id 
          ? { ...intern, requirements: requirementsWithStatus }
          : intern
      ));
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34a853';
      case 'inactive': return '#ea4335';
      case 'graduated': return '#4285f4';
      case 'suspended': return '#fbbc04';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'graduated': return 'Graduated';
      case 'suspended': return 'Suspended';
      default: return 'Unknown';
    }
  };

  const getRequirementsProgress = (requirements: Requirement[]) => {
    if (requirements.length === 0) return 0;
    const completed = requirements.filter(req => req.completed).length;
    return Math.round((completed / requirements.length) * 100);
  };

  const getRequirementsProgressText = (requirements: Requirement[]) => {
    if (requirements.length === 0) return '0/0';
    const completed = requirements.filter(req => req.completed).length;
    return `${completed}/${requirements.length}`;
  };

  const validateStudentId = (studentId: string) => {
    const regex = /^\d{4}-\d{4}$/;
    return regex.test(studentId);
  };

  const searchStudent = async () => {
    if (!addInternEmail.trim() && !addInternStudentId.trim()) {
      setSearchError('Please enter either email or student ID');
      return;
    }

    if (addInternStudentId.trim() && !validateStudentId(addInternStudentId)) {
      setSearchError('Student ID must be in format xxxx-xxxx');
      return;
    }

    try {
      setSearchingStudent(true);
      setSearchError('');
      setStudentFound(null);

      // Search by email or student ID
      const searchParams = addInternEmail.trim() 
        ? { email: addInternEmail.trim() }
        : { studentId: addInternStudentId.trim() };

      console.log('Searching for student with params:', searchParams);
      
      // This would be a new API endpoint to search for students
      const response = await apiService.searchStudent(searchParams);
      
      if (response.success && response.student) {
        setStudentFound(response.student);
        console.log('Student found:', response.student);
      } else {
        setSearchError('Student not found');
      }
    } catch (error) {
      console.error('Error searching for student:', error);
      setSearchError('Error searching for student. Please try again.');
    } finally {
      setSearchingStudent(false);
    }
  };

  const addStudentAsIntern = async () => {
    if (!studentFound) {
      setSearchError('Please search for a student first');
      return;
    }

    if (!currentUser) {
      setSearchError('User not authenticated');
      return;
    }

    try {
      console.log('Adding student as intern:', studentFound);
      console.log('Current user ID:', currentUser.id);
      
      // This would be a new API endpoint to add student as intern
      const response = await apiService.addStudentAsIntern({
        studentId: studentFound.id,
        schoolYear: addInternSchoolYear,
        coordinatorId: currentUser.id // Use actual current user ID
      });

      if (response.success) {
        // Show success notification with enrollment count if available
        const autoEnrolledClasses = (response as any).autoEnrolledClasses || 0;
        
        let successMsg = `Student "${studentFound.first_name} ${studentFound.last_name}" added as intern successfully!`;
        if (autoEnrolledClasses > 0) {
          successMsg = `Student "${studentFound.first_name} ${studentFound.last_name}" added as intern successfully! ${autoEnrolledClasses} class${autoEnrolledClasses !== 1 ? 'es' : ''} automatically enrolled.`;
        }
        
        setSuccessMessage(successMsg);
        setShowSuccessModal(true);
        
        setShowAddInternModal(false);
        setAddInternEmail('');
        setAddInternStudentId('');
        setStudentFound(null);
        setSearchError('');
        // Refresh the interns list
        await fetchInterns();
      } else {
        setSearchError(response.message || 'Failed to add student as intern');
      }
    } catch (error) {
      console.error('Error adding student as intern:', error);
      // Extract the actual error message from the error object
      const errorMessage = error instanceof Error ? error.message : 'Error adding student as intern. Please try again.';
      setSearchError(errorMessage);
    }
  };

  const closeAddInternModal = () => {
    setShowAddInternModal(false);
    setAddInternEmail('');
    setAddInternStudentId('');
    setStudentFound(null);
    setSearchError('');
  };

  // Requirements management functions
  const handleAddRequirement = () => {
    setEditingRequirement(null);
    setSelectedFile(null);
    setNewRequirement({
      name: '',
      description: '',
      isRequired: true,
      dueDate: '',
      fileUrl: '',
      fileName: '',
      schoolYear: selectedSchoolYear, // Set to currently selected school year
    });
    setShowRequirementsModal(true);
  };

  const handleEditRequirement = (requirement: Requirement) => {
    setEditingRequirement(requirement);
    setNewRequirement({
      name: requirement.name,
      description: requirement.description || '',
      isRequired: requirement.isRequired,
      dueDate: requirement.dueDate || '',
      fileUrl: requirement.fileUrl || '',
      fileName: requirement.fileName || '',
      schoolYear: selectedSchoolYear, // Keep current school year for editing
    });
    setShowRequirementsModal(true);
  };

  const handleSaveRequirement = async () => {
    console.log('🚀 handleSaveRequirement called');
    console.log('📋 newRequirement:', newRequirement);
    console.log('👤 currentUser:', currentUser);
    
    if (!newRequirement.name.trim()) {
      console.log('❌ No requirement name provided');
      Alert.alert('Error', 'Please enter a requirement name');
      return;
    }

    if (!editingRequirement && !newRequirement.schoolYear) {
      console.log('❌ No school year selected');
      Alert.alert('Error', 'Please select a class (school year)');
      return;
    }

    // Check if coordinator has assigned interns in the selected class
    const internsInClass = !editingRequirement 
      ? interns.filter(i => i.schoolYear === newRequirement.schoolYear)
      : interns;
    
    if (internsInClass.length === 0) {
      console.log('❌ No interns assigned to this coordinator for the selected class');
      Alert.alert(
        'No Students in Class', 
        `No students found in Class ${newRequirement.schoolYear}. Please select a different class or add students to this class first.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      let finalFileUrl = newRequirement.fileUrl;
      let finalFileName = newRequirement.fileName;

      // If there's a selected file but no uploaded URL, upload it first
      if (selectedFile && !newRequirement.fileUrl) {
        console.log('📤 File selected but not uploaded, uploading to Cloudinary...');
        
        try {
          setUploadingFile(true);
          
          // For React Native, we need to handle the file differently
          let fileToUpload;
          
          if (Platform.OS === 'web') {
            // Web: Convert to File object
            fileToUpload = new File([selectedFile.uri], selectedFile.name, {
              type: 'application/pdf',
            });
          } else {
            // React Native: Use the asset directly
            fileToUpload = selectedFile;
          }

          console.log('📄 File to upload:', fileToUpload);

          // Upload to Cloudinary using the dedicated requirements method
          const uploadResult = await CloudinaryService.uploadRequirementPDF(fileToUpload, selectedFile.name);
          
          console.log('📊 Upload result:', uploadResult);
          
          if (uploadResult.success && uploadResult.url) {
            console.log('✅ File uploaded successfully:', uploadResult.url);
            finalFileUrl = uploadResult.url;
            finalFileName = selectedFile.name;
          } else {
            console.error('❌ Upload failed:', uploadResult.error);
            throw new Error(uploadResult.error || 'Upload failed');
          }
        } catch (uploadError) {
          console.error('❌ Error uploading file:', uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error occurred';
          Alert.alert('Error', `Failed to upload file: ${errorMessage}`);
          return;
        } finally {
          setUploadingFile(false);
        }
      }

      const requirementData = {
        name: newRequirement.name.trim(),
        description: newRequirement.description.trim(),
        isRequired: newRequirement.isRequired,
        dueDate: newRequirement.dueDate || null, // Convert empty string to null
        fileUrl: finalFileUrl || undefined,
        fileName: finalFileName || undefined,
        coordinatorId: currentUser?.id || '',
        schoolYear: !editingRequirement ? newRequirement.schoolYear : undefined, // Only send school year for new requirements
      };

      console.log('📝 Saving requirement with data:', requirementData);
      console.log('📄 Selected file:', selectedFile);
      console.log('🔗 File URL in requirement:', newRequirement.fileUrl);
      console.log('👥 Current interns count:', interns.length);
      console.log('👥 Current filtered interns count:', filteredInterns.length);
      
      let response;
      if (editingRequirement) {
        // Update existing requirement
        console.log('🔄 Updating existing requirement:', editingRequirement.id);
        response = await apiService.updateRequirement(editingRequirement.id, requirementData);
      } else {
        // Create new requirement
        console.log('➕ Creating new requirement');
        response = await apiService.createRequirement(requirementData);
      }
      
      console.log('📝 API Response:', response);

            if (response.success) {
              const requirement: Requirement = {
                id: response.requirement?.id || editingRequirement?.id || Date.now().toString(),
                name: newRequirement.name.trim(),
                description: newRequirement.description.trim(),
                isRequired: newRequirement.isRequired,
                dueDate: newRequirement.dueDate,
                completed: editingRequirement?.completed || false,
                fileUrl: newRequirement.fileUrl || editingRequirement?.fileUrl,
                fileName: newRequirement.fileName || editingRequirement?.fileName,
                filePublicId: editingRequirement?.filePublicId,
                uploadedAt: editingRequirement?.uploadedAt,
              };

              // Refresh the interns to get updated requirements
              await fetchInterns();

              // Show success modal
              const studentCount = interns.length;
              const successMsg = editingRequirement 
                ? `Requirement "${newRequirement.name.trim()}" updated successfully!`
                : `Requirement "${newRequirement.name.trim()}" created and assigned to ${studentCount} student${studentCount !== 1 ? 's' : ''}!`;
              setSuccessMessage(successMsg);
              setShowSuccessModal(true);
              
              // Close the requirements modal and reset form
              setShowRequirementsModal(false);
              setNewRequirement({
                name: '',
                description: '',
                isRequired: true,
                dueDate: '',
                fileUrl: '',
                fileName: '',
                schoolYear: selectedSchoolYear, // Reset to current selected school year
              });
              setEditingRequirement(null);
              setSelectedFile(null);
            } else {
              Alert.alert('Error', response.message || 'Failed to save requirement');
            }
    } catch (error) {
      console.error('Error saving requirement:', error);
      Alert.alert('Error', 'Failed to save requirement. Please try again.');
    }
  };


  const handleDeleteRequirement = (requirementId: string) => {
    Alert.alert(
      'Delete Requirement',
      'Are you sure you want to delete this requirement? This will remove it from all interns.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setInterns(prev => prev.map(intern => ({
              ...intern,
              requirements: intern.requirements.filter(req => req.id !== requirementId)
            })));
            
            // Show success notification for deletion
            setSuccessMessage('Requirement deleted successfully!');
            setShowSuccessModal(true);
          }
        }
      ]
    );
  };



  const handleDateChange = (event: any, selectedDate?: Date) => {
    console.log('Date picker event:', event.type, 'Selected date:', selectedDate);
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      console.log('Setting due date to:', formattedDate);
      setNewRequirement(prev => ({
        ...prev,
        dueDate: formattedDate,
      }));
    }
  };

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('File selected:', file);
        setSelectedFile(file);
        
        // Update the requirement with file info (don't set fileUrl yet, wait for upload)
        setNewRequirement(prev => ({
          ...prev,
          fileName: file.name,
          fileUrl: '', // Don't set local URI, wait for Cloudinary upload
        }));
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };


  const handleRemoveFile = () => {
    setSelectedFile(null);
    setNewRequirement(prev => ({
      ...prev,
      fileUrl: '',
      fileName: '',
    }));
  };

  const handleYearSelect = (year: string) => {
    setSelectedSchoolYear(year);
    // If requirement modal is open, update the requirement's school year
    if (showRequirementsModal && !editingRequirement) {
      setNewRequirement(prev => ({ ...prev, schoolYear: year }));
    }
    setShowYearSelector(false);
  };

  const closeYearSelector = () => {
    setShowYearSelector(false);
  };

  const handleAddInternYearSelect = (year: string) => {
    setAddInternSchoolYear(year);
    setShowAddInternYearSelector(false);
  };

  const closeAddInternYearSelector = () => {
    setShowAddInternYearSelector(false);
  };

  // Create Class functionality
  const generateSchoolYearOptions = () => {
    const startYear = 2023;
    const options = [];
    for (let i = 0; i < 6; i++) {
      const year = startYear + i;
      options.push(`${year}-${year + 1}`);
    }
    return options;
  };

  const schoolYearOptions = generateSchoolYearOptions();

  // Generate 6-character random code
  const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setClassCode(code);
    return code;
  };

  const handleOpenCreateClassModal = () => {
    setShowCreateClassModal(true);
    setClassName('');
    setSelectedClassSchoolYear('');
    setClassCode('');
    setShowClassYearDropdown(false);
  };

  const handleCloseCreateClassModal = () => {
    setShowCreateClassModal(false);
    setClassName('');
    setSelectedClassSchoolYear('');
    setClassCode('');
    setShowClassYearDropdown(false);
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      Alert.alert('Error', 'Please enter a class name');
      return;
    }
    if (!selectedClassSchoolYear) {
      Alert.alert('Error', 'Please select a school year');
      return;
    }
    if (!classCode) {
      Alert.alert('Error', 'Please generate a class code');
      return;
    }
    if (!currentUser || !currentUser.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await apiService.createClass(
        className.trim(),
        selectedClassSchoolYear,
        classCode,
        currentUser.id
      );
      
      if (response.success) {
        handleCloseCreateClassModal();
        
        // Show success message with enrollment count if available
        const autoEnrolled = (response as any).autoEnrolled || 0;
        const totalMatching = (response as any).totalMatchingInterns || 0;
        
        let successMsg = 'Class created successfully!';
        if (autoEnrolled > 0) {
          successMsg = `Class created successfully! ${autoEnrolled} intern${autoEnrolled !== 1 ? 's' : ''} automatically enrolled.`;
        } else if (totalMatching === 0) {
          successMsg = 'Class created successfully! No matching interns found for this school year.';
        }
        
        setSuccessMessage(successMsg);
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to create class');
      }
    } catch (error: any) {
      console.error('Error creating class:', error);
      Alert.alert('Error', error.message || 'Failed to create class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCardExpansion = (internId: string) => {
    setExpandedCard(expandedCard === internId ? null : internId);
  };

  const downloadInternsExcel = async () => {
    try {
      // Show loading alert
      Alert.alert('Processing', 'Preparing Excel file...');
      
      // Fetch assigned companies for all interns
      const internsWithCompanies = await Promise.all(
        filteredInterns.map(async (intern) => {
          let assignedCompanies: Company[] = [];
          
          if (intern.userId) {
            try {
              const response = await apiService.getStudentApplications(intern.userId.toString());
              if (response.success && response.applications) {
                const approvedApplications = response.applications.filter(
                  (app: any) => app.status === 'approved'
                );
                assignedCompanies = approvedApplications.map((app: any) => ({
                  id: app.company_id?.toString() || '',
                  company_name: app.company_name || 'Unknown Company',
                  industry: app.industry || 'N/A',
                  company_address: app.company_address || 'N/A',
                  company_profile_picture: app.company_profile_picture,
                  status: app.status || 'approved',
                  application_date: app.created_at || app.submitted_at,
                }));
              }
            } catch (error) {
              console.error(`Error fetching companies for intern ${intern.id}:`, error);
            }
          }
          
          return {
            intern,
            companies: assignedCompanies
          };
        })
      );
      
      // Determine maximum number of companies (limit to 2)
      const maxCompanies = Math.min(
        2,
        Math.max(...internsWithCompanies.map(item => item.companies.length), 0)
      );
      
      // Prepare data for Excel
      const excelData = internsWithCompanies.map((item, index) => {
        const { intern, companies } = item;
        const baseData: any = {
          'No.': index + 1,
          'Student ID': intern.studentId,
          'First Name': intern.firstName,
          'Last Name': intern.lastName,
          'Email': intern.email,
          'Phone Number': intern.phoneNumber,
          'Major': intern.major,
          'University': intern.university,
          'Academic Year': intern.academicYear,
          'School Year': intern.schoolYear,
          'Requirements Progress': getRequirementsProgressText(intern.requirements),
          'Total Requirements': intern.requirements.length,
          'Completed Requirements': intern.requirements.filter(r => r.completed).length,
        };
        
        // Add company columns dynamically (up to maxCompanies)
        for (let i = 0; i < maxCompanies; i++) {
          if (i < companies.length) {
            baseData[`Company ${i + 1}`] = companies[i].company_name;
          } else {
            baseData[`Company ${i + 1}`] = 'N/A';
          }
        }
        
        return baseData;
      });

      // Create a new workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Interns');

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
        link.download = `Interns_List_${selectedSchoolYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'Interns list downloaded successfully!');
      } else {
        // For mobile, you might want to use a file system library
        // For now, we'll show an alert
        Alert.alert('Info', 'Excel download is currently only available on web. Please use the web version to download the list.');
      }
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      Alert.alert('Error', 'Failed to download Excel file. Please try again.');
    }
  };

  // Responsive styles helper
  const getResponsiveStyles = () => {
    const isMobileNow = dimensions.width < 768;
    const isTabletNow = dimensions.width >= 768 && dimensions.width < 1024;
    
    return {
      searchSectionPadding: isMobileNow ? 12 : isTabletNow ? 16 : 20,
      searchSectionMargin: isMobileNow ? 10 : isTabletNow ? 15 : 20,
      searchInputFontSize: isMobileNow ? 14 : isTabletNow ? 15 : 16,
      filterLabelFontSize: isMobileNow ? 14 : isTabletNow ? 15 : 16,
      buttonTextSize: isMobileNow ? 12 : isTabletNow ? 13 : 14,
      buttonIconSize: isMobileNow ? 16 : isTabletNow ? 18 : 20,
      statsPadding: isMobileNow ? 12 : isTabletNow ? 16 : 20,
      statsGap: isMobileNow ? 4 : isTabletNow ? 12 : 16,
      statNumberSize: isMobileNow ? 18 : isTabletNow ? 20 : 24,
      statLabelSize: isMobileNow ? 10 : isTabletNow ? 11 : 12,
      cardPadding: isMobileNow ? 12 : isTabletNow ? 16 : 20,
      cardMargin: isMobileNow ? 10 : isTabletNow ? 12 : 15,
      profileImageSize: isMobileNow ? 50 : isTabletNow ? 55 : 60,
      internNameSize: isMobileNow ? 16 : isTabletNow ? 17 : 18,
      studentIdSize: isMobileNow ? 12 : isTabletNow ? 13 : 14,
      majorSize: isMobileNow ? 12 : isTabletNow ? 13 : 14,
      academicYearSize: isMobileNow ? 10 : isTabletNow ? 11 : 12,
      contactTextSize: isMobileNow ? 12 : isTabletNow ? 13 : 14,
      actionButtonTextSize: isMobileNow ? 11 : isTabletNow ? 12 : 14,
      actionButtonIconSize: isMobileNow ? 14 : isTabletNow ? 15 : 16,
    };
  };

  const responsiveStyles = getResponsiveStyles();

  const fetchInternCompanies = async (intern: Intern): Promise<Company[]> => {
    try {
      const studentUserId = intern.userId;
      
      if (!studentUserId) {
        console.error('❌ No userId found for intern:', intern.id);
        return [];
      }
      
      const response = await apiService.getStudentApplications(studentUserId.toString());
      
      if (response.success && response.applications) {
        const approvedApplications = response.applications.filter(
          (app: any) => app.status === 'approved'
        );
        
        if (approvedApplications.length > 0) {
          return approvedApplications.map((app: any) => ({
            id: app.company_id?.toString() || '',
            company_name: app.company_name || 'Unknown Company',
            industry: app.industry || 'N/A',
            company_address: app.company_address || 'N/A',
            company_profile_picture: app.company_profile_picture,
            status: app.status || 'approved',
            application_date: app.created_at || app.submitted_at,
          }));
        }
      }
      return [];
    } catch (error) {
      console.error('❌ Error fetching assigned companies:', error);
      return [];
    }
  };

  const handleViewAssignedCompany = async (intern: Intern) => {
    // If callback is provided, navigate to the new page
    if (onViewAssignedCompanies) {
      onViewAssignedCompanies(intern);
      return;
    }

    // Otherwise, use the modal (fallback for backward compatibility)
    try {
      setLoadingCompany(true);
      setShowAssignedCompanyModal(true);
      setAssignedCompanies([]);

      const companies = await fetchInternCompanies(intern);
      setAssignedCompanies(companies);
    } catch (error) {
      console.error('❌ Error fetching assigned companies:', error);
      setAssignedCompanies([]);
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleAttendanceHistory = async (intern: Intern) => {
    try {
      setSelectedInternForAttendance(intern);
      const companies = await fetchInternCompanies(intern);
      
      if (companies.length === 0) {
        Alert.alert('No Company', 'This intern has no assigned companies yet.');
        return;
      }
      
      if (companies.length === 1) {
        // If only one company, show attendance directly
        setSelectedCompanyForAttendance(companies[0]);
        await fetchAttendanceRecords(intern, companies[0]);
        setShowAttendanceHistoryModal(true);
      } else {
        // If multiple companies, show selector
        setAssignedCompanies(companies);
        setShowCompanySelectorModal(true);
      }
    } catch (error) {
      console.error('❌ Error handling attendance history:', error);
      Alert.alert('Error', 'Failed to load attendance history. Please try again.');
    }
  };

  const handleSelectCompanyForAttendance = async (company: Company) => {
    if (!selectedInternForAttendance) return;
    
    setSelectedCompanyForAttendance(company);
    setShowCompanySelectorModal(false);
    await fetchAttendanceRecords(selectedInternForAttendance, company);
    setShowAttendanceHistoryModal(true);
  };

  const fetchAttendanceRecords = async (intern: Intern, company: Company) => {
    if (!intern.userId || !company.id) {
      console.error('❌ Missing userId or companyId');
      setAttendanceRecords([]);
      return;
    }

    setLoadingAttendance(true);
    try {
      const response = await apiService.getAttendanceRecords(company.id, intern.userId.toString(), {
        internId: intern.userId.toString(),
      });

      if (response.success && response.data) {
        // Transform the data to match AttendanceRecordEntry interface
        const transformedRecords: AttendanceRecordEntry[] = response.data.map((record: any) => ({
          id: record.id?.toString() || '',
          companyId: company.id,
          companyName: company.company_name,
          date: record.attendance_date || record.date || '',
          status: record.status || 'not_marked',
          amIn: record.am_time_in || record.amIn || '--:--',
          amOut: record.am_time_out || record.amOut || '--:--',
          pmIn: record.pm_time_in || record.pmIn || '--:--',
          pmOut: record.pm_time_out || record.pmOut || '--:--',
          totalHours: record.total_hours || record.totalHours || 0,
          notes: record.notes || null,
          verification_status: record.verification_status || 'pending',
          verified_by: record.verified_by,
          verified_at: record.verified_at,
          verification_remarks: record.verification_remarks,
        }));

        // Sort by date descending (most recent first)
        transformedRecords.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

        setAttendanceRecords(transformedRecords);
      } else {
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('❌ Error fetching attendance records:', error);
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleAttendanceRecordUpdated = async () => {
    if (selectedInternForAttendance && selectedCompanyForAttendance) {
      await fetchAttendanceRecords(selectedInternForAttendance, selectedCompanyForAttendance);
    }
  };

  // Enhanced Progress Bar Component
  const ProgressBar = ({ progress, color = '#F4D03F' }: { progress: number; color?: string }) => {
    const progressAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, [progress]);
    
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill, 
              { 
                backgroundColor: color,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
    );
  };

  // Skeleton Components
  const SkeletonInternCard = () => {
    return (
      <View style={styles.skeletonInternCard}>
        <View style={styles.skeletonInternHeader}>
          <View style={styles.skeletonProfileContainer}>
            <View style={styles.skeletonProfileImage} />
          </View>
          <View style={styles.skeletonInternInfo}>
            <View style={styles.skeletonTextLine} />
            <View style={[styles.skeletonTextLine, { width: '70%' }]} />
            <View style={[styles.skeletonTextLine, { width: '60%' }]} />
            <View style={[styles.skeletonTextLine, { width: '50%' }]} />
          </View>
          <View style={styles.skeletonStatusContainer}>
            <View style={styles.skeletonStatusBadge} />
          </View>
        </View>

        <View style={styles.skeletonInternDetails}>
          <View style={styles.skeletonContactInfo}>
            <View style={styles.skeletonContactItem} />
            <View style={styles.skeletonContactItem} />
          </View>

          <View style={styles.skeletonRequirementsContainer}>
            <View style={styles.skeletonRequirementsHeader}>
              <View style={[styles.skeletonTextLine, { width: '40%' }]} />
              <View style={[styles.skeletonTextLine, { width: '20%' }]} />
            </View>
            <View style={styles.skeletonProgressBar}>
              <View style={styles.skeletonProgressFill} />
            </View>
          </View>
        </View>

        <View style={styles.skeletonActionButtons}>
          <View style={styles.skeletonActionButton} />
          <View style={styles.skeletonActionButton} />
          <View style={styles.skeletonActionButton} />
        </View>
      </View>
    );
  };

  const InternCard = ({ intern }: { intern: Intern }) => {
    const requirementsProgressText = getRequirementsProgressText(intern.requirements);
    const isExpanded = expandedCard === intern.id;
    
    console.log('🖼️ InternCard profile picture:', {
      id: intern.id,
      name: `${intern.firstName} ${intern.lastName}`,
      profilePicture: intern.profilePicture
    });
    
    const isMobileNow = dimensions.width < 768;
    
    return (
      <View style={[
        styles.internCard,
        isExpanded && styles.expandedInternCard,
        {
          padding: responsiveStyles.cardPadding,
          marginBottom: responsiveStyles.cardMargin,
        }
      ]}>
        <TouchableOpacity 
          onPress={() => toggleCardExpansion(intern.id)}
          style={styles.cardTouchable}
        >
          <View style={styles.internHeader}>
            <View style={styles.profileContainer}>
              {intern.profilePicture ? (
                <Image 
                  source={{ uri: intern.profilePicture }} 
                  style={[
                    styles.profileImage,
                    {
                      width: responsiveStyles.profileImageSize,
                      height: responsiveStyles.profileImageSize,
                      borderRadius: responsiveStyles.profileImageSize / 2,
                    }
                  ]}
                  onError={(error) => {
                    console.log('❌ Image load error for intern:', intern.id, error.nativeEvent.error);
                  }}
                  onLoad={() => {
                    console.log('✅ Image loaded successfully for intern:', intern.id);
                  }}
                />
              ) : (
                <View style={[
                  styles.profilePlaceholder,
                  {
                    width: responsiveStyles.profileImageSize,
                    height: responsiveStyles.profileImageSize,
                    borderRadius: responsiveStyles.profileImageSize / 2,
                  }
                ]}>
                  <Text style={[
                    styles.profileText,
                    { fontSize: isMobileNow ? 18 : isTablet ? 20 : 24 }
                  ]}>
                    {intern.firstName.charAt(0)}{intern.lastName.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.internInfo}>
              <Text style={[styles.internName, { fontSize: responsiveStyles.internNameSize }]}>
                {intern.firstName} {intern.lastName}
              </Text>
              <Text style={[styles.studentId, { fontSize: responsiveStyles.studentIdSize }]}>
                {intern.studentId}
              </Text>
              <Text style={[styles.major, { fontSize: responsiveStyles.majorSize }]}>
                {intern.major}
              </Text>
              <Text style={[styles.academicYear, { fontSize: responsiveStyles.academicYearSize }]}>
                {intern.academicYear}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(intern.status) }]}>
                <Text style={[
                  styles.statusText,
                  { fontSize: isMobileNow ? 8 : isTablet ? 9 : 10 }
                ]}>
                  {getStatusText(intern.status)}
                </Text>
              </View>
              <MaterialIcons 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={isMobileNow ? 20 : isTablet ? 22 : 24} 
                color="#F56E0F" 
                style={styles.expandIcon}
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.internDetails}>
              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <MaterialIcons 
                    name="email" 
                    size={isMobileNow ? 14 : isTablet ? 15 : 16} 
                    color="#F56E0F" 
                  />
                  <Text style={[styles.contactText, { fontSize: responsiveStyles.contactTextSize }]}>
                    {intern.email}
                  </Text>
                </View>
                <View style={styles.contactItem}>
                  <MaterialIcons 
                    name="phone" 
                    size={isMobileNow ? 14 : isTablet ? 15 : 16} 
                    color="#F56E0F" 
                  />
                  <Text style={[styles.contactText, { fontSize: responsiveStyles.contactTextSize }]}>
                    {intern.phoneNumber}
                  </Text>
                </View>
              </View>

              <View style={styles.requirementsContainer}>
                <Text style={[
                  styles.requirementsLabel,
                  { fontSize: isMobileNow ? 11 : isTablet ? 11.5 : 12 }
                ]}>
                  Requirements Progress: {requirementsProgressText}
                </Text>
              </View>
            </View>
            {intern.internshipCompany && (
              <View style={styles.internshipInfo}>
                <Text style={[
                  styles.internshipLabel,
                  { fontSize: isMobileNow ? 11 : isTablet ? 11.5 : 12 }
                ]}>
                  Current Internship:
                </Text>
                <Text style={[
                  styles.internshipCompany,
                  { fontSize: isMobileNow ? 12 : isTablet ? 13 : 14 }
                ]}>
                  {intern.internshipCompany}
                </Text>
                <Text style={[
                  styles.internshipDates,
                  { fontSize: isMobileNow ? 10 : isTablet ? 11 : 12 }
                ]}>
                  {intern.internshipStartDate} - {intern.internshipEndDate}
                </Text>
              </View>
            )}

            <View style={[
              styles.expandedActionButtons,
              isMobileNow && { flexDirection: 'column', gap: 8 }
            ]}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => handleViewDetails(intern)}
              >
                <MaterialIcons 
                  name="visibility" 
                  size={responsiveStyles.actionButtonIconSize} 
                  color="#fff" 
                />
                <Text style={[
                  styles.actionButtonText,
                  { fontSize: responsiveStyles.actionButtonTextSize }
                ]}>
                  {isMobileNow ? 'Details' : 'View Details'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.requirementsButton]} 
                onPress={() => handleRequirements(intern)}
              >
                <MaterialIcons 
                  name="assignment" 
                  size={responsiveStyles.actionButtonIconSize} 
                  color="#fff" 
                />
                <Text style={[
                  styles.actionButtonText,
                  { fontSize: responsiveStyles.actionButtonTextSize }
                ]}>
                  {isMobileNow ? 'Reqs' : 'Requirements'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.companyButton]} 
                onPress={() => handleViewAssignedCompany(intern)}
              >
                <MaterialIcons 
                  name="business" 
                  size={responsiveStyles.actionButtonIconSize} 
                  color="#fff" 
                />
                <Text style={[
                  styles.actionButtonText,
                  { fontSize: responsiveStyles.actionButtonTextSize }
                ]}>
                  {isMobileNow ? 'Company' : 'Assigned Company'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.attendanceButton]} 
                onPress={() => handleAttendanceHistory(intern)}
              >
                <MaterialIcons 
                  name="history" 
                  size={responsiveStyles.actionButtonIconSize} 
                  color="#fff" 
                />
                <Text style={[
                  styles.actionButtonText,
                  { fontSize: responsiveStyles.actionButtonTextSize }
                ]}>
                  {isMobileNow ? 'Attendance' : 'Attendance History'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]} 
                onPress={() => handleDeleteIntern(intern)}
              >
                <MaterialIcons 
                  name="delete" 
                  size={responsiveStyles.actionButtonIconSize} 
                  color="#fff" 
                />
                <Text style={[
                  styles.actionButtonText,
                  { fontSize: responsiveStyles.actionButtonTextSize }
                ]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const RequirementItem = ({ 
    requirement
  }: { 
    requirement: Requirement; 
  }) => {
    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'approved': return '#34a853';
        case 'rejected': return '#ea4335';
        case 'needs_revision': return '#fbbc04';
        case 'submitted': return '#4285f4';
        default: return '#666';
      }
    };

    const getStatusText = (status?: string) => {
      switch (status) {
        case 'approved': return 'Approved';
        case 'rejected': return 'Rejected';
        case 'needs_revision': return 'Needs Revision';
        case 'submitted': return 'Submitted';
        default: return 'Not Submitted';
      }
    };

    return (
      <View style={styles.requirementItem}>
        <View style={styles.requirementMain}>
          <View style={styles.requirementInfo}>
            <MaterialIcons 
              name={requirement.completed ? "check-circle" : "radio-button-unchecked"} 
              size={24} 
              color={requirement.completed ? "#34a853" : "#666"} 
            />
            <View style={styles.requirementTextContainer}>
              <Text style={styles.requirementLabel}>
                {requirement.name}
              </Text>
              {requirement.description && (
                <Text style={styles.requirementDescription}>
                  {requirement.description}
                </Text>
              )}
              {requirement.dueDate && (
                <Text style={styles.requirementDueDate}>
                  Due: {new Date(requirement.dueDate).toLocaleDateString()}
                </Text>
              )}
              
              {/* Submission Status */}
              {requirement.submissionStatus && (
                <View style={styles.submissionStatusContainer}>
                  <View style={[styles.submissionStatusBadge, { backgroundColor: getStatusColor(requirement.submissionStatus) }]}>
                    <Text style={styles.submissionStatusText}>{getStatusText(requirement.submissionStatus)}</Text>
                  </View>
                  {requirement.submittedAt && (
                    <Text style={styles.submittedAtText}>
                      Submitted: {new Date(requirement.submittedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}
              
              {/* Coordinator Feedback */}
              {requirement.coordinatorFeedback && (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackLabel}>Feedback:</Text>
                  <Text style={styles.feedbackText}>{requirement.coordinatorFeedback}</Text>
                </View>
              )}
              
              {requirement.fileUrl && (
                <Text style={styles.requirementFileStatus}>
                  📎 File uploaded
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  console.log('🔍 InternsPage render - loading state:', loading, 'filteredInterns length:', filteredInterns.length);

  return (
    <View style={styles.container}>
      {/* Search and Filter Section */}
      <View style={[
        styles.searchSection,
        {
          padding: responsiveStyles.searchSectionPadding,
          marginBottom: responsiveStyles.searchSectionMargin,
          marginHorizontal: dimensions.width < 768 ? 10 : 20,
        }
      ]}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons 
              name="search" 
              size={dimensions.width < 768 ? 18 : dimensions.width < 1024 ? 19 : 20} 
              color="#F56E0F" 
              style={styles.searchIcon} 
            />
            <TextInput
              style={[styles.searchInput, { fontSize: responsiveStyles.searchInputFontSize }]}
              placeholder="Search interns..."
              placeholderTextColor="#878787"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        
        <View style={[
          styles.filterContainer,
          dimensions.width < 768 && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }
        ]}>
          <View style={[
            dimensions.width < 768 && { flexDirection: 'row', alignItems: 'center', width: '100%' }
          ]}>
            <Text style={[styles.filterLabel, { fontSize: responsiveStyles.filterLabelFontSize }]}>
              School Year: 
            </Text>
            <TouchableOpacity 
              style={styles.yearSelector}
              onPress={() => setShowYearSelector(true)}
            >
              <Text style={[styles.yearText, { fontSize: dimensions.width < 768 ? 12 : 14 }]}>
                {selectedSchoolYear}
              </Text>
              <MaterialIcons 
                name="arrow-drop-down" 
                size={dimensions.width < 768 ? 18 : 20} 
                color="#F56E0F" 
              />
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.buttonContainer,
            dimensions.width < 768 && { flexDirection: 'column', width: '100%', gap: 8 }
          ]}>
            <TouchableOpacity 
              style={[styles.addButton, styles.createClassButton]}
              onPress={handleOpenCreateClassModal}
            >
              <MaterialIcons 
                name="class" 
                size={responsiveStyles.buttonIconSize} 
                color="#fff" 
              />
              <Text style={[styles.addButtonText, { fontSize: responsiveStyles.buttonTextSize }]}>
                {dimensions.width < 768 ? 'Create Class' : 'Create Class'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.addButton, styles.requirementsButton]}
              onPress={handleAddRequirement}
            >
              <MaterialIcons 
                name="assignment" 
                size={responsiveStyles.buttonIconSize} 
                color="#fff" 
              />
              <Text style={[styles.addButtonText, { fontSize: responsiveStyles.buttonTextSize }]}>
                {dimensions.width < 768 ? 'Add Req.' : 'Add Requirements'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.addButton, styles.internButton]}
              onPress={() => setShowAddInternModal(true)}
            >
              <MaterialIcons 
                name="add" 
                size={responsiveStyles.buttonIconSize} 
                color="#fff" 
              />
              <Text style={[styles.addButtonText, { fontSize: responsiveStyles.buttonTextSize }]}>
                Add Intern
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.addButton, styles.downloadButton]}
              onPress={downloadInternsExcel}
            >
              <MaterialIcons 
                name="download" 
                size={responsiveStyles.buttonIconSize} 
                color="#fff" 
              />
              <Text style={[styles.addButtonText, { fontSize: responsiveStyles.buttonTextSize }]}>
                {dimensions.width < 768 ? 'Excel' : 'Download Excel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={[
        styles.statsContainer,
        {
          paddingHorizontal: dimensions.width < 768 ? 10 : 20,
          marginBottom: dimensions.width < 768 ? 15 : 20,
          gap: responsiveStyles.statsGap,
          flexWrap: dimensions.width < 768 ? 'wrap' : 'nowrap',
          justifyContent: dimensions.width < 768 ? 'space-between' : 'flex-start',
          width: '100%',
          alignSelf: 'stretch',
        }
      ]}>
        {loading ? (
          // Show skeleton stats
          (() => {
            console.log('📊 Showing skeleton stats, loading state:', loading);
            return Array.from({ length: 2 }).map((_, index) => (
              <View 
                key={`skeleton-stat-${index}`} 
                style={[
                  styles.skeletonStatItem,
                  dimensions.width < 768 
                    ? { 
                        flex: 0,
                        flexBasis: '48%',
                        width: '48%',
                        maxWidth: '48%',
                        padding: 24,
                        minHeight: 120,
                      }
                    : { flex: 1 }
                ]}
              >
                <View style={styles.skeletonStatNumber} />
                <View style={styles.skeletonStatLabel} />
              </View>
            ));
          })()
        ) : (
          <>
            <View style={[
              styles.statItem,
              dimensions.width < 768 
                ? { 
                    flex: 0,
                    flexBasis: '48%',
                    width: '48%',
                    maxWidth: '48%',
                    padding: 24,
                    minHeight: 120,
                    justifyContent: 'center',
                  }
                : { flex: 1 }
            ]}>
              <Text style={[styles.statNumber, { fontSize: responsiveStyles.statNumberSize }]}>
                {filteredInterns.length}
              </Text>
              <Text style={[styles.statLabel, { fontSize: responsiveStyles.statLabelSize }]}>
                Total Interns
              </Text>
            </View>
            <View style={[
              styles.statItem,
              dimensions.width < 768 
                ? { 
                    flex: 0,
                    flexBasis: '48%',
                    width: '48%',
                    maxWidth: '48%',
                    padding: 24,
                    minHeight: 120,
                    justifyContent: 'center',
                  }
                : { flex: 1 }
            ]}>
              <Text style={[
                styles.statNumber, 
                { color: '#34a853', fontSize: responsiveStyles.statNumberSize }
              ]}>
                {filteredInterns.filter(i => i.status === 'active').length}
              </Text>
              <Text style={[styles.statLabel, { fontSize: responsiveStyles.statLabelSize }]}>
                Active
              </Text>
            </View>
          </>
        )}
      </View>

      {/* My Classes Section */}
      <View style={[
        styles.classesSection,
        { paddingHorizontal: dimensions.width < 768 ? 10 : 20 }
      ]}>
        <View style={styles.classesSectionHeader}>
          <Text style={[
            styles.classesSectionTitle,
            { fontSize: dimensions.width < 768 ? 18 : 20 }
          ]}>
            My Classes
          </Text>
          <Text style={styles.classesSectionSubtitle}>
            {loadingClasses ? 'Loading...' : `${classes.length} class${classes.length !== 1 ? 'es' : ''} created`}
          </Text>
        </View>

        {loadingClasses ? (
          <View style={styles.classesGrid}>
            {Array.from({ length: 2 }).map((_, index) => (
              <View key={`skeleton-class-${index}`} style={styles.skeletonClassCard} />
            ))}
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.emptyClassesContainer}>
            <MaterialIcons name="class" size={48} color="#878787" />
            <Text style={styles.emptyClassesText}>No classes created yet</Text>
            <Text style={styles.emptyClassesSubtext}>
              Click "Create Class" to create your first class
            </Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={[
              styles.classesScrollView,
              { marginHorizontal: dimensions.width < 768 ? -10 : 0 }
            ]}
            contentContainerStyle={[
              styles.classesGrid,
              { paddingHorizontal: dimensions.width < 768 ? 10 : 0 }
            ]}
          >
            {classes.map((classItem) => (
              <View key={classItem.id} style={styles.classCard}>
                <View style={styles.classCardHeader}>
                  <MaterialIcons name="class" size={24} color="#F56E0F" />
                  <Text style={styles.classCardName} numberOfLines={2}>
                    {classItem.className}
                  </Text>
                </View>
                
                <View style={styles.classCardBody}>
                  <View style={styles.classCardInfoRow}>
                    <MaterialIcons name="calendar-today" size={16} color="#878787" />
                    <Text style={styles.classCardInfoText}>{classItem.schoolYear}</Text>
                  </View>
                  
                  <View style={styles.classCardCodeRow}>
                    <View style={styles.classCardCodeContainer}>
                      <Text style={styles.classCardCodeLabel}>Class Code:</Text>
                      <Text style={styles.classCardCode}>{classItem.classCode}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyCodeButton}
                      onPress={() => copyClassCode(classItem.classCode)}
                    >
                      <MaterialIcons name="content-copy" size={18} color="#F56E0F" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.classCardInfoRow}>
                    <MaterialIcons name="people" size={16} color="#34a853" />
                    <Text style={styles.classCardStudentCount}>
                      {classItem.studentCount} student{classItem.studentCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Interns List */}
      <ScrollView 
        style={[
          styles.internsList,
          { padding: dimensions.width < 768 ? 10 : 20 }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          // Show skeleton loading
          (() => {
            console.log('🔄 Showing skeleton loading, loading state:', loading);
            return Array.from({ length: 3 }).map((_, index) => (
              <SkeletonInternCard key={`skeleton-${index}`} />
            ));
          })()
        ) : filteredInterns.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="school" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No interns found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : `No interns found for ${selectedSchoolYear}`
              }
            </Text>
          </View>
        ) : (
          filteredInterns.map((intern) => (
            <InternCard key={intern.id} intern={intern} />
          ))
        )}
      </ScrollView>

      {/* Requirements Modal */}
      <Modal
        visible={showRequirements}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequirements(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Requirements - {selectedIntern?.firstName} {selectedIntern?.lastName}
              </Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={refreshInternRequirements}
                >
                  <MaterialIcons name="refresh" size={20} color="#4285f4" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowRequirements(false)}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>


            <ScrollView style={styles.requirementsList}>
              {selectedIntern && selectedIntern.requirements
                .filter(requirement => 
                  requirement.submissionStatus === 'approved'
                )
                .map((requirement) => (
                        <RequirementItem
                          key={requirement.id}
                  requirement={requirement}
                        />
                      ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Intern Modal */}
      <Modal
        visible={showAddInternModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAddInternModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Intern</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={closeAddInternModal}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addInternForm}>
              <Text style={styles.formLabel}>Search Student</Text>
              <Text style={styles.formSubLabel}>Enter either email or student ID to search</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="student@university.edu"
                  value={addInternEmail}
                  onChangeText={setAddInternEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Student ID (Format: xxxx-xxxx)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="1234-5678"
                  value={addInternStudentId}
                  onChangeText={setAddInternStudentId}
                  maxLength={9}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>School Year</Text>
                <TouchableOpacity
                  style={styles.pickerContainer}
                  onPress={() => setShowAddInternYearSelector(true)}
                >
                  <Text style={styles.pickerText}>{addInternSchoolYear}</Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {searchError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{searchError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.searchButton, searchingStudent && styles.disabledButton]}
                onPress={searchStudent}
                disabled={searchingStudent}
              >
                {searchingStudent ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="search" size={20} color="#fff" />
                )}
                <Text style={styles.searchButtonText}>
                  {searchingStudent ? 'Searching...' : 'Search Student'}
                </Text>
              </TouchableOpacity>

              {studentFound && (
                <View style={styles.studentFoundContainer}>
                  <Text style={styles.studentFoundTitle}>Student Found:</Text>
                  
                  <View style={styles.studentFoundProfile}>
                    <View style={styles.studentFoundProfileContainer}>
                      {studentFound.profile_picture || studentFound.profilePicture ? (
                        <Image 
                          source={{ uri: studentFound.profile_picture || studentFound.profilePicture }} 
                          style={styles.studentFoundProfileImage}
                          onError={(error) => {
                            console.log('❌ Student found profile image error:', error.nativeEvent.error);
                          }}
                          onLoad={() => {
                            console.log('✅ Student found profile image loaded');
                          }}
                        />
                      ) : (
                        <View style={styles.studentFoundProfilePlaceholder}>
                          <Text style={styles.studentFoundProfileText}>
                            {studentFound.first_name.charAt(0)}{studentFound.last_name.charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>
                        {studentFound.first_name} {studentFound.last_name}
                      </Text>
                      <Text style={styles.studentDetails}>
                        ID: {studentFound.id_number} | {studentFound.major}
                      </Text>
                      <Text style={styles.studentDetails}>
                        Email: {studentFound.email}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.addButton, styles.internButton]}
                    onPress={addStudentAsIntern}
                  >
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Add as Intern</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Requirements Management Modal */}
      <Modal
        visible={showRequirementsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequirementsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
              </Text>
              {!editingRequirement && (
                <Text style={styles.requirementScopeText}>
                  Will be assigned to Class {newRequirement.schoolYear} - {interns.filter(i => i.schoolYear === newRequirement.schoolYear).length} student{interns.filter(i => i.schoolYear === newRequirement.schoolYear).length !== 1 ? 's' : ''}
                </Text>
              )}
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowRequirementsModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.requirementForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Requirement Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Portfolio Submission"
                  value={newRequirement.name}
                  onChangeText={(text) => setNewRequirement(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe what this requirement entails..."
                  value={newRequirement.description}
                  onChangeText={(text) => setNewRequirement(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {!editingRequirement && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Class (School Year) *</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowYearSelector(true)}
                  >
                    <Text style={styles.datePickerText}>
                      {newRequirement.schoolYear || 'Select school year'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <Text style={styles.debugText}>Debug: showDatePicker = {showDatePicker.toString()}</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => {
                    console.log('Date picker button pressed, current showDatePicker:', showDatePicker);
                    setShowDatePicker(true);
                    console.log('Date picker state set to true');
                  }}
                >
                  <Text style={[
                    styles.datePickerText,
                    !newRequirement.dueDate && styles.placeholderText
                  ]}>
                    {newRequirement.dueDate 
                      ? new Date(newRequirement.dueDate).toLocaleDateString()
                      : 'Select due date'
                    }
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setNewRequirement(prev => ({ ...prev, isRequired: !prev.isRequired }))}
                >
                  <MaterialIcons
                    name={newRequirement.isRequired ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color={newRequirement.isRequired ? "#4285f4" : "#666"}
                  />
                  <Text style={styles.checkboxLabel}>Required for all interns</Text>
                </TouchableOpacity>
              </View>

              {/* File Upload Section */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Attach PDF File</Text>
                
                {!selectedFile ? (
                  <TouchableOpacity
                    style={styles.filePickerButton}
                    onPress={handleFilePicker}
                  >
                    <MaterialIcons name="attach-file" size={20} color="#4285f4" />
                    <Text style={styles.filePickerText}>Select PDF File</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.fileSelectedContainer}>
                    <View style={styles.fileInfo}>
                      <MaterialIcons name="description" size={20} color="#4285f4" />
                      <Text style={styles.fileName}>{selectedFile.name}</Text>
                    </View>
                    <View style={styles.fileActions}>
                      <TouchableOpacity
                        style={styles.removeFileButton}
                        onPress={handleRemoveFile}
                      >
                        <MaterialIcons name="close" size={16} color="#ea4335" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {newRequirement.fileUrl && (
                  <View style={styles.uploadedFileContainer}>
                    <MaterialIcons name="check-circle" size={16} color="#34a853" />
                    <Text style={styles.uploadedFileText}>File will be uploaded with requirement</Text>
                  </View>
                )}
              </View>


              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.saveButton, styles.primaryButton, uploadingFile && styles.disabledButton]}
                  onPress={handleSaveRequirement}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="save" size={20} color="#fff" />
                  )}
                  <Text style={styles.saveButtonText}>
                    {uploadingFile 
                      ? 'Uploading & Adding...' 
                      : editingRequirement 
                        ? 'Update' 
                        : 'Add'
                    } Requirement
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, styles.secondaryButton]}
                  onPress={() => setShowRequirementsModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Date Picker Overlay */}
        {showDatePicker && (
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerModal}>
              <Text style={styles.datePickerLabel}>Select Due Date:</Text>
              <Text style={styles.debugText}>Date picker is visible! Platform: {Platform.OS}</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={newRequirement.dueDate || ''}
                  onChange={(e) => {
                    console.log('Web date input changed:', e.target.value);
                    setNewRequirement(prev => ({
                      ...prev,
                      dueDate: e.target.value || '',
                    }));
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    padding: '10px',
                    fontSize: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    width: '100%',
                    marginBottom: '10px'
                  }}
                />
              ) : DateTimePicker ? (
                <DateTimePicker
                  value={newRequirement.dueDate ? new Date(newRequirement.dueDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  style={styles.datePicker}
                />
              ) : (
                <Text style={styles.datePickerErrorText}>
                  Date picker not available on this platform
                </Text>
              )}
              <View style={styles.datePickerButtonRow}>
                <TouchableOpacity
                  style={styles.datePickerCloseButton}
                  onPress={() => {
                    console.log('Date picker close button pressed');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerCloseText}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePickerCancelButton}
                  onPress={() => {
                    console.log('Date picker cancel button pressed');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Intern Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Intern Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedInternDetails && (
              <ScrollView style={styles.detailsContent}>
                {/* Profile Image Section */}
                <View style={styles.profileImageSection}>
                  <View style={styles.profileImageContainer}>
                    {selectedInternDetails.profilePicture ? (
                      <Image 
                        source={{ uri: selectedInternDetails.profilePicture }} 
                        style={styles.detailsProfileImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('❌ Details modal image load error:', error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('✅ Details modal image loaded successfully');
                        }}
                      />
                    ) : (
                      <View style={styles.detailsProfileImagePlaceholder}>
                        <MaterialIcons name="person" size={80} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.profileName}>
                    {selectedInternDetails.firstName} {selectedInternDetails.lastName}
                  </Text>
                  <Text style={styles.profileTitle}>Student Intern</Text>
                  <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { 
                      backgroundColor: selectedInternDetails.status === 'active' ? '#4CAF50' : 
                                     selectedInternDetails.status === 'graduated' ? '#2196F3' : '#FF9800' 
                    }]} />
                    <Text style={styles.statusText}>{getStatusText(selectedInternDetails.status)}</Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>👤 Personal Information</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Name:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.firstName} {selectedInternDetails.lastName}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Student ID:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.studentId}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Email:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.email}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Phone:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.phoneNumber || 'Not provided'}</Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>🎓 Academic Information</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Major:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.major || 'Not provided'}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>University:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.university || 'Not provided'}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>GPA:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.gpa || 'Not provided'}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Academic Year:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.academicYear || 'Not provided'}</Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>📊 Internship Status</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Status:</Text>
                    <Text style={styles.detailsValue}>{getStatusText(selectedInternDetails.status)}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>School Year:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.schoolYear || 'Not provided'}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Requirements Progress:</Text>
                    <Text style={styles.detailsValue}>
                      {getRequirementsProgressText(selectedInternDetails.requirements)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>🏢 Internship Details</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Company:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.internshipCompany || 'No company assigned'}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Start Date:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.internshipStartDate || 'Start date not set'}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>End Date:</Text>
                    <Text style={styles.detailsValue}>{selectedInternDetails.internshipEndDate || 'End date not set'}</Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>📋 Requirements</Text>
                  {selectedInternDetails.requirements.map((req, index) => (
                    <View key={index} style={styles.requirementRow}>
                      <Text style={styles.requirementName}>• {req.name}</Text>
                      <Text style={[styles.requirementStatus, { color: req.completed ? '#4CAF50' : '#FF9800' }]}>
                        {req.completed ? '✅ Completed' : '⏳ Pending'}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Year Selector Modal */}
      <Modal
        visible={showYearSelector}
        animationType="fade"
        transparent={true}
        onRequestClose={closeYearSelector}
      >
        <View style={styles.yearModalOverlay}>
          <View style={styles.yearModalContent}>
            <View style={styles.yearModalHeader}>
              <Text style={styles.yearModalTitle}>Select School Year</Text>
              <TouchableOpacity onPress={closeYearSelector}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.yearModalBody}>
              {schoolYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearOption,
                    selectedSchoolYear === year && styles.yearOptionSelected
                  ]}
                  onPress={() => handleYearSelect(year)}
                >
                  <Text style={[
                    styles.yearOptionText,
                    selectedSchoolYear === year && styles.yearOptionTextSelected
                  ]}>
                    {year}
                  </Text>
                  {selectedSchoolYear === year && (
                    <MaterialIcons name="check" size={20} color="#1E3A5F" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Intern Year Selector Modal */}
      <Modal
        visible={showAddInternYearSelector}
        animationType="fade"
        transparent={true}
        onRequestClose={closeAddInternYearSelector}
      >
        <View style={styles.yearModalOverlay}>
          <View style={styles.yearModalContent}>
            <View style={styles.yearModalHeader}>
              <Text style={styles.yearModalTitle}>Select School Year</Text>
              <TouchableOpacity onPress={closeAddInternYearSelector}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.yearModalBody}>
              {schoolYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearOption,
                    addInternSchoolYear === year && styles.yearOptionSelected
                  ]}
                  onPress={() => handleAddInternYearSelect(year)}
                >
                  <Text style={[
                    styles.yearOptionText,
                    addInternSchoolYear === year && styles.yearOptionTextSelected
                  ]}>
                    {year}
                  </Text>
                  {addInternSchoolYear === year && (
                    <MaterialIcons name="check" size={20} color="#1E3A5F" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelDeleteIntern}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <MaterialIcons name="warning" size={32} color="#F44336" />
              <Text style={styles.deleteModalTitle}>Delete Intern</Text>
            </View>
            
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete {internToDelete ? `${internToDelete.firstName} ${internToDelete.lastName}` : 'this intern'}? This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalCancelButton]}
                onPress={cancelDeleteIntern}
                disabled={deletingIntern}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalConfirmButton]}
                onPress={confirmDeleteIntern}
                disabled={deletingIntern}
              >
                {deletingIntern ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="delete" size={20} color="#fff" />
                    <Text style={styles.deleteModalConfirmText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Class Modal */}
      <Modal
        visible={showCreateClassModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseCreateClassModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createClassModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Class</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={handleCloseCreateClassModal}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Class Name Input */}
              <View style={styles.formGroup}>
                <Text style={styles.createClassFormLabel}>Class Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter class name"
                  placeholderTextColor="#999"
                  value={className}
                  onChangeText={setClassName}
                />
              </View>

              {/* School Year Dropdown */}
              <View style={styles.formGroup}>
                <Text style={styles.createClassFormLabel}>School Year</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowClassYearDropdown(!showClassYearDropdown)}
                >
                  <Text style={[styles.dropdownButtonText, !selectedClassSchoolYear && styles.dropdownPlaceholder]}>
                    {selectedClassSchoolYear || 'Select school year'}
                  </Text>
                  <MaterialIcons 
                    name={showClassYearDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color="#F56E0F" 
                  />
                </TouchableOpacity>
                
                {showClassYearDropdown && (
                  <View style={styles.dropdownList}>
                    {schoolYearOptions.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.dropdownItem,
                          selectedClassSchoolYear === year && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setSelectedClassSchoolYear(year);
                          setShowClassYearDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedClassSchoolYear === year && styles.dropdownItemTextSelected
                        ]}>
                          {year}
                        </Text>
                        {selectedClassSchoolYear === year && (
                          <MaterialIcons name="check" size={20} color="#F56E0F" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Class Code */}
              <View style={styles.formGroup}>
                <Text style={styles.createClassFormLabel}>Class Code</Text>
                <View style={styles.codeContainer}>
                  <View style={styles.codeDisplay}>
                    <Text style={styles.codeText}>{classCode || '------'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.generateCodeButton}
                    onPress={generateClassCode}
                  >
                    <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.generateCodeButtonText}>Generate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.createClassCancelButton]}
                onPress={handleCloseCreateClassModal}
              >
                <Text style={styles.createClassCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateClass}
              >
                <Text style={styles.createButtonText}>Create Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attendance History Modal */}
      {selectedInternForAttendance && selectedCompanyForAttendance && (
        <AttendanceHistoryPanel
          visible={showAttendanceHistoryModal}
          onClose={() => {
            setShowAttendanceHistoryModal(false);
            setSelectedInternForAttendance(null);
            setSelectedCompanyForAttendance(null);
            setAttendanceRecords([]);
          }}
          companyName={selectedCompanyForAttendance.company_name}
          companyId={selectedCompanyForAttendance.id}
          userId={selectedInternForAttendance.userId || selectedInternForAttendance.id}
          records={attendanceRecords}
          loading={loadingAttendance}
          onRecordUpdated={handleAttendanceRecordUpdated}
        />
      )}

      {/* Company Selector Modal for Attendance */}
      <Modal
        visible={showCompanySelectorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompanySelectorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Company</Text>
              <Text style={styles.requirementScopeText}>
                Choose a company to view attendance history
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowCompanySelectorModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.companyModalContent} showsVerticalScrollIndicator={true}>
              {assignedCompanies.length > 0 ? (
                assignedCompanies.map((company, index) => (
                  <TouchableOpacity
                    key={company.id || index}
                    style={styles.companySelectorItem}
                    onPress={() => handleSelectCompanyForAttendance(company)}
                  >
                    <View style={styles.companySelectorItemContent}>
                      {company.company_profile_picture ? (
                        <Image 
                          source={{ uri: company.company_profile_picture }} 
                          style={styles.companySelectorImage}
                        />
                      ) : (
                        <View style={styles.companySelectorImagePlaceholder}>
                          <MaterialIcons name="business" size={24} color="#F56E0F" />
                        </View>
                      )}
                      <View style={styles.companySelectorInfo}>
                        <Text style={styles.companySelectorName}>{company.company_name}</Text>
                        <Text style={styles.companySelectorIndustry}>{company.industry}</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color="#F56E0F" />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCompanyContainer}>
                  <MaterialIcons name="business" size={64} color="#ccc" />
                  <Text style={styles.emptyCompanyTitle}>No Company Assigned</Text>
                  <Text style={styles.emptyCompanyText}>
                    This student has not been assigned to any company yet.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Assigned Company Modal */}
      <Modal
        visible={showAssignedCompanyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignedCompanyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assigned Companies ({assignedCompanies.length})
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowAssignedCompanyModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.companyModalContent} showsVerticalScrollIndicator={true}>
              {loadingCompany ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#F56E0F" />
                  <Text style={styles.loadingText}>Loading company information...</Text>
                </View>
              ) : assignedCompanies.length > 0 ? (
                <View style={styles.tableContainer}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <View style={[styles.tableHeaderCell, styles.tableCellNo]}>
                      <Text style={styles.tableHeaderText}>#</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.tableCellCompany]}>
                      <Text style={styles.tableHeaderText}>Company Name</Text>
                    </View>
                    <View style={[styles.tableHeaderCell, styles.tableCellIndustry, styles.tableCellLast]}>
                      <Text style={styles.tableHeaderText}>INDU</Text>
                    </View>
                  </View>

                  {/* Table Rows */}
                  {assignedCompanies.map((company, index) => (
                    <View key={company.id || index} style={styles.tableRow}>
                      <View style={[styles.tableCell, styles.tableCellNo]}>
                        <Text style={styles.tableCellText}>{index + 1}</Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellCompany]}>
                        <View style={styles.companyNameCell}>
                          {company.company_profile_picture ? (
                            <Image 
                              source={{ uri: company.company_profile_picture }} 
                              style={styles.tableCompanyImage}
                            />
                          ) : (
                            <View style={styles.tableCompanyImagePlaceholder}>
                              <MaterialIcons name="business" size={16} color="#F56E0F" />
                            </View>
                          )}
                          <Text style={styles.tableCellText} numberOfLines={2}>
                            {company.company_name}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellIndustry, styles.tableCellLast]}>
                        <Text style={styles.tableCellText} numberOfLines={2}>
                          {company.industry}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCompanyContainer}>
                  <MaterialIcons name="business" size={64} color="#ccc" />
                  <Text style={styles.emptyCompanyTitle}>No Company Assigned</Text>
                  <Text style={styles.emptyCompanyText}>
                    This student has not been assigned to any company yet.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(255, 255, 255);', // Dark background
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
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  searchSection: {
    backgroundColor: '#2A2A2E', // Dark secondary background
    padding: 20,
    marginBottom: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E', // Dark input background
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  searchIcon: {
    marginRight: 10,
    color: '#F56E0F', // Primary orange
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FBFBFB', // Light text
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  filterLabel: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E', // Dark input background
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  yearText: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    marginRight: 4,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 4,
  },
  statLabel: {
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    fontWeight: '600',
  },
  internsList: {
    flex: 1,
  },
  internCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    overflow: 'hidden',
  },
  expandedInternCard: {
    elevation: 8,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  cardTouchable: {
    padding: 20,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandIcon: {
    marginLeft: 8,
  },
  expandedActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
  },
  internHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  profileContainer: {
    marginRight: 15,
  },
  profileImage: {
    // Size is set dynamically based on screen size
  },
  detailsProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePlaceholder: {
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
    // Size is set dynamically based on screen size
  },
  profileText: {
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  internInfo: {
    flex: 1,
  },
  internName: {
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 6,
  },
  studentId: {
    color: '#F56E0F', // Primary orange
    marginBottom: 4,
    fontWeight: '500',
  },
  major: {
    color: '#FBFBFB', // Light text
    marginBottom: 4,
    opacity: 0.9,
  },
  academicYear: {
    color: '#FBFBFB', // Light text
    opacity: 0.8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  internDetails: {
    marginBottom: 15,
  },
  contactInfo: {
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    color: '#FBFBFB', // Light text
    marginLeft: 8,
    opacity: 0.9,
  },
  internshipInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  internshipLabel: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    marginBottom: 4,
    opacity: 0.8,
  },
  internshipCompany: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F56E0F', // Primary orange
    marginBottom: 2,
  },
  internshipDates: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    opacity: 0.8,
  },
  requirementsContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  requirementsLabel: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    opacity: 0.9,
    fontWeight: '500',
    marginBottom: 8,
  },
  // Animated Progress Bar Styles
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#F56E0F', // Primary orange
    fontWeight: 'bold',
    marginLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  requirementsButton: {
    backgroundColor: '#F56E0F', // Primary orange
  },
  companyButton: {
    backgroundColor: '#4285f4', // Blue for company
  },
  attendanceButton: {
    backgroundColor: '#9c27b0', // Purple for attendance
  },
  deleteButton: {
    backgroundColor: '#ea4335',
  },
  actionButtonText: {
    color: '#FBFBFB', // Light text
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#151419', // Dark background
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#878787', // Muted gray
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
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    flex: 1,
  },
  requirementScopeText: {
    fontSize: 12,
    color: '#878787', // Muted gray
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
  },
  closeModalButton: {
    padding: 4,
  },
  requirementsList: {
    maxHeight: 400,
    padding: 20,
  },
  requirementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementLabel: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
    marginLeft: 12,
  },
  completedRequirement: {
    textDecorationLine: 'line-through',
    color: '#878787', // Muted gray
  },
  // Add Intern Modal Styles
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  internButton: {
    backgroundColor: '#F56E0F', // Primary orange
    elevation: 3,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  downloadButton: {
    backgroundColor: '#34a853', // Green for download
    elevation: 3,
    shadowColor: '#34a853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createClassButton: {
    backgroundColor: '#9c27b0',
    elevation: 3,
    shadowColor: '#9c27b0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButton: {
    backgroundColor: '#ea4335',
  },
  addButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  addInternForm: {
    padding: 20,
    maxHeight: 500,
  },
  formLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 4,
  },
  formSubLabel: {
    fontSize: 14,
    color: '#878787', // Muted gray
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FBFBFB', // Light text
    backgroundColor: '#2A2A2E', // Dark input background
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#2A2A2E', // Dark input background
  },
  pickerText: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F56E0F', // Primary orange
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  searchButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#878787', // Muted gray
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  studentFoundContainer: {
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  studentFoundProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  studentFoundProfileContainer: {
    marginRight: 16,
  },
  studentFoundProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  studentFoundProfilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentFoundProfileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  studentFoundTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 12,
  },
  studentInfo: {
    marginBottom: 16,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 14,
    color: '#878787', // Muted gray
    marginBottom: 2,
  },
  // Requirements Management Styles
  requirementForm: {
    padding: 20,
    maxHeight: 600,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  datePickerContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4285f4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  datePicker: {
    alignSelf: 'center',
  },
  datePickerErrorText: {
    fontSize: 14,
    color: '#ea4335',
    textAlign: 'center',
    padding: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  datePickerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  datePickerCancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    alignItems: 'center',
  },
  datePickerCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#02050a',
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerCloseButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#4285f4',
    borderRadius: 6,
    alignItems: 'center',
  },
  datePickerCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#4285f4',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  // Updated Requirement Item Styles
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requirementMain: {
    flex: 1,
  },
  requirementTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  requirementDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requirementDueDate: {
    fontSize: 12,
    color: '#fbbc04',
    marginTop: 2,
    fontWeight: '500',
  },
  requirementFileStatus: {
    fontSize: 12,
    color: '#34a853',
    marginTop: 2,
    fontWeight: '500',
  },
  uploadedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  uploadedFileName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  requirementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#02050a',
  },
  // Download Modal Styles
  downloadModalContent: {
    padding: 20,
    maxHeight: 500,
  },
  downloadDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  downloadRequirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDownloadItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4285f4',
  },
  downloadRequirementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  downloadRequirementText: {
    marginLeft: 12,
    flex: 1,
  },
  downloadRequirementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#02050a',
    marginBottom: 2,
  },
  downloadRequirementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  downloadFileStatus: {
    fontSize: 12,
    color: '#34a853',
    fontWeight: '500',
  },
  noFilesContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noFilesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noFilesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  downloadButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  downloadActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  downloadActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Submission Status Styles
  submissionStatusContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submissionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  submissionStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  submittedAtText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  feedbackContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4285f4',
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  feedbackText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  // Details Modal Styles
  detailsModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  detailsContent: {
    padding: 0,
  },
  // Profile Image Section
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsProfileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#02050a',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  detailsSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#02050a',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
    marginRight: 10,
  },
  detailsValue: {
    fontSize: 14,
    color: '#02050a',
    flex: 1,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  requirementStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  // File Picker Styles
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4285f4',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  filePickerText: {
    fontSize: 16,
    color: '#4285f4',
    marginLeft: 8,
    fontWeight: '500',
  },
  fileSelectedContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#1a1a2e',
    marginLeft: 8,
    flex: 1,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  removeFileButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#ffebee',
  },
  uploadedFileText: {
    fontSize: 12,
    color: '#2e7d32',
    marginLeft: 4,
    fontWeight: '500',
  },
  // Skeleton Loading Styles
  skeletonInternCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  skeletonInternHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  skeletonProfileContainer: {
    marginRight: 15,
  },
  skeletonProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
  },
  skeletonInternInfo: {
    flex: 1,
  },
  skeletonTextLine: {
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonStatusContainer: {
    alignItems: 'flex-end',
  },
  skeletonStatusBadge: {
    width: 60,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 12,
  },
  skeletonInternDetails: {
    marginBottom: 15,
  },
  skeletonContactInfo: {
    marginBottom: 10,
  },
  skeletonContactItem: {
    height: 14,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 7,
    marginBottom: 4,
    width: '80%',
  },
  skeletonRequirementsContainer: {
    marginTop: 10,
  },
  skeletonRequirementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  skeletonProgressBar: {
    height: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  skeletonProgressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: 'rgba(245, 110, 15, 0.4)',
    borderRadius: 3,
  },
  skeletonActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  skeletonActionButton: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
  },
  skeletonStatItem: {
    flex: 1,
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  skeletonStatNumber: {
    width: 40,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 12,
    marginBottom: 8,
  },
  skeletonStatLabel: {
    width: 60,
    height: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 6,
  },
  // Year Selector Modal Styles
  yearModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  yearModalContent: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  yearModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  yearModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  yearModalBody: {
    maxHeight: 400,
    padding: 20,
  },
  yearOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  yearOptionSelected: {
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderWidth: 1,
    borderColor: '#F56E0F',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  yearOptionTextSelected: {
    color: '#F56E0F', // Primary orange
    fontWeight: '700',
  },
  // Delete Confirmation Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FBFBFB',
    letterSpacing: -0.5,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#FBFBFB',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    opacity: 0.9,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  deleteModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  deleteModalCancelButton: {
    backgroundColor: '#2A2A2E',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  deleteModalConfirmButton: {
    backgroundColor: '#F44336',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  // Assigned Company Modal Styles - Data Table
  companyModalContent: {
    padding: 0,
    maxHeight: 500,
  },
  tableContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1B1B1E',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2E',
    borderBottomWidth: 2,
    borderBottomColor: '#F56E0F',
  },
  tableHeaderCell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(245, 110, 15, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F56E0F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#1B1B1E',
  },
  tableRowEven: {
    backgroundColor: 'rgba(245, 110, 15, 0.05)',
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    minHeight: 60,
  },
  tableCellText: {
    fontSize: 13,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  // Table Cell Widths
  tableCellNo: {
    width: 100,
    alignItems: 'center',
  },
  tableCellCompany: {
    flex: 4,
    minWidth: 400,
  },
  tableCellIndustry: {
    flex: 3,
    minWidth: 300,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  companyNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableCompanyImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tableCompanyImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 168, 83, 0.2)',
    borderWidth: 1,
    borderColor: '#34a853',
  },
  tableStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#34a853',
  },
  emptyCompanyContainer: {
    alignItems: 'center',
    padding: 60,
    justifyContent: 'center',
  },
  emptyCompanyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCompanyText: {
    fontSize: 14,
    color: '#878787', // Muted gray
    textAlign: 'center',
    lineHeight: 20,
  },
  // Company Selector for Attendance Styles
  companySelectorItem: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  companySelectorItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companySelectorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  companySelectorImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companySelectorInfo: {
    flex: 1,
  },
  companySelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  companySelectorIndustry: {
    fontSize: 14,
    color: '#878787',
  },
  // Create Class Modal Styles
  createClassModalContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  formGroup: {
    marginBottom: 20,
  },
  createClassFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FBFBFB',
    backgroundColor: '#2A2A2E',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2A2A2E',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: '#878787',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    backgroundColor: '#1B1B1E',
    maxHeight: 200,
    overflow: 'hidden',
    borderTopWidth: 2,
    borderTopColor: '#F56E0F',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#FBFBFB',
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    color: '#F56E0F',
    fontWeight: '700',
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  codeDisplay: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2A2A2E',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F56E0F',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  generateCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F56E0F',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  generateCodeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.2)',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  createClassCancelButton: {
    backgroundColor: '#2A2A2E',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  createClassCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  createButton: {
    backgroundColor: '#F56E0F',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  // My Classes Section Styles
  classesSection: {
    marginBottom: 24,
  },
  classesSectionHeader: {
    marginBottom: 16,
  },
  classesSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 4,
  },
  classesSectionSubtitle: {
    fontSize: 14,
    color: '#878787',
  },
  classesScrollView: {
    marginHorizontal: 0,
  },
  classesGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  classCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    maxWidth: 320,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  classCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  classCardName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  classCardBody: {
    gap: 12,
  },
  classCardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classCardInfoText: {
    fontSize: 14,
    color: '#FBFBFB',
    opacity: 0.9,
  },
  classCardCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  classCardCodeContainer: {
    flex: 1,
  },
  classCardCodeLabel: {
    fontSize: 12,
    color: '#878787',
    marginBottom: 4,
  },
  classCardCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F56E0F',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  copyCodeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
  },
  classCardStudentCount: {
    fontSize: 14,
    color: '#34a853',
    fontWeight: '600',
  },
  emptyClassesContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    borderStyle: 'dashed',
  },
  emptyClassesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyClassesSubtext: {
    fontSize: 14,
    color: '#878787',
    textAlign: 'center',
  },
  skeletonClassCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    maxWidth: 320,
    height: 180,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
});
