import * as functions from 'firebase-functions';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import axios from 'axios';
import { CONFIG } from '../config';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebase';
import { getProgram } from '../helpers/solana';
import { extractStatValue } from '../helpers/scores';

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
      updatedAt: FieldValue.serverTimestamp()
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
        updatedAt: FieldValue.serverTimestamp()
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
            })
            .signers([oracleKeypair])
            .rpc();

          console.log(`Pool resolved successfully. Signature: ${txSig}`);
        }
      } catch (err: any) {
        console.error(`Error resolving pool ${poolPubKey.toString()}:`, err?.message || err);
      }
    }
  }
}

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
