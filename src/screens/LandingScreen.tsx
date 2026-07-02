import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { useWallet } from '../hooks/useWallet';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  { icon: 'flash' as const, text: 'Predict live match events in real-time' },
  { icon: 'locate' as const, text: 'Swipe right for YES, left for NO' },
  { icon: 'cash' as const, text: "Win SOL instantly when you're right" },
];

interface LandingScreenProps {
  onConnected: () => void;
}

export default function LandingScreen({ onConnected }: LandingScreenProps) {
  const { isConnected, connect } = useWallet();
  const [isConnecting, setIsConnecting] = React.useState(false);

  // Animated values
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const ball1Anim = useRef(new Animated.Value(0)).current;
  const ball2Anim = useRef(new Animated.Value(0)).current;
  const ball3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating ball animations
    const createBallAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createBallAnimation(ball1Anim, 0).start();
    createBallAnimation(ball2Anim, 500).start();
    createBallAnimation(ball3Anim, 1000).start();
  }, []);

  // Navigate when connected
  useEffect(() => {
    if (isConnected) {
      onConnected();
    }
  }, [isConnected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const getBallTransform = (anim: Animated.Value) => ({
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -20, 0],
        }),
      },
      {
        translateX: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 10, 0],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.15, 0.4, 0.15],
    }),
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Background radial glow */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Floating soccer balls */}
      <Animated.View
        style={[styles.floatingBall, styles.ball1, getBallTransform(ball1Anim)]}
      >
        <Ionicons name="football" size={32} color={THEME.colors.primary.DEFAULT} />
      </Animated.View>
      <Animated.View
        style={[styles.floatingBall, styles.ball2, getBallTransform(ball2Anim)]}
      >
        <Ionicons name="football" size={28} color={THEME.colors.primary.DEFAULT} />
      </Animated.View>
      <Animated.View
        style={[styles.floatingBall, styles.ball3, getBallTransform(ball3Anim)]}
      >
        <Ionicons name="football" size={36} color={THEME.colors.primary.DEFAULT} />
      </Animated.View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo-wide.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Hero area */}
        <View style={styles.heroArea}>
          <Text style={styles.heroTitle}>Predict the game.</Text>
          <Text style={styles.heroSubtitle}>Win on the spot.</Text>
        </View>

        {/* Feature list */}
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon} size={20} color={THEME.colors.primary.DEFAULT} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* Connect Wallet button */}
        <TouchableOpacity
          style={[
            styles.connectButton,
            isConnecting && styles.connectButtonDisabled,
          ]}
          onPress={handleConnect}
          disabled={isConnecting}
          activeOpacity={0.85}
        >
          <Text style={styles.connectButtonText}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Powered by Solana &bull; Non-custodial
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  bgGlowTop: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: THEME.colors.primary.glow,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -80,
    alignSelf: 'center',
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: (width * 1.4) / 2,
    backgroundColor: THEME.colors.primary.glow,
    opacity: 0.3,
  },
  floatingBall: {
    position: 'absolute',
  },
  ball1: {
    top: height * 0.15,
    right: 40,
  },
  ball2: {
    top: height * 0.35,
    left: 30,
  },
  ball3: {
    bottom: height * 0.3,
    right: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: THEME.spacing.xxl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.huge,
  },
  logo: {
    width: width * 0.6,
    height: 60,
  },
  heroArea: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xxxl,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.primary.DEFAULT,
    textAlign: 'center',
    marginTop: THEME.spacing.xs,
  },
  featuresContainer: {
    marginBottom: THEME.spacing.huge,
    gap: THEME.spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.lg,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: THEME.colors.text.secondary,
    lineHeight: 21,
  },
  connectButton: {
    backgroundColor: THEME.colors.primary.DEFAULT,
    borderRadius: THEME.borderRadius.xxl,
    paddingVertical: THEME.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: 12,
    color: THEME.colors.text.muted,
    textAlign: 'center',
    marginTop: THEME.spacing.lg,
  },
});
