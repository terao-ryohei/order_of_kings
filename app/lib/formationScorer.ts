// 編成スコアリングエンジン — MS2 Phase3

export type Purpose = "攻城" | "野戦" | "防衛" | "PvP" | "汎用";
export type WeaponType = "刀" | "馬" | "弓" | "槍" | null;

export interface WarriorForScoring {
  id: number;
  name: string;
  rarity: number;
  cost: number;
  atk: number;
  intelligence: number;
  guts: number;
  pol: number;
  roles: string[];
  aptitudes: { weapon: string; level: string }[];
}

export interface FormationSlot {
  warriorId: number;
  warriorName: string;
  roleLabel: string;
}

export interface FormationResult {
  rank: number;
  slots: FormationSlot[];
  totalScore: number;
  scoreBreakdown: {
    roleScore: number;
    aptitudeScore: number;
    statusScore: number;
    rarityScore: number;
    synergyScore: number;
  };
  description: string;
  missingRoles: string[];
}

export interface RecommendationResult {
  top3: FormationResult[];
  missingWarriors: { name: string; reason: string }[];
}

// --- 役割テンプレート ---

const ROLE_TEMPLATES: Record<Purpose, string[]> = {
  攻城: ["攻城", "物理攻撃能動", "盾", "回復", "汎用"],
  野戦: ["物理攻撃能動", "物理攻撃能動", "盾", "回復", "連鎖系"],
  防衛: ["盾", "盾", "回復", "デバフ", "無効化・解除"],
  PvP: ["連鎖系", "デバフ", "無効化・解除", "物理攻撃能動", "怒気"],
  汎用: ["盾", "回復", "物理攻撃能動", "連鎖系", "汎用"],
};

// --- 兵種適性スコア ---

const APTITUDE_SCORES: Record<string, number> = {
  極: 10,
  優: 7,
  良: 4,
  凡: 1,
};

// --- ステータス重み ---

const STATUS_WEIGHTS: Record<Purpose, { atk: number; int: number; guts: number }> = {
  攻城: { atk: 1.5, int: 0.5, guts: 1.0 },
  野戦: { atk: 1.2, int: 0.8, guts: 1.0 },
  防衛: { atk: 0.5, int: 1.0, guts: 1.5 },
  PvP: { atk: 1.0, int: 1.0, guts: 1.0 },
  汎用: { atk: 1.0, int: 1.0, guts: 1.0 },
};

// --- スコア算出ヘルパー ---

function calcWeightedStatus(w: WarriorForScoring, purpose: Purpose): number {
  const wt = STATUS_WEIGHTS[purpose];
  return w.atk * wt.atk + w.intelligence * wt.int + w.guts * wt.guts;
}

function calcAptitudeScore(w: WarriorForScoring, weapon: WeaponType): number {
  if (!weapon) {
    // 兵種制限なし → 最高適性で計算
    return Math.max(0, ...w.aptitudes.map((a) => APTITUDE_SCORES[a.level] ?? 0));
  }
  const match = w.aptitudes.find((a) => a.weapon === weapon);
  return match ? (APTITUDE_SCORES[match.level] ?? 0) : 0;
}

function matchesRole(warrior: WarriorForScoring, requiredRole: string): boolean {
  if (requiredRole === "汎用") return true;
  return warrior.roles.includes(requiredRole);
}

// --- 貪欲法による編成構築 ---

function buildFormation(
  warriors: WarriorForScoring[],
  purpose: Purpose,
  weapon: WeaponType,
  excludeIds: Set<number>,
): { slots: FormationSlot[]; filledRoles: string[]; missingRoles: string[] } {
  const template = [...ROLE_TEMPLATES[purpose]];
  const used = new Set<number>();
  const slots: FormationSlot[] = [];
  const filledRoles: string[] = [];
  const missingRoles: string[] = [];

  // 各スロットで最適武将を貪欲に配置
  for (const requiredRole of template) {
    const candidates = warriors
      .filter(
        (w) =>
          !used.has(w.id) &&
          !excludeIds.has(w.id) &&
          matchesRole(w, requiredRole),
      )
      .sort((a, b) => {
        const sa = calcWeightedStatus(a, purpose) + calcAptitudeScore(a, weapon) * 5;
        const sb = calcWeightedStatus(b, purpose) + calcAptitudeScore(b, weapon) * 5;
        return sb - sa;
      });

    if (candidates.length > 0) {
      const chosen = candidates[0];
      used.add(chosen.id);
      slots.push({
        warriorId: chosen.id,
        warriorName: chosen.name,
        roleLabel: requiredRole,
      });
      filledRoles.push(requiredRole);
    } else {
      missingRoles.push(requiredRole);
      // スロット未充足 → 残り武将から誰か充当
      const fallback = warriors
        .filter((w) => !used.has(w.id) && !excludeIds.has(w.id))
        .sort((a, b) => {
          const sa = calcWeightedStatus(a, purpose);
          const sb = calcWeightedStatus(b, purpose);
          return sb - sa;
        });
      if (fallback.length > 0) {
        const chosen = fallback[0];
        used.add(chosen.id);
        slots.push({
          warriorId: chosen.id,
          warriorName: chosen.name,
          roleLabel: "汎用",
        });
      }
    }
  }

  return { slots, filledRoles, missingRoles };
}

// --- スコア計算 ---

function calcScores(
  slots: FormationSlot[],
  warriors: WarriorForScoring[],
  purpose: Purpose,
  weapon: WeaponType,
  allWarriors: WarriorForScoring[],
  missingRoles: string[],
): FormationResult["scoreBreakdown"] {
  const slotWarriors = slots.map(
    (s) => warriors.find((w) => w.id === s.warriorId)!,
  );

  // 1. 役割カバレッジ (0-100)
  const filledCount = ROLE_TEMPLATES[purpose].length - missingRoles.length;
  const roleScore = (filledCount / ROLE_TEMPLATES[purpose].length) * 100;

  // 2. 兵種適性 (0-100)
  const aptitudes = slotWarriors.map((w) => calcAptitudeScore(w, weapon));
  const avgAptitude =
    aptitudes.length > 0
      ? aptitudes.reduce((a, b) => a + b, 0) / aptitudes.length
      : 0;
  const aptitudeScore = (avgAptitude / 10) * 100;

  // 3. ステータス合計 (0-100, 正規化)
  const maxStatus = Math.max(
    1,
    ...allWarriors.map((w) => calcWeightedStatus(w, purpose)),
  );
  const totalStatus = slotWarriors.reduce(
    (sum, w) => sum + calcWeightedStatus(w, purpose),
    0,
  );
  const statusScore = Math.min(
    100,
    (totalStatus / (maxStatus * slots.length)) * 100,
  );

  // 4. レアリティ効率 (0-100)
  const avgRarity =
    slotWarriors.length > 0
      ? slotWarriors.reduce((sum, w) => sum + w.rarity, 0) /
        slotWarriors.length
      : 3;
  const rarityScore = ((avgRarity - 3) / 2) * 100; // 3→0, 5→100

  // 5. スキル相性ボーナス (0-100, base=50)
  let synergyScore = 50;
  const allRoles = slotWarriors.flatMap((w) => w.roles);
  const hasRole = (r: string) => allRoles.includes(r);
  if (
    (hasRole("物理系パッシブ") || hasRole("知略系パッシブ")) &&
    hasRole("デバフ")
  )
    synergyScore += 10;
  if (hasRole("回復") && hasRole("盾")) synergyScore += 10;
  const noRoleCount = slotWarriors.filter((w) => w.roles.length === 0).length;
  if (noRoleCount >= 3) synergyScore -= 20;
  synergyScore = Math.max(0, Math.min(100, synergyScore));

  return {
    roleScore: Math.round(roleScore * 10) / 10,
    aptitudeScore: Math.round(aptitudeScore * 10) / 10,
    statusScore: Math.round(statusScore * 10) / 10,
    rarityScore: Math.round(rarityScore * 10) / 10,
    synergyScore: Math.round(synergyScore * 10) / 10,
  };
}

function calcTotalScore(breakdown: FormationResult["scoreBreakdown"]): number {
  const total =
    breakdown.roleScore * 0.35 +
    breakdown.aptitudeScore * 0.25 +
    breakdown.statusScore * 0.2 +
    breakdown.rarityScore * 0.1 +
    breakdown.synergyScore * 0.1;
  return Math.round(total * 10) / 10;
}

// --- 説明文生成 ---

function generateDescription(
  slots: FormationSlot[],
  warriors: WarriorForScoring[],
  breakdown: FormationResult["scoreBreakdown"],
  purpose: Purpose,
): string {
  const slotWarriors = slots.map(
    (s) => warriors.find((w) => w.id === s.warriorId)!,
  );

  if (breakdown.roleScore >= 100) {
    // 役割テンプレートを見て特化判定
    const roleLabels = slots.map((s) => s.roleLabel);
    const atkCount = roleLabels.filter(
      (r) => r === "物理攻撃能動" || r === "知略攻撃能動",
    ).length;
    if (atkCount >= 2) return "攻撃力重視の編成で、役割もしっかりカバーしています";
    return "バランス良く役割が揃っています";
  }

  const avgAtk =
    slotWarriors.reduce((s, w) => s + w.atk, 0) / (slotWarriors.length || 1);
  const avgGuts =
    slotWarriors.reduce((s, w) => s + w.guts, 0) / (slotWarriors.length || 1);

  if (purpose === "防衛" && avgGuts > 70) return "高い胆力で防衛に適した編成です";
  if (avgAtk > 80) return "攻撃力に優れた編成ですが、一部役割が不足しています";

  return "手持ち武将で構成した編成です。不足役割の補強を検討してください";
}

// --- missingWarriors ---

function findMissingWarriors(
  ownedWarriors: WarriorForScoring[],
  allWarriors: WarriorForScoring[],
  missingRoles: string[],
  limit: number = 3,
): { name: string; reason: string }[] {
  const ownedIds = new Set(ownedWarriors.map((w) => w.id));
  const unowned = allWarriors.filter((w) => !ownedIds.has(w.id));
  const results: { name: string; reason: string; score: number }[] = [];

  for (const w of unowned) {
    for (const role of missingRoles) {
      if (w.roles.includes(role)) {
        results.push({
          name: w.name,
          reason: `${role}役として編成を強化できます（★${w.rarity}）`,
          score: w.rarity * 10 + w.atk,
        });
        break;
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ name, reason }) => ({ name, reason }));
}

// --- メイン関数 ---

export function scoreFormation(
  ownedWarriors: WarriorForScoring[],
  purpose: Purpose,
  weapon: WeaponType,
  allWarriors?: WarriorForScoring[],
): RecommendationResult {
  const all = allWarriors ?? ownedWarriors;
  const results: FormationResult[] = [];
  const excludeIds = new Set<number>();
  const allMissingRoles = new Set<string>();

  for (let rank = 1; rank <= 3; rank++) {
    const { slots, missingRoles } = buildFormation(
      ownedWarriors,
      purpose,
      weapon,
      excludeIds,
    );

    if (slots.length === 0) break;

    const breakdown = calcScores(
      slots,
      ownedWarriors,
      purpose,
      weapon,
      all,
      missingRoles,
    );
    const totalScore = calcTotalScore(breakdown);
    const description = generateDescription(
      slots,
      ownedWarriors,
      breakdown,
      purpose,
    );

    results.push({
      rank,
      slots,
      totalScore,
      scoreBreakdown: breakdown,
      description,
      missingRoles,
    });

    missingRoles.forEach((r) => allMissingRoles.add(r));
    // TOP1の主将(最初のスロット)を除外してTOP2を構築
    if (slots.length > 0) {
      excludeIds.add(slots[0].warriorId);
    }
  }

  const missingWarriors = findMissingWarriors(
    ownedWarriors,
    all,
    [...allMissingRoles],
  );

  return { top3: results, missingWarriors };
}
