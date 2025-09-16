import React from 'react';
import { Platform } from 'react-native';
import LocationPickerMap from './LocationPickerMap';
import LocationPickerWeb from './LocationPickerDraggable';

interface LocationPickerProps {
  onLocationSelect?: (latitude: number, longitude: number) => void;
  onClose?: () => void;
  currentUserId?: string;
}

export default function LocationPicker({ onLocationSelect, onClose, currentUserId }: LocationPickerProps) {
  // Use web version for web platform, mobile version for native platforms
  if (Platform.OS === 'web') {
    return <LocationPickerWeb onLocationSelect={onLocationSelect} onClose={onClose} currentUserId={currentUserId} />;
  }
  
  // For mobile platforms, use the native map version
  return <LocationPickerMap onLocationSelect={onLocationSelect} onClose={onClose} currentUserId={currentUserId} />;
}
