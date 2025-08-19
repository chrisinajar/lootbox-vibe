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

export type BoxInfo = {
  __typename?: 'BoxInfo';
  cost: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type ClaimIdleInput = {
  noop?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CollectionItem = {
  __typename?: 'CollectionItem';
  discovered: Scalars['Boolean']['output'];
  hasCosmetic: Scalars['Boolean']['output'];
  hasMechanical: Scalars['Boolean']['output'];
  hint?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  rarity: Rarity;
  typeId: Scalars['ID']['output'];
};

export type CollectionLog = {
  __typename?: 'CollectionLog';
  byRarity: Array<CountProgress>;
  byType: Array<CountProgress>;
  items: Array<CollectionItem>;
};

export type CosmeticDrop = {
  __typename?: 'CosmeticDrop';
  modId: Scalars['ID']['output'];
  modName: Scalars['String']['output'];
  typeId: Scalars['ID']['output'];
};

export type CountByRarity = {
  __typename?: 'CountByRarity';
  count: Scalars['BigInt']['output'];
  rarity: Rarity;
};

export type CountBySource = {
  __typename?: 'CountBySource';
  count: Scalars['BigInt']['output'];
  sourceBoxId: Scalars['ID']['output'];
};

export type CountByType = {
  __typename?: 'CountByType';
  count: Scalars['BigInt']['output'];
  typeId: Scalars['ID']['output'];
};

export type CountProgress = {
  __typename?: 'CountProgress';
  discovered: Scalars['Int']['output'];
  key: Scalars['ID']['output'];
  total: Scalars['Int']['output'];
};

export type CurrencyBalance = {
  __typename?: 'CurrencyBalance';
  amount: Scalars['BigInt']['output'];
  currency: Scalars['ID']['output'];
};

export type ExchangeInfo = {
  __typename?: 'ExchangeInfo';
  dailyCapTo: Scalars['Int']['output'];
  from: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  mintedToday: Scalars['Int']['output'];
  rateFrom: Scalars['Int']['output'];
  rateTo: Scalars['Int']['output'];
  to: Scalars['ID']['output'];
};

export type ExchangeInput = {
  toAmount: Scalars['Int']['input'];
};

export type IdleClaim = {
  __typename?: 'IdleClaim';
  boxesOpened: Scalars['Int']['output'];
  message: Scalars['String']['output'];
};

export type IdleReport = {
  __typename?: 'IdleReport';
  boxesOpened: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  rewards: Rewards;
};

export type InventoryFilter = {
  curatedTags?: InputMaybe<Array<Scalars['ID']['input']>>;
  rarity?: InputMaybe<Rarity>;
  sourceBoxId?: InputMaybe<Scalars['ID']['input']>;
  typeId?: InputMaybe<Scalars['ID']['input']>;
};

export type InventorySummary = {
  __typename?: 'InventorySummary';
  byRarity: Array<CountByRarity>;
  bySource: Array<CountBySource>;
  byType: Array<CountByType>;
  totalItems: Scalars['BigInt']['output'];
  totalStacks: Scalars['Int']['output'];
};

export type ItemStack = {
  __typename?: 'ItemStack';
  count: Scalars['Int']['output'];
  rarity: Rarity;
  stackId: Scalars['ID']['output'];
  typeId: Scalars['ID']['output'];
};

export type MaterialInfo = {
  __typename?: 'MaterialInfo';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Milestone = {
  __typename?: 'Milestone';
  current: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  target: Scalars['Int']['output'];
  unlocked: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  claimIdle: IdleReport;
  exchangeScrapToKeys: ShopState;
  openBoxes: Rewards;
  purchaseUpgrade: ShopState;
  salvage: SalvageResult;
};


export type MutationClaimIdleArgs = {
  input?: InputMaybe<ClaimIdleInput>;
};


export type MutationExchangeScrapToKeysArgs = {
  input: ExchangeInput;
};


export type MutationOpenBoxesArgs = {
  input: OpenBoxesInput;
};


export type MutationPurchaseUpgradeArgs = {
  input: PurchaseUpgradeInput;
};


export type MutationSalvageArgs = {
  input: SalvageInput;
};

export type OpenBoxesInput = {
  boxId: Scalars['ID']['input'];
  count: Scalars['Int']['input'];
  requestId: Scalars['ID']['input'];
};

export type PageItemStacks = {
  __typename?: 'PageItemStacks';
  nextCursor?: Maybe<Scalars['ID']['output']>;
  rows: Array<ItemStack>;
};

export type Progression = {
  __typename?: 'Progression';
  milestones: Array<Milestone>;
  rng: Array<RngUnlock>;
};

export type PurchaseUpgradeInput = {
  upgradeId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  availableBoxes: Array<BoxInfo>;
  boxCatalog: Array<BoxInfo>;
  collectionLog: CollectionLog;
  configHash: Scalars['String']['output'];
  currencies: Array<CurrencyBalance>;
  inventoryList: PageItemStacks;
  inventorySummary: InventorySummary;
  materialsCatalog: Array<MaterialInfo>;
  progression: Progression;
  shop: ShopState;
  unlockedBoxes: Array<Scalars['ID']['output']>;
};


export type QueryInventoryListArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  filter?: InputMaybe<InventoryFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
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
  cosmetics: Array<CosmeticDrop>;
  currencies: Array<RewardCurrency>;
  stacks: Array<RewardStack>;
  unlocks: Array<Scalars['ID']['output']>;
};

export type RngUnlock = {
  __typename?: 'RngUnlock';
  discovered: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
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

export type ShopState = {
  __typename?: 'ShopState';
  exchange: ExchangeInfo;
  upgrades: Array<Upgrade>;
};

export type Upgrade = {
  __typename?: 'Upgrade';
  costScrap: Scalars['Int']['output'];
  desc: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  purchased: Scalars['Boolean']['output'];
};

export type AvailableBoxesQueryVariables = Exact<{ [key: string]: never; }>;


export type AvailableBoxesQuery = { __typename?: 'Query', availableBoxes: Array<{ __typename?: 'BoxInfo', id: string, name: string, cost: number }> };

export type BoxCatalogQueryVariables = Exact<{ [key: string]: never; }>;


export type BoxCatalogQuery = { __typename?: 'Query', boxCatalog: Array<{ __typename?: 'BoxInfo', id: string, name: string, cost: number }> };

export type CollectionLogQueryVariables = Exact<{ [key: string]: never; }>;


export type CollectionLogQuery = { __typename?: 'Query', collectionLog: { __typename?: 'CollectionLog', items: Array<{ __typename?: 'CollectionItem', id: string, name: string, typeId: string, rarity: Rarity, hint?: string | null, hasCosmetic: boolean, hasMechanical: boolean, discovered: boolean }>, byRarity: Array<{ __typename?: 'CountProgress', key: string, discovered: number, total: number }>, byType: Array<{ __typename?: 'CountProgress', key: string, discovered: number, total: number }> } };

export type CurrenciesQueryVariables = Exact<{ [key: string]: never; }>;


export type CurrenciesQuery = { __typename?: 'Query', currencies: Array<{ __typename?: 'CurrencyBalance', currency: string, amount: any }> };

export type InventoryListQueryVariables = Exact<{
  filter?: InputMaybe<InventoryFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['ID']['input']>;
}>;


export type InventoryListQuery = { __typename?: 'Query', inventoryList: { __typename?: 'PageItemStacks', nextCursor?: string | null, rows: Array<{ __typename?: 'ItemStack', stackId: string, typeId: string, rarity: Rarity, count: number }> } };

export type InventorySummaryQueryVariables = Exact<{ [key: string]: never; }>;


export type InventorySummaryQuery = { __typename?: 'Query', inventorySummary: { __typename?: 'InventorySummary', totalStacks: number, totalItems: any, byRarity: Array<{ __typename?: 'CountByRarity', rarity: Rarity, count: any }>, byType: Array<{ __typename?: 'CountByType', typeId: string, count: any }> } };

export type MaterialsCatalogQueryVariables = Exact<{ [key: string]: never; }>;


export type MaterialsCatalogQuery = { __typename?: 'Query', materialsCatalog: Array<{ __typename?: 'MaterialInfo', id: string, name: string }> };

export type OpenBoxesMutationVariables = Exact<{
  input: OpenBoxesInput;
}>;


export type OpenBoxesMutation = { __typename?: 'Mutation', openBoxes: { __typename?: 'Rewards', unlocks: Array<string>, stacks: Array<{ __typename?: 'RewardStack', stackId: string, typeId: string, rarity: Rarity, count: number }>, currencies: Array<{ __typename?: 'RewardCurrency', currency: string, amount: any }>, cosmetics: Array<{ __typename?: 'CosmeticDrop', typeId: string, modId: string, modName: string }> } };

export type ProgressionQueryVariables = Exact<{ [key: string]: never; }>;


export type ProgressionQuery = { __typename?: 'Query', progression: { __typename?: 'Progression', milestones: Array<{ __typename?: 'Milestone', id: string, label: string, target: number, current: number, unlocked: boolean }>, rng: Array<{ __typename?: 'RngUnlock', id: string, label: string, discovered: boolean }> } };

export type ClaimIdleMutationVariables = Exact<{
  input?: InputMaybe<ClaimIdleInput>;
}>;


export type ClaimIdleMutation = { __typename?: 'Mutation', claimIdle: { __typename?: 'IdleReport', message: string, boxesOpened: number, rewards: { __typename?: 'Rewards', unlocks: Array<string> } } };

export type SalvageMutationVariables = Exact<{
  input: SalvageInput;
}>;


export type SalvageMutation = { __typename?: 'Mutation', salvage: { __typename?: 'SalvageResult', scrapped: Array<{ __typename?: 'RewardStack', stackId: string, typeId: string, rarity: Rarity, count: number }>, currencies: Array<{ __typename?: 'RewardCurrency', currency: string, amount: any }> } };

export type ShopQueryVariables = Exact<{ [key: string]: never; }>;


export type ShopQuery = { __typename?: 'Query', shop: { __typename?: 'ShopState', upgrades: Array<{ __typename?: 'Upgrade', id: string, name: string, desc: string, costScrap: number, purchased: boolean }>, exchange: { __typename?: 'ExchangeInfo', id: string, from: string, to: string, rateFrom: number, rateTo: number, mintedToday: number, dailyCapTo: number } } };

export type PurchaseUpgradeMutationVariables = Exact<{
  input: PurchaseUpgradeInput;
}>;


export type PurchaseUpgradeMutation = { __typename?: 'Mutation', purchaseUpgrade: { __typename?: 'ShopState', upgrades: Array<{ __typename?: 'Upgrade', id: string, purchased: boolean }>, exchange: { __typename?: 'ExchangeInfo', mintedToday: number } } };

export type ExchangeScrapToKeysMutationVariables = Exact<{
  input: ExchangeInput;
}>;


export type ExchangeScrapToKeysMutation = { __typename?: 'Mutation', exchangeScrapToKeys: { __typename?: 'ShopState', exchange: { __typename?: 'ExchangeInfo', mintedToday: number } } };

export type UnlockedBoxesQueryVariables = Exact<{ [key: string]: never; }>;


export type UnlockedBoxesQuery = { __typename?: 'Query', unlockedBoxes: Array<string> };


export const AvailableBoxesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AvailableBoxes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableBoxes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}}]}}]}}]} as unknown as DocumentNode<AvailableBoxesQuery, AvailableBoxesQueryVariables>;
export const BoxCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BoxCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"boxCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}}]}}]}}]} as unknown as DocumentNode<BoxCatalogQuery, BoxCatalogQueryVariables>;
export const CollectionLogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CollectionLog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"collectionLog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"rarity"}},{"kind":"Field","name":{"kind":"Name","value":"hint"}},{"kind":"Field","name":{"kind":"Name","value":"hasCosmetic"}},{"kind":"Field","name":{"kind":"Name","value":"hasMechanical"}},{"kind":"Field","name":{"kind":"Name","value":"discovered"}}]}},{"kind":"Field","name":{"kind":"Name","value":"byRarity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"discovered"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"byType"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"discovered"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]}}]} as unknown as DocumentNode<CollectionLogQuery, CollectionLogQueryVariables>;
export const CurrenciesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Currencies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currencies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]} as unknown as DocumentNode<CurrenciesQuery, CurrenciesQueryVariables>;
export const InventoryListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"InventoryList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"InventoryFilter"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inventoryList"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stackId"}},{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"rarity"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}}]} as unknown as DocumentNode<InventoryListQuery, InventoryListQueryVariables>;
export const InventorySummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"InventorySummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inventorySummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalStacks"}},{"kind":"Field","name":{"kind":"Name","value":"totalItems"}},{"kind":"Field","name":{"kind":"Name","value":"byRarity"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rarity"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"byType"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<InventorySummaryQuery, InventorySummaryQueryVariables>;
export const MaterialsCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MaterialsCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"materialsCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<MaterialsCatalogQuery, MaterialsCatalogQueryVariables>;
export const OpenBoxesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"OpenBoxes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OpenBoxesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"openBoxes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stacks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stackId"}},{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"rarity"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"currencies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unlocks"}},{"kind":"Field","name":{"kind":"Name","value":"cosmetics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"modId"}},{"kind":"Field","name":{"kind":"Name","value":"modName"}}]}}]}}]}}]} as unknown as DocumentNode<OpenBoxesMutation, OpenBoxesMutationVariables>;
export const ProgressionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Progression"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"progression"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"milestones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"unlocked"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rng"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"discovered"}}]}}]}}]}}]} as unknown as DocumentNode<ProgressionQuery, ProgressionQueryVariables>;
export const ClaimIdleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClaimIdle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ClaimIdleInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"claimIdle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"boxesOpened"}},{"kind":"Field","name":{"kind":"Name","value":"rewards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlocks"}}]}}]}}]}}]} as unknown as DocumentNode<ClaimIdleMutation, ClaimIdleMutationVariables>;
export const SalvageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Salvage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SalvageInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"salvage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scrapped"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stackId"}},{"kind":"Field","name":{"kind":"Name","value":"typeId"}},{"kind":"Field","name":{"kind":"Name","value":"rarity"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"currencies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]} as unknown as DocumentNode<SalvageMutation, SalvageMutationVariables>;
export const ShopDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Shop"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shop"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upgrades"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"desc"}},{"kind":"Field","name":{"kind":"Name","value":"costScrap"}},{"kind":"Field","name":{"kind":"Name","value":"purchased"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exchange"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"from"}},{"kind":"Field","name":{"kind":"Name","value":"to"}},{"kind":"Field","name":{"kind":"Name","value":"rateFrom"}},{"kind":"Field","name":{"kind":"Name","value":"rateTo"}},{"kind":"Field","name":{"kind":"Name","value":"mintedToday"}},{"kind":"Field","name":{"kind":"Name","value":"dailyCapTo"}}]}}]}}]}}]} as unknown as DocumentNode<ShopQuery, ShopQueryVariables>;
export const PurchaseUpgradeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PurchaseUpgrade"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PurchaseUpgradeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseUpgrade"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upgrades"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchased"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exchange"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mintedToday"}}]}}]}}]}}]} as unknown as DocumentNode<PurchaseUpgradeMutation, PurchaseUpgradeMutationVariables>;
export const ExchangeScrapToKeysDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExchangeScrapToKeys"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ExchangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exchangeScrapToKeys"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exchange"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mintedToday"}}]}}]}}]}}]} as unknown as DocumentNode<ExchangeScrapToKeysMutation, ExchangeScrapToKeysMutationVariables>;
export const UnlockedBoxesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UnlockedBoxes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlockedBoxes"}}]}}]} as unknown as DocumentNode<UnlockedBoxesQuery, UnlockedBoxesQueryVariables>;