# Push Notifications Setup for APK Builds

## ✅ Backend Status
Your backend implementation is **fully compatible with APK builds**. The `expo-server-sdk` works with both development and production APK builds.

## ⚠️ Frontend Setup Required

To enable push notifications in your APK, you need to:

### 1. Install Required Package

```bash
npx expo install expo-notifications
```

### 2. Update `app.json` Configuration

Add notification permissions and configuration:

```json
{
  "expo": {
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.internshipgo.app",
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "expo-web-browser",
      "expo-asset",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#F56E0F",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#F56E0F",
      "iosDisplayInForeground": true,
      "androidMode": "default",
      "androidCollapsedTitle": "#{unread_notifications} new notifications"
    }
  }
}
```

### 3. Create Push Token Registration Hook

Create a utility file to register push tokens:

**File: `lib/pushNotifications.ts`**

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import apiService from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: number, userType: string) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F56E0F',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;
      
      console.log('📱 Push token obtained:', token);
      
      // Register token with backend
      await apiService.registerPushToken(userId, token, userType);
      
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
    return null;
  }
}

export function addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseReceivedListener(
  listener: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}
```

### 4. Update API Service

Add push token registration method to your API service:

**File: `lib/api.ts`** (add this method)

```typescript
async registerPushToken(userId: number, pushToken: string, userType: string) {
  try {
    const response = await fetch(`${this.baseURL}/users/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        userId,
        pushToken,
        userType,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to register push token');
    }
    return data;
  } catch (error) {
    console.error('Error registering push token:', error);
    throw error;
  }
}
```

### 5. Initialize Push Notifications in App

Update your main App component or login screen to register push tokens:

**Example in `App.tsx` or login component:**

```typescript
import { useEffect, useRef } from 'react';
import { registerForPushNotificationsAsync, addNotificationReceivedListener, addNotificationResponseReceivedListener } from './lib/pushNotifications';

// In your component after user login:
useEffect(() => {
  if (currentUser) {
    // Register for push notifications
    registerForPushNotificationsAsync(currentUser.id, currentUser.user_type)
      .then(token => {
        if (token) {
          console.log('✅ Push notifications registered');
        }
      })
      .catch(error => {
        console.error('Failed to register push notifications:', error);
      });

    // Listen for notifications received while app is foregrounded
    const receivedListener = addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle notification (show toast, update UI, etc.)
    });

    // Listen for user tapping on notification
    const responseListener = addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // Navigate to relevant screen based on notification data
      const data = response.notification.request.content.data;
      if (data?.type === 'message' && data?.conversationId) {
        // Navigate to conversation
      }
    });

    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  }
}, [currentUser]);
```

## 📱 APK Build Requirements

### For Production APK:

1. **EAS Build Configuration** (already in `eas.json`):
   ```json
   {
     "build": {
       "production": {
         "android": {
           "gradleCommand": ":app:assembleRelease"
         }
       }
     }
   }
   ```

2. **Build Command**:
   ```bash
   eas build --platform android --profile production
   ```

3. **Google Services** (if using FCM - optional):
   - For Firebase Cloud Messaging, you'd need `google-services.json`
   - Expo Push Notifications work without FCM

## ✅ Testing Checklist

- [ ] Install `expo-notifications` package
- [ ] Update `app.json` with notification config
- [ ] Create push notification utility file
- [ ] Add API method for token registration
- [ ] Initialize push notifications on app start/login
- [ ] Test on physical Android device (not emulator)
- [ ] Build APK and test push notifications
- [ ] Verify notifications work when app is:
  - [ ] In foreground
  - [ ] In background
  - [ ] Completely closed

## 🔧 Important Notes

1. **Physical Device Required**: Push notifications don't work on Android emulators
2. **Project ID**: Make sure `eas.projectId` is set in `app.json` (you have it: `8c60ba13-9969-490a-9b2d-fde3eda3ca86`)
3. **Permissions**: Android will prompt for notification permissions on first use
4. **Token Format**: Expo push tokens start with `ExponentPushToken[...]` or `ExpoPushToken[...]`
5. **Backend Compatibility**: Your backend already handles Expo push tokens correctly

## 🚀 Quick Start

1. Run: `npx expo install expo-notifications`
2. Update `app.json` with notification config
3. Create `lib/pushNotifications.ts` with the code above
4. Add registration call after user login
5. Test on physical device
6. Build APK and test

Your backend is ready - just need to complete the frontend setup!

