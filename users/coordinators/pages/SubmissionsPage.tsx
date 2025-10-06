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
  TextInput,
  Switch,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';

interface SubmissionsPageProps {
  currentUser: {
    id: string;
    email: string;
    user_type: string;
    google_id?: string;
  } | null;
}

interface Submission {
  id: number;
  student_id: number;
  student: {
    first_name: string;
    last_name: string;
    id_number: string;
    program: string;
    major: string;
    university: string;
  };
  requirement_id: string;
  requirement_name: string;
  requirement_description: string;
  due_date: string;
  submitted_file_url: string;
  submitted_file_name: string;
  submitted_file_size: number;
  submitted_at: string;
  status: 'submitted' | 'approved' | 'rejected' | 'needs_revision';
  coordinator_feedback: string;
  coordinator_reviewed_at: string;
}

interface Requirement {
  id: number;
  requirement_id: string;
  requirement_name: string;
  requirement_description: string;
  is_required: boolean;
  due_date: string;
  file_url: string;
  file_name: string;
  created_at: string;
  coordinator_id: number;
  submitted_students: {
    id: number;
    student_id: number;
    student_name: string;
    submitted_at: string;
    status: string;
  }[];
}

const SubmissionsPage = ({ currentUser }: SubmissionsPageProps) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submissionCounts, setSubmissionCounts] = useState<{[key: string]: number}>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'pending'>('all');
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchSubmissions();
    fetchRequirements();
    
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
  }, [selectedStatus]);

  // Pre-fetch submission counts for all requirements
  useEffect(() => {
    if (requirements.length > 0) {
      preFetchSubmissionCounts();
    }
  }, [requirements]);

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

  const fetchSubmissions = async () => {
    if (!currentUser) {
      console.log('❌ No current user available');
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Fetching submissions for coordinator:', currentUser.id);
      
      const response = await apiService.getCoordinatorSubmissions(
        currentUser.id,
        selectedStatus === 'all' ? undefined : selectedStatus
      );
      
      if (response.success) {
        console.log('📋 Found submissions:', response.data?.length || 0);
        setSubmissions(response.data || []);
      } else {
        console.log('❌ Failed to fetch submissions:', response.message);
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequirements = async () => {
    if (!currentUser) {
      console.log('❌ No current user available for requirements');
      return;
    }

    try {
      setLoadingRequirements(true);
      setShowSkeleton(true);
      console.log('📋 Fetching requirements for coordinator:', currentUser.id);
      
      // Step 1: Fetch requirements that the current coordinator added (from student_requirements table)
      const requirementsResponse = await apiService.getCoordinatorRequirements(currentUser.id);
      console.log('🔍 Coordinator requirements response:', requirementsResponse);
      
      if (requirementsResponse.success && requirementsResponse.requirements) {
        console.log('📋 Found requirements from coordinator:', requirementsResponse.requirements.length);
        
        // Initialize requirements with empty submitted_students array
        const requirementsWithEmptySubmissions = requirementsResponse.requirements.map((req: any) => ({
          ...req,
          submitted_students: [] // Will be populated when people icon is clicked
        }));
        
        console.log('📋 Setting requirements with empty submissions:', requirementsWithEmptySubmissions);
        setRequirements(requirementsWithEmptySubmissions);
      } else {
        console.log('❌ No requirements found for coordinator');
        setRequirements([]);
      }
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setRequirements([]);
    } finally {
      setLoadingRequirements(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  // Function to fetch submissions for a specific requirement when people icon is clicked
  const fetchSubmissionsForRequirement = async (requirementId: string) => {
    if (!currentUser) {
      console.log('❌ No current user available for submissions');
      return [];
    }

    try {
      console.log('📋 Fetching submissions for requirement:', requirementId);
      
      // Step 2: Fetch submitted requirements by students (from student_submitted_requirements table)
      const submissionsResponse = await apiService.getCoordinatorSubmissions(currentUser.id);
      console.log('🔍 All submissions response:', submissionsResponse);
      
      if (submissionsResponse.success && submissionsResponse.data) {
        // Filter submissions for this specific requirement
        const requirementSubmissions = submissionsResponse.data
          .filter((sub: any) => sub.requirement_id === requirementId)
          .map((sub: any) => ({
            id: sub.id, // Include the actual submission ID
            student_id: sub.student_id,
            student_name: `${sub.student.first_name} ${sub.student.last_name}`,
            submitted_at: sub.submitted_at,
            status: sub.status,
            submitted_file_url: sub.submitted_file_url,
            submitted_file_name: sub.submitted_file_name,
            submitted_file_size: sub.submitted_file_size,
            coordinator_feedback: sub.coordinator_feedback
          }));
        
        console.log(`📋 Found ${requirementSubmissions.length} submissions for requirement ${requirementId}`);
        
        // Update submission count for this requirement
        setSubmissionCounts(prev => ({
          ...prev,
          [requirementId]: requirementSubmissions.length
        }));
        
        return requirementSubmissions;
      } else {
        console.log('❌ No submissions found');
        return [];
      }
    } catch (error) {
      console.error('Error fetching submissions for requirement:', error);
      return [];
    }
  };

  // Pre-fetch submission counts for all requirements
  const preFetchSubmissionCounts = async () => {
    if (!currentUser) return;

    try {
      console.log('📋 Pre-fetching submission counts for all requirements');
      const submissionsResponse = await apiService.getCoordinatorSubmissions(currentUser.id);
      
      if (submissionsResponse.success && submissionsResponse.data) {
        const counts: {[key: string]: number} = {};
        
        // Count submissions for each requirement
        requirements.forEach(req => {
          const count = submissionsResponse.data.filter((sub: any) => 
            sub.requirement_id === req.requirement_id
          ).length;
          counts[req.requirement_id] = count;
        });
        
        console.log('📋 Pre-fetched submission counts:', counts);
        setSubmissionCounts(counts);
      }
    } catch (error) {
      console.error('Error pre-fetching submission counts:', error);
    }
  };

  const handleStatusUpdate = async (submissionId: number, newStatus: string) => {
    try {
      console.log('🔄 Updating submission status:', { submissionId, newStatus, feedback });
      
      const response = await apiService.updateSubmissionStatus(
        submissionId.toString(),
        newStatus,
        feedback.trim() || undefined
      );
      
      if (response.success) {
        Alert.alert('Success', 'Submission status updated successfully');
        setShowDetailsModal(false);
        setFeedback('');
        await fetchSubmissions();
      } else {
        Alert.alert('Error', 'Failed to update submission status');
      }
    } catch (error) {
      console.error('Error updating submission status:', error);
      Alert.alert('Error', 'Failed to update submission status');
    }
  };

  const handleToggleSubmissionStatus = async (submissionId: number, isApproved: boolean) => {
    try {
      // Convert boolean to status
      const newStatus = isApproved ? 'approved' : 'submitted';
      
      console.log('🔄 Toggling submission status:', { submissionId, isApproved, newStatus });
      
      const response = await apiService.updateSubmissionStatus(
        submissionId.toString(),
        newStatus,
        undefined
      );
      
      if (response.success) {
        console.log('✅ Database save successful, updating UI...');
        
        // Update the local state to reflect the change immediately
        setSelectedSubmission(prev => {
          if (!prev) return prev;
          
          if (prev.id === 0 && (prev as any).submissions) {
            // Update in the submissions array
            const updatedSubmissions = (prev as any).submissions.map((sub: any) => 
              sub.id === submissionId 
                ? { ...sub, status: newStatus }
                : sub
            );
            return { ...prev, submissions: updatedSubmissions } as any;
          }
          
          return prev;
        });
        
        // Also refresh the main submissions list and requirements to ensure data consistency
        await fetchSubmissions();
        await fetchRequirements();
        
        // Show success feedback
        console.log('✅ UI updated successfully');
        
        // Brief visual feedback (optional - you can remove this if you don't want alerts)
        // Alert.alert('Success', `Submission marked as ${isApproved ? 'Done' : 'Pending'}`);
      } else {
        console.log('❌ Database save failed:', response.message);
        Alert.alert('Error', 'Failed to update submission status');
      }
    } catch (error) {
      console.error('Error toggling submission status:', error);
      Alert.alert('Error', 'Failed to update submission status');
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      console.log('📥 Downloading file:', fileName);
      
      if (Platform.OS === 'web') {
        // Use browser download for web
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Download Started', `File "${fileName}" download has started.`);
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

  const handleDownloadStudentFile = async (fileUrl: string, fileName: string) => {
    try {
      console.log('📥 Downloading student file:', fileName);
      
      if (Platform.OS === 'web') {
        // Use browser download for web
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Download Started', `Student file "${fileName}" download has started.`);
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
      console.error('Error downloading student file:', error);
      Alert.alert('Error', 'Failed to download student file');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return '#FFA500';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'needs_revision': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return 'schedule';
      case 'approved': return 'check-circle';
      case 'rejected': return 'cancel';
      case 'needs_revision': return 'edit';
      default: return 'help';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isSubmissionDone = (status: string) => {
    return status === 'approved' || status === 'rejected';
  };

  const getFilteredSubmissions = (submissions: any[]) => {
    if (statusFilter === 'all') return submissions;
    if (statusFilter === 'done') return submissions.filter(sub => isSubmissionDone(sub.status));
    if (statusFilter === 'pending') return submissions.filter(sub => !isSubmissionDone(sub.status));
    return submissions;
  };


  // Skeleton Components
  const SkeletonRequirementCard = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonRequirementCard}>
        <View style={styles.skeletonRequirementRow}>
          <View style={styles.skeletonRequirementInfo}>
            <Animated.View style={[styles.skeletonRequirementNumber, { opacity: shimmerOpacity }]} />
            <View style={styles.skeletonRequirementDetails}>
              <Animated.View style={[styles.skeletonTextLine, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonTextLine, { width: '80%', opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonTextLine, { width: '60%', opacity: shimmerOpacity }]} />
            </View>
          </View>
          <Animated.View style={[styles.skeletonSubmissionCountButton, { opacity: shimmerOpacity }]} />
        </View>
      </View>
    );
  };

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No user logged in</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading submissions...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.title}>Requirements & Submissions</Text>
        <Text style={styles.subtitle}>View requirements and track student submissions</Text>
      </Animated.View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'submitted', 'approved', 'rejected', 'needs_revision'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonActive
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === status && styles.filterButtonTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Done/Pending Toggle */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Filter by Status:</Text>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              statusFilter === 'all' && styles.toggleButtonActive
            ]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[
              styles.toggleButtonText,
              statusFilter === 'all' && styles.toggleButtonTextActive
            ]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              statusFilter === 'pending' && styles.toggleButtonActive
            ]}
            onPress={() => setStatusFilter('pending')}
          >
            <Text style={[
              styles.toggleButtonText,
              statusFilter === 'pending' && styles.toggleButtonTextActive
            ]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              statusFilter === 'done' && styles.toggleButtonActive
            ]}
            onPress={() => setStatusFilter('done')}
          >
            <Text style={[
              styles.toggleButtonText,
              statusFilter === 'done' && styles.toggleButtonTextActive
            ]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Requirements List */}
      <Animated.ScrollView style={[styles.submissionsList, { transform: [{ scale: scaleAnim }] }]}>
        {showSkeleton ? (
          <>
            <SkeletonRequirementCard />
            <SkeletonRequirementCard />
            <SkeletonRequirementCard />
          </>
        ) : requirements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={64} color="#02050a" />
            <Text style={styles.emptyText}>No requirements found</Text>
            <Text style={styles.emptySubtext}>
              No requirements assigned to your students yet
            </Text>
          </View>
        ) : (
          requirements.map((requirement, index) => {
            const submissionCount = submissionCounts[requirement.requirement_id] || 0;
            
            return (
              <View
                key={requirement.id}
                style={styles.requirementCard}
              >
                <View style={styles.requirementRow}>
                  <View style={styles.requirementInfo}>
                    <Text style={styles.requirementNumber}>{index + 1}.</Text>
                    <View style={styles.requirementDetails}>
                      <Text style={styles.requirementName}>{requirement.requirement_name}</Text>
                      <Text style={styles.requirementDescription}>
                        {requirement.requirement_description}
                      </Text>
                      <Text style={styles.requirementDate}>
                        Due: {requirement.due_date ? formatDate(requirement.due_date) : 'No due date'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.requirementRightSection}>
                    <View style={[styles.requirementBadge, { backgroundColor: requirement.is_required ? '#E8A598' : '#2D5A3D' }]}>
                      <Text style={styles.requirementBadgeText}>
                        {requirement.is_required ? 'REQUIRED' : 'OPTIONAL'}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.submissionCountButton}
                      onPress={async () => {
                        // Fetch submissions for this specific requirement
                        console.log('👥 People icon clicked for requirement:', requirement.requirement_id);
                        const submissions = await fetchSubmissionsForRequirement(requirement.requirement_id);
                        
                        // Show submission details modal
                        const modalData = {
                          id: 0,
                          student_id: 0,
                          student: {
                            first_name: '',
                            last_name: '',
                            id_number: '',
                            program: '',
                            major: '',
                            university: ''
                          },
                          requirement_id: requirement.requirement_id,
                          requirement_name: requirement.requirement_name,
                          requirement_description: requirement.requirement_description,
                          due_date: requirement.due_date,
                          submitted_file_url: '',
                          submitted_file_name: '',
                          submitted_file_size: 0,
                          submitted_at: '',
                          status: 'submitted',
                          coordinator_feedback: '',
                          coordinator_reviewed_at: '',
                          submissions: submissions // Add the fetched submissions
                        } as any;
                        
                        setSelectedSubmission(modalData);
                        setShowDetailsModal(true);
                      }}
                    >
                      <MaterialIcons name="people" size={24} color="#F4D03F" />
                      <Text style={styles.submissionCountText}>
                        {submissionCount}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </Animated.ScrollView>

      {/* Submission Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submission Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {selectedSubmission && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Requirement</Text>
                <Text style={styles.detailValue}>{selectedSubmission.requirement_name}</Text>
                <Text style={styles.detailDescription}>{selectedSubmission.requirement_description}</Text>
                <Text style={styles.detailValue}>
                  Due: {selectedSubmission.due_date ? formatDate(selectedSubmission.due_date) : 'No due date'}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>
                  Student Submissions ({selectedSubmission.id === 0 ? 
                    (selectedSubmission as any).submissions?.length || 0 
                    : 1})
                </Text>
                {selectedSubmission.id === 0 ? (
                  // Show list of students who submitted this requirement (dynamically fetched)
                  getFilteredSubmissions((selectedSubmission as any).submissions || []).map((student: any, index: number) => (
                    <View key={student.student_id} style={styles.studentSubmissionItem}>
                      <View style={styles.studentSubmissionInfo}>
                        <Text style={styles.studentSubmissionName}>{student.student_name}</Text>
                        <Text style={styles.studentSubmissionDate}>
                          Submitted: {formatDate(student.submitted_at)}
                        </Text>
                        {student.submitted_file_name && (
                          <View style={styles.fileInfoContainer}>
                            <Text style={styles.studentSubmissionFile}>
                              File: {student.submitted_file_name}
                            </Text>
                            <TouchableOpacity
                              style={styles.downloadButton}
                              onPress={() => handleDownloadStudentFile(student.submitted_file_url, student.submitted_file_name)}
                            >
                              <MaterialIcons name="download" size={16} color="#007AFF" />
                              <Text style={styles.downloadButtonText}>Download</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                      <View style={styles.studentSubmissionRight}>
                        <View style={styles.statusContainer}>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(student.status) }]}>
                            <MaterialIcons 
                              name={getStatusIcon(student.status)} 
                              size={14} 
                              color="white" 
                            />
                            <Text style={styles.statusText}>
                              {student.status.replace('_', ' ').toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>
                              {student.status === 'approved' ? 'Done' : 'Pending'}
                            </Text>
                            <Switch
                              value={student.status === 'approved'}
                              onValueChange={(value) => handleToggleSubmissionStatus(student.id, value)}
                              trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                              thumbColor={student.status === 'approved' ? '#FFFFFF' : '#FFFFFF'}
                              ios_backgroundColor="#E0E0E0"
                            />
                          </View>
                        </View>
                        {student.coordinator_feedback && (
                          <Text style={styles.feedbackText}>
                            Feedback: {student.coordinator_feedback}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  // Show single submission details
                  <View style={styles.studentSubmissionItem}>
                    <View style={styles.studentSubmissionInfo}>
                      <Text style={styles.studentSubmissionName}>
                        {selectedSubmission.student.first_name} {selectedSubmission.student.last_name}
                      </Text>
                      <Text style={styles.studentSubmissionDate}>
                        Submitted: {formatDate(selectedSubmission.submitted_at)}
                      </Text>
                      <View style={styles.fileInfoContainer}>
                        <Text style={styles.studentSubmissionFile}>
                          File: {selectedSubmission.submitted_file_name} ({formatFileSize(selectedSubmission.submitted_file_size)})
                        </Text>
                        <TouchableOpacity
                          style={styles.downloadButton}
                          onPress={() => handleDownloadStudentFile(selectedSubmission.submitted_file_url, selectedSubmission.submitted_file_name)}
                        >
                          <MaterialIcons name="download" size={16} color="#007AFF" />
                          <Text style={styles.downloadButtonText}>Download</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.studentSubmissionRight}>
                      <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedSubmission.status) }]}>
                          <MaterialIcons 
                            name={getStatusIcon(selectedSubmission.status)} 
                            size={14} 
                            color="white" 
                          />
                          <Text style={styles.statusText}>
                            {selectedSubmission.status.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.switchContainer}>
                          <Text style={styles.switchLabel}>
                            {selectedSubmission.status === 'approved' ? 'Done' : 'Pending'}
                          </Text>
                          <Switch
                            value={selectedSubmission.status === 'approved'}
                            onValueChange={(value) => handleToggleSubmissionStatus(selectedSubmission.id, value)}
                            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                            thumbColor={selectedSubmission.status === 'approved' ? '#FFFFFF' : '#FFFFFF'}
                            ios_backgroundColor="#E0E0E0"
                          />
                        </View>
                      </View>
                      {selectedSubmission.coordinator_feedback && (
                        <Text style={styles.feedbackText}>
                          Feedback: {selectedSubmission.coordinator_feedback}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {selectedSubmission.id !== 0 && selectedSubmission.coordinator_feedback && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Feedback</Text>
                  <Text style={styles.detailValue}>{selectedSubmission.coordinator_feedback}</Text>
                </View>
              )}

              {selectedSubmission.id !== 0 && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Feedback</Text>
                    <Text style={styles.inputLabel}>Add feedback (optional)</Text>
                    <TextInput
                      style={styles.textArea}
                      multiline
                      numberOfLines={4}
                      placeholder="Enter your feedback here..."
                      value={feedback}
                      onChangeText={setFeedback}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#4CAF50' }]}
                      onPress={() => handleStatusUpdate(selectedSubmission.id, 'approved')}
                    >
                      <MaterialIcons name="check" size={20} color="white" />
                      <Text style={styles.statusButtonText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#F44336' }]}
                      onPress={() => handleStatusUpdate(selectedSubmission.id, 'rejected')}
                    >
                      <MaterialIcons name="close" size={20} color="white" />
                      <Text style={styles.statusButtonText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#2196F3' }]}
                      onPress={() => handleStatusUpdate(selectedSubmission.id, 'needs_revision')}
                    >
                      <MaterialIcons name="edit" size={20} color="white" />
                      <Text style={styles.statusButtonText}>Needs Revision</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          )}
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
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#F4D03F', // Bright yellow
    marginTop: 4,
    opacity: 0.9,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#2D5A3D', // Forest green
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  submissionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#F5F1E8',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#02050a',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#02050a',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  submissionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  submissionContent: {
    marginBottom: 12,
  },
  submissionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fileInfo: {
    fontSize: 14,
    color: '#007AFF',
  },
  submissionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f8ff',
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F1E8', // Soft cream background
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E3A5F', // Deep navy blue
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  detailValue: {
    fontSize: 14,
    color: '#02050a',
    marginBottom: 6,
    fontWeight: '500',
  },
  detailDescription: {
    fontSize: 13,
    color: '#02050a',
    lineHeight: 20,
    opacity: 0.8,
  },
  inputLabel: {
    fontSize: 16,
    color: '#1E3A5F',
    marginBottom: 12,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#02050a',
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.1,
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#007AFF',
  },
  // Requirement Card Styles
  requirementCard: {
    backgroundColor: '#1E3A5F', // Deep navy blue
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
    minHeight: 100, // Ensure enough height for absolute positioning
    padding: 20,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    position: 'relative',
  },
  requirementInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  requirementRightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    position: 'relative',
  },
  requirementNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F4D03F', // Bright yellow
    marginRight: 12,
    marginTop: 2,
  },
  requirementDetails: {
    flex: 1,
  },
  requirementName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  requirementDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    lineHeight: 20,
    opacity: 0.9,
  },
  requirementDate: {
    fontSize: 12,
    color: '#E8A598', // Soft coral
    fontWeight: '500',
    marginTop: 4,
  },
  requirementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    position: 'absolute',
    bottom: 0,
    right: 0,
    marginRight: 60, // Space for the submission count button
  },
  requirementBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  submissionCountButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#2D5A3D', // Dark green/teal
    borderRadius: 12,
    minWidth: 60,
    position: 'absolute',
    top: 0,
    right: 0,
    shadowColor: '#2D5A3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submissionCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F4D03F',
    marginTop: 4,
  },
  // Skeleton Loading Styles
  skeletonRequirementCard: {
    backgroundColor: '#1E3A5F',
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
    opacity: 0.7,
    padding: 20,
  },
  skeletonRequirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonRequirementInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  skeletonRequirementNumber: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    marginRight: 12,
    marginTop: 2,
  },
  skeletonRequirementDetails: {
    flex: 1,
  },
  skeletonTextLine: {
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubmissionCountButton: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
  },
  // Student Submission Item Styles
  studentSubmissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  studentSubmissionInfo: {
    flex: 1,
  },
  studentSubmissionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  studentSubmissionDate: {
    fontSize: 13,
    color: '#02050a',
    marginBottom: 3,
    opacity: 0.7,
  },
  studentSubmissionFile: {
    fontSize: 13,
    color: '#2D5A3D',
    fontWeight: '500',
  },
  // Toggle Container Styles
  toggleContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#02050a',
    marginBottom: 12,
  },
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#2D5A3D', // Forest green
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  // File Info Container Styles
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D5A3D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    shadowColor: '#2D5A3D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  downloadButtonText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  // Student Submission Right Styles
  studentSubmissionRight: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchLabel: {
    fontSize: 12,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 11,
    color: '#02050a',
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'right',
    opacity: 0.8,
  },
});

export default SubmissionsPage;
  