import { formatAmount } from '../blockchain/crypto.js';
import { BlockJSON, PendingTransaction, TransactionJSON, TxOutput, UserState } from '../blockchain/types.js';

function serializeOutput(output: TxOutput) {
  return {
    amount: formatAmount(output.amount),
    address: output.address
  };
}

export function serializeTransaction(transaction: TransactionJSON) {
  return {
    id: transaction.id,
    inputs: transaction.inputs,
    outputs: transaction.outputs.map(serializeOutput)
  };
}

export function serializePendingTransaction(transaction: PendingTransaction) {
  return {
    ...serializeTransaction(transaction),
    createdAt: transaction.createdAt
  };
}

export function serializeBlock(block: BlockJSON) {
  return {
    hash: block.hash,
    height: block.height,
    timestamp: block.timestamp,
    previousHash: block.previousHash,
    merkleRoot: block.merkleRoot,
    difficulty: block.difficulty,
    nonce: block.nonce,
    transactions: block.transactions.map(serializeTransaction)
  };
}

export function serializeUser(user: UserState) {
  return {
    id: user.id,
    name: user.name,
    address: user.address,
    balance: formatAmount(user.balance),
    isSystem: user.isSystem ?? false
  };
}