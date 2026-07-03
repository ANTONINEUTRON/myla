import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMatchFeed } from '../hooks/useMatchFeed';
import { useWallet } from '../hooks/useWallet';
import { Match } from '../types';
import MatchCard from '../components/MatchCard';
import MarketDropdown from '../components/MarketDropdown';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const APPBAR_HEIGHT = 140;

export default function MatchFeedScreen() {
  const {
    matches,
    selectedMatch,
    selectedMarketType,
    currentMarket,
    selectMatch,
    selectMarketType,
  } = useMatchFeed();
  const { walletAddress, balance } = useWallet();
  const listRef = useRef<FlatList<Match>>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item) {
        selectMatch(viewableItems[0].item as Match);
      }
    },
    [selectMatch]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handlePredict = useCallback(
    (direction: 'yes' | 'no') => {
      if (!currentMarket) return;
      // TODO: Phase 8 - open prediction confirmation modal
      console.log(
        `Predicted ${direction} on market: ${currentMarket.question}`
      );
    },
    [currentMarket]
  );

  const CARD_HEIGHT = SCREEN_HEIGHT - APPBAR_HEIGHT;
  const MIDDLE_START = Math.floor(matches.length / 3);

  // Start in the middle segment for circular feel
  React.useEffect(() => {
    if (matches.length > 0 && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: MIDDLE_START,
          animated: false,
        });
      }, 0);
    }
  }, []);

  const renderMatch = useCallback(
    ({ item }: { item: Match }) => {
      const isSelected = item.id === selectedMatch?.id;
      return (
        <MatchCard
          match={item}
          currentMarket={isSelected ? currentMarket : null}
          selectedMarketType={isSelected ? selectedMarketType : 'NEXT_GOAL_TIMER'}
          cardHeight={CARD_HEIGHT}
          onPredict={handlePredict}
        />
      );
    },
    [selectedMatch, currentMarket, selectedMarketType, handlePredict, CARD_HEIGHT]
  );

  const keyExtractor = useCallback((item: Match, index: number) => `${item.id}-${index}`, []);

  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const totalHeight = matches.length * CARD_HEIGHT;
      const segmentSize = matches.length / 3;

      // If scrolled past first segment (too far up), jump to middle
      if (offsetY < segmentSize * CARD_HEIGHT - CARD_HEIGHT) {
        listRef.current?.scrollToIndex({
          index: Math.floor(segmentSize) + Math.floor(offsetY / CARD_HEIGHT),
          animated: false,
        });
      }
      // If scrolled past last segment (too far down), jump to middle
      else if (offsetY >= segmentSize * 2 * CARD_HEIGHT) {
        const remainder = offsetY - segmentSize * 2 * CARD_HEIGHT;
        listRef.current?.scrollToIndex({
          index: Math.floor(segmentSize) + Math.floor(remainder / CARD_HEIGHT),
          animated: false,
        });
      }
    },
    [matches.length, CARD_HEIGHT]
  );

  return (
    <View className="flex-1 bg-background">
      {/* Fixed AppBar */}
      <SafeAreaView
        edges={['top']}
        className="bg-surface rounded-b-xl z-10"
      >
        <View className="flex-row items-center justify-between px-4 pb-3">
          <MarketDropdown
            selectedType={selectedMarketType}
            onSelect={selectMarketType}
          />
          {walletAddress && (
            <View className="flex-row items-center gap-1 bg-surface-elevated px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.06)]">
              <Ionicons name="wallet-outline" size={13} color="#FF6B35" />
              <Text className="text-xs font-semibold text-primary">
                {balance.toFixed(2)} SOL
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Vertical snap feed */}
      <FlatList
        ref={listRef}
        data={matches}
        renderItem={renderMatch}
        keyExtractor={keyExtractor}
        pagingEnabled
        snapToInterval={CARD_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        onMomentumScrollEnd={onMomentumScrollEnd}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={MIDDLE_START}
        getItemLayout={(_, index) => ({
          length: CARD_HEIGHT,
          offset: CARD_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}