export interface BatchOp {
  type: 'put' | 'del';
  key: string;
  value?: string | Buffer;
}

export interface StorageProvider {
  open(): Promise<void>;
  close(): Promise<void>;
  get(key: string): Promise<Buffer | undefined>;
  put(key: string, value: Buffer | string): Promise<void>;
  del(key: string): Promise<void>;
  batch(ops: BatchOp[]): Promise<void>;
  scanPrefix(prefix: string, onItem: (key: string, value: Buffer) => void): Promise<void>;
}
