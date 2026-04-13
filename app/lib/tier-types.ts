export const TIER_RANKS = ["S", "A", "B", "C", "D"] as const;
export type TierRank = (typeof TIER_RANKS)[number];

export const TIER_GENRES = ["連鎖", "怒気", "知力", "武力", "タンク", "弓"] as const;
export type TierGenre = (typeof TIER_GENRES)[number];

export type TierSkillSlot = {
  skill_id: number;
  alt_skill_ids: number[]; // max 2
};

export type TierWarriorSlot = {
  warrior_id: number;
  role: "主将" | "副将" | "軍師";
  skills: TierSkillSlot[];
  alt_warrior_ids: number[]; // max 2
};

export type TierEntry = {
  id: string;
  rank: TierRank;
  genres: TierGenre[];
  slots: [TierWarriorSlot, TierWarriorSlot, TierWarriorSlot];
  description: string;
  created_at: string;
  updated_at: string;
};

export type TierStorage = {
  version: 1;
  entries: TierEntry[];
};

export type WarriorOption = {
  id: number;
  name: string;
  cost: number;
  rarity: number;
  uniqueSkillName: string | null;
};

export type SkillOption = {
  id: number;
  name: string;
  skill_type: string;
  color: string | null;
  description: string;
};

export const RANK_COLORS: Record<TierRank, { text: string; badge: string; bg: string }> = {
  S: { text: "red.400", badge: "red.300", bg: "red.600" },
  A: { text: "orange.400", badge: "orange.300", bg: "orange.600" },
  B: { text: "yellow.400", badge: "yellow.300", bg: "yellow.600" },
  C: { text: "green.400", badge: "green.300", bg: "green.600" },
  D: { text: "gray.400", badge: "gray.300", bg: "gray.600" },
};
