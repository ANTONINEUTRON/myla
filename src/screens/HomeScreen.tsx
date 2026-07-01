import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useMatchFeed } from '../hooks/useMatchFeed';
import { Match } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { matches, selectMatch } = useMatchFeed();

  const renderMatchCard = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => {
        selectMatch(item);
        navigation.navigate('MatchDetails', { matchId: item.id });
      }}
    >
      <View style={styles.matchHeader}>
        <Text style={styles.matchStatus}>
          {item.status === 'live' ? `🔴 LIVE ${item.minute}'` : '⚽ UPCOMING'}
        </Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={styles.teamName}>{item.homeTeam}</Text>
        <Text style={styles.score}>{item.homeScore} - {item.awayScore}</Text>
        <Text style={styles.teamName}>{item.awayTeam}</Text>
      </View>
      <Text style={styles.tapHint}>Tap to predict →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MYLA</Text>
      <Text style={styles.subtitle}>Make Your Live Assessment</Text>
      <FlatList
        data={matches}
        renderItem={renderMatchCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#F8FAFC', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 20 },
  list: { paddingHorizontal: 16 },
  matchCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  matchHeader: { marginBottom: 12 },
  matchStatus: { color: '#38BDF8', fontSize: 13, fontWeight: '600' },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', flex: 1 },
  score: { color: '#F8FAFC', fontSize: 28, fontWeight: '800', marginHorizontal: 16 },
  tapHint: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 12 },
});
