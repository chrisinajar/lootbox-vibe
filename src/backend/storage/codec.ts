export const u32 = {
  encodeBE(n: number): Buffer {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n >>> 0, 0);
    return b;
  },
  decodeBE(buf?: Buffer): number {
    if (!buf || buf.length < 4) return 0;
    return buf.readUInt32BE(0);
  },
};

export const u64 = {
  encodeBE(n: bigint): Buffer {
    const b = Buffer.alloc(8);
    let v = n;
    for (let i = 7; i >= 0; i--) {
      b[i] = Number(v & 0xffn);
      v >>= 8n;
    }
    return b;
  },
  decodeBE(buf?: Buffer): bigint {
    if (!buf) return 0n;
    let v = 0n;
    for (const byte of buf.values()) v = (v << 8n) | BigInt(byte);
    return v;
  },
};
