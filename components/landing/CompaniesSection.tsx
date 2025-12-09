import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions,
  ScrollView,
  Animated,
  Image,
  ImageBackground,
  PanResponder,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCompaniesLandingPage } from '../../lib/api';

const { width } = Dimensions.get('window');

interface Company {
  id: number;
  name: string;
  logo: string;
  backgroundPicture?: string;
  industry: string;
  openings: number;
  totalCapacity: number;
  currentInterns: number;
  location: string;
  rating: number;
  contactPerson?: string;
  createdAt: string;
}

export default function CompaniesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false); // Disabled auto-rotation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const gestureAnim = useRef(new Animated.Value(0)).current; // Added for smooth gesture animation
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch companies data
    const fetchCompanies = async () => {
      try {
        console.log('🏢 COMPANIES SECTION - Fetching companies data');
        const response = await getCompaniesLandingPage();
        
        if (response.success && response.data) {
          console.log('✅ Companies data fetched:', response.data);
          setCompanies(response.data);
        } else {
          console.error('❌ Failed to fetch companies:', response.message);
        }
      } catch (error) {
        console.error('❌ Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!loading && companies.length > 0) {
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
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [loading, companies.length]);

  // Auto-rotation effect (disabled)
  useEffect(() => {
    // Auto-rotation is disabled - carousel only moves on user interaction
    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, []);

  // PanResponder for smooth swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5; // Reduced threshold for more responsive gestures
      },
      onPanResponderGrant: () => {
        // Start smooth gesture animation
        gestureAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Smooth gesture feedback - scale cards slightly during drag
        const progress = Math.min(Math.abs(gestureState.dx) / 100, 1);
        gestureAnim.setValue(progress * 0.05); // Subtle scale effect
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 30; // Reduced threshold for more responsive gestures
        const velocity = gestureState.vx;
        
        // Smooth animation to reset gesture
        Animated.spring(gestureAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        
        if (gestureState.dx > threshold || velocity > 0.3) {
          // Swipe right - go to previous with smooth animation
          goToPrevious();
        } else if (gestureState.dx < -threshold || velocity < -0.3) {
          // Swipe left - go to next with smooth animation
          goToNext();
        }
      },
    })
  ).current;

  const goToNext = () => {
    if (companies.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % companies.length;
    
    // Smooth transition animation
    Animated.parallel([
      Animated.timing(gestureAnim, {
        toValue: 0.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      
      // Smooth return animation
      Animated.parallel([
        Animated.spring(gestureAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goToPrevious = () => {
    if (companies.length === 0) return;
    
    const prevIndex = currentIndex === 0 ? companies.length - 1 : currentIndex - 1;
    
    // Smooth transition animation
    Animated.parallel([
      Animated.timing(gestureAnim, {
        toValue: 0.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(prevIndex);
      
      // Smooth return animation
      Animated.parallel([
        Animated.spring(gestureAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  return (
    <View style={styles.container}>
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
            Trusted by <Text style={styles.highlight}>Approved companies</Text>
          </Text>
          <Text style={styles.subtitle}>
            Join thousands of students who have found their dream internships with these amazing companies
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.companiesContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.scrollContainer}>
            {/* Left Navigation Arrow */}
            <TouchableOpacity 
              style={styles.navArrowLeft} 
              onPress={goToPrevious}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#FBFBFB" />
            </TouchableOpacity>

            <View style={styles.horizontalCarousel}>
              {companies.map((company, index) => {
                const isActive = index === currentIndex;
                const distanceFromCenter = Math.abs(index - currentIndex);
                const isVisible = distanceFromCenter <= 3; // Show 7 cards (center + 3 on each side) like Netflix
                
                if (!isVisible) return null;
                
                // Calculate horizontal positioning like Netflix with better spacing
                const cardWidth = width < 768 ? 280 : 320; // Larger cards
                const cardSpacing = width < 768 ? 25 : 35; // More spacing between cards
                const translateX = (index - currentIndex) * (cardWidth + cardSpacing);
                const scale = isActive ? 1.0 : 0.75; // More dramatic size difference
                const opacity = isActive ? 1 : 0.6; // Better opacity contrast
                
                return (
                  <Animated.View
                    key={company.id}
                    style={[
                      styles.companyCardHorizontal,
                      {
                        opacity: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, opacity],
                        }),
                        transform: [
                          { translateY: slideAnim },
                          { translateX: translateX },
                          { 
                            scale: gestureAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [scale, scale + 0.1],
                            })
                          },
                        ],
                        zIndex: isActive ? 10 : 3 - distanceFromCenter, // Reduced z-index for side cards
                      },
                    ]}
                  >
                  {company.backgroundPicture ? (
                    <ImageBackground
                      source={{ uri: company.backgroundPicture }}
                      style={styles.companyBackground}
                      imageStyle={styles.backgroundImageStyle}
                    >
                      <View style={styles.companyContent}>
                        <View style={styles.companyLogo}>
                          <Image
                            source={{ uri: company.logo }}
                            style={styles.logoImage}
                            resizeMode="cover"
                          />
                        </View>
                        
                        <Text style={styles.companyName}>{company.name}</Text>
                        <Text style={styles.companyIndustry}>{company.industry}</Text>
                        
                        <View style={styles.companyStats}>
                          <View style={styles.statItem}>
                            <Ionicons name="briefcase" size={16} color="#F56E0F" />
                            <Text style={styles.statText}>{company.openings} openings</Text>
                          </View>
                          
                          <View style={styles.statItem}>
                            <Ionicons name="star" size={16} color="#F56E0F" />
                            <Text style={styles.statText}>{company.rating}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.locationContainer}>
                          <Ionicons name="location" size={14} color="#878787" />
                          <Text style={styles.locationText}>{company.location}</Text>
                        </View>
                      </View>
                    </ImageBackground>
                  ) : (
                    <View style={styles.companyContent}>
                      <View style={styles.companyLogo}>
                        <Image
                          source={{ uri: company.logo }}
                          style={styles.logoImage}
                          resizeMode="cover"
                        />
                      </View>
                      
                      <Text style={styles.companyName}>{company.name}</Text>
                      <Text style={styles.companyIndustry}>{company.industry}</Text>
                      
                      <View style={styles.companyStats}>
                        <View style={styles.statItem}>
                          <Ionicons name="briefcase" size={16} color="#F56E0F" />
                          <Text style={styles.statText}>{company.openings} openings</Text>
                        </View>
                        
                        <View style={styles.statItem}>
                          <Ionicons name="star" size={16} color="#F56E0F" />
                          <Text style={styles.statText}>{company.rating}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.locationContainer}>
                        <Ionicons name="location" size={14} color="#878787" />
                        <Text style={styles.locationText}>{company.location}</Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
                );
              })}
            </View>

            {/* Right Navigation Arrow */}
            <TouchableOpacity 
              style={styles.navArrowRight} 
              onPress={goToNext}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={24} color="#FBFBFB" />
            </TouchableOpacity>
          </View>
          
          {/* Navigation Indicators */}
          <View style={styles.navigationIndicators}>
            {companies.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  {
                    backgroundColor: index === currentIndex ? '#F56E0F' : 'rgba(245, 110, 15, 0.3)',
                    width: index === currentIndex ? 24 : 8,
                  },
                ]}
              />
            ))}
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
  },
  content: {
    paddingHorizontal: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
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
  companiesContainer: {
    marginBottom: 48,
    height: 500, // Increased height to prevent text cutting off
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scrollContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalCarousel: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  companyCardHorizontal: {
    position: 'absolute',
    backgroundColor: '#3A3A3E', // Even brighter card background
    borderRadius: 12, // Slightly smaller border radius like Netflix
    padding: width < 768 ? 16 : 20, // Adjusted padding
    width: width < 768 ? 280 : 320, // Larger cards
    height: width < 768 ? 350 : 400, // Taller cards
    borderWidth: 1, // Thinner border
    borderColor: '#4A4A4E', // Lighter border color
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, // Increased shadow
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  navArrowLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -20 }],
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  navArrowRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -20 }],
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  companyCard: {
    backgroundColor: '#1B1B1E',
    borderRadius: 16,
    padding: 24,
    width: 320,
    height: 360,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  companyBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  backgroundImageStyle: {
    borderRadius: 12, // Match card border radius
    opacity: 0.7, // More subtle background like Netflix
  },
  companyContent: {
    flex: 1,
    backgroundColor: 'rgba(27, 27, 30, 0.4)', // Slightly more opaque for better text readability
    borderRadius: 12, // Match card border radius
    padding: width < 768 ? 16 : 20,
    margin: -(width < 768 ? 16 : 20),
    justifyContent: 'space-between',
  },
  companyLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#2A2A2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  companyName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FBFBFB',
    marginBottom: 8,
    textAlign: 'center',
  },
  companyIndustry: {
    fontSize: 16,
    color: '#fff', // Changed to black
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  companyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statText: {
    fontSize: 13,
    color: '#F56E0F',
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 15, 15, 0.83)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#fff', // Changed to black
    fontWeight: '500',
  },
  navigationIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 24,
  },
  statCard: {
    alignItems: 'center',
    minWidth: 120,
  },
  statNumber: {
    fontSize: Math.min(width * 0.08, 48),
    fontWeight: 'bold',
    color: '#F56E0F',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#878787',
    textAlign: 'center',
    fontWeight: '500',
  },
});
