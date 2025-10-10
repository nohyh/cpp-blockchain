import { describe, expect, it } from 'vitest';
import { Blockchain } from '../src/blockchain/blockchain.js';
import { Wallet } from '../src/blockchain/wallet.js';
import { BLOCK_REWARD, NOCOIN } from '../src/blockchain/crypto.js';

describe('Blockchain core', () => {
  it('processes transactions and mining rewards', () => {
    const miner = Wallet.create();
    const blockchain = new Blockchain(miner.keys.address, 2);
    const recipient = Wallet.create();

    const initialBalance = blockchain.getBalance(miner.keys.address);
    expect(initialBalance).toBe(BLOCK_REWARD);

    const paymentAmount = 10n * NOCOIN;
    const transaction = miner.createTransaction(recipient.keys.address, paymentAmount, blockchain);
    const added = blockchain.addTransactionToMempool(transaction);
    expect(added).toBe(true);

    const block = blockchain.minePendingTransactions(miner.keys.address);
    expect(block.transactions).toHaveLength(2);
    expect(block.height).toBe(1);

    const minerBalance = blockchain.getBalance(miner.keys.address);
    const recipientBalance = blockchain.getBalance(recipient.keys.address);

    expect(recipientBalance).toBe(paymentAmount);
    expect(minerBalance).toBe(BLOCK_REWARD - paymentAmount + BLOCK_REWARD);
    expect(blockchain.mempool).toHaveLength(0);
  });
});