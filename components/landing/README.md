# Landing Page Components

This folder contains all the components for the landing page, recreated from the internship-management Next.js project and adapted for React Native.

## Components

### Main Components
- **LandingPage.tsx** - Main landing page component that combines all sections
- **Header.tsx** - Navigation header with logo and menu
- **HeroSection.tsx** - Hero section with animated background and CTA
- **StatsSection.tsx** - Statistics display section
- **MapSection.tsx** - Interactive map showing companies and locations
- **FeaturesSection.tsx** - Features grid with icons and descriptions
- **HowItWorksSection.tsx** - Step-by-step process explanation
- **CompaniesSection.tsx** - Partner companies showcase
- **CTASection.tsx** - Call-to-action section with gradient background
- **Footer.tsx** - Footer with links and contact information

## Usage

```tsx
import LandingPage from '../screens/LandingPage';

// In your navigation or main app
<LandingPage 
  onNavigateToLogin={() => navigation.navigate('Login')}
  onNavigateToRegister={() => navigation.navigate('Register')}
  onNavigateToDashboard={(user, userType) => navigation.navigate('Dashboard')}
/>
```

## Features

### Design System
- **Colors**: Primary orange (#F56E0F), dark backgrounds (#151419, #1B1B1E)
- **Typography**: Responsive text sizing with clamp functions
- **Animations**: Fade-in and slide-up animations using React Native Animated API
- **Responsive**: Mobile-first design with breakpoints

### Animations
- Intersection Observer simulation with timeouts
- Fade and slide animations for sections
- Interactive elements with hover effects (simulated)
- Smooth transitions between states

### Dependencies
- React Native core components
- Expo LinearGradient for gradient backgrounds
- React Native Maps for interactive map
- Ionicons for icons
- React Native Animated for animations

## Customization

### Colors
Update the color constants in each component's StyleSheet to match your brand:

```tsx
const primaryColor = '#F56E0F';
const backgroundColor = '#151419';
const textColor = '#FBFBFB';
```

### Content
Replace the mock data in each component with your actual content:
- Company data in CompaniesSection
- Location data in MapSection
- Feature descriptions in FeaturesSection
- Statistics in StatsSection

### Styling
All components use StyleSheet for styling. Modify the styles object in each component to customize appearance.

## Notes

- The map component requires react-native-maps to be properly configured
- Some animations are simplified compared to the web version due to React Native limitations
- Images use placeholder URLs - replace with your actual image sources
- The design maintains the same visual hierarchy and layout as the original web version
