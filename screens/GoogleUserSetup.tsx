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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import SplashCards from '../components/SplashCards';
import DatePicker from '../components/DatePicker';
import { apiService } from '../lib/api';

const { width, height } = Dimensions.get('window');

import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateAddress,
  validateYear,
  validateProgram,
  validateMajor,
  validateRequired,
  validateIdNumber,
  validateAge,
  validateDateOfBirth,
  validateCompanyName,
  validateIndustry,
  PROGRAM_OPTIONS,
  BSIT_MAJOR_OPTIONS,
  YEAR_OPTIONS,
  FieldValidation,
} from '../lib/validation';


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
  const [showSplashCards, setShowSplashCards] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [pendingToken, setPendingToken] = useState<string>('');
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showMajorDropdown, setShowMajorDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldValidation>({});

  const handleUserTypeSelect = (type: string) => {
    setUserType(type);
    setFormData({
      email: googleUser.email,
      firstName: googleUser.given_name || googleUser.name?.split(' ')[0] || '',
      middleName: '',
      lastName: googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '',
    });
    // Clear errors when switching user types
    setFieldErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev: FieldValidation) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Reset major when program changes
    if (field === 'program') {
      setFormData((prev: any) => ({ ...prev, major: '' }));
    }
  };

  const validateField = (field: string, value: string): boolean => {
    let validation;
    
    switch (field) {
      case 'email':
        validation = validateEmail(value);
        break;
      case 'phoneNumber':
        validation = validatePhoneNumber(value);
        break;
      case 'address':
        validation = validateAddress(value);
        break;
      case 'year':
        validation = validateYear(value);
        break;
      case 'program':
        validation = validateProgram(value);
        break;
      case 'major':
        validation = validateMajor(value, formData.program);
        break;
      case 'idNumber':
        validation = validateIdNumber(value);
        break;
      case 'age':
        validation = validateAge(value);
        break;
      case 'dateOfBirth':
        validation = validateDateOfBirth(value);
        break;
      case 'companyName':
        validation = validateCompanyName(value);
        break;
      case 'industry':
        validation = validateIndustry(value);
        break;
      case 'firstName':
      case 'lastName':
        validation = validateRequired(value, field === 'firstName' ? 'First name' : 'Last name');
        break;
      case 'middleName':
        validation = { isValid: true, message: '' }; // Middle name is optional
        break;
      default:
        return true;
    }
    
    if (!validation.isValid) {
      setFieldErrors(prev => ({ ...prev, [field]: validation }));
      return false;
    } else {
      setFieldErrors((prev: FieldValidation) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }
  };

  const validateAllFields = (): boolean => {
    let isValid = true;
    
    // Common fields
    if (!validateField('email', formData.email)) isValid = false;
    if (!validateField('address', formData.address)) isValid = false;
    
    // User type specific fields
    if (userType === 'student') {
      if (!validateField('idNumber', formData.idNumber)) isValid = false;
      if (!validateField('firstName', formData.firstName)) isValid = false;
      if (!validateField('middleName', formData.middleName)) isValid = false;
      if (!validateField('lastName', formData.lastName)) isValid = false;
      if (!validateField('age', formData.age)) isValid = false;
      if (!validateField('year', formData.year)) isValid = false;
      if (!validateField('dateOfBirth', formData.dateOfBirth)) isValid = false;
      if (!validateField('program', formData.program)) isValid = false;
      if (!validateField('major', formData.major)) isValid = false;
    } else if (userType === 'coordinator') {
      if (!validateField('firstName', formData.firstName)) isValid = false;
      if (!validateField('middleName', formData.middleName)) isValid = false;
      if (!validateField('lastName', formData.lastName)) isValid = false;
      if (!validateField('program', formData.program)) isValid = false;
      if (!validateField('phoneNumber', formData.phoneNumber)) isValid = false;
    } else if (userType === 'company') {
      if (!validateField('companyName', formData.companyName)) isValid = false;
      if (!validateField('industry', formData.industry)) isValid = false;
    }
    
    return isValid;
  };

  const handleSubmit = async () => {
    if (!userType) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select a user type',
        position: 'top',
        topOffset: 60,
        visibilityTime: 4000,
      });
      return;
    }

    // Validate all fields
    const isValid = validateAllFields();
    
    if (!isValid) {
      const firstError = Object.values(fieldErrors)[0];
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: firstError?.message || 'Please fill in all required fields correctly',
        position: 'top',
        topOffset: 60,
        visibilityTime: 4000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const completeUserData = {
        ...formData,
        middleName: formData.middleName || 'N/A', // Set N/A if empty
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
          topOffset: 60,
          visibilityTime: 5000,
        });
        
        // Store user data and show splash cards
        setPendingUserData(response.user);
        setPendingToken(googleToken);
        setShowSplashCards(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Setup Failed',
          text2: response.message || 'Failed to complete account setup',
          position: 'top',
          topOffset: 60,
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
        topOffset: 60,
        visibilityTime: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplashCardsComplete = () => {
    setShowSplashCards(false);
    if (pendingUserData && pendingToken) {
      onComplete(pendingUserData, pendingToken);
    }
  };

  const renderProgramDropdown = () => (
    <View style={[styles.inputContainer, { zIndex: showProgramDropdown ? 1000 : (showYearDropdown ? -1 : 1) }]}>
      <Text style={styles.label}>Program *</Text>
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={[
            styles.input,
            fieldErrors.program && styles.errorBorder
          ]}
          onPress={() => setShowProgramDropdown(!showProgramDropdown)}
        >
          <Text style={[
            styles.inputText,
            !formData.program && styles.placeholderText
          ]}>
            {formData.program || 'Select Program'}
          </Text>
          <Text style={styles.dropdownArrow}>{showProgramDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showProgramDropdown && (
          <View style={styles.dropdownList}>
            {PROGRAM_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => {
                  handleInputChange('program', option.value);
                  setShowProgramDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {fieldErrors.program && (
        <Text style={styles.errorText}>{fieldErrors.program.message}</Text>
      )}
    </View>
  );

  const renderMajorDropdown = () => {
    if (formData.program !== 'BSIT') {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Major *</Text>
          <TextInput
            style={[
              styles.input,
              fieldErrors.major && styles.errorBorder
            ]}
            value={formData.major || ''}
            onChangeText={(text) => handleInputChange('major', text)}
            onBlur={() => validateField('major', formData.major)}
            placeholder="Enter your major or N/A"
            placeholderTextColor="#999"
          />
          {fieldErrors.major && (
            <Text style={styles.errorText}>{fieldErrors.major.message}</Text>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.inputContainer, { zIndex: showMajorDropdown ? 1000 : 1 }]}>
        <Text style={styles.label}>Major *</Text>
        <View style={styles.inputWrapper}>
          <TouchableOpacity
            style={[
              styles.input,
              fieldErrors.major && styles.errorBorder
            ]}
            onPress={() => setShowMajorDropdown(!showMajorDropdown)}
          >
            <Text style={[
              styles.inputText,
              !formData.major && styles.placeholderText
            ]}>
              {formData.major || 'Select Major'}
            </Text>
            <Text style={styles.dropdownArrow}>{showMajorDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showMajorDropdown && (
            <View style={styles.dropdownList}>
              {BSIT_MAJOR_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    handleInputChange('major', option.value);
                    setShowMajorDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {fieldErrors.major && (
          <Text style={styles.errorText}>{fieldErrors.major.message}</Text>
        )}
      </View>
    );
  };

  const renderYearDropdown = () => (
    <View style={[styles.inputContainer, { zIndex: showYearDropdown ? 99999 : 1 }]}>
      <Text style={styles.label}>Year *</Text>
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={[
            styles.input,
            fieldErrors.year && styles.errorBorder
          ]}
          onPress={() => setShowYearDropdown(!showYearDropdown)}
        >
          <Text style={[
            styles.inputText,
            !formData.year && styles.placeholderText
          ]}>
            {formData.year || 'Select Year'}
          </Text>
          <Text style={styles.dropdownArrow}>{showYearDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showYearDropdown && (
          <View style={[styles.dropdownList, { zIndex: 100000 }]}>
            {YEAR_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => {
                  handleInputChange('year', option.value);
                  setShowYearDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {fieldErrors.year && (
        <Text style={styles.errorText}>{fieldErrors.year.message}</Text>
      )}
    </View>
  );

  const renderFormFields = () => {
    if (!userType) return null;

    switch (userType) {
      case 'student':
        return (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Student ID (XXXX-XXXX) *</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.idNumber && styles.errorBorder
                ]}
                placeholder="0000-0000"
                value={formData.idNumber || ''}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  const formatted = cleaned.replace(/(\d{4})(\d{4})/, '$1-$2');
                  handleInputChange('idNumber', formatted);
                }}
                onBlur={() => validateField('idNumber', formData.idNumber)}
                keyboardType="numeric"
                maxLength={9}
              />
              {fieldErrors.idNumber && (
                <Text style={styles.errorText}>{fieldErrors.idNumber.message}</Text>
              )}
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Age *</Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.age && styles.errorBorder
                  ]}
                  placeholder="Enter your age"
                  value={formData.age || ''}
                  onChangeText={(text) => handleInputChange('age', text)}
                  onBlur={() => validateField('age', formData.age)}
                  keyboardType="numeric"
                />
                {fieldErrors.age && (
                  <Text style={styles.errorText}>{fieldErrors.age.message}</Text>
                )}
              </View>
              <View style={styles.inputHalf}>
                {renderYearDropdown()}
              </View>
            </View>
            <View style={[styles.inputContainer, { zIndex: -1 }]}>
              <Text style={styles.label}>Date of Birth *</Text>
              <DatePicker
                value={formData.dateOfBirth || ''}
                onDateChange={(date) => handleInputChange('dateOfBirth', date)}
                error={!!fieldErrors.dateOfBirth}
              />
              {fieldErrors.dateOfBirth && (
                <Text style={styles.errorText}>{fieldErrors.dateOfBirth.message}</Text>
              )}
            </View>
            {renderProgramDropdown()}
            {renderMajorDropdown()}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.address && styles.errorBorder
                ]}
                placeholder="Enter your address (minimum 12 characters)"
                value={formData.address || ''}
                onChangeText={(text) => handleInputChange('address', text)}
                onBlur={() => validateField('address', formData.address)}
                multiline
              />
              {fieldErrors.address && (
                <Text style={styles.errorText}>{fieldErrors.address.message}</Text>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.phoneNumber && styles.errorBorder
                ]}
                placeholder="09XXXXXXXXX"
                value={formData.phoneNumber || ''}
                onChangeText={(text) => handleInputChange('phoneNumber', text)}
                onBlur={() => validateField('phoneNumber', formData.phoneNumber)}
                keyboardType="phone-pad"
                maxLength={11}
              />
              {fieldErrors.phoneNumber && (
                <Text style={styles.errorText}>{fieldErrors.phoneNumber.message}</Text>
              )}
            </View>
          </>
        );
      case 'company':
        return (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Company Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.companyName && styles.errorBorder
                ]}
                placeholder="Enter company name"
                value={formData.companyName || ''}
                onChangeText={(text) => handleInputChange('companyName', text)}
                onBlur={() => validateField('companyName', formData.companyName)}
              />
              {fieldErrors.companyName && (
                <Text style={styles.errorText}>{fieldErrors.companyName.message}</Text>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Industry *</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.industry && styles.errorBorder
                ]}
                placeholder="Enter industry"
                value={formData.industry || ''}
                onChangeText={(text) => handleInputChange('industry', text)}
                onBlur={() => validateField('industry', formData.industry)}
              />
              {fieldErrors.industry && (
                <Text style={styles.errorText}>{fieldErrors.industry.message}</Text>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Company Address *</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.address && styles.errorBorder
                ]}
                placeholder="Enter company address (minimum 12 characters)"
                value={formData.address || ''}
                onChangeText={(text) => handleInputChange('address', text)}
                onBlur={() => validateField('address', formData.address)}
                multiline
              />
              {fieldErrors.address && (
                <Text style={styles.errorText}>{fieldErrors.address.message}</Text>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.phoneNumber && styles.errorBorder
                ]}
                placeholder="09XXXXXXXXX"
                value={formData.phoneNumber || ''}
                onChangeText={(text) => handleInputChange('phoneNumber', text)}
                onBlur={() => validateField('phoneNumber', formData.phoneNumber)}
                keyboardType="phone-pad"
                maxLength={11}
              />
              {fieldErrors.phoneNumber && (
                <Text style={styles.errorText}>{fieldErrors.phoneNumber.message}</Text>
              )}
            </View>
          </>
        );
      case 'coordinator':
        return (
          <>
            {renderProgramDropdown()}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.phoneNumber && styles.errorBorder
                ]}
                placeholder="09XXXXXXXXX"
                value={formData.phoneNumber || ''}
                onChangeText={(text) => handleInputChange('phoneNumber', text)}
                onBlur={() => validateField('phoneNumber', formData.phoneNumber)}
                keyboardType="phone-pad"
                maxLength={11}
              />
              {fieldErrors.phoneNumber && (
                <Text style={styles.errorText}>{fieldErrors.phoneNumber.message}</Text>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.address && styles.errorBorder
                ]}
                placeholder="Enter your address (minimum 12 characters)"
                value={formData.address || ''}
                onChangeText={(text) => handleInputChange('address', text)}
                onBlur={() => validateField('address', formData.address)}
                multiline
              />
              {fieldErrors.address && (
                <Text style={styles.errorText}>{fieldErrors.address.message}</Text>
              )}
            </View>
          </>
        );
      default:
        return null;
    }
  };

  // Show splash cards for new users
  if (showSplashCards) {
    return <SplashCards onComplete={handleSplashCardsComplete} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
      
      {/* Background Bubbles */}
      <View style={styles.bubbleContainer}>
        <View style={[styles.bubble, styles.bubble1]} />
        <View style={[styles.bubble, styles.bubble2]} />
        <View style={[styles.bubble, styles.bubble3]} />
        <View style={[styles.bubble, styles.bubble4]} />
        <View style={[styles.bubble, styles.bubble5]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Ionicons name="school-outline" size={60} color="#1E3A5F" />
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
                    
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={[styles.input, styles.disabledInput]}
                        placeholder="Email"
                        value={formData.email || ''}
                        editable={false}
                      />
                    </View>
                    
                    {userType !== 'company' && (
                      <>
                        <View style={styles.inputRow}>
                          <View style={styles.inputHalf}>
                            <Text style={styles.label}>First Name *</Text>
                            <TextInput
                              style={[
                                styles.input,
                                fieldErrors.firstName && styles.errorBorder
                              ]}
                              placeholder="Enter your first name"
                              value={formData.firstName || ''}
                              onChangeText={(text) => handleInputChange('firstName', text)}
                              onBlur={() => validateField('firstName', formData.firstName)}
                            />
                            {fieldErrors.firstName && (
                              <Text style={styles.errorText}>{fieldErrors.firstName.message}</Text>
                            )}
                          </View>
                          <View style={styles.inputHalf}>
                            <Text style={styles.label}>Last Name *</Text>
                            <TextInput
                              style={[
                                styles.input,
                                fieldErrors.lastName && styles.errorBorder
                              ]}
                              placeholder="Enter your last name"
                              value={formData.lastName || ''}
                              onChangeText={(text) => handleInputChange('lastName', text)}
                              onBlur={() => validateField('lastName', formData.lastName)}
                            />
                            {fieldErrors.lastName && (
                              <Text style={styles.errorText}>{fieldErrors.lastName.message}</Text>
                            )}
                          </View>
                        </View>
                        
                        <View style={styles.inputContainer}>
                          <Text style={styles.label}>Middle Name</Text>
                          <TextInput
                            style={[
                              styles.input,
                              fieldErrors.middleName && styles.errorBorder
                            ]}
                            placeholder="Enter your middle name or N/A"
                            value={formData.middleName || ''}
                            onChangeText={(text) => handleInputChange('middleName', text)}
                            onBlur={() => validateField('middleName', formData.middleName)}
                          />
                          {fieldErrors.middleName && (
                            <Text style={styles.errorText}>{fieldErrors.middleName.message}</Text>
                          )}
                        </View>
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
      
      {/* Toast Component */}
      <Toast 
        config={{
          success: (props) => (
            <View style={{
              backgroundColor: '#4CAF50',
              padding: 16,
              borderRadius: 8,
              marginHorizontal: 16,
              marginTop: 60,
              alignSelf: 'flex-end',
              maxWidth: 300,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {props.text1}
              </Text>
              <Text style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>
                {props.text2}
              </Text>
            </View>
          ),
          error: (props) => (
            <View style={{
              backgroundColor: '#F44336',
              padding: 16,
              borderRadius: 8,
              marginHorizontal: 16,
              marginTop: 60,
              alignSelf: 'flex-end',
              maxWidth: 300,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {props.text1}
              </Text>
              <Text style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>
                {props.text2}
              </Text>
            </View>
          ),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F', // Deep navy blue
  },
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(245, 241, 232, 0.3)', // Soft cream with opacity
  },
  bubble1: {
    width: 100,
    height: 100,
    top: height * 0.1,
    left: width * 0.1,
  },
  bubble2: {
    width: 80,
    height: 80,
    top: height * 0.2,
    right: width * 0.15,
    backgroundColor: 'rgba(30, 58, 95, 0.1)', // Deep navy blue with opacity
  },
  bubble3: {
    width: 120,
    height: 120,
    bottom: height * 0.2,
    left: width * 0.05,
    backgroundColor: 'rgba(245, 241, 232, 0.2)', // Soft cream with opacity
  },
  bubble4: {
    width: 60,
    height: 60,
    bottom: height * 0.1,
    right: width * 0.2,
    backgroundColor: 'rgba(30, 58, 95, 0.15)', // Deep navy blue with opacity
  },
  bubble5: {
    width: 90,
    height: 90,
    top: height * 0.5,
    right: width * 0.1,
    backgroundColor: 'rgba(245, 241, 232, 0.25)', // Soft cream with opacity
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    zIndex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F4D03F', // Bright yellow
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F5F1E8', // Soft cream
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#F5F1E8', // Soft cream
    textAlign: 'center',
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formContent: {
    backgroundColor: 'rgba(245, 241, 232, 0.95)', // Soft cream with opacity
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 577,
    alignSelf: 'center',
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.2)',
  },
  userTypeContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F', // Deep navy blue
    marginBottom: 8,
  },
  userTypeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUserType: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  selectedUserTypeText: {
    color: '#F5F1E8',
  },
  formFields: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 5,
  },
  input: {
    borderWidth: 2,
    borderColor: '#1E3A5F', // Deep navy blue
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1E3A5F', // Deep navy blue
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputText: {
    fontSize: 16,
    color: '#1E3A5F',
  },
  inputWrapper: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 2,
    borderColor: '#1E3A5F', // Deep navy blue
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1E3A5F', // Deep navy blue
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#1E3A5F', // Deep navy blue
    fontWeight: 'bold',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1E3A5F', // Deep navy blue
    marginTop: 4,
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10000,
  },
  dropdownItem: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1E8', // Soft cream
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1E3A5F', // Deep navy blue
    fontWeight: '500',
  },
  errorBorder: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  placeholderText: {
    color: '#999',
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
    paddingVertical: 18,
    borderRadius: 16,
    marginHorizontal: 5,
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  submitButton: {
    backgroundColor: '#1E3A5F', // Deep navy blue
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButtonText: {
    color: '#F5F1E8', // Soft cream
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
