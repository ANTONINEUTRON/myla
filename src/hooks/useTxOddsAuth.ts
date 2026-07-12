/**
 * useTxOddsAuth — Phase 6.5
 *
 * Manages the TxODDS authentication lifecycle:
 *  1. On mount: checks AsyncStorage for cached JWT + API token
 *  2. If no JWT: auto-calls POST /auth/guest/start
 *  3. Exposes authState and activateSubscription()
 */

import { useState, useEffect, useCallback } from 'react';
import { txoddsService } from '../services/txodds';

export type TxOddsAuthState = 'loading' | 'guest' | 'activated' | 'error';

export function useTxOddsAuth() {
  const [authState, setAuthState] = useState<TxOddsAuthState>('loading');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const ok = await txoddsService.initGuestSession();
        if (cancelled) return;

        if (!ok) {
          // Failed to get guest JWT — seed data still used as fallback
          setAuthState('error');
          return;
        }

        setAuthState(txoddsService.isActivated ? 'activated' : 'guest');
      } catch (e) {
        if (!cancelled) setAuthState('error');
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  /**
   * Activate a subscription after the user has signed the on-chain subscribe tx.
   * @param txSig - Confirmed Solana transaction signature
   * @param walletSignature - Base64-encoded wallet signature of `${txSig}::${jwt}`
   * @param leagues - Empty array for standard World Cup bundle
   */
  const activateSubscription = useCallback(
    async (txSig: string, walletSignature: string, leagues: number[] = []) => {
      setAuthState('loading');
      const ok = await txoddsService.activateSubscription(txSig, walletSignature, leagues);
      setAuthState(ok ? 'activated' : 'guest');
      return ok;
    },
    [],
  );

  return {
    authState,
    /** True once auth is settled (guest, activated, or errored out) */
    isReady: authState === 'guest' || authState === 'activated' || authState === 'error',
    isActivated: authState === 'activated',
    activateSubscription,
  };
}
