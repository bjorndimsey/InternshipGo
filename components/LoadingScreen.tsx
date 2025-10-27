import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Continuous rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    return () => rotateAnimation.stop();
  }, [fadeAnim, scaleAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151419" />
      
      {/* Background Bubbles */}
      <View style={styles.bubbleContainer}>
        <View style={[styles.bubble, styles.bubble1]} />
        <View style={[styles.bubble, styles.bubble2]} />
        <View style={[styles.bubble, styles.bubble3]} />
        <View style={[styles.bubble, styles.bubble4]} />
        <View style={[styles.bubble, styles.bubble5]} />
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.loaderContainer}>
          <Animated.View
            style={[
              styles.loader,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <View style={styles.loaderInner} />
          </Animated.View>
        </View>
        
        <Text style={styles.message}>{message}</Text>
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151419',
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
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  bubble1: {
    width: 60,
    height: 60,
    top: height * 0.15,
    left: width * 0.1,
  },
  bubble2: {
    width: 100,
    height: 100,
    top: height * 0.25,
    right: width * 0.15,
  },
  bubble3: {
    width: 80,
    height: 80,
    bottom: height * 0.25,
    left: width * 0.2,
  },
  bubble4: {
    width: 120,
    height: 120,
    bottom: height * 0.15,
    right: width * 0.1,
  },
  bubble5: {
    width: 50,
    height: 50,
    top: height * 0.6,
    left: width * 0.6,
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  loaderContainer: {
    marginBottom: 40,
  },
  loader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(245, 110, 15, 0.2)',
    borderTopColor: '#F56E0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
  },
  message: {
    fontSize: 18,
    color: '#FBFBFB',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 30,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F56E0F',
    marginHorizontal: 4,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
});
