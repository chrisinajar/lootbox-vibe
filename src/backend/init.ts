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
import { ConfigService } from './services/ConfigService';
import { buildContext } from './api/context';
import { OpenBoxesService } from './services/OpenBoxesService';
import { SalvageService } from './services/SalvageService';

type InitOptions = {
  port?: number;
  graphqlPath?: string;
  corsOrigin?: string | boolean;
};

export async function initializeServer(options: InitOptions = {}) {
  const port = options.port ?? Number(process.env.API_PORT ?? 4000);
  const graphqlPath = options.graphqlPath ?? '/graphql';
  const corsOrigin = options.corsOrigin ?? (process.env.CORS_ORIGIN ?? 'http://localhost:5173');
  const logLevel = process.env.LOG_LEVEL ?? 'info';

  const schemaPath = path.resolve(__dirname, './api/schema.graphql');
  const typeDefs = fs.readFileSync(schemaPath, 'utf8');

  // storage + services
  const dbPath = path.resolve(process.cwd(), 'data/leveldb');
  const storage = new LevelStorage(dbPath);
  await storage.open();
  const summariesRepo = new SummariesRepo(storage);
  const summarySvc = new InventorySummaryService(summariesRepo);
  const openSvc = new OpenBoxesService(storage);
  const salvageSvc = new SalvageService(storage);

  const configSvc = new ConfigService();

  const resolvers = {
    BigInt: BigIntResolver,
    Query: {
      inventorySummary: async (_: any, __: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        return await summarySvc.getSummary(uid);
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
        return await openSvc.open(uid, input);
      },
      salvage: async (_: any, { input }: any, ctx: any) => {
        const uid: string = ctx?.uid ?? 'anonymous';
        return await salvageSvc.salvage(uid, input);
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
