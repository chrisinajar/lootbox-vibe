export const keys = {
  inv: (uid: string, stackId: string) => `inv:${uid}:${stackId}`,
  idxRarity: (uid: string, tier: string, stackId: string) => `idx:rarity:${uid}:${tier}:${stackId}`,
  idxType: (uid: string, typeId: string, stackId: string) => `idx:type:${uid}:${typeId}:${stackId}`,
  idxSrc: (uid: string, sourceBoxId: string, stackId: string) =>
    `idx:src:${uid}:${sourceBoxId}:${stackId}`,
  sumRarity: (uid: string, tier: string) => `sum:rarity:${uid}:${tier}`,
  sumType: (uid: string, typeId: string) => `sum:type:${uid}:${typeId}`,
  sumSrc: (uid: string, sourceBoxId: string) => `sum:src:${uid}:${sourceBoxId}`,
  sumTotalStacks: (uid: string) => `sum:totalStacks:${uid}`,
  sumTotalItems: (uid: string) => `sum:totalItems:${uid}`,
  cur: (uid: string, currency: string) => `cur:${uid}:${currency}`,
  srcMap: (uid: string, stackId: string) => `srcmap:${uid}:${stackId}`,
};
