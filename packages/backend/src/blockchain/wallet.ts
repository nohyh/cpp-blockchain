import { Blockchain } from './blockchain.js';
import { Transaction } from './transaction.js';
import { TxInput, TxOutput, WalletKeys } from './types.js';
import { generateWallet, signDigest } from './crypto.js';

export class Wallet {
  readonly keys: WalletKeys;

  constructor(keys: WalletKeys) {
    this.keys = keys;
  }

  static create(): Wallet {
    return new Wallet(generateWallet());
  }

  createTransaction(toAddress: string, amount: bigint, blockchain: Blockchain): Transaction {
    const { utxos, total } = blockchain.collectSpendableUTXOs(this.keys.address, amount);

    const unsignedInputs: TxInput[] = utxos.map((utxo) => ({
      txid: utxo.txid,
      index: utxo.index,
      signature: '',
      publicKey: this.keys.publicKey
    }));

    const outputs: TxOutput[] = [
      { amount, address: toAddress }
    ];

    const change = total - amount;
    if (change > 0n) {
      outputs.push({ amount: change, address: this.keys.address });
    }

    const digest = Transaction.signatureDigest(unsignedInputs, outputs);
    const signature = signDigest(this.keys.privateKey, digest);

    const signedInputs = unsignedInputs.map((input) => ({
      ...input,
      signature
    }));

    return new Transaction(signedInputs, outputs);
  }
}