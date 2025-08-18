import fs from 'node:fs';
import path from 'node:path';

export type BaseEntry = {
  ts: string;
  operationName: string;
  uid: string;
  requestId: string;
  latencyMs: number;
};

export class TelemetryService {
  private outPath?: string;
  private enabled: boolean;

  constructor(opts?: { outPath?: string; enabled?: boolean }) {
    this.outPath = opts?.outPath;
    this.enabled = Boolean(opts?.enabled && opts?.outPath);
  }

  buildEntry(
    operationName: string,
    uid: string,
    requestId: string,
    latencyMs: number,
    result: any,
  ): Record<string, any> {
    const ts = new Date().toISOString();
    const base: BaseEntry = { ts, operationName, uid, requestId, latencyMs };
    const agg: Record<string, any> = {};
    if (operationName === 'openBoxes') {
      const stacks = Array.isArray(result?.stacks) ? result.stacks : [];
      const currencies = Array.isArray(result?.currencies) ? result.currencies : [];
      const unlocks = Array.isArray(result?.unlocks) ? result.unlocks : [];
      const itemsDelta = stacks.reduce((a: number, s: any) => a + (Number(s?.count ?? 0) || 0), 0);
      agg.stacks = { count: stacks.length, itemsDelta };
      agg.currencies = currencies.map((c: any) => ({
        currency: c.currency,
        amount: String(c.amount),
      }));
      agg.unlocks = { count: unlocks.length };
    } else if (operationName === 'salvage') {
      const scrapped = Array.isArray(result?.scrapped) ? result.scrapped : [];
      const currencies = Array.isArray(result?.currencies) ? result.currencies : [];
      const itemsRemoved = scrapped.reduce(
        (a: number, s: any) => a + (Number(s?.count ?? 0) || 0),
        0,
      );
      agg.scrap = { stacks: scrapped.length, itemsRemoved };
      agg.currencies = currencies.map((c: any) => ({
        currency: c.currency,
        amount: String(c.amount),
      }));
    } else if (operationName === 'inventorySummary') {
      agg.summary = { ok: true };
    }
    return { ...base, agg };
  }

  async write(entry: Record<string, any>): Promise<void> {
    if (!this.enabled || !this.outPath) return;
    const line = JSON.stringify(entry) + '\n';
    await fs.promises.mkdir(path.dirname(this.outPath), { recursive: true });
    await fs.promises.appendFile(this.outPath, line, 'utf8');
  }
}
