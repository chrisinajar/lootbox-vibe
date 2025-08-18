/* auto-generated from /config/schema */

export interface BoxesSchema {
  [k: string]: unknown;
}

export interface BoxesV1 {
  $schema?: string;
  version: number;
  boxes: {
    id: string;
    name: string;
    tier: number;
    keyCost: number;
    forbidSelfDrop?: boolean;
    selfDropCap?: number;
    dropTable: {
      rolls: number;
      entries: {
        type: "ITEM" | "CURRENCY" | "BOX" | "MATERIAL";
        weight: number;
        itemId?: string;
        rarity?: string;
        staticModsPool?: string[];
        currency?: string;
        amount?:
          | number
          | {
              min: number;
              max: number;
            };
        boxId?: string;
        count?:
          | number
          | {
              min: number;
              max: number;
            };
        materialId?: string;
      }[];
    };
  }[];
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

export interface EconomyV1 {
  $schema?: string;
  version: number;
  currencies?: {
    id: string;
    display: string;
    precision?: number;
  }[];
  raritySalvage?: {
    COMMON?: number;
    UNCOMMON?: number;
    RARE?: number;
    EPIC?: number;
    [k: string]: unknown;
  };
  boxCosts?: {
    [k: string]: number;
  };
  startingGrants?: {
    [k: string]: number;
  };
  exchanges?: {
    id: string;
    from: string;
    to: string;
    rate: {
      from: number;
      to: number;
      [k: string]: unknown;
    };
    dailyCapTo?: number;
  }[];
  batchOpenLimits?: {
    maxPerRequest?: number;
  };
}

export interface FlavorSchema {
  flavors: string[];
}

export interface IdleV1 {
  $schema?: string;
  version: number;
  catchUp?: {
    enabled?: boolean;
    capHours?: number;
    strategy?: string;
    [k: string]: unknown;
  };
  flavor: string[];
  flavorVars?: {
    [k: string]: {
      min: number;
      max: number;
    };
  };
}

export type ItemsSchema = {
  id: string;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}[];

export interface ItemsCatalogV1 {
  $schema?: string;
  version: number;
  items: {
    id: string;
    name: string;
    typeId: string;
    rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
    scrap: number;
    allowedStaticMods?: string[];
  }[];
}

export interface DynamicModifiersV1 {
  $schema?: string;
  version: number;
  modifiers: {
    id: string;
    name: string;
    appliesOn: string[];
    formula: {
      type: string;
      counter?: string;
      per?: number;
      pctPerStep?: number;
      capPct?: number;
      bpPerStep?: number;
      capBp?: number;
      [k: string]: unknown;
    };
    payout?: {
      type?: string;
      maxPerRequest?: number;
      [k: string]: unknown;
    };
  }[];
}

export interface ModifiersSchema {
  static?: {
    [k: string]: unknown;
  }[];
  dynamic?: {
    id: string;
    desc?: string;
    [k: string]: unknown;
  }[];
}

export interface StaticModifiersV1 {
  $schema?: string;
  version: number;
  modifiers: {
    id: string;
    name: string;
    category: "COSMETIC" | "MECHANICAL";
    effect?: {
      type?: string;
      valuePct?: number;
      valueBp?: number;
      charges?: number;
      value?: number;
      per?: number;
      amount?: number;
      valueX?: number;
      [k: string]: unknown;
    };
  }[];
}

export interface UnlocksSchema {
  [k: string]: unknown;
}

export interface UnlocksV1 {
  $schema?: string;
  version: number;
  milestones?: {
    id: string;
    type: "milestoneUnlock";
    unlocks: {
      kind: "BOX_TYPE";
      boxId: string;
    }[];
    requirements: {
      type: "OPEN_COUNT";
      boxId?: string;
      count: number;
    }[];
    rewards?: {
      type: "CURRENCY";
      currency: string;
      amount: number;
    }[];
  }[];
  rngUnlocks?: {
    id: string;
    type: "rngUnlock";
    baseChanceBp: number;
    scope: {
      boxType?: string;
    };
    softPity?: {
      startAt: number;
      deltaBpPerTry: number;
      capBp: number;
    };
    hardPity?: {
      guaranteeAt: number;
    };
    resetOnHit?: boolean;
    minMilestone?: string | null;
    carryover?: {
      maxCarry?: number;
      dailyDecayPct?: number;
    };
  }[];
}

