import React, { useEffect, useState, useRef } from 'react';
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
  ScrollView,
  Animated,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [loginSuccessAnim] = useState(new Animated.Value(0));
  const [waveAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.3));
  const [slideAnim] = useState(new Animated.Value(50));
  const [backgroundAnim] = useState(new Animated.Value(0));
  const [bubbleAnim1] = useState(new Animated.Value(0));
  const [bubbleAnim2] = useState(new Animated.Value(0));
  const [bubbleAnim3] = useState(new Animated.Value(0));
  const [bubbleAnim4] = useState(new Animated.Value(0));
  const [bubbleAnim5] = useState(new Animated.Value(0));
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealEmail, setAppealEmail] = useState('');
  const [isSendingAppeal, setIsSendingAppeal] = useState(false);

  // Get client IDs from app.json via Constants
  const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId;
  const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId;

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    // For iOS, you would add: iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    // Let Expo handle the redirect URI automatically
  });

  // Initialize page animations
  useEffect(() => {
    // Main content animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Background moving animation with slow fade and reappear
    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        // Phase 1: Move and fade out
        Animated.timing(backgroundAnim, {
          toValue: 0.2,
          duration: 3000,
          useNativeDriver: true,
        }),
        // Phase 2: Stay invisible while moving to new position
        Animated.timing(backgroundAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Phase 3: Fade in at new position
        Animated.timing(backgroundAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        // Phase 4: Move and fade out again
        Animated.timing(backgroundAnim, {
          toValue: 0.8,
          duration: 3000,
          useNativeDriver: true,
        }),
        // Phase 5: Stay invisible while moving to another position
        Animated.timing(backgroundAnim, {
          toValue: 0.9,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Phase 6: Fade in at final position
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        // Phase 7: Return to start
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 }
    );

    // Bubble animations
    const bubbleAnimations = Animated.stagger(300, [
      Animated.timing(bubbleAnim1, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim2, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim3, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim4, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim5, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    // Start all animations
    Animated.parallel([
      backgroundAnimation,
      bubbleAnimations,
    ]).start();
  }, []);

  // Trigger success animation when showLoginSuccess becomes true
  useEffect(() => {
    if (showLoginSuccess) {
      console.log("🎉 showLoginSuccess is true, starting animation");
      // Reset and start animation immediately
      loginSuccessAnim.setValue(0);
      waveAnim.setValue(0);
      
      // Start success animation
      Animated.sequence([
        Animated.timing(loginSuccessAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(loginSuccessAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log("🎉 Login success animation completed");
        setShowLoginSuccess(false);
      });

      // Start wave animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ).start();
    }
  }, [showLoginSuccess]);

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
          
          console.log("🔍 Google user check response:", checkUserResponse);
          
          // First, check if account is disabled (this should be checked BEFORE checking if user exists)
          // The backend returns success: false with message about disabled account when is_active is false
          if (!checkUserResponse.success) {
            const errorMessage = checkUserResponse.message || '';
            const isDisabled = errorMessage.toLowerCase().includes('disabled') || 
                              errorMessage.toLowerCase().includes('inactive');
            
            if (isDisabled) {
              console.log("🚫 Google user account is disabled (from response message)");
              setShowDisabledModal(true);
              setIsLoading(false);
              return;
            }
          }
          
          if (checkUserResponse.success && checkUserResponse.user) {
            // Double-check if account is disabled from user data
            if (checkUserResponse.user.is_active === false) {
              console.log("🚫 Google user account is disabled (from user data)");
              setShowDisabledModal(true);
              setIsLoading(false);
              return;
            }
            
            // User exists and is active, navigate to dashboard
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
            showLoginSuccessAnimation(dbUserData, userType);
          } else {
            // User doesn't exist, show setup screen
            // Only show setup if the response doesn't indicate a disabled account
            const errorMessage = checkUserResponse.message || '';
            const isDisabled = errorMessage.toLowerCase().includes('disabled') || 
                              errorMessage.toLowerCase().includes('inactive');
            
            if (isDisabled) {
              console.log("🚫 Google user account is disabled (user not found but disabled)");
              setShowDisabledModal(true);
              setIsLoading(false);
              return;
            }
            
            console.log("🆕 New Google user, showing setup screen");
            setGoogleUser(user);
            setGoogleToken(accessToken);
            setShowGoogleSetup(true);
          }
        } catch (dbError: any) {
          console.error("❌ Database check error:", dbError);
          
          // Check if error indicates disabled account
          const errorMessage = dbError.message || dbError.toString() || '';
          const isDisabled = errorMessage.toLowerCase().includes('disabled') ||
                            errorMessage.toLowerCase().includes('inactive') ||
                            dbError.status === 403 ||
                            (dbError.response && dbError.response.status === 403);
          
          if (isDisabled) {
            console.log("🚫 Google user account is disabled (from error)");
            setShowDisabledModal(true);
            setIsLoading(false);
            return;
          }
          
          // If database check fails for other reasons, show setup screen as fallback
          console.log("🆕 Database check failed, showing setup screen as fallback");
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
    showLoginSuccessAnimation(userData, userType);
  };

  const handleGoogleSetupCancel = () => {
    console.log("❌ Google setup cancelled");
    setShowGoogleSetup(false);
    setGoogleUser(null);
    setGoogleToken('');
  };

  const showLoginSuccessAnimation = (userData: UserInfo, userType: string) => {
    console.log("🎉 Starting login success animation");
    setShowLoginSuccess(true);
    
    // After success animation, navigate to dashboard
    setTimeout(() => {
      console.log("🎉 Login success animation completed, navigating to dashboard");
      setShowLoginSuccess(false);
      onNavigateToDashboard?.(userData, userType);
    }, 2800); // 500ms + 2000ms + 300ms
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
      const data = await apiService.login(email, password);
      
      // Debug: Log the full API response
      console.log("🔍 Full API Response:", JSON.stringify(data, null, 2));
      console.log("🔍 User object:", JSON.stringify(data.user, null, 2));
      console.log("🔍 User type field (userType):", data.user?.userType);
      console.log("🔍 User type field (user_type):", data.user?.user_type);
      console.log("🔍 User type field (type):", data.user?.type);
      console.log("🔍 User type field (role):", data.user?.role);
      console.log("🔍 All user object keys:", Object.keys(data.user || {}));
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
        let userType = data.user?.userType || data.user?.user_type || data.user?.type || data.user?.role;
        console.log("🎯 Raw user type from DB:", userType);
        console.log("🎯 Checking data.user.userType:", data.user?.userType);
        console.log("🎯 Checking data.user.user_type:", data.user?.user_type);
        
        
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
        
        Toast.show({
          type: 'success',
          text1: 'Login Successful! 🎉',
          text2: `Welcome back, ${userData.name}!`,
          position: 'top',
          visibilityTime: 4000,
        });

        // Show success animation instead of direct navigation
        showLoginSuccessAnimation(userData, userType);
        
        console.log("✅ Email Login successful:", userData);
      } else {
        // Check if account is disabled
        const errorMessage = (data.message as string) || 'Invalid email or password';
        const isDisabled = errorMessage.toLowerCase().includes('disabled') || 
                          errorMessage.toLowerCase().includes('inactive');
        
        if (isDisabled) {
          // Show modal for disabled account
          setShowDisabledModal(true);
        } else {
          // Show toast for other errors
          Toast.show({
            type: 'error',
            text1: 'Login Failed',
            text2: errorMessage,
            position: 'top',
            visibilityTime: 4000,
          });
        }
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

  // Show login success animation
  if (showLoginSuccess) {
    console.log("🎉 Rendering login success screen");
    const rotate = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['-20deg', '20deg'],
    });

    return (
      <View style={styles.loginSuccessOverlay}>
        <Animated.View 
          style={[
            styles.loginSuccessContainer,
            {
              opacity: loginSuccessAnim,
              transform: [
                {
                  scale: loginSuccessAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.loginSuccessIcon,
              {
                transform: [
                  {
                    scale: loginSuccessAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1.2, 1],
                    }),
                  },
                  {
                    rotate: rotate,
                  },
                ],
              },
            ]}
          >
            <Ionicons name="hand-left" size={80} color="#F56E0F" />
          </Animated.View>
          
          <Animated.Text 
            style={[
              styles.loginSuccessTitle,
              {
                opacity: loginSuccessAnim,
                transform: [
                  {
                    translateY: loginSuccessAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            Login Successful!
          </Animated.Text>
          
          <Animated.Text 
            style={[
              styles.loginSuccessMessage,
              {
                opacity: loginSuccessAnim,
                transform: [
                  {
                    translateY: loginSuccessAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            Welcome back! Getting ready...
          </Animated.Text>
        </Animated.View>
      </View>
    );
  }


  if (userInfo) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f0" />
        
        {/* Background Bubbles */}
        <View style={styles.bubbleContainer}>
          <Animated.View 
            style={[
              styles.bubble, 
              styles.bubble1,
              {
                opacity: backgroundAnim.interpolate({
                  inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                  outputRange: [1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1],
                }),
                transform: [
                  { scale: bubbleAnim1 },
                  { 
                    translateX: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, 30, 80, 100, 120, 140, 60, 20, -40, -80, 0],
                    })
                  },
                  { 
                    translateY: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, -20, -50, -70, -90, -110, -30, 10, 50, 80, 0],
                    })
                  },
                ],
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.bubble, 
              styles.bubble2,
              {
                opacity: backgroundAnim.interpolate({
                  inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                  outputRange: [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
                }),
                transform: [
                  { scale: bubbleAnim2 },
                  { 
                    translateX: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, -20, -50, -80, -110, -140, -100, -60, -30, 0, 30],
                    })
                  },
                  { 
                    translateY: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, 30, 60, 90, 120, 150, 100, 50, 20, -10, -40],
                    })
                  },
                ],
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.bubble, 
              styles.bubble3,
              {
                opacity: backgroundAnim.interpolate({
                  inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                  outputRange: [1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1],
                }),
                transform: [
                  { scale: bubbleAnim3 },
                  { 
                    translateX: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, 50, 100, 150, 80, 40, 0, -40, -80, -60, -20],
                    })
                  },
                  { 
                    translateY: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, -40, -80, -120, -60, -20, 20, 60, 100, 60, 20],
                    })
                  },
                ],
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.bubble, 
              styles.bubble4,
              {
                opacity: backgroundAnim.interpolate({
                  inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                  outputRange: [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0],
                }),
                transform: [
                  { scale: bubbleAnim4 },
                  { 
                    translateX: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, -30, -60, -90, -120, -150, -100, -50, -20, 10, 40],
                    })
                  },
                  { 
                    translateY: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, 40, 80, 120, 160, 200, 150, 100, 60, 20, -20],
                    })
                  },
                ],
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.bubble, 
              styles.bubble5,
              {
                opacity: backgroundAnim.interpolate({
                  inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                  outputRange: [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
                }),
                transform: [
                  { scale: bubbleAnim5 },
                  { 
                    translateX: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, 20, 40, 60, 80, 100, 80, 60, 40, 20, 0],
                    })
                  },
                  { 
                    translateY: backgroundAnim.interpolate({
                      inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      outputRange: [0, -30, -60, -90, -120, -150, -120, -90, -60, -30, 0],
                    })
                  },
                ],
              }
            ]} 
          />
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
      <StatusBar barStyle="light-content" backgroundColor="#151419" />
      
      {/* Background Bubbles */}
      <View style={styles.bubbleContainer}>
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble1,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                outputRange: [1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1],
              }),
              transform: [
                { scale: bubbleAnim1 },
                { 
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, 30, 80, 100, 120, 140, 60, 20, -40, -80, 0],
                  })
                },
                { 
                  translateY: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, -20, -50, -70, -90, -110, -30, 10, 50, 80, 0],
                  })
                },
              ],
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble2,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                outputRange: [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
              }),
              transform: [
                { scale: bubbleAnim2 },
                { 
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, -20, -50, -80, -110, -140, -100, -60, -30, 0, 30],
                  })
                },
                { 
                  translateY: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, 30, 60, 90, 120, 150, 100, 50, 20, -10, -40],
                  })
                },
              ],
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble3,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                outputRange: [1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1],
              }),
              transform: [
                { scale: bubbleAnim3 },
                { 
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, 50, 100, 150, 80, 40, 0, -40, -80, -60, -20],
                  })
                },
                { 
                  translateY: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, -40, -80, -120, -60, -20, 20, 60, 100, 60, 20],
                  })
                },
              ],
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble4,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                outputRange: [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0],
              }),
              transform: [
                { scale: bubbleAnim4 },
                { 
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, -30, -60, -90, -120, -150, -100, -50, -20, 10, 40],
                  })
                },
                { 
                  translateY: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, 40, 80, 120, 160, 200, 150, 100, 60, 20, -20],
                  })
                },
              ],
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble5,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                outputRange: [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
              }),
              transform: [
                { scale: bubbleAnim5 },
                { 
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, 20, 40, 60, 80, 100, 80, 60, 40, 20, 0],
                  })
                },
                { 
                  translateY: backgroundAnim.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, -30, -60, -90, -120, -150, -120, -90, -60, -30, 0],
                  })
                },
              ],
            }
          ]} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="business" size={60} color="#FBFBFB" />
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
        </Animated.View>
      </ScrollView>
      
      {/* Disabled Account Modal */}
      <Modal
        visible={showDisabledModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowDisabledModal(false);
          setShowAppealForm(false);
          setAppealMessage('');
          setAppealEmail('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.disabledModalContent}>
            {!showAppealForm ? (
              <>
                <View style={styles.disabledModalHeader}>
                  <Ionicons name="warning" size={40} color="#f59e0b" />
                  <Text style={styles.disabledModalTitle}>Account Disabled</Text>
                </View>
                <Text style={styles.disabledModalMessage}>
                  Your account has been disabled. Please contact the administrator to restore access to your account.
                </Text>
                <View style={styles.disabledModalButtons}>
                  <TouchableOpacity
                    style={[styles.disabledModalButton, styles.disabledModalButtonSecondary]}
                    onPress={() => {
                      setShowAppealForm(true);
                      setAppealEmail(email || '');
                    }}
                  >
                    <Text style={styles.disabledModalButtonSecondaryText}>Send Appeal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.disabledModalButton}
                    onPress={() => setShowDisabledModal(false)}
                  >
                    <Text style={styles.disabledModalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.disabledModalHeader}>
                  <Ionicons name="mail" size={40} color="#f59e0b" />
                  <Text style={styles.disabledModalTitle}>Send Appeal</Text>
                </View>
                <Text style={styles.disabledModalMessage}>
                  Send a message to the administrator requesting account restoration.
                </Text>
                <View style={styles.appealForm}>
                  <View style={styles.appealInputContainer}>
                    <Text style={styles.appealLabel}>Your Email *</Text>
                    <TextInput
                      style={styles.appealInput}
                      value={appealEmail}
                      onChangeText={setAppealEmail}
                      placeholder="Enter your email"
                      placeholderTextColor="#878787"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isSendingAppeal}
                    />
                  </View>
                  <View style={styles.appealInputContainer}>
                    <Text style={styles.appealLabel}>Message *</Text>
                    <TextInput
                      style={[styles.appealInput, styles.appealTextArea]}
                      value={appealMessage}
                      onChangeText={setAppealMessage}
                      placeholder="Explain why you believe your account should be restored..."
                      placeholderTextColor="#878787"
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                      editable={!isSendingAppeal}
                    />
                  </View>
                </View>
                <View style={styles.disabledModalButtons}>
                  <TouchableOpacity
                    style={[styles.disabledModalButton, styles.disabledModalButtonSecondary]}
                    onPress={() => {
                      setShowAppealForm(false);
                      setAppealMessage('');
                    }}
                    disabled={isSendingAppeal}
                  >
                    <Text style={styles.disabledModalButtonSecondaryText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.disabledModalButton, isSendingAppeal && styles.disabledModalButtonDisabled]}
                    onPress={async () => {
                      if (!appealEmail.trim() || !appealMessage.trim()) {
                        Toast.show({
                          type: 'error',
                          text1: 'Validation Error',
                          text2: 'Please fill in all fields',
                          position: 'top',
                          visibilityTime: 4000,
                        });
                        return;
                      }

                      setIsSendingAppeal(true);
                      try {
                        const response = await apiService.sendAccountAppeal(appealEmail, appealMessage);
                        
                        if (response.success) {
                          Toast.show({
                            type: 'success',
                            text1: 'Appeal Sent',
                            text2: 'Your appeal has been sent to the administrator. You will be contacted soon.',
                            position: 'top',
                            visibilityTime: 5000,
                          });
                          setShowDisabledModal(false);
                          setShowAppealForm(false);
                          setAppealMessage('');
                          setAppealEmail('');
                        } else {
                          Toast.show({
                            type: 'error',
                            text1: 'Error',
                            text2: response.message || 'Failed to send appeal. Please try again.',
                            position: 'top',
                            visibilityTime: 4000,
                          });
                        }
                      } catch (error) {
                        console.error('Error sending appeal:', error);
                        Toast.show({
                          type: 'error',
                          text1: 'Error',
                          text2: 'Failed to send appeal. Please try again.',
                          position: 'top',
                          visibilityTime: 4000,
                        });
                      } finally {
                        setIsSendingAppeal(false);
                      }
                    }}
                    disabled={isSendingAppeal}
                  >
                    {isSendingAppeal ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.disabledModalButtonText}>Send Appeal</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
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
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 50,
  },
  bubble1: {
    width: 100,
    height: 100,
    top: height * 0.1,
    left: width * 0.1,
    backgroundColor: 'rgba(245, 110, 15, 0.1)', // Orange with opacity
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
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  appTitle: {
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
  loginCard: {
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
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#878787', // Muted gray
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  googleButtonDisabled: {
    backgroundColor: '#878787',
    shadowOpacity: 0,
    elevation: 0,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
  },
  termsText: {
    fontSize: 12,
    color: '#878787', // Muted gray
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
    color: '#878787', // Muted gray
  },
  registerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F56E0F', // Primary orange
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#878787', // Muted gray
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#878787', // Muted gray
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)', // Orange border
    borderRadius: 16,
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
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FBFBFB', // Light text
  },
  showPasswordButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  showPasswordText: {
    fontSize: 18,
  },
  emailButton: {
    backgroundColor: '#F56E0F', // Primary orange
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 20,
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  emailButtonDisabled: {
    backgroundColor: '#878787',
    shadowOpacity: 0,
    elevation: 0,
  },
  emailButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    textAlign: 'center',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 10,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#F56E0F', // Primary orange
    fontWeight: '500',
  },
  userCard: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A2A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#F56E0F',
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
    color: '#F56E0F', // Primary orange
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBFBFB', // Light text
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#878787', // Muted gray
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
  // Login Success Animation Styles
  loginSuccessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(21, 20, 25, 0.95)', // Dark background with opacity
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  // Disabled Account Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  disabledModalContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  disabledModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FBFBFB',
    flex: 1,
  },
  disabledModalMessage: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  disabledModalButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 120,
  },
  disabledModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledModalButtonSecondary: {
    backgroundColor: '#2A2A2E',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  disabledModalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  disabledModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  disabledModalButtonDisabled: {
    opacity: 0.6,
  },
  appealForm: {
    marginTop: 8,
    marginBottom: 16,
  },
  appealInputContainer: {
    marginBottom: 16,
  },
  appealLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 8,
  },
  appealInput: {
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#2A2A2E',
    color: '#FBFBFB',
  },
  appealTextArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  loginSuccessContainer: {
    backgroundColor: '#1B1B1E', // Dark secondary background
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 2,
    borderColor: '#F56E0F',
  },
  loginSuccessIcon: {
    marginBottom: 24,
    transformOrigin: 'bottom center',
  },
  loginSuccessTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    textAlign: 'center',
    marginBottom: 12,
  },
  loginSuccessMessage: {
    fontSize: 16,
    color: '#878787', // Muted gray
    textAlign: 'center',
    fontWeight: '500',
  },
});
