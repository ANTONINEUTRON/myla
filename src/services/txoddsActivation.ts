/**
 * txoddsActivation — Phase 6.5b
 *
 * Performs the TxODDS free-tier on-chain subscribe + activate flow.
 * Called once on first wallet connect; result cached in AsyncStorage for 4 weeks.
 *
 * Flow:
 *  1. Ensure guest JWT exists
 *  2. Build subscribe instruction (Solana tx, Service Level 1, free)
 *  3. Open MWA session → sign tx → confirm on chain
 *  4. Sign activation message via MWA signMessages
 *  5. POST /api/token/activate → live data unlocked
 *
 * Everything is wrapped in try/catch — failure means seed data continues.
 */

import { Buffer } from 'buffer';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { txoddsService } from './txodds';
import { CONFIG } from '../config';

// ── Devnet config ────────────────────────────────────────────────
const RPC_URL = CONFIG.SOLANA_RPC_URL;
const PROGRAM_ID = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');
const TXL_TOKEN_MINT = new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG');
const SERVICE_LEVEL_ID = 1;  // World Cup + Int Friendlies (60s delay, free)
const DURATION_WEEKS = 4;    // Minimum subscription unit

// ── Storage ───────────────────────────────────────────────────────
const STORAGE_KEY_ACTIVATED_AT = '@myla/txodds_activated_at';
const ACTIVATION_TTL_MS = 28 * 24 * 60 * 60 * 1000; // 28 days = 4 weeks

// ── Types ─────────────────────────────────────────────────────────
export type ActivationStep =
  | 'idle'
  | 'jwt'
  | 'building_tx'
  | 'signing_tx'
  | 'confirming'
  | 'signing_message'
  | 'activating'
  | 'done'
  | 'failed';

export type ActivationProgressCallback = (step: ActivationStep) => void;

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Check if the user's activation is still within the 4-week window.
 */
export async function isActivationCurrent(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ACTIVATED_AT);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < ACTIVATION_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Compute the 8-byte Anchor instruction discriminator.
 * Formula: sha256("global:" + instructionName)[0:8]
 */
function computeDiscriminator(instructionName: string): Uint8Array {
  if (instructionName === 'subscribe') {
    // sha256("global:subscribe")[0:8]
    return new Uint8Array([0xfe, 0x1c, 0xbf, 0x8a, 0x9c, 0xb3, 0xb7, 0x35]);
  }
  throw new Error(`Unsupported instruction: ${instructionName}`);
}

// ── Main export ───────────────────────────────────────────────────

/**
 * Perform the full TxODDS free-tier subscribe + activate flow.
 *
 * @param walletAddress  base64-encoded Solana public key from MWA
 * @param mwaAuthToken   MWA auth token for re-opening the wallet session
 * @param onProgress     callback for UI step updates
 * @returns true if live data is now available, false if seed data should be used
 */
export async function performFreeActivation(
  walletAddress: string,
  mwaAuthToken: string | null,
  onProgress: ActivationProgressCallback = () => {},
): Promise<boolean> {

  // ── Guard: only on Android with a live MWA session ───────────────
  if (Platform.OS !== 'android' || !mwaAuthToken) {
    console.log('[Activation] Skipping — not Android or no auth token');
    return false;
  }

  // ── Guard: already activated within 4 weeks ───────────────────────
  if ((await isActivationCurrent()) && txoddsService.isActivated) {
    console.log('[Activation] Already current — skipping re-activation');
    onProgress('done');
    return true;
  }

  try {
    // ─── Step 1: Ensure guest JWT ───────────────────────────────────
    onProgress('jwt');

    // Make sure the txodds service has a guest session
    if (!txoddsService.getJwt()) {
      await txoddsService.initGuestSession();
    }
    const jwt = txoddsService.getJwt();
    if (!jwt) throw new Error('Could not obtain TxODDS guest JWT');

    // ─── Step 2: Build the subscribe instruction ────────────────────
    onProgress('building_tx');

    // Anchor instruction discriminator: sha256("global:subscribe")[0:8]
    const discriminator = computeDiscriminator('subscribe');

    // Borsh-encode args: u16 serviceLevelId, u8 durationWeeks
    const ixData = Buffer.alloc(11);
    discriminator.forEach((byte, i) => ixData.writeUInt8(byte, i));
    ixData.writeUInt16LE(SERVICE_LEVEL_ID, 8);
    ixData.writeUInt8(DURATION_WEEKS, 10);

    // Derive PDAs
    const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_treasury_v2')],
      PROGRAM_ID,
    );
    const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pricing_matrix')],
      PROGRAM_ID,
    );

    // User public key (MWA gives base64 of the 32 raw bytes)
    const userPublicKey = new PublicKey(Buffer.from(walletAddress, 'base64'));

    // Token accounts (Token-2022)
    const userTokenAccount = getAssociatedTokenAddressSync(
      TXL_TOKEN_MINT,
      userPublicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const tokenTreasuryVault = getAssociatedTokenAddressSync(
      TXL_TOKEN_MINT,
      tokenTreasuryPda,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    // Idempotent ATA creation (no-op if already exists; required for free tier)
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      userPublicKey,
      userTokenAccount,
      userPublicKey,
      TXL_TOKEN_MINT,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const subscribeIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: userPublicKey,         isSigner: true,  isWritable: true  },
        { pubkey: pricingMatrixPda,      isSigner: false, isWritable: false },
        { pubkey: TXL_TOKEN_MINT,        isSigner: false, isWritable: false },
        { pubkey: userTokenAccount,      isSigner: false, isWritable: true  },
        { pubkey: tokenTreasuryVault,    isSigner: false, isWritable: true  },
        { pubkey: tokenTreasuryPda,      isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: ixData,
    });

    const connection = new Connection(RPC_URL, 'confirmed');
    const { blockhash } = await connection.getLatestBlockhash();

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPublicKey;
    tx.add(createAtaIx, subscribeIx);

    const serializedTx = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

    // ─── Step 3: Sign tx via MWA ────────────────────────────────────
    onProgress('signing_tx');

    // Dynamic import so iOS/web don't crash on missing native module
    const { transact } = await import('@solana-mobile/mobile-wallet-adapter-protocol');

    const activationMessage = `${''/* txSig placeholder */}::${jwt}`;
    let txSig: string;
    let signatureBase64: string;

    await transact(async (wallet: any) => {
      let authResult;
      try {
        authResult = await wallet.authorize({
          auth_token: mwaAuthToken,
          identity: { name: 'MYLA', uri: 'https://symbal.fun', icon: 'favicon.ico' },
          chain: 'solana:devnet',
        });
      } catch (authError) {
        console.warn('[Activation] Token authorization failed, attempting fresh authorization:', authError);
        authResult = await wallet.authorize({
          identity: { name: 'MYLA', uri: 'https://symbal.fun', icon: 'favicon.ico' },
          chain: 'solana:devnet',
        });

        if (authResult?.auth_token) {
          const base64Address = authResult.accounts[0].address;
          await AsyncStorage.setItem('myla_wallet_address', base64Address);
          await AsyncStorage.setItem('myla_wallet_auth_token', authResult.auth_token);
        }
      }

      // Sign the subscribe transaction
      const signResult = await wallet.signTransactions({
        payloads: [Buffer.from(serializedTx).toString('base64')],
      });
      const signedTx = Transaction.from(Buffer.from(signResult.signed_payloads[0], 'base64'));

      // ─── Step 4: Confirm on chain ──────────────────────────────────
      onProgress('confirming');
      txSig = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txSig, 'confirmed');
      console.log('[Activation] Subscribe tx confirmed:', txSig);

      // ─── Step 5: Sign activation message ──────────────────────────
      onProgress('signing_message');
      const msgBytes = Buffer.from(`${txSig}::${jwt}`, 'utf8');
      const msgResult = await wallet.signMessages({
        addresses: [walletAddress],
        payloads: [msgBytes.toString('base64')],
      });

      // MWA returns signed_payloads where first 64 bytes are the signature
      const signedPayload = Buffer.from(msgResult.signed_payloads[0], 'base64');
      const sigBytes = signedPayload.length === 64
        ? signedPayload
        : signedPayload.slice(0, 64);

      signatureBase64 = Buffer.from(sigBytes).toString('base64');
    });

    // ─── Step 6: Activate via TxODDS API ─────────────────────────────
    onProgress('activating');
    const activated = await txoddsService.activateSubscription(txSig!, signatureBase64!, []);

    if (!activated) throw new Error('Activation API returned failure');

    // Cache activation timestamp
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVATED_AT, Date.now().toString());
    onProgress('done');
    return true;

  } catch (err: any) {
    console.log('[Activation] Failed:', err);
    onProgress('failed');
    return false;
  }
}
