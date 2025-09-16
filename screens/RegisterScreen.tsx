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
import Toast from 'react-native-toast-message';
import { apiService, ApiResponse } from '../lib/api';

const { width, height } = Dimensions.get('window');

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess?: (userData: any, userType?: string) => void;
}

interface FormData {
  userType: string;
  email: string;
  firstName: string;
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
  const [isLoading, setIsLoading] = useState(false);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIdNumberChange = (text: string) => {
    // Format ID number as XXXX-XXXX
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(\d{4})/, '$1-$2');
    updateFormData('idNumber', formatted);
  };

  const validateForm = () => {
    const { userType, email, password, confirmPassword } = formData;

    if (!email || !password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all required fields',
        position: 'top',
        visibilityTime: 4000,
      });
      return false;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Passwords do not match',
        position: 'top',
        visibilityTime: 4000,
      });
      return false;
    }

    if (userType === 'Student') {
      const { idNumber, firstName, lastName, age, year, program, major, address } = formData;
      if (!idNumber || !firstName || !lastName || !age || !year || !program || !major || !address) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Please fill in all required fields for Student',
          position: 'top',
          visibilityTime: 4000,
        });
        return false;
      }
    }

    if (userType === 'Coordinator') {
      const { firstName, lastName, program, phoneNumber, address } = formData;
      if (!firstName || !lastName || !program || !phoneNumber || !address) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Please fill in all required fields for Coordinator',
          position: 'top',
          visibilityTime: 4000,
        });
        return false;
      }
    }

    if (userType === 'Company') {
      const { companyName, industry, address } = formData;
      if (!companyName || !industry || !address) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Please fill in all required fields for Company',
          position: 'top',
          visibilityTime: 4000,
        });
        return false;
      }
    }

    return true;
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
        registrationData.lastName = formData.lastName;
        registrationData.age = formData.age;
        registrationData.year = formData.year;
        registrationData.dateOfBirth = formData.dateOfBirth;
        registrationData.program = formData.program;
        registrationData.major = formData.major;
      } else if (formData.userType === 'Coordinator') {
        registrationData.firstName = formData.firstName;
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
          visibilityTime: 5000,
        });
        
        // Navigate after a short delay
        setTimeout(() => {
          onRegisterSuccess?.(response.user || formData, formData.userType.toLowerCase());
        }, 1500);
      } else {
        // Handle validation errors
        if (response.errors && response.errors.length > 0) {
          Toast.show({
            type: 'error',
            text1: 'Validation Error',
            text2: response.errors.join(', '),
            position: 'top',
            visibilityTime: 6000,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Registration Failed',
            text2: response.message || 'Failed to create account. Please try again.',
            position: 'top',
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
          visibilityTime: 5000,
        });
      } else if (error.message.includes('409')) {
        Toast.show({
          type: 'error',
          text1: 'Duplicate Entry',
          text2: 'Email or ID number already exists. Please use different credentials.',
          position: 'top',
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: error.message || 'Failed to create account. Please try again.',
          position: 'top',
          visibilityTime: 5000,
        });
      }
    } finally {
      setIsLoading(false);
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

  const renderCommonFields = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Email *</Text>
      <TextInput
        style={styles.input}
        value={formData.email}
        onChangeText={(text) => updateFormData('email', text)}
        placeholder="Enter your email"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  const renderCoordinatorFields = () => (
    <>
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            placeholder="Enter your first name"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            placeholder="Enter your last name"
            placeholderTextColor="#999"
          />
        </View>
      </View>
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Program/Course *</Text>
          <TextInput
            style={styles.input}
            value={formData.program}
            onChangeText={(text) => updateFormData('program', text)}
            placeholder="Enter your program"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.phoneNumber}
            onChangeText={(text) => updateFormData('phoneNumber', text)}
            placeholder="Enter your phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          placeholder="Enter your address"
          placeholderTextColor="#999"
          multiline
        />
      </View>
    </>
  );

  const renderCompanyFields = () => (
    <>
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Company Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.companyName}
            onChangeText={(text) => updateFormData('companyName', text)}
            placeholder="Enter company name"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Industry *</Text>
          <TextInput
            style={styles.input}
            value={formData.industry}
            onChangeText={(text) => updateFormData('industry', text)}
            placeholder="Enter industry"
            placeholderTextColor="#999"
          />
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          placeholder="Enter company address"
          placeholderTextColor="#999"
          multiline
        />
      </View>
    </>
  );

  const renderStudentFields = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>ID Number (XXXX-XXXX) *</Text>
        <TextInput
          style={styles.input}
          value={formData.idNumber}
          onChangeText={handleIdNumberChange}
          placeholder="0000-0000"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={9}
        />
      </View>
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            placeholder="Enter your first name"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            placeholder="Enter your last name"
            placeholderTextColor="#999"
          />
        </View>
      </View>
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            value={formData.age}
            onChangeText={(text) => updateFormData('age', text)}
            placeholder="Enter your age"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Year *</Text>
          <TextInput
            style={styles.input}
            value={formData.year}
            onChangeText={(text) => updateFormData('year', text)}
            placeholder="Enter your year level"
            placeholderTextColor="#999"
          />
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date of Birth *</Text>
        <TextInput
          style={styles.input}
          value={formData.dateOfBirth}
          onChangeText={(text) => updateFormData('dateOfBirth', text)}
          placeholder="MM/DD/YYYY"
          placeholderTextColor="#999"
        />
      </View>
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Program *</Text>
          <TextInput
            style={styles.input}
            value={formData.program}
            onChangeText={(text) => updateFormData('program', text)}
            placeholder="Enter your program"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={styles.label}>Major *</Text>
          <TextInput
            style={styles.input}
            value={formData.major}
            onChangeText={(text) => updateFormData('major', text)}
            placeholder="Enter your major"
            placeholderTextColor="#999"
          />
        </View>
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          placeholder="Enter your address"
          placeholderTextColor="#999"
          multiline
        />
      </View>
    </>
  );

  const renderPasswordFields = () => (
    <View style={styles.inputRow}>
      <View style={styles.inputHalf}>
        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={formData.password}
          onChangeText={(text) => updateFormData('password', text)}
          placeholder="Enter your password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.inputHalf}>
        <Text style={styles.label}>Confirm Password *</Text>
        <TextInput
          style={styles.input}
          value={formData.confirmPassword}
          onChangeText={(text) => updateFormData('confirmPassword', text)}
          placeholder="Confirm your password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );

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

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>IG</Text>
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
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
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
    top: height * 0.1,
    left: width * 0.1,
  },
  bubble2: {
    width: 80,
    height: 80,
    top: height * 0.2,
    right: width * 0.15,
  },
  bubble3: {
    width: 120,
    height: 120,
    bottom: height * 0.2,
    left: width * 0.05,
  },
  bubble4: {
    width: 60,
    height: 60,
    bottom: height * 0.1,
    right: width * 0.2,
  },
  bubble5: {
    width: 90,
    height: 90,
    top: height * 0.5,
    right: width * 0.1,
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
  },
  formContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 577,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
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
    color: '#333',
    marginBottom: 8,
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
  },
  inputWrapper: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#4285f4',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: '#4285f4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285f4',
  },
});
