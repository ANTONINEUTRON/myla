import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketType } from '../types';

const MARKET_OPTIONS: { type: MarketType; label: string }[] = [
  { type: 'NEXT_GOAL_TIMER', label: 'Goals' },
  { type: 'NEXT_CORNER', label: 'Corners' },
  { type: 'NEXT_CARD', label: 'Cards' },
  { type: 'GOALS_OVER_UNDER', label: 'O/U' },
  { type: 'NEXT_SUBSTITUTION', label: 'Subs' },
];

const LABEL_MAP: Record<MarketType, string> = {
  NEXT_GOAL_TIMER: 'Goals',
  NEXT_CORNER: 'Corners',
  NEXT_CARD: 'Cards',
  GOALS_OVER_UNDER: 'O/U',
  NEXT_SUBSTITUTION: 'Subs',
  PLAYER_NEXT_GOAL: 'Player',
};

interface MarketDropdownProps {
  selectedType: MarketType;
  onSelect: (type: MarketType) => void;
}

export default function MarketDropdown({
  selectedType,
  onSelect,
}: MarketDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        className="flex-row items-center gap-1 bg-surface-elevated px-4 py-2.5 rounded-full border border-[rgba(255,255,255,0.06)]"
      >
        <Text className="text-sm font-semibold text-text-primary">
          {LABEL_MAP[selectedType]}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-center items-center"
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View className="w-3/4 bg-surface-elevated rounded-xl border border-[rgba(255,255,255,0.06)] py-4">
            <Text className="text-xs font-semibold text-text-muted uppercase tracking-wider px-4 mb-2">
              Market Type
            </Text>
            {MARKET_OPTIONS.map((option) => {
              const isActive = option.type === selectedType;
              return (
                <TouchableOpacity
                  key={option.type}
                  onPress={() => {
                    onSelect(option.type);
                    setOpen(false);
                  }}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    isActive ? 'bg-primary-glow' : ''
                  }`}
                >
                  <Text
                    className={`text-base ${
                      isActive
                        ? 'text-primary font-bold'
                        : 'text-text-primary font-medium'
                    }`}
                  >
                    {option.label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={18} color="#FF6B35" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
