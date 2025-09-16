# System Admin Dashboard

A comprehensive, responsive system administration dashboard for the InternshipGo application.

## Features

### 🏠 Dashboard Home
- **Statistics Overview**: Display counts of interns, coordinators, admin coordinators, and companies
- **Quick Actions**: Easy access to common administrative tasks
- **Recent Activity**: Real-time updates on system activities
- **Visual Cards**: Beautiful, interactive statistics cards

### 👥 Interns Management
- **Card-based Display**: Profile pictures, names, ages, and academic years
- **Search & Filter**: Search by name, email, university with academic year filter
- **CRUD Operations**: View, edit, add, and delete intern records
- **Status Management**: Track active, inactive, and graduated interns
- **Detailed Information**: Complete intern profiles with contact details

### 🏢 Company Management
- **Company Profiles**: Complete company information with MOA status
- **MOA Tracking**: Monitor Memorandum of Agreement status and expiry dates
- **Search Functionality**: Find companies by name, industry, or contact person
- **Management Actions**: Add, edit, view, and remove company partners
- **Status Indicators**: Visual status badges for easy identification

### 👨‍🏫 Coordinators Management
- **Coordinator Profiles**: Academic staff management with detailed information
- **Admin Assignment**: Assign/remove admin coordinator privileges
- **Department Organization**: Organize by departments and universities
- **Intern Assignment Tracking**: Monitor assigned intern counts
- **Role Management**: Differentiate between regular and admin coordinators

### 💬 Messages
- **Professional Messaging**: Clean, organized message interface
- **Message Filtering**: Filter by sender type (intern, coordinator, company, admin)
- **Priority System**: High, medium, low priority message indicators
- **Message Actions**: Reply, forward, and archive functionality
- **Search Capability**: Find messages by content, sender, or subject

### 🔔 Notifications
- **Real-time Alerts**: System notifications and updates
- **Priority Levels**: High, medium, low priority notifications
- **Type Classification**: Info, warning, success, and error notifications
- **Bulk Actions**: Mark all as read functionality
- **Statistics**: Unread count and priority breakdown

### 👤 Profile Management
- **Admin Profile**: Complete administrator profile management
- **Permission Display**: Show all system permissions
- **Account Actions**: Change password, security settings, notifications
- **Profile Editing**: Update personal information and preferences
- **Activity Tracking**: Last login and join date information

## Technical Features

### 📱 Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Sidebar Navigation**: Collapsible sidebar with smooth animations
- **Touch-Friendly**: Large touch targets and intuitive gestures
- **Adaptive Layout**: Content adjusts to different screen orientations

### 🎨 Professional UI/UX
- **Modern Design**: Clean, professional interface
- **Consistent Styling**: Unified color scheme and typography
- **Interactive Elements**: Hover effects, animations, and transitions
- **Visual Hierarchy**: Clear information organization

### ⚡ Performance
- **Optimized Rendering**: Efficient component structure
- **Lazy Loading**: Load content as needed
- **Smooth Animations**: 60fps animations using native drivers
- **Memory Management**: Proper cleanup and optimization

## Usage

### Basic Integration

```tsx
import SystemAdminDashboard from './systemadmin/SystemAdminDashboard';

export default function App() {
  const handleLogout = () => {
    // Handle logout logic
    console.log('Admin logged out');
  };

  return (
    <SystemAdminDashboard onLogout={handleLogout} />
  );
}
```

### Navigation Integration

```tsx
// In your main App.tsx or navigation setup
import SystemAdminDashboard from './systemadmin/SystemAdminDashboard';

const AdminScreen = () => {
  return (
    <SystemAdminDashboard 
      onLogout={() => {
        // Navigate back to login
        navigation.navigate('Login');
      }}
    />
  );
};
```

## File Structure

```
systemadmin/
├── SystemAdminDashboard.tsx          # Main dashboard component
├── pages/
│   ├── DashboardHome.tsx             # Home page with statistics
│   ├── InternsManagement.tsx         # Interns management page
│   ├── CompanyManagement.tsx         # Company management page
│   ├── CoordinatorsManagement.tsx    # Coordinators management page
│   ├── MessagesPage.tsx              # Messages page
│   ├── NotificationsPage.tsx         # Notifications page
│   └── ProfilePage.tsx               # Profile management page
└── README.md                         # This documentation
```

## Dependencies

- `react-native-vector-icons`: For icons throughout the interface
- `react-native`: Core React Native components
- `@react-native-async-storage/async-storage`: For data persistence (if needed)

## Customization

### Colors
The dashboard uses a consistent color scheme that can be easily customized:

```tsx
const colors = {
  primary: '#4285f4',      // Blue
  success: '#34a853',      // Green
  warning: '#fbbc04',      // Yellow
  error: '#ea4335',        // Red
  background: '#f5f5f5',   // Light gray
  surface: '#ffffff',      // White
  text: '#1a1a2e',         // Dark blue
  textSecondary: '#666',   // Gray
};
```

### API Integration
Replace mock data with real API calls:

```tsx
// Example: Replace mock data in DashboardHome.tsx
const fetchDashboardStats = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/admin/stats');
    const data = await response.json();
    setStats(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};
```

## Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| Responsive Sidebar | ✅ | Collapsible sidebar with smooth animations |
| Dashboard Statistics | ✅ | Real-time stats with visual cards |
| Interns Management | ✅ | Complete CRUD operations for interns |
| Company Management | ✅ | Company profiles with MOA tracking |
| Coordinators Management | ✅ | Academic staff with admin privileges |
| Messages System | ✅ | Professional messaging interface |
| Notifications | ✅ | Real-time alerts and notifications |
| Profile Management | ✅ | Admin profile and settings |
| Search & Filter | ✅ | Advanced search across all modules |
| Mobile Responsive | ✅ | Optimized for all screen sizes |

## Future Enhancements

- [ ] Real-time data synchronization
- [ ] Advanced reporting and analytics
- [ ] Bulk operations for data management
- [ ] Export functionality for reports
- [ ] Advanced user role management
- [ ] Audit trail and logging
- [ ] Integration with external systems

## Support

For questions or issues with the System Admin Dashboard, please refer to the main project documentation or contact the development team.
