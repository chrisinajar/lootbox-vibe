import { u64 } from '../storage/codec';
import { keys } from '../storage/keys';
import { StorageProvider } from '../storage/StorageProvider';

import { TransactionManager } from './TransactionManager';

export type Currency = 'KEYS' | 'SCRAP' | 'GLITTER';

export class CurrencyService {
  private tm: TransactionManager;
  constructor(private storage: StorageProvider) {
    this.tm = new TransactionManager(storage);
  }

  async getBalance(uid: string, currency: Currency): Promise<bigint> {
    const key = keys.cur(uid, currency);
    return u64.decodeBE(await this.storage.get(key));
  }

  async credit(uid: string, currency: Currency, amount: bigint): Promise<void> {
    await this.tm.adjustCurrencies([{ uid, currency, delta: amount }]);
  }

  async debit(uid: string, currency: Currency, amount: bigint): Promise<void> {
    await this.tm.adjustCurrencies([{ uid, currency, delta: -amount }]);
  }
}
