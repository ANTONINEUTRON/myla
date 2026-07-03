import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { THEME } from '../theme';
import { Match, Market } from '../types';
import SwipeableMarket from './SwipeableMarket';

const { width } = Dimensions.get('window');

interface MatchCardProps {
  match: Match;
  currentMarket: Market | null;
  selectedMarketType: string;
  cardHeight: number;
  onPredict: (direction: 'yes' | 'no') => void;
}

export default function MatchCard({
  match,
  currentMarket,
  cardHeight,
  onPredict,
}: MatchCardProps) {
  const isLive = match.status === 'live';

  return (
    <View className="bg-background" style={{ width, height: cardHeight }}>
      {/* Match info */}
      <View className="px-6 pt-4 pb-4">
        <Text className="text-text-muted text-xs font-medium text-center tracking-wide uppercase mb-3">
          FIFA World Cup 2026
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center gap-1">
            <Text className="text-4xl">{getFlag(match.homeTeam)}</Text>
            <Text className="text-sm font-semibold text-text-primary text-center" numberOfLines={1}>
              {match.homeTeam}
            </Text>
          </View>

          <View className="items-center px-5">
            <Text className="text-4xl font-extrabold text-text-primary tracking-wider">
              {match.homeScore} - {match.awayScore}
            </Text>
            {isLive && (
              <View className="flex-row items-center gap-1 mt-1">
                <View className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                <Text className="text-sm font-bold text-[#FF3B30]">
                  {match.minute}&apos;
                </Text>
              </View>
            )}
            {match.status === 'upcoming' && (
              <Text className="text-sm font-semibold text-text-muted mt-1">
                {new Date(match.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>

          <View className="flex-1 items-center gap-1">
            <Text className="text-4xl">{getFlag(match.awayTeam)}</Text>
            <Text className="text-sm font-semibold text-text-primary text-center" numberOfLines={1}>
              {match.awayTeam}
            </Text>
          </View>
        </View>
      </View>

      {/* Swipeable market area */}
      <View className="flex-1 justify-center pb-10">
        <SwipeableMarket
          market={currentMarket}
          onPredict={onPredict}
        />
      </View>
    </View>
  );
}

// Simple flag emoji mapping for demo
function getFlag(team: string): string {
  const flags: Record<string, string> = {
    Brazil: '🇧🇷',
    Croatia: '🇭🇷',
    France: '🇫🇷',
    Senegal: '🇸🇳',
    Argentina: '🇦🇷',
    Japan: '🇯🇵',
  };
  return flags[team] || '🏳️';
}
