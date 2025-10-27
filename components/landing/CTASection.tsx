import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface CTASectionProps {
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
}

export default function CTASection({ onNavigateToRegister, onNavigateToLogin }: CTASectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F56E0F', '#FF8C3A', '#F56E0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.backgroundPattern} />
        
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
            <Text style={styles.title}>
              Ready to find your <Text style={styles.highlight}>dream internship</Text>?
            </Text>
            
            <Text style={styles.subtitle}>
              Join thousands of students who have already found their perfect internship opportunities. 
              Start your journey today and take the first step towards your career goals.
            </Text>

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
                <Ionicons name="log-in" size={20} color="#F56E0F" />
                <Text style={styles.secondaryButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FBFBFB" />
                <Text style={styles.featureText}>Free to join</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FBFBFB" />
                <Text style={styles.featureText}>No hidden fees</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FBFBFB" />
                <Text style={styles.featureText}>Verified companies</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gradientBackground: {
    paddingVertical: 80,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: '#FBFBFB',
    // Note: In React Native, we can't easily create complex patterns like CSS
    // This is a simplified version
  },
  content: {
    paddingHorizontal: 16,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: Math.min(width * 0.08, 48),
    fontWeight: 'bold',
    color: '#FBFBFB',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: Math.min(width * 0.1, 60),
  },
  highlight: {
    color: '#FBFBFB',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: Math.min(width * 0.04, 20),
    color: 'rgba(251, 251, 251, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
    maxWidth: 600,
  },
  buttonContainer: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 16,
    marginBottom: 40,
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FBFBFB',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F56E0F',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FBFBFB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FBFBFB',
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(251, 251, 251, 0.9)',
    fontWeight: '500',
  },
});
