export const CONFIG = {
  // Solana Deployed Program ID
  PROGRAM_ID: process.env.PROGRAM_ID || '9AhsF4FXa6GPqVWJEaCdPeK3jptuGPfZpDk24Co5odsf',

  // Oracle address authorization
  ORACLE_ADDRESS: process.env.ORACLE_ADDRESS || 'BiqsXC7Uqskmp5ucSmfUww6bwVqNVnAYEE2FGvifD8kS',

  // Commission wallet address
  COMMISSION_WALLET: process.env.COMMISSION_WALLET || 'BiqsXC7Uqskmp5ucSmfUww6bwVqNVnAYEE2FGvifD8kS',

  // Commission rate (500 basis points = 5%)
  COMMISSION_RATE: Number(process.env.COMMISSION_RATE || '500'),

  // Solana RPC Connection URL
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
};
