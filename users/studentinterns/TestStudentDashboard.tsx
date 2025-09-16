import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import StudentInternsDashboard from './StudentInternsDashboard';

export default function TestStudentDashboard() {
  const handleLogout = () => {
    Alert.alert('Logout', 'Logout functionality will be implemented');
  };

  return (
    <View style={styles.container}>
      <StudentInternsDashboard onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
