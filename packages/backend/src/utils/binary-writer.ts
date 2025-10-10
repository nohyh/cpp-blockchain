export class BinaryWriter {
  private readonly chunks: Buffer[] = [];

  writeUint32(value: number): void {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt32LE(value);
    this.chunks.push(buffer);
  }

  writeInt32(value: number): void {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeInt32LE(value);
    this.chunks.push(buffer);
  }

  writeBigUint64(value: bigint): void {
    const buffer = Buffer.allocUnsafe(8);
    buffer.writeBigUInt64LE(value);
    this.chunks.push(buffer);
  }

  writeBytes(value: Buffer): void {
    this.writeUint32(value.length);
    this.chunks.push(value);
  }

  writeString(value: string): void {
    const data = Buffer.from(value, 'utf8');
    this.writeBytes(data);
  }

  concat(): Buffer {
    return Buffer.concat(this.chunks);
  }
}