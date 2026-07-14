import React from 'react';
import { StyleSheet, Animated } from 'react-native';

export interface ConfettiParticle {
  id: number;
  color: string;
  left: number;
  animY: Animated.Value;
  animX: Animated.Value;
}

interface ConfettiCelebrationProps {
  particles: ConfettiParticle[];
}

export default function ConfettiCelebration({ particles }: ConfettiCelebrationProps) {
  return (
    <>
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            styles.particle,
            {
              backgroundColor: p.color,
              left: `${p.left}%`,
              transform: [{ translateY: p.animY }, { translateX: p.animX }]
            }
          ]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 6,
    height: 12,
    borderRadius: 3,
    zIndex: 999
  }
});
