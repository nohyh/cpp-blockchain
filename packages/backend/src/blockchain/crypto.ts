import { createHash, randomBytes } from 'crypto';
import { ec as EC } from 'elliptic';
import bs58 from 'bs58';
import { WalletKeys } from './types.js';

const ec = new EC('secp256k1');

export const NOCOIN = 1_000_000_000n;
export const BLOCK_REWARD = 50n * NOCOIN;

export function sha256(data: Buffer | string): Buffer {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return createHash('sha256').update(buffer).digest();
}

export function doubleSha256(data: Buffer | string): Buffer {
  return sha256(sha256(data));
}

export function ripemd160(data: Buffer): Buffer {
  return createHash('ripemd160').update(data).digest();
}

export function generateWallet(): WalletKeys {
  const keyPair = ec.genKeyPair({ entropy: randomBytes(32) });
  const privateKey = keyPair.getPrivate('hex');
  const publicKey = keyPair.getPublic(false, 'hex');
  const address = publicKeyToAddress(publicKey);
  return { privateKey, publicKey, address };
}

export function publicKeyToAddress(publicKeyHex: string): string {
  const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');
  const step1 = sha256(publicKeyBuffer);
  const step2 = ripemd160(step1);
  const versionedPayload = Buffer.concat([Buffer.from([0x00]), step2]);
  const checksum = doubleSha256(versionedPayload).subarray(0, 4);
  const result = Buffer.concat([versionedPayload, checksum]);
  return bs58.encode(result);
}

export function signDigest(privateKeyHex: string, digestHex: string): string {
  const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
  const signature = keyPair.sign(digestHex, { canonical: true });
  return signature.toDER('hex');
}

export function verifySignature(
  publicKeyHex: string,
  signatureHex: string,
  digestHex: string
): boolean {
  const keyPair = ec.keyFromPublic(publicKeyHex, 'hex');
  try {
    return keyPair.verify(digestHex, signatureHex);
  } catch {
    return false;
  }
}

export function formatAmount(amount: bigint): string {
  const whole = amount / NOCOIN;
  const fractional = amount % NOCOIN;
  const fractionalString = fractional.toString().padStart(9, '0');
  return `${whole}.${fractionalString}`;
}