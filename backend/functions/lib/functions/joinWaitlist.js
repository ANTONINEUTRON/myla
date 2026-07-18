"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinWaitlist = void 0;
const functions = __importStar(require("firebase-functions"));
const firebase_1 = require("../firebase");
exports.joinWaitlist = functions.https.onRequest(async (req, res) => {
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
        const ipLimitRef = firebase_1.db.collection('waitlist_rate_limits').doc(cleanIpKey);
        const limitDoc = await ipLimitRef.get();
        const nowMs = Date.now();
        const windowMs = 58 * 60 * 1000;
        let timestamps = [];
        if (limitDoc.exists) {
            const data = limitDoc.data();
            const rawTimestamps = data.timestamps || [];
            timestamps = rawTimestamps.filter((t) => nowMs - t < windowMs);
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
        const waitlistRef = firebase_1.db.collection('waitlist').doc(cleanedEmail);
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
            joinedAt: firebase_1.admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(200).json({ success: true, message: 'Successfully joined the waitlist!' });
    }
    catch (err) {
        console.error('Error joining waitlist:', err);
        res.status(500).send(`Internal Server Error: ${err?.message || err}`);
    }
});
//# sourceMappingURL=joinWaitlist.js.map