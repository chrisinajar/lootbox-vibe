import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express from 'express';
import cors from 'cors';
import type { CorsRequest } from 'cors';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BigIntResolver } from 'graphql-scalars';
import { LevelStorage } from './storage/LevelStorage';
import { SummariesRepo } from './services/SummariesRepo';
import { InventorySummaryService } from './services/InventorySummaryService';
import { InventoryListService } from './services/InventoryListService';
import { ConfigService } from './services/ConfigService';
import { buildContext } from './api/context';
import { OpenBoxesService } from './services/OpenBoxesService';
import { SalvageService } from './services/SalvageService';
import { IdleSvc } from './services/IdleSvc';
import { ShopService } from './services/ShopService';
import { u64 } from './storage/codec';
import { TelemetryService } from './services/TelemetryService';
import { CurrencyService } from './services/CurrencyService';

type InitOptions = {
  port?: number;
  graphqlPath?: string;
  corsOrigin?: string | boolean;
};

export async function initializeServer(options: InitOptions = {}) {
  const port = options.port ?? Number(process.env.API_PORT ?? 4000);
  const graphqlPath = options.graphqlPath ?? '/graphql';
  const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  const logLevel = process.env.LOG_LEVEL ?? 'info';

  const schemaPath = path.resolve(__dirname, './api/schema.graphql');
  const typeDefs = fs.readFileSync(schemaPath, 'utf8');

  // storage + services
  const dbPath = path.resolve(process.cwd(), 'data/leveldb');
  const storage = new LevelStorage(dbPath);
  await storage.open();
  const summariesRepo = new SummariesRepo(storage);
  const summarySvc = new InventorySummaryService(summariesRepo);
  const listSvc = new InventoryListService(storage);
  const openSvc = new OpenBoxesService(storage);
  const salvageSvc = new SalvageService(storage);
  const idleSvc = new IdleSvc();
  const shopSvc = new ShopService(storage, new CurrencyService(storage));
  const elogPath = process.env.ELOG_PATH;
  const elogEnabled = process.env.ELOG_ENABLED !== '0' && Boolean(elogPath);
  const telemetry = new TelemetryService({ outPath: elogPath, enabled: elogEnabled });

  const configSvc = new ConfigService();
  const currencySvc = new CurrencyService(storage);
  const cfgLoader = new (require('./config').ConfigLoader)();

  const resolvers = {
    BigInt: BigIntResolver,
    Query: {
      inventorySummary: async (_: any, __: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const started = Date.now();
        const res = await summarySvc.getSummary(uid);
        const entry = telemetry.buildEntry(
          'inventorySummary',
          uid,
          ctx?.reqId ?? 'n/a',
          Date.now() - started,
          res,
        );
        await telemetry.write(entry);
        return res;
      },
      currencies: async (_: any, __: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const started = Date.now();
        const keys = await currencySvc.getBalance(uid, 'KEYS');
        const scrap = await currencySvc.getBalance(uid, 'SCRAP');
        const glitter = await currencySvc.getBalance(uid, 'GLITTER');
        const res = [
          { currency: 'KEYS', amount: keys },
          { currency: 'SCRAP', amount: scrap },
          { currency: 'GLITTER', amount: glitter },
        ];
        const entry = telemetry.buildEntry(
          'currencies',
          uid,
          ctx?.reqId ?? 'n/a',
          Date.now() - started,
          res,
        );
        await telemetry.write(entry);
        return res;
      },
      unlockedBoxes: async (_: any, __: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const started = Date.now();
        const key = `ppro:${uid}`;
        const buf = await storage.get(key);
        let boxes: string[] = [];
        if (buf) {
          try {
            const parsed = JSON.parse(String(buf));
            if (Array.isArray(parsed.unlockedBoxIds)) boxes = parsed.unlockedBoxIds.map(String);
          } catch {}
        }
        // Ensure baseline cardboard is always available (append, not replace)
        const set = new Set<string>(boxes);
        set.add('box_cardboard');
        boxes = Array.from(set);
        const entry = telemetry.buildEntry(
          'unlockedBoxes',
          uid,
          ctx?.reqId ?? 'n/a',
          Date.now() - started,
          boxes,
        );
        await telemetry.write(entry);
        return boxes;
      },
      availableBoxes: async (_: any, __: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        // read unlocked profile
        const buf = await storage.get(`ppro:${uid}`);
        let unlocked: string[] = [];
        if (buf) {
          try {
            const parsed = JSON.parse(String(buf));
            if (Array.isArray(parsed.unlockedBoxIds)) unlocked = parsed.unlockedBoxIds.map(String);
          } catch {}
        }
        // Ensure baseline cardboard is always present
        const uSet = new Set<string>(unlocked);
        uSet.add('box_cardboard');
        unlocked = Array.from(uSet);
        // load boxes from config
        const cfg = cfgLoader.load();
        const boxesArr: any[] = Array.isArray((cfg as any).boxes)
          ? ((cfg as any).boxes as any[])
          : [];
        const byId = new Map<string, string>();
        for (const b of boxesArr) byId.set(String(b.id), String(b.name ?? b.id));
        const out = unlocked
          .filter((id) => byId.has(id))
          .map((id) => ({ id, name: byId.get(id)! }));
        if (out.length === 0 && byId.has('box_cardboard')) {
          out.push({ id: 'box_cardboard', name: byId.get('box_cardboard')! });
        }
        return out;
      },
      boxCatalog: async () => {
        const cfg = cfgLoader.load();
        const boxesArr: any[] = Array.isArray((cfg as any).boxes)
          ? ((cfg as any).boxes as any[])
          : [];
        return boxesArr.map((b: any) => ({ id: String(b.id), name: String(b.name ?? b.id) }));
      },
      materialsCatalog: async () => {
        const cfg = cfgLoader.load();
        const mats: any[] = Array.isArray((cfg as any).materials)
          ? ((cfg as any).materials as any[])
          : [];
        return mats.map((m: any) => ({ id: String(m.id), name: String(m.name ?? m.id) }));
      },
      collectionLog: async (_: any, __: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const started = Date.now();
        const cfg = cfgLoader.load();
        const items: any[] = Array.isArray(cfg.items) ? (cfg.items as any[]) : [];
        const mods: any[] = Array.isArray((cfg as any).modifiers?.static)
          ? ((cfg as any).modifiers.static as any[])
          : [];
        const cosmetic = new Set<string>(
          mods.filter((m: any) => m.category === 'COSMETIC').map((m: any) => String(m.id)),
        );
        const mechanical = new Set<string>(
          mods.filter((m: any) => m.category === 'MECHANICAL').map((m: any) => String(m.id)),
        );
        // discovered types by scanning idx:type once
        const discoveredTypes = new Set<string>();
        await storage.scanPrefix(`idx:type:${uid}:`, (k) => {
          const parts = k.split(':');
          const typeId = parts[3];
          if (typeId) discoveredTypes.add(typeId);
        });
        const outItems = items.map((it: any) => {
          const allow: string[] = Array.isArray(it.allowedStaticMods) ? it.allowedStaticMods : [];
          const hasCos = allow.some((id) => cosmetic.has(String(id)));
          const hasMech = allow.some((id) => mechanical.has(String(id)));
          return {
            id: String(it.id),
            name: String(it.name),
            typeId: String(it.typeId),
            rarity: String(it.rarity),
            hint: typeof it.hint === 'string' ? it.hint : null,
            hasCosmetic: hasCos,
            hasMechanical: hasMech,
            discovered: discoveredTypes.has(String(it.typeId)),
          };
        });
        // progress by rarity
        const byRarityMap = new Map<string, { total: number; disc: number }>();
        for (const it of outItems) {
          const k = String(it.rarity);
          const v = byRarityMap.get(k) ?? { total: 0, disc: 0 };
          v.total += 1;
          if (it.discovered) v.disc += 1;
          byRarityMap.set(k, v);
        }
        const byTypeMap = new Map<string, { total: number; disc: number }>();
        for (const it of outItems) {
          const k = String(it.typeId);
          const v = byTypeMap.get(k) ?? { total: 0, disc: 0 };
          v.total += 1;
          if (it.discovered) v.disc += 1;
          byTypeMap.set(k, v);
        }
        const res = {
          items: outItems,
          byRarity: Array.from(byRarityMap.entries()).map(([key, v]) => ({
            key,
            discovered: v.disc,
            total: v.total,
          })),
          byType: Array.from(byTypeMap.entries()).map(([key, v]) => ({
            key,
            discovered: v.disc,
            total: v.total,
          })),
        };
        const entry = telemetry.buildEntry(
          'collectionLog',
          uid,
          ctx?.reqId ?? 'n/a',
          Date.now() - started,
          { n: outItems.length },
        );
        await telemetry.write(entry);
        return res;
      },
      inventoryList: async (_: any, { filter, limit, cursor }: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const started = Date.now();
        const res = await listSvc.list(uid, filter, limit, cursor ?? undefined);
        const entry = telemetry.buildEntry(
          'inventoryList',
          uid,
          ctx?.reqId ?? 'n/a',
          Date.now() - started,
          res,
        );
        await telemetry.write(entry);
        return res;
      },
      configHash: () => {
        if (process.env.EXPOSE_CONFIG_HASH === '1' || process.env.NODE_ENV !== 'production') {
          return configSvc.computeHash();
        }
        return 'disabled';
      },
      shop: async (_: any, __: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const res = await shopSvc.getShop(uid);
        return res;
      },
      progression: async (_: any, __: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const cfg = cfgLoader.load();
        const milestones: any[] = Array.isArray((cfg as any).unlocks?.milestones)
          ? ((cfg as any).unlocks.milestones as any[])
          : [];
        const rngs: any[] = Array.isArray((cfg as any).unlocks?.rngUnlocks)
          ? ((cfg as any).unlocks.rngUnlocks as any[])
          : [];
        const lifetimeKey = `pstat:${uid}.lifetimeBoxesOpened`;
        const currentOpens = Number(u64.decodeBE(await storage.get(lifetimeKey)));
        // unlocked boxes profile
        const pbuf = await storage.get(`ppro:${uid}`);
        let unlocked: string[] = [];
        if (pbuf) {
          try {
            const p = JSON.parse(String(pbuf));
            if (Array.isArray(p.unlockedBoxIds)) unlocked = p.unlockedBoxIds;
          } catch {}
        }
        const mOut = milestones.map((m: any) => {
          // compute target from first OPEN_COUNT requirement
          const reqs: any[] = Array.isArray(m.requirements) ? m.requirements : [];
          const reqOpen = reqs.find((r: any) => r.type === 'OPEN_COUNT');
          const target = Number(reqOpen?.count ?? 0);
          const label = String(m.id);
          // unlocked if any unlocks[].boxId present in unlocked list
          let isUnlocked = false;
          const us: any[] = Array.isArray(m.unlocks) ? m.unlocks : [];
          for (const u of us) {
            if (u?.kind === 'BOX_TYPE' && unlocked.includes(String(u.boxId))) {
              isUnlocked = true;
              break;
            }
          }
          return {
            id: String(m.id),
            label,
            target,
            current: Math.min(currentOpens, target || currentOpens),
            unlocked: isUnlocked,
          };
        });
        const rOut = rngs.map((r: any) => ({ id: String(r.id), label: '???', discovered: false }));
        return { milestones: mOut, rng: rOut };
      },
    },
    Mutation: {
      openBoxes: async (_: any, { input }: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        if (input?.count > 1000) {
          throw new Error('batch too large: max 1000');
        }
        const started = Date.now();
        const res = await openSvc.open(uid, input);
        const reqId: string = input?.requestId ?? ctx?.reqId ?? 'n/a';
        const entry = telemetry.buildEntry('openBoxes', uid, reqId, Date.now() - started, res);
        await telemetry.write(entry);
        return res;
      },
      salvage: async (_: any, { input }: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const started = Date.now();
        const res = await salvageSvc.salvage(uid, input);
        const entry = telemetry.buildEntry(
          'salvage',
          uid,
          ctx?.reqId ?? 'n/a',
          Date.now() - started,
          res,
        );
        await telemetry.write(entry);
        return res;
      },
      claimIdle: async (_: any, { input }: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const started = Date.now();
        const res = await idleSvc.claim(uid);
        const entry = telemetry.buildEntry(
          'claimIdle',
          uid,
          ctx?.reqId ?? 'n/a',
          Date.now() - started,
          res,
        );
        await telemetry.write(entry);
        return res;
      },
      purchaseUpgrade: async (_: any, { input }: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const res = await shopSvc.purchase(uid, String(input?.upgradeId));
        return res;
      },
      exchangeScrapToKeys: async (_: any, { input }: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        const toAmount = Number(input?.toAmount ?? 0);
        const res = await shopSvc.exchange(uid, toAmount);
        return res;
      },
    },
  } as const;

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  const app = express();
  // simple per-request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (logLevel !== 'silent') {
        // eslint-disable-next-line no-console
        console.log(`[api] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });
  app.get('/healthz', (_req, res) => res.status(200).send('ok'));
  app.use(
    graphqlPath,
    cors<CorsRequest>(corsOrigin === false ? {} : { origin: corsOrigin }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => buildContext(req),
    }),
  );

  // REST API for MVP per tech brief §6
  app.get('/inv/summary', async (req, res) => {
    try {
      const uid = String(req.header('X-User-ID') ?? 'anonymous');
      const started = Date.now();
      const data = await summarySvc.getSummary(uid);
      const entry = telemetry.buildEntry(
        'inventorySummary',
        uid,
        String(req.header('X-Request-ID') ?? 'n/a'),
        Date.now() - started,
        data,
      );
      await telemetry.write(entry);
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'bad request' });
    }
  });
  app.get('/inv/list', async (req, res) => {
    try {
      const uid = String(req.header('X-User-ID') ?? 'anonymous');
      const filter = {
        rarity: req.query.rarity as string | undefined,
        typeId: req.query.typeId as string | undefined,
        sourceBoxId: req.query.sourceBoxId as string | undefined,
        curatedTags: typeof req.query.tag === 'string' ? [req.query.tag as string] : [],
      } as any;
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const cursor = (req.query.cursor as string | undefined) ?? undefined;
      const started = Date.now();
      const data = await listSvc.list(uid, filter, limit, cursor);
      const entry = telemetry.buildEntry(
        'inventoryList',
        uid,
        String(req.header('X-Request-ID') ?? 'n/a'),
        Date.now() - started,
        data,
      );
      await telemetry.write(entry);
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'bad request' });
    }
  });
  app.post('/inv/mutate', express.json(), async (req, res) => {
    try {
      const uid = String(req.header('X-User-ID') ?? 'anonymous');
      const reqId = String(req.header('X-Request-ID') ?? req.body?.requestId ?? 'n/a');
      const action = String(req.body?.action ?? '');
      const input = req.body?.input ?? {};
      if (action === 'openBoxes') {
        const started = Date.now();
        const data = await openSvc.open(uid, {
          boxId: input.boxId,
          count: Number(input.count ?? 1),
          requestId: reqId,
        });
        const entry = telemetry.buildEntry('openBoxes', uid, reqId, Date.now() - started, data);
        await telemetry.write(entry);
        return res.json(data);
      } else if (action === 'salvage') {
        const started = Date.now();
        const data = await salvageSvc.salvage(uid, input);
        const entry = telemetry.buildEntry('salvage', uid, reqId, Date.now() - started, data);
        await telemetry.write(entry);
        return res.json(data);
      }
      return res.status(400).json({ error: 'unknown action' });
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? 'bad request' });
    }
  });

  const httpServer = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 API ready at http://localhost:${port}${graphqlPath}`);
  });

  return { app, server, httpServer, url: `http://localhost:${port}${graphqlPath}` };
}
