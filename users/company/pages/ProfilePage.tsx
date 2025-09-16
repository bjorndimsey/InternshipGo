import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../../../lib/api';
import LocationPicker from '../../../components/LocationPicker';
import LocationPictures from '../../../components/LocationPictures';

const { width } = Dimensions.get('window');

interface CompanyProfile {
  id: string;
  userType: string;
  email: string;
  companyName: string;
  industry: string;
  address: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
  id: string;
  user_type?: string;
  google_id?: string;
}

interface ProfilePageProps {
  currentUser: UserInfo | null;
}

export default function ProfilePage({ currentUser }: ProfilePageProps) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLocationPictures, setShowLocationPictures] = useState(false);
  const [editData, setEditData] = useState({
    companyName: '',
    industry: '',
    address: '',
  });

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        throw new Error('No current user found');
      }
      
      const response = await apiService.getProfile(currentUser.id);
      
      if (response.success && response.user) {
        const userData = response.user;
        
        // Map the API response to our CompanyProfile interface
        const companyProfile: CompanyProfile = {
          id: userData.id.toString(),
          userType: userData.userType,
          email: userData.email,
          companyName: userData.companyName || '',
          industry: userData.industry || '',
          address: userData.address || '',
          profilePicture: userData.profilePicture,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        };
        
        setProfile(companyProfile);
        setEditData({
          companyName: companyProfile.companyName,
          industry: companyProfile.industry,
          address: companyProfile.address,
        });
      } else {
        // Check if this is a Google user that needs setup
        if (currentUser.google_id && response.message === 'User not found') {
          Alert.alert(
            'Account Setup Required',
            'Your Google account needs to be set up first. Please complete your profile setup.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // You could navigate to GoogleUserSetup here
                  // For now, we'll just show an error
                }
              }
            ]
          );
          return;
        }
        throw new Error(response.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Check if this is a Google user that needs setup
      if (currentUser?.google_id && (error as Error).message === 'User not found') {
        Alert.alert(
          'Account Setup Required',
          'Your Google account needs to be set up first. Please complete your profile setup.',
          [
            {
              text: 'OK',
              onPress: () => {
                // You could navigate to GoogleUserSetup here
                // For now, we'll just show an error
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    if (!profile) return;

    const updatedProfile = {
      ...profile,
      ...editData,
    };

    setProfile(updatedProfile);
    setShowEditModal(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password change functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleUploadLogo = () => {
    Alert.alert(
      'Upload Logo',
      'Logo upload functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleLocationPicker = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (latitude: number, longitude: number) => {
    console.log('Location selected:', { latitude, longitude });
    // Here you can update the profile with the new location
    // For now, we'll just show a success message
    Alert.alert('Success', `Location updated: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    setShowLocationPicker(false);
  };

  const handleCloseLocationPicker = () => {
    setShowLocationPicker(false);
  };

  const handleLocationPictures = () => {
    setShowLocationPictures(true);
  };

  const handleCloseLocationPictures = () => {
    setShowLocationPictures(false);
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#ea4335" />
        <Text style={styles.errorTitle}>
          {currentUser?.google_id ? 'Account Setup Required' : 'Error loading profile'}
        </Text>
        <Text style={styles.errorText}>
          {currentUser?.google_id 
            ? 'Your Google account needs to be set up first. Please complete your profile setup.'
            : 'Please try again later'
          }
        </Text>
        {currentUser?.google_id && (
          <TouchableOpacity style={styles.setupButton}>
            <Text style={styles.setupButtonText}>Complete Setup</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          {profile.profilePicture ? (
            <Image source={{ uri: profile.profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileText}>{profile.companyName.charAt(0)}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadLogo}>
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.companyName}>{profile.companyName}</Text>
          <Text style={styles.industry}>{profile.industry}</Text>
          <Text style={styles.email}>{profile.email}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <MaterialIcons name="edit" size={20} color="#4285f4" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Company Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <MaterialIcons name="business" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Company Name</Text>
              <Text style={styles.infoValue}>{profile.companyName}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="work" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Industry</Text>
              <Text style={styles.infoValue}>{profile.industry}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="location-on" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{profile.address}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="email" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Account Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <MaterialIcons name="person" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>User Type</Text>
              <Text style={styles.infoValue}>{profile.userType}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="schedule" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Created At</Text>
              <Text style={styles.infoValue}>{new Date(profile.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="update" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>{new Date(profile.updatedAt).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
            <MaterialIcons name="lock" size={24} color="#666" />
            <Text style={styles.settingText}>Change Password</Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleLocationPicker}>
            <MaterialIcons name="location-on" size={20} color="#4285f4" />
            <Text style={styles.settingText}>Set Location</Text>
            <MaterialIcons name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleLocationPictures}>
            <MaterialIcons name="photo-camera" size={20} color="#4285f4" />
            <Text style={styles.settingText}>Location Pictures</Text>
            <MaterialIcons name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <MaterialIcons name="notifications" size={24} color="#666" />
            <Text style={styles.settingText}>Notification Settings</Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <MaterialIcons name="privacy-tip" size={24} color="#666" />
            <Text style={styles.settingText}>Privacy Settings</Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowEditModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.companyName}
                  onChangeText={(text) => setEditData({...editData, companyName: text})}
                  placeholder="Enter company name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Industry *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.industry}
                  onChangeText={(text) => setEditData({...editData, industry: text})}
                  placeholder="Enter industry"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editData.address}
                  onChangeText={(text) => setEditData({...editData, address: text})}
                  placeholder="Enter company address"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseLocationPicker}
      >
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          onClose={handleCloseLocationPicker}
          currentUserId={currentUser?.id}
        />
      </Modal>

      {/* Location Pictures Modal */}
      <Modal
        visible={showLocationPictures}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseLocationPictures}
      >
        <LocationPictures
          userId={currentUser?.id || ''}
          onClose={handleCloseLocationPictures}
          onPicturesUpdated={() => {
            // Optionally refresh profile or show notification
            console.log('Location pictures updated');
          }}
        />
      </Modal>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ea4335',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#666',
  },
  uploadButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4285f4',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  industry: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4285f4',
  },
  editButtonText: {
    color: '#4285f4',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  statsSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  moaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  moaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  moaInfo: {
    flex: 1,
  },
  moaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  moaSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  moaStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moaStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  moaDetails: {
    marginBottom: 15,
  },
  moaDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  moaDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  moaDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  viewMOAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  viewMOAText: {
    fontSize: 14,
    color: '#4285f4',
    marginLeft: 4,
    fontWeight: '500',
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  socialCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  socialItem: {
    alignItems: 'center',
  },
  socialText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a2e',
    marginLeft: 12,
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
    maxWidth: 500,
    maxHeight: '90%',
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
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a2e',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4285f4',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  setupButton: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
