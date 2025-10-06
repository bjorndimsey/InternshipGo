import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import CoordinatorsDashboard from './CoordinatorsDashboard';

export default function TestCoordinatorsDashboard() {
  const handleLogout = () => {
    Alert.alert('Logout', 'Logout functionality will be implemented');
  };

  // Mock user data for testing
  const currentUser = {
    name: 'Test Coordinator',
    email: 'test@coordinator.com',
    picture: undefined,
    id: 'test-coordinator-id',
    user_type: 'coordinator'
  };

  return (
    <View style={styles.container}>
      <CoordinatorsDashboard onLogout={handleLogout} currentUser={currentUser} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
