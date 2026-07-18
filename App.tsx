import React, { useEffect } from 'react';
import './global.css';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WalletProvider } from './src/context/WalletContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeProgramConfig } from './src/services/pool-program';

export default function App() {
  useEffect(() => {
    initializeProgramConfig();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <WalletProvider>
          <AppNavigator />
        </WalletProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
