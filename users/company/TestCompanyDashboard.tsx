import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import CompanyDashboard from './CompanyDashboard';

export default function TestCompanyDashboard() {
  const handleLogout = () => {
    Alert.alert('Logout', 'Logout functionality will be implemented soon.');
  };

  // Mock user data for testing
  const currentUser = {
    name: 'Test Company',
    email: 'test@company.com',
    picture: undefined,
    id: 'test-company-id',
    user_type: 'company'
  };

  return (
    <View style={styles.container}>
      <CompanyDashboard onLogout={handleLogout} currentUser={currentUser} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
