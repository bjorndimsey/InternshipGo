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

const { width } = Dimensions.get('window');

interface AdminCoordinatorProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  employeeId: string;
  department: string;
  position: string;
  university: string;
  officeLocation: string;
  hireDate: string;
  lastLogin: string;
  permissions: string[];
  totalCoordinators: number;
  managedInterns: number;
  activePartnerships: number;
  completedProjects: number;
  rating: number;
  reviews: number;
  adminId?: string;
  assignedAt?: string;
  assignedBy?: string;
  notes?: string;
}

interface ProfilePageProps {
  currentUser?: any;
}

export default function ProfilePage({ currentUser }: ProfilePageProps) {
  const [profile, setProfile] = useState<AdminCoordinatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    position: '',
    officeLocation: '',
  });

  useEffect(() => {
    if (currentUser?.id) {
      fetchProfile();
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Get userId from currentUser prop
      const userId = currentUser?.id?.toString();
      
      if (!userId) {
        console.error('❌ No user ID found in currentUser');
        Alert.alert('Error', 'User information not available. Please login again.');
        return;
      }
      
      console.log('🔍 Fetching admin coordinator profile for user ID:', userId);
      
      const response = await apiService.getAdminCoordinatorProfile(userId);
      
      if (response.success && response.profile) {
        console.log('✅ Profile fetched successfully:', response.profile);
        setProfile(response.profile);
        setEditData({
          firstName: response.profile.firstName,
          lastName: response.profile.lastName,
          email: response.profile.email,
          phoneNumber: response.profile.phoneNumber,
          department: response.profile.department,
          position: response.profile.position,
          officeLocation: response.profile.officeLocation,
        });
      } else {
        console.error('❌ Failed to fetch profile:', response.message);
        Alert.alert('Error', response.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      Alert.alert('Error', 'Failed to fetch profile. Please try again.');
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

  const handleUploadPhoto = () => {
    Alert.alert(
      'Upload Photo',
      'Photo upload functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleViewPermissions = () => {
    if (profile?.permissions) {
      Alert.alert(
        'Your Permissions',
        profile.permissions.join('\n• '),
        [{ text: 'OK' }]
      );
    }
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
        <Text style={styles.errorTitle}>Error loading profile</Text>
        <Text style={styles.errorText}>Please try again later</Text>
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
              <Text style={styles.profileText}>
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPhoto}>
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.fullName}>
            {profile.firstName} {profile.lastName}
          </Text>
          <Text style={styles.position}>{profile.position}</Text>
          <Text style={styles.department}>{profile.department}</Text>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#fbbc04" />
            <Text style={styles.ratingText}>{profile.rating}</Text>
            <Text style={styles.reviewsText}>({profile.reviews} reviews)</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <MaterialIcons name="edit" size={20} color="#4285f4" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <MaterialIcons name="supervisor-account" size={32} color="#4285f4" />
          <Text style={styles.statNumber}>{profile.totalCoordinators}</Text>
          <Text style={styles.statLabel}>Total Coordinators</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="school" size={32} color="#34a853" />
          <Text style={styles.statNumber}>{profile.managedInterns}</Text>
          <Text style={styles.statLabel}>Managed Interns</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="business-center" size={32} color="#fbbc04" />
          <Text style={styles.statNumber}>{profile.activePartnerships}</Text>
          <Text style={styles.statLabel}>Active Partnerships</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="assignment" size={32} color="#ea4335" />
          <Text style={styles.statNumber}>{profile.completedProjects}</Text>
          <Text style={styles.statLabel}>Completed Projects</Text>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <MaterialIcons name="person" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{profile.firstName} {profile.lastName}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="email" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="phone" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile.phoneNumber}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="badge" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{profile.employeeId}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Professional Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <MaterialIcons name="work" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Position</Text>
              <Text style={styles.infoValue}>{profile.position}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="business" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{profile.department}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="school" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>University</Text>
              <Text style={styles.infoValue}>{profile.university}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="location-on" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Office Location</Text>
              <Text style={styles.infoValue}>{profile.officeLocation}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="calendar-today" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Hire Date</Text>
              <Text style={styles.infoValue}>{profile.hireDate}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="login" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Last Login</Text>
              <Text style={styles.infoValue}>{profile.lastLogin}</Text>
            </View>
          </View>
          {profile.adminId && (
            <View style={styles.infoItem}>
              <MaterialIcons name="admin-panel-settings" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Admin ID</Text>
                <Text style={styles.infoValue}>{profile.adminId}</Text>
              </View>
            </View>
          )}
          {profile.assignedAt && (
            <View style={styles.infoItem}>
              <MaterialIcons name="assignment-ind" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Admin Since</Text>
                <Text style={styles.infoValue}>{new Date(profile.assignedAt).toLocaleDateString()}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions & Access</Text>
        <View style={styles.permissionsCard}>
          <View style={styles.permissionsHeader}>
            <Text style={styles.permissionsTitle}>Your Permissions</Text>
            <TouchableOpacity style={styles.viewPermissionsButton} onPress={handleViewPermissions}>
              <MaterialIcons name="visibility" size={16} color="#4285f4" />
              <Text style={styles.viewPermissionsText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.permissionsList}>
            {profile.permissions.slice(0, 3).map((permission, index) => (
              <View key={index} style={styles.permissionItem}>
                <MaterialIcons name="check-circle" size={16} color="#34a853" />
                <Text style={styles.permissionText}>{permission}</Text>
              </View>
            ))}
            {profile.permissions.length > 3 && (
              <Text style={styles.morePermissionsText}>
                +{profile.permissions.length - 3} more permissions
              </Text>
            )}
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
          <TouchableOpacity style={styles.settingItem}>
            <MaterialIcons name="security" size={24} color="#666" />
            <Text style={styles.settingText}>Security Settings</Text>
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
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.firstName}
                  onChangeText={(text) => setEditData({...editData, firstName: text})}
                  placeholder="Enter first name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.lastName}
                  onChangeText={(text) => setEditData({...editData, lastName: text})}
                  placeholder="Enter last name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.email}
                  onChangeText={(text) => setEditData({...editData, email: text})}
                  placeholder="Enter email"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.phoneNumber}
                  onChangeText={(text) => setEditData({...editData, phoneNumber: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.department}
                  onChangeText={(text) => setEditData({...editData, department: text})}
                  placeholder="Enter department"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Position *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.position}
                  onChangeText={(text) => setEditData({...editData, position: text})}
                  placeholder="Enter position"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Office Location *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.officeLocation}
                  onChangeText={(text) => setEditData({...editData, officeLocation: text})}
                  placeholder="Enter office location"
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
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  position: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: '#999',
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
  permissionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  permissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  viewPermissionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewPermissionsText: {
    fontSize: 14,
    color: '#4285f4',
    marginLeft: 4,
    fontWeight: '500',
  },
  permissionsList: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  morePermissionsText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
});
