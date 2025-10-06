import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

interface NewPasswordScreenProps {
  email: string;
  onPasswordResetSuccess: () => void;
  onBack: () => void;
  isGoogleUser?: boolean; // New prop to indicate if this is a Google OAuth user
}

export default function NewPasswordScreen({ 
  email, 
  onPasswordResetSuccess, 
  onBack,
  isGoogleUser = false
}: NewPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleResetPassword = async () => {
    // Validation
    if (!password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all fields',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Passwords do not match',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Password',
        text2: passwordError,
        position: 'top',
        visibilityTime: 5000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Call API to reset password
      const response = await fetch('http://localhost:3001/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword: password,
          confirmPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: isGoogleUser ? 'Password Set Success! 🎉' : 'Password Reset Success! 🎉',
          text2: isGoogleUser 
            ? 'Your password has been set successfully. You can now login with email and password!'
            : 'Your password has been updated successfully',
          position: 'top',
          visibilityTime: 5000,
        });
        
        setTimeout(() => {
          onPasswordResetSuccess();
        }, 2000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Reset Failed',
          text2: data.message || 'Failed to reset password. Please try again.',
          position: 'top',
          visibilityTime: 5000,
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      Toast.show({
        type: 'error',
        text1: 'Reset Failed',
        text2: 'Unable to reset password. Please try again.',
        position: 'top',
        visibilityTime: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (/(?=.*[a-z])/.test(pwd)) strength++;
    if (/(?=.*[A-Z])/.test(pwd)) strength++;
    if (/(?=.*\d)/.test(pwd)) strength++;
    if (/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(pwd)) strength++;
    
    return {
      score: strength,
      text: strength < 2 ? 'Weak' : strength < 4 ? 'Medium' : 'Strong',
      color: strength < 2 ? '#ff4757' : strength < 4 ? '#ffa502' : '#2ed573'
    };
  };

  const passwordStrength = getPasswordStrength(password);

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

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="school-outline" size={60} color="#1E3A5F" />
              </View>
              <Text style={styles.appTitle}>InternshipGo</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.title}>
                {isGoogleUser ? 'Set Your Password' : 'Set New Password'}
              </Text>
              <Text style={styles.subtitle}>
                {isGoogleUser 
                  ? `You signed up with Google, but you can also set a password to login with email and password.\n\nCreate a strong password for:\n`
                  : `Create a strong password for\n`
                }
                <Text style={styles.emailText}>{email}</Text>
              </Text>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    placeholderTextColor="#A0A0A0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.showPasswordButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.showPasswordText}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBar}>
                      <View 
                        style={[
                          styles.strengthFill, 
                          { 
                            width: `${(passwordStrength.score / 5) * 100}%`,
                            backgroundColor: passwordStrength.color
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.text}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#A0A0A0"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.showPasswordButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.showPasswordText}>
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                <Text style={styles.requirementText}>• At least 6 characters long</Text>
                <Text style={styles.requirementText}>• One uppercase letter</Text>
                <Text style={styles.requirementText}>• One lowercase letter</Text>
                <Text style={styles.requirementText}>• One number</Text>
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading || !password || !confirmPassword}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.resetButtonText}>
                    {isLoading 
                      ? (isGoogleUser ? 'Setting...' : 'Resetting...') 
                      : (isGoogleUser ? 'Set Password' : 'Reset Password')
                    }
                  </Text>
                )}
              </TouchableOpacity>

              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                disabled={isLoading}
              >
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: '#1E3A5F', // Deep navy blue
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F4D03F', // Soft cream
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
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F5F1E8', // Soft cream
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  formCard: {
    backgroundColor: 'rgba(245, 241, 232, 0.95)', // Soft cream with opacity
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 208, 63, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F', // Deep navy blue
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#1E3A5F', // Deep navy blue
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    fontWeight: '500',
  },
  emailText: {
    fontWeight: '600',
    color: '#1E3A5F', // Deep navy blue
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F', // Deep navy blue
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E3A5F', // Deep navy blue
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E3A5F', // Deep navy blue
  },
  showPasswordButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  showPasswordText: {
    fontSize: 18,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsContainer: {
    backgroundColor: 'rgba(30, 58, 95, 0.1)', // Deep navy blue with opacity
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.2)',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F', // Deep navy blue
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 12,
    color: '#1E3A5F', // Deep navy blue
    marginBottom: 2,
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: '#1E3A5F', // Deep navy blue
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 15,
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  resetButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F1E8', // Soft cream
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#1E3A5F', // Deep navy blue
    fontWeight: '600',
  },
});
