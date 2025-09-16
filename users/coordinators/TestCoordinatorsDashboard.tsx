import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import CoordinatorsDashboard from './CoordinatorsDashboard';

export default function TestCoordinatorsDashboard() {
  const handleLogout = () => {
    Alert.alert('Logout', 'Logout functionality will be implemented');
  };

  return (
    <View style={styles.container}>
      <CoordinatorsDashboard onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
