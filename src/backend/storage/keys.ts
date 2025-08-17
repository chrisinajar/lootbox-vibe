export const keys = {
  inv: (uid: string, stackId: string) => `inv:${uid}:${stackId}`,
  idxRarity: (uid: string, tier: string, stackId: string) => `idx:rarity:${uid}:${tier}:${stackId}`,
  idxType: (uid: string, typeId: string, stackId: string) => `idx:type:${uid}:${typeId}:${stackId}`,
  sumRarity: (uid: string, tier: string) => `sum:rarity:${uid}:${tier}`,
  sumType: (uid: string, typeId: string) => `sum:type:${uid}:${typeId}`,
  cur: (uid: string, currency: string) => `cur:${uid}:${currency}`,
};

