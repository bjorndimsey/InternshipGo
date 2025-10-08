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
import { apiService } from '../../../lib/api';
import { CloudinaryService } from '../../../lib/cloudinaryService';

const { width } = Dimensions.get('window');

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
}

interface CompaniesPageProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
}

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
  
  // Daily Tasks Modal States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskImage, setTaskImage] = useState<string | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  
  // Success Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
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

  // Debug function to test direct database query
  const testDirectAttendanceQuery = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔍 ===== DIRECT DATABASE TEST =====');
      console.log('🔍 Testing direct attendance query...');
      
      // Get company first
      const response = await apiService.getStudentCompanies(currentUser.id);
      if (response.success && response.companies && response.companies.length > 0) {
        const companyId = response.companies[0].id.toString();
        console.log('🔍 Company ID for test:', companyId);
        
        // Test with a broader date range to see if there are any records
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const startDate = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const endDate = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        
        console.log('🔍 Testing date range:', startDate, 'to', endDate);
        
        const testResponse = await apiService.getAttendanceRecords(companyId, currentUser.id, {
          startDate: startDate,
          endDate: endDate,
          internId: currentUser.id
        });
        
        console.log('🔍 Test response:', testResponse);
        
        if (testResponse.success && testResponse.data) {
          console.log('🔍 Found records:', testResponse.data.length);
          testResponse.data.forEach((record: any, index: number) => {
            console.log(`🔍 Record ${index + 1}:`, {
              user_id: record.user_id,
              status: record.status,
              attendance_date: record.attendance_date,
              company_id: record.company_id
            });
          });
        }
      }
      console.log('🔍 ===== DIRECT DATABASE TEST COMPLETED =====');
    } catch (error) {
      console.error('🔍 Test error:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      setError(null);
      
      if (!currentUser) {
        console.log('No current user found');
        setCompanies([]);
        setError('No user found. Please log in again.');
        return;
      }

      console.log('📅 Fetching companies for student:', currentUser.id);
      const response = await apiService.getStudentCompanies(currentUser.id);
      
      if (response.success && response.companies) {
        console.log('✅ Companies fetched successfully:', response.companies.length);
        
        // Transform the data to match our interface
        const transformedCompanies: Company[] = response.companies.map((company: any) => ({
          id: company.id.toString(),
          name: company.company_name,
          profilePicture: company.profile_picture,
          industry: company.industry,
          location: company.address,
          moaStatus: company.moa_status === 'active' ? 'active' : 
                    company.moa_status === 'expired' ? 'expired' : 'pending',
          moaExpiryDate: company.moa_expiry_date,
          availableSlots: company.available_slots || 0,
          totalSlots: company.total_slots || 10,
          description: company.description || `Leading company in ${company.industry} industry`,
          website: company.website || `www.${company.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
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
        }));

        setCompanies(transformedCompanies);
      } else {
        console.log('❌ Failed to fetch companies:', response.message);
        setCompanies([]);
        Alert.alert('Info', response.message || 'No companies available. You may not have any approved applications.');
      }
    } catch (error) {
      console.error('❌ Error fetching companies:', error);
      setCompanies([]);
      setError('Failed to load companies. Please try again.');
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

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyDetails(true);
  };


  const handleDailyTasks = (company: Company) => {
    const companyId = company.id.toString();
    const companyAttendanceStatus = attendanceStatus[companyId] || 'not_marked';
    
    console.log(`📅 Daily tasks clicked for company ${companyId}, attendance status: ${companyAttendanceStatus}`);
    
    // Check attendance status before allowing daily tasks
    if (companyAttendanceStatus === 'absent' || companyAttendanceStatus === 'leave') {
      setModalAttendanceStatus(companyAttendanceStatus);
      setShowAbsentModal(true);
      return;
    }
    
    // Check if attendance is not marked yet
    if (companyAttendanceStatus === 'not_marked') {
      Alert.alert(
        'Attendance Not Marked',
        'Please have your attendance marked first before submitting daily tasks. Contact your supervisor to mark your attendance.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }
    
    // Only allow daily tasks if present or late
    if (companyAttendanceStatus === 'present' || companyAttendanceStatus === 'late') {
      setSelectedCompany(company);
      setShowDailyTasks(true);
      // Reset form when opening modal
      setTaskTitle('');
      setTaskNotes('');
      setTaskImage(null);
    }
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


  const handleSubmitTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }

    if (!taskNotes.trim()) {
      Alert.alert('Error', 'Please enter task notes.');
      return;
    }

    if (!selectedCompany?.id) {
      Alert.alert('Error', 'No company selected.');
      return;
    }

    setIsSubmittingTask(true);
    
    try {
      console.log('📝 Submitting daily task evidence...');
      
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
      const response = await apiService.submitEvidence(evidenceData);
      
      if (response.success) {
        console.log('✅ Evidence submitted successfully:', response);
        
        // Set success message and show modal
        setSuccessMessage(`Daily task evidence submitted successfully for ${selectedCompany.name}!`);
        setShowSuccessModal(true);
        
        // Close daily tasks modal and reset form
        setShowDailyTasks(false);
        setTaskTitle('');
        setTaskNotes('');
        setTaskImage(null);
      } else {
        console.error('❌ Failed to submit evidence:', response.message);
        Alert.alert('Error', response.message || 'Failed to submit evidence. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error submitting evidence:', error);
      Alert.alert('Error', 'Failed to submit evidence. Please try again.');
    } finally {
      setIsSubmittingTask(false);
    }
  };


  const getMOAStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2D5A3D'; // Forest green
      case 'expired': return '#E8A598'; // Soft coral
      case 'pending': return '#F4D03F'; // Bright yellow
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
      case 'under-review': return '#F4D03F'; // Bright yellow
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
      case 'late': return '#F4D03F'; // Bright yellow
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
          case 'pending': return { color: '#F4D03F', text: 'Pending', icon: 'schedule' };
          default: return { color: '#1E3A5F', text: 'Unknown', icon: 'help' };
        }
      } else {
        switch (status) {
          case 'approved': return { color: '#2D5A3D', text: 'Approved', icon: 'check-circle' };
          case 'rejected': return { color: '#E8A598', text: 'Rejected', icon: 'cancel' };
          case 'under-review': return { color: '#F4D03F', text: 'Under Review', icon: 'schedule' };
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
            <Animated.View style={[styles.skeletonRating, { opacity: shimmerOpacity }]} />
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
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={18} color="#F4D03F" />
              <Text style={styles.ratingText}>{company.rating}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[
                styles.headerActionButton, 
                styles.tasksButton,
                (companyAttendanceStatus === 'absent' || companyAttendanceStatus === 'leave' || companyAttendanceStatus === 'not_marked') && styles.disabledButton
              ]} 
              onPress={() => handleDailyTasks(company)}
              disabled={companyAttendanceStatus === 'absent' || companyAttendanceStatus === 'leave' || companyAttendanceStatus === 'not_marked'}
            >
              <MaterialIcons 
                name="assignment" 
                size={18} 
                color={(companyAttendanceStatus === 'absent' || companyAttendanceStatus === 'leave' || companyAttendanceStatus === 'not_marked') ? '#ccc' : '#fff'} 
              />
            </TouchableOpacity>
            <MaterialIcons 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={24} 
              color="#F4D03F" 
            />
          </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <Animated.View style={styles.expandedContent}>
            <View style={styles.companyDetails}>
              {/* Attendance Status */}
              {companyAttendanceStatus && (
                <View style={styles.attendanceStatusContainer}>
                  <View style={styles.attendanceStatusRow}>
                    <MaterialIcons 
                      name={getAttendanceStatusIcon(companyAttendanceStatus)} 
                      size={18} 
                      color={getAttendanceStatusColor(companyAttendanceStatus)} 
                    />
                    <Text style={styles.attendanceStatusLabel}>Today's Status:</Text>
                    <View style={[
                      styles.attendanceStatusBadge, 
                      { backgroundColor: getAttendanceStatusColor(companyAttendanceStatus) }
                    ]}>
                      <Text style={styles.attendanceStatusText}>
                        {getAttendanceStatusText(companyAttendanceStatus)}
                      </Text>
                    </View>
                  </View>
                  {(companyAttendanceStatus === 'absent' || companyAttendanceStatus === 'leave') && (
                    <Text style={styles.attendanceStatusMessage}>
                      Daily tasks are not available when you are {companyAttendanceStatus === 'absent' ? 'absent' : 'on leave'}.
                    </Text>
                  )}
                  {companyAttendanceStatus === 'not_marked' && (
                    <View style={styles.attendanceStatusMessageContainer}>
                      <Text style={styles.attendanceStatusMessage}>
                        Please have your attendance marked first before submitting daily tasks.
                      </Text>
                      <View style={styles.debugButtonsContainer}>
                        <TouchableOpacity 
                          style={styles.refreshAttendanceButton}
                          onPress={refreshAttendance}
                          disabled={attendanceLoading}
                        >
                          <MaterialIcons 
                            name="refresh" 
                            size={16} 
                            color="#F4D03F" 
                          />
                          <Text style={styles.refreshAttendanceText}>
                            {attendanceLoading ? 'Refreshing...' : 'Refresh Status'}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.debugButton}
                          onPress={testDirectAttendanceQuery}
                        >
                          <MaterialIcons 
                            name="bug-report" 
                            size={16} 
                            color="#E8A598" 
                          />
                          <Text style={styles.debugButtonText}>
                            Debug DB
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.locationContainer}>
                <MaterialIcons name="location-on" size={18} color="#F4D03F" />
                <Text style={styles.locationText}>{company.location}</Text>
              </View>
              
              <View style={styles.slotsContainer}>
                <View style={styles.slotInfo}>
                  <Text style={styles.slotLabel}>Available Slots</Text>
                  <Text style={styles.slotValue}>{company.availableSlots}/{company.totalSlots}</Text>
                </View>
                <View style={styles.slotBar}>
                  <View 
                    style={[
                      styles.slotFill, 
                      { 
                        width: `${(company.availableSlots / company.totalSlots) * 100}%`,
                        backgroundColor: company.availableSlots > 0 ? '#2D5A3D' : '#E8A598'
                      }
                    ]} 
                  />
                </View>
              </View>

              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>MOA Status:</Text>
                  <StatusBadge status={company.moaStatus} type="moa" />
                </View>
                {company.moaExpiryDate && (
                  <Text style={styles.statusDate}>Expires: {company.moaExpiryDate}</Text>
                )}
              </View>

              {company.applicationStatus && (
                <View style={styles.statusContainer}>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Application Status:</Text>
                    <StatusBadge status={company.applicationStatus} type="application" />
                  </View>
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
            </View>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
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
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>Companies</Text>
          <Text style={styles.headerSubtitle}>
            {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} available
          </Text>
        </View>
      </Animated.View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#F4D03F" style={styles.searchIcon} />
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
                <MaterialIcons name="info" size={20} color="#F4D03F" />
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

      {/* Daily Tasks Modal */}
      <Modal
        visible={showDailyTasks}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDailyTasks(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Submit Daily Task - {selectedCompany?.name}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowDailyTasks(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.taskFormContainer} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.inputLabel}>Task Image (Optional)</Text>
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
                      <MaterialIcons name="add-a-photo" size={32} color="#F4D03F" />
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
                    <Text style={styles.submitButtonText}>Submit Task</Text>
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
                      <View style={styles.companyDetailsRating}>
                        <MaterialIcons name="star" size={16} color="#fbbc04" />
                        <Text style={styles.companyDetailsRatingText}>{selectedCompany.rating}/5</Text>
                      </View>
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
    backgroundColor: '#1E3A5F', // Deep navy blue
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  headerGradient: {
    position: 'relative',
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
    color: '#F4D03F', // Bright yellow
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
    backgroundColor: '#1E3A5F', // Deep navy blue
    borderRadius: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
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
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
  statusDate: {
    fontSize: 12,
    color: '#F4D03F',
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
    color: '#F4D03F', // Bright yellow
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
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  slotLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  slotValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F4D03F',
  },
  slotBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  tasksButton: {
    backgroundColor: '#F4D03F', // Bright yellow
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
    backgroundColor: 'rgba(244, 208, 63, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#F4D03F',
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
    backgroundColor: '#1E3A5F',
    borderRadius: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 30,
  },
  skeletonCompanyInfo: {
    flex: 1,
  },
  skeletonCompanyName: {
    width: '70%',
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    marginBottom: 6,
  },
  skeletonCompanyIndustry: {
    width: '50%',
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonRating: {
    width: 60,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
  },
  skeletonExpandIcon: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
  },
  // Task Form Styles
  taskFormContainer: {
    flex: 1,
    padding: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#F4D03F',
    fontStyle: 'italic',
    marginTop: 4,
  },
  attendanceStatusMessageContainer: {
    marginTop: 4,
  },
  refreshAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 208, 63, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F4D03F',
    alignSelf: 'flex-start',
  },
  refreshAttendanceText: {
    fontSize: 12,
    color: '#F4D03F',
    fontWeight: '600',
    marginLeft: 4,
  },
  debugButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 165, 152, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8A598',
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    fontSize: 12,
    color: '#E8A598',
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
});
