import { buildContext } from '../../src/backend/api/context';
import type { Request } from 'express';
import { ApolloServer } from '@apollo/server';
import { describe, it, expect } from '@jest/globals';

describe('Context extractor', () => {
  it('extracts uid from X-User-Id header', () => {
    const req = {
      headers: { 'x-user-id': 'user-123', 'x-request-id': 'req-1' },
    } as unknown as Request;
    const ctx = buildContext(req);
    expect(ctx.uid).toBe('user-123');
    expect(ctx.reqId).toBe('req-1');
  });

  it('resolver reads uid from context', async () => {
    const typeDefs = `type Query { whoami: String! }`;
    const server = new ApolloServer({
      typeDefs,
      resolvers: {
        Query: { whoami: (_: any, __: any, ctx: any) => ctx.uid },
      },
    });
    await server.start();
    const res: any = await server.executeOperation(
      { query: 'query{whoami}' },
      { contextValue: { uid: 'user-A' } as any },
    );
    const data = res.body?.singleResult?.data ?? res.data;
    expect(data.whoami).toBe('user-A');
    await server.stop();
  });
});
