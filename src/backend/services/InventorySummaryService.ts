import { SummariesRepo } from './SummariesRepo';

const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const;

export class InventorySummaryService {
  constructor(private repo: SummariesRepo) {}

  async getSummary(uid: string) {
    const [totals, byRarity, byType] = await Promise.all([
      this.repo.getTotals(uid),
      this.repo.getByRarity(uid),
      this.repo.getByType(uid),
    ]);

    // Normalize rarity list to include all tiers in order (zero if missing)
    const rarityMap = new Map(byRarity.map((r) => [r.rarity, r.count] as const));
    const rarityList = RARITY_ORDER.map((r) => ({ rarity: r, count: rarityMap.get(r) ?? 0n }));

    return {
      totalStacks: totals.totalStacks,
      totalItems: totals.totalItems,
      byRarity: rarityList,
      byType,
    };
  }
}

