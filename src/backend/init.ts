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

  const httpServer = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 API ready at http://localhost:${port}${graphqlPath}`);
  });

  return { app, server, httpServer, url: `http://localhost:${port}${graphqlPath}` };
}
