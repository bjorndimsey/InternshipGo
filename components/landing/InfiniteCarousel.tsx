import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Animated, Easing } from 'react-native';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

interface InfiniteCarouselProps {
  data: string[];
  title: string;
  avatarSize?: number;
  speed?: number;
  pauseOnHover?: boolean;
}

export default function InfiniteCarousel({
  data,
  title,
  avatarSize = 50,
  speed = 2000,
  pauseOnHover = false,
}: InfiniteCarouselProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const isPaused = useRef(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const itemWidth = avatarSize + 8; // Reduced margin for tighter spacing
  // Create enough duplicated data for seamless infinite scrolling
  const duplicatedData = [...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data]; // 12x for ultimate infinite effect

  useEffect(() => {
    if (data.length === 0) return;

    // Smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const startContinuousCarousel = () => {
      // Reset to start position
      translateX.setValue(0);
      
      // Create a truly seamless infinite loop
      const animate = () => {
        animationRef.current = Animated.timing(translateX, {
          toValue: -data.length * itemWidth, // Move by one set width (not all duplicated data)
          duration: speed, // Total duration for one complete cycle
          easing: Easing.linear, // Linear easing for constant speed
          useNativeDriver: true,
        });
        
        animationRef.current.start((finished) => {
          if (finished && !isPaused.current) {
            // Check if we need to reset for seamless loop
            const currentValue = (translateX as any)._value;
            const resetThreshold = -data.length * itemWidth;
            
            // If we've moved one complete set, reset seamlessly
            if (currentValue <= resetThreshold) {
              translateX.setValue(currentValue + (data.length * itemWidth));
            }
            
            // Continue immediately
            animate();
          }
        });
      };

      // Delay carousel start for smooth appearance
      setTimeout(() => {
        animate();
      }, 400); // Start after entrance animation
    };

    startContinuousCarousel();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      translateX.setValue(0);
    };
  }, [data.length, itemWidth, speed]);

  const handlePressIn = () => {
    if (pauseOnHover) {
      isPaused.current = true;
      if (animationRef.current) {
        animationRef.current.stop();
      }
    }
  };

  const handlePressOut = () => {
    if (pauseOnHover) {
      isPaused.current = false;
      // Resume animation from current position
      const animate = () => {
        animationRef.current = Animated.timing(translateX, {
          toValue: -data.length * itemWidth,
          duration: speed,
          easing: Easing.linear,
          useNativeDriver: true,
        });
        
        animationRef.current.start((finished) => {
          if (finished && !isPaused.current) {
            const currentValue = (translateX as any)._value;
            const resetThreshold = -data.length * itemWidth;
            
            if (currentValue <= resetThreshold) {
              translateX.setValue(currentValue + (data.length * itemWidth));
            }
            
            animate();
          }
        });
      };
      
      animate();
    }
  };

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.carouselContainer}>
        {/* Left Edge Fade */}
        <LinearGradient
          colors={['rgba(21, 20, 25, 1)', 'rgba(21, 20, 25, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.leftFade}
        />
        
        {/* Main Carousel */}
        <Animated.View style={[styles.carousel, { transform: [{ translateX }] }]}>
          {duplicatedData.map((item, index) => (
            <Pressable
              key={index}
              style={[styles.avatarContainer, { width: itemWidth }]}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <View style={[styles.avatar, { width: avatarSize, height: avatarSize }]}>
                <Image
                  source={{ uri: item }}
                  style={[styles.avatarImage, { width: avatarSize, height: avatarSize }]}
                  resizeMode="cover"
                />
              </View>
            </Pressable>
          ))}
        </Animated.View>
        
        {/* Right Edge Fade */}
        <LinearGradient
          colors={['rgba(21, 20, 25, 0)', 'rgba(21, 20, 25, 1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.rightFade}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10, // Reduced margin
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 16,
    textAlign: 'center',
  },
  carouselContainer: {
    width: '100%', // Full width to reach edges
    height: 70, // Increased height for better visibility
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: -20, // Extend beyond container padding
  },
  carousel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '200%', // Ensure smooth scrolling
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4, // Further reduced padding for tighter spacing
  },
  avatar: {
    borderRadius: 25,
    backgroundColor: '#F56E0F',
    borderWidth: 2,
    borderColor: '#151419',
    overflow: 'hidden',
  },
  avatarImage: {
    borderRadius: 25,
  },
  emptyContainer: {
    height: 70, // Match carousel height
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#878787',
    fontSize: 14,
  },
  leftFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80, // Increased width for better edge coverage
    zIndex: 10,
    pointerEvents: 'none',
  },
  rightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80, // Increased width for better edge coverage
    zIndex: 10,
    pointerEvents: 'none',
  },
});
