"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
exports.CONFIG = {
    PROGRAM_ID: process.env.PROGRAM_ID,
    ORACLE_ADDRESS: process.env.ORACLE_ADDRESS,
    COMMISSION_WALLET: process.env.COMMISSION_WALLET,
    COMMISSION_RATE: Number(process.env.COMMISSION_RATE),
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
};
//# sourceMappingURL=config.js.map