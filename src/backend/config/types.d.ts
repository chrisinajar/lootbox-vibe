/* auto-generated from /config/schema */

export interface BoxesSchema {
  [k: string]: unknown;
}

export interface EconomySchema {
  scrapPerRarity: {
    COMMON: number;
    UNCOMMON: number;
    RARE: number;
    EPIC: number;
    LEGENDARY: number;
    MYTHIC: number;
  };
}

export interface FlavorSchema {
  flavors: string[];
}

export type ItemsSchema = {
  id: string;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}[];

export interface ModifiersSchema {
  static?: {
    id: string;
    desc?: string;
    [k: string]: unknown;
  }[];
  dynamic?: {
    id: string;
    desc?: string;
    [k: string]: unknown;
  }[];
}

export interface UnlocksSchema {
  [k: string]: unknown;
}

