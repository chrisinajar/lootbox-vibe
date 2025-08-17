import { describe, it, expect } from '@jest/globals';
import { ConfigService } from '../../src/backend/services/ConfigService';

describe('ConfigService hash', () => {
  it('produces a stable 64-hex hash', () => {
    const svc = new ConfigService();
    const h = svc.computeHash();
    expect(typeof h).toBe('string');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

