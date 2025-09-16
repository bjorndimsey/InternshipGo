import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import SystemAdminDashboard from './SystemAdminDashboard';

// Simple test component to verify the dashboard works
export default function TestDashboard() {
  const handleLogout = () => {
    console.log('✅ Dashboard logout test successful!');
    alert('Dashboard logout test successful!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>System Admin Dashboard Test</Text>
      <Text style={styles.subtitle}>If you can see this, the dashboard is working!</Text>
      
      <SystemAdminDashboard onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
});
