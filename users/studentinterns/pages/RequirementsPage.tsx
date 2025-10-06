import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { apiService } from '../../../lib/api';
import { CloudinaryService } from '../../../lib/cloudinaryService';

const { width } = Dimensions.get('window');
interface RequirementsPageProps {
  currentUser: {
    id: string;
    email: string;
    user_type: string;
    google_id?: string;
    student_id?: string;
  };
}

const RequirementsPage = ({ currentUser }: RequirementsPageProps) => {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Debug: Log currentUser to see what we're getting
  console.log('🔍 RequirementsPage currentUser:', currentUser);
  console.log('🔍 currentUser.student_id:', currentUser?.student_id);

  useEffect(() => {
    fetchStudentRequirements();
    
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

  const fetchStudentRequirements = async () => {
    try {
      setLoadingRequirements(true);
      setShowSkeleton(true);
      
      if (!currentUser) {
        console.log('No current user found');
        setRequirements([]);
        return;
      }

      console.log('Fetching student record for user:', currentUser.id);
      
      // First, get the student record using the user_id
      const studentResponse = await apiService.getProfile(currentUser.id);
      
      if (!studentResponse.success || !studentResponse.user) {
        console.log('Student profile not found');
        setRequirements([]);
        return;
      }

      const student = studentResponse.user;
      console.log('Found student record:', student);
      
      // Check if we have a student_id field, otherwise use the user id
      const studentId = student.student_id || student.id;
      console.log('Using student ID for requirements:', studentId);
      
      // Now fetch requirements using the student ID
      console.log('📡 Calling API to fetch requirements for student:', studentId);
      const response = await apiService.getStudentRequirements(studentId);
      console.log('📡 API Response:', response);
      
      if (response.success && response.requirements) {
        console.log('✅ Requirements fetched successfully:', response.requirements.length);
        console.log('📋 Requirements data:', response.requirements);
        
        // Also fetch student submissions to get submission status
        console.log('📡 Fetching student submissions for student:', studentId);
        const submissionsResponse = await apiService.getStudentSubmissions(studentId);
        console.log('📡 Submissions Response:', submissionsResponse);
        
        let submissions = [];
        if (submissionsResponse.success && submissionsResponse.data) {
          submissions = submissionsResponse.data;
          console.log('✅ Submissions fetched successfully:', submissions.length);
        }
        
        // Combine requirements with submission data
        const allRequirements = new Map();
        
        // Add assigned requirements
        response.requirements.forEach((req: any) => {
          allRequirements.set(req.requirement_id, {
            id: req.requirement_id,
            requirement_id: req.requirement_id,
            requirement_name: req.requirement_name,
            requirement_description: req.requirement_description,
            is_required: req.is_required,
            due_date: req.due_date,
            file_url: req.file_url,
            file_name: req.file_name,
            file_public_id: req.file_public_id,
            coordinator_first_name: req.coordinator_first_name,
            coordinator_last_name: req.coordinator_last_name,
            coordinator_id: req.coordinator_id,
            completed: false,
            submissionStatus: undefined
          });
        });
        
        // Add submitted requirements (update existing or add new)
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
              requirement_id: sub.requirement_id,
              requirement_name: sub.requirement_name,
              requirement_description: sub.requirement_description,
              is_required: sub.is_required,
              due_date: sub.due_date,
              file_url: sub.submitted_file_url,
              file_name: sub.submitted_file_name,
              file_public_id: sub.submitted_file_public_id,
              completed: sub.status === 'approved',
              submissionStatus: sub.status,
              submittedAt: sub.submitted_at,
              coordinatorFeedback: sub.coordinator_feedback
            });
          }
        });
        
        const requirementsWithStatus = Array.from(allRequirements.values());
        console.log('📋 Final requirements with status:', requirementsWithStatus.length);
        console.log('📋 Approved requirements:', requirementsWithStatus.filter(r => r.submissionStatus === 'approved').length);
        
        setRequirements(requirementsWithStatus);
      } else {
        console.log('❌ No requirements found or error:', response.message);
        setRequirements([]);
        
        // Show specific message if student is not assigned to a coordinator
        if (response.message === 'Student not assigned to any coordinator') {
          Alert.alert(
            'No Coordinator Assigned',
            'You are not currently assigned to any coordinator. Please contact your administrator.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error fetching student requirements:', error);
      setRequirements([]);
    } finally {
      setLoadingRequirements(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const handleDownloadRequirement = async (fileUrl: string, fileName: string) => {
    try {
      console.log('📥 ===== DIRECT REQUIREMENT DOWNLOAD =====');
      console.log('📄 File URL:', fileUrl);
      console.log('📝 File name:', fileName);
      
      if (Platform.OS === 'web') {
        // Use browser download for web (same pattern as ApplicationsPage)
        console.log('🌐 Using browser download method...');
        
        // Fetch the file
        console.log('📥 Fetching file from URL...');
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        console.log('📊 Fetch response:', {
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
        
        // Convert to blob
        const blob = await response.blob();
        console.log('📄 Blob details:', {
          size: blob.size,
          type: blob.type
        });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'requirement.pdf';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ File download initiated in browser');
        Alert.alert('Download Started', `Requirement document "${fileName || 'requirement.pdf'}" download has started. Check your Downloads folder.`);
        
      } else {
        // For mobile, use Linking to open the file
        const supported = await Linking.canOpenURL(fileUrl);
        if (supported) {
          await Linking.openURL(fileUrl);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const handleUploadRequirementFile = async (requirementId: string, studentId: string) => {
    try {
      console.log('📤 Uploading file for requirement:', requirementId);
      console.log('🔍 Received studentId parameter:', studentId);
      console.log('🔍 currentUser in upload function:', currentUser);
      
      // If studentId is empty, try to get it from currentUser or fetch profile
      let actualStudentId = studentId;
      if (!actualStudentId || actualStudentId === '') {
        if (currentUser?.student_id) {
          actualStudentId = currentUser.student_id;
          console.log('🔧 Using student_id from currentUser:', actualStudentId);
        } else {
          // Fetch profile to get student_id
          console.log('🔧 Fetching profile to get student_id...');
          const profileResponse = await apiService.getProfile(currentUser?.id || '');
          if (profileResponse.success && profileResponse.user?.student_id) {
            actualStudentId = profileResponse.user.student_id;
            console.log('🔧 Got student_id from profile:', actualStudentId);
          } else {
            throw new Error('Unable to determine student ID');
          }
        }
      }
      
      // Pick a PDF file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('File picker canceled');
        return;
      }

      const file = result.assets[0];
      console.log('Selected file:', file);

      setUploadingFile(requirementId);

      // Create a blob from the file URI (same pattern as InternsPage)
      const response = await fetch(file.uri);
      const blob = await response.blob();
      console.log('Created blob:', { size: blob.size, type: blob.type });

      // Upload to Cloudinary
      const uploadResult = await CloudinaryService.uploadRequirementPDF(
        blob,
        `requirement_${requirementId}_${Date.now()}`
      );
      console.log('Upload result:', uploadResult);

      if (uploadResult.success && uploadResult.url) {
        // Submit the requirement using the new submission system
        console.log('🔄 Submitting requirement with:', {
          studentId: actualStudentId,
          requirementId,
          fileUrl: uploadResult.url,
          filePublicId: uploadResult.public_id
        });

        // Get requirement details for submission
        const requirement = requirements.find(req => req.requirement_id === requirementId);
        
        // Get the coordinator's user_id from the requirement's coordinator_id (which is coordinators.id)
        let coordinatorUserId = '';
        if (requirement?.coordinator_id) {
          try {
            console.log('🔍 Looking up coordinator user_id for coordinators.id:', requirement.coordinator_id);
            const coordinatorResponse = await apiService.getCoordinatorProfile(requirement.coordinator_id);
            if (coordinatorResponse.success && coordinatorResponse.user) {
              coordinatorUserId = coordinatorResponse.user.id;
              console.log('✅ Found coordinator user_id:', coordinatorUserId);
            } else {
              console.log('❌ Failed to get coordinator profile');
            }
          } catch (error) {
            console.error('Error getting coordinator profile:', error);
          }
        }
        
        const submissionData = {
          studentId: actualStudentId,
          requirementId: requirementId,
          requirementName: requirement?.requirement_name || 'Unknown Requirement',
          requirementDescription: requirement?.requirement_description || '',
          isRequired: requirement?.is_required || true,
          dueDate: requirement?.due_date || null,
          submittedFileUrl: uploadResult.url,
          submittedFilePublicId: uploadResult.public_id || '',
          submittedFileName: file.name || 'requirement.pdf',
          submittedFileSize: file.size || 0,
          coordinatorId: coordinatorUserId
        };

        const submissionResponse = await apiService.submitRequirement(submissionData);

        if (submissionResponse.success) {
          setSuccessMessage('Requirement submitted successfully! Your coordinator will review it soon.');
          setShowSuccessModal(true);
          
          // Refresh requirements
          await fetchStudentRequirements();
        } else {
          Alert.alert('Error', 'Failed to submit requirement');
        }
      } else {
        Alert.alert('Error', 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setUploadingFile(null);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  };

  const toggleCardExpansion = (requirementId: string) => {
    setExpandedCard(expandedCard === requirementId ? null : requirementId);
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

  // Enhanced Status Badge Component
  const StatusBadge = ({ status, isRequired }: { status: string; isRequired: boolean }) => {
    const getStatusConfig = () => {
      if (status === 'approved') {
        return { color: '#2D5A3D', text: 'Approved', icon: 'check-circle' };
      }
      if (status === 'pending') {
        return { color: '#E8A598', text: 'Pending', icon: 'schedule' };
      }
      return { color: '#F4D03F', text: 'Required', icon: 'assignment' };
    };
    
    const config = getStatusConfig();
    
    return (
      <View style={[styles.enhancedStatusBadge, { backgroundColor: config.color }]}>
        <MaterialIcons name={config.icon as any} size={14} color="#fff" />
        <Text style={styles.enhancedStatusText}>{config.text}</Text>
        {isRequired && (
          <View style={styles.requiredIndicator}>
            <MaterialIcons name="star" size={10} color="#fff" />
          </View>
        )}
      </View>
    );
  };

  const getStatusColor = (requirement: any) => {
    if (requirement.submissionStatus === 'approved') {
      return '#4CAF50'; // Green for approved
    }
    return requirement.completed ? '#4CAF50' : '#FF9800';
  };

  const getStatusText = (requirement: any) => {
    if (requirement.submissionStatus === 'approved') {
      return 'Approved';
    }
    return requirement.completed ? 'Completed' : 'Pending';
  };

  // Skeleton Components
  const SkeletonRequirementCard = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonRequirementCard}>
        <View style={styles.skeletonCardHeader}>
          <View style={styles.skeletonTitleContainer}>
            <Animated.View style={[styles.skeletonTitle, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonStatusBadge, { opacity: shimmerOpacity }]} />
          </View>
          <Animated.View style={[styles.skeletonExpandIcon, { opacity: shimmerOpacity }]} />
        </View>
        
        <View style={styles.skeletonProgressSection}>
          <Animated.View style={[styles.skeletonProgressLabel, { opacity: shimmerOpacity }]} />
          <View style={styles.skeletonProgressBarContainer}>
            <Animated.View style={[styles.skeletonProgressBar, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonProgressText, { opacity: shimmerOpacity }]} />
          </View>
        </View>
      </View>
    );
  };

  if (loadingRequirements) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading requirements...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>My Requirements</Text>
          <Text style={styles.headerSubtitle}>
            {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} assigned
          </Text>
          {requirements.length > 0 && (
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {requirements.filter(r => r.submissionStatus === 'approved').length}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {requirements.filter(r => r.submissionStatus === 'pending').length}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {requirements.filter(r => !r.submissionStatus).length}
                </Text>
                <Text style={styles.statLabel}>New</Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.ScrollView 
        style={[styles.content, { transform: [{ scale: scaleAnim }] }]} 
        showsVerticalScrollIndicator={false}
      >
        {showSkeleton ? (
          <>
            <SkeletonRequirementCard />
            <SkeletonRequirementCard />
            <SkeletonRequirementCard />
          </>
        ) : requirements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={64} color="#02050a" />
            <Text style={styles.emptyTitle}>No Requirements</Text>
            <Text style={styles.emptySubtitle}>
              Your coordinator hasn't assigned any requirements yet, or you may not be assigned to a coordinator.
            </Text>
          </View>
        ) : (
          requirements.map((requirement, index) => {
            const isExpanded = expandedCard === requirement.requirement_id;
            const progress = requirement.submissionStatus === 'approved' ? 100 : 
                           requirement.submissionStatus === 'pending' ? 50 : 0;
            
            return (
              <Animated.View 
                key={requirement.id || index} 
                style={[
                  styles.enhancedRequirementCard,
                  { 
                    transform: [{ scale: isExpanded ? 1.02 : 1 }],
                    elevation: isExpanded ? 12 : 6,
                  }
                ]}
              >
                <TouchableOpacity 
                  onPress={() => toggleCardExpansion(requirement.requirement_id)}
                  style={styles.cardTouchable}
                >
                  <View style={styles.requirementHeader}>
                    <View style={styles.requirementTitleContainer}>
                      <Text style={styles.requirementTitle}>{requirement.requirement_name}</Text>
                      <StatusBadge 
                        status={requirement.submissionStatus || 'new'} 
                        isRequired={requirement.is_required} 
                      />
                    </View>
                    <MaterialIcons 
                      name={isExpanded ? "expand-less" : "expand-more"} 
                      size={24} 
                      color="#F4D03F" 
                    />
                  </View>
                  
                  <View style={styles.progressSection}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <ProgressBar 
                      progress={progress} 
                      color={requirement.submissionStatus === 'approved' ? '#2D5A3D' : '#F4D03F'} 
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <Animated.View style={styles.expandedContent}>
                    {requirement.requirement_description && (
                      <Text style={styles.requirementDescription}>
                        {requirement.requirement_description}
                      </Text>
                    )}

                    <View style={styles.requirementDetails}>
                {requirement.due_date && (
                  <View style={styles.requirementDetailRow}>
                    <MaterialIcons name="schedule" size={18} color="#F4D03F" />
                    <Text style={styles.requirementDetailText}>
                      Due: {new Date(requirement.due_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {requirement.coordinator_first_name && (
                  <View style={styles.requirementDetailRow}>
                    <MaterialIcons name="person" size={18} color="#F4D03F" />
                    <Text style={styles.requirementDetailText}>
                      Assigned by: {requirement.coordinator_first_name} {requirement.coordinator_last_name}
                    </Text>
                  </View>
                )}
                
                {requirement.file_url && (
                  <View style={styles.requirementDetailRow}>
                    <MaterialIcons name="attach-file" size={18} color="#F4D03F" />
                    <TouchableOpacity
                      onPress={() => handleDownloadRequirement(requirement.file_url, requirement.file_name || 'requirement.pdf')}
                    >
                      <Text style={[styles.requirementDetailText, styles.linkText]}>
                        Download PDF Document
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Upload/Submit File Section */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadLabel}>Submit Your File:</Text>
                  {requirement.submissionStatus === 'approved' ? (
                    <View style={styles.lockedUploadSection}>
                      <MaterialIcons name="lock" size={18} color="#76962D" />
                      <Text style={styles.lockedText}>Requirement Approved - No Further Submissions Allowed</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.uploadButton,
                        uploadingFile === requirement.requirement_id && styles.uploadingButton
                      ]}
                      onPress={() => handleUploadRequirementFile(requirement.requirement_id, currentUser?.student_id || '')}
                      disabled={uploadingFile === requirement.requirement_id}
                    >
                      <MaterialIcons 
                        name={uploadingFile === requirement.requirement_id ? "hourglass-empty" : "cloud-upload"} 
                        size={18} 
                        color="#02050a" 
                      />
                      <Text style={styles.uploadButtonText}>
                        {uploadingFile === requirement.requirement_id ? 'Uploading...' : 'Upload PDF'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
                    {requirement.completed && requirement.completed_at && (
                      <Text style={styles.completedDate}>
                        Completed on: {new Date(requirement.completed_at).toLocaleDateString()}
                      </Text>
                    )}
                  </Animated.View>
                )}
              </Animated.View>
            );
          })
        )}
      </Animated.ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color="#2D5A3D" />
            </View>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={closeSuccessModal}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8', // Soft cream background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#02050a',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#1E3A5F', // Deep navy blue
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  headerGradient: {
    position: 'relative',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F4D03F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
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
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: '#F5F1E8',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#02050a',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#02050a',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
    fontWeight: '400',
  },
  requirementCard: {
    backgroundColor: '#1E3A5F', // Deep navy blue
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  enhancedRequirementCard: {
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
  progressSection: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
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
    color: '#F4D03F',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  requirementTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  requirementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 12,
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  enhancedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  enhancedStatusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  requiredIndicator: {
    marginLeft: 6,
  },
  requiredBadge: {
    backgroundColor: '#E8A598', // Soft coral
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  requiredText: {
    color: '#02050a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  requirementDescription: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.9,
    fontWeight: '400',
  },
  requirementDetails: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  requirementDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requirementDetailText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 10,
    fontWeight: '500',
  },
  linkText: {
    color: '#F4D03F', // Bright yellow
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  completedDate: {
    fontSize: 13,
    color: '#2D5A3D', // Forest green
    fontStyle: 'italic',
    marginTop: 12,
    fontWeight: '500',
  },
  // Upload Section Styles
  uploadSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#F4D03F', // Bright yellow
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  uploadingButton: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#02050a', // Dark navy for yellow button
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  lockedUploadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 90, 61, 0.2)', // Forest green with opacity
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#76962D', // Forest green
  },
  lockedText: {
    color: '#76962D', // Forest green
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#1E3A5F', // Deep navy blue
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: 350,
    width: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'System',
  },
  successMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
    opacity: 0.9,
    fontWeight: '400',
  },
  successButton: {
    backgroundColor: '#F4D03F', // Bright yellow
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    minWidth: 120,
  },
  successButtonText: {
    color: '#02050a', // Dark navy for yellow button
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Skeleton Loading Styles
  skeletonRequirementCard: {
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
  skeletonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  skeletonTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  skeletonTitle: {
    width: '70%',
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    marginRight: 12,
  },
  skeletonStatusBadge: {
    width: 80,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
  },
  skeletonExpandIcon: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
  },
  skeletonProgressSection: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  skeletonProgressLabel: {
    width: 60,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonProgressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  skeletonProgressText: {
    width: 30,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    marginLeft: 12,
  },
});

export default RequirementsPage;
