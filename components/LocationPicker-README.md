# LocationPicker Component

A cross-platform location picker component that works on both web and mobile platforms using Leaflet and OpenStreetMap.

## Features

1. **Cross-Platform Support**: Works on both web (using Leaflet) and mobile (using React Native Maps)
2. **Interactive Map**: Real interactive map centered on the Philippines (Davao City area)
3. **Multiple Ways to Pin Location**:
   - **Tap anywhere on the map** to set your location
   - **Drag the blue marker** to fine-tune your position
   - **Real-time coordinate updates** as you move
4. **Real-time Updates**: Location updates are sent to the backend API automatically
5. **User Locations**: Shows other users' locations with distance calculations
6. **Haversine Distance**: Calculates accurate distances between users
7. **Responsive Design**: Works on desktop and mobile browsers
8. **Visual Feedback**: Clear markers and coordinate display

## Components

### LocationPicker.tsx
Main component that automatically selects the appropriate implementation based on platform.

### LocationPickerWeb.tsx
Web implementation using Leaflet and OpenStreetMap:
- Interactive map with draggable markers
- Real-time location updates
- User location markers with popups
- Distance calculations using Haversine formula

### LocationPickerMap.tsx
Mobile implementation using React Native Maps:
- Fallback implementation for mobile platforms
- Similar functionality to web version
- Optimized for touch interactions

## API Endpoints

### POST /api/auth/update-location
Updates a user's location in the database.

**Request Body:**
```json
{
  "userId": "string",
  "latitude": "number",
  "longitude": "number"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "userId": "string",
    "latitude": "number",
    "longitude": "number"
  }
}
```

### GET /api/auth/locations
Fetches all users' locations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "number",
      "name": "string",
      "latitude": "number",
      "longitude": "number",
      "avatar": "string",
      "userType": "string"
    }
  ]
}
```

## Database Schema

The following columns need to be added to the `users` table:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add constraints
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS check_latitude_range CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
);

ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS check_longitude_range CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
);

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_users_location ON users (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

## Usage

### Basic Usage
```tsx
import LocationPicker from './components/LocationPicker';

function MyComponent() {
  const handleLocationSelect = (latitude: number, longitude: number) => {
    console.log('Selected location:', { latitude, longitude });
  };

  const handleClose = () => {
    console.log('Location picker closed');
  };

  return (
    <LocationPicker
      onLocationSelect={handleLocationSelect}
      onClose={handleClose}
    />
  );
}
```

### Integration with ProfilePage
The LocationPicker is already integrated into the Company ProfilePage. Users can access it by:
1. Going to the Profile page
2. Scrolling to "Account Settings"
3. Tapping "Set Location"

## Dependencies

### Frontend
- `leaflet`: ^1.9.4 (for web map functionality)
- `react-native-maps`: ^1.26.1 (for mobile map functionality)
- `@expo/vector-icons`: ^15.0.2 (for icons)

### Backend
- `@supabase/supabase-js`: ^2.38.4 (for database operations)

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install leaflet
   ```

2. **Run Database Migration**
   Execute the SQL in `backend/database/supabase-location-migration.sql` in your Supabase SQL editor.

3. **Start the Application**
   ```bash
   npm run dev
   ```

## Features in Detail

### Map Centering
- Default center: Davao City, Philippines (7.1907, 125.4553)
- Zoom level: 12
- Uses OpenStreetMap tiles

### Distance Calculation
Uses the Haversine formula to calculate distances between coordinates:
```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
```

### User Markers
- Current user: Blue draggable marker
- Other users: Red circular markers with user initials
- Popups show user name and distance

## Troubleshooting

### Common Issues

1. **Map not loading on web**
   - Ensure Leaflet CSS is loaded
   - Check browser console for errors
   - Verify internet connection for tile loading

2. **Location updates failing**
   - Check backend API endpoints
   - Verify user authentication
   - Check database connection

3. **Distance calculations incorrect**
   - Verify coordinate format (decimal degrees)
   - Check Haversine formula implementation
   - Ensure coordinates are within valid ranges

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## Future Enhancements

1. **Geocoding**: Convert addresses to coordinates
2. **Reverse Geocoding**: Convert coordinates to addresses
3. **Location History**: Track location changes over time
4. **Privacy Controls**: Allow users to hide their location
5. **Real-time Updates**: WebSocket integration for live location updates
6. **Offline Support**: Cache map tiles for offline use
7. **Custom Markers**: Allow custom marker icons
8. **Map Styles**: Multiple map themes and styles
