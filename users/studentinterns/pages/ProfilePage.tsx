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
import ESignature from '../../../components/ESignature';
import { EmailService } from '../../../lib/emailService';
import OTPVerificationScreen from '../../../screens/OTPVerificationScreen';
import NewPasswordScreen from '../../../screens/NewPasswordScreen';

const { width } = Dimensions.get('window');

interface StudentProfile {
  id: string;
  email: string;
  user_type: string;
  google_id?: string;
  profile_picture?: string;
  background_picture?: string;
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
  skills?: string;
  interests?: string;
  bio?: string;
  phone_number?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  gpa?: number;
  expected_graduation?: string;
  availability?: string;
  preferred_location?: string;
  work_experience?: string;
  projects?: string;
  achievements?: string;
  signature?: string | null;
}

interface UserInfo {
  id: string;
  email: string;
  user_type: string;
  google_id?: string;
}

interface ProfilePageProps {
  currentUser: UserInfo;
  autoOpenLocationPicker?: boolean;
  onLocationPickerOpened?: () => void;
}

export default function ProfilePage({ currentUser, autoOpenLocationPicker, onLocationPickerOpened }: ProfilePageProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StudentProfile>>({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLocationPictures, setShowLocationPictures] = useState(false);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [uploadingBackgroundPicture, setUploadingBackgroundPicture] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<StudentProfile>>({});
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
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

  // Auto-open location picker if requested
  useEffect(() => {
    if (autoOpenLocationPicker && !showLocationPicker && profile) {
      // Small delay to ensure profile is loaded
      setTimeout(() => {
        setShowLocationPicker(true);
        if (onLocationPickerOpened) {
          onLocationPickerOpened();
        }
      }, 500);
    }
  }, [autoOpenLocationPicker, profile, onLocationPickerOpened]);

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
      console.log('Fetching profile for user:', currentUser);
      
      const response = await apiService.getProfile(currentUser.id);
      console.log('Profile response:', response);
      console.log('Profile user data:', response.user);
      
      if (response.success && response.user) {
        console.log('Setting profile with data:', response.user);
        // Map the API response to our StudentProfile interface
        const studentProfile: StudentProfile = {
          id: response.user.id.toString(),
          user_type: response.user.user_type,
          email: response.user.email,
          google_id: response.user.google_id,
          profile_picture: response.user.profile_picture,
          background_picture: response.user.background_picture,
          is_active: response.user.is_active,
          created_at: response.user.created_at,
          updated_at: response.user.updated_at,
          id_number: response.user.id_number || '',
          first_name: response.user.first_name || '',
          last_name: response.user.last_name || '',
          age: response.user.age || 0,
          year: response.user.year || '',
          date_of_birth: response.user.date_of_birth || '',
          program: response.user.program || '',
          major: response.user.major || '',
          address: response.user.address || '',
          skills: response.user.skills || '',
          interests: response.user.interests || '',
          bio: response.user.bio || '',
          phone_number: response.user.phone_number || '',
          linkedin_url: response.user.linkedin_url || '',
          github_url: response.user.github_url || '',
          portfolio_url: response.user.portfolio_url || '',
          gpa: response.user.gpa || 0,
          expected_graduation: response.user.expected_graduation || '',
          availability: response.user.availability || '',
          preferred_location: response.user.preferred_location || '',
          work_experience: response.user.work_experience || '',
          projects: response.user.projects || '',
          achievements: response.user.achievements || '',
          signature: response.user.signature || response.user.esignature || null,
        };
        
        setProfile(studentProfile);
      } else {
        Alert.alert('Error', 'Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to fetch profile data');
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

  const handleSave = async () => {
    if (!profile || !currentUser) return;

    try {
      // Only send the fields that are being edited based on the current section
      let dataToSend = {};
      
      if (editingSection) {
        // If editing a specific section, only send those fields
        const sectionFields = getSectionFields(editingSection);
        sectionFields.forEach(field => {
          if ((editData as any)[field] !== undefined && (editData as any)[field] !== '') {
            (dataToSend as any)[field] = (editData as any)[field];
          }
        });
      } else {
        // If editing the main profile, send all fields
        dataToSend = { ...editData };
      }

      console.log('📤 Sending data to API:', dataToSend);
      const response = await apiService.updateProfile(currentUser.id, dataToSend);
      
      if (response.success) {
        // Update only the fields that were actually sent
        const updatedProfile = { ...profile };
        
        Object.keys(dataToSend).forEach(key => {
          if (key === 'age' || key === 'gpa') {
            (updatedProfile as any)[key] = (dataToSend as any)[key] ? parseFloat((dataToSend as any)[key]) : 0;
          } else {
            (updatedProfile as any)[key] = (dataToSend as any)[key];
          }
        });

        setProfile(updatedProfile);
      setShowEditModal(false);
        setEditingSection(null);
        showSuccess('Profile updated successfully!');
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
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
          `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User'
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
          `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User'
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
      showSuccess('Password changed successfully!');
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

  const handleSignature = () => {
    setShowSignatureModal(true);
  };

  const handleCloseSignature = () => {
    setShowSignatureModal(false);
  };

  const handleSignatureSaveSuccess = (signatureUrl: string) => {
    setShowSignatureModal(false);
    showSuccess('Signature saved successfully!');
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

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const handleEditSection = (section: string) => {
    setEditingSection(section);
    
    // Populate editData with current profile values for this section
    if (profile) {
      const sectionFields = getSectionFields(section);
      const newEditData = { ...editData };
      
      sectionFields.forEach(field => {
        if (field === 'age' || field === 'gpa') {
          (newEditData as any)[field] = (profile as any)[field]?.toString() || '';
        } else {
          (newEditData as any)[field] = (profile as any)[field] || '';
        }
      });
      
      setEditData(newEditData);
    }
    
    setShowEditModal(true);
  };

  const getSectionFields = (section: string) => {
    switch (section) {
      case 'personal-info':
        return ['first_name', 'last_name', 'id_number', 'age', 'year', 'program', 'major', 'address', 'phone_number', 'date_of_birth'];
      case 'academic-info':
        return ['gpa', 'expected_graduation', 'availability', 'preferred_location'];
      case 'skills-interests':
        return ['skills', 'interests', 'bio'];
      case 'social-links':
        return ['linkedin_url', 'github_url', 'portfolio_url'];
      case 'experience-projects':
        return ['work_experience', 'projects', 'achievements'];
      default:
        return [];
    }
  };

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'personal-info':
        return 'Edit Personal Information';
      case 'academic-info':
        return 'Edit Academic Information';
      case 'skills-interests':
        return 'Edit Skills & Interests';
      case 'social-links':
        return 'Edit Social Links';
      case 'experience-projects':
        return 'Edit Experience & Projects';
      default:
        return 'Edit Profile';
    }
  };

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
          <Animated.View style={[styles.skeletonStudentName, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonStudentProgram, { opacity: shimmerOpacity }]} />
        </View>
      </View>
    );
  };

  const SectionHeader = ({ title, sectionId, hasData }: { title: string; sectionId: string; hasData: boolean }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => handleEditSection(sectionId)}
      >
        <MaterialIcons name="add" size={16} color="#4285f4" />
        <Text style={styles.addButtonText}>{hasData ? 'Edit' : 'Add'}</Text>
      </TouchableOpacity>
    </View>
  );

  const handleUploadProfilePicture = async () => {
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
            'internship-avatars/student-profiles',
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
                profile_picture: uploadResult.url
              };
              
              setProfile(updatedProfile);
              showSuccess('Profile picture updated successfully!');
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

  const handleUploadBackgroundPicture = async () => {
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
            'internship-avatars/student-backgrounds',
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
                background_picture: uploadResult.url
              };
              
              setProfile(updatedProfile);
              showSuccess('Background picture updated successfully!');
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
            {profile.background_picture ? (
              <Image source={{ uri: profile.background_picture }} style={styles.coverPhoto} />
            ) : (
              <View style={styles.coverPhotoPlaceholder}>
                <MaterialIcons name="landscape" size={64} color="#ccc" />
                <Text style={styles.coverPhotoPlaceholderText}>Add Cover Photo</Text>
              </View>
            )}
            
            {/* Edit Cover Button */}
            <TouchableOpacity 
              style={styles.editCoverButton} 
              onPress={handleUploadBackgroundPicture}
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
              {profile.profile_picture ? (
                <Image source={{ uri: profile.profile_picture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileText}>
                    {profile.first_name?.charAt(0) || ''}{profile.last_name?.charAt(0) || ''}
                  </Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.profileUploadButton} 
                onPress={handleUploadProfilePicture}
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
              <Text style={styles.studentName}>
              {profile.first_name || 'N/A'} {profile.last_name || 'N/A'}
            </Text>
              <Text style={styles.studentProgram}>{profile.program || 'Student'}</Text>
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
              {/* Personal Information Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="person" size={24} color="#FBFBFB" />
                  </View>
                  <Text style={styles.cardTitle}>Personal Information</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>ID: {profile.id_number || 'N/A'}</Text>
                  <Text style={styles.cardSubtitle}>Year: {profile.year || 'N/A'}</Text>
                  <Text style={styles.cardSubtitle}>Major: {profile.major || 'N/A'}</Text>
                  <Text style={styles.cardSubtitle}>Age: {profile.age || 'N/A'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('personal-info')}
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
                  {profile.phone_number && (
                    <Text style={styles.cardSubtitle}>{profile.phone_number}</Text>
                  )}
                  {profile.address && (
                    <Text style={styles.cardSubtitle}>{profile.address}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('personal-info')}
                >
                  <MaterialIcons name="add" size={16} color="#FBFBFB" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* Right Column */}
            <View style={styles.rightColumn}>
              {/* Skills Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="build" size={24} color="#FBFBFB" />
                  </View>
                  <Text style={styles.cardTitle}>Skills & Interests</Text>
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
                  onPress={() => handleEditSection('skills-interests')}
                >
                  <MaterialIcons name="add" size={16} color="#FBFBFB" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Social Links Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="link" size={24} color="#FBFBFB" />
                  </View>
                  <Text style={styles.cardTitle}>Social Links</Text>
                </View>
                <View style={styles.cardContent}>
                  {profile.linkedin_url && (
                    <Text style={styles.cardSubtitle}>LinkedIn: {profile.linkedin_url}</Text>
                  )}
                  {profile.github_url && (
                    <Text style={styles.cardSubtitle}>GitHub: {profile.github_url}</Text>
                  )}
                  {profile.portfolio_url && (
                    <Text style={styles.cardSubtitle}>Portfolio: {profile.portfolio_url}</Text>
                  )}
                  {!profile.linkedin_url && !profile.github_url && !profile.portfolio_url && (
                    <Text style={styles.cardSubtitle}>No social links added yet</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('social-links')}
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
        <TouchableOpacity style={styles.settingItem} onPress={handleSignature}>
          <MaterialIcons name="edit" size={20} color="#F56E0F" />
          <Text style={styles.settingText}>Signature</Text>
          <MaterialIcons name="chevron-right" size={20} color="#F56E0F" />
        </TouchableOpacity>
      </Animated.View>

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
              <Text style={styles.modalTitle}>
                {editingSection ? getSectionTitle(editingSection) : 'Edit Profile'}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingSection(null);
                }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {editingSection === 'personal-info' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>First Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.first_name || ''}
                      onChangeText={(text) => setEditData({...editData, first_name: text})}
                      placeholder="Enter first name"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Last Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.last_name || ''}
                      onChangeText={(text) => setEditData({...editData, last_name: text})}
                      placeholder="Enter last name"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Student ID *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.id_number || ''}
                      onChangeText={(text) => setEditData({...editData, id_number: text})}
                      placeholder="Enter student ID"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Age *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.age?.toString() || ''}
                      onChangeText={(text) => setEditData({...editData, age: parseInt(text) || 0})}
                      placeholder="Enter age"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Academic Year *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.year || ''}
                      onChangeText={(text) => setEditData({...editData, year: text})}
                      placeholder="e.g., 1st Year, 2nd Year, 3rd Year, 4th Year"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Program *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.program || ''}
                      onChangeText={(text) => setEditData({...editData, program: text})}
                      placeholder="e.g., BSIT, BSCS, BSIS"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Major *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.major || ''}
                      onChangeText={(text) => setEditData({...editData, major: text})}
                      placeholder="e.g., Software Engineering, Web Development"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Address *</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.address || ''}
                      onChangeText={(text) => setEditData({...editData, address: text})}
                      placeholder="Enter your address"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.phone_number || ''}
                      onChangeText={(text) => setEditData({...editData, phone_number: text})}
                      placeholder="+1 (555) 123-4567"
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date of Birth</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.date_of_birth || ''}
                      onChangeText={(text) => setEditData({...editData, date_of_birth: text})}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </>
              )}

              {editingSection === 'academic-info' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>GPA</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.gpa?.toString() || ''}
                      onChangeText={(text) => setEditData({...editData, gpa: parseFloat(text) || 0})}
                      placeholder="e.g., 3.5"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Expected Graduation</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.expected_graduation || ''}
                      onChangeText={(text) => setEditData({...editData, expected_graduation: text})}
                      placeholder="e.g., May 2024"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Availability</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.availability || ''}
                      onChangeText={(text) => setEditData({...editData, availability: text})}
                      placeholder="e.g., Full-time, Part-time, Summer only"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Preferred Location</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.preferred_location || ''}
                      onChangeText={(text) => setEditData({...editData, preferred_location: text})}
                      placeholder="e.g., Remote, New York, San Francisco"
                    />
                  </View>
                </>
              )}

              {editingSection === 'skills-interests' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Skills</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.skills || ''}
                      onChangeText={(text) => setEditData({...editData, skills: text})}
                      placeholder="List your technical skills (e.g., JavaScript, Python, React)"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Interests</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.interests || ''}
                      onChangeText={(text) => setEditData({...editData, interests: text})}
                      placeholder="List your interests and hobbies"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bio</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.bio || ''}
                      onChangeText={(text) => setEditData({...editData, bio: text})}
                      placeholder="Tell us about yourself"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </>
              )}

              {editingSection === 'social-links' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>LinkedIn URL</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.linkedin_url || ''}
                      onChangeText={(text) => setEditData({...editData, linkedin_url: text})}
                      placeholder="https://linkedin.com/in/yourprofile"
                      keyboardType="url"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>GitHub URL</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.github_url || ''}
                      onChangeText={(text) => setEditData({...editData, github_url: text})}
                      placeholder="https://github.com/yourusername"
                      keyboardType="url"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Portfolio URL</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.portfolio_url || ''}
                      onChangeText={(text) => setEditData({...editData, portfolio_url: text})}
                      placeholder="https://yourportfolio.com"
                      keyboardType="url"
                    />
                  </View>
                </>
              )}

              {editingSection === 'experience-projects' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Work Experience</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.work_experience || ''}
                      onChangeText={(text) => setEditData({...editData, work_experience: text})}
                      placeholder="Describe your work experience"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Projects</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.projects || ''}
                      onChangeText={(text) => setEditData({...editData, projects: text})}
                      placeholder="Describe your projects and achievements"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Achievements</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.achievements || ''}
                      onChangeText={(text) => setEditData({...editData, achievements: text})}
                      placeholder="List your achievements and awards"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              )}

              {!editingSection && (
              <Text style={styles.modalNote}>
                  Select a section to edit from the profile page.
              </Text>
              )}
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
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
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
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

      {/* Signature Modal */}
      {currentUser && (
        <ESignature
          userId={currentUser.id}
          currentSignature={profile?.signature || null}
          visible={showSignatureModal}
          onClose={handleCloseSignature}
          onSaveSuccess={handleSignatureSaveSuccess}
        />
      )}

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
  studentName: {
    fontSize: width < 768 ? 24 : 28,
    fontWeight: 'bold',
    color: '#fff', // White text on navy background
    marginBottom: width < 768 ? 4 : 6,
    fontFamily: 'System',
  },
  studentProgram: {
    fontSize: width < 768 ? 14 : 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '600',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: width < 768 ? 16 : 20,
    paddingVertical: width < 768 ? 10 : 12,
    borderRadius: width < 768 ? 8 : 10,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  editProfileButtonText: {
    fontSize: width < 768 ? 14 : 16,
    color: '#4285f4',
    marginLeft: 6,
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
  editCard: {
    backgroundColor: '#fff',
    borderRadius: width < 768 ? 12 : 16,
    padding: width < 768 ? 16 : 20,
    borderWidth: 1,
    borderColor: '#e8eaed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  // Modal Styles
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
    fontWeight: '500',
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
    backgroundColor: 'transparent',
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
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width < 768 ? 20 : 40,
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
  // Section Header Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: width < 768 ? 8 : 12,
  },
  sectionTitle: {
    fontSize: width < 768 ? 14 : 16,
    fontWeight: 'bold',
    color: '#fff', // White text on navy background
    fontFamily: 'System',
  },
  addButton: {
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
    minWidth: width < 768 ? 60 : 80,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: width < 768 ? 10 : 12,
    color: '#FBFBFB', // Light text
    marginLeft: 2,
    fontWeight: 'bold',
  },
  // Form Input Styles
  inputGroup: {
    marginBottom: width < 768 ? 16 : 20,
  },
  inputLabel: {
    fontSize: width < 768 ? 14 : 16,
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
    height: width < 768 ? 80 : 100,
    textAlignVertical: 'top',
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
  skeletonStudentName: {
    width: '70%',
    height: width < 768 ? 24 : 28,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 6,
    marginBottom: width < 768 ? 4 : 6,
  },
  skeletonStudentProgram: {
    width: '50%',
    height: width < 768 ? 14 : 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
  },
});
