import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoogleLogin from './screens/Loginscreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

// Import all dashboard components
import SystemAdminDashboard from './users/systemadmin/SystemAdminDashboard';
import StudentInternsDashboard from './users/studentinterns/StudentInternsDashboard';
import CoordinatorsDashboard from './users/coordinators/CoordinatorsDashboard';
import AdminCoordinatorsDashboard from './users/admincoordinators/AdminCoordinatorsDashboard';
import CompanyDashboard from './users/company/CompanyDashboard';
import LoadingScreen from './components/LoadingScreen';
import SplashScreen from './components/SplashScreen';
import { UserInfo } from './AuthContext';

type Screen = 'loading' | 'splashscreen' |'login' | 'register' | 'forgot-password' | 'dashboard';
type UserType = 'student' | 'coordinator' | 'admin_coordinator' | 'company' | 'system_admin';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splashscreen');
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored authentication on app start
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      console.log('🔍 Checking stored authentication...');
      const storedUser = await AsyncStorage.getItem('user');
      const storedUserType = await AsyncStorage.getItem('userType');
      
      if (storedUser && storedUserType) {
        console.log('✅ Found stored user:', storedUser);
        console.log('✅ Found stored user type:', storedUserType);
        
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        setUserType(storedUserType as UserType);
        setCurrentScreen('dashboard');
      } else {
        console.log('❌ No stored authentication found');
        setCurrentScreen('splashscreen');
      }
    } catch (error) {
      console.error('❌ Error checking stored auth:', error);
      setCurrentScreen('splashscreen');
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeUserType = (userType?: string): UserType => {
    if (!userType) return 'student';
    
    switch (userType.toLowerCase()) {
      case 'student':
        return 'student';
      case 'coordinator':
        return 'coordinator';
      case 'company':
        return 'company';
      case 'admin_coordinator':
      case 'admin coordinator':
        return 'admin_coordinator';
      case 'system_admin':
      case 'system admin':
      case 'System Admin':
        return 'system_admin';
      default:
        console.log('⚠️ Unknown user type, defaulting to student:', userType);
        return 'student';
    }
  };

  const handleLoginSuccess = async (user: UserInfo, userType?: string) => {
    console.log('✅ Login successful:', user, 'User Type:', userType);
    const normalizedUserType = normalizeUserType(userType);
    console.log('🎯 Normalized user type:', normalizedUserType);
    
    // Store authentication data
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('userType', normalizedUserType);
      console.log('💾 Authentication data stored successfully');
    } catch (error) {
      console.error('❌ Error storing auth data:', error);
    }
    
    setCurrentUser(user);
    setUserType(normalizedUserType);
    setCurrentScreen('dashboard');
  };

  const handleNavigateToDashboard = async (user: UserInfo, userType?: string) => {
    console.log('✅ Navigating to dashboard:', user, 'User Type:', userType);
    const normalizedUserType = normalizeUserType(userType);
    console.log('🎯 Normalized user type:', normalizedUserType);
    
    // Store authentication data
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('userType', normalizedUserType);
      console.log('💾 Authentication data stored successfully');
    } catch (error) {
      console.error('❌ Error storing auth data:', error);
    }
    
    setCurrentUser(user);
    setUserType(normalizedUserType);
    setCurrentScreen('dashboard');
  };

  const handleNavigateToRegister = () => {
    setCurrentScreen('register');
  };

  const handleNavigateToForgotPassword = () => {
    setCurrentScreen('forgot-password');
  };

  const handleLogout = () => {
    console.log('🚪 App.tsx: handleLogout called');
    console.log('🚪 App.tsx: Current user:', currentUser);
    console.log('🚪 App.tsx: Current user type:', userType);
    console.log('🚪 App.tsx: Current screen:', currentScreen);
    
    // Test: Try direct logout without Alert first
    console.log('🧪 App.tsx: Testing direct logout without Alert...');
    performLogout();
  };

  const performLogout = async () => {
    try {
      console.log('🚪 App.tsx: Starting logout process...');
      
      // Clear stored authentication data
      console.log('🗑️ App.tsx: Clearing stored authentication data...');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('userType');
      console.log('🗑️ App.tsx: Stored authentication data cleared successfully');
      
      // Clear in-memory state
      console.log('🧹 App.tsx: Clearing in-memory state...');
      setCurrentUser(null);
      setUserType(null);
      console.log('🧹 App.tsx: In-memory state cleared');
      
      // Navigate to splash screen
      console.log('🔄 App.tsx: Setting screen to splashscreen...');
      setCurrentScreen('splashscreen');
      console.log('🔄 App.tsx: Screen set to splashscreen successfully');
      
      // Show success toast
      console.log('🎉 App.tsx: Showing success toast...');
      Toast.show({
        type: 'success',
        text1: 'Logged Out Successfully',
        text2: 'You have been logged out',
        position: 'top',
        visibilityTime: 3000,
      });
      console.log('🎉 App.tsx: Success toast shown');
      
      console.log('✅ App.tsx: Logout process completed successfully');
    } catch (error) {
      console.error('❌ App.tsx: Error during logout process:', error);
      Toast.show({
        type: 'error',
        text1: 'Logout Error',
        text2: 'There was an error during logout',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
  };

  const handleSplashFinish = () => {
    setCurrentScreen('login');
  };

  const handleLoadingFinish = () => {
    setCurrentScreen('login');
  };

  const handleRegisterSuccess = async (userData: any, userType?: string) => {
    console.log('✅ Registration successful:', userData, 'User Type:', userType);
    const normalizedUserType = normalizeUserType(userType);
    console.log('🎯 Registration user type normalized:', normalizedUserType);
    
    const userInfo: UserInfo = {
      id: userData.id?.toString() || userData.email,
      name: userData.first_name || userData.coord_first_name || userData.company_name || userData.email.split('@')[0],
      email: userData.email,
      picture: userData.profile_picture || undefined,
      user_type: normalizedUserType,
      google_id: userData.google_id || undefined,
    };
    
    // Store authentication data
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userInfo));
      await AsyncStorage.setItem('userType', normalizedUserType);
      console.log('💾 Registration authentication data stored successfully');
    } catch (error) {
      console.error('❌ Error storing registration auth data:', error);
    }
    
    setCurrentUser(userInfo);
    setUserType(normalizedUserType);
    setCurrentScreen('dashboard');
  };

  const renderDashboard = () => {
    console.log('🔍 renderDashboard called');
    console.log('🔍 currentUser:', currentUser);
    console.log('🔍 userType:', userType);
    console.log('🔍 userType type:', typeof userType);
    
    if (!userType) {
      console.log('❌ No user type found, showing error');
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User type not found. Please login again.</Text>
        </View>
      );
    }

    console.log('🎯 Rendering dashboard for user type:', userType);

    switch (userType) {
      case 'student':
        console.log('📚 Loading Student Interns Dashboard');
        return <StudentInternsDashboard onLogout={handleLogout} currentUser={currentUser!} />;
      case 'coordinator':
        console.log('👨‍🏫 Loading Coordinators Dashboard');
        return <CoordinatorsDashboard onLogout={handleLogout} currentUser={currentUser} />;
      case 'admin_coordinator':
        console.log('👨‍💼 Loading Admin Coordinators Dashboard');
        return <AdminCoordinatorsDashboard onLogout={handleLogout} currentUser={currentUser} />;
      case 'company':
        console.log('🏢 Loading Company Dashboard');
        return <CompanyDashboard onLogout={handleLogout} currentUser={currentUser} />;
      case 'system_admin':
        console.log('⚙️ Loading System Admin Dashboard');
        return <SystemAdminDashboard onLogout={handleLogout} />;
      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unknown user type: {userType}</Text>
          </View>
        );
    }
  };

  const renderCurrentScreen = () => {
    // Show loading screen while checking authentication
    if (isLoading) {
      return <LoadingScreen message="Checking authentication..." />;
    }

    switch (currentScreen) {
      case 'splashscreen':
        return <SplashScreen onAnimationFinish={handleSplashFinish} />;
      case 'loading':
        return <LoadingScreen message="Loading InternshipGo..." />;
      case 'login':
        return (
          <GoogleLogin
            onLoginSuccess={handleLoginSuccess}
            onNavigateToDashboard={handleNavigateToDashboard}
            onNavigateToRegister={handleNavigateToRegister}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
          />
        );
      case 'register':
        return <RegisterScreen onNavigateToLogin={handleBackToLogin} onRegisterSuccess={handleRegisterSuccess} />;
      case 'forgot-password':
        return <ForgotPasswordScreen onBack={handleBackToLogin} />;
      case 'dashboard':
        return renderDashboard();
      default:
        return (
          <GoogleLogin
            onLoginSuccess={handleLoginSuccess}
            onNavigateToDashboard={handleNavigateToDashboard}
            onNavigateToRegister={handleNavigateToRegister}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#ea4335',
    textAlign: 'center',
    fontWeight: '500',
  },
});