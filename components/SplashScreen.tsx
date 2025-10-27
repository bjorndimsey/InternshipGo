import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationFinish?: () => void;
}

export default function SplashScreen({ onAnimationFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim1 = useRef(new Animated.Value(0)).current;
  const bubbleAnim2 = useRef(new Animated.Value(0)).current;
  const bubbleAnim3 = useRef(new Animated.Value(0)).current;
  const bubbleAnim4 = useRef(new Animated.Value(0)).current;
  const bubbleAnim5 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main content animation sequence
    const mainAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    // Bubble animations
    const bubbleAnimations = Animated.stagger(200, [
      Animated.timing(bubbleAnim1, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim2, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim3, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim4, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleAnim5, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 }
    );

    // Shimmer animation
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      { iterations: -1 }
    );

    // Start all animations
    Animated.parallel([
      mainAnimation,
      bubbleAnimations,
      pulseAnimation,
      shimmerAnimation,
    ]).start();

    // Handle completion
    mainAnimation.start(() => {
      onAnimationFinish?.();
    });
  }, [fadeAnim, scaleAnim, slideAnim, rotateAnim, pulseAnim, shimmerAnim, bubbleAnim1, bubbleAnim2, bubbleAnim3, bubbleAnim4, bubbleAnim5, onAnimationFinish]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151419" />
      
      {/* Background Bubbles */}
      <View style={styles.bubbleContainer}>
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble1,
            {
              opacity: bubbleAnim1,
              transform: [
                { scale: bubbleAnim1 },
                { translateY: bubbleAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })},
              ],
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble2,
            {
              opacity: bubbleAnim2,
              transform: [
                { scale: bubbleAnim2 },
                { translateY: bubbleAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                })},
              ],
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble3,
            {
              opacity: bubbleAnim3,
              transform: [
                { scale: bubbleAnim3 },
                { translateX: bubbleAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                })},
              ],
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble4,
            {
              opacity: bubbleAnim4,
              transform: [
                { scale: bubbleAnim4 },
                { translateX: bubbleAnim4.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                })},
              ],
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.bubble, 
            styles.bubble5,
            {
              opacity: bubbleAnim5,
              transform: [
                { scale: bubbleAnim5 },
                { translateY: bubbleAnim5.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0],
                })},
              ],
            }
          ]} 
        />
      </View>

      {/* Shimmer Effect */}
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslateX }],
          },
        ]}
      />

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { translateY: slideAnim },
            ],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Animated.View 
            style={[
              styles.logo,
              {
                transform: [
                  { rotate: rotate },
                  { scale: pulseAnim },
                ],
              },
            ]}
          >
            <Ionicons name="business" size={60} color="#FBFBFB" />
            <View style={styles.logoShine} />
          </Animated.View>
        </View>
        
        <Animated.Text 
          style={[
            styles.appName,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          InternshipGo
        </Animated.Text>
        
        <Animated.Text 
          style={[
            styles.tagline,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          Find Your Perfect Internship
        </Animated.Text>

        {/* Loading Dots */}
        <Animated.View 
          style={[
            styles.loadingContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151419', // Dark background
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 50,
  },
  bubble1: {
    width: 80,
    height: 80,
    top: height * 0.1,
    left: width * 0.1,
    backgroundColor: 'rgba(245, 110, 15, 0.1)', // Orange with opacity
  },
  bubble2: {
    width: 120,
    height: 120,
    top: height * 0.2,
    right: width * 0.1,
    backgroundColor: 'rgba(245, 110, 15, 0.05)', // Lighter orange with opacity
  },
  bubble3: {
    width: 60,
    height: 60,
    bottom: height * 0.3,
    left: width * 0.2,
    backgroundColor: 'rgba(245, 110, 15, 0.08)', // Medium orange with opacity
  },
  bubble4: {
    width: 100,
    height: 100,
    bottom: height * 0.1,
    right: width * 0.2,
    backgroundColor: 'rgba(245, 110, 15, 0.1)', // Orange with opacity
  },
  bubble5: {
    width: 40,
    height: 40,
    top: height * 0.5,
    left: width * 0.5,
    backgroundColor: 'rgba(245, 110, 15, 0.05)', // Lighter orange with opacity
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    width: 100,
    height: '100%',
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F56E0F', // Primary orange
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
    position: 'relative',
  },
  logoShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FBFBFB', // Light text
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    color: '#F56E0F', // Primary orange
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    marginTop: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F56E0F', // Primary orange
  },
});
