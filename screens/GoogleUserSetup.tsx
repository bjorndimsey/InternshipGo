import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiService } from '../lib/api';

const { width } = Dimensions.get('window');

interface GoogleUserSetupProps {
  googleUser: any;
  googleToken: string;
  onComplete: (userData: any, token: string) => void;
  onCancel: () => void;
}

export default function GoogleUserSetup({ googleUser, googleToken, onComplete, onCancel }: GoogleUserSetupProps) {
  const [userType, setUserType] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleUserTypeSelect = (type: string) => {
    setUserType(type);
    setFormData({
      email: googleUser.email,
      firstName: googleUser.given_name || googleUser.name?.split(' ')[0] || '',
      lastName: googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '',
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!userType) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select a user type',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    // Validate required fields based on user type
    const requiredFields = getRequiredFields(userType);
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());
    
    if (missingFields.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: `Please fill in: ${missingFields.join(', ')}`,
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const completeUserData = {
        ...formData,
        userType: userType.charAt(0).toUpperCase() + userType.slice(1), // Capitalize first letter
        googleId: googleUser.id,
        profilePicture: googleUser.picture,
        password: 'google_oauth', // Placeholder for Google users
      };

      // Call the registration API with Google user data
      const response = await apiService.register(completeUserData);
      
      if (response.success && response.user) {
        Toast.show({
          type: 'success',
          text1: 'Account Setup Complete! 🎉',
          text2: 'Your Google account has been successfully linked',
          position: 'top',
          visibilityTime: 5000,
        });
        
        setTimeout(() => {
          onComplete(response.user, googleToken);
        }, 1500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Setup Failed',
          text2: response.message || 'Failed to complete account setup',
          position: 'top',
          visibilityTime: 5000,
        });
      }
    } catch (error: any) {
      console.error('Google user setup error:', error);
      Toast.show({
        type: 'error',
        text1: 'Setup Failed',
        text2: 'Failed to complete account setup. Please try again.',
        position: 'top',
        visibilityTime: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRequiredFields = (type: string) => {
    switch (type) {
      case 'student':
        return ['firstName', 'lastName', 'idNumber', 'age', 'year', 'program', 'major', 'address'];
      case 'company':
        return ['companyName', 'industry', 'address'];
      case 'coordinator':
        return ['firstName', 'lastName', 'program', 'phoneNumber', 'address'];
      default:
        return [];
    }
  };

  const renderFormFields = () => {
    if (!userType) return null;

    switch (userType) {
      case 'student':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Student ID (e.g., 2020-1234)"
              value={formData.idNumber || ''}
              onChangeText={(text) => handleInputChange('idNumber', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Age"
              value={formData.age || ''}
              onChangeText={(text) => handleInputChange('age', text)}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Year Level (e.g., 1st, 2nd, 3rd, 4th)"
              value={formData.year || ''}
              onChangeText={(text) => handleInputChange('year', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Date of Birth (MM/DD/YYYY)"
              value={formData.dateOfBirth || ''}
              onChangeText={(text) => handleInputChange('dateOfBirth', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Program (e.g., BSIT, BSCS)"
              value={formData.program || ''}
              onChangeText={(text) => handleInputChange('program', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Major/Specialization"
              value={formData.major || ''}
              onChangeText={(text) => handleInputChange('major', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={formData.address || ''}
              onChangeText={(text) => handleInputChange('address', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              value={formData.phoneNumber || ''}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              keyboardType="phone-pad"
            />
          </>
        );
      case 'company':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Company Name"
              value={formData.companyName || ''}
              onChangeText={(text) => handleInputChange('companyName', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Industry"
              value={formData.industry || ''}
              onChangeText={(text) => handleInputChange('industry', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Company Address"
              value={formData.address || ''}
              onChangeText={(text) => handleInputChange('address', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              value={formData.phoneNumber || ''}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              keyboardType="phone-pad"
            />
          </>
        );
      case 'coordinator':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Program"
              value={formData.program || ''}
              onChangeText={(text) => handleInputChange('program', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={formData.phoneNumber || ''}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={formData.address || ''}
              onChangeText={(text) => handleInputChange('address', text)}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f0" />
      
      {/* Background Bubbles */}
      <View style={styles.bubbleContainer}>
        <View style={[styles.bubble, styles.bubble1]} />
        <View style={[styles.bubble, styles.bubble2]} />
        <View style={[styles.bubble, styles.bubble3]} />
        <View style={[styles.bubble, styles.bubble4]} />
        <View style={[styles.bubble, styles.bubble5]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.formContainer}>
              <View style={styles.headerContainer}>
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>IG</Text>
                </View>
                <Text style={styles.title}>Complete Your Profile</Text>
                <Text style={styles.subtitle}>
                  Welcome {googleUser.name}! Please select your user type and complete your profile.
                </Text>
              </View>

              <View style={styles.formContent}>
                <View style={styles.userTypeContainer}>
                  <Text style={styles.label}>Select User Type:</Text>
                  
                  <TouchableOpacity
                    style={[styles.userTypeButton, userType === 'student' && styles.selectedUserType]}
                    onPress={() => handleUserTypeSelect('student')}
                  >
                    <Text style={[styles.userTypeText, userType === 'student' && styles.selectedUserTypeText]}>
                      Student
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.userTypeButton, userType === 'company' && styles.selectedUserType]}
                    onPress={() => handleUserTypeSelect('company')}
                  >
                    <Text style={[styles.userTypeText, userType === 'company' && styles.selectedUserTypeText]}>
                      Company
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.userTypeButton, userType === 'coordinator' && styles.selectedUserType]}
                    onPress={() => handleUserTypeSelect('coordinator')}
                  >
                    <Text style={[styles.userTypeText, userType === 'coordinator' && styles.selectedUserTypeText]}>
                      Coordinator
                    </Text>
                  </TouchableOpacity>
                </View>

                {userType && (
                  <View style={styles.formFields}>
                    <Text style={styles.sectionTitle}>
                      {userType === 'student' ? 'Student Information' : 
                       userType === 'company' ? 'Company Information' : 'Coordinator Information'}
                    </Text>
                    
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      placeholder="Email"
                      value={formData.email || ''}
                      editable={false}
                    />
                    
                    {userType !== 'company' && (
                      <>
                        <TextInput
                          style={styles.input}
                          placeholder="First Name"
                          value={formData.firstName || ''}
                          onChangeText={(text) => handleInputChange('firstName', text)}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Last Name"
                          value={formData.lastName || ''}
                          onChangeText={(text) => handleInputChange('lastName', text)}
                        />
                      </>
                    )}

                    {renderFormFields()}

                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={onCancel}
                        disabled={isLoading}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.button, styles.submitButton, isLoading && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                      >
                        <Text style={styles.submitButtonText}>
                          {isLoading ? 'Setting up...' : 'Complete Setup'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Toast Component */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 132, 0, 0.1)',
  },
  bubble1: {
    width: 100,
    height: 100,
    top: 50,
    left: 20,
  },
  bubble2: {
    width: 80,
    height: 80,
    top: 150,
    right: 30,
  },
  bubble3: {
    width: 120,
    height: 120,
    bottom: 200,
    left: 10,
  },
  bubble4: {
    width: 60,
    height: 60,
    bottom: 100,
    right: 40,
  },
  bubble5: {
    width: 90,
    height: 90,
    top: 300,
    right: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF8400',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '300',
    lineHeight: 22,
  },
  formContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  userTypeContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  userTypeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUserType: {
    backgroundColor: '#4285f4',
    borderColor: '#4285f4',
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedUserTypeText: {
    color: '#fff',
  },
  formFields: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
    marginBottom: 15,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  submitButton: {
    backgroundColor: '#4285f4',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
