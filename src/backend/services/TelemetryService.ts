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
    extra?: { writeOps?: number; errorCode?: string },
  ): Record<string, any> {
    const ts = new Date().toISOString();
    const base: BaseEntry = { ts, operationName, uid, requestId, latencyMs };
    const agg: Record<string, any> = {};
    if (operationName === 'openBoxes') {
      const stacks = Array.isArray(result?.stacks) ? result.stacks : [];
      const currencies = Array.isArray(result?.currencies) ? result.currencies : [];
      const unlocks = Array.isArray(result?.unlocks) ? result.unlocks : [];
      const itemsDelta = stacks.reduce((a: number, s: any) => a + (Number(s?.count ?? 0) || 0), 0);
      const rarityHist = (stacks as any[]).reduce((acc: Record<string, number>, s: any) => {
        const r = String(s?.rarity ?? 'COMMON');
        acc[r] = (acc[r] || 0) + Number(s?.count ?? 0);
        return acc;
      }, {});
      agg.stacks = { count: stacks.length, itemsDelta };
      agg.currencies = currencies.map((c: any) => ({
        currency: c.currency,
        amount: String(c.amount),
      }));
      agg.unlocks = { count: unlocks.length };
      agg.rarity = rarityHist;
    } else if (operationName === 'salvage') {
      const scrapped = Array.isArray(result?.scrapped) ? result.scrapped : [];
      const currencies = Array.isArray(result?.currencies) ? result.currencies : [];
      const itemsRemoved = scrapped.reduce(
        (a: number, s: any) => a + (Number(s?.count ?? 0) || 0),
        0,
      );
      const rarityHist = (scrapped as any[]).reduce((acc: Record<string, number>, s: any) => {
        const r = String(s?.rarity ?? 'COMMON');
        acc[r] = (acc[r] || 0) + Number(s?.count ?? 0);
        return acc;
      }, {});
      agg.scrap = { stacks: scrapped.length, itemsRemoved };
      agg.currencies = currencies.map((c: any) => ({
        currency: c.currency,
        amount: String(c.amount),
      }));
      agg.rarity = rarityHist;
    } else if (operationName === 'inventorySummary') {
      agg.summary = { ok: true };
    }
    const payloadSize = (() => {
      try {
        return Buffer.byteLength(JSON.stringify(result));
      } catch {
        /* noop: best-effort size */
        return 0;
      }
    })();
    const writeOps = extra?.writeOps ?? undefined;
    const errorCode = extra?.errorCode ?? undefined;
    return { ...base, agg, payloadSize, writeOps, errorCode };
  }

  async write(entry: Record<string, any>): Promise<void> {
    if (!this.enabled || !this.outPath) return;
    const keepDays = Number(process.env.ELOG_KEEP_DAYS ?? 0);
    let filePath = this.outPath;
    try {
      const st = fs.existsSync(this.outPath) ? fs.statSync(this.outPath) : undefined;
      if ((st && st.isDirectory()) || (!st && !path.extname(this.outPath))) {
        const dir = this.outPath;
        const today = new Date().toISOString().slice(0, 10);
        filePath = path.join(dir, `elog-${today}.jsonl`);
        await fs.promises.mkdir(dir, { recursive: true });
        if (keepDays > 0) {
          const files = fs
            .readdirSync(dir)
            .filter((f) => /^elog-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f));
          const cutoff = Date.now() - keepDays * 86400000;
          for (const f of files) {
            const d = new Date(f.slice(5, 15));
            if (!isNaN(d.getTime()) && d.getTime() < cutoff) {
              try {
                fs.unlinkSync(path.join(dir, f));
              } catch {
                /* noop: file may already be gone */
              }
            }
          }
        }
      } else {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      }
    } catch {
      /* noop: directory prep best-effort */
    }
    const line = JSON.stringify(entry) + '\n';
    await fs.promises.appendFile(filePath, line, 'utf8');
  }
}
