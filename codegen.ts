import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/backend/api/schema.graphql',
  documents: ['src/frontend/**/*.graphql', 'src/frontend/**/*.{ts,tsx}'],
  generates: {
    'src/frontend/graphql/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
  },
};

export default config;
