import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { apiService } from '../../../lib/api';
import LocationPicker from '../../../components/LocationPicker';
import LocationPictures from '../../../components/LocationPictures';
import CloudinaryService from '../../../lib/cloudinaryService';
import { EmailService } from '../../../lib/emailService';
import OTPVerificationScreen from '../../../screens/OTPVerificationScreen';
import NewPasswordScreen from '../../../screens/NewPasswordScreen';

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
  backgroundPicture?: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields for company-focused coordinators
  skills?: string;
  industryFocus?: string;
  companyPreferences?: string;
  bio?: string;
  linkedinUrl?: string;
  workExperience?: string;
  achievements?: string;
  specializations?: string;
  yearsOfExperience?: number;
  managedCompanies?: number;
  successfulPlacements?: number;
  rating?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
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
  const [profile, setProfile] = useState<CoordinatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLocationPictures, setShowLocationPictures] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CoordinatorProfile>>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CoordinatorProfile>>({});
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [uploadingBackgroundPicture, setUploadingBackgroundPicture] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'otp' | 'password'>('otp');
  const [isLoadingOTP, setIsLoadingOTP] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
      
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
    }
  }, [currentUser]);

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

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setShowSkeleton(true);
      
      if (!currentUser) {
        throw new Error('No current user found');
      }
      
      const response = await apiService.getProfile(currentUser.id);
      
      if (response.success && response.user) {
        const userData = response.user;
        console.log('🔍 Coordinator profile data received:', userData);
        console.log('🔍 First name field:', userData.first_name, userData.firstName);
        console.log('🔍 Last name field:', userData.last_name, userData.lastName);
        
        // Map the API response to our CoordinatorProfile interface
        const coordinatorProfile: CoordinatorProfile = {
          id: userData.id.toString(),
          userType: userData.userType,
          email: userData.email,
          firstName: userData.first_name || userData.firstName || '',
          lastName: userData.last_name || userData.lastName || '',
          program: userData.program || '',
          phoneNumber: userData.phone_number || userData.phoneNumber || '',
          address: userData.address || '',
          profilePicture: userData.profile_picture || userData.profilePicture,
          backgroundPicture: userData.background_picture || userData.backgroundPicture,
          createdAt: userData.created_at || userData.createdAt,
          updatedAt: userData.updated_at || userData.updatedAt,
          // Additional fields for company-focused coordinators
          skills: userData.skills || '',
          industryFocus: userData.industryFocus || '',
          companyPreferences: userData.companyPreferences || '',
          bio: userData.bio || '',
          linkedinUrl: userData.linkedinUrl || '',
          workExperience: userData.workExperience || '',
          achievements: userData.achievements || '',
          specializations: userData.specializations || '',
          yearsOfExperience: userData.yearsOfExperience || 0,
          managedCompanies: userData.managedCompanies || 0,
          successfulPlacements: userData.successfulPlacements || 0,
          rating: userData.rating || 4.5,
          location: userData.location || '',
          latitude: userData.latitude,
          longitude: userData.longitude,
        };
        
        console.log('🔍 Mapped coordinator profile:', coordinatorProfile);
        console.log('🔍 Final name:', coordinatorProfile.firstName, coordinatorProfile.lastName);
        setProfile(coordinatorProfile);
      } else {
        throw new Error(response.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const handleEdit = () => {
    setEditForm(profile || {});
    setShowEditModal(true);
  };

  const handleEditSection = (section: string) => {
    setEditingSection(section);
    setEditData(profile || {});
    setModalTitle(getSectionTitle(section));
    setShowEditModal(true);
  };

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'companyManagement':
        return 'Edit Company Management';
      case 'skills':
        return 'Edit Skills & Specializations';
      case 'professionalBackground':
        return 'Edit Professional Background';
      case 'professionalInformation':
        return 'Edit Professional Information';
      case 'contactInformation':
        return 'Edit Contact Information';
      default:
        return 'Edit Profile';
    }
  };

  const handleSaveSection = async () => {
    try {
      if (!currentUser || !profile) return;

      const response = await apiService.updateProfile(currentUser.id, editData);
      
      if (response.success) {
        setProfile({ ...profile, ...editData });
        setEditingSection(null);
        setEditData({});
        setShowEditModal(false);
        setSuccessMessage('Profile updated successfully!');
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditData({});
    setShowEditModal(false);
  };

  const handleSave = () => {
    if (profile) {
      setProfile({ ...profile, ...editForm });
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    }
  };

  const handleProfilePictureUpload = async () => {
    try {
      // Create a file input element for web
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      document.body.appendChild(input);
      input.click();
      
      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
          document.body.removeChild(input);
          return;
        }
        
        if (!file.type.startsWith('image/')) {
          Alert.alert('Invalid File', 'Please select an image file.');
          document.body.removeChild(input);
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
          document.body.removeChild(input);
          return;
        }
        
        setUploadingProfilePicture(true);
        
        try {
          const uploadResult = await CloudinaryService.uploadImage(
            file,
            'internship-avatars/coordinator-profiles',
            {
              transformation: 'w_400,h_400,c_fill,q_auto,f_auto'
            }
          );
          
          if (uploadResult.success && uploadResult.url) {
            // Update the profile picture in the database
            const response = await apiService.updateProfile(currentUser!.id, {
              profilePicture: uploadResult.url
            });
            
            if (response.success) {
              const updatedProfile = {
                ...profile!,
                profilePicture: uploadResult.url
              };
              
              setProfile(updatedProfile);
              setSuccessMessage('Profile picture updated successfully!');
              setShowSuccessModal(true);
            } else {
              Alert.alert('Error', response.message || 'Failed to update profile picture in database.');
            }
          } else {
            Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload image. Please try again.');
          }
        } catch (error) {
          console.error('Profile picture upload error:', error);
          Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
        } finally {
          setUploadingProfilePicture(false);
          document.body.removeChild(input);
        }
      };
      
      input.oncancel = () => {
        document.body.removeChild(input);
      };
      
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Error', 'Failed to open file picker. Please try again.');
    }
  };

  const handleBackgroundPictureUpload = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      document.body.appendChild(input);
      input.click();
      
      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
          document.body.removeChild(input);
          return;
        }
        
        if (!file.type.startsWith('image/')) {
          Alert.alert('Invalid File', 'Please select an image file.');
          document.body.removeChild(input);
          return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
          document.body.removeChild(input);
          return;
        }
        
        setUploadingBackgroundPicture(true);
        
        try {
          const uploadResult = await CloudinaryService.uploadImage(
            file,
            'internship-avatars/coordinator-backgrounds',
            {
              transformation: 'w_1200,h_400,c_fill,q_auto,f_auto'
            }
          );
          
          if (uploadResult.success && uploadResult.url) {
            // Update the background picture in the database
            const response = await apiService.updateProfile(currentUser!.id, {
              backgroundPicture: uploadResult.url
            });
            
            if (response.success) {
              const updatedProfile = {
                ...profile!,
                backgroundPicture: uploadResult.url
              };
              
              setProfile(updatedProfile);
              setSuccessMessage('Background picture updated successfully!');
              setShowSuccessModal(true);
            } else {
              Alert.alert('Error', response.message || 'Failed to update background picture in database.');
            }
          } else {
            Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload image. Please try again.');
          }
        } catch (error) {
          console.error('Background picture upload error:', error);
          Alert.alert('Error', 'Failed to upload background picture. Please try again.');
        } finally {
          setUploadingBackgroundPicture(false);
          document.body.removeChild(input);
        }
      };
      
      input.oncancel = () => {
        document.body.removeChild(input);
      };
      
    } catch (error) {
      console.error('Background picture upload error:', error);
      Alert.alert('Error', 'Failed to open file picker. Please try again.');
    }
  };


  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  };

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
      Alert.alert('Error', 'Unable to get your email address. Please try again.');
      return;
    }

    // Check if user is a Google user
    const isGoogleOAuthUser = currentUser.google_id ? true : false;
    setIsGoogleUser(isGoogleOAuthUser);

    setIsLoadingOTP(true);
    try {
      // Request OTP from backend
      const data = await apiService.requestOtp(currentUser.email);

      if (data.success) {
        // Send OTP via EmailJS
        const emailResult = await EmailService.sendOTPEmail(
          currentUser.email,
          (data as any).otp,
          currentUser.name || 'User'
        );

        if (emailResult.success) {
          Toast.show({
            type: 'success',
            text1: 'OTP Sent! 📧',
            text2: 'Check your email for the verification code',
            position: 'top',
            visibilityTime: 5000,
          });

          setPasswordChangeStep('otp');
          setShowChangePasswordModal(true);
        } else {
          Alert.alert(
            'Email Failed',
            emailResult.error || 'Failed to send OTP email. Please try again.'
          );
        }
      } else {
        Alert.alert('Request Failed', data.message || 'Failed to request OTP. Please try again.');
      }
    } catch (error) {
      console.error('OTP request error:', error);
      Alert.alert('Error', 'Unable to send OTP. Please try again.');
    } finally {
      setIsLoadingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    if (!currentUser?.email) {
      throw new Error('Unable to get your email address');
    }

    try {
      const data = await apiService.requestOtp(currentUser.email);

      if (data.success) {
        const emailResult = await EmailService.sendOTPEmail(
          currentUser.email,
          (data as any).otp,
          currentUser.name || 'User'
        );

        if (emailResult.success) {
          return Promise.resolve();
        } else {
          throw new Error(emailResult.error || 'Failed to send OTP email');
        }
      } else {
        throw new Error(data.message || 'Failed to request OTP');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleOTPVerified = () => {
    setPasswordChangeStep('password');
  };

  const handlePasswordChangeSuccess = () => {
    Toast.show({
      type: 'success',
      text1: 'Password Changed! 🎉',
      text2: 'Your password has been updated successfully',
      position: 'top',
      visibilityTime: 5000,
    });

    setTimeout(() => {
      setShowChangePasswordModal(false);
      setPasswordChangeStep('otp');
      setSuccessMessage('Password changed successfully!');
      setShowSuccessModal(true);
    }, 2000);
  };

  const handleBackToOTP = () => {
    setPasswordChangeStep('otp');
  };

  const handleCloseChangePasswordModal = () => {
    setShowChangePasswordModal(false);
    setPasswordChangeStep('otp');
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

  const ProfileSection = ({ title, children, editable = false, sectionKey }: { 
    title: string; 
    children: React.ReactNode; 
    editable?: boolean;
    sectionKey?: string;
  }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
        {editable && (
          <TouchableOpacity 
            style={styles.editSectionButton}
            onPress={() => handleEditSection(sectionKey || '')}
          >
            <MaterialIcons name="edit" size={16} color="#4285f4" />
            <Text style={styles.editSectionButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
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

  // Skeleton Components
  const SkeletonProfileCard = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonInfoCard}>
        <View style={styles.skeletonCardHeader}>
          <Animated.View style={[styles.skeletonCardIcon, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonCardTitle, { opacity: shimmerOpacity }]} />
        </View>
        <View style={styles.skeletonCardContent}>
          <Animated.View style={[styles.skeletonCardSubtitle, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonCardSubtitle, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonCardSubtitle, { opacity: shimmerOpacity }]} />
        </View>
        <Animated.View style={[styles.skeletonCardEditButton, { opacity: shimmerOpacity }]} />
      </View>
    );
  };

  const SkeletonCoverPhoto = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <Animated.View style={[styles.skeletonCoverPhoto, { opacity: shimmerOpacity }]}>
        <Animated.View style={[styles.skeletonCoverPhotoIcon, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonCoverPhotoText, { opacity: shimmerOpacity }]} />
      </Animated.View>
    );
  };

  const SkeletonProfileSection = () => {
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonProfileSection}>
        <View style={styles.skeletonProfileImageContainer}>
          <Animated.View style={[styles.skeletonProfileImage, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonProfileUploadButton, { opacity: shimmerOpacity }]} />
        </View>
        <View style={styles.skeletonProfileInfo}>
          <Animated.View style={[styles.skeletonCoordinatorName, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonCoordinatorProgram, { opacity: shimmerOpacity }]} />
        </View>
      </View>
    );
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F56E0F" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#F56E0F" />
        <Text style={styles.errorTitle}>Error loading profile</Text>
        <Text style={styles.errorText}>Please try again later</Text>
      </View>
    );
  }

  return (
    <Animated.ScrollView 
      style={[styles.container, { opacity: fadeAnim }]} 
      showsVerticalScrollIndicator={false}
    >
      {/* Cover Photo Header */}
      <Animated.View style={[styles.coverPhotoContainer, { transform: [{ translateY: slideAnim }] }]}>
        {showSkeleton ? (
          <SkeletonCoverPhoto />
        ) : (
          <>
            {/* Cover Photo */}
            {profile.backgroundPicture ? (
              <Image source={{ uri: profile.backgroundPicture }} style={styles.coverPhoto} />
            ) : (
              <View style={styles.coverPhotoPlaceholder}>
                <MaterialIcons name="landscape" size={64} color="#F56E0F" />
                <Text style={styles.coverPhotoPlaceholderText}>Add Cover Photo</Text>
              </View>
            )}
            
            {/* Edit Cover Button */}
            <TouchableOpacity 
              style={styles.editCoverButton} 
              onPress={handleBackgroundPictureUpload}
              disabled={uploadingBackgroundPicture}
            >
              {uploadingBackgroundPicture ? (
                <ActivityIndicator size="small" color="#F56E0F" />
              ) : (
                <>
                  <MaterialIcons name="camera-alt" size={16} color="#FBFBFB" />
                  <Text style={styles.editCoverText}>Edit Cover</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Profile Picture and Name Section */}
      <Animated.View style={[styles.profileSection, { transform: [{ scale: scaleAnim }] }]}>
        {showSkeleton ? (
          <SkeletonProfileSection />
        ) : (
          <>
            <View style={styles.profileImageContainer}>
              {profile.profilePicture ? (
                <Image source={{ uri: profile.profilePicture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileText}>
                    {profile.firstName?.charAt(0) || ''}{profile.lastName?.charAt(0) || ''}
                  </Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.profileUploadButton} 
                onPress={handleProfilePictureUpload}
                disabled={uploadingProfilePicture}
              >
                {uploadingProfilePicture ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="camera-alt" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.coordinatorName}>
                {profile.firstName || 'N/A'} {profile.lastName || 'N/A'}
              </Text>
              <Text style={styles.coordinatorProgram}>{profile.program || 'Coordinator'}</Text>
            </View>
          </>
        )}
      </Animated.View>

      {/* About Section */}
      <Animated.View style={[styles.aboutSection, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.aboutTitle}>About</Text>
        
        {showSkeleton ? (
          <View style={styles.cardsGrid}>
            {/* Left Column Skeleton */}
            <View style={styles.leftColumn}>
              <SkeletonProfileCard />
              <SkeletonProfileCard />
            </View>
            {/* Right Column Skeleton */}
            <View style={styles.rightColumn}>
              <SkeletonProfileCard />
              <SkeletonProfileCard />
            </View>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {/* Left Column */}
            <View style={styles.leftColumn}>
              {/* Professional Information Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="person" size={24} color="#FBFBFB" />
                  </View>
                  <Text style={styles.cardTitle}>Professional Information</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>ID: {profile.id || 'N/A'}</Text>
                  <Text style={styles.cardSubtitle}>Program: {profile.program || 'N/A'}</Text>
                  <Text style={styles.cardSubtitle}>Position: Company Coordinator</Text>
                  <Text style={styles.cardSubtitle}>Experience: {profile.yearsOfExperience || 0} years</Text>
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('professionalInformation')}
                >
                  <MaterialIcons name="add" size={16} color="#FBFBFB" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Contact Information Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="email" size={24} color="#FBFBFB" />
                  </View>
                  <Text style={styles.cardTitle}>Contact Information</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>{profile.email}</Text>
                  {profile.phoneNumber && (
                    <Text style={styles.cardSubtitle}>{profile.phoneNumber}</Text>
                  )}
                  {profile.address && (
                    <Text style={styles.cardSubtitle}>{profile.address}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('contactInformation')}
                >
                  <MaterialIcons name="add" size={16} color="#FBFBFB" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.rightColumn}>
              {/* Skills & Specializations Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="build" size={24} color="#FBFBFB" />
                  </View>
                  <Text style={styles.cardTitle}>Skills & Specializations</Text>
                </View>
                <View style={styles.cardContent}>
                  {profile.skills ? (
                    <Text style={styles.cardSubtitle}>{profile.skills}</Text>
                  ) : (
                    <Text style={styles.cardSubtitle}>No skills added yet</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('skills')}
                >
                  <MaterialIcons name="add" size={16} color="#FBFBFB" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Company Management Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="business" size={24} color="#FBFBFB" />
                  </View>
                  <Text style={styles.cardTitle}>Company Management</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>Managed: {profile.managedCompanies || 0}</Text>
                  <Text style={styles.cardSubtitle}>Placements: {profile.successfulPlacements || 0}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('companyManagement')}
                >
                  <MaterialIcons name="add" size={16} color="#FBFBFB" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Settings Section */}
      <Animated.View style={[styles.settingsSection, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.settingsTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingItem} onPress={handleLocationPicker}>
          <MaterialIcons name="location-on" size={20} color="#F56E0F" />
          <Text style={styles.settingText}>Set Location</Text>
          <MaterialIcons name="chevron-right" size={20} color="#F56E0F" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={handleLocationPictures}>
          <MaterialIcons name="photo-camera" size={20} color="#F56E0F" />
          <Text style={styles.settingText}>Location Pictures</Text>
          <MaterialIcons name="chevron-right" size={20} color="#F56E0F" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
          <MaterialIcons name="lock" size={20} color="#F56E0F" />
          <Text style={styles.settingText}>Change Password</Text>
          <MaterialIcons name="chevron-right" size={20} color="#F56E0F" />
        </TouchableOpacity>
      </Animated.View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={handleCancelEdit}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {editingSection === 'companyManagement' && (
                <View style={styles.editForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Managed Companies</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.managedCompanies?.toString() || ''}
                      onChangeText={(text) => setEditData({ ...editData, managedCompanies: parseInt(text) || 0 })}
                      keyboardType="numeric"
                      placeholder="Enter number of managed companies"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Successful Placements</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.successfulPlacements?.toString() || ''}
                      onChangeText={(text) => setEditData({ ...editData, successfulPlacements: parseInt(text) || 0 })}
                      keyboardType="numeric"
                      placeholder="Enter number of successful placements"
                    />
                  </View>
                </View>
              )}

              {editingSection === 'professionalInformation' && (
                <View style={styles.editForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.firstName || ''}
                      onChangeText={(text) => setEditData({ ...editData, firstName: text })}
                      placeholder="Enter your first name"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.lastName || ''}
                      onChangeText={(text) => setEditData({ ...editData, lastName: text })}
                      placeholder="Enter your last name"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Program</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.program || ''}
                      onChangeText={(text) => setEditData({ ...editData, program: text })}
                      placeholder="Enter your program"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Years of Experience</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.yearsOfExperience?.toString() || ''}
                      onChangeText={(text) => setEditData({ ...editData, yearsOfExperience: parseInt(text) || 0 })}
                      keyboardType="numeric"
                      placeholder="Enter years of experience"
                    />
                  </View>
                </View>
              )}

              {editingSection === 'contactInformation' && (
                <View style={styles.editForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.email || ''}
                      onChangeText={(text) => setEditData({ ...editData, email: text })}
                      placeholder="Enter your email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.phoneNumber || ''}
                      onChangeText={(text) => setEditData({ ...editData, phoneNumber: text })}
                      placeholder="Enter your phone number"
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Address</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.address || ''}
                      onChangeText={(text) => setEditData({ ...editData, address: text })}
                      placeholder="Enter your address"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              )}

              {editingSection === 'skills' && (
                <View style={styles.editForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Skills</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.skills || ''}
                      onChangeText={(text) => setEditData({ ...editData, skills: text })}
                      placeholder="Enter your skills (comma separated)"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Specializations</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.specializations || ''}
                      onChangeText={(text) => setEditData({ ...editData, specializations: text })}
                      placeholder="Enter your specializations"
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Industry Focus</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.industryFocus || ''}
                      onChangeText={(text) => setEditData({ ...editData, industryFocus: text })}
                      placeholder="Enter your industry focus"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Company Preferences</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.companyPreferences || ''}
                      onChangeText={(text) => setEditData({ ...editData, companyPreferences: text })}
                      placeholder="Enter your company preferences"
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              )}

              {editingSection === 'professionalBackground' && (
                <View style={styles.editForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bio</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.bio || ''}
                      onChangeText={(text) => setEditData({ ...editData, bio: text })}
                      placeholder="Enter your professional bio"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Work Experience</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.workExperience || ''}
                      onChangeText={(text) => setEditData({ ...editData, workExperience: text })}
                      placeholder="Enter your work experience"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Achievements</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.achievements || ''}
                      onChangeText={(text) => setEditData({ ...editData, achievements: text })}
                      placeholder="Enter your achievements"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>LinkedIn URL</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.linkedinUrl || ''}
                      onChangeText={(text) => setEditData({ ...editData, linkedinUrl: text })}
                      placeholder="Enter your LinkedIn profile URL"
                      keyboardType="url"
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSection}
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
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={closeSuccessModal}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseChangePasswordModal}
      >
        {passwordChangeStep === 'otp' && currentUser && (
          <OTPVerificationScreen
            email={currentUser.email}
            onVerifySuccess={handleOTPVerified}
            onBack={handleCloseChangePasswordModal}
            onResendOTP={handleResendOTP}
          />
        )}

        {passwordChangeStep === 'password' && currentUser && (
          <NewPasswordScreen
            email={currentUser.email}
            onPasswordResetSuccess={handlePasswordChangeSuccess}
            onBack={handleBackToOTP}
            isGoogleUser={isGoogleUser}
          />
        )}
      </Modal>

      {/* Toast Component */}
      <Toast />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2A2A2E', // Dark background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#151419', // Dark background
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#151419', // Dark background
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F56E0F', // Primary orange
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    fontWeight: '400',
  },
  // Cover Photo Styles
  coverPhotoContainer: {
    position: 'relative',
    height: width < 768 ? 200 : 300,
    width: '100%',
    overflow: 'hidden',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1B1B1E', // Dark secondary background
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPhotoPlaceholderText: {
    fontSize: width < 768 ? 16 : 18,
    color: '#F56E0F', // Primary orange
    marginTop: 12,
    fontWeight: '600',
  },
  editCoverButton: {
    position: 'absolute',
    top: width < 768 ? 16 : 20,
    right: width < 768 ? 16 : 20,
    backgroundColor: '#F56E0F', // Primary orange
    paddingHorizontal: width < 768 ? 12 : 16,
    paddingVertical: width < 768 ? 8 : 10,
    borderRadius: width < 768 ? 20 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editCoverText: {
    fontSize: width < 768 ? 12 : 14,
    color: '#FBFBFB', // Light text
    marginLeft: 6,
    fontWeight: 'bold',
  },
  // Profile Section Styles
  profileSection: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    padding: width < 768 ? 16 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: width < 768 ? 16 : 20,
  },
  profileImage: {
    width: width < 768 ? 80 : 100,
    height: width < 768 ? 80 : 100,
    borderRadius: width < 768 ? 40 : 50,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as any,
  profilePlaceholder: {
    width: width < 768 ? 80 : 100,
    height: width < 768 ? 80 : 100,
    borderRadius: width < 768 ? 40 : 50,
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profileText: {
    fontSize: width < 768 ? 32 : 40,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  profileUploadButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: width < 768 ? 16 : 20,
    width: width < 768 ? 32 : 36,
    height: width < 768 ? 32 : 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profileInfo: {
    flex: 1,
    marginRight: width < 768 ? 12 : 16,
  },
  coordinatorName: {
    fontSize: width < 768 ? 24 : 28,
    fontWeight: 'bold',
    color: '#fff', // White text on navy background
    marginBottom: width < 768 ? 4 : 6,
    fontFamily: 'System',
  },
  coordinatorProgram: {
    fontSize: width < 768 ? 14 : 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '600',
  },
  // About Section Styles
  aboutSection: {
    backgroundColor: '#2A2A2E', // Dark background
    padding: width < 768 ? 16 : 24,
  },
  aboutTitle: {
    fontSize: width < 768 ? 24 : 28,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: width < 768 ? 16 : 20,
    fontFamily: 'System',
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: width < 768 ? 12 : 16,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    gap: width < 768 ? 12 : 16,
    minWidth: width < 768 ? '48%' : '45%',
    maxWidth: width < 768 ? '48%' : '45%',
  },
  rightColumn: {
    flex: 1,
    gap: width < 768 ? 12 : 16,
    minWidth: width < 768 ? '48%' : '45%',
    maxWidth: width < 768 ? '48%' : '45%',
  },
  infoCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: width < 768 ? 12 : 16,
    padding: width < 768 ? 12 : 16,
    borderWidth: 2,
    borderColor: '#F56E0F', // Primary orange border
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: width < 768 ? 180 : 160,
    marginBottom: width < 768 ? 8 : 0,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: width < 768 ? 8 : 12,
    width: '100%',
  },
  cardIcon: {
    width: width < 768 ? 32 : 36,
    height: width < 768 ? 32 : 36,
    borderRadius: width < 768 ? 16 : 18,
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: width < 768 ? 8 : 12,
  },
  cardTitle: {
    fontSize: width < 768 ? 14 : 16,
    fontWeight: 'bold',
    color: '#fff', // White text on navy background
    marginBottom: width < 768 ? 4 : 6,
    fontFamily: 'System',
    textAlign: width < 768 ? 'center' : 'left',
  },
  cardSubtitle: {
    fontSize: width < 768 ? 11 : 13,
    color: '#F56E0F', // Primary orange
    marginBottom: width < 768 ? 2 : 4,
    lineHeight: width < 768 ? 14 : 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  cardEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F56E0F', // Primary orange
    paddingHorizontal: width < 768 ? 8 : 12,
    paddingVertical: width < 768 ? 4 : 6,
    borderRadius: width < 768 ? 12 : 16,
    borderWidth: 2,
    borderColor: '#F56E0F',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'center',
  },
  cardEditButtonText: {
    fontSize: width < 768 ? 10 : 12,
    color: '#FBFBFB', // Light text
    marginLeft: 4,
    fontWeight: 'bold',
  },
  // Settings Section
  settingsSection: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    marginTop: 20,
    padding: width < 768 ? 16 : 24,
  },
  settingsTitle: {
    fontSize: width < 768 ? 20 : 22,
    fontWeight: 'bold',
    color: '#fff', // White text
    marginBottom: width < 768 ? 16 : 20,
    fontFamily: 'System',
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#fff', // White text
    marginLeft: 12,
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
    maxHeight: '90%',
    minHeight: '60%',
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
    flex: 1,
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
  // New styles for enhanced profile
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // Edit functionality styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f7ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4285f4',
  },
  editSectionButtonText: {
    fontSize: 12,
    color: '#4285f4',
    marginLeft: 4,
    fontWeight: '500',
  },
  editForm: {
    gap: 16,
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
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Picture upload styles
  pictureUploadButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4285f4',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  backgroundPictureUploadButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Success modal styles
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
  // Skeleton Loading Styles
  skeletonInfoCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: width < 768 ? 12 : 16,
    padding: width < 768 ? 12 : 16,
    borderWidth: 2,
    borderColor: '#F56E0F', // Primary orange
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: width < 768 ? 180 : 160,
    marginBottom: width < 768 ? 8 : 0,
    width: '100%',
    opacity: 0.7,
  },
  skeletonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: width < 768 ? 8 : 12,
    width: '100%',
  },
  skeletonCardIcon: {
    width: width < 768 ? 32 : 36,
    height: width < 768 ? 32 : 36,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: width < 768 ? 16 : 18,
    marginRight: 8,
  },
  skeletonCardTitle: {
    width: '60%',
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
  },
  skeletonCardContent: {
    flex: 1,
    alignItems: 'center',
    marginBottom: width < 768 ? 8 : 12,
    width: '100%',
  },
  skeletonCardSubtitle: {
    width: '80%',
    height: 12,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 3,
    marginBottom: width < 768 ? 2 : 4,
  },
  skeletonCardEditButton: {
    width: 60,
    height: 24,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: width < 768 ? 12 : 16,
    alignSelf: 'center',
  },
  // Cover Photo Skeleton Styles
  skeletonCoverPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1B1B1E', // Dark secondary background
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  skeletonCoverPhotoIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 32,
    marginBottom: 12,
  },
  skeletonCoverPhotoText: {
    width: 120,
    height: 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 8,
  },
  // Profile Section Skeleton Styles
  skeletonProfileSection: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    padding: width < 768 ? 16 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    opacity: 0.7,
  },
  skeletonProfileImageContainer: {
    position: 'relative',
    marginRight: width < 768 ? 16 : 20,
  },
  skeletonProfileImage: {
    width: width < 768 ? 80 : 100,
    height: width < 768 ? 80 : 100,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: width < 768 ? 40 : 50,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  skeletonProfileUploadButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: width < 768 ? 16 : 20,
    width: width < 768 ? 32 : 36,
    height: width < 768 ? 32 : 36,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  skeletonProfileInfo: {
    flex: 1,
    marginRight: width < 768 ? 12 : 16,
  },
  skeletonCoordinatorName: {
    width: '70%',
    height: width < 768 ? 24 : 28,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 6,
    marginBottom: width < 768 ? 4 : 6,
  },
  skeletonCoordinatorProgram: {
    width: '50%',
    height: width < 768 ? 14 : 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
  },
});
