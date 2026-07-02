import { useContext } from 'react';
import { WalletContext, WalletState } from '../context/WalletContext';

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
