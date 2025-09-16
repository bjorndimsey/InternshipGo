import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, ScrollView, Image, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../lib/api';

interface StudentLocationMapProps {
  visible: boolean;
  onClose: () => void;
  selectedApplication?: {
    id: string;
    student_id?: string;
    first_name?: string;
    last_name?: string;
    student_latitude?: number;
    student_longitude?: number;
    student_profile_picture?: string;
  };
  currentUserLocation?: {
    latitude: number;
    longitude: number;
    profilePicture?: string;
  };
  onViewPictures?: (studentId: string) => void;
}

export default function StudentLocationMap({ 
  visible, 
  onClose, 
  selectedApplication, 
  currentUserLocation,
  onViewPictures
}: StudentLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pictures, setPictures] = useState<any[]>([]);
  const [picturesLoading, setPicturesLoading] = useState(false);
  const [showPictures, setShowPictures] = useState(false);
  const [selectedPicture, setSelectedPicture] = useState<any>(null);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      loadLeaflet();
    }
    
    // Set up global function for button click
    (window as any).viewPictures = (studentId: string) => {
      console.log('📸 View Pictures clicked for student:', studentId);
      if (selectedApplication?.student_id) {
        fetchPictures(selectedApplication.student_id);
      } else {
        Alert.alert('Error', 'Student ID not available.');
      }
    };
    
    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
    };
  }, [visible, selectedApplication]);

  const fetchPictures = async (studentId: string) => {
    try {
      setPicturesLoading(true);
      console.log('📸 Fetching location pictures for student:', studentId);
      
      const response = await apiService.getLocationPictures(studentId);
      console.log('📸 Location pictures response:', response);
      
      if (response.success && (response as any).pictures) {
        setPictures((response as any).pictures);
        setShowPictures(true);
        console.log('✅ Location pictures loaded:', (response as any).pictures.length);
      } else {
        console.log('⚠️ No location pictures found or error:', response.message);
        setPictures([]);
        Alert.alert('No Pictures', 'No location pictures found for this student.');
      }
    } catch (error) {
      console.error('❌ Error fetching pictures:', error);
      setPictures([]);
      Alert.alert('Error', 'Failed to load location pictures.');
    } finally {
      setPicturesLoading(false);
    }
  };

  const handleImagePress = (picture: any) => {
    setSelectedPicture(picture);
    setShowFullImage(true);
  };

  const closeFullImage = () => {
    setShowFullImage(false);
    setSelectedPicture(null);
  };

  const loadLeaflet = async () => {
    try {
      console.log('🗺️ Loading Leaflet for student location map...');
      
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!(window as any).L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          console.log('🗺️ Leaflet loaded, initializing student location map...');
          initializeMap();
        };
        document.head.appendChild(script);
      } else {
        initializeMap();
      }
    } catch (error) {
      console.error('❌ Error loading Leaflet:', error);
    }
  };

  const initializeMap = () => {
    if (!(window as any).L || !mapRef.current) {
      console.log('❌ Leaflet not loaded or map container not ready');
      return;
    }

    try {
      console.log('🗺️ Creating student location map...');
      
      // Clear any existing map
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      const L = (window as any).L;
      
      // Default center (Davao City)
      const defaultCenter: [number, number] = [7.1907, 125.4553];
      
      // Determine center based on available data
      let center: [number, number] = defaultCenter;
      if (selectedApplication?.student_latitude && selectedApplication?.student_longitude) {
        center = [selectedApplication.student_latitude, selectedApplication.student_longitude];
      } else if (currentUserLocation?.latitude && currentUserLocation?.longitude) {
        center = [currentUserLocation.latitude, currentUserLocation.longitude];
      }

      // Create map
      const map = L.map('student-location-map', {
        center: center,
        zoom: 12,
        zoomControl: true
      });

      // Add tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add student marker if location data is available
      if (selectedApplication?.student_latitude && selectedApplication?.student_longitude) {
        console.log('📍 Adding student marker:', {
          lat: selectedApplication.student_latitude,
          lng: selectedApplication.student_longitude,
          name: `${selectedApplication.first_name} ${selectedApplication.last_name}`
        });

        // Create student icon
        const studentIcon = L.divIcon({
          className: 'student-marker',
          html: `
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background-image: url('${selectedApplication.student_profile_picture || 'https://via.placeholder.com/40x40?text=Student'}');
              background-size: cover;
              background-position: center;
              border: 3px solid #4285f4;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        // Add student marker
        const studentMarker = L.marker(
          [selectedApplication.student_latitude, selectedApplication.student_longitude],
          { icon: studentIcon }
        ).addTo(map);

        // Add student popup
        studentMarker.bindPopup(`
          <div style="text-align: center; padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">
              ${selectedApplication.first_name} ${selectedApplication.last_name}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              Student Location
            </div>
            <button 
              onclick="window.viewPictures('${selectedApplication.student_id || selectedApplication.id}')"
              style="
                background: #4285f4;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                font-weight: 500;
              "
              onmouseover="this.style.background='#3367d6'"
              onmouseout="this.style.background='#4285f4'"
            >
              📸 View Pictures
            </button>
          </div>
        `);
      } else {
        console.log('⚠️ No student location data available');
      }

      // Add current user marker if location data is available
      if (currentUserLocation?.latitude && currentUserLocation?.longitude) {
        console.log('📍 Adding current user marker:', {
          lat: currentUserLocation.latitude,
          lng: currentUserLocation.longitude
        });

        // Create user icon
        const userIcon = L.divIcon({
          className: 'user-marker',
          html: `
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background-image: url('${currentUserLocation.profilePicture || 'https://via.placeholder.com/40x40?text=You'}');
              background-size: cover;
              background-position: center;
              border: 3px solid #34a853;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        // Add user marker
        const userMarker = L.marker(
          [currentUserLocation.latitude, currentUserLocation.longitude],
          { icon: userIcon }
        ).addTo(map);

        // Add user popup
        userMarker.bindPopup(`
          <div style="text-align: center; padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">
              Your Location
            </div>
            <div style="font-size: 12px; color: #666;">
              Company Location
            </div>
          </div>
        `);

        // Add connection line if both locations are available
        if (selectedApplication?.student_latitude && selectedApplication?.student_longitude) {
          const studentLat = selectedApplication.student_latitude;
          const studentLng = selectedApplication.student_longitude;
          const userLat = currentUserLocation.latitude;
          const userLng = currentUserLocation.longitude;

          // Calculate distance
          const distance = calculateDistance(userLat, userLng, studentLat, studentLng);
          
          // Add polyline
          const polyline = L.polyline([
            [userLat, userLng],
            [studentLat, studentLng]
          ], {
            color: '#4285f4',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
          }).addTo(map);

          // Add distance label at midpoint
          const midLat = (userLat + studentLat) / 2;
          const midLng = (userLng + studentLng) / 2;
          
          const distanceLabel = L.marker([midLat, midLng], {
            icon: L.divIcon({
              className: 'distance-label',
              html: `
                <div style="
                  background: rgba(66, 133, 244, 0.9);
                  color: white;
                  padding: 8px 12px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: bold;
                  text-align: center;
                  min-width: 60px;
                  line-height: 1.2;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  display: inline-block;
                ">
                  ${distance.toFixed(1)} km
                </div>
              `,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            })
          }).addTo(map);
        }
      }

      setMapLoaded(true);
      console.log('✅ Student location map initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing student location map:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (Platform.OS !== 'web') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Student Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text style={styles.message}>Map view is only available on web browsers.</Text>
            <Text style={styles.subMessage}>
              Student: {selectedApplication?.first_name} {selectedApplication?.last_name}
            </Text>
            {selectedApplication?.student_latitude && selectedApplication?.student_longitude ? (
              <Text style={styles.coordinates}>
                Location: {selectedApplication.student_latitude.toFixed(6)}, {selectedApplication.student_longitude.toFixed(6)}
              </Text>
            ) : (
              <Text style={styles.noLocation}>Student has not set their location yet.</Text>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {selectedApplication ? 
              `${selectedApplication.first_name} ${selectedApplication.last_name}'s Location` : 
              'Student Location'
            }
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.mapContainer}>
          {!selectedApplication ? (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="location-off" size={64} color="#ccc" />
              <Text style={styles.noDataTitle}>No Student Selected</Text>
              <Text style={styles.noDataText}>Please select a student to view their location.</Text>
            </View>
          ) : !selectedApplication.student_latitude || !selectedApplication.student_longitude ? (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="location-off" size={64} color="#ccc" />
              <Text style={styles.noDataTitle}>No Location Set</Text>
              <Text style={styles.noDataText}>
                {selectedApplication.first_name} {selectedApplication.last_name} has not set their location yet.
              </Text>
            </View>
          ) : (
            <>
              <div 
                id="student-location-map" 
                ref={mapRef}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '2px solid #4285f4',
                  position: 'relative',
                  backgroundColor: '#e8f4fd'
                }}
              />
              
              {/* Pictures Section */}
              {showPictures && (
                <View style={styles.picturesSection}>
                  <View style={styles.picturesHeader}>
                    <Text style={styles.picturesTitle}>Location Pictures</Text>
                    <TouchableOpacity 
                      onPress={() => setShowPictures(false)}
                      style={styles.closePicturesButton}
                    >
                      <MaterialIcons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  
                  {picturesLoading ? (
                    <View style={styles.picturesLoading}>
                      <MaterialIcons name="refresh" size={24} color="#4285f4" />
                      <Text style={styles.picturesLoadingText}>Loading pictures...</Text>
                    </View>
                  ) : pictures.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.picturesScrollView}
                    >
                      {pictures.map((picture, index) => (
                        <TouchableOpacity 
                          key={picture.id || index} 
                          style={styles.pictureItem}
                          onPress={() => handleImagePress(picture)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.pictureThumbnailContainer}>
                            <Image 
                              source={{ uri: picture.url }} 
                              style={styles.pictureThumbnail}
                              onError={(error) => {
                                console.error('Picture load error:', error);
                              }}
                            />
                            <View style={[styles.pictureOverlay, { opacity: 0.7 }]}>
                              <MaterialIcons name="zoom-in" size={20} color="#fff" />
                            </View>
                          </View>
                          {picture.description && (
                            <Text style={styles.pictureDescription} numberOfLines={2}>
                              {picture.description}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.noPicturesContainer}>
                      <MaterialIcons name="photo" size={48} color="#ccc" />
                      <Text style={styles.noPicturesText}>No location pictures available</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
        
        {/* Full Image Modal */}
        <Modal
          visible={showFullImage}
          transparent={true}
          animationType="fade"
          onRequestClose={closeFullImage}
        >
          <TouchableOpacity 
            style={styles.fullImageModal}
            activeOpacity={1}
            onPress={closeFullImage}
          >
            <View style={styles.fullImageContainer}>
              <TouchableOpacity 
                style={styles.fullImageCloseButton}
                onPress={closeFullImage}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              
              {selectedPicture && (
                <TouchableOpacity 
                  style={styles.fullImageContent}
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <Image 
                    source={{ uri: selectedPicture.url }} 
                    style={styles.fullImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.error('Full image load error:', error);
                    }}
                  />
                  {selectedPicture.description && (
                    <View style={styles.fullImageDescription}>
                      <Text style={styles.fullImageDescriptionText}>
                        {selectedPicture.description}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  closeButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    margin: 20,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  message: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  subMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  coordinates: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  noLocation: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Pictures Section Styles
  picturesSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  picturesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  picturesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  closePicturesButton: {
    padding: 4,
  },
  picturesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  picturesLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  picturesScrollView: {
    maxHeight: 200,
  },
  pictureItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  pictureThumbnailContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pictureThumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  pictureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pictureDescription: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    maxWidth: 120,
  },
  noPicturesContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noPicturesText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Full Image Modal Styles
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullImageCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullImageContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullImage: {
    width: '100%',
    height: '80%',
    maxWidth: 800,
    maxHeight: 600,
  },
  fullImageDescription: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 8,
  },
  fullImageDescriptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
