import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { RootStackParamList } from '../types';
import { useWallet } from '../hooks/useWallet';

import SplashScreen from '../screens/SplashScreen';
import LandingScreen from '../screens/LandingScreen';
import HomeScreen from '../screens/HomeScreen';
import MatchDetailsScreen from '../screens/MatchDetailsScreen';
import WalletScreen from '../screens/WalletScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: '#334155',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name="Matches"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚽</Text>,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👛</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={WalletScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={WalletScreen}
        options={{
          tabBarLabel: 'Leaderboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏆</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function MainContent() {
  const { isConnected } = useWallet();
  const [showLanding, setShowLanding] = useState(!isConnected);
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => {
          setShowSplash(false);
          setShowLanding(!isConnected);
        }}
      />
    );
  }

  if (showLanding) {
    return <LandingScreen onConnected={() => setShowLanding(false)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeTabs} />
        <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return <MainContent />;
}
