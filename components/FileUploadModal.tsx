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
  Dimensions,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CloudinaryService } from '../lib/cloudinaryService';
import { apiService } from '../lib/api';

const { width } = Dimensions.get('window');

interface FileUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (url: string, publicId: string) => void;
  companyName: string;
  companyId: string;
  uploadedBy: string; // User ID of the coordinator who uploaded
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

export default function FileUploadModal({
  visible,
  onClose,
  onUploadSuccess,
  companyName,
  companyId,
  uploadedBy,
}: FileUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await uploadFile(file);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadFile = async (file: any) => {
    try {
      setUploading(true);
      
      // Create a blob from the file URI
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Upload to Cloudinary
      const uploadResult = await CloudinaryService.uploadPDF(
        blob,
        'MOAs', // Upload to MOAs folder
        companyId // Pass companyId for proper folder structure
      );

      if (uploadResult.success && uploadResult.url && uploadResult.public_id) {
        // Save to database
        try {
          const dbResult = await apiService.updateCompanyMOA(
            companyId,
            uploadResult.url,
            uploadResult.public_id,
            uploadedBy
          );

          if (dbResult.success) {
            const newFile: UploadedFile = {
              id: uploadResult.public_id,
              name: file.name || 'MOA Document',
              url: uploadResult.url,
              publicId: uploadResult.public_id,
              uploadDate: new Date().toISOString(),
              size: file.size || 0,
            };

            setUploadedFiles(prev => [newFile, ...prev]);
            onUploadSuccess(uploadResult.url, uploadResult.public_id);
            
            Alert.alert(
              'Success',
              'MOA document uploaded and saved successfully!',
              [{ text: 'OK' }]
            );
          } else {
            throw new Error(dbResult.message || 'Failed to save to database');
          }
        } catch (dbError) {
          console.error('Database save error:', dbError);
          Alert.alert(
            'Upload Warning',
            'File uploaded to cloud but failed to save to database. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Failed to upload file'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, publicId: string) => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this MOA document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deleteResult = await CloudinaryService.deletePDF(publicId);
              if (deleteResult.success) {
                setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
                Alert.alert('Success', 'File deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete file');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ]
    );
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
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="description" size={24} color="#4285f4" />
              <View style={styles.headerText}>
                <Text style={styles.title}>MOA Document Upload</Text>
                <Text style={styles.subtitle}>{companyName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Upload Section */}
          <View style={styles.uploadSection}>
            <View style={styles.uploadArea}>
              <MaterialIcons name="cloud-upload" size={48} color="#4285f4" />
              <Text style={styles.uploadTitle}>Upload MOA Document</Text>
              <Text style={styles.uploadSubtitle}>
                Select a PDF file to upload as the Memorandum of Agreement
              </Text>
              
              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleFilePicker}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <Text style={styles.uploadButtonText}>
                      {uploading ? 'Uploading...' : 'Select PDF File'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Uploaded Files Section */}
          {uploadedFiles.length > 0 && (
            <View style={styles.filesSection}>
              <Text style={styles.filesTitle}>Uploaded Documents</Text>
              <ScrollView style={styles.filesList} showsVerticalScrollIndicator={false}>
                {uploadedFiles.map((file) => (
                  <View key={file.id} style={styles.fileItem}>
                    <View style={styles.fileInfo}>
                      <MaterialIcons name="picture-as-pdf" size={24} color="#ea4335" />
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Text style={styles.fileMeta}>
                          {formatFileSize(file.size)} • {formatDate(file.uploadDate)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.fileActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          console.log('📁 ===== FILE VIEW/DOWNLOAD =====');
                          console.log('📄 File Details:', {
                            id: file.id,
                            name: file.name,
                            url: file.url,
                            publicId: file.publicId,
                            size: file.size,
                            type: file.type
                          });
                          
                          // Open PDF viewer or download
                          Alert.alert(
                            'View Document',
                            'Would you like to view or download this document?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Debug Info', 
                                onPress: async () => {
                                  try {
                                    console.log('🔍 Testing file URL accessibility...');
                                    const canOpen = await Linking.canOpenURL(file.url);
                                    console.log('✅ Can open file URL:', canOpen);
                                    
                                    const response = await fetch(file.url, { method: 'HEAD' });
                                    console.log('📊 File URL Response:', {
                                      ok: response.ok,
                                      status: response.status,
                                      contentType: response.headers.get('content-type'),
                                      contentLength: response.headers.get('content-length')
                                    });
                                    
                                    Alert.alert('Debug Info', 'Check console for file URL debug information');
                                  } catch (error) {
                                    console.error('❌ File URL test error:', error);
                                    Alert.alert('Debug Error', 'Failed to test file URL');
                                  }
                                }
                              },
                              { 
                                text: 'View', 
                                onPress: async () => {
                                  try {
                                    console.log('👁️ Opening file in browser for viewing...');
                                    const canOpen = await Linking.canOpenURL(file.url);
                                    if (canOpen) {
                                      await Linking.openURL(file.url);
                                      console.log('✅ File opened in browser');
                                    } else {
                                      throw new Error('Cannot open file URL');
                                    }
                                  } catch (error) {
                                    console.error('❌ Error opening file:', error);
                                    Alert.alert('Error', 'Could not open file in browser');
                                  }
                                }
                              },
                              { 
                                text: 'Download', 
                                onPress: async () => {
                                  try {
                                    console.log('📥 Starting file download...');
                                    console.log('🔗 File URL:', file.url);
                                    
                                    // Check if FileSystem is available
                                    if (!FileSystem.documentDirectory) {
                                      throw new Error('FileSystem not available');
                                    }
                                    
                                    // Create filename
                                    const fileName = file.name || `document_${file.id}.pdf`;
                                    const fileUri = FileSystem.documentDirectory + fileName;
                                    
                                    console.log('💾 Download Details:', {
                                      sourceUrl: file.url,
                                      targetPath: fileUri,
                                      fileName: fileName
                                    });
                                    
                                    const downloadResult = await FileSystem.downloadAsync(file.url, fileUri);
                                    
                                    console.log('📊 Download Result:', {
                                      status: downloadResult.status,
                                      uri: downloadResult.uri,
                                      success: downloadResult.status === 200
                                    });
                                    
                                    if (downloadResult.status === 200) {
                                      // Try to share the file
                                      const isAvailable = await Sharing.isAvailableAsync();
                                      if (isAvailable) {
                                        await Sharing.shareAsync(downloadResult.uri, {
                                          mimeType: file.type || 'application/pdf',
                                          dialogTitle: `Document - ${file.name}`
                                        });
                                        console.log('✅ File downloaded and shared successfully');
                                        Alert.alert('Success', 'File downloaded and shared successfully!');
                                      } else {
                                        console.log('⚠️ Sharing not available, file saved locally');
                                        Alert.alert('Downloaded', 'File downloaded successfully! Check your device\'s file manager.');
                                      }
                                    } else {
                                      throw new Error(`Download failed with status: ${downloadResult.status}`);
                                    }
                                  } catch (error) {
                                    console.error('❌ File download error:', error);
                                    Alert.alert('Download Error', `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                  }
                                }
                              },
                            ]
                          );
                        }}
                      >
                        <MaterialIcons name="visibility" size={20} color="#4285f4" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteFile(file.id, file.publicId)}
                      >
                        <MaterialIcons name="delete" size={20} color="#ea4335" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.sendButton} onPress={onClose}>
              <MaterialIcons name="send" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>Send MOA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 500,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  uploadSection: {
    padding: 20,
  },
  uploadArea: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  filesSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  filesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  filesList: {
    maxHeight: 200,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 12,
    color: '#666',
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sendButton: {
    backgroundColor: '#4285f4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
