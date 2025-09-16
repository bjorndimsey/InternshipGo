import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { EmailService } from '../lib/emailService';
import OTPVerificationScreen from './OTPVerificationScreen';
import NewPasswordScreen from './NewPasswordScreen';

const { width, height } = Dimensions.get('window');

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSuccess?: (email: string) => void;
}

export default function ForgotPasswordScreen({ onBack, onSuccess }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'otp' | 'password'>('email');
  const [otpSent, setOtpSent] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter your email address',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    if (!email.includes('@')) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid email address',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, check if user exists and request OTP from backend
      const response = await fetch('http://localhost:3001/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        // Check if user is a Google OAuth user (no password hash)
        const isGoogleOAuthUser = data.isGoogleUser || false;
        setIsGoogleUser(isGoogleOAuthUser);
        
        // Send OTP via EmailJS
        const emailResult = await EmailService.sendOTPEmail(email, data.otp, data.userName || 'User');
        
        if (emailResult.success) {
          Toast.show({
            type: 'success',
            text1: 'OTP Sent! 📧',
            text2: 'Check your email for the verification code',
            position: 'top',
            visibilityTime: 5000,
          });
          
          setOtpSent(true);
          setCurrentStep('otp');
        } else {
          Toast.show({
            type: 'error',
            text1: 'Email Failed',
            text2: emailResult.error || 'Failed to send OTP email',
            position: 'top',
            visibilityTime: 5000,
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Request Failed',
          text2: data.message || 'Failed to request OTP. Please try again.',
          position: 'top',
          visibilityTime: 5000,
        });
      }
    } catch (error) {
      console.error('OTP request error:', error);
      Toast.show({
        type: 'error',
        text1: 'Request Failed',
        text2: 'Unable to send OTP. Please try again.',
        position: 'top',
        visibilityTime: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        const emailResult = await EmailService.sendOTPEmail(email, data.otp, data.userName || 'User');
        
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

  const handleOTPVerified = (verifiedEmail: string) => {
    setCurrentStep('password');
  };

  const handlePasswordResetSuccess = () => {
    Toast.show({
      type: 'success',
      text1: 'Password Reset Complete! 🎉',
      text2: 'You can now login with your new password',
      position: 'top',
      visibilityTime: 5000,
    });
    
    setTimeout(() => {
      onSuccess?.(email);
      onBack();
    }, 2000);
  };

  const handleBackToEmail = () => {
    setCurrentStep('email');
    setOtpSent(false);
  };

  const handleBackToOTP = () => {
    setCurrentStep('otp');
  };

  // Render different steps
  if (currentStep === 'otp') {
    return (
      <OTPVerificationScreen
        email={email}
        onVerifySuccess={handleOTPVerified}
        onBack={handleBackToEmail}
        onResendOTP={handleResendOTP}
      />
    );
  }

  if (currentStep === 'password') {
    return (
      <NewPasswordScreen
        email={email}
        onPasswordResetSuccess={handlePasswordResetSuccess}
        onBack={handleBackToOTP}
        isGoogleUser={isGoogleUser}
      />
    );
  }

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
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>IG</Text>
              </View>
              <Text style={styles.appTitle}>InternshipGo</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a verification code to reset your password.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#A0A0A0"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  onSubmitEditing={handleSendOTP}
                  returnKeyType="send"
                />
              </View>

              <TouchableOpacity
                style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    {isLoading ? 'Sending...' : 'Send OTP Code'}
                  </Text>
                )}
              </TouchableOpacity>

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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  formCard: {
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
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
  sendButton: {
    backgroundColor: '#4285f4',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#4285f4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#4285f4',
    fontWeight: '500',
  },
});
