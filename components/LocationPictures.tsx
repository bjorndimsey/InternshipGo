import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../lib/api';

interface LocationPicture {
  id: string;
  url: string;
  description?: string;
  uploaded_at: string;
}

interface LocationPicturesProps {
  userId: string;
  onClose: () => void;
  onPicturesUpdated?: () => void;
}

export default function LocationPictures({ userId, onClose, onPicturesUpdated }: LocationPicturesProps) {
  const [pictures, setPictures] = useState<LocationPicture[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPicture, setSelectedPicture] = useState<LocationPicture | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newPictureDescription, setNewPictureDescription] = useState('');

  useEffect(() => {
    fetchLocationPictures();
  }, [userId]);

  const fetchLocationPictures = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLocationPictures(userId);
      
      if (response.success && response.pictures) {
        setPictures(response.pictures);
      } else {
        console.log('No location pictures found or error:', response.message);
        setPictures([]);
      }
    } catch (error) {
      console.error('Error fetching location pictures:', error);
      setPictures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPicture = () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async (event: any) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        await uploadPictures(files);
      }
    };
    
    input.click();
  };

  const uploadPictures = async (files: FileList) => {
    try {
      setUploading(true);
      const formData = new FormData();
      
      // Add all files to form data
      Array.from(files).forEach((file, index) => {
        formData.append(`pictures`, file);
      });
      
      // Add description if provided
      if (newPictureDescription.trim()) {
        formData.append('description', newPictureDescription.trim());
      }
      
      const response = await apiService.uploadLocationPictures(userId, formData);
      
      if (response.success) {
        Alert.alert('Success', 'Pictures uploaded successfully!');
        setNewPictureDescription('');
        setShowUploadModal(false);
        await fetchLocationPictures();
        if (onPicturesUpdated) {
          onPicturesUpdated();
        }
      } else {
        throw new Error(response.message || 'Failed to upload pictures');
      }
    } catch (error) {
      console.error('Error uploading pictures:', error);
      Alert.alert('Error', 'Failed to upload pictures. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePicture = async (pictureId: string) => {
    Alert.alert(
      'Delete Picture',
      'Are you sure you want to delete this picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteLocationPicture(pictureId);
              
              if (response.success) {
                Alert.alert('Success', 'Picture deleted successfully!');
                await fetchLocationPictures();
                if (onPicturesUpdated) {
                  onPicturesUpdated();
                }
              } else {
                throw new Error(response.message || 'Failed to delete picture');
              }
            } catch (error) {
              console.error('Error deleting picture:', error);
              Alert.alert('Error', 'Failed to delete picture. Please try again.');
            }
          }
        }
      ]
    );
  };

  const openPictureModal = (picture: LocationPicture) => {
    setSelectedPicture(picture);
  };

  const closePictureModal = () => {
    setSelectedPicture(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading pictures...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Location Pictures</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setShowUploadModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pictures Grid */}
      <ScrollView style={styles.picturesContainer}>
        {pictures.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="photo-camera" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Pictures Yet</Text>
            <Text style={styles.emptyText}>
              Upload pictures of your location to share with others
            </Text>
            <TouchableOpacity
              style={styles.uploadFirstButton}
              onPress={() => setShowUploadModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.uploadFirstButtonText}>Upload First Picture</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.picturesGrid}>
            {pictures.map((picture) => (
              <TouchableOpacity
                key={picture.id}
                style={styles.pictureItem}
                onPress={() => openPictureModal(picture)}
              >
                <Image 
                  source={{ uri: picture.url }} 
                  style={styles.pictureThumbnail}
                  onError={(error) => {
                    console.error('Image load error:', error);
                  }}
                />
                <View style={styles.pictureOverlay}>
                  <MaterialIcons name="zoom-in" size={24} color="#fff" />
                </View>
                {picture.description && (
                  <Text style={styles.pictureDescription} numberOfLines={2}>
                    {picture.description}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePicture(picture.id)}
                >
                  <MaterialIcons name="delete" size={16} color="#ea4335" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Location Pictures</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowUploadModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.uploadInstructions}>
                Select one or more pictures to upload. You can add a description for all pictures.
              </Text>
              
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Description (optional):</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={newPictureDescription}
                  onChangeText={setNewPictureDescription}
                  placeholder="Describe your location..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleUploadPicture}
                disabled={uploading}
              >
                <MaterialIcons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Select Pictures'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Picture View Modal */}
      <Modal
        visible={selectedPicture !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={closePictureModal}
      >
        <View style={styles.pictureModalOverlay}>
          <View style={styles.pictureModalContent}>
            {selectedPicture && (
              <>
                <Image 
                  source={{ uri: selectedPicture.url }} 
                  style={styles.fullPicture}
                  onError={(error) => {
                    console.error('Modal image load error:', error);
                  }}
                />
                {selectedPicture.description && (
                  <View style={styles.pictureInfo}>
                    <Text style={styles.pictureInfoText}>{selectedPicture.description}</Text>
                    <Text style={styles.pictureDate}>
                      Uploaded: {new Date(selectedPicture.uploaded_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.closePictureButton}
                  onPress={closePictureModal}
                >
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  closeButton: {
    padding: 4,
  },
  picturesContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  uploadFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285f4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  picturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pictureItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  pictureThumbnail: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  pictureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  pictureDescription: {
    padding: 8,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
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
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  uploadInstructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  pictureModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pictureModalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  fullPicture: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  pictureInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
  },
  pictureInfoText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  pictureDate: {
    color: '#ccc',
    fontSize: 12,
  },
  closePictureButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
});
