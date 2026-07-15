/**
 * ActivatingScreen — Phase 6.5b
 *
 * Shown after wallet connect on first launch.
 * Runs the TxODDS free-tier subscribe + activate flow automatically.
 *
 * UX:
 *  - Short description + info button (opens detail modal)
 *  - 3 animated steps (spinner -> checkmark as each completes)
 *  - "Skip for now" skips activation and uses seed data
 *  - Auto-proceeds to feed on success
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../theme';
import {
  performFreeActivation,
  isActivationCurrent,
  ActivationStep,
} from '../services/txoddsActivation';

// ── Types ─────────────────────────────────────────────────────────

interface ActivatingScreenProps {
  walletAddress: string;
  authToken: string | null;
  onDone: () => void; // Called when activated OR skipped
}

// ── Step config ───────────────────────────────────────────────────

const STEPS = [
  {
    id: 'connect',
    label: 'Connecting to TxODDS',
    sub: 'Getting secure API access',
    activationSteps: ['jwt'] as ActivationStep[],
  },
  {
    id: 'subscribe',
    label: 'Signing Solana transaction',
    sub: 'Free registration · ~0.001 SOL gas',
    activationSteps: ['building_tx', 'signing_tx', 'confirming'] as ActivationStep[],
  },
  {
    id: 'activate',
    label: 'Activating live data feed',
    sub: 'World Cup odds & scores unlocked',
    activationSteps: ['signing_message', 'activating'] as ActivationStep[],
  },
];

function stepIndexFromActivation(step: ActivationStep): number {
  if (['jwt'].includes(step)) return 0;
  if (['building_tx', 'signing_tx', 'confirming'].includes(step)) return 1;
  if (['signing_message', 'activating'].includes(step)) return 2;
  if (step === 'done') return 3;
  return -1;
}

// ── Step row ──────────────────────────────────────────────────────

function StepRow({
  label,
  sub,
  state,
}: {
  label: string;
  sub: string;
  state: 'pending' | 'active' | 'done' | 'error';
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'active') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  const iconColor =
    state === 'done'
      ? '#30D158'
      : state === 'error'
      ? '#FF453A'
      : state === 'active'
      ? THEME.colors.primary.DEFAULT
      : '#48484A';

  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepIcon, { borderColor: iconColor }]}>
        {state === 'active' ? (
          <Animated.View style={{ opacity: pulseAnim }}>
            <ActivityIndicator size="small" color={THEME.colors.primary.DEFAULT} />
          </Animated.View>
        ) : state === 'done' ? (
          <Ionicons name="checkmark" size={18} color="#30D158" />
        ) : state === 'error' ? (
          <Ionicons name="close" size={18} color="#FF453A" />
        ) : (
          <View style={styles.stepDot} />
        )}
      </View>

      <View style={styles.stepText}>
        <Text style={[styles.stepLabel, state === 'pending' && styles.stepLabelMuted]}>
          {label}
        </Text>
        <Text style={styles.stepSub}>{sub}</Text>
      </View>
    </View>
  );
}

// ── Info modal ────────────────────────────────────────────────────

function InfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Ionicons name="information-circle" size={22} color={THEME.colors.primary.DEFAULT} />
            <Text style={styles.modalTitle}>About Free Data Access</Text>
          </View>

          <Text style={styles.modalBody}>
            We're registering your wallet for the{' '}
            <Text style={styles.modalHighlight}>TxODDS free World Cup tier</Text> via Solana —
            the same data feed used by professional sportsbooks.
          </Text>

          <View style={styles.modalDivider} />

          {[
            { icon: 'cash-outline', text: 'Cost: ~0.001 SOL in network fees (no TxL tokens needed)' },
            { icon: 'time-outline', text: 'Valid for 4 weeks, auto-renews next session' },
            { icon: 'football-outline', text: 'Covers all World Cup 2026 matches + live odds' },
            { icon: 'lock-closed-outline', text: 'Non-custodial · no personal data stored' },
            { icon: 'shield-checkmark-outline', text: 'Free tier provided by TxODDS, powered by Solana mainnet' },
          ].map(({ icon, text }, i) => (
            <View key={i} style={styles.modalRow}>
              <Ionicons name={icon as any} size={16} color={THEME.colors.primary.DEFAULT} />
              <Text style={styles.modalRowText}>{text}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export default function ActivatingScreen({
  walletAddress,
  authToken,
  onDone,
}: ActivatingScreenProps) {
  const [currentStep, setCurrentStep] = useState<ActivationStep>('idle');
  const [infoVisible, setInfoVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Entrance animation
  const enterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enterAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto-proceed when done
  useEffect(() => {
    if (currentStep === 'done') {
      const t = setTimeout(() => onDone(), 1200);
      return () => clearTimeout(t);
    }
  }, [currentStep, onDone]);

  // Kick off activation on mount or retry
  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Already activated? Skip straight through
      if (await isActivationCurrent()) {
        if (!cancelled) onDone();
        return;
      }

      const success = await performFreeActivation(
        walletAddress,
        authToken,
        (step) => { if (!cancelled) setCurrentStep(step); },
      );

      if (cancelled) return;
      if (!success) setFailed(true);
    }

    run();
    return () => { cancelled = true; };
  }, [walletAddress, authToken, retryTrigger]);

  const handleRetry = async () => {
    setFailed(false);
    setCurrentStep('idle');
    try {
      // Clear stored TxODDS API credentials so next request gets a fresh start
      await AsyncStorage.multiRemove([
        '@myla/txodds_jwt',
        '@myla/txodds_api_token',
        '@myla/txodds_activated_at',
      ]);
    } catch (e) {
      console.warn('Failed to clear tokens on retry:', e);
    }
    setRetryTrigger((prev) => prev + 1);
  };

  // Derive step UI states
  const activeIndex = stepIndexFromActivation(currentStep);

  const stepStates = STEPS.map((_, i) => {
    if (currentStep === 'done') return 'done';
    if (i < activeIndex) return 'done';
    if (i === activeIndex) return 'active';
    return 'pending';
  }) as Array<'pending' | 'active' | 'done' | 'error'>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Background glow */}
      <View style={styles.bgGlow} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: enterAnim,
            transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}
      >
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="football" size={36} color={THEME.colors.primary.DEFAULT} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Setting Up{'\n'}Live Data</Text>

        {/* ── Short description + info button ── */}
        <View style={styles.descriptionRow}>
          <Text style={styles.description}>
            One-time free World Cup access
          </Text>
          <TouchableOpacity
            onPress={() => setInfoVisible(true)}
            style={styles.infoButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="More information about data access"
          >
            <Ionicons name="information-circle-outline" size={18} color={THEME.colors.primary.DEFAULT} />
          </TouchableOpacity>
        </View>

        {/* Steps */}
        <View style={styles.stepsCard}>
          {STEPS.map((step, i) => (
            <StepRow
              key={step.id}
              label={step.label}
              sub={step.sub}
              state={stepStates[i]}
            />
          ))}
        </View>

        {/* Status message */}
        {currentStep === 'done' && (
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#30D158" />
            <Text style={styles.successText}>Live data activated!</Text>
          </View>
        )}

        {failed && (
          <View style={styles.failedContainer}>
            <Text style={styles.failedText}>
              Activation failed. Please check your connection and try again.
            </Text>
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.retryButtonText}>Retry Activation</Text>
            </TouchableOpacity>
          </View>
        )}

       </Animated.View>

      {/* Info modal */}
      <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGlow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: THEME.colors.primary.glow,
    opacity: 0.35,
  },
  content: {
    width: '100%',
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 10,
  },

  // ── Description row ──
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  description: {
    fontSize: 15,
    color: THEME.colors.text.secondary,
  },
  infoButton: {
    padding: 2,
  },

  // ── Steps ──
  stepsCard: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#48484A',
  },
  stepText: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text.primary,
  },
  stepLabelMuted: {
    color: THEME.colors.text.muted,
  },
  stepSub: {
    fontSize: 12,
    color: THEME.colors.text.muted,
    marginTop: 2,
  },

  // ── Status ──
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#30D158',
  },
  errorText: {
    fontSize: 13,
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  skipButton: {
    marginTop: 4,
  },
  skipText: {
    fontSize: 14,
    color: THEME.colors.text.muted,
    textDecorationLine: 'underline',
  },

  // ── Info modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text.primary,
  },
  modalBody: {
    fontSize: 14,
    color: THEME.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalHighlight: {
    color: THEME.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.colors.border,
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  modalRowText: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.text.secondary,
    lineHeight: 18,
  },
  modalClose: {
    marginTop: 16,
    backgroundColor: THEME.colors.primary.DEFAULT,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  failedContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  failedText: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.primary.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
