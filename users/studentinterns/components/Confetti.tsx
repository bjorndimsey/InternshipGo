import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  color: string;
  size: number;
  initialX: number;
}

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

const COLORS = ['#F56E0F', '#2D5A3D', '#4285f4', '#E8A598', '#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3'];

export default function Confetti({ active, onComplete }: ConfettiProps) {
  const confettiPieces = useRef<ConfettiPiece[]>([]);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      // Create confetti pieces
      const pieces: ConfettiPiece[] = [];
      for (let i = 0; i < 100; i++) {
        const initialX = Math.random() * SCREEN_WIDTH;
        pieces.push({
          id: i,
          x: new Animated.Value(initialX),
          y: new Animated.Value(-50),
          rotation: new Animated.Value(0),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: Math.random() * 10 + 5,
          initialX: initialX,
        });
      }
      confettiPieces.current = pieces;

      // Animate all pieces
      const animations = pieces.map((piece) => {
        const fallDuration = 3000 + Math.random() * 2000;
        const horizontalMovement = (Math.random() - 0.5) * 200;

        return Animated.parallel([
          Animated.timing(piece.y, {
            toValue: SCREEN_HEIGHT + 100,
            duration: fallDuration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.x, {
            toValue: piece.initialX + horizontalMovement,
            duration: fallDuration,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.timing(piece.rotation, {
              toValue: 1,
              duration: 500 + Math.random() * 500,
              useNativeDriver: true,
            })
          ),
        ]);
      });

      animationRef.current = Animated.parallel(animations);
      animationRef.current.start(() => {
        if (onComplete) {
          onComplete();
        }
      });
    } else {
      // Reset all pieces
      confettiPieces.current.forEach((piece) => {
        piece.y.setValue(-50);
        piece.x.setValue(Math.random() * SCREEN_WIDTH);
        piece.rotation.setValue(0);
      });
      if (animationRef.current) {
        animationRef.current.stop();
      }
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.current.map((piece) => {
        const rotation = piece.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.piece,
              {
                backgroundColor: piece.color,
                width: piece.size,
                height: piece.size,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  { rotate: rotation },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});

