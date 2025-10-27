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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import SplashCards from '../components/SplashCards';
import DatePicker from '../components/DatePicker';
import { apiService, ApiResponse } from '../lib/api';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
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

const { width, height } = Dimensions.get('window');

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess?: (userData: any, userType?: string) => void;
}

interface FormData {
  userType: string;
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  idNumber: string;
  age: string;
  year: string;
  dateOfBirth: string;
  program: string;
  major: string;
  address: string;
  companyName: string;
  industry: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

const userTypes = ['Student', 'Coordinator', 'Company'];

export default function RegisterScreen({ onNavigateToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const [formData, setFormData] = useState<FormData>({
    userType: 'Student',
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    idNumber: '',
    age: '',
    year: '',
    dateOfBirth: '',
    program: '',
    major: '',
    address: '',
    companyName: '',
    industry: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showMajorDropdown, setShowMajorDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSplashCards, setShowSplashCards] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [pendingUserType, setPendingUserType] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<FieldValidation>({});

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Reset major when program changes
    if (field === 'program') {
      setFormData(prev => ({ ...prev, major: '' }));
    }
  };

  const handleIdNumberChange = (text: string) => {
    // Format ID number as XXXX-XXXX
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(\d{4})/, '$1-$2');
    updateFormData('idNumber', formatted);
  };

  const validateField = (field: keyof FormData, value: string): boolean => {
    let validation;
    
    switch (field) {
      case 'email':
        validation = validateEmail(value);
        break;
      case 'password':
        validation = validatePassword(value);
        break;
      case 'confirmPassword':
        validation = validateConfirmPassword(formData.password, value);
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
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }
  };

  const validateAllFields = (): boolean => {
    let isValid = true;
    const errors: FieldValidation = {};
    
    // Common fields
    if (!validateField('email', formData.email)) isValid = false;
    if (!validateField('password', formData.password)) isValid = false;
    if (!validateField('confirmPassword', formData.confirmPassword)) isValid = false;
    if (!validateField('address', formData.address)) isValid = false;
    
    // User type specific fields
    if (formData.userType === 'Student') {
      if (!validateField('idNumber', formData.idNumber)) isValid = false;
      if (!validateField('firstName', formData.firstName)) isValid = false;
      if (!validateField('middleName', formData.middleName)) isValid = false;
      if (!validateField('lastName', formData.lastName)) isValid = false;
      if (!validateField('age', formData.age)) isValid = false;
      if (!validateField('year', formData.year)) isValid = false;
      if (!validateField('dateOfBirth', formData.dateOfBirth)) isValid = false;
      if (!validateField('program', formData.program)) isValid = false;
      if (!validateField('major', formData.major)) isValid = false;
    } else if (formData.userType === 'Coordinator') {
      if (!validateField('firstName', formData.firstName)) isValid = false;
      if (!validateField('middleName', formData.middleName)) isValid = false;
      if (!validateField('lastName', formData.lastName)) isValid = false;
      if (!validateField('program', formData.program)) isValid = false;
      if (!validateField('phoneNumber', formData.phoneNumber)) isValid = false;
    } else if (formData.userType === 'Company') {
      if (!validateField('companyName', formData.companyName)) isValid = false;
      if (!validateField('industry', formData.industry)) isValid = false;
    }
    
    return isValid;
  };

  const validateForm = () => {
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
    }
    
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Prepare data for API call - only send relevant fields based on user type
      const registrationData: any = {
        userType: formData.userType,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        address: formData.address,
      };

      // Add user type specific fields
      if (formData.userType === 'Student') {
        registrationData.idNumber = formData.idNumber;
        registrationData.firstName = formData.firstName;
        registrationData.middleName = formData.middleName || 'N/A';
        registrationData.lastName = formData.lastName;
        registrationData.age = formData.age;
        registrationData.year = formData.year;
        registrationData.dateOfBirth = formData.dateOfBirth;
        registrationData.program = formData.program;
        registrationData.major = formData.major;
      } else if (formData.userType === 'Coordinator') {
        registrationData.firstName = formData.firstName;
        registrationData.middleName = formData.middleName || 'N/A';
        registrationData.lastName = formData.lastName;
        registrationData.program = formData.program;
        registrationData.phoneNumber = formData.phoneNumber;
      } else if (formData.userType === 'Company') {
        registrationData.companyName = formData.companyName;
        registrationData.industry = formData.industry;
      }

      // Call the API
      const response: ApiResponse = await apiService.register(registrationData);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Registration Successful! 🎉',
          text2: 'Your account has been created successfully',
          position: 'top',
          topOffset: 60,
          visibilityTime: 5000,
        });
        
        // Store user data and show splash cards
        setPendingUserData(response.user || formData);
        setPendingUserType(formData.userType.toLowerCase());
        setShowSplashCards(true);
      } else {
        // Handle validation errors
        if (response.errors && response.errors.length > 0) {
          Toast.show({
            type: 'error',
            text1: 'Validation Error',
            text2: response.errors.join(', '),
            position: 'top',
            topOffset: 60,
            visibilityTime: 6000,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Registration Failed',
            text2: response.message || 'Failed to create account. Please try again.',
            position: 'top',
            topOffset: 60,
            visibilityTime: 5000,
          });
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle different types of errors
      if (error.message.includes('Network')) {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: 'Unable to connect to server. Please check your internet connection and try again.',
          position: 'top',
          topOffset: 60,
          visibilityTime: 5000,
        });
      } else if (error.message.includes('409')) {
        Toast.show({
          type: 'error',
          text1: 'Duplicate Entry',
          text2: 'Email or ID number already exists. Please use different credentials.',
          position: 'top',
          topOffset: 60,
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: error.message || 'Failed to create account. Please try again.',
          position: 'top',
          topOffset: 60,
          visibilityTime: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplashCardsComplete = () => {
    setShowSplashCards(false);
    if (pendingUserData && pendingUserType) {
      onRegisterSuccess?.(pendingUserData, pendingUserType);
    }
  };

  const renderDropdown = () => (
    <View style={[styles.inputContainer, { zIndex: showDropdown ? 1000 : 1 }]}>
      <Text style={styles.label}>User Type *</Text>
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.dropdownButtonText}>{formData.userType}</Text>
          <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showDropdown && (
          <View style={styles.dropdownList}>
            {userTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.dropdownItem}
                onPress={() => {
                  updateFormData('userType', type);
                  setShowDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderProgramDropdown = () => (
    <View style={[styles.inputContainer, { zIndex: showProgramDropdown ? 1000 : (showYearDropdown ? -1 : 1) }]}>
      <Text style={styles.label}>Program *</Text>
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            fieldErrors.program && styles.errorBorder
          ]}
          onPress={() => setShowProgramDropdown(!showProgramDropdown)}
        >
          <Text style={[
            styles.dropdownButtonText,
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
                  updateFormData('program', option.value);
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
            value={formData.major}
            onChangeText={(text) => updateFormData('major', text)}
            placeholder="Enter your major or N/A"
            placeholderTextColor="#878787"
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
              styles.dropdownButton,
              fieldErrors.major && styles.errorBorder
            ]}
            onPress={() => setShowMajorDropdown(!showMajorDropdown)}
          >
            <Text style={[
              styles.dropdownButtonText,
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
                    updateFormData('major', option.value);
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
            styles.dropdownButton,
            fieldErrors.year && styles.errorBorder
          ]}
          onPress={() => setShowYearDropdown(!showYearDropdown)}
        >
          <Text style={[
            styles.dropdownButtonText,
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
                  updateFormData('year', option.value);
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

  const renderCommonFields = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Email *</Text>
      <TextInput
        style={[
          styles.input,
          fieldErrors.email && styles.errorBorder
        ]}
        value={formData.email}
        onChangeText={(text) => updateFormData('email', text)}
        onBlur={() => validateField('email', formData.email)}
        placeholder="Enter your email"
        placeholderTextColor="#878787"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {fieldErrors.email && (
        <Text style={styles.errorText}>{fieldErrors.email.message}</Text>
      )}
    </View>
  );

  const renderCoordinatorFields = () => (
    <>
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={[
              styles.input,
              fieldErrors.firstName && styles.errorBorder
            ]}
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            onBlur={() => validateField('firstName', formData.firstName)}
            placeholder="Enter your first name"
            placeholderTextColor="#878787"
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
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            onBlur={() => validateField('lastName', formData.lastName)}
            placeholder="Enter your last name"
            placeholderTextColor="#878787"
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
          value={formData.middleName}
          onChangeText={(text) => updateFormData('middleName', text)}
          onBlur={() => validateField('middleName', formData.middleName)}
          placeholder="Enter your middle name or N/A"
          placeholderTextColor="#878787"
        />
        {fieldErrors.middleName && (
          <Text style={styles.errorText}>{fieldErrors.middleName.message}</Text>
        )}
      </View>
      {renderProgramDropdown()}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={[
            styles.input,
            fieldErrors.phoneNumber && styles.errorBorder
          ]}
          value={formData.phoneNumber}
          onChangeText={(text) => updateFormData('phoneNumber', text)}
          onBlur={() => validateField('phoneNumber', formData.phoneNumber)}
          placeholder="09XXXXXXXXX"
          placeholderTextColor="#878787"
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
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          onBlur={() => validateField('address', formData.address)}
          placeholder="Enter your address (minimum 12 characters)"
          placeholderTextColor="#878787"
          multiline
        />
        {fieldErrors.address && (
          <Text style={styles.errorText}>{fieldErrors.address.message}</Text>
        )}
      </View>
    </>
  );

  const renderCompanyFields = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={[
            styles.input,
            fieldErrors.companyName && styles.errorBorder
          ]}
          value={formData.companyName}
          onChangeText={(text) => updateFormData('companyName', text)}
          onBlur={() => validateField('companyName', formData.companyName)}
          placeholder="Enter company name"
          placeholderTextColor="#878787"
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
          value={formData.industry}
          onChangeText={(text) => updateFormData('industry', text)}
          onBlur={() => validateField('industry', formData.industry)}
          placeholder="Enter industry"
          placeholderTextColor="#878787"
        />
        {fieldErrors.industry && (
          <Text style={styles.errorText}>{fieldErrors.industry.message}</Text>
        )}
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[
            styles.input,
            fieldErrors.address && styles.errorBorder
          ]}
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          onBlur={() => validateField('address', formData.address)}
          placeholder="Enter company address (minimum 12 characters)"
          placeholderTextColor="#878787"
          multiline
        />
        {fieldErrors.address && (
          <Text style={styles.errorText}>{fieldErrors.address.message}</Text>
        )}
      </View>
    </>
  );

  const renderStudentFields = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>ID Number (XXXX-XXXX) *</Text>
        <TextInput
          style={[
            styles.input,
            fieldErrors.idNumber && styles.errorBorder
          ]}
          value={formData.idNumber}
          onChangeText={handleIdNumberChange}
          onBlur={() => validateField('idNumber', formData.idNumber)}
          placeholder="0000-0000"
          placeholderTextColor="#878787"
          keyboardType="numeric"
          maxLength={9}
        />
        {fieldErrors.idNumber && (
          <Text style={styles.errorText}>{fieldErrors.idNumber.message}</Text>
        )}
      </View>
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={[
              styles.input,
              fieldErrors.firstName && styles.errorBorder
            ]}
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            onBlur={() => validateField('firstName', formData.firstName)}
            placeholder="Enter your first name"
            placeholderTextColor="#878787"
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
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            onBlur={() => validateField('lastName', formData.lastName)}
            placeholder="Enter your last name"
            placeholderTextColor="#878787"
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
          value={formData.middleName}
          onChangeText={(text) => updateFormData('middleName', text)}
          onBlur={() => validateField('middleName', formData.middleName)}
          placeholder="Enter your middle name or N/A"
          placeholderTextColor="#878787"
        />
        {fieldErrors.middleName && (
          <Text style={styles.errorText}>{fieldErrors.middleName.message}</Text>
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
            value={formData.age}
            onChangeText={(text) => updateFormData('age', text)}
            onBlur={() => validateField('age', formData.age)}
            placeholder="Enter your age"
            placeholderTextColor="#878787"
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
          value={formData.dateOfBirth}
          onDateChange={(date) => updateFormData('dateOfBirth', date)}
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
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          onBlur={() => validateField('address', formData.address)}
          placeholder="Enter your address (minimum 12 characters)"
          placeholderTextColor="#878787"
          multiline
        />
        {fieldErrors.address && (
          <Text style={styles.errorText}>{fieldErrors.address.message}</Text>
        )}
      </View>
    </>
  );

  const renderPasswordFields = () => (
    <View style={styles.inputRow}>
      <View style={styles.inputHalf}>
        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={[
            styles.input,
            fieldErrors.password && styles.errorBorder
          ]}
          value={formData.password}
          onChangeText={(text) => updateFormData('password', text)}
          onBlur={() => validateField('password', formData.password)}
          placeholder="Enter your password (min 6 characters)"
          placeholderTextColor="#878787"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {fieldErrors.password && (
          <Text style={styles.errorText}>{fieldErrors.password.message}</Text>
        )}
      </View>
      <View style={styles.inputHalf}>
        <Text style={styles.label}>Confirm Password *</Text>
        <TextInput
          style={[
            styles.input,
            fieldErrors.confirmPassword && styles.errorBorder
          ]}
          value={formData.confirmPassword}
          onChangeText={(text) => updateFormData('confirmPassword', text)}
          onBlur={() => validateField('confirmPassword', formData.confirmPassword)}
          placeholder="Confirm your password"
          placeholderTextColor="#878787"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {fieldErrors.confirmPassword && (
          <Text style={styles.errorText}>{fieldErrors.confirmPassword.message}</Text>
        )}
      </View>
    </View>
  );

  // Show splash cards for new users
  if (showSplashCards) {
    return <SplashCards onComplete={handleSplashCardsComplete} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151419" />
      
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
              <Ionicons name="business" size={60} color="#FBFBFB" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join our internship platform</Text>
          </View>

          <View style={styles.formContent}>
            {renderDropdown()}
            {renderCommonFields()}
            
            {formData.userType === 'Coordinator' && renderCoordinatorFields()}
            {formData.userType === 'Company' && renderCompanyFields()}
            {formData.userType === 'Student' && renderStudentFields()}
            
            {renderPasswordFields()}

            <TouchableOpacity 
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={onNavigateToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#151419', // Dark background
  },
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(245, 110, 15, 0.1)', // Orange with opacity
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
    backgroundColor: 'rgba(245, 110, 15, 0.05)', // Lighter orange with opacity
  },
  bubble3: {
    width: 120,
    height: 120,
    bottom: height * 0.2,
    left: width * 0.05,
    backgroundColor: 'rgba(245, 110, 15, 0.08)', // Medium orange with opacity
  },
  bubble4: {
    width: 60,
    height: 60,
    bottom: height * 0.1,
    right: width * 0.2,
    backgroundColor: 'rgba(245, 110, 15, 0.1)', // Orange with opacity
  },
  bubble5: {
    width: 90,
    height: 90,
    top: height * 0.5,
    right: width * 0.1,
    backgroundColor: 'rgba(245, 110, 15, 0.05)', // Lighter orange with opacity
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
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#F56E0F',
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
    color: '#FBFBFB', // Light text
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#F56E0F', // Primary orange
    textAlign: 'center',
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formContent: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 577,
    alignSelf: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)', // Orange border
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#2A2A2E', // Dark input background
    color: '#FBFBFB', // Light text
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)', // Orange border
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#2A2A2E', // Dark input background
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#F56E0F',
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
    color: '#FBFBFB', // Light text
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#F56E0F', // Primary orange
    fontWeight: 'bold',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#2A2A2E', // Dark background
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)', // Orange border
    marginTop: 4,
    shadowColor: '#F56E0F',
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
    borderBottomColor: 'rgba(245, 110, 15, 0.1)', // Orange with opacity
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#FBFBFB', // Light text
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
    color: '#878787', // Muted gray for better visibility
  },
  registerButton: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 20,
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  registerButtonDisabled: {
    backgroundColor: '#878787', // Muted gray
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    textAlign: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 16,
    color: '#878787', // Muted gray
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F56E0F', // Primary orange
  },
});
