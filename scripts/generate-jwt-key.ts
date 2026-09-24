// Generates an Ed25519 private key for user-service to sign login tokens with, formatted
// as a single .env line. Keep the output secret: anyone with this key can create tokens.
//
//   npm run keys:generate            print the line
//   npm run keys:generate >> .env    append it to your .env file

import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('ed25519');
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim();

// Newlines become "\n" so the key fits on one line; user-service turns them back.
console.log(`JWT_PRIVATE_KEY='${pem.replace(/\n/g, '\\n')}'`);
