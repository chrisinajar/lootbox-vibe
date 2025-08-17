import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express from 'express';
import cors from 'cors';
import type { CorsRequest } from 'cors';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type InitOptions = {
  port?: number;
  graphqlPath?: string;
  corsOrigin?: string | boolean;
};

export async function initializeServer(options: InitOptions = {}) {
  const port = options.port ?? 4000;
  const graphqlPath = options.graphqlPath ?? '/graphql';
  const corsOrigin = options.corsOrigin ?? 'http://localhost:5173';

  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.resolve(dirname, './api/schema.graphql');
  const typeDefs = fs.readFileSync(schemaPath, 'utf8');

  const resolvers = {
    Query: {
      ok: () => 'ok',
    },
  };

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  const app = express();
  app.get('/healthz', (_req, res) => res.status(200).send('ok'));
  app.use(
    graphqlPath,
    cors<CorsRequest>(corsOrigin === false ? {} : { origin: corsOrigin }),
    express.json(),
    expressMiddleware(server),
  );

  const httpServer = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 API ready at http://localhost:${port}${graphqlPath}`);
  });

  return { app, server, httpServer, url: `http://localhost:${port}${graphqlPath}` };
}

