import { BinaryWriter } from '../utils/binary-writer.js';
import { sha256 } from './crypto.js';
import { TxInput, TxOutput, TransactionJSON } from './types.js';

export class Transaction implements TransactionJSON {
  readonly id: string;
  readonly inputs: TxInput[];
  readonly outputs: TxOutput[];

  constructor(inputs: TxInput[], outputs: TxOutput[]) {
    this.inputs = inputs;
    this.outputs = outputs;
    this.id = Transaction.computeId(inputs, outputs);
  }

  static computeId(inputs: TxInput[], outputs: TxOutput[]): string {
    const serialized = Transaction.serialize(inputs, outputs);
    return sha256(serialized).toString('hex');
  }

  static signatureDigest(inputs: TxInput[], outputs: TxOutput[]): string {
    const serialized = Transaction.serializeForSigning(inputs, outputs);
    return sha256(serialized).toString('hex');
  }

  private static serialize(inputs: TxInput[], outputs: TxOutput[]): Buffer {
    const writer = new BinaryWriter();
    writer.writeUint32(inputs.length);
    for (const input of inputs) {
      writer.writeString(input.txid);
      writer.writeInt32(input.index);
      writer.writeString(input.signature);
      writer.writeString(input.publicKey);
    }
    writer.writeUint32(outputs.length);
    for (const output of outputs) {
      writer.writeBigUint64(output.amount);
      writer.writeString(output.address);
    }
    return writer.concat();
  }

  static serializeForSigning(inputs: TxInput[], outputs: TxOutput[]): Buffer {
    const writer = new BinaryWriter();
    writer.writeUint32(inputs.length);
    for (const input of inputs) {
      writer.writeString(input.txid);
      writer.writeInt32(input.index);
    }
    writer.writeUint32(outputs.length);
    for (const output of outputs) {
      writer.writeBigUint64(output.amount);
      writer.writeString(output.address);
    }
    return writer.concat();
  }

  toJSON(): TransactionJSON {
    return {
      id: this.id,
      inputs: this.inputs,
      outputs: this.outputs
    };
  }
}