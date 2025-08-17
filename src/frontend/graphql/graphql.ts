/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: any; output: any; }
};

export type CountByRarity = {
  __typename?: 'CountByRarity';
  count: Scalars['BigInt']['output'];
  rarity: Rarity;
};

export type CountByType = {
  __typename?: 'CountByType';
  count: Scalars['BigInt']['output'];
  typeId: Scalars['ID']['output'];
};

export type InventorySummary = {
  __typename?: 'InventorySummary';
  byRarity: Array<CountByRarity>;
  byType: Array<CountByType>;
  totalItems: Scalars['BigInt']['output'];
  totalStacks: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  openBoxes: Rewards;
  salvage: SalvageResult;
};


export type MutationOpenBoxesArgs = {
  input: OpenBoxesInput;
};


export type MutationSalvageArgs = {
  input: SalvageInput;
};

export type OpenBoxesInput = {
  boxId: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
  requestId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  configHash: Scalars['String']['output'];
  inventorySummary: InventorySummary;
};

export enum Rarity {
  Common = 'COMMON',
  Epic = 'EPIC',
  Legendary = 'LEGENDARY',
  Mythic = 'MYTHIC',
  Rare = 'RARE',
  Uncommon = 'UNCOMMON'
}

export type RewardCurrency = {
  __typename?: 'RewardCurrency';
  amount: Scalars['BigInt']['output'];
  currency: Scalars['ID']['output'];
};

export type RewardStack = {
  __typename?: 'RewardStack';
  count: Scalars['Int']['output'];
  rarity: Rarity;
  stackId: Scalars['ID']['output'];
  typeId: Scalars['ID']['output'];
};

export type Rewards = {
  __typename?: 'Rewards';
  currencies: Array<RewardCurrency>;
  stacks: Array<RewardStack>;
  unlocks: Array<Scalars['ID']['output']>;
};

export type SalvageInput = {
  maxRarity: Rarity;
  staticModIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  typeIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type SalvageResult = {
  __typename?: 'SalvageResult';
  currencies: Array<RewardCurrency>;
  scrapped: Array<RewardStack>;
};

export type InventorySummaryQueryVariables = Exact<{ [key: string]: never; }>;


export type InventorySummaryQuery = { __typename?: 'Query', inventorySummary: { __typename?: 'InventorySummary', totalStacks: number, totalItems: any, byRarity: Array<{ __typename?: 'CountByRarity', rarity: Rarity, count: any }>, byType: Array<{ __typename?: 'CountByType', typeId: string, count: any }> } };

export type OpenBoxesMutationVariables = Exact<{
  input: OpenBoxesInput;
}>;


export type OpenBoxesMutation = { __typename?: 'Mutation', openBoxes: { __typename?: 'Rewards', unlocks: Array<string>, stacks: Array<{ __typename?: 'RewardStack', stackId: string, typeId: string, rarity: Rarity, count: number }>, currencies: Array<{ __typename?: 'RewardCurrency', currency: string, amount: any }> } };

export type SalvageMutationVariables = Exact<{
  input: SalvageInput;
}>;


export type SalvageMutation = { __typename?: 'Mutation', salvage: { __typename?: 'SalvageResult', scrapped: Array<{ __typename?: 'RewardStack', stackId: string, typeId: string, rarity: Rarity, count: number }>, currencies: Array<{ __typename?: 'RewardCurrency', currency: string, amount: any }> } };


export const InventorySummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"InventorySummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inventorySummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalStacks"}},{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"byRarity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rarity"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"byType"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<InventorySummaryQuery, InventorySummaryQueryVariables>;
export const OpenBoxesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"OpenBoxes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OpenBoxesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"openBoxes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stacks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stackId"}},{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"rarity"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"currencies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unlocks"}}]}}]}}]} as unknown as DocumentNode<OpenBoxesMutation, OpenBoxesMutationVariables>;
export const SalvageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Salvage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SalvageInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"salvage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scrapped"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stackId"}},{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"rarity"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"currencies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]} as unknown as DocumentNode<SalvageMutation, SalvageMutationVariables>;