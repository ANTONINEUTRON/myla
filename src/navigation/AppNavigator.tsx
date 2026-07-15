import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useWallet } from '../hooks/useWallet';
import { useTxOddsAuth } from '../hooks/useTxOddsAuth';

import SplashScreen from '../screens/SplashScreen';
import LandingScreen from '../screens/LandingScreen';
import ActivatingScreen from '../screens/ActivatingScreen';
import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F1219',
          borderTopColor: 'rgba(255,255,255,0.06)',
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          height: 56 + insets.bottom,
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name="Matches"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="football" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainContent() {
  const { isConnected, walletAddress, authToken } = useWallet();
  const { authState } = useTxOddsAuth();

  const [showSplash, setShowSplash] = useState(true);
  // true while we should show the one-time activation screen
  const [showActivating, setShowActivating] = useState(false);

  // After wallet connects for first time, show ActivatingScreen
  useEffect(() => {
    if (isConnected && authState === 'guest') {
      setShowActivating(true);
    }
  }, [isConnected, authState]);

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  if (!isConnected) {
    return <LandingScreen onConnected={() => {}} />;
  }

  // First-time setup: show activation flow before the feed
  if (showActivating && authState !== 'activated') {
    return (
      <ActivatingScreen
        walletAddress={walletAddress ?? ''}
        authToken={authToken}
        onDone={() => setShowActivating(false)}
      />
    );
  }

  // Connected (+ activated or skipped) → show main app
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


export default function AppNavigator() {
  return <MainContent />;
}
