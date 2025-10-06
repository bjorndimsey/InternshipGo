import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import StudentInternsDashboard from './StudentInternsDashboard';

export default function TestStudentDashboard() {
  const handleLogout = () => {
    Alert.alert('Logout', 'Logout functionality will be implemented');
  };

  // Mock user data for testing
  const currentUser = {
    id: 'test-student-id',
    email: 'test@student.com',
    user_type: 'student',
    google_id: 'test-google-id'
  };

  return (
    <View style={styles.container}>
      <StudentInternsDashboard onLogout={handleLogout} currentUser={currentUser} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
