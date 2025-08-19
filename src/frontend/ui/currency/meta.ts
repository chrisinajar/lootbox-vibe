export const CURRENCY_META: Record<string, { name: string; icon: string }> = {
  KEYS: { name: 'Keys', icon: '🔑' },
  SCRAP: { name: 'Scrap', icon: '🛠️' },
  GLITTER: { name: 'Glitter', icon: '✨' },
};

export function currencyName(id: string): string {
  return CURRENCY_META[id]?.name || id;
}

export function currencyIcon(id: string): string | undefined {
  return CURRENCY_META[id]?.icon;
}
