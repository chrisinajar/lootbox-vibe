import { Level } from 'level';

import { StorageProvider, BatchOp } from './StorageProvider';

export class LevelStorage implements StorageProvider {
  // minimal typing to satisfy test env
  private db?: any;
  constructor(private location: string) {}

  async open(): Promise<void> {
    // @ts-ignore level types are relaxed; minimal stub here
    this.db = new Level(this.location, { valueEncoding: 'buffer' });
  }

  async close(): Promise<void> {
    await this.db?.close();
  }

  async get(key: string): Promise<Buffer | undefined> {
    try {
      const val = await this.db?.get(key);
      return val as Buffer;
    } catch (err: any) {
      if (err && err.notFound) return undefined;
      throw err;
    }
  }

  async put(key: string, value: Buffer | string): Promise<void> {
    await this.db?.put(key, value);
  }

  async del(key: string): Promise<void> {
    await this.db?.del(key);
  }

  async batch(ops: BatchOp[]): Promise<void> {
    await this.db?.batch(
      ops.map((op) =>
        op.type === 'put'
          ? { type: 'put', key: op.key, value: op.value }
          : { type: 'del', key: op.key },
      ),
    );
  }

  async scanPrefix(prefix: string, onItem: (key: string, value: Buffer) => void): Promise<void> {
    // @ts-ignore minimal iteration stub
    for await (const [key, value] of this.db!.iterator({ gte: prefix, lt: prefix + '\uFFFF' })) {
      onItem(String(key), value as Buffer);
    }
  }
}
