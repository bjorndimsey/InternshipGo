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

interface CoordinatorProfile {
  id: string;
  userType: string;
  email: string;
  firstName: string;
  lastName: string;
  program: string;
  phoneNumber: string;
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
}

interface ProfilePageProps {
  currentUser: UserInfo | null;
}

export default function ProfilePage({ currentUser }: ProfilePageProps) {
  const [profile, setProfile] = useState<CoordinatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLocationPictures, setShowLocationPictures] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CoordinatorProfile>>({});

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
        
        // Map the API response to our CoordinatorProfile interface
        const coordinatorProfile: CoordinatorProfile = {
          id: userData.id.toString(),
          userType: userData.userType,
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          program: userData.program || '',
          phoneNumber: userData.phoneNumber || '',
          address: userData.address || '',
          profilePicture: userData.profilePicture,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        };
        
        setProfile(coordinatorProfile);
      } else {
        throw new Error(response.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditForm(profile || {});
    setShowEditModal(true);
  };

  const handleSave = () => {
    if (profile) {
      setProfile({ ...profile, ...editForm });
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password change functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleLocationPicker = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (latitude: number, longitude: number) => {
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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => {
          // Handle logout
        }},
      ]
    );
  };

  const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const ProfileField = ({ label, value, icon }: { label: string; value: string; icon: any }) => (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <MaterialIcons name={icon} size={20} color="#666" />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );


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
        <Text style={styles.errorTitle}>Error loading profile</Text>
        <Text style={styles.errorText}>Please try again later</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profilePictureContainer}>
          {profile.profilePicture ? (
            <Image source={{ uri: profile.profilePicture }} style={styles.profilePicture} />
          ) : (
            <View style={styles.profilePicturePlaceholder}>
              <Text style={styles.profilePictureText}>
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.profileName}>
          {profile.firstName} {profile.lastName}
        </Text>
        <Text style={styles.profileEmail}>{profile.email}</Text>
        <Text style={styles.profileRole}>Coordinator</Text>
        <Text style={styles.profileDepartment}>{profile.program}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <MaterialIcons name="edit" size={20} color="#fff" />
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.passwordButton} onPress={handleChangePassword}>
          <MaterialIcons name="lock" size={20} color="#4285f4" />
          <Text style={styles.passwordButtonText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <ProfileSection title="Settings">
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
      </ProfileSection>

      {/* Professional Information */}
      <ProfileSection title="Professional Information">
        <ProfileField label="User ID" value={profile.id} icon="badge" />
        <ProfileField label="Program" value={profile.program} icon="business" />
        <ProfileField label="Position" value="Coordinator" icon="work" />
        <ProfileField label="Phone Number" value={profile.phoneNumber} icon="phone" />
        <ProfileField label="Address" value={profile.address} icon="location-on" />
      </ProfileSection>

      {/* Account Information */}
      <ProfileSection title="Account Information">
        <ProfileField label="User Type" value={profile.userType} icon="person" />
        <ProfileField label="Email" value={profile.email} icon="mail" />
        <ProfileField label="Created At" value={new Date(profile.createdAt).toLocaleDateString()} icon="schedule" />
        <ProfileField label="Last Updated" value={new Date(profile.updatedAt).toLocaleDateString()} icon="update" />
      </ProfileSection>

          

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
              <Text style={styles.modalNote}>
                Profile editing functionality will be implemented soon.
              </Text>
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
                onPress={handleSave}
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
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profilePictureContainer: {
    marginBottom: 16,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#666',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#4285f4',
    fontWeight: '500',
    marginBottom: 2,
  },
  profileDepartment: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285f4',
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  passwordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4285f4',
  },
  passwordButtonText: {
    color: '#4285f4',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    color: '#1a1a2e',
    marginLeft: 28,
  },
  dangerZone: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginBottom: 40,
    padding: 20,
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ea4335',
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#ea4335',
    marginLeft: 12,
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
    maxHeight: '80%',
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
  modalNote: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a2e',
    marginLeft: 12,
  },
});
