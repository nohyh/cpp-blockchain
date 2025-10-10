import { doubleSha256 } from './crypto.js';
import { BlockData, BlockJSON } from './types.js';
import { Transaction } from './transaction.js';

export class Block implements BlockJSON {
  readonly height: number;
  readonly timestamp: number;
  readonly previousHash: string;
  readonly merkleRoot: string;
  readonly difficulty: number;
  nonce: number;
  readonly transactions: Transaction[];
  hash: string;

  constructor(data: BlockData, transactions: Transaction[]) {
    this.height = data.height;
    this.timestamp = data.timestamp;
    this.previousHash = data.previousHash;
    this.merkleRoot = data.merkleRoot;
    this.difficulty = data.difficulty;
    this.nonce = data.nonce;
    this.transactions = transactions;
    this.hash = this.calculateHash();
  }

  calculateHash(): string {
    const header = Buffer.allocUnsafe(80);
    Buffer.from(this.previousHash, 'hex').copy(header, 0);
    Buffer.from(this.merkleRoot, 'hex').copy(header, 32);
    header.writeBigInt64LE(BigInt(this.timestamp), 64);
    header.writeUInt32LE(this.difficulty, 72);
    header.writeUInt32LE(this.nonce, 76);
    return doubleSha256(header).toString('hex');
  }

  meetsDifficulty(): boolean {
    return this.hash.startsWith('0'.repeat(this.difficulty));
  }

  toJSON(): BlockJSON {
    return {
      hash: this.hash,
      height: this.height,
      timestamp: this.timestamp,
      previousHash: this.previousHash,
      merkleRoot: this.merkleRoot,
      difficulty: this.difficulty,
      nonce: this.nonce,
      transactions: this.transactions.map((tx) => tx.toJSON())
    };
  }

  static computeMerkleRoot(transactions: Transaction[]): string {
    if (transactions.length === 0) {
      return ''.padStart(64, '0');
    }

    let layer = transactions.map((tx) => tx.id);
    while (layer.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i];
        const right = layer[i + 1] ?? layer[i];
        const combined = Buffer.from(left + right, 'hex');
        next.push(doubleSha256(combined).toString('hex'));
      }
      layer = next;
    }
    return layer[0];
  }
}