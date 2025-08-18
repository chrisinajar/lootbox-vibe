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
import { TelemetryService } from './services/TelemetryService';

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
  const elogPath = process.env.ELOG_PATH;
  const elogEnabled = process.env.ELOG_ENABLED !== '0' && Boolean(elogPath);
  const telemetry = new TelemetryService({ outPath: elogPath, enabled: elogEnabled });

  const configSvc = new ConfigService();

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
