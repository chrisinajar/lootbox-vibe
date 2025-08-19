import fs from 'node:fs';
import path from 'node:path';

import { ApolloServer } from '@apollo/server';
// executeOperation-based smoke in sandbox (no HTTP listen)
import { describe, it, expect } from '@jest/globals';
import { BigIntResolver } from 'graphql-scalars';

const schemaPath = path.resolve(__dirname, '../../src/backend/api/schema.graphql');

describe('API smoke', () => {
  it('responds with inventorySummary shape', async () => {
    const typeDefs = fs.readFileSync(schemaPath, 'utf8');
    const server = new ApolloServer({
      typeDefs,
      resolvers: {
        BigInt: BigIntResolver,
        Query: {
          inventorySummary: () => ({
            totalStacks: 42,
            totalItems: 2025n,
            byRarity: [
              { rarity: 'COMMON', count: 1500n },
              { rarity: 'UNCOMMON', count: 400n },
            ],
            byType: [
              { typeId: 'Banana', count: 1200n },
              { typeId: 'Paperclip', count: 300n },
            ],
          }),
        },
      },
    });
    await server.start();
    const q = `
      query InventorySummary {
        inventorySummary {
          totalStacks
          totalItems
          byRarity { rarity count }
          byType { typeId count }
        }
      }
    `;
    const res: any = await server.executeOperation({ query: q });
    const data = res.body?.singleResult?.data?.inventorySummary ?? res.data?.inventorySummary;
    expect(data).toBeDefined();
    expect(typeof data.totalStacks).toBe('number');
    expect(data.totalStacks).toBeGreaterThanOrEqual(0);
    // BigInt comes serialized as string in JSON
    expect(typeof data.totalItems === 'string' || typeof data.totalItems === 'number').toBeTruthy();
    expect(Array.isArray(data.byRarity)).toBe(true);
    for (const r of data.byRarity) {
      expect(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']).toContain(r.rarity);
      expect(typeof r.count === 'string' || typeof r.count === 'number').toBeTruthy();
    }
    expect(Array.isArray(data.byType)).toBe(true);
    for (const t of data.byType) {
      expect(typeof t.typeId).toBe('string');
      expect(typeof t.count === 'string' || typeof t.count === 'number').toBeTruthy();
    }

    await server.stop();
  });
});
