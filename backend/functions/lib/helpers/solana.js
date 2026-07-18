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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.getProgram = getProgram;
const anchor = __importStar(require("@coral-xyz/anchor"));
const config_1 = require("../config");
const myla_program_json_1 = __importDefault(require("../idl/myla_program.json"));
// Construct dynamic IDL with configured program address
exports.IDL = {
    ...myla_program_json_1.default,
    address: config_1.CONFIG.PROGRAM_ID || '9AhsF4FXa6GPqVWJEaCdPeK3jptuGPfZpDk24Co5odsf'
};
/**
 * Helper: Get Anchor Program Instance
 */
function getProgram(connection, oracleKeypair) {
    const wallet = new anchor.Wallet(oracleKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
    });
    return new anchor.Program(exports.IDL, provider);
}
//# sourceMappingURL=solana.js.map