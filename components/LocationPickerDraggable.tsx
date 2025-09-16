import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../lib/api';

// Declare Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

interface UserLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  avatar?: string;
}

interface LocationPickerDraggableProps {
  onLocationSelect?: (latitude: number, longitude: number) => void;
  onClose?: () => void;
  currentUserId?: string;
}

export default function LocationPickerDraggable({ onLocationSelect, onClose, currentUserId }: LocationPickerDraggableProps) {
  console.log('LocationPickerDraggable component rendering...');
  
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 7.1907,
    longitude: 125.4553,
  });
  const [otherUsers, setOtherUsers] = useState<UserLocation[]>([]);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [locationFetched, setLocationFetched] = useState(false);
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchCurrentUserLocation();
      fetchUserLocations();
    }
  }, []);

  // Initialize map only after location has been fetched
  useEffect(() => {
    if (typeof window !== 'undefined' && locationFetched) {
      console.log('Location fetched, initializing map with coordinates:', currentLocation);
      initializeMap();
    }
  }, [locationFetched]);

  // Update marker position when location changes
  useEffect(() => {
    if (mapInitialized && markerRef.current && currentLocation.latitude && currentLocation.longitude) {
      markerRef.current.setLatLng([currentLocation.latitude, currentLocation.longitude]);
      mapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 12);
    }
  }, [currentLocation, mapInitialized]);

  const loadLeaflet = async () => {
    return new Promise((resolve, reject) => {
      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load JS
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Failed to load Leaflet'));
        document.head.appendChild(script);
      } else {
        resolve(true);
      }
    });
  };

  const initializeMap = async () => {
    try {
      setLoading(true);
      console.log('Loading Leaflet...');
      
      await loadLeaflet();
      console.log('Leaflet loaded, initializing map...');
      
      // Wait a bit for the container to be ready
      setTimeout(() => {
        if (mapContainerRef.current && window.L) {
          console.log('Creating map...');
          
          // Create map with safe coordinates
          const lat = currentLocation.latitude || 7.1907;
          const lng = currentLocation.longitude || 125.4553;
          
          mapRef.current = window.L.map(mapContainerRef.current, {
            center: [lat, lng],
            zoom: 12,
            zoomControl: true
          });

          // Add tiles
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapRef.current);

          // Create draggable marker
          markerRef.current = window.L.marker([lat, lng], {
            draggable: true
          }).addTo(mapRef.current);

          // Add drag event listener
          markerRef.current.on('dragend', (e: any) => {
            const lat = e.target.getLatLng().lat;
            const lng = e.target.getLatLng().lng;
            
            console.log(`Marker dragged to: ${lat}, ${lng}`);
            setCurrentLocation({ latitude: lat, longitude: lng });
          });

          // Add click event listener to map
          mapRef.current.on('click', (e: any) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            console.log(`Map clicked at: ${lat}, ${lng}`);
            setCurrentLocation({ latitude: lat, longitude: lng });
          });

          setMapInitialized(true);
          setLoading(false);
          console.log('Map initialized successfully with draggable marker');
        }
      }, 500);
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoading(false);
    }
  };

  const fetchCurrentUserLocation = async () => {
    try {
      if (!currentUserId) {
        console.log('No currentUserId provided, using default location');
        setLocationFetched(true);
        return;
      }

      console.log('Fetching current user location for ID:', currentUserId);
      const response = await apiService.getProfile(currentUserId);
      
      console.log('Profile API response:', response);
      
      if (response.success && response.user) {
        const user = response.user;
        console.log('User profile data:', user);
        console.log('User latitude:', user.latitude, 'type:', typeof user.latitude);
        console.log('User longitude:', user.longitude, 'type:', typeof user.longitude);
        
        // Check if user has saved location coordinates
        if (user.latitude !== null && user.longitude !== null && user.latitude !== undefined && user.longitude !== undefined) {
          console.log('User has saved location:', user.latitude, user.longitude);
          setCurrentLocation({
            latitude: parseFloat(user.latitude),
            longitude: parseFloat(user.longitude)
          });
        } else {
          console.log('User has no saved location, using default coordinates');
          console.log('Latitude null/undefined:', user.latitude === null || user.latitude === undefined);
          console.log('Longitude null/undefined:', user.longitude === null || user.longitude === undefined);
        }
      } else {
        console.log('Failed to fetch user profile, using default location');
        console.log('Response success:', response.success);
        console.log('Response user:', response.user);
      }
    } catch (error) {
      console.error('Error fetching current user location:', error);
    } finally {
      setLocationFetched(true);
    }
  };

  const fetchUserLocations = async () => {
    try {
      const response = await apiService.getUserLocations();
      
      if (response.success && response.data) {
        setOtherUsers(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch user locations');
      }
    } catch (error) {
      console.error('Error fetching user locations:', error);
    }
  };

  const updateLocation = async (latitude: number, longitude: number) => {
    try {
      setUpdating(true);
      
      if (!currentUserId) {
        Alert.alert('Error', 'User ID not available. Please log in again.');
        return;
      }
      
      const response = await apiService.updateLocation(currentUserId, latitude, longitude);
      
      if (response.success) {
        Alert.alert('Success', 'Location updated successfully');
      } else {
        throw new Error(response.message || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'Failed to update location');
    } finally {
      setUpdating(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleConfirmLocation = () => {
    if (onLocationSelect) {
      onLocationSelect(currentLocation.latitude, currentLocation.longitude);
    }
    if (onClose) {
      onClose();
    }
  };

  const centerOnCurrentLocation = () => {
    if (mapRef.current && currentLocation.latitude && currentLocation.longitude) {
      mapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 12);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Location</Text>
        {onClose && (
          <MaterialIcons 
            name="close" 
            size={24} 
            color="#666" 
            onPress={onClose}
            style={styles.closeButton}
          />
        )}
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '500px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid #4285f4',
            position: 'relative',
            backgroundColor: '#e8f4fd'
          }}
        />
        
        {/* Loading Overlay */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#e8f4fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            flexDirection: 'column'
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #e3f2fd', 
              borderTop: '4px solid #4285f4', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }}></div>
            <div style={{ color: '#4285f4', fontSize: '16px', textAlign: 'center' }}>
              Loading interactive map...
            </div>
          </div>
        )}
        
        {/* Map Instructions */}
        <View style={styles.mapInstructions}>
          <Text style={styles.instructionText}>
            🗺️ Drag the blue pin to set your location, or click anywhere on the map
          </Text>
        </View>
      </View>

      {/* Coordinate Input Section */}
      <View style={styles.coordinateSection}>
        <Text style={styles.sectionTitle}>Current Location Coordinates</Text>
        <View style={styles.coordinateInputs}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Latitude:</Text>
            <TextInput
              style={styles.coordinateInput}
              value={currentLocation.latitude?.toString() || '7.1907'}
              onChangeText={(text) => {
                const lat = parseFloat(text);
                if (!isNaN(lat)) {
                  setCurrentLocation(prev => ({ ...prev, latitude: lat }));
                }
              }}
              keyboardType="numeric"
              placeholder="7.1907"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Longitude:</Text>
            <TextInput
              style={styles.coordinateInput}
              value={currentLocation.longitude?.toString() || '125.4553'}
              onChangeText={(text) => {
                const lng = parseFloat(text);
                if (!isNaN(lng)) {
                  setCurrentLocation(prev => ({ ...prev, longitude: lng }));
                }
              }}
              keyboardType="numeric"
              placeholder="125.4553"
            />
          </View>
        </View>
        
        {/* Update Location Button */}
        <TouchableOpacity 
          style={styles.updateButton} 
          onPress={() => updateLocation(currentLocation.latitude, currentLocation.longitude)}
        >
          <MaterialIcons name="update" size={20} color="#fff" />
          <Text style={styles.updateButtonText}>
            {updating ? 'Updating...' : 'Update Location'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Other Users Section */}
      {otherUsers.length > 0 && (
        <View style={styles.otherUsersSection}>
          <Text style={styles.sectionTitle}>Other Users Nearby</Text>
          {otherUsers.map((user) => {
            const distance = calculateDistance(
              currentLocation.latitude || 7.1907,
              currentLocation.longitude || 125.4553,
              user.latitude,
              user.longitude
            );
            return (
              <View key={user.id} style={styles.userItem}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userDistance}>
                    {distance.toFixed(1)} km away
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.locationControls} onPress={centerOnCurrentLocation}>
          <MaterialIcons name="my-location" size={24} color="#4285f4" />
          <Text style={styles.controlText}>Center Map</Text>
        </TouchableOpacity>
        
        <View style={styles.locationControls}>
          <MaterialIcons name="edit-location" size={24} color="#4285f4" />
          <Text style={styles.controlText}>Drag Pin</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmLocation}>
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text style={styles.confirmButtonText}>
            {updating ? 'Updating...' : 'Confirm Location'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  closeButton: {
    padding: 4,
  },
  mapContainer: {
    margin: 16,
    position: 'relative',
    height: 520,
  },
  mapInstructions: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 1000,
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  coordinateSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  coordinateInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  coordinateInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#fff',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285f4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  otherUsersSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  userDistance: {
    fontSize: 14,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  locationControls: {
    alignItems: 'center',
  },
  controlText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionButtons: {
    padding: 16,
    backgroundColor: '#fff',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285f4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
