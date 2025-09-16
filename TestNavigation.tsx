import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import App from './App';

// This is a test component to verify navigation works
export default function TestNavigation() {
  const handleTestNavigation = () => {
    Alert.alert(
      'Test Navigation',
      'This will test the navigation system. Check the console for logs.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Test', onPress: () => console.log('🧪 Testing navigation system...') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.testHeader}>
        <Text style={styles.testTitle}>Navigation Test</Text>
        <TouchableOpacity style={styles.testButton} onPress={handleTestNavigation}>
          <Text style={styles.testButtonText}>Test Navigation</Text>
        </TouchableOpacity>
      </View>
      <App />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  testHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
  },
  testTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  testButton: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
