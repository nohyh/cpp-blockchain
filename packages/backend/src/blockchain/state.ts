import { v4 as uuidv4 } from 'uuid';
import { Blockchain } from './blockchain.js';
import { Wallet } from './wallet.js';
import { PendingTransaction, TransactionJSON, UserState } from './types.js';
import { BLOCK_REWARD, NOCOIN, formatAmount } from './crypto.js';
import { parseAmount } from '../utils/amount.js';
import { Transaction } from './transaction.js';

interface UserRecord {
  id: string;
  name: string;
  wallet: Wallet;
  isSystem: boolean;
}

let treasuryWallet = Wallet.create();
let blockchain = new Blockchain(treasuryWallet.keys.address);

const treasuryUser: UserRecord = {
  id: uuidv4(),
  name: 'Treasury',
  wallet: treasuryWallet,
  isSystem: true
};

const users = new Map<string, UserRecord>([[treasuryUser.id, treasuryUser]]);
const pendingTransactions = new Map<string, PendingTransaction>();

export function listUsers(): UserState[] {
  return Array.from(users.values()).map(toUserState);
}

export function createUser(name: string, initialCredit = 10n * NOCOIN): UserState {
  const wallet = Wallet.create();
  const record: UserRecord = {
    id: uuidv4(),
    name,
    wallet,
    isSystem: false
  };
  users.set(record.id, record);

  if (initialCredit > 0n) {
    try {
      const faucetTx = treasuryWallet.createTransaction(wallet.keys.address, initialCredit, blockchain);
      if (blockchain.addTransactionToMempool(faucetTx)) {
        trackPending(faucetTx);
      }
    } catch {
      // Ignore faucet failures (insufficient funds, etc.)
    }
  }

  return toUserState(record);
}

export function submitPayment(
  senderId: string,
  recipientAddress: string,
  amountInput: string
): TransactionJSON {
  const sender = users.get(senderId);
  if (!sender) {
    throw new Error('Sender not found.');
  }

  const amount = parseAmount(amountInput);
  if (amount <= 0n) {
    throw new Error('Amount must be greater than zero.');
  }

  const transaction = sender.wallet.createTransaction(recipientAddress, amount, blockchain);
  if (!blockchain.addTransactionToMempool(transaction)) {
    throw new Error('Transaction rejected by mempool validation.');
  }
  trackPending(transaction);
  return transaction.toJSON();
}

export function mineNextBlock(minerId: string): { block: TransactionJSON[]; reward: string } {
  const miner = users.get(minerId);
  if (!miner) {
    throw new Error('Miner not found.');
  }

  const block = blockchain.minePendingTransactions(miner.wallet.keys.address);
  removeConfirmed(block.transactions);
  return {
    block: block.transactions.map((tx) => tx.toJSON()),
    reward: formatAmount(BLOCK_REWARD)
  };
}

export function getBlockchainView() {
  return {
    height: blockchain.height,
    difficulty: blockchain.difficulty,
    blocks: blockchain.blocks.map((block) => block.toJSON())
  };
}

export function getPendingTransactions(): PendingTransaction[] {
  return Array.from(pendingTransactions.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function findUserByAddress(address: string): UserState | undefined {
  const record = Array.from(users.values()).find((user) => user.wallet.keys.address === address);
  if (!record) {
    return undefined;
  }
  return toUserState(record);
}

export function treasuryInfo(): UserState {
  return toUserState(treasuryUser);
}

export function getUserAddress(id: string): string | undefined {
  return users.get(id)?.wallet.keys.address;
}

export function getUser(id: string): UserState | undefined {
  const record = users.get(id);
  return record ? toUserState(record) : undefined;
}

export function resetStateForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetStateForTests is intended for test environments only.');
  }

  treasuryWallet = Wallet.create();
  blockchain = new Blockchain(treasuryWallet.keys.address);
  treasuryUser.wallet = treasuryWallet;

  users.clear();
  users.set(treasuryUser.id, treasuryUser);
  pendingTransactions.clear();
}

function trackPending(transaction: Transaction): void {
  pendingTransactions.set(transaction.id, {
    ...transaction.toJSON(),
    createdAt: Date.now()
  });
}

function removeConfirmed(transactions: Transaction[]): void {
  for (const tx of transactions) {
    pendingTransactions.delete(tx.id);
  }
}

function toUserState(record: UserRecord): UserState {
  return {
    id: record.id,
    name: record.name,
    address: record.wallet.keys.address,
    balance: blockchain.getBalance(record.wallet.keys.address),
    isSystem: record.isSystem
  };
}