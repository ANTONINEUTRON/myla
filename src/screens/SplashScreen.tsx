import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import * as SplashScreenExpo from 'expo-splash-screen';
import { THEME } from '../theme';

const { width, height } = Dimensions.get('window');

// Keep the native splash screen visible while we show our custom one
SplashScreenExpo.preventAutoHideAsync();

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo: fade in + scale up
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in tagline after a delay
    setTimeout(() => {
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // Auto-navigate after ~2.5 seconds
    const timer = setTimeout(async () => {
      await SplashScreenExpo.hideAsync();
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Background glow */}
      <Animated.View
        style={[
          styles.glow,
          { opacity: glowOpacity },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../../assets/logo-wide.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          { opacity: taglineOpacity },
        ]}
      >
        Powered by TxODDS × Solana
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: THEME.colors.primary.glow,
    opacity: 0,
    // The glow is a large semi-transparent circle behind the logo
    shadowColor: THEME.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 100,
    elevation: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.7,
    height: 80,
  },
  tagline: {
    position: 'absolute',
    bottom: 80,
    fontSize: 14,
    color: THEME.colors.text.muted,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
});
