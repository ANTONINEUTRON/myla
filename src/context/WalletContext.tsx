import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { CONFIG } from '../config';

const STORAGE_KEY_AUTH_TOKEN = 'myla_wallet_auth_token';

export interface WalletState {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: number;
  authToken: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signAndSendTransaction: (txBase64: string) => Promise<string>;
}

export const WalletContext = createContext<WalletState>({
  walletAddress: null,
  isConnected: false,
  isConnecting: false,
  balance: 0,
  authToken: null,
  connect: async () => {},
  disconnect: async () => {},
  signMessage: async () => '',
  signAndSendTransaction: async () => '',
});

/**
 * Decode a Base64-encoded Solana address to Base58 format.
 * The address comes Base64-encoded from the MWA protocol.
 */
function base64ToBase58(base64Address: string): string {
  try {
    const buffer = Buffer.from(base64Address, 'base64');
    const publicKey = new PublicKey(buffer);
    return publicKey.toBase58();
  } catch (err) {
    console.error('Failed to convert base64 address to base58:', err);
    return base64Address;
  }
}

function parseStoredAddress(address: string): string {
  try {
    new PublicKey(address);
    return address;
  } catch {
    try {
      const buffer = Buffer.from(address, 'base64');
      if (buffer.length === 32) {
        return new PublicKey(buffer).toBase58();
      }
    } catch (e) {
      console.warn('Failed to parse legacy address as base64:', e);
    }
    return address;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cachedAuthToken, setCachedAuthToken] = useState<string | null>(null);

  const fetchBalance = useCallback(async (address: string) => {
    if (address === 'DevWallet111111111111111111111111111111111111' || address.startsWith('DevWallet')) {
      setBalance(2.5);
      return;
    }
    try {
      const connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');
      const pubkey = new PublicKey(address);
      const lamports = await connection.getBalance(pubkey);
      setBalance(lamports / 1e9);
    } catch (err) {
      console.warn('Failed to fetch SOL balance:', err);
    }
  }, []);

  // Try to restore a previous session from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedAddress = await AsyncStorage.getItem('myla_wallet_address');
        const storedToken = await AsyncStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
        if (storedAddress && storedToken) {
          const parsedAddress = parseStoredAddress(storedAddress);
          if (parsedAddress !== storedAddress) {
            await AsyncStorage.setItem('myla_wallet_address', parsedAddress);
          }
          setWalletAddress(parsedAddress);
          setCachedAuthToken(storedToken);
          fetchBalance(parsedAddress);
        }
      } catch {
        // Storage not available — that's fine, start disconnected
      }
    })();
  }, [fetchBalance]);

  // Periodically refresh balance if connected
  useEffect(() => {
    if (!walletAddress) return;
    const interval = setInterval(() => {
      fetchBalance(walletAddress);
    }, 15_000);
    return () => clearInterval(interval);
  }, [walletAddress, fetchBalance]);

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
              chain: 'solana:devnet',
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
      await fetchBalance(address);
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

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    if (walletAddress.startsWith('DevWallet')) {
      // Dev mode: return a mock base64 signature
      return Buffer.from(`mock-sig-${message}-${Date.now()}`).toString('base64');
    }

    if (Platform.OS === 'android') {
      const { transact } = await import(
        '@solana-mobile/mobile-wallet-adapter-protocol'
      );

      return await transact(async (wallet: any) => {
        let auth;
        try {
          auth = await wallet.reauthorize({
            identity: {
              name: 'MYLA',
              uri: 'https://symbal.fun',
              icon: 'favicon.ico',
            },
            auth_token: cachedAuthToken,
          });
        } catch (reauthErr) {
          console.warn('[WalletContext] Reauthorize failed in signMessage, falling back to authorize:', reauthErr);
          auth = await wallet.authorize({
            identity: {
              name: 'MYLA',
              uri: 'https://symbal.fun',
              icon: 'favicon.ico',
            },
            chain: 'solana:devnet',
          });

          if (auth?.auth_token) {
            setCachedAuthToken(auth.auth_token);
            await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, auth.auth_token);
          }
        }

        const addressBytes = Buffer.from(auth.accounts[0].address, 'base64');
        const messageBytes = new Uint8Array(Buffer.from(message, 'utf-8'));

        const result = await wallet.signMessages({
          addresses: [addressBytes],
          messages: [messageBytes],
        });

        return Buffer.from(result.signatures[0]).toString('base64');
      });
    }

    throw new Error('Platform not supported for wallet message signing');
  }, [walletAddress, cachedAuthToken]);

  const signAndSendTransaction = useCallback(async (txBase64: string): Promise<string> => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    if (walletAddress.startsWith('DevWallet')) {
      // Dev mode: simulate transaction send and return a mock signature hash
      const mockHash = 'mocktx' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      return mockHash;
    }

    if (Platform.OS === 'android') {
      const { transact } = await import(
        '@solana-mobile/mobile-wallet-adapter-protocol'
      );

      return await transact(async (wallet: any) => {
        let auth;
        try {
          auth = await wallet.reauthorize({
            identity: {
              name: 'MYLA',
              uri: 'https://symbal.fun',
              icon: 'favicon.ico',
            },
            auth_token: cachedAuthToken,
          });
        } catch (reauthErr) {
          console.warn('[WalletContext] Reauthorize failed in signAndSendTransaction, falling back to authorize:', reauthErr);
          auth = await wallet.authorize({
            identity: {
              name: 'MYLA',
              uri: 'https://symbal.fun',
              icon: 'favicon.ico',
            },
            chain: 'solana:devnet',
          });

          if (auth?.auth_token) {
            setCachedAuthToken(auth.auth_token);
            await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, auth.auth_token);
          }
        }

        const result = await wallet.signAndSendTransactions({
          payloads: [txBase64],
        });

        const sigBytes = Buffer.from(result.signatures[0], 'base64');
        const bs58 = require('bs58');
        return bs58.encode(sigBytes);
      });
    }

    throw new Error('Platform not supported for wallet transactions');
  }, [walletAddress, cachedAuthToken]);

  const value = useMemo(
    () => ({
      walletAddress,
      isConnected: walletAddress !== null,
      isConnecting,
      balance,
      authToken: cachedAuthToken,
      connect,
      disconnect,
      signMessage,
      signAndSendTransaction,
    }),
    [
      walletAddress,
      balance,
      isConnecting,
      cachedAuthToken,
      connect,
      disconnect,
      signMessage,
      signAndSendTransaction,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
