import crypto from 'node:crypto';
import { ConfigLoader } from '../config';

export class ConfigService {
  constructor(private loader = new ConfigLoader()) {}

  computeHash(): string {
    const cfg = this.loader.load();
    const json = JSON.stringify(cfg);
    return crypto.createHash('sha256').update(json).digest('hex');
  }
}

