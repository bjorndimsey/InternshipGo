import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { apiService } from '../../../lib/api';
import { CloudinaryService } from '../../../lib/cloudinaryService';
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

  // Debug: Log currentUser to see what we're getting
  console.log('🔍 RequirementsPage currentUser:', currentUser);
  console.log('🔍 currentUser.student_id:', currentUser?.student_id);

  useEffect(() => {
    fetchStudentRequirements();
  }, []);

  const fetchStudentRequirements = async () => {
    try {
      setLoadingRequirements(true);
      
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
        setRequirements(response.requirements);
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

  const getStatusColor = (completed: boolean) => {
    return completed ? '#4CAF50' : '#FF9800';
  };

  const getStatusText = (completed: boolean) => {
    return completed ? 'Completed' : 'Pending';
  };

  if (loadingRequirements) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading requirements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Requirements</Text>
        <Text style={styles.headerSubtitle}>
          {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} assigned
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {requirements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Requirements</Text>
            <Text style={styles.emptySubtitle}>
              Your coordinator hasn't assigned any requirements yet, or you may not be assigned to a coordinator.
            </Text>
          </View>
        ) : (
          requirements.map((requirement, index) => (
            <View key={requirement.id || index} style={styles.requirementCard}>
              <View style={styles.requirementHeader}>
                <View style={styles.requirementTitleContainer}>
                  <Text style={styles.requirementTitle}>{requirement.requirement_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(requirement.completed) }]}>
                    <Text style={styles.statusText}>{getStatusText(requirement.completed)}</Text>
                  </View>
                </View>
                {requirement.is_required && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                )}
              </View>

              {requirement.requirement_description && (
                <Text style={styles.requirementDescription}>
                  {requirement.requirement_description}
                </Text>
              )}

              <View style={styles.requirementDetails}>
                {requirement.due_date && (
                  <View style={styles.requirementDetailRow}>
                    <MaterialIcons name="schedule" size={16} color="#666" />
                    <Text style={styles.requirementDetailText}>
                      Due: {new Date(requirement.due_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {requirement.coordinator_first_name && (
                  <View style={styles.requirementDetailRow}>
                    <MaterialIcons name="person" size={16} color="#666" />
                    <Text style={styles.requirementDetailText}>
                      Assigned by: {requirement.coordinator_first_name} {requirement.coordinator_last_name}
                    </Text>
                  </View>
                )}
                
                {requirement.file_url && (
                  <View style={styles.requirementDetailRow}>
                    <MaterialIcons name="attach-file" size={16} color="#666" />
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
                      size={16} 
                      color="#fff" 
                    />
                    <Text style={styles.uploadButtonText}>
                      {uploadingFile === requirement.requirement_id ? 'Uploading...' : 'Upload PDF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {requirement.completed && requirement.completed_at && (
                <Text style={styles.completedDate}>
                  Completed on: {new Date(requirement.completed_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

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
              <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  requirementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requirementTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  requirementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requiredBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requirementDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  requirementDetails: {
    marginTop: 8,
  },
  requirementDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  linkText: {
    color: '#4285f4',
    textDecorationLine: 'underline',
  },
  completedDate: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Upload Section Styles
  uploadSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  uploadButton: {
    backgroundColor: '#4285f4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  uploadingButton: {
    backgroundColor: '#9aa0a6',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
    width: '90%',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: '#4285f4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default RequirementsPage;
