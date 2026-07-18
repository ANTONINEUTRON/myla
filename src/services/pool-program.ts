import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import idlData from '../idl/myla_program.json';
import { CONFIG } from '../config';

// Program Configuration type and mutable state
export interface ProgramConfig {
  programId: string;
  oracle: string | null;
  commissionWallet: string | null;
  commissionRate: number | null;
}

export let programConfig: ProgramConfig = {
  programId: CONFIG.PROGRAM_ID,
  oracle: null,
  commissionWallet: null,
  commissionRate: null,
};

// Dynamic helper getters
export function getProgramId(): PublicKey {
  return new PublicKey(programConfig.programId);
}

export function getOracle(): PublicKey | null {
  return programConfig.oracle ? new PublicKey(programConfig.oracle) : null;
}

export function getCommissionWallet(): PublicKey | null {
  return programConfig.commissionWallet ? new PublicKey(programConfig.commissionWallet) : null;
}

export function getCommissionRate(): number | null {
  return programConfig.commissionRate;
}

// Set up a read-only Provider for building transaction instructions client-side
const readOnlyConnection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');
const mockWallet = {
  publicKey: PublicKey.default,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any) => txs,
};

const provider = new AnchorProvider(readOnlyConnection, mockWallet as any, {
  commitment: 'confirmed',
});

// Anchor Program wrapper for building instructions and parsing data.
// Use let so it can be re-instantiated if programId changes dynamically.
export let poolProgram = new Program({ ...idlData, address: programConfig.programId } as any, provider);

export function updateProgramConfig(newConfig: Partial<ProgramConfig>) {
  programConfig = { ...programConfig, ...newConfig };
  poolProgram = new Program({ ...idlData, address: programConfig.programId } as any, provider);
}

/**
 * Fetches the program configuration from the backend.
 * This should be called when the app is initialized/opened.
 */
export async function initializeProgramConfig(): Promise<void> {
  try {
    const url = `${CONFIG.FIREBASE_FUNCTIONS_URL}/getProgramConfig`;
    console.log(`[poolProgramService] Fetching program config from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('[poolProgramService] Loaded config from backend:', data);
    
    updateProgramConfig({
      programId: data.programId,
      oracle: data.oracle,
      commissionWallet: data.commissionWallet,
      commissionRate: data.commissionRate,
    });
  } catch (err) {
    console.warn('[poolProgramService] Failed to load program config from backend, using defaults:', err);
  }
}

/**
 * Derives the deterministic PDA for a pool.
 * Seeds: ["pool", matchId, asset, strikeLevel (u16 LE), strikeMinute (u8)]
 */
export function derivePoolPda(
  matchId: string,
  asset: string,
  strikeLevel: number,
  strikeMinute: number
): [PublicKey, number] {
  const levelBuffer = Buffer.alloc(2);
  levelBuffer.writeUInt16LE(strikeLevel);

  const minuteBuffer = Buffer.from([strikeMinute]);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('pool'),
      Buffer.from(matchId),
      Buffer.from(asset),
      levelBuffer,
      minuteBuffer,
    ],
    getProgramId()
  );
}

/**
 * Derives the deterministic PDA for a user's bet on a pool.
 * Seeds: ["bet", poolPda, userPubkey]
 */
export function deriveBetPda(poolPda: PublicKey, userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('bet'),
      poolPda.toBuffer(),
      userPubkey.toBuffer(),
    ],
    getProgramId()
  );
}

/**
 * Derives the deterministic PDA for the vault associated with a pool.
 * Seeds: ["vault", poolPda]
 */
export function deriveVaultPda(poolPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      poolPda.toBuffer(),
    ],
    getProgramId()
  );
}

/**
 * Checks if a pool account exists on the blockchain.
 */
export async function checkPoolExists(
  connection: Connection,
  poolPda: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(poolPda);
    return accountInfo !== null;
  } catch (err) {
    console.warn('[poolProgramService] Error checking pool existence:', err);
    return false;
  }
}

/**
 * Builds the createPool instruction.
 */
export async function buildCreatePoolInstruction(
  creator: PublicKey,
  matchId: string,
  asset: string,
  strikeLevel: number,
  strikeMinute: number,
  deadline: number, // Unix timestamp in seconds
  commissionRate: number | null = getCommissionRate(),
  oracle: PublicKey | null = getOracle(),
  commissionWallet: PublicKey | null = getCommissionWallet()
): Promise<TransactionInstruction> {
  const [poolPda] = derivePoolPda(matchId, asset, strikeLevel, strikeMinute);

  if (oracle === null || commissionWallet === null || commissionRate === null) {
    throw new Error('[poolProgramService] Program configuration has not been loaded from the backend yet.');
  }

  return await poolProgram.methods
    .createPool(
      matchId,
      asset,
      strikeLevel,
      strikeMinute,
      new BN(deadline),
      commissionRate
    )
    .accounts({
      creator,
      pool: poolPda,
      oracle,
      commissionWallet,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();
}

/**
 * Builds the placeBet instruction.
 */
export async function buildPlaceBetInstruction(
  user: PublicKey,
  poolPda: PublicKey,
  side: number, // 0 = Over, 1 = Under
  amountLamports: number | BN
): Promise<TransactionInstruction> {
  const [betPda] = deriveBetPda(poolPda, user);
  const [vaultPda] = deriveVaultPda(poolPda);

  const amountBN = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;

  return await poolProgram.methods
    .placeBet(side, amountBN)
    .accounts({
      user,
      pool: poolPda,
      bet: betPda,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();
}

/**
 * Builds the claimWinnings instruction.
 */
export async function buildClaimWinningsInstruction(
  user: PublicKey,
  poolPda: PublicKey
): Promise<TransactionInstruction> {
  const [betPda] = deriveBetPda(poolPda, user);
  const [vaultPda] = deriveVaultPda(poolPda);

  return await poolProgram.methods
    .claimWinnings()
    .accounts({
      user,
      pool: poolPda,
      bet: betPda,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();
}

/**
 * Builds the refund instruction.
 */
export async function buildRefundInstruction(
  user: PublicKey,
  poolPda: PublicKey
): Promise<TransactionInstruction> {
  const [betPda] = deriveBetPda(poolPda, user);
  const [vaultPda] = deriveVaultPda(poolPda);

  return await poolProgram.methods
    .refund()
    .accounts({
      user,
      pool: poolPda,
      bet: betPda,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();
}

/**
 * Utility to atomically pack create_pool (if pool does not exist) and place_bet
 * into a single transaction.
 */
export async function buildAtomicBetTransaction(
  connection: Connection,
  user: PublicKey,
  matchId: string,
  asset: string,
  strikeLevel: number,
  strikeMinute: number,
  deadline: number,
  side: number,
  amountLamports: number | BN,
  commissionRate: number | null = getCommissionRate(),
  oracle: PublicKey | null = getOracle(),
  commissionWallet: PublicKey | null = getCommissionWallet()
): Promise<Transaction> {
  const [poolPda] = derivePoolPda(matchId, asset, strikeLevel, strikeMinute);
  const poolExists = await checkPoolExists(connection, poolPda);

  const tx = new Transaction();

  if (!poolExists) {
    console.log(`[poolProgramService] Pool does not exist. Prepending createPool...`);
    const createPoolInstruction = await buildCreatePoolInstruction(
      user,
      matchId,
      asset,
      strikeLevel,
      strikeMinute,
      deadline,
      commissionRate,
      oracle,
      commissionWallet
    );
    tx.add(createPoolInstruction);
  }

  const placeBetInstruction = await buildPlaceBetInstruction(
    user,
    poolPda,
    side,
    amountLamports
  );
  tx.add(placeBetInstruction);

  tx.feePayer = user;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;

  return tx;
}
