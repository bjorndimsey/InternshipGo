import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ScrollView,
  Animated,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../lib/api';

const { width } = Dimensions.get('window');

interface Location {
  id: number | string;
  name: string;
  latitude: number;
  longitude: number;
  avatar?: string;
  userType: 'student' | 'company' | 'coordinator';
}

export default function MapSection() {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "companies" | "students" | "coordinators">("all");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Helper function to convert filter to user type
  const getFilterUserType = (filter: string): string => {
    switch (filter) {
      case 'companies': return 'company';
      case 'students': return 'student';
      case 'coordinators': return 'coordinator';
      default: return '';
    }
  };

  const filteredLocations = selectedFilter === "all" 
    ? locations 
    : locations.filter((loc) => loc.userType === getFilterUserType(selectedFilter));

  useEffect(() => {
    fetchLocations();
    
    const timer = setTimeout(() => {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Initialize map when locations are loaded
  useEffect(() => {
    if (Platform.OS === 'web' && locations.length > 0 && !mapRef.current) {
      loadLeaflet();
    }
  }, [locations]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching locations from API...');
      const response = await apiService.getUserLocations();
      
      console.log('📡 API Response:', response);
      
      if (response.success && (response as any).data) {
        const locationData = (response as any).data.map((user: any) => ({
          id: user.id,
          name: user.name,
          latitude: user.latitude,
          longitude: user.longitude,
          avatar: user.avatar,
          userType: user.userType
        }));
        
        console.log('✅ Fetched locations:', locationData.length);
        console.log('📍 Location breakdown:', {
          companies: locationData.filter((l: any) => l.userType === 'company').length,
          students: locationData.filter((l: any) => l.userType === 'student').length,
          coordinators: locationData.filter((l: any) => l.userType === 'coordinator').length
        });
        console.log('📋 Sample locations:', locationData.slice(0, 3));
        
        setLocations(locationData);
      } else {
        console.warn('⚠️ No data in response:', response);
        setLocations([]);
      }
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaflet = async () => {
    if (Platform.OS !== 'web') return;
    
    return new Promise((resolve, reject) => {
      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.onerror = () => console.warn('Failed to load Leaflet CSS');
        document.head.appendChild(link);
      }

      // Load JS
      if (!(window as any).L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          console.log('✅ Leaflet loaded for MapSection');
          initializeMap();
          resolve(true);
        };
        script.onerror = () => {
          console.error('❌ Failed to load Leaflet');
          reject(new Error('Failed to load Leaflet'));
        };
        document.head.appendChild(script);
      } else {
        console.log('✅ Leaflet already loaded');
        initializeMap();
        resolve(true);
      }
    });
  };

  const initializeMap = () => {
    if (Platform.OS !== 'web' || !mapContainerRef.current || !(window as any).L) {
      console.log('❌ Map initialization skipped:', { 
        isWeb: Platform.OS === 'web',
        hasContainer: !!mapContainerRef.current,
        hasLeaflet: !!(window as any).L
      });
      return;
    }

    try {
      // Clear existing map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Clear container
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = '';
      }

      const L = (window as any).L;
      
      // Calculate center based on locations
      let center: [number, number] = [14.5995, 121.0]; // Default Manila
      
      if (filteredLocations.length > 0) {
        const lats = filteredLocations.map(loc => loc.latitude);
        const lngs = filteredLocations.map(loc => loc.longitude);
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        center = [avgLat, avgLng];
      }

      // Create map
      mapRef.current = L.map(mapContainerRef.current, {
        center: center,
        zoom: 11,
        zoomControl: true
      });

      // Add tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Add markers for each location with profile pictures
      filteredLocations.forEach(location => {
        const hasProfilePicture = location.avatar && location.avatar.length > 0;
        const profilePictureUrl = hasProfilePicture ? location.avatar : null;
        
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="position: relative;">
              <div style="
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background-image: ${profilePictureUrl ? `url('${profilePictureUrl}')` : 'none'};
                background-color: ${!profilePictureUrl ? getMarkerColor(location.userType) : '#FBFBFB'};
                background-size: cover;
                background-position: center;
                border: 3px solid #151419;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              ">
                ${!profilePictureUrl ? `<span style="font-size: 20px; color: #151419;">${getMarkerIcon(location.userType)}</span>` : ''}
              </div>
              ${location.avatar ? `
                <div style="
                  position: absolute;
                  bottom: -8px;
                  right: -8px;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background-color: ${getMarkerColor(location.userType)};
                  border: 2px solid #151419;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 10px;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                ">${getMarkerIcon(location.userType)}</div>
              ` : ''}
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        });

        const marker = L.marker([location.latitude, location.longitude], {
          icon: icon
        }).addTo(mapRef.current);

        marker.bindPopup(`
          <div style="min-width: 180px; text-align: center;">
            ${profilePictureUrl ? `
              <div style="margin-bottom: 12px; display: flex; justify-content: center;">
                <img src="${profilePictureUrl}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #151419; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div style="width: 50px; height: 50px; border-radius: 50%; background-color: ${getMarkerColor(location.userType)}; display: none; align-items: center; justify-content: center; font-size: 24px;">
                  ${getMarkerIcon(location.userType)}
                </div>
              </div>
            ` : `
              <div style="margin-bottom: 12px; width: 50px; height: 50px; border-radius: 50%; background-color: ${getMarkerColor(location.userType)}; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                ${getMarkerIcon(location.userType)}
              </div>
            `}
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #151419;">${location.name}</h3>
            <p style="margin: 0; font-size: 12px; color: #666; text-transform: capitalize;">${location.userType}</p>
          </div>
        `);
      });

      // Fit bounds if there are locations
      if (filteredLocations.length > 0) {
        const bounds = filteredLocations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }

      console.log('✅ Map initialized with', filteredLocations.length, 'markers');
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  };

  // Reinitialize map when filter changes
  useEffect(() => {
    if (Platform.OS === 'web' && mapRef.current && locations.length > 0) {
      initializeMap();
    }
  }, [selectedFilter]);

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'company': return '#F56E0F';
      case 'student': return '#878787';
      case 'coordinator': return '#FBFBFB';
      default: return '#F56E0F';
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'company': return '🏢';
      case 'student': return '👤';
      case 'coordinator': return '🎓';
      default: return '📍';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundElements}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>
            Discover opportunities <Text style={styles.highlight}>near you</Text>
          </Text>
          <Text style={styles.subtitle}>
            Interactive map showing companies, students, and coordinators in your area
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.mapContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.mapCard}>
            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              <View style={styles.filterLabel}>
                <Ionicons name="filter" size={16} color="#878787" />
                <Text style={styles.filterText}>Filter by:</Text>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filterButtons}
              >
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedFilter === "all" && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedFilter("all")}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === "all" && styles.filterButtonTextActive
                  ]}>
                    All Locations
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedFilter === "companies" && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedFilter("companies")}
                >
                  <Ionicons name="business" size={16} color={selectedFilter === "companies" ? "#FBFBFB" : "#878787"} />
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === "companies" && styles.filterButtonTextActive
                  ]}>
                    Companies
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedFilter === "students" && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedFilter("students")}
                >
                  <Ionicons name="person" size={16} color={selectedFilter === "students" ? "#FBFBFB" : "#878787"} />
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === "students" && styles.filterButtonTextActive
                  ]}>
                    Students
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedFilter === "coordinators" && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedFilter("coordinators")}
                >
                  <Ionicons name="school" size={16} color={selectedFilter === "coordinators" ? "#FBFBFB" : "#878787"} />
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === "coordinators" && styles.filterButtonTextActive
                  ]}>
                    Coordinators
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Map */}
            <View style={styles.mapWrapper}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading map data...</Text>
                </View>
              ) : Platform.OS === 'web' ? (
                // Web Leaflet Map
                <div
                  ref={mapContainerRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8,
                    border: '2px solid rgba(245, 110, 15, 0.2)',
                    backgroundColor: '#e8f4fd'
                  }}
                />
              ) : (
                // Mobile fallback
                <View style={styles.webMapFallback}>
                  <View style={styles.webMapHeader}>
                    <Ionicons name="map" size={32} color="#F56E0F" />
                    <Text style={styles.webMapTitle}>Interactive Map</Text>
                    <Text style={styles.webMapSubtitle}>
                      {filteredLocations.length} locations on the platform
                    </Text>
                  </View>
                  
                  <ScrollView style={styles.locationList} showsVerticalScrollIndicator={false}>
                    {filteredLocations.map((location) => {
                      const hasProfilePicture = location.avatar && location.avatar.length > 0;
                      
                      return (
                        <TouchableOpacity
                          key={location.id}
                          style={[
                            styles.locationItem,
                            selectedLocation?.id === location.id && styles.locationItemSelected
                          ]}
                          onPress={() => setSelectedLocation(location)}
                        >
                          {hasProfilePicture ? (
                            <View style={styles.locationIconContainer}>
                              <Image
                                source={{ uri: location.avatar }}
                                style={styles.locationProfileImage}
                              />
                              <View style={[
                                styles.locationIconBadge,
                                { backgroundColor: getMarkerColor(location.userType) }
                              ]}>
                                <Text style={{ fontSize: 10 }}>
                                  {getMarkerIcon(location.userType)}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={[
                              styles.locationIcon,
                              { backgroundColor: getMarkerColor(location.userType) }
                            ]}>
                              <Text style={{ fontSize: 18, color: '#151419' }}>
                                {getMarkerIcon(location.userType)}
                              </Text>
                            </View>
                          )}
                          <View style={styles.locationInfo}>
                            <Text style={styles.locationName}>{location.name}</Text>
                            <Text style={styles.locationDetails}>
                              {location.userType.charAt(0).toUpperCase() + location.userType.slice(1)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F56E0F' }]} />
                  <Text style={styles.legendText}>
                    Companies ({locations.filter((l) => l.userType === "company").length})
                  </Text>
                </View>
                
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#878787' }]} />
                  <Text style={styles.legendText}>
                    Students ({locations.filter((l) => l.userType === "student").length})
                  </Text>
                </View>
                
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FBFBFB' }]} />
                  <Text style={styles.legendText}>
                    Coordinators ({locations.filter((l) => l.userType === "coordinator").length})
                  </Text>
                </View>
              </View>

              <View style={styles.locationCount}>
                <Ionicons name="location" size={16} color="#F56E0F" />
                <Text style={styles.locationCountText}>
                  {filteredLocations.length} locations shown
                </Text>
              </View>
            </View>

            {/* Selected Location Details */}
            {selectedLocation && (
              <View style={styles.selectedLocation}>
                <Text style={styles.selectedLocationTitle}>{selectedLocation.name}</Text>
                <Text style={styles.selectedLocationText}>
                  Type: {selectedLocation.userType.charAt(0).toUpperCase() + selectedLocation.userType.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#151419',
    paddingVertical: 80,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle1: {
    position: 'absolute',
    top: '25%',
    left: 0,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 100,
    opacity: 0.6,
  },
  circle2: {
    position: 'absolute',
    bottom: '25%',
    right: 0,
    width: 300,
    height: 300,
    backgroundColor: 'rgba(245, 110, 15, 0.05)',
    borderRadius: 150,
    opacity: 0.8,
  },
  content: {
    paddingHorizontal: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: Math.min(width * 0.06, 40),
    fontWeight: 'bold',
    color: '#FBFBFB',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: Math.min(width * 0.08, 50),
  },
  highlight: {
    color: '#F56E0F',
  },
  subtitle: {
    fontSize: Math.min(width * 0.035, 18),
    color: '#878787',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 26,
  },
  mapContainer: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  mapCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.1)',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  filterContainer: {
    marginBottom: 24,
  },
  filterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#878787',
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: '#F56E0F',
    borderColor: '#F56E0F',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#878787',
  },
  filterButtonTextActive: {
    color: '#FBFBFB',
  },
  mapWrapper: {
    height: 400,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    marginBottom: 24,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#151419',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#878787',
  },
  locationCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#878787',
  },
  selectedLocation: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.2)',
  },
  selectedLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 8,
  },
  selectedLocationDetails: {
    gap: 4,
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#878787',
  },
  // Web fallback styles
  webMapFallback: {
    flex: 1,
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
    padding: 16,
  },
  webMapHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.2)',
  },
  webMapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginTop: 8,
    marginBottom: 4,
  },
  webMapSubtitle: {
    fontSize: 14,
    color: '#878787',
  },
  locationList: {
    maxHeight: 300,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#1B1B1E',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.1)',
  },
  locationItemSelected: {
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderColor: '#F56E0F',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  locationProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#151419',
  },
  locationIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#151419',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 2,
  },
  locationDetails: {
    fontSize: 12,
    color: '#878787',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#878787',
    marginTop: 12,
  },
});

// Declare global window type for Leaflet
declare global {
  interface Window {
    L: any;
  }
}
