import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { THEME } from '../theme';

interface CustomStakeModalProps {
  visible: boolean;
  onClose: () => void;
  stake: number;
  setStake: (val: number) => void;
}

export default function CustomStakeModal({
  visible,
  onClose,
  stake,
  setStake,
}: CustomStakeModalProps) {
  const [customInput, setCustomInput] = useState('');

  // Sync state when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Check if current stake is a custom value (not preset) and populate input
      const presetsList = [0.05, 0.1, 0.25, 0.5, 1.0];
      const isCustom = !presetsList.includes(stake);
      setCustomInput(isCustom ? stake.toString() : '');
    }
  }, [visible, stake]);

  const handleConfirm = () => {
    const val = parseFloat(customInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Stake', 'Please enter a valid positive number.');
      return;
    }
    if (val < 0.01) {
      Alert.alert('Invalid Stake', 'Minimum stake is 0.01 SOL.');
      return;
    }
    setStake(val);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Enter Custom Stake</Text>
          <Text style={styles.modalSubtitle}>Specify amount of SOL to stake</Text>

          <TextInput
            style={styles.modalInput}
            keyboardType="numeric"
            placeholder="e.g. 0.15"
            placeholderTextColor="#8E8E93"
            value={customInput}
            onChangeText={setCustomInput}
            autoFocus={true}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={onClose}
            >
              <Text style={styles.modalBtnCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSet]}
              onPress={handleConfirm}
            >
              <Text style={styles.modalBtnSetTxt}>Set Stake</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: THEME.colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: THEME.colors.text.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    padding: 12,
    color: THEME.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalBtnCancelTxt: {
    color: THEME.colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalBtnSet: {
    backgroundColor: THEME.colors.primary.DEFAULT,
  },
  modalBtnSetTxt: {
    color: THEME.colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
});
