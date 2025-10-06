import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity, Dimensions, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../lib/api';

// Declare Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

interface Company {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  industry: string;
  availableSlots: number;
  totalSlots: number;
  profilePicture?: string;
}

interface CompanyLocationMapProps {
  visible: boolean;
  onClose: () => void;
  companies: Company[];
  currentUserLocation?: { latitude: number; longitude: number; profilePicture?: string };
  selectedCompany?: Company; // Add selected company prop
  selectedCoordinatorUserId?: string; // Add coordinator user ID for fetching pictures
  onViewPictures?: (companyId: string) => void; // Add callback for viewing pictures
}

export default function CompanyLocationMap({ visible, onClose, companies, currentUserLocation, selectedCompany, selectedCoordinatorUserId, onViewPictures }: CompanyLocationMapProps) {
  const [loading, setLoading] = useState(true);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [pictures, setPictures] = useState<any[]>([]);
  const [picturesLoading, setPicturesLoading] = useState(false);
  const [showPictures, setShowPictures] = useState(false);
  const [selectedPicture, setSelectedPicture] = useState<any>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const fetchPictures = async (userId: string) => {
    try {
      setPicturesLoading(true);
      console.log('📸 Fetching location pictures for user:', userId);
      
      const response = await apiService.getLocationPictures(userId);
      console.log('📸 Location pictures response:', response);
      
      if (response.success && (response as any).pictures) {
        setPictures((response as any).pictures);
        setShowPictures(true);
        console.log('✅ Location pictures loaded:', (response as any).pictures.length);
      } else {
        console.log('⚠️ No location pictures found or error:', response.message);
        setPictures([]);
        Alert.alert('No Pictures', 'No location pictures found for this coordinator.');
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

  useEffect(() => {
    if (visible && typeof window !== 'undefined' && !isInitializing) {
      initializeMap();
    } else if (!visible) {
      // Clean up map when modal is closed
      if (mapRef.current) {
        console.log('Cleaning up map when modal closed...');
        mapRef.current.remove();
        mapRef.current = null;
        setMapInitialized(false);
        setIsInitializing(false);
      }
    }

        // Set up global function for button click
        (window as any).viewPictures = (companyId: string) => {
          console.log('📸 View Pictures clicked for company:', companyId);
          if (selectedCoordinatorUserId) {
            fetchPictures(selectedCoordinatorUserId);
          } else {
            Alert.alert('Error', 'Coordinator user ID not available.');
          }
        };

    // Cleanup function
    return () => {
      // Clean up map
      if (mapRef.current) {
        console.log('Cleaning up map on unmount...');
        mapRef.current.remove();
        mapRef.current = null;
      }
      
      // Clean up SVG elements
      if (mapContainerRef.current) {
        const existingSvgs = mapContainerRef.current.querySelectorAll('svg');
        existingSvgs.forEach(svg => svg.remove());
      }
      
      // Clean up global function
      if ((window as any).viewPictures) {
        delete (window as any).viewPictures;
      }
    };
  }, [visible, onViewPictures]);

  const loadLeaflet = async () => {
    return new Promise((resolve, reject) => {
      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.onerror = () => console.warn('Failed to load Leaflet CSS, but continuing...');
        document.head.appendChild(link);
      }

      // Load JS
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          console.log('Leaflet JS loaded successfully');
          resolve(true);
        };
        script.onerror = (error) => {
          console.error('Failed to load Leaflet JS:', error);
          reject(new Error('Failed to load Leaflet - check your internet connection'));
        };
        document.head.appendChild(script);
      } else {
        console.log('Leaflet already loaded');
        resolve(true);
      }
    });
  };

  const initializeMap = async () => {
    if (isInitializing) {
      console.log('Map initialization already in progress, skipping...');
      return;
    }
    
    try {
      setIsInitializing(true);
      setLoading(true);
      console.log('Loading Leaflet for company map...');
      
      await loadLeaflet();
      console.log('Leaflet loaded, initializing company map...');
      
       setTimeout(async () => {
         if (mapContainerRef.current && window.L) {
           console.log('Creating company map...');
           console.log('Selected company:', selectedCompany);
           
          // Clean up existing map if it exists
          if (mapRef.current) {
            console.log('Cleaning up existing map...');
            mapRef.current.remove();
            mapRef.current = null;
          }
          
          // Clear the container and remove any existing SVG elements
          if (mapContainerRef.current) {
            mapContainerRef.current.innerHTML = '';
            // Remove any existing SVG elements
            const existingSvgs = mapContainerRef.current.querySelectorAll('svg');
            existingSvgs.forEach(svg => svg.remove());
          }
           
           // Check if selected company has location data
           if (!selectedCompany) {
             console.log('No company selected');
             if (mapContainerRef.current) {
               mapContainerRef.current.innerHTML = `
                 <div style="
                   display: flex;
                   flex-direction: column;
                   align-items: center;
                   justify-content: center;
                   height: 100%;
                   background-color: #e8f4fd;
                   color: #666;
                   text-align: center;
                   padding: 20px;
                 ">
                   <div style="font-size: 48px; margin-bottom: 16px;">❓</div>
                   <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #4285f4;">
                     No Company Selected
                   </div>
                   <div style="font-size: 14px; line-height: 20px;">
                     Please select a company to view its location.
                   </div>
                 </div>
               `;
             }
             setLoading(false);
             return;
           }
           
           // Check if selected company has location data
           if (!selectedCompany.latitude || !selectedCompany.longitude || selectedCompany.latitude === null || selectedCompany.longitude === null) {
             console.log('Selected company has no location data:', selectedCompany.name);
             if (mapContainerRef.current) {
               mapContainerRef.current.innerHTML = `
                 <div style="
                   display: flex;
                   flex-direction: column;
                   align-items: center;
                   justify-content: center;
                   height: 100%;
                   background-color: #e8f4fd;
                   color: #666;
                   text-align: center;
                   padding: 20px;
                 ">
                   <div style="font-size: 48px; margin-bottom: 16px;">📍</div>
                   <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #ea4335;">
                     ${selectedCompany.name} has no location yet
                   </div>
                   <div style="font-size: 14px; line-height: 20px;">
                     This company hasn't set their location.<br>
                     Ask them to update their profile with location data.
                   </div>
                   <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; max-width: 300px;">
                     <div style="font-weight: bold; color: #856404; margin-bottom: 8px;">Company Details:</div>
                     <div style="font-size: 12px; color: #856404; text-align: left;">
                       <div><strong>Name:</strong> ${selectedCompany.name}</div>
                       <div><strong>Industry:</strong> ${selectedCompany.industry}</div>
                       <div><strong>Address:</strong> ${selectedCompany.address}</div>
                       <div><strong>Available Slots:</strong> ${selectedCompany.availableSlots}/${selectedCompany.totalSlots}</div>
                     </div>
                   </div>
                 </div>
               `;
             }
             setLoading(false);
             return;
           }

          // Create map centered on selected company or user location
          const centerLat = currentUserLocation?.latitude || selectedCompany.latitude!;
          const centerLng = currentUserLocation?.longitude || selectedCompany.longitude!;
          
          mapRef.current = window.L.map(mapContainerRef.current, {
            center: [centerLat, centerLng],
            zoom: 10,
            zoomControl: true
          });

          // Add tiles
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapRef.current);

          // Add user location marker if available
          if (currentUserLocation) {
            // Get user profile picture from currentUserLocation if available
            const userProfilePicture = (currentUserLocation as any).profilePicture;
            
            const userIcon = window.L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div style="position: relative;">
                  <div style="
                    width: 40px; 
                    height: 40px; 
                    border-radius: 50%; 
                    border: 3px solid #4285f4; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    background-image: url('${userProfilePicture || 'https://via.placeholder.com/40x40/4285f4/ffffff?text=U'}');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: white;
                    font-size: 14px;
                  ">
                    ${!userProfilePicture ? 'U' : ''}
                  </div>
                  <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background-color: #4285f4; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">You</div>
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });

            window.L.marker([currentUserLocation.latitude, currentUserLocation.longitude], {
              icon: userIcon
            }).addTo(mapRef.current).bindPopup(`
              <div style="text-align: center;">
                <div style="margin-bottom: 8px;">
                  ${userProfilePicture ? 
                    `<img src="${userProfilePicture}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #4285f4;" />` : 
                    `<div style="width: 50px; height: 50px; border-radius: 50%; background-color: #4285f4; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; margin: 0 auto;">U</div>`
                  }
                </div>
                <strong>Your Location</strong><br>
                <small>Current Position</small>
              </div>
            `);
          }

          // Calculate road distance and route
          let roadDistance = 0;
          let roadDuration = 0;
          let routeCoordinates: any[] = [];
          
          if (currentUserLocation) {
            try {
              const roadData = await calculateRoadDistance(
                currentUserLocation.latitude,
                currentUserLocation.longitude,
                selectedCompany.latitude!,
                selectedCompany.longitude!
              );
              roadDistance = roadData.distance;
              roadDuration = roadData.duration;
              routeCoordinates = roadData.route;
              console.log('🛣️ Road route calculated:', routeCoordinates.length, 'points');
            } catch (error) {
              console.error('❌ Error calculating road distance:', error);
              // Fallback to straight-line distance
              roadDistance = calculateDistance(
                currentUserLocation.latitude,
                currentUserLocation.longitude,
                selectedCompany.latitude!,
                selectedCompany.longitude!
              );
              roadDuration = roadDistance * 1.5; // Rough estimate
              routeCoordinates = [
                [currentUserLocation.latitude, currentUserLocation.longitude],
                [selectedCompany.latitude!, selectedCompany.longitude!]
              ];
            }
          }

          const companyIcon = window.L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div style="position: relative;">
                <div style="
                  width: 40px; 
                  height: 40px; 
                  border-radius: 50%; 
                  border: 3px solid #34a853; 
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  background-image: url('${selectedCompany.profilePicture || 'https://via.placeholder.com/40x40/34a853/ffffff?text=' + selectedCompany.name.charAt(0)}');
                  background-size: cover;
                  background-position: center;
                  background-repeat: no-repeat;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  color: white;
                  font-size: 14px;
                ">
                  ${!selectedCompany.profilePicture ? selectedCompany.name.charAt(0) : ''}
                </div>
                ${roadDistance > 0 ? `<div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background-color: #34a853; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">${roadDistance.toFixed(1)}km</div>` : ''}
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });

          // Create company profile picture HTML
          const profilePictureHtml = selectedCompany.profilePicture 
            ? `<img src="${selectedCompany.profilePicture}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 12px; border: 2px solid #e0e0e0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
               <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #e0e0e0; display: none; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold; color: #666; font-size: 16px;">${selectedCompany.name.charAt(0)}</div>`
            : `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #e0e0e0; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold; color: #666; font-size: 16px;">${selectedCompany.name.charAt(0)}</div>`;

          const companyMarker = window.L.marker([selectedCompany.latitude!, selectedCompany.longitude!], {
            icon: companyIcon
          }).addTo(mapRef.current).bindPopup(`
            <div style="min-width: 250px;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                ${profilePictureHtml}
                <div>
                  <h3 style="margin: 0 0 4px 0; color: #1a1a2e; font-size: 16px;">${selectedCompany.name}</h3>
                  <p style="margin: 0; color: #666; font-size: 12px;">${selectedCompany.industry}</p>
                </div>
              </div>
              <div style="margin-bottom: 8px;">
                <p style="margin: 0 0 4px 0; color: #666; font-size: 12px; display: flex; align-items: center;">
                  <span style="margin-right: 6px;">📍</span> ${selectedCompany.address}
                </p>
                <p style="margin: 0 0 4px 0; color: #4285f4; font-size: 12px; display: flex; align-items: center;">
                  <span style="margin-right: 6px;">👥</span> ${selectedCompany.availableSlots}/${selectedCompany.totalSlots} slots available
                </p>
                ${roadDistance > 0 ? `
                  <p style="margin: 0 0 4px 0; color: #34a853; font-size: 12px; font-weight: bold; display: flex; align-items: center;">
                    <span style="margin-right: 6px;">🛣️</span> ${roadDistance.toFixed(1)} km by road
                  </p>
                  <p style="margin: 0; color: #fbbc04; font-size: 12px; font-weight: bold; display: flex; align-items: center;">
                    <span style="margin-right: 6px;">⏱️</span> ${roadDuration.toFixed(0)} min drive
                  </p>
                ` : ''}
              </div>
              <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button onclick="window.viewPictures('${selectedCompany.id}')" style="
                  background-color: #34a853;
                  color: white;
                  border: none;
                  padding: 8px 12px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  flex: 1;
                  justify-content: center;
                ">
                  📸 View Pictures
                </button>
              </div>
            </div>
          `);

          // Add road route line between user and company if both have locations
          if (currentUserLocation && routeCoordinates.length > 0) {
            // Draw the actual road route
            const roadRoute = window.L.polyline(routeCoordinates, {
              color: '#4285f4',
              weight: 4,
              opacity: 0.9,
              dashArray: '15, 10',
              className: 'road-route-line'
            }).addTo(mapRef.current);

            // Create SVG path for text to follow the road
            const createPathText = () => {
              if (routeCoordinates.length < 2) return;
              
              // Create SVG path from route coordinates
              let pathData = `M ${routeCoordinates[0][1]},${routeCoordinates[0][0]}`;
              for (let i = 1; i < routeCoordinates.length; i++) {
                pathData += ` L ${routeCoordinates[i][1]},${routeCoordinates[i][0]}`;
              }
              
              // Create SVG element
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svg.setAttribute('width', '100%');
              svg.setAttribute('height', '100%');
              svg.setAttribute('style', 'position: absolute; top: 0; left: 0; pointer-events: none; z-index: 1000;');
              
              // Create path element
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', pathData);
              path.setAttribute('fill', 'none');
              path.setAttribute('stroke', 'none');
              path.setAttribute('id', 'route-path');
              
              // Create text element that follows the path
              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('fill', '#4285f4');
              text.setAttribute('font-size', '14');
              text.setAttribute('font-weight', 'bold');
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('stroke', 'white');
              text.setAttribute('stroke-width', '3');
              text.setAttribute('paint-order', 'stroke');
              text.setAttribute('style', 'filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));');
              
              // Create textPath element
              const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
              textPath.setAttribute('href', '#route-path');
              textPath.setAttribute('startOffset', '50%');
              textPath.textContent = `🛣️ ${roadDistance.toFixed(1)} km (${roadDuration.toFixed(0)} min)`;
              
              text.appendChild(textPath);
              svg.appendChild(path);
              svg.appendChild(text);
              
              return svg;
            };

            // Add the path-following text to the map
            const pathTextSvg = createPathText();
            if (pathTextSvg && mapContainerRef.current) {
              mapContainerRef.current.appendChild(pathTextSvg);
            }

            // Also add a small marker at the midpoint for better visibility
            const midPointIndex = Math.floor(routeCoordinates.length / 2);
            const midPoint = routeCoordinates[midPointIndex];
            
            const routeMarker = window.L.marker(midPoint, {
              icon: window.L.divIcon({
                className: 'route-marker',
                html: `
                  <div style="
                    width: 8px;
                    height: 8px;
                    background-color: #4285f4;
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  "></div>
                `,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
              })
            }).addTo(mapRef.current);
          }

          // Fit map to show both user and selected company markers
          // Add a small delay to ensure map is fully rendered before fitting bounds
          setTimeout(() => {
            try {
              const group = new window.L.featureGroup();
              group.addLayer(window.L.marker([selectedCompany.latitude!, selectedCompany.longitude!]));
              if (currentUserLocation) {
                group.addLayer(window.L.marker([currentUserLocation.latitude, currentUserLocation.longitude]));
              }
              mapRef.current.fitBounds(group.getBounds().pad(0.1));
            } catch (error) {
              console.warn('Error fitting bounds:', error);
              // Fallback to just centering on the company
              mapRef.current.setView([selectedCompany.latitude!, selectedCompany.longitude!], 10);
            }
          }, 100);

          setMapInitialized(true);
          setLoading(false);
          setIsInitializing(false);
          console.log('Company map initialized successfully');
        }
      }, 500);
    } catch (error) {
      console.error('Error initializing company map:', error);
      
      // Show error message in map container
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            background-color: #e8f4fd;
            color: #666;
            text-align: center;
            padding: 20px;
          ">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #ea4335;">
              Map Loading Error
            </div>
            <div style="font-size: 14px; line-height: 20px;">
              Failed to load the map. Please check your internet connection<br>
              and try again.
            </div>
          </div>
        `;
      }
      
      setLoading(false);
      setIsInitializing(false);
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

  // Calculate road distance using OpenRouteService API
  const calculateRoadDistance = async (lat1: number, lon1: number, lat2: number, lon2: number): Promise<{ distance: number; duration: number; route: any[] }> => {
    try {
      console.log('🛣️ Calculating road distance from', lat1, lon1, 'to', lat2, lon2);
      
      // Using OpenRouteService API (free tier available)
      const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248a8b8b8b8&start=${lon1},${lat1}&end=${lon2},${lat2}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const distance = feature.properties.summary.distance / 1000; // Convert to kilometers
        const duration = feature.properties.summary.duration / 60; // Convert to minutes
        const coordinates = feature.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
        
        console.log('✅ Road distance calculated:', { distance: distance.toFixed(1), duration: duration.toFixed(1) });
        
        return {
          distance: distance,
          duration: duration,
          route: coordinates
        };
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('❌ Error calculating road distance:', error);
      // Fallback to straight-line distance
      const straightDistance = calculateDistance(lat1, lon1, lat2, lon2);
      return {
        distance: straightDistance,
        duration: straightDistance * 1.5, // Rough estimate: 1.5 minutes per km
        route: [[lat1, lon1], [lat2, lon2]]
      };
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Company Locations</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%',
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
                Loading company locations...
              </div>
            </div>
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4285f4' }]} />
            <Text style={styles.legendText}>Your Location</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34a853' }]} />
            <Text style={styles.legendText}>{selectedCompany?.name || 'Selected Company'}</Text>
          </View>
        </View>

        {/* Location Pictures Section */}
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
                <ActivityIndicator size="small" color="#4285f4" />
                <Text style={styles.picturesLoadingText}>Loading pictures...</Text>
              </View>
            ) : pictures.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.picturesScrollView}
                contentContainerStyle={styles.picturesContainer}
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
                <MaterialIcons name="photo-camera" size={48} color="#ccc" />
                <Text style={styles.noPicturesText}>No location pictures available</Text>
              </View>
            )}
          </View>
        )}

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

        {/* CSS for spinner animation and connection line */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .road-route-line {
            animation: dash 3s linear infinite;
          }
          
          @keyframes dash {
            to {
              stroke-dashoffset: -25;
            }
          }
          
          .route-label {
            z-index: 1000 !important;
          }
          
          .route-marker {
            z-index: 1001 !important;
          }
          
          svg text {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `}</style>
      </View>
    </Modal>
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
    flex: 1,
    margin: 16,
    position: 'relative',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  // Pictures section styles
  picturesSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
  },
  picturesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  picturesTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    paddingHorizontal: 16,
  },
  picturesContainer: {
    paddingVertical: 16,
  },
  pictureItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  pictureThumbnailContainer: {
    position: 'relative',
  },
  pictureThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  pictureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pictureDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    maxWidth: 80,
  },
  noPicturesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noPicturesText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Full image modal styles
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  fullImage: {
    width: '100%',
    height: '80%',
    maxWidth: 500,
    maxHeight: 500,
  },
  fullImageDescription: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  fullImageDescriptionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
