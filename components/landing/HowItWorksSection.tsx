import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const steps = [
  {
    number: '01',
    title: 'Create Your Profile',
    description: 'Sign up and build your professional profile with your skills, interests, and career goals.',
    icon: 'person-add',
    color: '#F56E0F',
  },
  {
    number: '02',
    title: 'Discover Opportunities',
    description: 'Browse through verified internship opportunities from top companies in your area.',
    icon: 'search',
    color: '#878787',
  },
  {
    number: '03',
    title: 'Apply & Track',
    description: 'Submit applications and track their progress with real-time status updates.',
    icon: 'document-text',
    color: '#FBFBFB',
  },
  {
    number: '04',
    title: 'Get Hired',
    description: 'Connect with companies, attend interviews, and land your dream internship.',
    icon: 'trophy',
    color: '#F56E0F',
  },
];

export default function HowItWorksSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [connectorWidths, setConnectorWidths] = useState(steps.map(() => 0));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnims = steps.map(() => useRef(new Animated.Value(1)).current);
  const iconRotateAnims = steps.map(() => useRef(new Animated.Value(0)).current);
  const numberRotateAnims = steps.map(() => useRef(new Animated.Value(0)).current);
  const borderAnims = steps.map(() => useRef(new Animated.Value(0)).current);
  const connectorAnims = steps.map(() => useRef(new Animated.Value(0)).current);
  const connectorDrawAnims = steps.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
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
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  // Stagger the initial animations for a cascading effect
  useEffect(() => {
    if (isVisible) {
      steps.forEach((_, index) => {
        setTimeout(() => {
          // Animate connector lines opacity
          Animated.timing(connectorAnims[index], {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }).start();

          // Animate connector line drawing
          Animated.timing(connectorDrawAnims[index], {
            toValue: 1,
            duration: 800,
            delay: 200,
            useNativeDriver: false,
          }).start();

          // Animate connector width for web
          if (Platform.OS === 'web' && width > 1024) {
            setTimeout(() => {
              let currentWidth = 0;
              const increment = 2;
              const interval = setInterval(() => {
                currentWidth += increment;
                if (currentWidth <= 100) {
                  setConnectorWidths(prev => {
                    const newWidths = [...prev];
                    newWidths[index] = currentWidth;
                    return newWidths;
                  });
                } else {
                  clearInterval(interval);
                }
              }, 20);
            }, index * 200 + 500);
          }

          // Animate step entrance
          Animated.spring(scaleAnims[index], {
            toValue: 1,
            useNativeDriver: true,
            friction: 3,
          }).start();
        }, index * 200);
      });
    }
  }, [isVisible, width]);

  // Animation handlers
  const handleStepHover = (index: number, isHovering: boolean) => {
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
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(numberRotateAnims[index], {
          toValue: isHovering ? 1 : 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
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
            How it <Text style={styles.highlight}>works</Text>
          </Text>
          <Text style={styles.subtitle}>
            Get started in just a few simple steps and find your perfect internship opportunity
          </Text>
        </Animated.View>

        {Platform.OS === 'web' && (
          <style>
            {`
              @keyframes stepPulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.6; }
              }
              @keyframes connectorFlow {
                0% {
                  background-position: 0% center;
                }
                100% {
                  background-position: 200% center;
                }
              }
              @keyframes connectorPulse {
                0%, 100% { 
                  opacity: 0.4;
                  box-shadow: 0 0 10px 2px rgba(245, 110, 15, 0.3);
                }
                50% { 
                  opacity: 0.7;
                  box-shadow: 0 0 15px 4px rgba(245, 110, 15, 0.6);
                }
              }
              .step-item:hover {
                transform: scale(1.02);
              }
              .step-number-pulse {
                animation: stepPulse 2s ease-in-out infinite;
              }
              .connector-line-animated {
                animation: connectorFlow 3s linear infinite, connectorPulse 2s ease-in-out infinite;
                background: linear-gradient(90deg, rgba(245, 110, 15, 0.8) 0%, rgba(245, 110, 15, 0.5) 50%, rgba(245, 110, 15, 0.8) 100%);
                background-size: 200% 100%;
              }
            `}
          </style>
        )}

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const iconRotateInterpolate = iconRotateAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            });

            const numberRotateInterpolate = numberRotateAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            });

            const connectorOpacity = connectorAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });

            const borderColor = borderAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(245, 110, 15, 0)', step.color],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.stepItem,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { 
                        translateY: Animated.add(
                          slideAnim,
                          new Animated.Value(index * 20)
                        )
                      },
                      {
                        scale: scaleAnims[index]
                      }
                    ],
                  },
                ]}
                {...(Platform.OS === 'web' && {
                  onMouseEnter: () => handleStepHover(index, true),
                  onMouseLeave: () => handleStepHover(index, false),
                })}
              >
                <Animated.View 
                  style={[
                    styles.stepNumber,
                    {
                      borderColor: borderColor,
                      transform: [{ rotate: numberRotateInterpolate }],
                    }
                  ]}
                >
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </Animated.View>
                
                <Animated.View 
                  style={[
                    styles.stepContent,
                    {
                      borderLeftColor: borderColor,
                      borderLeftWidth: borderAnims[index],
                    }
                  ]}
                >
                  <Animated.View 
                    style={[
                      styles.stepIcon, 
                      { 
                        backgroundColor: `${step.color}20`,
                        transform: [{ rotate: iconRotateInterpolate }],
                      }
                    ]}
                  >
                    <Ionicons 
                      name={step.icon as any} 
                      size={24} 
                      color={step.color} 
                    />
                  </Animated.View>
                  
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </Animated.View>

                {/* Animated Connector Line with Drawing Effect */}
                {index < steps.length - 1 && (
                  width > 1024 && Platform.OS === 'web' ? (
                    // Horizontal connector for desktop with animated width
                    <div
                      className="connector-line-animated"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '35px',
                        width: `calc(${connectorWidths[index]}% - 35px)`,
                        height: 3,
                        zIndex: 1,
                        transform: 'translateX(0)',
                        transition: 'width 0.1s linear',
                      } as any}
                    />
                  ) : (
                    // Vertical connector for mobile/tablet with animated drawing
                    <Animated.View 
                      style={[
                        styles.connectorLine,
                        {
                          opacity: connectorOpacity,
                          left: width > 768 ? 29 : width > 480 ? 27 : 25,
                          top: width > 480 ? 60 : 56,
                          width: 3,
                          height: connectorDrawAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, width > 480 ? 48 : 0],
                          }),
                        }
                      ]} 
                    />
                  )
                )}
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
    paddingHorizontal: width > 768 ? 0 : width > 480 ? 8 : 4,
  },
  content: {
    paddingHorizontal: width > 768 ? 24 : width > 480 ? 20 : 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
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
  stepsContainer: {
    position: 'relative',
    flexDirection: width > 1024 ? 'row' : 'column',
    justifyContent: width > 1024 ? 'space-evenly' : 'flex-start',
    alignItems: width > 1024 ? 'flex-start' : 'stretch',
    width: '100%',
    gap: width > 1024 ? 0 : 0,
  },
  stepItem: {
    flexDirection: width > 1024 ? 'column' : 'row',
    alignItems: width > 1024 ? 'center' : 'flex-start',
    position: 'relative',
    flex: width > 1024 ? 1 : undefined,
    width: width > 1024 ? 'auto' : '100%',
    marginBottom: width > 1024 ? 0 : width > 768 ? 48 : width > 480 ? 40 : 32,
    paddingHorizontal: width > 1024 ? 12 : 0,
    minHeight: width > 1024 ? 300 : 'auto',
  },
  stepNumber: {
    width: width > 768 ? (width > 1024 ? 70 : 60) : width > 480 ? 56 : 52,
    height: width > 768 ? (width > 1024 ? 70 : 60) : width > 480 ? 56 : 52,
    borderRadius: width > 768 ? (width > 1024 ? 35 : 30) : width > 480 ? 28 : 26,
    backgroundColor: '#F56E0F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: width > 1024 ? 0 : (width > 480 ? 24 : 0),
    marginBottom: width > 1024 ? 20 : (width > 480 ? 0 : 16),
    zIndex: 2,
    borderWidth: 3,
    borderColor: '#F56E0F',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stepNumberText: {
    fontSize: width > 768 ? 20 : width > 480 ? 18 : 16,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  stepContent: {
    flex: 1,
    paddingTop: width > 1024 ? 4 : 8,
    paddingLeft: width > 1024 ? 0 : (width > 480 ? 16 : 0),
    alignItems: width > 1024 ? 'center' : (width > 480 ? 'flex-start' : 'center'),
    borderLeftWidth: 0,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  stepIcon: {
    width: width > 768 ? 48 : width > 480 ? 44 : 40,
    height: width > 768 ? 48 : width > 480 ? 44 : 40,
    borderRadius: width > 768 ? 24 : width > 480 ? 22 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: width > 768 ? 20 : 14,
    marginTop: width > 1024 ? 12 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  stepTitle: {
    fontSize: width > 768 ? 20 : width > 480 ? 18 : 16,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: width > 1024 ? 12 : width > 768 ? 8 : 6,
    marginTop: 0,
    lineHeight: width > 768 ? 24 : 22,
    textAlign: width > 1024 ? 'center' : (width > 480 ? 'left' : 'center'),
  },
  stepDescription: {
    fontSize: width > 768 ? 14 : width > 480 ? 13 : 12,
    color: '#878787',
    lineHeight: width > 768 ? 22 : 18,
    maxWidth: 280,
    textAlign: width > 1024 ? 'center' : (width > 480 ? 'left' : 'center'),
    paddingHorizontal: width > 1024 ? 0 : 0,
  },
  connectorLine: {
    position: 'absolute',
    backgroundColor: 'rgba(245, 110, 15, 0.4)',
    zIndex: 1,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
});
