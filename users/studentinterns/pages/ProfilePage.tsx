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

interface StudentProfile {
  id: string;
  email: string;
  user_type: string;
  google_id?: string;
  profile_picture?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  id_number: string;
  first_name: string;
  last_name: string;
  age: number;
  year: string;
  date_of_birth: string;
  program: string;
  major: string;
  address: string;
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
  google_id?: string;
}

interface ProfilePageProps {
  currentUser: UserInfo;
}

export default function ProfilePage({ currentUser }: ProfilePageProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StudentProfile>>({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLocationPictures, setShowLocationPictures] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      console.log('Fetching profile for user:', currentUser);
      
      const response = await apiService.getProfile(currentUser.id);
      console.log('Profile response:', response);
      console.log('Profile user data:', response.user);
      
      if (response.success && response.user) {
        console.log('Setting profile with data:', response.user);
        setProfile(response.user);
      } else {
        Alert.alert('Error', 'Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to fetch profile data');
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

  const handleLocationPictures = () => {
    setShowLocationPictures(true);
  };

  const handleLocationSelect = (latitude: number, longitude: number) => {
    console.log('Location selected:', latitude, longitude);
    setShowLocationPicker(false);
    // Refresh profile to show updated location
    fetchProfile();
  };

  const handleCloseLocationPicker = () => {
    setShowLocationPicker(false);
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

  const SkillTag = ({ skill }: { skill: string }) => (
    <View style={styles.skillTag}>
      <Text style={styles.skillText}>{skill}</Text>
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
          {profile.profile_picture ? (
            <Image source={{ uri: profile.profile_picture }} style={styles.profilePicture} />
          ) : (
            <View style={styles.profilePicturePlaceholder}>
              <Text style={styles.profilePictureText}>
                {profile.first_name?.charAt(0) || ''}{profile.last_name?.charAt(0) || ''}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.profileName}>
          {profile.first_name || 'N/A'} {profile.last_name || 'N/A'}
        </Text>
        <Text style={styles.profileEmail}>{profile.email}</Text>
        <Text style={styles.profileRole}>Student Intern</Text>
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

      {/* Personal Information */}
      <ProfileSection title="Personal Information">
        <ProfileField label="Student ID" value={profile.id_number || 'N/A'} icon="badge" />
        <ProfileField label="Email" value={profile.email || 'N/A'} icon="mail" />
        <ProfileField label="Academic Year" value={profile.year || 'N/A'} icon="school" />
        <ProfileField label="Major" value={profile.major || 'N/A'} icon="book" />
        <ProfileField label="Program" value={profile.program || 'N/A'} icon="account-balance" />
        <ProfileField label="Age" value={profile.age?.toString() || 'N/A'} icon="person" />
        <ProfileField label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'N/A'} icon="cake" />
      </ProfileSection>

      {/* Address */}
      <ProfileSection title="Address">
        <ProfileField label="Address" value={profile.address || 'N/A'} icon="location-on" />
      </ProfileSection>

      {/* Settings */}
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

      {/* Account Information */}
      <ProfileSection title="Account Information">
        <ProfileField label="User Type" value={profile.user_type || 'N/A'} icon="person" />
        <ProfileField label="Account Created" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'} icon="calendar-today" />
        <ProfileField label="Last Updated" value={profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'} icon="update" />
      </ProfileSection>

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#ea4335" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
          currentUserId={currentUser.id}
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
          userId={currentUser.id}
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
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 14,
    color: '#4285f4',
    fontWeight: '500',

  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a2e',
    marginLeft: 12,
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
    paddingVertical: 12,
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
