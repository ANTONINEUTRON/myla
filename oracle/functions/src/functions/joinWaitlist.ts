import * as functions from 'firebase-functions';
import { db, admin } from '../firebase';

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
    const { name, email, walletAddress } = req.body;

    if (!name || !email) {
      res.status(400).send('Missing name or email in request body.');
      return;
    }

    // IP-based Rate Limiter (Max 3 submissions per 58 minutes per IP)
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const cleanIpKey = String(clientIp).replace(/[^a-zA-Z0-9]/g, '_');
    const ipLimitRef = db.collection('waitlist_rate_limits').doc(cleanIpKey);
    
    const limitDoc = await ipLimitRef.get();
    const nowMs = Date.now();
    const windowMs = 58 * 60 * 1000;
    let timestamps: number[] = [];

    if (limitDoc.exists) {
      const data = limitDoc.data()!;
      const rawTimestamps = data.timestamps || [];
      timestamps = rawTimestamps.filter((t: number) => nowMs - t < windowMs);
    }

    if (timestamps.length >= 3) {
      res.status(429).send('Too many waitlist requests from this IP. Please try again in 15 minutes.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      res.status(400).send('Invalid email format.');
      return;
    }

    // Solana Wallet Address (optional) validation
    let cleanedWallet = '';
    if (walletAddress !== undefined && walletAddress !== null) {
      cleanedWallet = String(walletAddress).trim();
      if (cleanedWallet) {
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        if (!base58Regex.test(cleanedWallet)) {
          res.status(400).send('Invalid Solana wallet address format.');
          return;
        }
      }
    }

    const cleanedEmail = String(email).trim().toLowerCase();
    const cleanedName = String(name).trim();

    const waitlistRef = db.collection('waitlist').doc(cleanedEmail);
    const doc = await waitlistRef.get();

    if (doc.exists) {
      res.status(400).send('This email address is already registered on the waitlist.');
      return;
    }

    // Record submission timestamp for rate limiter
    timestamps.push(nowMs);
    await ipLimitRef.set({ timestamps });

    // Store waitlist record in Firestore
    await waitlistRef.set({
      name: cleanedName,
      email: cleanedEmail,
      walletAddress: cleanedWallet || null,
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ success: true, message: 'Successfully joined the waitlist!' });
  } catch (err: any) {
    console.error('Error joining waitlist:', err);
    res.status(500).send(`Internal Server Error: ${err?.message || err}`);
  }
});
