import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useMatchFeed } from '../hooks/useMatchFeed';

export default function MatchDetailsScreen({ route }: any) {
  const { matchId } = route.params;
  const { markets } = useMatchFeed();

  const renderMarketCard = ({ item }: any) => (
    <View style={styles.marketCard}>
      <Text style={styles.marketQuestion}>{item.question}</Text>
      <View style={styles.oddsRow}>
        {item.outcomes?.map((outcome: any) => (
          <View key={outcome.id} style={styles.outcomeButton}>
            <Text style={styles.outcomeLabel}>{outcome.label}</Text>
            <Text style={styles.outcomeOdds}>{outcome.odds}%</Text>
          </View>
        ))}
      </View>
      <Text style={styles.poolInfo}>Pool: {item.stakePool} SOL</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Feed</Text>
      <Text style={styles.subtitle}>Match #{matchId}</Text>
      <FlatList
        data={markets}
        renderItem={renderMarketCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚡</Text>
            <Text style={styles.emptyText}>Markets opening soon...</Text>
            <Text style={styles.emptyHint}>Markets will appear live as the match progresses</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 20 },
  list: { paddingHorizontal: 16 },
  marketCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  marketQuestion: { color: '#F8FAFC', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  oddsRow: { flexDirection: 'row', gap: 10 },
  outcomeButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  outcomeLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: '500' },
  outcomeOdds: { color: '#38BDF8', fontSize: 20, fontWeight: '700', marginTop: 4 },
  poolInfo: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 12 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#F8FAFC', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: '#64748B', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
