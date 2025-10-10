export interface TxInput {
  txid: string;
  index: number;
  signature: string;
  publicKey: string;
}

export interface TxOutput {
  amount: bigint;
  address: string;
}

export interface UTXO {
  amount: bigint;
  index: number;
  address: string;
  txid: string;
}

export interface BlockData {
  height: number;
  timestamp: number;
  previousHash: string;
  merkleRoot: string;
  difficulty: number;
  nonce: number;
}

export interface TransactionJSON {
  id: string;
  inputs: TxInput[];
  outputs: TxOutput[];
}

export interface BlockJSON extends BlockData {
  hash: string;
  transactions: TransactionJSON[];
}

export interface UserState {
  id: string;
  name: string;
  address: string;
  balance: bigint;
  isSystem?: boolean;
}

export interface WalletKeys {
  privateKey: string;
  publicKey: string;
  address: string;
}

export interface PendingTransaction extends TransactionJSON {
  createdAt: number;
}