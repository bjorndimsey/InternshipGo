import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import LandingPage from './LandingPage';

/**
 * Example usage of the LandingPage component
 * This shows how to integrate the landing page into your app
 */
export default function LandingPageExample() {
  const handleNavigateToLogin = () => {
    Alert.alert('Navigation', 'Navigate to Login Screen');
    // Replace with actual navigation:
    // navigation.navigate('Login');
  };

  const handleNavigateToRegister = () => {
    Alert.alert('Navigation', 'Navigate to Register Screen');
    // Replace with actual navigation:
    // navigation.navigate('Register');
  };

  const handleNavigateToDashboard = (user: any, userType?: string) => {
    Alert.alert('Navigation', `Navigate to Dashboard for ${userType || 'user'}`);
    // Replace with actual navigation:
    // navigation.navigate('Dashboard', { user, userType });
  };

  return (
    <View style={styles.container}>
      <LandingPage
        onNavigateToLogin={handleNavigateToLogin}
        onNavigateToRegister={handleNavigateToRegister}
        onNavigateToDashboard={handleNavigateToDashboard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151419',
  },
});
