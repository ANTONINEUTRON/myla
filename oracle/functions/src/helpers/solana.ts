import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair } from '@solana/web3.js';
import { CONFIG } from '../config';
import idlData from '../idl/myla_program.json';

// Construct dynamic IDL with configured program address
export const IDL = {
  ...idlData,
  address: CONFIG.PROGRAM_ID || '9AhsF4FXa6GPqVWJEaCdPeK3jptuGPfZpDk24Co5odsf'
};

/**
 * Helper: Get Anchor Program Instance
 */
export function getProgram(connection: Connection, oracleKeypair: Keypair): anchor.Program {
  const wallet = new anchor.Wallet(oracleKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  return new anchor.Program(IDL as any, provider);
}
