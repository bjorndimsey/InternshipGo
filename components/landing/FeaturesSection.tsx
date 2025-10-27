import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions,
  ScrollView,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const features = [
  {
    icon: 'search',
    title: 'Smart Company Search',
    description: 'Find companies based on location, industry, size, and internship opportunities with advanced filters.',
    color: '#F56E0F',
  },
  {
    icon: 'notifications',
    title: 'Real-time Notifications',
    description: 'Get instant alerts when companies post new internship openings that match your preferences.',
    color: '#4285f4',
  },
  {
    icon: 'document-text',
    title: 'Application Tracking',
    description: 'Keep track of all your applications in one place with status updates and deadline reminders.',
    color: '#34a853',
  },
  {
    icon: 'bar-chart',
    title: 'Analytics Dashboard',
    description: 'View your application statistics, success rates, and insights to improve your internship search.',
    color: '#ea4335',
  },
  {
    icon: 'chatbubbles',
    title: 'Direct Messaging',
    description: 'Connect directly with coordinators and company representatives for quick communication.',
    color: '#fbbc04',
  },
  {
    icon: 'shield-checkmark',
    title: 'Verified Companies',
    description: 'All companies are verified and vetted to ensure legitimate internship opportunities.',
    color: '#9334e6',
  },
];

export default function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnims = features.map(() => useRef(new Animated.Value(1)).current);
  const iconRotateAnims = features.map(() => useRef(new Animated.Value(0)).current);
  const borderAnims = features.map(() => useRef(new Animated.Value(0)).current);
  
  // Meteor shower animations
  const [meteors, setMeteors] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      startX: Math.random() * 100,
      startY: -10 - Math.random() * 20,
      delay: Math.random() * 8000,
      duration: 2000 + Math.random() * 3000,
      rotation: Math.random() * 360,
      length: 40 + Math.random() * 60,
    }))
  );

  useEffect(() => {
    // Simulate intersection observer with timeout
    const timer = setTimeout(() => {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Stagger the initial animations for a cascading effect
  useEffect(() => {
    if (isVisible) {
      features.forEach((_, index) => {
        setTimeout(() => {
          Animated.spring(scaleAnims[index], {
            toValue: 1,
            useNativeDriver: true,
            friction: 2,
          }).start();
        }, index * 50);
      });
    }
  }, [isVisible]);

  // Animation handlers
  const handleCardPressIn = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handleCardPressOut = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handleCardHover = (index: number, isHovering: boolean) => {
    if (Platform.OS === 'web') {
      Animated.parallel([
        Animated.spring(scaleAnims[index], {
          toValue: isHovering ? 1.05 : 1,
          useNativeDriver: true,
          friction: 4,
        }),
        Animated.spring(borderAnims[index], {
          toValue: isHovering ? 1 : 0,
          useNativeDriver: false,
          friction: 4,
        }),
        Animated.timing(iconRotateAnims[index], {
          toValue: isHovering ? 1 : 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundPattern} />
      
      {/* Meteor Shower Background */}
      {Platform.OS === 'web' && (
        <div style={styles.meteorContainer}>
          {meteors.map((meteor) => (
            <div
              key={meteor.id}
              className="meteor"
              style={{
                position: 'absolute',
                left: `${meteor.startX}%`,
                top: `${meteor.startY}%`,
                transform: `rotate(${meteor.rotation}deg)`,
                animationDelay: `${meteor.delay}ms`,
                animationDuration: `${meteor.duration}ms`,
              }}
            >
              <div style={{
                width: meteor.length,
                height: 2,
                background: 'linear-gradient(90deg, rgba(245, 110, 15, 1) 0%, rgba(245, 110, 15, 0.8) 50%, transparent 100%)',
                boxShadow: '0 0 8px 2px rgba(245, 110, 15, 0.6)',
              }} />
            </div>
          ))}
        </div>
      )}
      
      {/* Add CSS for web-specific hover effects */}
      {Platform.OS === 'web' && (
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 0.03; }
              50% { opacity: 0.08; }
            }
            @keyframes meteorShower {
              0% {
                transform: translateY(-100vh) translateX(-100px) rotate(45deg);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) translateX(300px) rotate(45deg);
                opacity: 0;
              }
            }
            .feature-card {
              transition: box-shadow 0.3s ease, transform 0.3s ease;
            }
            .feature-card:hover {
              box-shadow: 0 8px 24px rgba(245, 110, 15, 0.2) !important;
            }
            .meteor {
              animation: meteorShower linear infinite;
              will-change: transform, opacity;
            }
            
             /* Additional responsive styles for web */
             @media (max-width: 480px) {
               .feature-card-responsive {
                 width: 100% !important;
                 max-width: 100% !important;
               }
             }
             /* Ensure text doesn't overflow on mobile */
             @media (max-width: 768px) {
               .features-grid {
                 width: 100%;
                 padding: 0 16px;
               }
             }
          `}
        </style>
      )}
      
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
            Everything you need to <Text style={styles.highlight}>succeed</Text>
          </Text>
          <Text style={styles.subtitle}>
            Powerful features designed to make your internship search efficient and successful
          </Text>
        </Animated.View>

        <View style={styles.featuresGrid}>
          {features.map((feature, index) => {
            const rotateInterpolate = iconRotateAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            });

            const borderColor = borderAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(245, 110, 15, 0)', feature.color || '#F56E0F'],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { 
                        translateY: Animated.add(
                          slideAnim,
                          new Animated.Value(index * 10)
                        )
                      },
                      {
                        scale: scaleAnims[index]
                      }
                    ],
                    borderColor: borderColor,
                  },
                ]}
                {...(Platform.OS === 'web' && {
                  onMouseEnter: () => handleCardHover(index, true),
                  onMouseLeave: () => handleCardHover(index, false),
                })}
              >
                <Animated.View 
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: `${feature.color}15`,
                      transform: [{ rotate: rotateInterpolate }]
                    }
                  ]}
                >
                  <Ionicons 
                    name={feature.icon as any} 
                    size={24} 
                    color={feature.color} 
                  />
                </Animated.View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
                
                {/* Decorative gradient overlay on hover */}
                <Animated.View 
                  style={[
                    styles.hoverOverlay,
                    {
                      opacity: borderAnims[index],
                      backgroundColor: `${feature.color}08`,
                    }
                  ]} 
                />
                
                {/* Glow effect on the icon */}
                <Animated.View 
                  style={[
                    styles.iconGlow,
                    {
                      backgroundColor: feature.color,
                      opacity: borderAnims[index],
                      transform: [{ scale: borderAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2]
                      })}]
                    }
                  ]} 
                />
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#151419',
    paddingVertical: width > 768 ? 80 : width > 480 ? 60 : 40,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    backgroundColor: '#F56E0F',
    // Note: In React Native, we can't easily create grid patterns like CSS
    // This is a simplified version
  },
  content: {
    paddingHorizontal: width > 768 ? 24 : width > 480 ? 20 : 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: width > 768 ? 64 : width > 480 ? 48 : 32,
  },
  title: {
    fontSize: width > 1024 ? 40 : width > 768 ? 36 : width > 480 ? 28 : 24,
    fontWeight: 'bold',
    color: '#FBFBFB',
    textAlign: 'center',
    marginBottom: width > 768 ? 16 : 12,
    lineHeight: width > 1024 ? 50 : width > 768 ? 45 : width > 480 ? 36 : 32,
    paddingHorizontal: width > 480 ? 0 : 8,
  },
  highlight: {
    color: '#F56E0F',
  },
  subtitle: {
    fontSize: width > 768 ? 18 : width > 480 ? 16 : 14,
    color: '#878787',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: width > 768 ? 26 : 22,
    paddingHorizontal: width > 480 ? 0 : 12,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: width > 768 ? 'space-between' : 'center',
    alignItems: 'flex-start',
  },
  featureCard: {
    backgroundColor: '#1B1B1E',
    padding: width > 768 ? 24 : width > 480 ? 20 : 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1B1B1E',
    width: width > 1024 
      ? Math.floor((width - 96) / 3)  // Account for content padding (24*2) + grid spacing (24*2)
      : width > 768 
      ? Math.floor((width - 80) / 2)  // Account for content padding (24*2) + grid spacing (16*2)
      : width > 480 
      ? Math.floor((width - 68) / 2)  // Account for content padding (20*2) + grid spacing (14*2)
      : '100%',                       // Full width on mobile
    minHeight: width > 768 ? 200 : width > 480 ? 180 : 'auto',
    marginBottom: width > 1024 ? 24 : width > 768 ? 20 : width > 480 ? 16 : 12,
    marginHorizontal: width > 480 ? (width > 768 ? 8 : 6) : 0,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 1,
  },
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    pointerEvents: 'none',
  },
  iconGlow: {
    position: 'absolute',
    top: width > 768 ? 64 : width > 480 ? 56 : 48,
    left: width > 768 ? 24 : width > 480 ? 20 : 16,
    width: width > 768 ? 48 : 40,
    height: width > 768 ? 48 : 40,
    borderRadius: 12,
    opacity: 0.2,
    pointerEvents: 'none',
    filter: 'blur(12px)',
  },
  iconContainer: {
    width: width > 768 ? 48 : width > 480 ? 44 : 40,
    height: width > 768 ? 48 : width > 480 ? 44 : 40,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: width > 768 ? 16 : width > 480 ? 14 : 12,
    zIndex: 1,
  },
  featureTitle: {
    fontSize: width > 768 ? 20 : width > 480 ? 18 : 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: width > 768 ? 8 : 6,
    lineHeight: width > 768 ? 24 : width > 480 ? 22 : 20,
    flexWrap: 'wrap',
    overflow: 'visible',
  },
  featureDescription: {
    fontSize: width > 768 ? 14 : width > 480 ? 13 : 12,
    color: '#878787',
    lineHeight: width > 768 ? 20 : 18,
    flexWrap: 'wrap',
    overflow: 'visible',
  },
  meteorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
    width: '100%',
    height: '100%',
  },
});
