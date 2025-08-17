import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloClient, ApolloProvider, InMemoryCache, gql, useQuery, HttpLink } from '@apollo/client';
import App from './ui/App';
import './index.css';

const client = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:4000/graphql' }),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>,
);

export const OkProbe: React.FC = () => {
  const { data, loading, error } = useQuery(gql`query Ok { ok }`);
  if (loading) return <span>Loading…</span>;
  if (error) return <span>Error: {error.message}</span>;
  return <span>API says: {data.ok}</span>;
};
