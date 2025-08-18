import { ApolloServer } from '@apollo/server';
import { BigIntResolver } from 'graphql-scalars';
import { describe, it, expect } from '@jest/globals';

describe('BigInt serialization', () => {
  it('returns huge counts as strings without precision loss', async () => {
    const typeDefs = `scalar BigInt\n type Query { sample: BigInt! }`;
    const server = new ApolloServer({
      typeDefs,
      resolvers: { BigInt: BigIntResolver, Query: { sample: () => 10n ** 18n } },
    });
    await server.start();
    const res: any = await server.executeOperation({ query: 'query{sample}' });
    const data = res.body?.singleResult?.data ?? res.data;
    expect(typeof data.sample).toBe('string');
    expect(data.sample).toBe('1000000000000000000');
    await server.stop();
  });
});
