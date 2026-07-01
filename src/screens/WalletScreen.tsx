import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function WalletScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={styles.balanceAmount}>0.00 SOL</Text>
      </View>
      <TouchableOpacity style={styles.connectButton}>
        <Text style={styles.connectText}>Connect Seeker Wallet</Text>
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
          <Text style={styles.statLabel}>Streak 🔥</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', textAlign: 'center', marginBottom: 24 },
  balanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  balanceLabel: { color: '#94A3B8', fontSize: 14 },
  balanceAmount: { color: '#F8FAFC', fontSize: 40, fontWeight: '800', marginTop: 4 },
  connectButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  connectText: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { color: '#F8FAFC', fontSize: 24, fontWeight: '700' },
  statLabel: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
});
