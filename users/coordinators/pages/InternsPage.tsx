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

const { width } = Dimensions.get('window');

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

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
}

interface InternsPageProps {
  currentUser: UserInfo | null;
}

export default function InternsPage({ currentUser }: InternsPageProps) {
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
  
  // Requirements management states
  const [newRequirement, setNewRequirement] = useState({
    name: '',
    description: '',
    isRequired: true,
    dueDate: '',
    fileUrl: '',
    fileName: '',
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

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
  }, []);

  useEffect(() => {
    filterInterns();
  }, [searchQuery, selectedSchoolYear, interns]);

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
            
            console.log(`📋 Student ${intern.student_id} (intern ${intern.id}) - Requirements:`, requirements.length);
            console.log(`📋 Student ${intern.student_id} (intern ${intern.id}) - Submissions:`, submissions.length);
            
            // Create a map of all requirements (both assigned and submitted)
            const allRequirements = new Map();
            
            // Add assigned requirements
            requirements.forEach((req: any) => {
              allRequirements.set(req.id, {
                ...req,
                submissionStatus: undefined,
                submittedAt: undefined,
                coordinatorFeedback: undefined,
                completed: false
              });
            });
            
            // Add submitted requirements (these might not be in assigned requirements)
            submissions.forEach((sub: any) => {
              const existingReq = allRequirements.get(sub.requirement_id);
              if (existingReq) {
                // Update existing requirement with submission data
                allRequirements.set(sub.requirement_id, {
                  ...existingReq,
                  submissionStatus: sub.status,
                  submittedAt: sub.submitted_at,
                  coordinatorFeedback: sub.coordinator_feedback,
                  completed: sub.status === 'approved'
                });
              } else {
                // Add new requirement from submission
                allRequirements.set(sub.requirement_id, {
                  id: sub.requirement_id,
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
          academicYear: intern.year,
          major: intern.major,
          university: intern.university || 'University of Technology',
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
    Alert.alert(
      'Delete Intern',
      `Are you sure you want to delete ${intern.firstName} ${intern.lastName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to delete intern from database
              const response = await apiService.deleteIntern(intern.id);
              
              if (response.success) {
                // Remove from local state
                setInterns(interns.filter(i => i.id !== intern.id));
                Alert.alert('Success', 'Intern deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete intern');
              }
            } catch (error) {
              console.error('Error deleting intern:', error);
              Alert.alert('Error', 'Failed to delete intern. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleRequirements = (intern: Intern) => {
    setSelectedIntern(intern);
    setShowRequirements(true);
  };

  const refreshInternRequirements = async () => {
    if (selectedIntern) {
      // Refresh the specific intern's requirements
      const [requirements, submissions] = await Promise.all([
        fetchStudentRequirements(selectedIntern.studentId),
        fetchStudentSubmissions(selectedIntern.studentId)
      ]);
      
      // Create a map of all requirements (both assigned and submitted)
      const allRequirements = new Map();
      
      // Add assigned requirements
      requirements.forEach((req: any) => {
        allRequirements.set(req.id, {
          ...req,
          submissionStatus: undefined,
          submittedAt: undefined,
          coordinatorFeedback: undefined,
          completed: false
        });
      });
      
      // Add submitted requirements (these might not be in assigned requirements)
      submissions.forEach((sub: any) => {
        const existingReq = allRequirements.get(sub.requirement_id);
        if (existingReq) {
          // Update existing requirement with submission data
          allRequirements.set(sub.requirement_id, {
            ...existingReq,
            submissionStatus: sub.status,
            submittedAt: sub.submitted_at,
            coordinatorFeedback: sub.coordinator_feedback,
            completed: sub.status === 'approved'
          });
        } else {
          // Add new requirement from submission
          allRequirements.set(sub.requirement_id, {
            id: sub.requirement_id,
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
        // Show success notification
        setSuccessMessage(`Student "${studentFound.first_name} ${studentFound.last_name}" added as intern successfully!`);
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

    // Check if coordinator has assigned interns
    if (interns.length === 0) {
      console.log('❌ No interns assigned to this coordinator');
      Alert.alert(
        'No Students Assigned', 
        'You need to assign students to your coordinator account before creating requirements. Please add students first.',
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
    setShowYearSelector(false);
  };

  const closeYearSelector = () => {
    setShowYearSelector(false);
  };

  const toggleCardExpansion = (internId: string) => {
    setExpandedCard(expandedCard === internId ? null : internId);
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
    const requirementsProgress = getRequirementsProgress(intern.requirements);
    const isExpanded = expandedCard === intern.id;
    
    console.log('🖼️ InternCard profile picture:', {
      id: intern.id,
      name: `${intern.firstName} ${intern.lastName}`,
      profilePicture: intern.profilePicture
    });
    
    return (
      <View style={[
        styles.internCard,
        isExpanded && styles.expandedInternCard
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
                  style={styles.profileImage}
                  onError={(error) => {
                    console.log('❌ Image load error for intern:', intern.id, error.nativeEvent.error);
                  }}
                  onLoad={() => {
                    console.log('✅ Image loaded successfully for intern:', intern.id);
                  }}
                />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileText}>
                    {intern.firstName.charAt(0)}{intern.lastName.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.internInfo}>
              <Text style={styles.internName}>
                {intern.firstName} {intern.lastName}
              </Text>
              <Text style={styles.studentId}>{intern.studentId}</Text>
              <Text style={styles.major}>{intern.major}</Text>
              <Text style={styles.academicYear}>{intern.academicYear}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(intern.status) }]}>
                <Text style={styles.statusText}>{getStatusText(intern.status)}</Text>
              </View>
              <MaterialIcons 
                name={isExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color="#F56E0F" 
                style={styles.expandIcon}
              />
            </View>
          </View>

          <View style={styles.internDetails}>
            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <MaterialIcons name="email" size={16} color="#F56E0F" />
                <Text style={styles.contactText}>{intern.email}</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="phone" size={16} color="#F56E0F" />
                <Text style={styles.contactText}>{intern.phoneNumber}</Text>
              </View>
            </View>

            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsLabel}>Requirements Progress:</Text>
              <ProgressBar 
                progress={requirementsProgress} 
                color={requirementsProgress === 100 ? '#34a853' : '#F56E0F'} 
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {intern.internshipCompany && (
              <View style={styles.internshipInfo}>
                <Text style={styles.internshipLabel}>Current Internship:</Text>
                <Text style={styles.internshipCompany}>{intern.internshipCompany}</Text>
                <Text style={styles.internshipDates}>
                  {intern.internshipStartDate} - {intern.internshipEndDate}
                </Text>
              </View>
            )}

            <View style={styles.expandedActionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={() => handleViewDetails(intern)}
              >
                <MaterialIcons name="visibility" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.requirementsButton]} 
                onPress={() => handleRequirements(intern)}
              >
                <MaterialIcons name="assignment" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Requirements</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]} 
                onPress={() => handleDeleteIntern(intern)}
              >
                <MaterialIcons name="delete" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Delete</Text>
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
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#F56E0F" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search interns..."
              placeholderTextColor="#878787"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>School Year:</Text>
          <TouchableOpacity 
            style={styles.yearSelector}
            onPress={() => setShowYearSelector(true)}
          >
            <Text style={styles.yearText}>{selectedSchoolYear}</Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#F56E0F" />
          </TouchableOpacity>
          
          <View style={styles.buttonContainer}>
          <TouchableOpacity 
              style={[styles.addButton, styles.requirementsButton]}
              onPress={handleAddRequirement}
            >
              <MaterialIcons name="assignment" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Requirements</Text>
            </TouchableOpacity>
            
            
            <TouchableOpacity 
              style={[styles.addButton, styles.internButton]}
            onPress={() => setShowAddInternModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Intern</Text>
          </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {loading ? (
          // Show skeleton stats
          (() => {
            console.log('📊 Showing skeleton stats, loading state:', loading);
            return Array.from({ length: 4 }).map((_, index) => (
              <View key={`skeleton-stat-${index}`} style={styles.skeletonStatItem}>
                <View style={styles.skeletonStatNumber} />
                <View style={styles.skeletonStatLabel} />
              </View>
            ));
          })()
        ) : (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{filteredInterns.length}</Text>
              <Text style={styles.statLabel}>Total Interns</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#34a853' }]}>
                {filteredInterns.filter(i => i.status === 'active').length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#4285f4' }]}>
                {filteredInterns.filter(i => i.status === 'graduated').length}
              </Text>
              <Text style={styles.statLabel}>Graduated</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#fbbc04' }]}>
                {filteredInterns.filter(i => getRequirementsProgress(i.requirements) < 100).length}
              </Text>
              <Text style={styles.statLabel}>Incomplete</Text>
            </View>
          </>
        )}
      </View>

      {/* Interns List */}
      <ScrollView style={styles.internsList} showsVerticalScrollIndicator={false}>
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
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerText}>{addInternSchoolYear}</Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </View>
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
                  Will be assigned to {interns.length} student{interns.length !== 1 ? 's' : ''}
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
                      {getRequirementsProgress(selectedInternDetails.requirements)}% 
                      ({selectedInternDetails.requirements.filter(req => req.completed).length}/{selectedInternDetails.requirements.length})
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
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    fontWeight: '600',
  },
  internsList: {
    flex: 1,
    padding: 20,
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
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  detailsProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 35,
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  internInfo: {
    flex: 1,
  },
  internName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 6,
  },
  studentId: {
    fontSize: 14,
    color: '#F56E0F', // Primary orange
    marginBottom: 4,
    fontWeight: '500',
  },
  major: {
    fontSize: 14,
    color: '#FBFBFB', // Light text
    marginBottom: 4,
    opacity: 0.9,
  },
  academicYear: {
    fontSize: 12,
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
    fontSize: 14,
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
  deleteButton: {
    backgroundColor: '#ea4335',
  },
  actionButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: 14,
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
});
