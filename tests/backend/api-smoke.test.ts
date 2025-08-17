import { ApolloServer } from '@apollo/server';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';

const schemaPath = path.resolve(__dirname, '../../src/backend/api/schema.graphql');

describe('API smoke', () => {
  it('responds to ok', async () => {
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    const server = new ApolloServer({ typeDefs, resolvers: { Query: { ok: () => 'ok' } } });
    await server.start();
    const res = await server.executeOperation({ query: 'query { ok }' });
    expect(res.errors).toBeUndefined();
    expect(res.data?.ok).toBe('ok');
    await server.stop();
  });
});
