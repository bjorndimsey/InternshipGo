import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, TouchableOpacity, Platform, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../lib/api';

// Only import react-native-maps on native platforms
let MapView: any, Marker: any, PROVIDER_GOOGLE: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

// For web compatibility, we'll use a different approach since Leaflet doesn't work well with React Native
// We'll create a custom map component using react-native-maps for mobile and a web fallback

interface UserLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  avatar?: string;
}

interface LocationPickerMapProps {
  onLocationSelect?: (latitude: number, longitude: number) => void;
  onClose?: () => void;
  currentUserId?: string;
}

export default function LocationPickerMap({ onLocationSelect, onClose, currentUserId }: LocationPickerMapProps) {
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 7.1907,
    longitude: 125.4553,
  });
  const [otherUsers, setOtherUsers] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    fetchUserLocations();
  }, []);

  const fetchUserLocations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserLocations();
      
      if (response.success && (response as any).data) {
        setOtherUsers((response as any).data);
      } else {
        throw new Error(typeof response.message === 'string' ? response.message : 'Failed to fetch user locations');
      }
    } catch (error) {
      console.error('Error fetching user locations:', error);
      Alert.alert('Error', 'Failed to load user locations');
    } finally {
      setLoading(false);
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

  const handleMarkerDrag = async (latitude: number, longitude: number) => {
    setCurrentLocation({ latitude, longitude });
    await updateLocation(latitude, longitude);
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
    // This would center the map on the current location
    // For now, we'll just update the coordinates display
    console.log('Centering on current location');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

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
        {Platform.OS === 'web' ? (
          // Web fallback - show a message to use the web version
          <View style={styles.webFallback}>
            <MaterialIcons name="map" size={64} color="#4285f4" />
            <Text style={styles.webFallbackTitle}>Interactive Map</Text>
            <Text style={styles.webFallbackText}>
              For the best map experience, please use the web version of the LocationPicker.
            </Text>
            <Text style={styles.coordinatesText}>
              Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
            
            {/* Manual coordinate input for web */}
            <View style={styles.manualInput}>
              <Text style={styles.inputLabel}>Or enter coordinates manually:</Text>
              <View style={styles.coordinateInputs}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Latitude:</Text>
                  <TextInput
                    style={styles.coordinateInput}
                    value={currentLocation.latitude.toString()}
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
                    value={currentLocation.longitude.toString()}
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
            </View>
          </View>
        ) : (
          // Native map for mobile platforms
          <>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={(event: any) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setCurrentLocation({ latitude, longitude });
                updateLocation(latitude, longitude);
              }}
            >
              {/* Current user marker (draggable) */}
              <Marker
                coordinate={currentLocation}
                draggable
                onDragEnd={(event: any) => {
                  const { latitude, longitude } = event.nativeEvent.coordinate;
                  setCurrentLocation({ latitude, longitude });
                  updateLocation(latitude, longitude);
                }}
                title="Your Location"
                description={`${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
              >
                <View style={styles.currentUserMarker}>
                  <MaterialIcons name="my-location" size={30} color="#4285f4" />
                </View>
              </Marker>

              {/* Other users markers */}
              {otherUsers.map((user) => {
                const distance = calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  user.latitude,
                  user.longitude
                );
                return (
                  <Marker
                    key={user.id}
                    coordinate={{ latitude: user.latitude, longitude: user.longitude }}
                    title={user.name}
                    description={`${distance.toFixed(1)} km away`}
                  >
                    <View style={styles.otherUserMarker}>
                      <Text style={styles.otherUserMarkerText}>
                        {user.name.charAt(0)}
                      </Text>
                    </View>
                  </Marker>
                );
              })}
            </MapView>
            
            {/* Coordinates display */}
            <View style={styles.coordinatesDisplay}>
              <Text style={styles.coordinatesText}>
                Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.locationControls} onPress={centerOnCurrentLocation}>
          <MaterialIcons 
            name="my-location" 
            size={24} 
            color="#4285f4"
          />
          <Text style={styles.controlText}>Center Map</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.locationControls}>
          <MaterialIcons 
            name="drag-indicator" 
            size={24} 
            color="#4285f4"
          />
          <Text style={styles.controlText}>Drag marker</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <View style={styles.confirmButton} onTouchEnd={handleConfirmLocation}>
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text style={styles.confirmButtonText}>
            {updating ? 'Updating...' : 'Confirm Location'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4285f4',
  },
  map: {
    flex: 1,
  },
  coordinatesDisplay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 6,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  currentUserMarker: {
    backgroundColor: '#4285f4',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  otherUserMarker: {
    backgroundColor: '#ff6b6b',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  otherUserMarkerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e8f4fd',
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4285f4',
    marginTop: 16,
    marginBottom: 8,
  },
  webFallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  manualInput: {
    width: '100%',
    maxWidth: 400,
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  coordinateInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
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
