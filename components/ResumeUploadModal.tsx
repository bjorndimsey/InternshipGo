import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { CloudinaryService } from '../lib/cloudinaryService';
import { apiService } from '../lib/api';

interface ResumeUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onApplicationSubmitted: () => void;
  companyName: string;
  companyId: string;
  studentId: string;
  position: string;
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  publicId: string;
  uploadDate: string;
  size: number;
  type?: string;
}

export default function ResumeUploadModal({
  visible,
  onClose,
  onApplicationSubmitted,
  companyName,
  companyId,
  studentId,
  position,
}: ResumeUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [coverLetter, setCoverLetter] = useState('');
  const [motivation, setMotivation] = useState('');
  const [availability, setAvailability] = useState('');
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [hoursOfInternship, setHoursOfInternship] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleFilePicker = async (fileType: 'resume' | 'transcript') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await uploadFile(file, fileType);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadFile = async (file: any, fileType: 'resume' | 'transcript') => {
    try {
      setUploading(true);
      
      // Create a blob from the file URI
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Upload to Cloudinary
      const uploadResult = await CloudinaryService.uploadPDF(
        blob,
        fileType === 'resume' ? 'Resumes' : 'Transcripts',
        `${studentId}_${companyId}` // Pass student and company IDs for proper folder structure
      );

      if (uploadResult.success && uploadResult.url && uploadResult.public_id) {
        const newFile: UploadedFile = {
          id: uploadResult.public_id,
          name: file.name || `${fileType} Document`,
          url: uploadResult.url,
          publicId: uploadResult.public_id,
          uploadDate: new Date().toISOString(),
          size: file.size || 0,
          type: fileType,
        };

        setUploadedFiles(prev => [newFile, ...prev]);
        
        Alert.alert(
          'Success',
          `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded successfully!`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', `Failed to upload ${fileType}. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitApplication = async () => {
    try {
      if (uploadedFiles.length === 0) {
        Alert.alert('Required', 'Please upload at least your resume before submitting.');
        return;
      }

      setUploading(true);

      const resumeFile = uploadedFiles.find(file => file.type === 'resume');
      const transcriptFile = uploadedFiles.find(file => file.type === 'transcript');

      const applicationData = {
        studentId,
        companyId,
        position,
        coverLetter: coverLetter.trim() || undefined,
        resumeUrl: resumeFile?.url,
        resumePublicId: resumeFile?.publicId,
        transcriptUrl: transcriptFile?.url,
        transcriptPublicId: transcriptFile?.publicId,
        expectedStartDate: expectedStartDate || undefined,
        expectedEndDate: expectedEndDate || undefined,
        availability: availability.trim() || undefined,
        motivation: motivation.trim() || undefined,
        hoursOfInternship: hoursOfInternship.trim() || undefined,
      };

      const response = await apiService.submitApplication(applicationData);

      if (response.success) {
        // Show success modal instead of alert
        setSuccessMessage(`Your application for ${position} at ${companyName} has been submitted successfully!`);
        setShowSuccessModal(true);
      } else {
        throw new Error(response.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Application submission error:', error);
      
      // Check if it's a specific error message from the API
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('already applied')) {
        showError(
          'Application Already Submitted',
          `You have already applied to ${companyName}. Please wait for the company to review your existing application.`
        );
      } else if (errorMessage.includes('Missing required fields')) {
        showError(
          'Missing Information',
          'Please fill in all required fields before submitting your application.'
        );
      } else {
        showError(
          'Submission Failed',
          'Failed to submit your application. Please check your connection and try again.'
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setUploadedFiles([]);
    setCoverLetter('');
    setMotivation('');
    setAvailability('');
    setExpectedStartDate('');
    setExpectedEndDate('');
    setHoursOfInternship('');
    onClose();
  };

  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    setErrorTitle('');
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
    onApplicationSubmitted();
    handleClose();
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Apply to {companyName}</Text>
            <Text style={styles.subtitle}>Position: {position}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Resume Upload Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Required Documents</Text>
              
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleFilePicker('resume')}
                disabled={uploading}
              >
                <MaterialIcons name="upload-file" size={24} color="#4285f4" />
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Upload Resume (PDF)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadButton, styles.secondaryButton]}
                onPress={() => handleFilePicker('transcript')}
                disabled={uploading}
              >
                <MaterialIcons name="school" size={24} color="#34a853" />
                <Text style={[styles.uploadButtonText, styles.secondaryButtonText]}>
                  {uploading ? 'Uploading...' : 'Upload Transcript (PDF) - Optional'}
                </Text>
              </TouchableOpacity>

              {uploadedFiles.length > 0 && (
                <View style={styles.uploadedFiles}>
                  <Text style={styles.uploadedFilesTitle}>Uploaded Files:</Text>
                  {uploadedFiles.map((file) => (
                    <View key={file.id} style={styles.fileItem}>
                      <MaterialIcons 
                        name={file.type === 'resume' ? 'description' : 'school'} 
                        size={20} 
                        color={file.type === 'resume' ? '#4285f4' : '#34a853'} 
                      />
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity onPress={() => removeFile(file.id)}>
                        <MaterialIcons name="close" size={20} color="#ea4335" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Application Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Application Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cover Letter (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  value={coverLetter}
                  onChangeText={setCoverLetter}
                  placeholder="Tell us why you're interested in this position..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Motivation (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  value={motivation}
                  onChangeText={setMotivation}
                  placeholder="What motivates you to work in this field?"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Availability (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={availability}
                  onChangeText={setAvailability}
                  placeholder="e.g., Full-time during summer, Part-time during semester"
                />
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.inputLabel}>Expected Start Date (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={expectedStartDate}
                    onChangeText={setExpectedStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.dateInput}>
                  <Text style={styles.inputLabel}>Expected End Date (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={expectedEndDate}
                    onChangeText={setExpectedEndDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Total Hours of Internship</Text>
                <TextInput
                  style={styles.textInput}
                  value={hoursOfInternship}
                  onChangeText={setHoursOfInternship}
                  placeholder="e.g., 136 hours "
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={uploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, uploading && styles.disabledButton]}
              onPress={handleSubmitApplication}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closeErrorModal}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContent}>
            <View style={styles.errorIconContainer}>
              <MaterialIcons name="error" size={60} color="#ea4335" />
            </View>
            <Text style={styles.errorTitle}>{errorTitle}</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={closeErrorModal}
            >
              <Text style={styles.errorButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={80} color="#34a853" />
            </View>
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <Text style={styles.successSubtext}>
              You will be notified about the status of your application.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={closeSuccessModal}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
    maxWidth: 500,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: '#f0f8f0',
    borderColor: '#d0e8d0',
  },
  uploadButtonText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#4285f4',
  },
  secondaryButtonText: {
    color: '#34a853',
  },
  uploadedFiles: {
    marginTop: 12,
  },
  uploadedFilesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 4,
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a2e',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a2e',
    minHeight: 80,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#4285f4',
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Error Modal Styles
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ea4335',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  errorButton: {
    backgroundColor: '#ea4335',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
    padding: 30,
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
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
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  successButton: {
    backgroundColor: '#34a853',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
