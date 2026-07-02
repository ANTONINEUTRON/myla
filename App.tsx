import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalletProvider } from './src/context/WalletContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <WalletProvider>
        <AppNavigator />
      </WalletProvider>
    </SafeAreaProvider>
  );
}
