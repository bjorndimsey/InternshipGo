import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const stats = [
  {
    number: '10,000+',
    label: 'Active Students',
    icon: 'people',
    color: '#F56E0F',
  },
  {
    number: '500+',
    label: 'Partner Companies',
    icon: 'business',
    color: '#878787',
  },
  {
    number: '95%',
    label: 'Success Rate',
    icon: 'trophy',
    color: '#FBFBFB',
  },
  {
    number: '50+',
    label: 'Cities Covered',
    icon: 'location',
    color: '#F56E0F',
  },
];

export default function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.backgroundElements}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {stats.map((stat, index) => (
            <Animated.View
              key={index}
              style={[
                styles.statItem,
                {
                  opacity: fadeAnim,
                  transform: [
                    { 
                      translateY: Animated.add(
                        slideAnim,
                        new Animated.Value(index * 20)
                      )
                    }
                  ],
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                <Ionicons 
                  name={stat.icon as any} 
                  size={32} 
                  color={stat.color} 
                />
              </View>
              <Text style={styles.statNumber}>{stat.number}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#151419',
    paddingVertical: 80,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle1: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: 200,
    height: 200,
    backgroundColor: 'rgba(245, 110, 15, 0.1)',
    borderRadius: 100,
    opacity: 0.6,
  },
  circle2: {
    position: 'absolute',
    bottom: '20%',
    right: '10%',
    width: 300,
    height: 300,
    backgroundColor: 'rgba(245, 110, 15, 0.05)',
    borderRadius: 150,
    opacity: 0.8,
  },
  circle3: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 150,
    height: 150,
    backgroundColor: 'rgba(245, 110, 15, 0.08)',
    borderRadius: 75,
    opacity: 0.7,
    transform: [{ translateX: -75 }, { translateY: -75 }],
  },
  content: {
    paddingHorizontal: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
    minWidth: width > 768 ? 200 : 150,
    paddingVertical: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: Math.min(width * 0.08, 48),
    fontWeight: 'bold',
    color: '#FBFBFB',
    marginBottom: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 16,
    color: '#878787',
    textAlign: 'center',
    fontWeight: '500',
  },
});
