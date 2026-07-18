import * as functions from 'firebase-functions';
import { PublicKey } from '@solana/web3.js';
import { CONFIG } from '../config';
import { db } from '../firebase';

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
