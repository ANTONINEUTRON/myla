/**
 * TxODDS API Activation Script
 *
 * Run this once to subscribe to the free World Cup tier and get your API token.
 *
 * Prerequisites:
 *   1. Install deps: npm install axios tweetnacl @solana/web3.js
 *   2. Have a Solana devnet wallet with a small amount of SOL
 *      (get free devnet SOL: https://faucet.solana.com)
 *
 * Usage:
 *   node scripts/activate-txodds.mjs
 */

import axios from 'axios';
import nacl from 'tweetnacl';
import { Connection, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──
const NETWORK = 'mainnet'; // 'mainnet' or 'devnet'
const API_ORIGIN = NETWORK === 'mainnet'
  ? 'https://txline.txodds.com'
  : 'https://txline-dev.txodds.com';
const API_BASE = `${API_ORIGIN}/api`;
const RPC_URL = NETWORK === 'mainnet'
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

// Generate or load a wallet
const wallet = Keypair.generate();
console.log('\n🔑 Wallet address:', wallet.publicKey.toBase58());
console.log('   (fund this wallet with SOL)\n');

async function main() {
  // 1. Get guest JWT
  console.log('1️⃣  Getting guest JWT...');
  const authRes = await axios.post(`${API_ORIGIN}/auth/guest/start`);
  const jwt = authRes.data.token;
  console.log('   ✅ Got JWT');

  // 2. Subscribe on-chain (free tier)
  console.log('2️⃣  Subscribing to free World Cup tier on-chain...');
  console.log('   ⚠️  This requires a funded wallet.');
  console.log('   💡 For now we use a simulated subscription.');
  console.log('   📖 See: https://txline.txodds.com/documentation/worldcup\n');

  // Simulated subscription — replace with actual Anchor program call
  const txSig = 'simulated-subscription-' + Date.now();

  // 3. Activate API token
  console.log('3️⃣  Activating API token...');
  const messageStr = `${txSig}::${jwt}`;
  const message = new TextEncoder().encode(messageStr);
  const sigBytes = nacl.sign.detached(message, wallet.secretKey);
  const walletSignature = Buffer.from(sigBytes).toString('base64');

  const actRes = await axios.post(
    `${API_BASE}/token/activate`,
    {
      txSig,
      walletSignature,
      leagues: [],
    },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );

  const apiToken = actRes.data.token || actRes.data;
  console.log('   ✅ API Token:', apiToken.substring(0, 30) + '...');

  // 4. Save to .env
  const envPath = join(__dirname, '..', '.env');
  const envContent = `# TxODDS Credentials (activated ${new Date().toISOString()})
TXODDS_JWT=${jwt}
TXODDS_API_TOKEN=${apiToken}
TXODDS_BASE_URL=${API_ORIGIN}
TXODDS_USE_DEVNET=true
`;
  writeFileSync(envPath, envContent);
  console.log(`\n✅ Credentials saved to .env`);
  console.log(`\n📋 Copy these into your app:\n`);
  console.log(`TXODDS_JWT=${jwt}`);
  console.log(`TXODDS_API_TOKEN=${apiToken}`);
  console.log(`\nThen in your code:\n`);
  console.log(`txoddsService.configure('${jwt.substring(0, 20)}...', '${apiToken.substring(0, 20)}...', true);`);
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.response?.data || err.message);
  process.exit(1);
});
