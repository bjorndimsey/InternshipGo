import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashCardsProps {
  onComplete?: () => void;
}

interface CardData {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
}

const cardsData: CardData[] = [
  {
    id: 1,
    title: "Welcome to InternshipGo",
    description: "Your gateway to finding the perfect internship opportunity that matches your skills and career goals.",
    icon: "school-outline",
    color: "#F4D03F",
    backgroundColor: "#1E3A5F",
  },
  {
    id: 2,
    title: "Discover Opportunities",
    description: "Browse through hundreds of internship opportunities from top companies and startups.",
    icon: "search-outline",
    color: "#2D5A3D",
    backgroundColor: "#F5F1E8",
  },
  {
    id: 3,
    title: "Track Your Progress",
    description: "Monitor your application status, upcoming interviews, and manage your internship journey.",
    icon: "trending-up-outline",
    color: "#E8A598",
    backgroundColor: "#1E3A5F",
  },
  {
    id: 4,
    title: "Connect & Network",
    description: "Build meaningful connections with industry professionals and fellow students.",
    icon: "people-outline",
    color: "#F4D03F",
    backgroundColor: "#2D5A3D",
  },
];

export default function SplashCards({ onComplete }: SplashCardsProps) {
  const [currentCard, setCurrentCard] = useState(0);
  const [showCards, setShowCards] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Start card rotation animation
    const cardRotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      { iterations: -1 }
    );
    cardRotation.start();

    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 4000, // 4 seconds per card
      useNativeDriver: true,
    }).start();

    // Auto-advance cards
    const cardInterval = setInterval(() => {
      setCurrentCard((prev) => {
        if (prev < cardsData.length - 1) {
          return prev + 1;
        } else {
          // All cards shown, start exit animation
          setShowCards(false);
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: -50,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onComplete?.();
          });
          return prev;
        }
      });
    }, 4000);

    return () => {
      clearInterval(cardInterval);
      cardRotation.stop();
    };
  }, []);

  // Card transition animation
  useEffect(() => {
    Animated.sequence([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Icon bounce animation
    Animated.sequence([
      Animated.spring(iconAnim, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(iconAnim, {
        toValue: 0,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentCard]);

  const handleSkip = () => {
    setShowCards(false);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  };

  const handleNext = () => {
    if (currentCard < cardsData.length - 1) {
      setCurrentCard(currentCard + 1);
    } else {
      handleSkip();
    }
  };

  if (!showCards) return null;

  const currentCardData = cardsData[currentCard];
  const progress = ((currentCard + 1) / cardsData.length) * 100;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const cardScale = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const iconScale = iconAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={currentCardData.backgroundColor} />
      
      {/* Background Bubbles */}
      <View style={styles.bubbleContainer}>
        {[...Array(6)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bubble,
              {
                left: (index * 20) % width,
                top: (index * 30) % height,
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { rotate: rotate },
                ],
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', `${progress}%`],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentCard + 1} of {cardsData.length}
          </Text>
        </View>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: currentCardData.backgroundColor,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: currentCardData.color,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Ionicons
              name={currentCardData.icon as any}
              size={80}
              color="#fff"
            />
          </Animated.View>

          {/* Content */}
          <Text style={[styles.title, { color: currentCardData.color }]}>
            {currentCardData.title}
          </Text>
          
          <Text style={[styles.description, { color: currentCardData.backgroundColor === '#F5F1E8' ? '#1E3A5F' : '#F5F1E8' }]}>
            {currentCardData.description}
          </Text>
        </Animated.View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          
          <View style={styles.dotsContainer}>
            {cardsData.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentCard ? currentCardData.color : 'rgba(255, 255, 255, 0.3)',
                  },
                ]}
              />
            ))}
          </View>
          
          <TouchableOpacity style={[styles.nextButton, { backgroundColor: currentCardData.color }]} onPress={handleNext}>
            <Text style={styles.nextText}>
              {currentCard === cardsData.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(244, 208, 63, 0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F4D03F',
    borderRadius: 2,
  },
  progressText: {
    color: '#F5F1E8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  card: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.3)',
    elevation: 15,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    boxShadow: '0px 8px 15px rgba(0, 0, 0, 0.3)',
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 350,
    marginTop: 40,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipText: {
    color: '#F5F1E8',
    fontSize: 16,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 6,
  },
  nextText: {
    color: '#1E3A5F',
    fontSize: 16,
    fontWeight: '600',
  },
});
