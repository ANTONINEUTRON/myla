import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;

// Polyfill crypto.getRandomValues for @solana/web3.js RPC ID generation
if (typeof global.crypto === "undefined") {
  (global as any).crypto = {};
}
if (typeof global.crypto.getRandomValues === "undefined") {
  global.crypto.getRandomValues = function (array: any) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

import { registerRootComponent } from 'expo';

// Use require instead of import to prevent Babel hoisting of App
// and ensure the global Buffer polyfill is set before App evaluates.
const App = require('./App').default;

registerRootComponent(App);
