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
import CertificateModal from '../components/CertificateModal';
import { EmailService } from '../../../lib/emailService';
import OTPVerificationScreen from '../../../screens/OTPVerificationScreen';
import NewPasswordScreen from '../../../screens/NewPasswordScreen';

const { width } = Dimensions.get('window');

interface CompanyProfile {
  id: string;
  userType: string;
  email: string;
  companyName: string;
  industry: string;
  address: string;
  profilePicture?: string;
  backgroundPicture?: string;
  customCertificateTemplateUrl?: string;
  qualifications?: string;
  skillsRequired?: string;
  companyDescription?: string;
  website?: string;
  phoneNumber?: string;
  contactPerson?: string;
  companySize?: string;
  foundedYear?: number;
  benefits?: string;
  workEnvironment?: string;
  availableInternSlots?: number;
  totalInternCapacity?: number;
  currentInternCount?: number;
  signature?: string | null;
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
  autoOpenLocationPicker?: boolean;
  onLocationPickerOpened?: () => void;
}

export default function ProfilePage({ currentUser, autoOpenLocationPicker, onLocationPickerOpened }: ProfilePageProps) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

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
  const [showLocationPictures, setShowLocationPictures] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [uploadingBackgroundPicture, setUploadingBackgroundPicture] = useState(false);
  const [uploadingCertificateTemplate, setUploadingCertificateTemplate] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<Array<{id: number; template_name: string; template_image_url: string; is_default: boolean}>>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState<number | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'otp' | 'password'>('otp');
  const [isLoadingOTP, setIsLoadingOTP] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [editData, setEditData] = useState({
    companyName: '',
    industry: '',
    address: '',
    qualifications: '',
    skillsRequired: '',
    companyDescription: '',
    website: '',
    phoneNumber: '',
    contactPerson: '',
    companySize: '',
    foundedYear: '',
    benefits: '',
    workEnvironment: '',
    availableInternSlots: '',
    totalInternCapacity: '',
    currentInternCount: '',
  });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Shimmer animation for skeleton loading
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
      fetchCustomTemplates();
      
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
        console.log('🔍 Raw API response:', userData);
        
        // Map the API response to our CompanyProfile interface
        const companyProfile: CompanyProfile = {
          id: userData.id.toString(),
          userType: userData.user_type,
          email: userData.email,
          companyName: userData.company_name || '',
          industry: userData.industry || '',
          address: userData.address || '',
          profilePicture: userData.profile_picture,
          backgroundPicture: userData.background_picture,
          customCertificateTemplateUrl: userData.custom_certificate_template_url,
          qualifications: userData.qualifications || '',
          skillsRequired: userData.skills_required || '',
          companyDescription: userData.company_description || '',
          website: userData.website || '',
          phoneNumber: userData.phone_number || '',
          contactPerson: userData.contact_person || '',
          companySize: userData.company_size || '',
          foundedYear: userData.founded_year,
          benefits: userData.benefits || '',
          workEnvironment: userData.work_environment || '',
          availableInternSlots: userData.available_intern_slots || 0,
          totalInternCapacity: userData.total_intern_capacity || 0,
          currentInternCount: userData.current_intern_count || 0,
          signature: userData.signature || userData.esignature || null,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at,
        };
        
        console.log('🔍 Mapped company profile:', companyProfile);
        setProfile(companyProfile);
        setEditData({
          companyName: companyProfile.companyName,
          industry: companyProfile.industry,
          address: companyProfile.address,
          qualifications: companyProfile.qualifications || '',
          skillsRequired: companyProfile.skillsRequired || '',
          companyDescription: companyProfile.companyDescription || '',
          website: companyProfile.website || '',
          phoneNumber: companyProfile.phoneNumber || '',
          contactPerson: companyProfile.contactPerson || '',
          companySize: companyProfile.companySize || '',
          foundedYear: companyProfile.foundedYear?.toString() || '',
          benefits: companyProfile.benefits || '',
          workEnvironment: companyProfile.workEnvironment || '',
          availableInternSlots: companyProfile.availableInternSlots?.toString() || '',
          totalInternCapacity: companyProfile.totalInternCapacity?.toString() || '',
          currentInternCount: companyProfile.currentInternCount?.toString() || '',
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
      // Hide skeleton after a short delay to show the animation
      setTimeout(() => {
        setShowSkeleton(false);
      }, 1000);
    }
  };

  const handleEditProfile = () => {
    // Populate editData with all current profile values
    if (profile) {
      setEditData({
        companyName: profile.companyName,
        industry: profile.industry,
        address: profile.address,
        qualifications: profile.qualifications || '',
        skillsRequired: profile.skillsRequired || '',
        companyDescription: profile.companyDescription || '',
        website: profile.website || '',
        phoneNumber: profile.phoneNumber || '',
        contactPerson: profile.contactPerson || '',
        companySize: profile.companySize || '',
        foundedYear: profile.foundedYear?.toString() || '',
        benefits: profile.benefits || '',
        workEnvironment: profile.workEnvironment || '',
        availableInternSlots: profile.availableInternSlots?.toString() || '',
        totalInternCapacity: profile.totalInternCapacity?.toString() || '',
        currentInternCount: profile.currentInternCount?.toString() || '',
      });
    }
    setShowEditModal(true);
  };

  const handleEditSection = (section: string) => {
    setEditingSection(section);
    
    // Populate editData with current profile values for this section
    if (profile) {
      const sectionFields = getSectionFields(section);
      const newEditData = { ...editData };
      
      sectionFields.forEach(field => {
        if (field === 'foundedYear' || field === 'availableInternSlots' || field === 'totalInternCapacity' || field === 'currentInternCount') {
          (newEditData as any)[field] = (profile as any)[field]?.toString() || '';
        } else {
          (newEditData as any)[field] = (profile as any)[field] || '';
        }
      });
      
      setEditData(newEditData);
    }
    
    setShowEditModal(true);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  };

  const getSectionFields = (section: string) => {
    switch (section) {
      case 'company-details':
        return ['companyDescription', 'website', 'phoneNumber', 'contactPerson', 'companySize', 'foundedYear'];
      case 'qualifications-skills':
        return ['qualifications', 'skillsRequired'];
      case 'work-environment':
        return ['workEnvironment', 'benefits'];
      case 'internship-capacity':
        return ['availableInternSlots', 'totalInternCapacity', 'currentInternCount'];
      default:
        return [];
    }
  };

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'company-details':
        return 'Edit Company Details';
      case 'qualifications-skills':
        return 'Edit Qualifications & Skills';
      case 'work-environment':
        return 'Edit Work Environment & Benefits';
      case 'internship-capacity':
        return 'Edit Internship Capacity';
      default:
        return 'Edit Profile';
    }
  };

  const handleSaveProfile = async () => {
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
          if (key === 'foundedYear' || key === 'availableInternSlots' || key === 'totalInternCapacity' || key === 'currentInternCount') {
            (updatedProfile as any)[key] = (dataToSend as any)[key] ? parseInt((dataToSend as any)[key]) : 0;
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
      const response = await fetch('http://localhost:3001/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: currentUser.email }),
      });

      const data = await response.json();

      if (data.success) {
        // Send OTP via EmailJS
        const emailResult = await EmailService.sendOTPEmail(
          currentUser.email,
          data.otp,
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
      const response = await fetch('http://localhost:3001/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: currentUser.email }),
      });

      const data = await response.json();

      if (data.success) {
        const emailResult = await EmailService.sendOTPEmail(
          currentUser.email,
          data.otp,
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
            'internship-avatars/company-profiles',
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
            'internship-avatars/company-backgrounds',
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

  const handleSignature = () => {
    setShowSignatureModal(true);
  };

  const handleCloseSignature = () => {
    setShowSignatureModal(false);
  };

  const handleSignatureSaveSuccess = (signatureUrl: string) => {
    // Update the profile with the new signature URL
    if (profile) {
      setProfile({
        ...profile,
        signature: signatureUrl,
      });
    }
    setShowSignatureModal(false);
    showSuccess('Signature saved successfully!');
  };

  const handleCertificate = () => {
    setShowCertificateModal(true);
  };

  const handleCloseCertificate = () => {
    setShowCertificateModal(false);
  };

  const fetchCustomTemplates = async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoadingTemplates(true);
      const response = await apiService.getCustomTemplates(currentUser.id);
      
      if (response.success && (response as any).templates) {
        setCustomTemplates((response as any).templates);
      }
    } catch (error) {
      console.error('Error fetching custom templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleUploadCertificateTemplate = async () => {
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
        
        // Certificate templates should be larger - recommend 1200x1600px
        if (file.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
          document.body.removeChild(input);
          return;
        }
        
        setUploadingCertificateTemplate(true);
        
        try {
          const uploadResult = await CloudinaryService.uploadImage(
            file,
            'internship-avatars/certificate-templates',
            {
              transformation: 'w_1200,h_1600,c_pad,q_auto:best,f_auto'
            }
          );
          
          if (uploadResult.success && uploadResult.url) {
            // Create the template using the new API
            const response = await apiService.createCustomTemplate({
              companyId: currentUser!.id,
              templateName: `Template ${customTemplates.length + 1}`,
              templateImageUrl: uploadResult.url
            });
            
            if (response.success) {
              // Refresh templates list
              await fetchCustomTemplates();
              setSuccessMessage('Certificate template uploaded successfully! You can now use it when generating certificates.');
              setShowSuccessModal(true);
            } else {
              Alert.alert('Error', response.message || 'Failed to save certificate template.');
            }
          } else {
            Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload image. Please try again.');
          }
        } catch (error) {
          console.error('Certificate template upload error:', error);
          Alert.alert('Error', 'Failed to upload certificate template. Please try again.');
        } finally {
          setUploadingCertificateTemplate(false);
          document.body.removeChild(input);
        }
      };
      
      input.oncancel = () => {
        document.body.removeChild(input);
      };
      
    } catch (error) {
      console.error('Certificate template upload error:', error);
      Alert.alert('Error', 'Failed to open file picker. Please try again.');
    }
  };

  const handleDeleteTemplate = (templateId: number) => {
    console.log('🗑️ handleDeleteTemplate called with templateId:', templateId);
    setShowTemplateMenu(null);
    setTemplateToDelete(templateId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    console.log('✅ Delete confirmed, starting deletion...', templateToDelete);
    try {
      setShowDeleteConfirm(false);
      console.log('📡 Calling deleteCustomTemplate API...', {
        templateId: templateToDelete.toString(),
        companyId: currentUser!.id
      });
      
      const response = await apiService.deleteCustomTemplate(templateToDelete.toString(), currentUser!.id);
      
      console.log('📥 Delete response received:', response);
      
      if (response.success) {
        console.log('✅ Template deleted successfully, refreshing list...');
        // Refresh templates list
        await fetchCustomTemplates();
        Toast.show({
          type: 'success',
          text1: 'Template Deleted',
          text2: 'The template has been deleted successfully',
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        console.error('❌ Delete failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to delete template.');
      }
      setTemplateToDelete(null);
    } catch (error) {
      console.error('❌ Error deleting template:', error);
      Alert.alert('Error', `Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTemplateToDelete(null);
    }
  };

  const cancelDeleteTemplate = () => {
    console.log('❌ Delete cancelled');
    setShowDeleteConfirm(false);
    setTemplateToDelete(null);
  };

  const handleViewTemplate = (templateUrl: string) => {
    setViewingTemplate(templateUrl);
  };

  const SectionHeader = ({ title, sectionId, hasData }: { title: string; sectionId: string; hasData: boolean }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {width < 768 && (
          <View style={styles.sectionBadge}>
            <MaterialIcons name="business" size={16} color="#02050a" />
            <Text style={styles.sectionBadgeText}>Info</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.editSectionButton}
        onPress={() => handleEditSection(sectionId)}
      >
        <MaterialIcons name="edit" size={width < 768 ? 18 : 16} color="#02050a" />
        <Text style={styles.editSectionButtonText}>
          {hasData ? 'Edit' : 'Add'}
        </Text>
      </TouchableOpacity>
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
          <Animated.View style={[styles.skeletonCompanyName, { opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonCompanyIndustry, { opacity: shimmerOpacity }]} />
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
              {profile.profilePicture ? (
                <Image source={{ uri: profile.profilePicture }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileText}>{profile.companyName.charAt(0)}</Text>
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
              <Text style={styles.companyName}>{profile.companyName}</Text>
              <Text style={styles.companyIndustry}>{profile.industry}</Text>
            </View>
            
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <MaterialIcons name="edit" size={18} color="#F56E0F" />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
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
              {/* Company Information Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="business" size={24} color="#F56E0F" />
                  </View>
                  <Text style={styles.cardTitle}>Company Information</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>Industry: {profile.industry || 'Not specified'}</Text>
                  <Text style={styles.cardSubtitle}>Address: {profile.address || 'Not specified'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('company-details')}
                >
                  <MaterialIcons name="add" size={16} color="#02050a" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Contact Information Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="email" size={24} color="#F56E0F" />
                  </View>
                  <Text style={styles.cardTitle}>Contact Information</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>{profile.email}</Text>
                  {profile.phoneNumber && (
                    <Text style={styles.cardSubtitle}>{profile.phoneNumber}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('company-details')}
                >
                  <MaterialIcons name="add" size={16} color="#02050a" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Website Card */}
              {profile.website && (
                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIcon}>
                      <MaterialIcons name="language" size={24} color="#F56E0F" />
                    </View>
                    <Text style={styles.cardTitle}>Website</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardSubtitle}>{profile.website}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.cardEditButton} 
                    onPress={() => handleEditSection('company-details')}
                  >
                    <MaterialIcons name="add" size={16} color="#02050a" />
                    <Text style={styles.cardEditButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Qualifications & Skills Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="school" size={24} color="#F56E0F" />
                  </View>
                  <Text style={styles.cardTitle}>Qualifications & Skills</Text>
                </View>
                <View style={styles.cardContent}>
                  {profile.qualifications ? (
                    <Text style={styles.cardSubtitle} numberOfLines={3}>
                      Qualifications: {profile.qualifications}
                    </Text>
                  ) : (
                    <Text style={styles.cardSubtitle}>Qualifications: Not specified</Text>
                  )}
                  {profile.skillsRequired ? (
                    <Text style={styles.cardSubtitle} numberOfLines={3}>
                      Skills: {profile.skillsRequired}
                    </Text>
                  ) : (
                    <Text style={styles.cardSubtitle}>Skills: Not specified</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('qualifications-skills')}
                >
                  <MaterialIcons name="add" size={16} color="#02050a" />
                  <Text style={styles.cardEditButtonText}>
                    {profile.qualifications || profile.skillsRequired ? 'Edit' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Work Environment & Benefits Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="work" size={24} color="#F56E0F" />
                  </View>
                  <Text style={styles.cardTitle}>Work Environment & Benefits</Text>
                </View>
                <View style={styles.cardContent}>
                  {profile.workEnvironment ? (
                    <Text style={styles.cardSubtitle} numberOfLines={3}>
                      Environment: {profile.workEnvironment}
                    </Text>
                  ) : (
                    <Text style={styles.cardSubtitle}>Environment: Not specified</Text>
                  )}
                  {profile.benefits ? (
                    <Text style={styles.cardSubtitle} numberOfLines={3}>
                      Benefits: {profile.benefits}
                    </Text>
                  ) : (
                    <Text style={styles.cardSubtitle}>Benefits: Not specified</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('work-environment')}
                >
                  <MaterialIcons name="add" size={16} color="#02050a" />
                  <Text style={styles.cardEditButtonText}>
                    {profile.workEnvironment || profile.benefits ? 'Edit' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.rightColumn}>
              {/* Company Details Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="info" size={24} color="#F56E0F" />
                  </View>
                  <Text style={styles.cardTitle}>Company Details</Text>
                </View>
                <View style={styles.cardContent}>
                  {profile.companySize && (
                    <Text style={styles.cardSubtitle}>Size: {profile.companySize}</Text>
                  )}
                  {profile.foundedYear && (
                    <Text style={styles.cardSubtitle}>Founded: {profile.foundedYear}</Text>
                  )}
                  {profile.contactPerson && (
                    <Text style={styles.cardSubtitle}>Contact: {profile.contactPerson}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('company-details')}
                >
                  <MaterialIcons name="add" size={16} color="#02050a" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Internship Capacity Card */}
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="group" size={24} color="#F56E0F" />
                  </View>
                  <Text style={styles.cardTitle}>Internship Capacity</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>Available Slots: {profile.availableInternSlots}</Text>
                  <Text style={styles.cardSubtitle}>Total Capacity: {profile.totalInternCapacity}</Text>
                  <Text style={styles.cardSubtitle}>Current Interns: {profile.currentInternCount}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={() => handleEditSection('internship-capacity')}
                >
                  <MaterialIcons name="add" size={16} color="#02050a" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Edit Profile Card */}
              <TouchableOpacity style={styles.editCard} onPress={handleEditProfile}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <MaterialIcons name="edit" size={24} color="#F56E0F" />
                  </View>
                  <Text style={styles.cardTitle}>Edit Profile</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardSubtitle}>Update your company information</Text>
                </View>
                <TouchableOpacity 
                  style={styles.cardEditButton} 
                  onPress={handleEditProfile}
                >
                  <MaterialIcons name="add" size={16} color="#02050a" />
                  <Text style={styles.cardEditButtonText}>Edit</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Account Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.sectionBadge}>
            <MaterialIcons name="settings" size={16} color="#02050a" />
            <Text style={styles.sectionBadgeText}>Settings</Text>
          </View>
        </View>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
            <View style={styles.settingIconContainer}>
              <MaterialIcons name="lock" size={20} color="#02050a" />
            </View>
            <View style={styles.settingContent}>
            <Text style={styles.settingText}>Change Password</Text>
              <Text style={styles.settingSubtext}>Update your account password</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#F4D03F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleLocationPicker}>
            <View style={styles.settingIconContainer}>
            <MaterialIcons name="location-on" size={20} color="#02050a" />
            </View>
            <View style={styles.settingContent}>
            <Text style={styles.settingText}>Set Location</Text>
              <Text style={styles.settingSubtext}>Update company location</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#F4D03F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleLocationPictures}>
            <View style={styles.settingIconContainer}>
            <MaterialIcons name="photo-camera" size={20} color="#02050a" />
            </View>
            <View style={styles.settingContent}>
            <Text style={styles.settingText}>Location Pictures</Text>
              <Text style={styles.settingSubtext}>Manage location photos</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#F4D03F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleSignature}>
            <View style={styles.settingIconContainer}>
              <MaterialIcons name="edit" size={20} color="#02050a" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Signature</Text>
              <Text style={styles.settingSubtext}>Manage your signature</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#F4D03F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleCertificate}>
            <View style={styles.settingIconContainer}>
              <MaterialIcons name="card-membership" size={20} color="#02050a" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Certificate</Text>
              <Text style={styles.settingSubtext}>View your certificates</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#F4D03F" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setShowTemplatesModal(true)}
            disabled={uploadingCertificateTemplate}
          >
            <View style={styles.settingIconContainer}>
              {uploadingCertificateTemplate ? (
                <ActivityIndicator size="small" color="#F56E0F" />
              ) : (
                <MaterialIcons name="upload-file" size={20} color="#02050a" />
              )}
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Certificate Templates</Text>
              <Text style={styles.settingSubtext}>
                {customTemplates.length > 0 
                  ? `${customTemplates.length} custom template${customTemplates.length > 1 ? 's' : ''}` 
                  : 'Upload custom certificate backgrounds'}
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#F4D03F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Templates Management Modal */}
      <Modal
        visible={showTemplatesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTemplatesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.headerLeftSection}>
                <MaterialIcons name="image" size={24} color="#F56E0F" />
                <Text style={styles.modalTitle}>Certificate Templates</Text>
              </View>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setShowTemplatesModal(false);
                  setShowTemplateMenu(null);
                }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Upload Button */}
              <TouchableOpacity
                style={styles.uploadTemplateButton}
                onPress={handleUploadCertificateTemplate}
                disabled={uploadingCertificateTemplate}
              >
                {uploadingCertificateTemplate ? (
                  <ActivityIndicator size="small" color="#F56E0F" />
                ) : (
                  <>
                    <MaterialIcons name="add" size={24} color="#F56E0F" />
                    <Text style={styles.uploadTemplateButtonText}>Upload New Template</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Templates List */}
              {loadingTemplates ? (
                <View style={styles.templatesLoading}>
                  <ActivityIndicator size="large" color="#F56E0F" />
                  <Text style={styles.templatesLoadingText}>Loading templates...</Text>
                </View>
              ) : customTemplates.length === 0 ? (
                <View style={styles.emptyTemplatesContainer}>
                  <MaterialIcons name="image" size={64} color="#999" />
                  <Text style={styles.emptyTemplatesText}>No custom templates yet</Text>
                  <Text style={styles.emptyTemplatesSubtext}>
                    Upload your first template to get started
                  </Text>
                </View>
              ) : (
                <View style={styles.templatesList}>
                  {customTemplates.map((template) => (
                    <View key={template.id} style={styles.templateItem}>
                      <TouchableOpacity
                        onPress={() => handleViewTemplate(template.template_image_url)}
                        style={styles.templateThumbnailContainer}
                      >
                        <Image
                          source={{ uri: template.template_image_url }}
                          style={styles.templateThumbnail}
                          resizeMode="cover"
                        />
                        <View style={styles.templateThumbnailOverlay}>
                          <MaterialIcons name="visibility" size={20} color="#fff" />
                          <Text style={styles.templateViewText}>View</Text>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName} numberOfLines={1}>
                          {template.template_name}
                        </Text>
                        {template.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.templateMenuContainer}>
                        <TouchableOpacity
                          style={styles.templateMenuButton}
                          onPress={() => setShowTemplateMenu(showTemplateMenu === template.id ? null : template.id)}
                        >
                          <MaterialIcons name="more-vert" size={20} color="#F56E0F" />
                        </TouchableOpacity>
                        {showTemplateMenu === template.id && (
                          <>
                            <TouchableOpacity
                              style={styles.templateMenuBackdrop}
                              activeOpacity={1}
                              onPress={() => setShowTemplateMenu(null)}
                            />
                            <View style={styles.templateMenuDropdown}>
                              <TouchableOpacity
                                style={styles.templateMenuOption}
                                onPress={() => handleDeleteTemplate(template.id)}
                              >
                                <MaterialIcons name="delete" size={18} color="#FF4444" />
                                <Text style={styles.templateMenuOptionText}>Delete</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Template Modal */}
      <Modal
        visible={viewingTemplate !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewingTemplate(null)}
      >
        <View style={styles.viewTemplateOverlay}>
          <View style={styles.viewTemplateContent}>
            <View style={styles.viewTemplateHeader}>
              <Text style={styles.viewTemplateTitle}>Template Preview</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setViewingTemplate(null)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {viewingTemplate && (
              <ScrollView
                style={styles.viewTemplateScroll}
                contentContainerStyle={styles.viewTemplateScrollContent}
                maximumZoomScale={3}
                minimumZoomScale={0.5}
              >
                <Image
                  source={{ uri: viewingTemplate }}
                  style={styles.viewTemplateImage}
                  resizeMode="contain"
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelDeleteTemplate}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteConfirmModal}>
            <View style={styles.deleteConfirmHeader}>
              <MaterialIcons name="warning" size={32} color="#FF4444" />
              <Text style={styles.deleteConfirmTitle}>Delete Template</Text>
            </View>
            <Text style={styles.deleteConfirmMessage}>
              Are you sure you want to delete this template? This action cannot be undone.
            </Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.deleteConfirmButtonCancel]}
                onPress={cancelDeleteTemplate}
              >
                <Text style={styles.deleteConfirmButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.deleteConfirmButtonDelete]}
                onPress={confirmDeleteTemplate}
              >
                <Text style={styles.deleteConfirmButtonDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              {(!editingSection || editingSection === 'company-details') && (
                <>
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

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                      value={editData.companyDescription}
                      onChangeText={(text) => setEditData({...editData, companyDescription: text})}
                      placeholder="Describe your company"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Website</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.website}
                  onChangeText={(text) => setEditData({...editData, website: text})}
                      placeholder="https://www.company.com"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.phoneNumber}
                  onChangeText={(text) => setEditData({...editData, phoneNumber: text})}
                      placeholder="+1 (555) 123-4567"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Person</Text>
                <TextInput
                  style={styles.textInput}
                  value={editData.contactPerson}
                  onChangeText={(text) => setEditData({...editData, contactPerson: text})}
                      placeholder="Name of contact person"
                />
              </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Company Size</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.companySize}
                      onChangeText={(text) => setEditData({...editData, companySize: text})}
                      placeholder="e.g., 1-10, 11-50, 51-200, 201-500, 500+"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Founded Year</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.foundedYear}
                      onChangeText={(text) => setEditData({...editData, foundedYear: text})}
                      placeholder="e.g., 2020"
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              {editingSection === 'qualifications-skills' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Required Qualifications</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.qualifications}
                      onChangeText={(text) => setEditData({...editData, qualifications: text})}
                      placeholder="List required qualifications for interns"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Skills Required</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.skillsRequired}
                      onChangeText={(text) => setEditData({...editData, skillsRequired: text})}
                      placeholder="List required skills for interns"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              )}

              {editingSection === 'work-environment' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Work Environment</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.workEnvironment}
                      onChangeText={(text) => setEditData({...editData, workEnvironment: text})}
                      placeholder="Describe the work environment"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Benefits</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={editData.benefits}
                      onChangeText={(text) => setEditData({...editData, benefits: text})}
                      placeholder="List benefits offered to interns"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              )}

              {editingSection === 'internship-capacity' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Available Intern Slots</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.availableInternSlots}
                      onChangeText={(text) => setEditData({...editData, availableInternSlots: text})}
                      placeholder="Number of open internship positions"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Total Intern Capacity</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.totalInternCapacity}
                      onChangeText={(text) => setEditData({...editData, totalInternCapacity: text})}
                      placeholder="Maximum interns the company can accommodate"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Intern Count</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editData.currentInternCount}
                      onChangeText={(text) => setEditData({...editData, currentInternCount: text})}
                      placeholder="Number of interns currently placed"
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingSection(null);
                }}
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

      {/* Signature Modal */}
      {currentUser && (
        <ESignature
          userId={currentUser.id}
          currentSignature={profile?.signature}
          visible={showSignatureModal}
          onClose={handleCloseSignature}
          onSaveSuccess={handleSignatureSaveSuccess}
        />
      )}

      {/* Certificate Modal */}
      {currentUser && profile && (
        <CertificateModal
        visible={showCertificateModal}
          onClose={handleCloseCertificate}
          companyId={currentUser.id}
          companyData={{
            companyName: profile.companyName,
            address: profile.address,
            signature: profile.signature || undefined,
            contactPerson: profile.contactPerson || undefined,
          }}
          onSuccess={(message) => {
            showSuccess(message || 'Certificates generated successfully!');
          }}
        />
      )}

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
              <MaterialIcons name="check-circle" size={64} color="#4caf50" />
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
    backgroundColor: '#2A2A2E'
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
  profileHeader: {
    backgroundColor: '#fff',
    padding: width < 768 ? 16 : 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    minHeight: width < 768 ? 320 : 400,
    overflow: 'hidden',
  },
  profileHeaderContent: {
    flexDirection: width < 768 ? 'column' : 'row',
    alignItems: width < 768 ? 'center' : 'flex-start',
    marginBottom: width < 768 ? 20 : 24,
    position: 'relative',
    zIndex: 5,
    marginTop: width < 768 ? 140 : 180,
    paddingHorizontal: width < 768 ? 12 : 16,
  },
  industryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  industry: {
    fontSize: width < 768 ? 18 : 16,
    color: '#5f6368',
    marginLeft: 6,
    fontWeight: '500',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  email: {
    fontSize: width < 768 ? 16 : 14,
    color: '#5f6368',
    marginLeft: 6,
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
    paddingHorizontal: width < 768 ? 24 : 28,
    paddingVertical: width < 768 ? 14 : 16,
    borderRadius: width < 768 ? 14 : 18,
    backgroundColor: 'rgba(66, 133, 244, 0.9)',
    shadowColor: '#4285f4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: width < 768 ? 140 : 160,
  },
  editButtonText: {
    color: '#fff',
    fontSize: width < 768 ? 16 : 18,
    fontWeight: '700',
    marginLeft: width < 768 ? 8 : 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    backgroundColor: '#1B1B1E', // Dark secondary background
    padding: width < 768 ? 16 : 20,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 0,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: width < 768 ? 'column' : 'row',
    justifyContent: width < 768 ? 'flex-start' : 'space-between',
    alignItems: width < 768 ? 'flex-start' : 'center',
    marginBottom: 16,
    gap: width < 768 ? 12 : 0,
  },
  sectionTitleContainer: {
    flexDirection: width < 768 ? 'column' : 'row',
    alignItems: width < 768 ? 'flex-start' : 'center',
    gap: width < 768 ? 8 : 0,
  },
  sectionTitle: {
    fontSize: width < 768 ? 20 : 22,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    fontFamily: 'System',
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 16,
    alignSelf: width < 768 ? 'flex-start' : 'auto',
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginLeft: 4,
  },
  editSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width < 768 ? 16 : 12,
    paddingVertical: width < 768 ? 10 : 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F56E0F', // Primary orange
    backgroundColor: '#F56E0F', // Primary orange
    minHeight: width < 768 ? 44 : 32,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editSectionButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: width < 768 ? 16 : 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: width < 768 ? 60 : 40,
  },
  emptyStateText: {
    fontSize: width < 768 ? 18 : 16,
    color: '#FBFBFB', // Light text
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: width < 768 ? 16 : 14,
    color: '#F56E0F', // Primary orange
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoGrid: {
    gap: width < 768 ? 20 : 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: width < 768 ? 12 : 8,
    backgroundColor: '#2A2A2E', // Dark input/gray background
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    borderWidth: 2,
    borderColor: '#F56E0F', // Primary orange border
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIconContainer: {
    width: width < 768 ? 48 : 40,
    height: width < 768 ? 48 : 40,
    borderRadius: width < 768 ? 24 : 20,
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width < 768 ? 20 : 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: width < 768 ? 14 : 13,
    color: '#F56E0F', // Primary orange
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: width < 768 ? 18 : 16,
    color: '#FBFBFB', // Light text
    fontWeight: '500',
    lineHeight: width < 768 ? 24 : 22,
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
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#F56E0F', // Primary orange border
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: width < 768 ? 24 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: width < 768 ? 72 : 64,
  },
  settingIconContainer: {
    width: width < 768 ? 48 : 40,
    height: width < 768 ? 48 : 40,
    borderRadius: width < 768 ? 24 : 20,
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width < 768 ? 20 : 16,
  },
  settingContent: {
    flex: 1,
  },
  settingText: {
    fontSize: width < 768 ? 18 : 16,
    color: '#FBFBFB', // Light text
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtext: {
    fontSize: width < 768 ? 16 : 14,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width < 768 ? 16 : 20,
  },
  modalContent: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: width < 768 ? 16 : 20,
    width: '100%',
    maxWidth: width < 768 ? width - 32 : 500,
    maxHeight: '90%',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: width < 768 ? 20 : 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E', // Dark input/gray background
    borderTopLeftRadius: width < 768 ? 16 : 20,
    borderTopRightRadius: width < 768 ? 16 : 20,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: width < 768 ? 18 : 20,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: width < 768 ? 20 : 24,
    maxHeight: width < 768 ? 500 : 400,
    backgroundColor: '#1B1B1E', // Dark secondary background
  },
  inputGroup: {
    marginBottom: width < 768 ? 24 : 20,
  },
  inputLabel: {
    fontSize: width < 768 ? 16 : 14,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 12,
    paddingHorizontal: width < 768 ? 20 : 16,
    paddingVertical: width < 768 ? 18 : 14,
    fontSize: width < 768 ? 18 : 16,
    color: '#FBFBFB', // Light text
    backgroundColor: '#2A2A2E', // Dark input/gray background
    minHeight: width < 768 ? 56 : 48,
  },
  textArea: {
    height: width < 768 ? 120 : 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: width < 768 ? 20 : 24,
    gap: width < 768 ? 12 : 16,
    backgroundColor: '#2A2A2E', // Dark input/gray background
    borderBottomLeftRadius: width < 768 ? 16 : 20,
    borderBottomRightRadius: width < 768 ? 16 : 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: width < 768 ? 16 : 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    alignItems: 'center',
    backgroundColor: '#1B1B1E', // Dark secondary background
    minHeight: width < 768 ? 52 : 48,
  },
  cancelButtonText: {
    fontSize: width < 768 ? 18 : 16,
    color: '#FBFBFB', // Light text
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: width < 768 ? 16 : 14,
    borderRadius: 12,
    backgroundColor: '#F56E0F', // Primary orange
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: width < 768 ? 52 : 48,
  },
  saveButtonText: {
    fontSize: width < 768 ? 18 : 16,
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
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width < 768 ? 20 : 40,
  },
  successModalContent: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: width < 768 ? 20 : 24,
    padding: width < 768 ? 32 : 40,
    alignItems: 'center',
    maxWidth: width < 768 ? width - 40 : 400,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: width < 768 ? 20 : 24,
  },
  successTitle: {
    fontSize: width < 768 ? 24 : 28,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: width < 768 ? 12 : 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: width < 768 ? 16 : 18,
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    lineHeight: width < 768 ? 24 : 26,
    marginBottom: width < 768 ? 24 : 32,
  },
  successButton: {
    backgroundColor: '#F56E0F', // Primary orange
    paddingHorizontal: width < 768 ? 32 : 40,
    paddingVertical: width < 768 ? 14 : 16,
    borderRadius: width < 768 ? 12 : 14,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minWidth: width < 768 ? 120 : 140,
  },
  successButtonText: {
    color: '#FBFBFB', // Light text
    fontSize: width < 768 ? 16 : 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: width < 768 ? 200 : 250,
    width: '100%',
    resizeMode: 'cover',
  },
  backgroundPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: width < 768 ? 200 : 250,
    width: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPlaceholderText: {
    fontSize: width < 768 ? 14 : 16,
    color: '#999',
    marginTop: 8,
    fontWeight: '500',
  },
  backgroundUploadButton: {
    position: 'absolute',
    top: width < 768 ? 16 : 20,
    right: width < 768 ? 16 : 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: width < 768 ? 20 : 24,
    width: width < 768 ? 40 : 48,
    height: width < 768 ? 40 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: width < 768 ? 200 : 250,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: width < 768 ? 16 : 20,
    paddingVertical: width < 768 ? 8 : 10,
    borderRadius: width < 768 ? 18 : 22,
    marginTop: width < 768 ? 12 : 16,
    marginBottom: width < 768 ? 8 : 12,
    alignSelf: 'flex-start',
  },
  companyBadgeText: {
    fontSize: width < 768 ? 12 : 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: width < 768 ? 6 : 8,
  },
  contactInfo: {
    marginTop: width < 768 ? 16 : 20,
    paddingHorizontal: width < 768 ? 4 : 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: width < 768 ? 8 : 10,
    paddingVertical: width < 768 ? 2 : 4,
  },
  contactText: {
    fontSize: width < 768 ? 13 : 15,
    color: '#fff',
    marginLeft: width < 768 ? 8 : 10,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: width < 768 ? 20 : 24,
    paddingTop: width < 768 ? 20 : 24,
    paddingHorizontal: width < 768 ? 8 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    gap: width < 768 ? 12 : 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: width < 768 ? 16 : 20,
    paddingVertical: width < 768 ? 8 : 10,
    borderRadius: width < 768 ? 18 : 22,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  statusDot: {
    width: width < 768 ? 8 : 10,
    height: width < 768 ? 8 : 10,
    borderRadius: width < 768 ? 4 : 5,
    backgroundColor: '#4caf50',
    marginRight: width < 768 ? 6 : 8,
  },
  statusText: {
    fontSize: width < 768 ? 12 : 14,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  companyName: {
    fontSize: width < 768 ? 24 : 28,
    fontWeight: 'bold',
    color: '#fff', // White text on navy background
    marginBottom: width < 768 ? 4 : 6,
    fontFamily: 'System',
  },
  companyIndustry: {
    fontSize: width < 768 ? 14 : 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '600',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F56E0F', // Primary orange
    paddingHorizontal: width < 768 ? 16 : 20,
    paddingVertical: width < 768 ? 10 : 12,
    borderRadius: width < 768 ? 8 : 10,
    borderWidth: 2,
    borderColor: '#F56E0F',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editProfileButtonText: {
    fontSize: width < 768 ? 14 : 16,
    color: '#FBFBFB', // Light text
    marginLeft: 6,
    fontWeight: 'bold',
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
    borderColor: '#1B1B1E', // Primary orange border
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
  editCard: {
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
  skeletonCompanyName: {
    width: '70%',
    height: width < 768 ? 24 : 28,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 6,
    marginBottom: width < 768 ? 4 : 6,
  },
  skeletonCompanyIndustry: {
    width: '50%',
    height: width < 768 ? 14 : 16,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 4,
  },
  templatesList: {
    gap: width < 768 ? 12 : 16,
  },
  templatesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  templatesLoadingText: {
    fontSize: 14,
    color: '#F56E0F',
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2E',
    borderRadius: 12,
    padding: width < 768 ? 12 : 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    marginBottom: width < 768 ? 8 : 12,
  },
  templateThumbnailContainer: {
    position: 'relative',
    marginRight: width < 768 ? 12 : 16,
  },
  templateThumbnail: {
    width: width < 768 ? 60 : 80,
    height: width < 768 ? 45 : 60,
    borderRadius: 8,
    backgroundColor: '#1B1B1E',
  } as any,
  templateThumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateViewText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  templateInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateName: {
    fontSize: width < 768 ? 14 : 16,
    fontWeight: '600',
    color: '#FBFBFB',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#F56E0F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  templateMenuContainer: {
    position: 'relative',
    zIndex: 10,
  },
  templateMenuButton: {
    padding: 8,
    borderRadius: 20,
  },
  templateMenuBackdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  templateMenuDropdown: {
    position: 'absolute',
    top: 32,
    right: 0,
    backgroundColor: '#1B1B1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 120,
    zIndex: 1000,
  },
  templateMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: width < 768 ? 12 : 10,
    gap: 8,
  },
  templateMenuOptionText: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
  },
  uploadTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: width < 768 ? 16 : 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F56E0F',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    marginBottom: 20,
    gap: 8,
  },
  uploadTemplateButtonText: {
    fontSize: width < 768 ? 16 : 14,
    color: '#F56E0F',
    fontWeight: '600',
  },
  emptyTemplatesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTemplatesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBFBFB',
    marginTop: 16,
  },
  emptyTemplatesSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  viewTemplateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width < 768 ? 16 : 20,
  },
  viewTemplateContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    width: '100%',
    maxWidth: width < 768 ? width - 32 : 900,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  viewTemplateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: width < 768 ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E',
  },
  viewTemplateTitle: {
    fontSize: width < 768 ? 18 : 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  viewTemplateScroll: {
    flex: 1,
    backgroundColor: '#1B1B1E',
  },
  viewTemplateScrollContent: {
    alignItems: 'center',
    padding: 20,
  },
  viewTemplateImage: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  deleteConfirmModal: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    padding: width < 768 ? 20 : 24,
    width: width < 768 ? width - 64 : 400,
    maxWidth: '90%',
  },
  deleteConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  deleteConfirmTitle: {
    fontSize: width < 768 ? 20 : 24,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  deleteConfirmMessage: {
    fontSize: width < 768 ? 14 : 16,
    color: '#999',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  deleteConfirmButton: {
    paddingHorizontal: width < 768 ? 20 : 24,
    paddingVertical: width < 768 ? 12 : 14,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  deleteConfirmButtonCancel: {
    backgroundColor: '#2A2A2E',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  deleteConfirmButtonCancelText: {
    fontSize: width < 768 ? 14 : 16,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  deleteConfirmButtonDelete: {
    backgroundColor: '#FF4444',
  },
  deleteConfirmButtonDeleteText: {
    fontSize: width < 768 ? 14 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
