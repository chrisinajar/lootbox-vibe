/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query CollectionLog {\n  collectionLog {\n    items {\n      id\n      name\n      typeId\n      rarity\n      hint\n      hasCosmetic\n      hasMechanical\n      discovered\n    }\n    byRarity {\n      key\n      discovered\n      total\n    }\n    byType {\n      key\n      discovered\n      total\n    }\n  }\n}": typeof types.CollectionLogDocument,
    "query Currencies {\n  currencies {\n    currency\n    amount\n  }\n}": typeof types.CurrenciesDocument,
    "query InventoryList($filter: InventoryFilter, $limit: Int, $cursor: ID) {\n  inventoryList(filter: $filter, limit: $limit, cursor: $cursor) {\n    rows {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    nextCursor\n  }\n}": typeof types.InventoryListDocument,
    "query InventorySummary {\n  inventorySummary {\n    totalStacks\n    totalItems\n    byRarity {\n      rarity\n      count\n    }\n    byType {\n      typeId\n      count\n    }\n  }\n}": typeof types.InventorySummaryDocument,
    "mutation OpenBoxes($input: OpenBoxesInput!) {\n  openBoxes(input: $input) {\n    stacks {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    currencies {\n      currency\n      amount\n    }\n    unlocks\n  }\n}": typeof types.OpenBoxesDocument,
    "mutation Salvage($input: SalvageInput!) {\n  salvage(input: $input) {\n    scrapped {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    currencies {\n      currency\n      amount\n    }\n  }\n}": typeof types.SalvageDocument,
    "query UnlockedBoxes {\n  unlockedBoxes\n}": typeof types.UnlockedBoxesDocument,
};
const documents: Documents = {
    "query CollectionLog {\n  collectionLog {\n    items {\n      id\n      name\n      typeId\n      rarity\n      hint\n      hasCosmetic\n      hasMechanical\n      discovered\n    }\n    byRarity {\n      key\n      discovered\n      total\n    }\n    byType {\n      key\n      discovered\n      total\n    }\n  }\n}": types.CollectionLogDocument,
    "query Currencies {\n  currencies {\n    currency\n    amount\n  }\n}": types.CurrenciesDocument,
    "query InventoryList($filter: InventoryFilter, $limit: Int, $cursor: ID) {\n  inventoryList(filter: $filter, limit: $limit, cursor: $cursor) {\n    rows {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    nextCursor\n  }\n}": types.InventoryListDocument,
    "query InventorySummary {\n  inventorySummary {\n    totalStacks\n    totalItems\n    byRarity {\n      rarity\n      count\n    }\n    byType {\n      typeId\n      count\n    }\n  }\n}": types.InventorySummaryDocument,
    "mutation OpenBoxes($input: OpenBoxesInput!) {\n  openBoxes(input: $input) {\n    stacks {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    currencies {\n      currency\n      amount\n    }\n    unlocks\n  }\n}": types.OpenBoxesDocument,
    "mutation Salvage($input: SalvageInput!) {\n  salvage(input: $input) {\n    scrapped {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    currencies {\n      currency\n      amount\n    }\n  }\n}": types.SalvageDocument,
    "query UnlockedBoxes {\n  unlockedBoxes\n}": types.UnlockedBoxesDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query CollectionLog {\n  collectionLog {\n    items {\n      id\n      name\n      typeId\n      rarity\n      hint\n      hasCosmetic\n      hasMechanical\n      discovered\n    }\n    byRarity {\n      key\n      discovered\n      total\n    }\n    byType {\n      key\n      discovered\n      total\n    }\n  }\n}"): (typeof documents)["query CollectionLog {\n  collectionLog {\n    items {\n      id\n      name\n      typeId\n      rarity\n      hint\n      hasCosmetic\n      hasMechanical\n      discovered\n    }\n    byRarity {\n      key\n      discovered\n      total\n    }\n    byType {\n      key\n      discovered\n      total\n    }\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query Currencies {\n  currencies {\n    currency\n    amount\n  }\n}"): (typeof documents)["query Currencies {\n  currencies {\n    currency\n    amount\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query InventoryList($filter: InventoryFilter, $limit: Int, $cursor: ID) {\n  inventoryList(filter: $filter, limit: $limit, cursor: $cursor) {\n    rows {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    nextCursor\n  }\n}"): (typeof documents)["query InventoryList($filter: InventoryFilter, $limit: Int, $cursor: ID) {\n  inventoryList(filter: $filter, limit: $limit, cursor: $cursor) {\n    rows {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    nextCursor\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query InventorySummary {\n  inventorySummary {\n    totalStacks\n    totalItems\n    byRarity {\n      rarity\n      count\n    }\n    byType {\n      typeId\n      count\n    }\n  }\n}"): (typeof documents)["query InventorySummary {\n  inventorySummary {\n    totalStacks\n    totalItems\n    byRarity {\n      rarity\n      count\n    }\n    byType {\n      typeId\n      count\n    }\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation OpenBoxes($input: OpenBoxesInput!) {\n  openBoxes(input: $input) {\n    stacks {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    currencies {\n      currency\n      amount\n    }\n    unlocks\n  }\n}"): (typeof documents)["mutation OpenBoxes($input: OpenBoxesInput!) {\n  openBoxes(input: $input) {\n    stacks {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    currencies {\n      currency\n      amount\n    }\n    unlocks\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation Salvage($input: SalvageInput!) {\n  salvage(input: $input) {\n    scrapped {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    currencies {\n      currency\n      amount\n    }\n  }\n}"): (typeof documents)["mutation Salvage($input: SalvageInput!) {\n  salvage(input: $input) {\n    scrapped {\n      stackId\n      typeId\n      rarity\n      count\n    }\n    currencies {\n      currency\n      amount\n    }\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query UnlockedBoxes {\n  unlockedBoxes\n}"): (typeof documents)["query UnlockedBoxes {\n  unlockedBoxes\n}"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;