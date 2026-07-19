import * as functions from 'firebase-functions';
import { CONFIG } from '../config';

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
    oracleAddress: CONFIG.ORACLE_ADDRESS,
    commissionWallet: CONFIG.COMMISSION_WALLET,
    commissionRate: CONFIG.COMMISSION_RATE
  });
});
