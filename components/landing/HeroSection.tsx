import React, { useEffect, useRef, useState } from 'react';
// Enhanced Hero Section with animations and character image
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ImageBackground,
  Animated,
  PanResponder,
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getPlatformStats } from '../../lib/api';
import InfiniteCarousel from './InfiniteCarousel';

const { width, height } = Dimensions.get('window');

interface HeroSectionProps {
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
}

export default function HeroSection({ onNavigateToRegister, onNavigateToLogin }: HeroSectionProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(width < 768);
  const [stats, setStats] = useState({ 
    studentCount: 0, 
    companyCount: 0, 
    studentProfilePictures: [], 
    companyProfilePictures: [] 
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsMobile(width < 768);
  }, [width]);

  useEffect(() => {
    // Fetch platform statistics
    const fetchStats = async () => {
      try {
        console.log('📊 Fetching platform stats...');
        const response = await getPlatformStats();
        console.log('📊 Platform stats response:', response);
        if (response.success && response.data) {
          setStats(response.data);
          console.log('📊 Stats set:', response.data);
        }
      } catch (error) {
        console.error('Error fetching platform stats:', error);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    // Enhanced animations on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  // This useEffect is now empty - carousel logic moved to InfiniteCarousel component

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => !isMobile,
    onPanResponderMove: (evt) => {
      if (!isMobile) {
        setMousePosition({
          x: (evt.nativeEvent.pageX / width - 0.5) * 30,
          y: (evt.nativeEvent.pageY / height - 0.5) * 30,
        });
      }
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(21, 20, 25, 0.2)', 'rgba(21, 20, 25, 0.9)', 'rgba(21, 20, 25, 0.2)']}
          style={styles.gradientOverlay}
        />
        <LinearGradient
          colors={['rgba(21, 20, 25, 0.7)', 'transparent', 'rgba(21, 20, 25, 0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sideGradient}
        />

        {/* Enhanced animated background elements */}
        {!isMobile && (
          <>
            <Animated.View
              style={[
                styles.floatingElement1,
                {
                  transform: [
                    { translateX: mousePosition.x },
                    { translateY: mousePosition.y },
                    { rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }) },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.floatingElement2,
                {
                  transform: [
                    { translateX: -mousePosition.x * 0.7 },
                    { translateY: -mousePosition.y * 0.7 },
                    { scale: pulseAnim },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.floatingElement3,
                {
                  transform: [
                    { translateX: mousePosition.x * 0.9 },
                    { translateY: mousePosition.y * 0.9 },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.floatingElement4,
                {
                  transform: [
                    { translateX: -mousePosition.x * 0.3 },
                    { translateY: mousePosition.y * 0.3 },
                    { scale: pulseAnim },
                  ],
                },
              ]}
            />
          </>
        )}

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Enhanced Status Badge */}
            <Animated.View style={[styles.statusBadge, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.pulseDot}>
                <View style={styles.pulseInner} />
                <View style={styles.pulseOuter} />
              </View>
              <Ionicons name="sparkles" size={16} color="#F56E0F" />
              <Text style={styles.statusText}>Now accepting applications for Summer 2025</Text>
            </Animated.View>

            {/* Enhanced Main Heading */}
            <Text style={styles.mainHeading}>
              Find your perfect{' '}
              <Text style={styles.highlightText}>internship opportunity</Text>
            </Text>

            {/* Enhanced Subtitle */}
            <Text style={styles.subtitle}>
              Connect with top companies, track your applications, and discover internship 
              opportunities near you. Your dream career starts here.
            </Text>

            {/* Enhanced Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={onNavigateToRegister}
              >
                <Text style={styles.primaryButtonText}>Get Started Free</Text>
                <Ionicons name="arrow-forward" size={20} color="#FBFBFB" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={onNavigateToLogin}
              >
                <Ionicons name="search" size={20} color="#FBFBFB" />
                <Text style={styles.secondaryButtonText}>Browse Companies</Text>
              </TouchableOpacity>
            </View>

            {/* Enhanced Stats with Carousels */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={styles.avatarGroup}>
                  {stats.studentProfilePictures.length > 0 ? (
                    stats.studentProfilePictures.slice(0, 5).map((profilePicture, i) => (
                      <Animated.View 
                        key={i} 
                        style={[
                          styles.avatar, 
                          { 
                            marginLeft: i > 0 ? -8 : 0,
                            transform: [{ scale: pulseAnim }],
                          }
                        ]} 
                      >
                        <Image
                          source={{ uri: profilePicture }}
                          style={styles.avatarImageStyle}
                          resizeMode="cover"
                        />
                      </Animated.View>
                    ))
                  ) : (
                    [1, 2, 3, 4].map((i) => (
                      <Animated.View 
                        key={i} 
                        style={[
                          styles.avatar, 
                          { 
                            marginLeft: i > 0 ? -8 : 0,
                            transform: [{ scale: pulseAnim }],
                          }
                        ]} 
                      />
                    ))
                  )}
                </View>
                <Text style={styles.statText}>
                  <Text style={styles.statNumber}>{stats.studentCount.toLocaleString()}</Text> students
                </Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <View style={styles.companyAvatarGroup}>
                  {stats.companyProfilePictures.length > 0 ? (
                    stats.companyProfilePictures.slice(0, 3).map((profilePicture, i) => (
                      <Animated.View 
                        key={i} 
                        style={[
                          styles.companyAvatar, 
                          { 
                            marginLeft: i > 0 ? -6 : 0,
                            transform: [{ scale: pulseAnim }],
                          }
                        ]} 
                      >
                        <Image
                          source={{ uri: profilePicture }}
                          style={styles.companyAvatarImageStyle}
                          resizeMode="cover"
                        />
                      </Animated.View>
                    ))
                  ) : (
                    <Ionicons name="business" size={20} color="#F56E0F" />
                  )}
                </View>
                <Text style={styles.statText}>
                  <Text style={styles.statNumber}>{stats.companyCount.toLocaleString()}</Text> companies
                </Text>
              </View>
            </View>

            {/* Combined Student and Company Profile Pictures Carousel */}
            <View style={styles.carouselsContainer}>
              <InfiniteCarousel
                data={[...stats.studentProfilePictures, ...stats.companyProfilePictures]}
                title=""
                avatarSize={40}
                speed={3000}
                pauseOnHover={true}
              />
            </View>

          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: height * 0.9,
    position: 'relative',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sideGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElement1: {
    position: 'absolute',
    top: 80,
    left: 40,
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.4)',
    borderRadius: 8,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  floatingElement2: {
    position: 'absolute',
    bottom: 128,
    right: 80,
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 32,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  floatingElement3: {
    position: 'absolute',
    top: '50%',
    right: 40,
    width: 48,
    height: 48,
    backgroundColor: 'rgba(245, 110, 15, 0.15)',
    borderRadius: 8,
  },
  floatingElement4: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: 32,
    height: 32,
    backgroundColor: 'rgba(245, 110, 15, 0.2)',
    borderRadius: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 80,
  },
  textContainer: {
    maxWidth: width < 768 ? 350 : width < 1024 ? 600 : 800,
    alignItems: 'center',
    paddingHorizontal: width < 768 ? 16 : 20,
    alignSelf: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 251, 251, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.4)',
    marginBottom: 32,
    alignSelf: 'center',
  },
  pulseDot: {
    position: 'relative',
    width: 8,
    height: 8,
  },
  pulseInner: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#F56E0F',
    borderRadius: 4,
  },
  pulseOuter: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#F56E0F',
    borderRadius: 4,
    opacity: 0.75,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F56E0F',
  },
  mainHeading: {
    fontSize: width < 480 ? Math.min(width * 0.055, 32) : width < 768 ? Math.min(width * 0.06, 40) : Math.min(width * 0.08, 80),
    fontWeight: 'bold',
    color: '#FBFBFB',
    textAlign: 'center',
    marginBottom: width < 480 ? 12 : width < 768 ? 16 : 24,
    lineHeight: width < 480 ? Math.min(width * 0.07, 40) : width < 768 ? Math.min(width * 0.08, 50) : Math.min(width * 0.1, 100),
    paddingHorizontal: width < 480 ? 8 : 0,
  },
  highlightText: {
    color: '#F56E0F',
  },
  subtitle: {
    fontSize: width < 480 ? Math.min(width * 0.03, 14) : width < 768 ? Math.min(width * 0.035, 16) : Math.min(width * 0.04, 20),
    color: '#878787',
    textAlign: 'center',
    marginBottom: width < 480 ? 24 : width < 768 ? 32 : 48,
    lineHeight: width < 480 ? 20 : width < 768 ? 22 : 28,
    maxWidth: width < 480 ? 300 : width < 768 ? 350 : 600,
    paddingHorizontal: width < 480 ? 12 : width < 768 ? 20 : 0,
  },
  buttonContainer: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: width < 480 ? 12 : 16,
    marginBottom: width < 480 ? 32 : 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: width < 480 ? 280 : width < 768 ? 320 : 'auto',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F56E0F',
    paddingHorizontal: width < 480 ? 20 : width < 768 ? 24 : 32,
    paddingVertical: width < 480 ? 12 : width < 768 ? 14 : 16,
    borderRadius: 8,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    minWidth: width < 480 ? 180 : width < 768 ? 200 : 'auto',
    width: width < 768 ? '100%' : 'auto',
  },
  primaryButtonText: {
    fontSize: width < 480 ? 13 : width < 768 ? 14 : 16,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 251, 251, 0.1)',
    paddingHorizontal: width < 480 ? 20 : width < 768 ? 24 : 32,
    paddingVertical: width < 480 ? 12 : width < 768 ? 14 : 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    minWidth: width < 480 ? 180 : width < 768 ? 200 : 'auto',
    width: width < 768 ? '100%' : 'auto',
  },
  secondaryButtonText: {
    fontSize: width < 480 ? 13 : width < 768 ? 14 : 16,
    fontWeight: '500',
    color: '#FBFBFB',
  },
  statsContainer: {
    flexDirection: width > 480 ? 'row' : 'column',
    alignItems: 'center',
    gap: 16,
    alignSelf: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarGroup: {
    flexDirection: 'row',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F56E0F',
    borderWidth: 2,
    borderColor: '#151419',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarImageStyle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  companyAvatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F56E0F',
    borderWidth: 2,
    borderColor: '#151419',
  },
  companyAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  companyAvatarImageStyle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  statText: {
    fontSize: 14,
    color: '#878787',
  },
  statNumber: {
    fontWeight: '600',
    color: '#FBFBFB',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#1B1B1E',
    display: width > 480 ? 'flex' : 'none',
  },
  carouselsContainer: {
    marginTop: 0,
    gap: 8,
    alignItems: 'center',
    width: '100%', // Full width
    marginHorizontal: -50, // Larger negative margin to extend beyond all padding
    position: 'relative',
    left: 0,
    right: 0,
  },
});