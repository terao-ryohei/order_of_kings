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
