import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_AUTH_TOKEN = 'myla_wallet_auth_token';

export interface WalletState {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: number;
  authToken: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const WalletContext = createContext<WalletState>({
  walletAddress: null,
  isConnected: false,
  isConnecting: false,
  balance: 0,
  authToken: null,
  connect: async () => {},
  disconnect: async () => {},
});

/**
 * Decode a Base64-encoded Solana address and return it as-is.
 * The address comes Base64-encoded from the MWA protocol.
 * For display/conversion to Base58, @solana/web3.js PublicKey can be used.
 */
function base64ToBase58(base64Address: string): string {
  // The MWA protocol returns addresses Base64-encoded.
  // For now we return it raw; the UI can convert using @solana/web3.js if needed.
  // Base64-encoded Solana addresses are ~44 chars, Base58 are ~32-44 chars.
  return base64Address;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cachedAuthToken, setCachedAuthToken] = useState<string | null>(null);

  // Try to restore a previous session from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedAddress = await AsyncStorage.getItem('myla_wallet_address');
        const storedToken = await AsyncStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
        if (storedAddress && storedToken) {
          setWalletAddress(storedAddress);
          setCachedAuthToken(storedToken);
        }
      } catch {
        // Storage not available — that's fine, start disconnected
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      let address: string;
      let authToken: string;

      if (Platform.OS === 'android') {
        // Real Solana Mobile Wallet Adapter flow (Seeker / Saga devices)
        try {
          const { transact } = await import(
            '@solana-mobile/mobile-wallet-adapter-protocol'
          );

          const authResult = await transact(async (wallet: any) => {
            const auth = await wallet.authorize({
              identity: {
                name: 'MYLA',
                uri: 'https://symbal.fun',
                icon: 'favicon.ico',
              },
              chain: 'solana:mainnet',
              ...(cachedAuthToken
                ? { auth_token: cachedAuthToken }
                : {}),
            });
            return auth;
          });

          address = base64ToBase58(authResult.accounts[0].address);
          authToken = authResult.auth_token;
        } catch (mwaError: any) {
          // Check if it's a "no wallet found" error — show a useful message
          if (
            mwaError?.message?.includes?.('wallet') ||
            mwaError?.message?.includes?.('Wallet')
          ) {
            throw new Error(
              'No Solana wallet app found. Install a compatible wallet like Solflare or Phantom.'
            );
          }
          // For other MWA errors (native module not linked, etc.), fall through to dev mode
          console.warn(
            'Solana Mobile Wallet Adapter unavailable, using dev fallback:',
            mwaError?.message
          );
          // Fall back to dev wallet
          address = 'DevWallet111111111111111111111111111111111111';
          authToken = 'dev-token';
        }
      } else {
        // Non-Android (iOS/Web dev): use simulated wallet
        address = 'DevWallet111111111111111111111111111111111111';
        authToken = 'dev-token';
      }

      // Persist session
      await AsyncStorage.setItem('myla_wallet_address', address);
      await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, authToken);

      setWalletAddress(address);
      setCachedAuthToken(authToken);
      setBalance(authToken === 'dev-token' ? 2.5 : 0);
    } catch (error) {
      await AsyncStorage.multiRemove([
        'myla_wallet_address',
        STORAGE_KEY_AUTH_TOKEN,
      ]);
      setWalletAddress(null);
      setCachedAuthToken(null);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [cachedAuthToken]);

  const disconnect = useCallback(async () => {
    setWalletAddress(null);
    setCachedAuthToken(null);
    setBalance(0);
    await AsyncStorage.multiRemove([
      'myla_wallet_address',
      STORAGE_KEY_AUTH_TOKEN,
    ]);
  }, []);

  const value = useMemo(
    () => ({
      walletAddress,
      isConnected: walletAddress !== null,
      isConnecting,
      balance,
      authToken: cachedAuthToken,
      connect,
      disconnect,
    }),
    [walletAddress, balance, isConnecting, cachedAuthToken, connect, disconnect]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
