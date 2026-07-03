import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Market } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeableMarketProps {
  market: Market | null;
  onPredict: (direction: 'yes' | 'no') => void;
}

export default function SwipeableMarket({
  market,
  onPredict,
}: SwipeableMarketProps) {
  const translateX = useSharedValue(0);
  const isSwiping = useSharedValue(false);

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      isSwiping.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        runOnJS(onPredict)('yes');
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        runOnJS(onPredict)('no');
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      isSwiping.value = false;
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotation = translateX.value * 0.08;
    const scale = 1 - Math.abs(translateX.value) / (SCREEN_WIDTH * 2);
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotation}deg` },
        { scale },
      ],
    };
  });

  const rightGlowStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, translateX.value / SWIPE_THRESHOLD));
    return { opacity };
  });

  const leftGlowStyle = useAnimatedStyle(() => {
    const opacity = Math.max(
      0,
      Math.min(1, -translateX.value / SWIPE_THRESHOLD)
    );
    return { opacity };
  });

  const yesLabelStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, translateX.value / SWIPE_THRESHOLD));
    const scale = Math.min(1.2, 0.6 + opacity * 0.6);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const noLabelStyle = useAnimatedStyle(() => {
    const opacity = Math.max(
      0,
      Math.min(1, -translateX.value / SWIPE_THRESHOLD)
    );
    const scale = Math.min(1.2, 0.6 + opacity * 0.6);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  if (!market) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-text-muted text-base">No active markets</Text>
      </View>
    );
  }

  const yesOutcome = market.outcomes.find((o) => o.label === 'YES');
  const noOutcome = market.outcomes.find((o) => o.label === 'NO');

  return (
    <View className="flex-1 justify-center items-center">
      {/* Swipe overlays */}
      <Animated.View
        style={[{ backgroundColor: 'rgba(0, 230, 118, 0.12)', borderRadius: 16, zIndex: 2 }, rightGlowStyle]}
        className="absolute inset-0 justify-center items-center"
      >
        <Animated.Text
          style={[yesLabelStyle, { marginLeft: 60 }]}
          className="text-4xl font-extrabold tracking-wider text-yes"
        >
          YES ✓
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[{ backgroundColor: 'rgba(255, 23, 68, 0.12)', borderRadius: 16, zIndex: 2 }, leftGlowStyle]}
        className="absolute inset-0 justify-center items-center"
      >
        <Animated.Text
          style={[noLabelStyle, { marginRight: 60 }]}
          className="text-4xl font-extrabold tracking-wider text-no"
        >
          NO ✗
        </Animated.Text>
      </Animated.View>

      {/* Swipeable card */}
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            {
              width: SCREEN_WIDTH - 48,
              zIndex: 3,
            },
            cardStyle,
          ]}
          className="bg-surface-elevated rounded-xl border border-[rgba(255,255,255,0.06)] p-6"
        >
          {/* Market question */}
          <Text className="text-2xl font-bold text-text-primary text-center leading-9 mb-6">
            {market.question}
          </Text>

          {/* Odds bar */}
          {yesOutcome && noOutcome && (
            <View className="mb-4">
              <View className="flex-row h-2 rounded-full overflow-hidden mb-1">
                <View
                  style={{ flex: yesOutcome.odds }}
                  className="bg-yes"
                />
                <View
                  style={{ flex: noOutcome.odds }}
                  className="bg-no"
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm font-semibold text-yes">
                  YES {yesOutcome.odds}%
                </Text>
                <Text className="text-sm font-semibold text-no">
                  NO {noOutcome.odds}%
                </Text>
              </View>
            </View>
          )}

          {/* Pool info */}
          <View className="flex-row justify-between border-t border-[rgba(255,255,255,0.06)] pt-3">
            <Text className="text-xs font-medium text-text-muted">
              Pool: {market.stakePool.toFixed(1)} SOL
            </Text>
            <Text className="text-xs font-medium text-text-muted">
              {Math.floor(market.timeRemaining / 60)}m remaining
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Swipe hints */}
      <View className="flex-row justify-between w-full px-6 mt-6">
        <Text className="text-sm font-semibold text-no opacity-60">← NO</Text>
        <Text className="text-xs font-medium text-text-muted">Drag to predict</Text>
        <Text className="text-sm font-semibold text-yes opacity-60">YES →</Text>
      </View>
    </View>
  );
}
