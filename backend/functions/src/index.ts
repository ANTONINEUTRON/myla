import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import axios from 'axios';
import { CONFIG } from './config';
import idlData from './idl/myla_program.json';

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

const IDL = {
  ...idlData,
  address: CONFIG.PROGRAM_ID
};

// ─── Helper: Get Anchor Program Instance ─────────────────────────────
function getProgram(connection: Connection, oracleKeypair: Keypair): anchor.Program {
  const wallet = new anchor.Wallet(oracleKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  return new anchor.Program(IDL as any, provider);
}

// ─── Helper: Extract Stat Value from TxODDS scores ──────────────────
function extractStatValue(scoreData: any[], asset: string, targetMinute: number): number {
  if (!scoreData || scoreData.length === 0) return 0;

  // Find the score entry closest to or after the target strike minute
  let targetEntry = scoreData[0];
  let minDiff = 999;

  for (const entry of scoreData) {
    const entryMin = entry.Minute ?? Math.floor((entry.Clock?.Seconds ?? 0) / 60);
    const diff = Math.abs(entryMin - targetMinute);
    if (diff < minDiff) {
      minDiff = diff;
      targetEntry = entry;
    }
  }

  const stats = targetEntry.Stats || {};
  
  // Stats mapping from TxODDS Specifications:
  // 1: Participant 1 (P1) Goals, 2: Participant 2 (P2) Goals
  // 3: P1 Corners, 4: P2 Corners
  // 5: P1 Yellow Cards, 6: P2 Yellow Cards
  // 7: P1 Red Cards, 8: P2 Red Cards
  switch (asset.toLowerCase()) {
    case 'goals': {
      const p1Goals = Number(stats['1'] || 0);
      const p2Goals = Number(stats['2'] || 0);
      return p1Goals + p2Goals;
    }
    case 'corners': {
      const p1Corners = Number(stats['3'] || 0);
      const p2Corners = Number(stats['4'] || 0);
      return p1Corners + p2Corners;
    }
    case 'cards': {
      const p1Yellow = Number(stats['5'] || 0);
      const p2Yellow = Number(stats['6'] || 0);
      const p1Red = Number(stats['7'] || 0);
      const p2Red = Number(stats['8'] || 0);
      return p1Yellow + p2Yellow + p1Red + p2Red;
    }
    default:
      return 0;
  }
}

// ─── Core Execution: Sync & Resolve Pools ────────────────────────────
async function executeSyncAndResolve() {
  const rpcUrl = CONFIG.SOLANA_RPC_URL;
  const oracleSecretKeyString = process.env.ORACLE_PRIVATE_KEY;
  const txOddsApiToken = process.env.TXODDS_API_TOKEN;
  const txOddsJwt = process.env.TXODDS_JWT;
  const txOddsOrigin = process.env.TXODDS_BASE_URL || 'https://txline-dev.txodds.com';

  if (!oracleSecretKeyString) {
    throw new Error('ORACLE_PRIVATE_KEY environment variable is required');
  }

  // Restore Keypair from secret array string
  const secretKey = Uint8Array.from(JSON.parse(oracleSecretKeyString));
  const oracleKeypair = Keypair.fromSecretKey(secretKey);

  const connection = new Connection(rpcUrl, 'confirmed');
  const program = getProgram(connection, oracleKeypair);

  console.log('Fetching all active pools from Solana...');
  const pools = await (program.account as any).pool.all();
  console.log(`Found ${pools.length} total pools on-chain.`);

  const nowSecs = Math.floor(Date.now() / 1000);

  for (const poolWrapper of pools) {
    const poolPubKey = poolWrapper.publicKey;
    const pool = poolWrapper.account as any;

    console.log(`\nProcessing pool: ${poolPubKey.toString()}`);
    console.log(`Match ID: ${pool.matchId}, Asset: ${pool.asset}, Target: ${pool.strikeLevel / 10} at Min ${pool.strikeMinute}`);
    console.log(`Deadline: ${new Date(pool.deadline.toNumber() * 1000).toISOString()}`);
    console.log(`Status: resolved=${pool.resolved}, Over total=${pool.overTotal.toNumber()}, Under total=${pool.underTotal.toNumber()}`);

    // Derive vault PDA address
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolPubKey.toBuffer()],
      program.programId
    );

    // Save/Update Pool info in Firestore
    const poolRef = db.collection('pools').doc(poolPubKey.toString());
    await poolRef.set({
      address: poolPubKey.toString(),
      matchId: pool.matchId,
      asset: pool.asset,
      strikeLevel: pool.strikeLevel,
      strikeMinute: pool.strikeMinute,
      deadline: pool.deadline.toNumber(),
      overTotal: pool.overTotal.toString(),
      underTotal: pool.underTotal.toString(),
      overCount: pool.overCount,
      underCount: pool.underCount,
      resolved: pool.resolved,
      winningSide: pool.winningSide,
      actualValue: pool.actualValue,
      commissionWallet: pool.commissionWallet.toString(),
      oracle: pool.oracle.toString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Fetch and Sync all bets for this pool from Solana
    console.log('Syncing bets to Firestore...');
    const bets = await (program.account as any).bet.all([
      {
        memcmp: {
          offset: 8, // offset of `pool` pubkey field in Bet account layout
          bytes: poolPubKey.toBase58()
        }
      }
    ]);
    console.log(`Found ${bets.length} bets for this pool.`);

    for (const betWrapper of bets) {
      const bet = betWrapper.account as any;
      const betAddress = betWrapper.publicKey.toString();

      await db.collection('bets').doc(betAddress).set({
        address: betAddress,
        poolAddress: poolPubKey.toString(),
        userWallet: bet.user.toString(),
        side: bet.side, // 0 = Over, 1 = Under
        amount: bet.amount.toString(),
        claimed: bet.claimed,
        matchId: pool.matchId,
        asset: pool.asset,
        strikeLevel: pool.strikeLevel,
        strikeMinute: pool.strikeMinute,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Resolve pool if expired and unresolved
    if (!pool.resolved && pool.deadline.toNumber() <= nowSecs) {
      console.log('Pool has expired. Attempting resolution via TxODDS API...');

      if (!txOddsApiToken || !txOddsJwt) {
        console.warn('Skipping resolution: TxODDS credentials not set in environment.');
        continue;
      }

      try {
        // Call TxODDS API to get scores
        const scoreUrl = `${txOddsOrigin}/api/scores/snapshot/${pool.matchId}`;
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${txOddsJwt}`,
          'X-Api-Token': txOddsApiToken
        };

        console.log(`Calling TxODDS scores: ${scoreUrl}`);
        const response = await axios.get(scoreUrl, { headers, timeout: 15_000 });
        const scores = response.data;

        if (scores && scores.length > 0) {
          // Extract actual stat value scaled ×10
          const rawVal = extractStatValue(scores, pool.asset, pool.strikeMinute);
          const scaledVal = rawVal * 10;

          console.log(`TxODDS statistics extracted: ${pool.asset} at Minute ${pool.strikeMinute} = ${rawVal} (Scaled: ${scaledVal})`);

          // Submit ResolvePool transaction to Solana
          console.log('Submitting resolution transaction to Solana...');
          const txSig = await program.methods
            .resolvePool(scaledVal)
            .accounts({
              oracle: oracleKeypair.publicKey,
              pool: poolPubKey,
              vault: vaultPda,
              commissionWallet: pool.commissionWallet,
              systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .signers([oracleKeypair])
            .rpc();

          console.log(`Resolution Transaction confirmed! Signature: ${txSig}`);

          // Update Firestore Pool status
          const winningSide = scaledVal > pool.strikeLevel ? 0 : 1;
          await poolRef.update({
            resolved: true,
            winningSide,
            actualValue: scaledVal,
            resolutionTx: txSig,
            resolvedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Update Firestore Bets status (marking won or lost)
          console.log('Updating bet statuses in Firestore...');
          const batch = db.batch();
          for (const betWrapper of bets) {
            const bet = betWrapper.account as any;
            const betAddress = betWrapper.publicKey.toString();
            const won = bet.side === winningSide;

            batch.update(db.collection('bets').doc(betAddress), {
              status: won ? 'won' : 'lost',
              winningSide,
              actualValue: scaledVal,
              resolvedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          await batch.commit();
          console.log('Firestore bet statuses updated successfully.');
        } else {
          console.warn(`No scores available from TxODDS for Match ID ${pool.matchId} yet.`);
        }
      } catch (err: any) {
        console.error(`Error resolving pool ${poolPubKey.toString()}:`, err?.message || err);
      }
    }
  }
}

// ─── Firebase Cloud Function Exports ────────────────────────────────
export const resolvePoolsHttp = functions.https.onRequest(async (req, res) => {
  // Simple API token check for MVP security
  const token = req.query.token || req.headers.authorization;
  const expectedToken = process.env.ADMIN_TOKEN || 'myla-admin-secret-token';
  
  if (token !== expectedToken && token !== `Bearer ${expectedToken}`) {
    res.status(401).send('Unauthorized');
    return;
  }

  try {
    await executeSyncAndResolve();
    res.status(200).send('Successfully completed sync and resolution cycle.');
  } catch (err: any) {
    console.error('Fatal sync and resolve error:', err);
    res.status(500).send(`Execution failed: ${err?.message || err}`);
  }
});

export const resolvePoolsCron = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    console.log('Cron execution started. Context:', context);
    try {
      await executeSyncAndResolve();
      console.log('Cron execution successfully completed.');
    } catch (err: any) {
      console.error('Fatal cron execution error:', err);
    }
  });

export const getProgramConfig = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  res.status(200).json({
    programId: CONFIG.PROGRAM_ID,
    oracle: CONFIG.ORACLE_ADDRESS,
    commissionWallet: CONFIG.COMMISSION_WALLET,
    commissionRate: CONFIG.COMMISSION_RATE
  });
});

export const getPoolDetails = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { matchId, asset, strikeLevel, strikeMinute } = req.query;

    if (!matchId || !asset || !strikeLevel || !strikeMinute) {
      res.status(400).send('Missing required parameters: matchId, asset, strikeLevel, strikeMinute');
      return;
    }

    const matchIdStr = String(matchId);
    const assetStr = String(asset);
    const strikeLevelNum = Number(strikeLevel);
    const strikeMinuteNum = Number(strikeMinute);

    if (isNaN(strikeLevelNum) || isNaN(strikeMinuteNum)) {
      res.status(400).send('Invalid parameter types: strikeLevel and strikeMinute must be numbers');
      return;
    }

    // Derive Pool PDA
    if (!CONFIG.PROGRAM_ID) {
      res.status(500).send('PROGRAM_ID is not configured in backend environment variables');
      return;
    }
    const programId = new PublicKey(CONFIG.PROGRAM_ID);
    const strikeLevelBuffer = Buffer.alloc(2);
    strikeLevelBuffer.writeUInt16LE(strikeLevelNum, 0);
    const strikeMinuteBuffer = Buffer.from([strikeMinuteNum]);

    const [poolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        Buffer.from(matchIdStr),
        Buffer.from(assetStr),
        strikeLevelBuffer,
        strikeMinuteBuffer
      ],
      programId
    );

    const poolAddress = poolPda.toString();

    // Query Firestore
    const poolDoc = await db.collection('pools').doc(poolAddress).get();

    if (!poolDoc.exists) {
      // Default uninitialized response
      res.status(200).json({
        address: poolAddress,
        exists: false,
        matchId: matchIdStr,
        asset: assetStr,
        strikeLevel: strikeLevelNum,
        strikeMinute: strikeMinuteNum,
        overCount: 0,
        underCount: 0,
        overTotal: '0',
        underTotal: '0',
        resolved: false,
        winningSide: null,
        actualValue: null,
        calculatedPayouts: {
          over: 1.0,
          under: 1.0
        }
      });
      return;
    }

    const poolData = poolDoc.data()!;
    const overTotalStr = poolData.overTotal || '0';
    const underTotalStr = poolData.underTotal || '0';
    const overTotalNum = Number(overTotalStr);
    const underTotalNum = Number(underTotalStr);
    const totalPool = overTotalNum + underTotalNum;

    // Default Commission Rate: 5% (500 bps)
    const commissionRate = poolData.commissionRate || 500;
    const netPool = totalPool * (1 - commissionRate / 10000);

    let overPayout = 1.0;
    let underPayout = 1.0;

    if (overTotalNum > 0) {
      overPayout = netPool / overTotalNum;
    }
    if (underTotalNum > 0) {
      underPayout = netPool / underTotalNum;
    }

    res.status(200).json({
      address: poolAddress,
      exists: true,
      matchId: poolData.matchId,
      asset: poolData.asset,
      strikeLevel: poolData.strikeLevel,
      strikeMinute: poolData.strikeMinute,
      deadline: poolData.deadline,
      overCount: poolData.overCount || 0,
      underCount: poolData.underCount || 0,
      overTotal: overTotalStr,
      underTotal: underTotalStr,
      resolved: poolData.resolved || false,
      winningSide: poolData.winningSide !== undefined ? poolData.winningSide : null,
      actualValue: poolData.actualValue !== undefined ? poolData.actualValue : null,
      calculatedPayouts: {
        over: Number(overPayout.toFixed(4)),
        under: Number(underPayout.toFixed(4))
      }
    });
  } catch (err: any) {
    console.error('Error fetching pool details:', err);
    res.status(500).send(`Internal Server Error: ${err?.message || err}`);
  }
});

/**
 * HTTPS Cloud Function: Join early-access waitlist.
 * Expects JSON body: { name: string, email: string }
 */
export const joinWaitlist = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed. Use POST.');
    return;
  }

  try {
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).send('Missing name or email in request body.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      res.status(400).send('Invalid email format.');
      return;
    }

    const cleanedEmail = String(email).trim().toLowerCase();
    const cleanedName = String(name).trim();

    const waitlistRef = db.collection('waitlist').doc(cleanedEmail);
    const doc = await waitlistRef.get();

    if (doc.exists) {
      res.status(200).json({ success: true, message: 'You are already registered on the waitlist!' });
      return;
    }

    await waitlistRef.set({
      name: cleanedName,
      email: cleanedEmail,
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ success: true, message: 'Successfully joined the waitlist!' });
  } catch (err: any) {
    console.error('Error joining waitlist:', err);
    res.status(500).send(`Internal Server Error: ${err?.message || err}`);
  }
});



