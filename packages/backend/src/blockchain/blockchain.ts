import { BLOCK_REWARD, formatAmount, publicKeyToAddress, verifySignature } from './crypto.js';
import { Block } from './block.js';
import { Transaction } from './transaction.js';
import { TxInput, TxOutput, UTXO } from './types.js';

const COINBASE_TXID = ''.padStart(64, '0');

export class Blockchain {
  readonly blocks: Block[] = [];
  readonly utxoSet: Map<string, UTXO> = new Map();
  readonly mempool: Transaction[] = [];
  difficulty: number;

  constructor(creatorAddress: string, difficulty = 4) {
    this.difficulty = difficulty;
    const genesis = this.createGenesisBlock(creatorAddress);
    this.blocks.push(genesis);
    this.indexTransactionOutputs(genesis.transactions[0]);
  }

  get height(): number {
    return this.blocks.length - 1;
  }

  get latestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  private createGenesisBlock(creatorAddress: string): Block {
    const coinbase = this.createCoinbaseTransaction(creatorAddress, 0);
    const transactions = [coinbase];
    const data = {
      height: 0,
      timestamp: Math.floor(Date.now() / 1000),
      previousHash: ''.padStart(64, '0'),
      merkleRoot: Block.computeMerkleRoot(transactions),
      difficulty: this.difficulty,
      nonce: 0
    };
    const block = new Block(data, transactions);

    while (!block.meetsDifficulty()) {
      block.nonce += 1;
      block.hash = block.calculateHash();
    }

    return block;
  }

  createCoinbaseTransaction(minerAddress: string, height: number): Transaction {
    const input: TxInput = {
      txid: COINBASE_TXID,
      index: -1,
      signature: `block-${height}`,
      publicKey: ''
    };
    const output: TxOutput = {
      amount: BLOCK_REWARD,
      address: minerAddress
    };
    return new Transaction([input], [output]);
  }

  getBalance(address: string): bigint {
    let balance = 0n;
    for (const utxo of this.utxoSet.values()) {
      if (utxo.address === address) {
        balance += utxo.amount;
      }
    }
    return balance;
  }

  collectSpendableUTXOs(address: string, amount: bigint): { utxos: UTXO[]; total: bigint } {
    let total = 0n;
    const utxos: UTXO[] = [];
    for (const entry of this.utxoSet.values()) {
      if (entry.address !== address) {
        continue;
      }
      if (this.isUtxoLocked(entry)) {
        continue;
      }
      utxos.push(entry);
      total += entry.amount;
      if (total >= amount) {
        break;
      }
    }

    if (total < amount) {
      throw new Error(`Insufficient funds. Available: ${formatAmount(total)}, required: ${formatAmount(amount)}`);
    }

    return { utxos, total };
  }

  private isUtxoLocked(utxo: UTXO): boolean {
    const key = this.getUtxoKey(utxo.txid, utxo.index);
    for (const tx of this.mempool) {
      for (const input of tx.inputs) {
        if (this.getUtxoKey(input.txid, input.index) === key) {
          return true;
        }
      }
    }
    return false;
  }

  addTransactionToMempool(transaction: Transaction): boolean {
    if (!this.validateTransaction(transaction)) {
      return false;
    }
    this.mempool.push(transaction);
    return true;
  }

  minePendingTransactions(minerAddress: string): Block {
    const coinbase = this.createCoinbaseTransaction(minerAddress, this.height + 1);
    const transactions = [coinbase, ...this.mempool.slice(0, 8)];
    const blockData = {
      height: this.height + 1,
      timestamp: Math.floor(Date.now() / 1000),
      previousHash: this.latestBlock.hash,
      merkleRoot: Block.computeMerkleRoot(transactions),
      difficulty: this.difficulty,
      nonce: 0
    };

    const block = new Block(blockData, transactions);
    while (!block.meetsDifficulty()) {
      block.nonce += 1;
      block.hash = block.calculateHash();
    }

    if (!this.verifyBlock(block)) {
      throw new Error('Attempted to add invalid block.');
    }

    this.blocks.push(block);
    for (const tx of transactions) {
      this.indexTransactionOutputs(tx);
      this.consumeTransactionInputs(tx);
    }
    this.pruneConfirmedTransactions(block);
    return block;
  }

  verifyBlock(block: Block): boolean {
    const previous = this.latestBlock;
    if (previous.hash !== block.previousHash) {
      return false;
    }
    if (block.calculateHash() !== block.hash) {
      return false;
    }
    if (!block.meetsDifficulty()) {
      return false;
    }

    const utxoSnapshot = new Map(this.utxoSet);

    for (let i = 0; i < block.transactions.length; i++) {
      const tx = block.transactions[i];
      if (i === 0) {
        if (!this.verifyCoinbase(tx)) {
          return false;
        }
        this.applyOutputs(tx, utxoSnapshot);
        continue;
      }

      if (!this.validateTransaction(tx, utxoSnapshot)) {
        return false;
      }
      this.consumeInputs(tx, utxoSnapshot);
      this.applyOutputs(tx, utxoSnapshot);
    }

    return true;
  }

  private verifyCoinbase(transaction: Transaction): boolean {
    if (transaction.inputs.length !== 1) {
      return false;
    }
    const input = transaction.inputs[0];
    if (input.index !== -1 || input.txid !== COINBASE_TXID) {
      return false;
    }
    if (transaction.outputs.length === 0) {
      return false;
    }
    const totalReward = transaction.outputs.reduce((sum, output) => sum + output.amount, 0n);
    return totalReward === BLOCK_REWARD;
  }

  private validateTransaction(transaction: Transaction, utxoOverride?: Map<string, UTXO>): boolean {
    if (transaction.inputs.length === 0 || transaction.outputs.length === 0) {
      return false;
    }
    if (transaction.inputs[0].index === -1) {
      return false;
    }

    const utxos = utxoOverride ?? this.utxoSet;
    const digest = Transaction.signatureDigest(transaction.inputs, transaction.outputs);
    const spentInTx = new Set<string>();
    let totalInput = 0n;
    let totalOutput = 0n;

    for (const input of transaction.inputs) {
      const key = this.getUtxoKey(input.txid, input.index);
      const utxo = utxos.get(key);
      if (!utxo) {
        return false;
      }
      if (spentInTx.has(key)) {
        return false;
      }
      if (utxo.address !== publicKeyToAddress(input.publicKey)) {
        return false;
      }
      if (!verifySignature(input.publicKey, input.signature, digest)) {
        return false;
      }
      if (!utxoOverride) {
        if (this.isUtxoLocked(utxo)) {
          return false;
        }
      }
      spentInTx.add(key);
      totalInput += utxo.amount;
    }

    for (const output of transaction.outputs) {
      if (output.amount <= 0) {
        return false;
      }
      totalOutput += output.amount;
    }

    return totalInput >= totalOutput;
  }

  private pruneConfirmedTransactions(block: Block): void {
    const confirmed = new Set(block.transactions.map((tx) => tx.id));
    for (let i = this.mempool.length - 1; i >= 0; i--) {
      if (confirmed.has(this.mempool[i].id)) {
        this.mempool.splice(i, 1);
      }
    }
  }

  private indexTransactionOutputs(transaction: Transaction): void {
    transaction.outputs.forEach((output, index) => {
      const utxo: UTXO = {
        txid: transaction.id,
        index,
        amount: output.amount,
        address: output.address
      };
      this.utxoSet.set(this.getUtxoKey(utxo.txid, utxo.index), utxo);
    });
  }

  private consumeTransactionInputs(transaction: Transaction): void {
    for (const input of transaction.inputs) {
      if (input.index === -1) {
        continue;
      }
      const key = this.getUtxoKey(input.txid, input.index);
      this.utxoSet.delete(key);
    }
  }

  private applyOutputs(transaction: Transaction, utxoMap: Map<string, UTXO>): void {
    transaction.outputs.forEach((output, index) => {
      const utxo: UTXO = {
        txid: transaction.id,
        index,
        amount: output.amount,
        address: output.address
      };
      utxoMap.set(this.getUtxoKey(utxo.txid, utxo.index), utxo);
    });
  }

  private consumeInputs(transaction: Transaction, utxoMap: Map<string, UTXO>): void {
    for (const input of transaction.inputs) {
      const key = this.getUtxoKey(input.txid, input.index);
      utxoMap.delete(key);
    }
  }

  private getUtxoKey(txid: string, index: number): string {
    return `${txid}:${index}`;
  }
}