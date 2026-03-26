// docs/武将スキル強化コスト.jpg および docs/軍師スキル強化コスト.jpg から抽出
// 各配列の要素: Lv1→2, Lv2→3, ..., Lv9→10 の費用（銅貨）

export const WARRIOR_SKILL_COST: Record<3 | 4 | 5, number[]> = {
  3: [1200, 4000, 8000, 14000, 20000, 27000, 34000, 41000, 48000],
  4: [2400, 8000, 16000, 28000, 40000, 54000, 68000, 82000, 96000],
  5: [3000, 10000, 20000, 35000, 50000, 67500, 85000, 102000, 120000],
};

export const GUNSHI_SKILL_COST: Record<3 | 4 | 5, number[]> = {
  3: [3600, 12000, 24000, 42000, 60000, 81000, 102000, 123000, 144000],
  4: [7200, 24000, 48000, 84000, 120000, 162000, 204000, 246000, 288000],
  5: [9000, 30000, 60000, 105000, 150000, 202000, 255000, 308000, 360000],
};

export function totalCostToLevel(
  table: Record<3 | 4 | 5, number[]>,
  rarity: 3 | 4 | 5,
  targetLevel: number
): number {
  return table[rarity].slice(0, targetLevel - 1).reduce((a, b) => a + b, 0);
}
