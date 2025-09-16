import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import CompanyDashboard from './CompanyDashboard';

export default function TestCompanyDashboard() {
  const handleLogout = () => {
    Alert.alert('Logout', 'Logout functionality will be implemented soon.');
  };

  return (
    <View style={styles.container}>
      <CompanyDashboard onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
