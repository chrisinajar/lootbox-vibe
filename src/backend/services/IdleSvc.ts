export type IdleReport = {
  message: string;
  boxesOpened: number;
  rewards: {
    stacks: { stackId: string; typeId: string; rarity: string; count: number }[];
    currencies: { currency: string; amount: bigint }[];
    unlocks: string[];
    cosmetics?: { typeId: string; modId: string; modName: string }[];
  };
};

export class IdleSvc {
  async claim(_uid: string): Promise<IdleReport> {
    // MVP stub: no idle processing yet
    return {
      message: 'Nothing to claim right now. Your cat is napping.',
      boxesOpened: 0,
      rewards: { stacks: [], currencies: [], unlocks: [], cosmetics: [] },
    };
  }
}
