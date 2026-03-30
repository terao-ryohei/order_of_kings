export type KokugakuStat = "atk" | "int" | "guts" | "pol";

export type KokugakuEntry = {
  id: string;
  name: string;
  maxLevel: number;
  bonusPerLevel: number;
  stat: KokugakuStat;
};

export type KokugakuLevels = Record<string, number>;
export type KokugakuBonuses = Record<KokugakuStat, number>;

export const KOKUGAKU_STORAGE_KEY = "kokugaku_levels";

export const KOKUGAKU_ENTRIES: KokugakuEntry[] = [
  {
    id: "jinzai_atk",
    name: "人材-武勇",
    maxLevel: 15,
    bonusPerLevel: 2,
    stat: "atk",
  },
  {
    id: "jinzai_int",
    name: "人材-知略",
    maxLevel: 15,
    bonusPerLevel: 2,
    stat: "int",
  },
  {
    id: "jinzai_guts",
    name: "人材-胆力",
    maxLevel: 15,
    bonusPerLevel: 2,
    stat: "guts",
  },
  {
    id: "jinzai_pol",
    name: "人材-内政",
    maxLevel: 15,
    bonusPerLevel: 2,
    stat: "pol",
  },
];

export const KOKUGAKU_STAT_LABELS: Record<KokugakuStat, string> = {
  atk: "武力",
  int: "知略",
  guts: "胆力",
  pol: "政治",
};

export function createDefaultKokugakuLevels(): KokugakuLevels {
  return Object.fromEntries(KOKUGAKU_ENTRIES.map((entry) => [entry.id, 0]));
}

export function clampKokugakuLevel(value: unknown, maxLevel: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(maxLevel, Math.max(0, Math.round(value)));
}

export function normalizeKokugakuLevels(raw: unknown): KokugakuLevels {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const defaults = createDefaultKokugakuLevels();

  for (const entry of KOKUGAKU_ENTRIES) {
    defaults[entry.id] = clampKokugakuLevel(source[entry.id], entry.maxLevel);
  }

  return defaults;
}

export function calcKokugakuBonuses(levels: KokugakuLevels): KokugakuBonuses {
  return KOKUGAKU_ENTRIES.reduce<KokugakuBonuses>(
    (sum, entry) => {
      sum[entry.stat] += (levels[entry.id] ?? 0) * entry.bonusPerLevel;
      return sum;
    },
    { atk: 0, int: 0, guts: 0, pol: 0 }
  );
}
