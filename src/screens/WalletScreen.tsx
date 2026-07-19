import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useWallet } from '../hooks/useWallet';
import { THEME } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function WalletScreen() {
  const { walletAddress, isConnected, isConnecting, balance, connect, disconnect } = useWallet();

  const handlePressConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  // Helper to truncate wallet address:
  const truncateAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 6)}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      
      <View style={styles.balanceCard}>
        <Ionicons name="wallet-outline" size={32} color={THEME.colors.primary.DEFAULT} style={styles.walletIcon} />
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={styles.balanceAmount}>{balance.toFixed(4)} SOL</Text>
        {isConnected && (
          <Text style={styles.addressText}>{truncateAddress(walletAddress)}</Text>
        )}
      </View>

      <TouchableOpacity 
        style={[
          styles.connectButton,
          isConnected && styles.disconnectButton
        ]} 
        onPress={handlePressConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={[styles.connectText, isConnected && styles.disconnectText]}>
            {isConnected ? 'Disconnect Wallet' : 'Connect Seeker Wallet'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Predictions</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>0%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>0</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="flame" size={13} color="#FF6B35" />
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: THEME.colors.background, 
    paddingTop: 60, 
    paddingHorizontal: 16 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: THEME.colors.text.primary, 
    textAlign: 'center', 
    marginBottom: 24 
  },
  balanceCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  walletIcon: {
    marginBottom: 8,
  },
  balanceLabel: { 
    color: THEME.colors.text.secondary, 
    fontSize: 14 
  },
  balanceAmount: { 
    color: THEME.colors.text.primary, 
    fontSize: 36, 
    fontWeight: '800', 
    marginTop: 4 
  },
  addressText: {
    color: THEME.colors.text.secondary,
    fontSize: 13,
    marginTop: 8,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  connectButton: {
    backgroundColor: THEME.colors.primary.DEFAULT,
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: THEME.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  disconnectButton: {
    backgroundColor: '#242B38',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  connectText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  disconnectText: {
    color: '#FF453A',
  },
  statsRow: { 
    flexDirection: 'row', 
    gap: 12 
  },
  statBox: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  statValue: { 
    color: THEME.colors.text.primary, 
    fontSize: 24, 
    fontWeight: '700' 
  },
  statLabel: { 
    color: THEME.colors.text.secondary, 
    fontSize: 12, 
    marginTop: 4 
  },
});
