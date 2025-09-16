import React, { useEffect, useState } from 'react';
import { 
  Button, 
  Text, 
  View, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  TextInput,
  ScrollView
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import GoogleUserSetup from './GoogleUserSetup';
import { apiService } from '../lib/api';
import { UserInfo } from '../AuthContext';

// Configure WebBrowser for better OAuth experience
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

interface GoogleLoginProps {
  onLoginSuccess?: (user: UserInfo, userType?: string) => void;
  onLoginError?: (error: string) => void;
  onLogout?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToDashboard?: (user: UserInfo, userType?: string) => void;
}

export default function GoogleLogin({ 
  onLoginSuccess, 
  onLoginError, 
  onLogout,
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onNavigateToDashboard
}: GoogleLoginProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string>('');

  // Get client IDs from app.json via Constants
  const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId;
  const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId;

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    // For iOS, you would add: iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    // Let Expo handle the redirect URI automatically
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      console.log("✅ Google Access Token:", authentication?.accessToken);
      
      if (authentication?.accessToken) {
        fetchUserInfo(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      const errorMessage = `Google Auth Error: ${response.error}`;
      console.log("❌", errorMessage);
      onLoginError?.(errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Authentication Error',
        text2: 'Failed to sign in with Google',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  }, [response, onLoginError]);

  const fetchUserInfo = async (accessToken: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );
      const user = await response.json();
      
      if (user.email && user.name) {
        const userData: UserInfo = {
          name: user.name,
          email: user.email,
          picture: user.picture,
          id: user.id,
          user_type: 'student', // Default user type for Google users
          google_id: user.id,
        };
        
        // Check if Google user exists in our database
        try {
          const checkUserResponse = await apiService.checkGoogleUser(user.email);
          
          if (checkUserResponse.success && checkUserResponse.user) {
            // User exists, navigate to dashboard
            console.log("✅ Existing Google user found:", checkUserResponse.user);
            
            // Normalize user type from database
            let userType = checkUserResponse.user.userType || checkUserResponse.user.user_type;
            if (userType) {
              switch (userType.toLowerCase()) {
                case 'student':
                  userType = 'student';
                  break;
                case 'coordinator':
                  userType = 'coordinator';
                  break;
                case 'company':
                  userType = 'company';
                  break;
                case 'admin_coordinator':
                case 'admin coordinator':
                  userType = 'admin_coordinator';
                  break;
                case 'system_admin':
                case 'system admin':
                  userType = 'system_admin';
                  break;
                default:
                  userType = 'student';
              }
            } else {
              userType = 'student';
            }
            
            console.log("🎯 Google user type normalized:", userType);
            
            // Use the database user data instead of Google user data
            const dbUserData: UserInfo = {
              id: checkUserResponse.user.id.toString(), // Use database ID, not Google ID
              name: checkUserResponse.user.first_name || checkUserResponse.user.coord_first_name || checkUserResponse.user.company_name || user.name,
              email: checkUserResponse.user.email,
              picture: checkUserResponse.user.profile_picture || user.picture,
              user_type: userType,
              google_id: user.id,
            };
            
            setUserInfo(dbUserData);
            onNavigateToDashboard?.(dbUserData, userType);
          } else {
            // User doesn't exist, show setup screen
            console.log("🆕 New Google user, showing setup screen");
            setGoogleUser(user);
            setGoogleToken(accessToken);
            setShowGoogleSetup(true);
          }
        } catch (dbError) {
          console.error("❌ Database check error:", dbError);
          // If database check fails, show setup screen as fallback
          setGoogleUser(user);
          setGoogleToken(accessToken);
          setShowGoogleSetup(true);
        }
      } else {
        throw new Error("Invalid user data received");
      }
    } catch (error) {
      const errorMessage = `Error fetching user info: ${error}`;
      console.error("❌", errorMessage);
      onLoginError?.(errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch user information',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    setUserInfo(null);
    onLogout?.();
  };

  const handleGoogleSetupComplete = (userData: any, token: string) => {
    console.log("✅ Google setup completed:", userData);
    
    // Normalize user type from setup
    let userType = userData.userType;
    if (userType) {
      switch (userType.toLowerCase()) {
        case 'student':
          userType = 'student';
          break;
        case 'coordinator':
          userType = 'coordinator';
          break;
        case 'company':
          userType = 'company';
          break;
        case 'admin_coordinator':
        case 'admin coordinator':
          userType = 'admin_coordinator';
          break;
        case 'system_admin':
        case 'system admin':
          userType = 'system_admin';
          break;
        default:
          userType = 'student';
      }
    } else {
      userType = 'student';
    }
    
    console.log("🎯 Google setup user type normalized:", userType);
    setShowGoogleSetup(false);
    setUserInfo(userData);
    onNavigateToDashboard?.(userData, userType);
  };

  const handleGoogleSetupCancel = () => {
    console.log("❌ Google setup cancelled");
    setShowGoogleSetup(false);
    setGoogleUser(null);
    setGoogleToken('');
  };

  const handleSignIn = () => {
    if (!googleWebClientId || !googleAndroidClientId) {
      const errorMessage = "Google OAuth client IDs not configured properly";
      console.error("❌", errorMessage);
      onLoginError?.(errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Configuration Error',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 5000,
      });
      return;
    }
    promptAsync();
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all fields',
        position: 'top',
        visibilityTime: 4000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Call real API for email/password login
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      const data = await response.json();
      
      // Debug: Log the full API response
      console.log("🔍 Full API Response:", JSON.stringify(data, null, 2));
      console.log("🔍 User object:", JSON.stringify(data.user, null, 2));
      console.log("🔍 User type field (userType):", data.user?.userType);
      console.log("🔍 User type field (user_type):", data.user?.user_type);
      console.log("🔍 User type field (type):", data.user?.type);
      console.log("🔍 User type field (role):", data.user?.role);
      console.log("🔍 All user object keys:", Object.keys(data.user || {}));
      console.log("🔍 Response status:", response.status);
      console.log("🔍 Response success:", data.success);

      if (data.success && data.user) {
        const userData: UserInfo = {
          id: data.user.id.toString(),
          name: data.user.first_name || data.user.coord_first_name || data.user.company_name || email.split('@')[0],
          email: data.user.email,
          picture: data.user.profile_picture || undefined,
          user_type: data.user.user_type || 'student',
          google_id: data.user.google_id || undefined,
        };
        
        // Get user type from database response - try multiple possible locations
        let userType = data.user.userType || data.user.user_type || data.user.type || data.user.role || data.user_type || data.type || data.role;
        console.log("🎯 Raw user type from DB:", userType);
        console.log("🎯 Checking data.user.userType:", data.user.userType);
        console.log("🎯 Checking data.user.user_type:", data.user.user_type);
        console.log("🎯 Checking data.user_type:", data.user_type);
        console.log("🎯 Checking data.type:", data.type);
        
        
        // Normalize user type to match our frontend expectations
        if (userType) {
          // Convert database values to frontend format
          switch (userType.toLowerCase()) {
            case 'student':
              userType = 'student';
              break;
            case 'coordinator':
              userType = 'coordinator';
              break;
            case 'company':
              userType = 'company';
              break;
            case 'admin_coordinator':
            case 'admin coordinator':
              userType = 'admin_coordinator';
              break;
            case 'system_admin':
            case 'system admin':
              userType = 'system_admin';
              break;
            default:
              console.log("⚠️ Unknown user type from DB:", userType);
              userType = 'student'; // Default fallback
          }
        } else {
          console.log("⚠️ No user type found in DB response, defaulting to 'student'");
          userType = 'student';
        }
        
        console.log("🎯 Normalized user type:", userType);
        
        setUserInfo(userData);
        onLoginSuccess?.(userData, userType);
        onNavigateToDashboard?.(userData, userType);
        
        Toast.show({
          type: 'success',
          text1: 'Login Successful! 🎉',
          text2: `Welcome back, ${userData.name}!`,
          position: 'top',
          visibilityTime: 4000,
        });
        
        console.log("✅ Email Login successful:", userData);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: data.message || 'Invalid email or password',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error("❌ Email login error:", error);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: 'Unable to connect to server. Please try again.',
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show Google setup screen for new Google users
  if (showGoogleSetup && googleUser) {
    return (
      <GoogleUserSetup
        googleUser={googleUser}
        googleToken={googleToken}
        onComplete={handleGoogleSetupComplete}
        onCancel={handleGoogleSetupCancel}
      />
    );
  }

  if (userInfo) {
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

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            {userInfo.picture ? (
              <Image source={{ uri: userInfo.picture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {userInfo.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.userName}>{userInfo.name}</Text>
          <Text style={styles.userEmail}>{userInfo.email}</Text>
          
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
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

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>IG</Text>
            </View>
            <Text style={styles.appTitle}>InternshipGo</Text>
            <Text style={styles.subtitle}>Find Your Perfect Internship</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to continue your journey</Text>
            
            {/* Email Login Form */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#A0A0A0"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
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
              </View>
            </View>
            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={onNavigateToForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emailButton, isLoading && styles.emailButtonDisabled]}
              onPress={handleEmailLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.emailButtonText}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Text>
              )}
            </TouchableOpacity>



            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login */}
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.googleButtonDisabled]}
              disabled={!request || isLoading}
              onPress={handleSignIn}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>
                    {isLoading ? "Signing in..." : "Sign in with Google"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={styles.termsText}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
            
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onNavigateToRegister}>
                <Text style={styles.registerLink}>Sign Up</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
    minHeight: height,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '300',
  },
  loginCard: {
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
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  googleButton: {
    backgroundColor: '#4285f4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  googleButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: '#666',
  },
  registerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285f4',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
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
  inputWrapper: {
    position: 'relative',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  showPasswordButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  showPasswordText: {
    fontSize: 18,
  },
  emailButton: {
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
  emailButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  emailButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 10,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4285f4',
    fontWeight: '500',
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF8400',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: '#ff4757',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#ff4757',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
