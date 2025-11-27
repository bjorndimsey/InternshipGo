import React, { useState, useRef, useEffect } from 'react';
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

interface OTPVerificationScreenProps {
  email: string;
  onVerifySuccess: (email: string) => void;
  onBack: () => void;
  onResendOTP: () => void;
}

export default function OTPVerificationScreen({ 
  email, 
  onVerifySuccess, 
  onBack, 
  onResendOTP 
}: OTPVerificationScreenProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: 'Please enter all 6 digits',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Call API to verify OTP
      const response = await fetch('http://localhost:3001/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpCode
        }),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'OTP Verified! ✅',
          text2: 'You can now reset your password',
          position: 'top',
          visibilityTime: 4000,
        });
        
        setTimeout(() => {
          onVerifySuccess(email);
        }, 1500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Invalid OTP',
          text2: data.message || 'Please check your OTP and try again',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: 'Unable to verify OTP. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      await onResendOTP();
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      
      Toast.show({
        type: 'success',
        text1: 'OTP Resent! 📧',
        text2: 'Check your email for the new code',
        position: 'top',
        visibilityTime: 4000,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: 'Unable to resend OTP. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="business" size={60} color="#FBFBFB" />
              </View>
              <Text style={styles.appTitle}>InternshipGo</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to{'\n'}
                <Text style={styles.emailText}>{email}</Text>
              </Text>

              {/* OTP Input */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      if (ref) inputRefs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                  />
                ))}
              </View>

              {/* Timer */}
              <Text style={styles.timerText}>
                {canResend ? 'Code expired' : `Resend code in ${formatTime(timer)}`}
              </Text>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading || otp.join('').length !== 6}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Resend Button */}
              <TouchableOpacity
                style={[styles.resendButton, (!canResend || isResending) && styles.resendButtonDisabled]}
                onPress={handleResendOTP}
                disabled={!canResend || isResending}
              >
                {isResending ? (
                  <ActivityIndicator color="#4285f4" size="small" />
                ) : (
                  <Text style={[styles.resendButtonText, (!canResend || isResending) && styles.resendButtonTextDisabled]}>
                    {isResending ? 'Resending...' : 'Resend Code'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                disabled={isLoading}
              >
                <Text style={styles.backButtonText}>Back</Text>
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
    backgroundColor: '#151419', // Dark background
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
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  formCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#878787', // Muted gray
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    fontWeight: '500',
  },
  emailText: {
    fontWeight: '600',
    color: '#F56E0F', // Primary orange
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)', // Orange border
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    backgroundColor: '#2A2A2E', // Dark input background
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otpInputFilled: {
    borderColor: '#F56E0F', // Primary orange
    backgroundColor: 'rgba(245, 110, 15, 0.1)', // Orange background
  },
  timerText: {
    fontSize: 14,
    color: '#878787', // Muted gray
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 15,
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: '#878787', // Muted gray
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FBFBFB', // Light text
    textAlign: 'center',
  },
  resendButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: '#878787', // Muted gray
  },
  backButton: {
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#F56E0F', // Primary orange
    fontWeight: '600',
  },
});
