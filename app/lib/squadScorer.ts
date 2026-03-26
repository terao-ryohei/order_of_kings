// 部隊スコアリングエンジン — MS2.5 Phase2
// 1部隊 = 主将(1) + 副将(1) + 軍師(1) の3スロットモデル

import { weaponTriangleBonus } from "./weaponTriangle";

// --- 型定義 ---

export type SquadType = "連鎖武力" | "怒気武力" | "能動武力" | "耐久型" | "知力型";
export type WeaponType = "刀" | "馬" | "弓" | "槍" | null;

export interface WarriorForSquad {
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
  skills: { skill_type: string; name: string }[];
}

export interface SquadSlot {
  role: "主将" | "副将" | "軍師";
  warrior: WarriorForSquad;
  roleLabel: string;
}

export interface SquadResult {
  rank: number;
  slots: SquadSlot[];
  totalScore: number;
  scoreBreakdown: {
    typeScore: number;
    weaponScore: number;
    statusScore: number;
    costScore: number;
    synergyScore: number;
  };
  dpsEstimate: number;
  description: string;
  strengths: string[];
}

export interface SquadRecommendation {
  top3: SquadResult[];
  missingWarriors: { name: string; reason: string }[];
}

// --- DPS計算関数 ---

export function calcChainDPS(main: WarriorForSquad, sub: WarriorForSquad): number {
  const chainSkillCount = main.skills.filter((s) => s.skill_type === "連鎖").length;
  const chainRoleBonus = main.roles.includes("連鎖系") ? 1.2 : 1.0;
  return (main.atk + sub.atk * 0.6) * chainSkillCount * chainRoleBonus;
}

export function calcRageDPS(main: WarriorForSquad, sub: WarriorForSquad): number {
  const hasRageSkill = main.skills.some((s) => s.skill_type === "怒気技");
  if (!hasRageSkill) return 0;
  const rageRoleBonus = main.roles.includes("怒気") ? 1.3 : 1.0;
  return main.atk * rageRoleBonus * 1.5;
}

export function calcActiveDPS(main: WarriorForSquad, sub: WarriorForSquad): number {
  const mainActiveCount = main.skills.filter((s) => s.skill_type === "能動").length;
  const subActiveCount = sub.skills.filter((s) => s.skill_type === "能動").length;
  return main.atk * mainActiveCount * 0.4 + sub.atk * subActiveCount * 0.3;
}

export function calcEndurance(main: WarriorForSquad, sub: WarriorForSquad): number {
  const allRoles = [...main.roles, ...sub.roles];
  const hasRecovery = allRoles.some((r) => r === "回復");
  const hasShield = allRoles.some((r) => r === "盾");
  return (main.guts + sub.guts) * (hasRecovery ? 1.2 : 1.0) * (hasShield ? 1.15 : 1.0);
}

export function calcIntelDPS(main: WarriorForSquad, sub: WarriorForSquad): number {
  const allRoles = [...main.roles, ...sub.roles];
  const intelRoleBonus = allRoles.some((r) => r.includes("知略")) ? 1.3 : 1.0;
  return (main.intelligence + sub.intelligence) * intelRoleBonus;
}

// --- 軍師評価 ---

export function gunshiEvaluation(warrior: WarriorForSquad): number {
  const buffRoles = ["ダメージ系能動バフ", "物理系パッシブ", "知略系パッシブ"];
  const buffCount = warrior.roles.filter((r) => buffRoles.includes(r)).length;
  const skillDiversity = new Set(warrior.skills.map((s) => s.skill_type)).size;
  return warrior.rarity * 10 + buffCount * 15 + skillDiversity * 5;
}

// --- 兵種適性スコア ---

const APTITUDE_SCORES: Record<string, number> = {
  極: 10, 優: 7, 良: 4, 凡: 1,
};

function calcAptitudeScore(warrior: WarriorForSquad, weapon: WeaponType): number {
  if (!weapon) return Math.max(0, ...warrior.aptitudes.map((a) => APTITUDE_SCORES[a.level] ?? 0));
  const match = warrior.aptitudes.find((a) => a.weapon === weapon);
  return match ? (APTITUDE_SCORES[match.level] ?? 0) : 0;
}

// --- タイプ別主将スコア ---

function mainScore(warrior: WarriorForSquad, squadType: SquadType, weapon: WeaponType): number {
  const aptScore = calcAptitudeScore(warrior, weapon);
  switch (squadType) {
    case "連鎖武力": {
      const chainCount = warrior.skills.filter((s) => s.skill_type === "連鎖").length;
      const chainRole = warrior.roles.includes("連鎖系") ? 20 : 0;
      return warrior.atk * 1.2 + chainCount * 30 + chainRole + aptScore * 3;
    }
    case "怒気武力": {
      const hasRage = warrior.skills.some((s) => s.skill_type === "怒気技");
      if (!hasRage) return -Infinity; // 怒気スキルなしは主将不可
      const rageRole = warrior.roles.includes("怒気") ? 25 : 0;
      return warrior.atk * 1.3 + rageRole + aptScore * 3;
    }
    case "能動武力": {
      const activeCount = warrior.skills.filter((s) => s.skill_type === "能動").length;
      return warrior.atk * 1.1 + activeCount * 25 + aptScore * 3;
    }
    case "耐久型": {
      const shieldRole = warrior.roles.includes("盾") ? 20 : 0;
      const recoveryRole = warrior.roles.includes("回復") ? 15 : 0;
      return warrior.guts * 1.5 + shieldRole + recoveryRole + aptScore * 2;
    }
    case "知力型": {
      const intelRole = warrior.roles.some((r) => r.includes("知略")) ? 20 : 0;
      return warrior.intelligence * 1.3 + intelRole + aptScore * 2;
    }
  }
}

// --- タイプ別副将スコア ---

function subScore(warrior: WarriorForSquad, squadType: SquadType, weapon: WeaponType): number {
  const aptScore = calcAptitudeScore(warrior, weapon);
  switch (squadType) {
    case "連鎖武力": {
      const chainCount = warrior.skills.filter((s) => s.skill_type === "連鎖").length;
      return warrior.atk * 0.8 + chainCount * 20 + aptScore * 2;
    }
    case "怒気武力":
      return warrior.atk * 0.9 + aptScore * 2;
    case "能動武力": {
      const activeCount = warrior.skills.filter((s) => s.skill_type === "能動").length;
      return warrior.atk * 0.8 + activeCount * 20 + aptScore * 2;
    }
    case "耐久型": {
      const shieldRole = warrior.roles.includes("盾") ? 15 : 0;
      const recoveryRole = warrior.roles.includes("回復") ? 15 : 0;
      return warrior.guts * 1.2 + shieldRole + recoveryRole + aptScore * 2;
    }
    case "知力型": {
      const intelRole = warrior.roles.some((r) => r.includes("知略")) ? 15 : 0;
      return warrior.intelligence * 1.0 + intelRole + aptScore * 2;
    }
  }
}

// --- DPS推定 ---

function estimateDPS(
  squadType: SquadType,
  main: WarriorForSquad,
  sub: WarriorForSquad,
  enemyWeapon: WeaponType,
  unitWeapon: WeaponType,
): number {
  let baseDPS: number;
  switch (squadType) {
    case "連鎖武力":
      baseDPS = calcChainDPS(main, sub);
      break;
    case "怒気武力":
      baseDPS = calcRageDPS(main, sub);
      break;
    case "能動武力":
      baseDPS = calcActiveDPS(main, sub);
      break;
    case "耐久型":
      baseDPS = calcEndurance(main, sub);
      break;
    case "知力型":
      baseDPS = calcIntelDPS(main, sub);
      break;
  }
  const triangleBonus = weaponTriangleBonus(unitWeapon, enemyWeapon);
  return Math.round(baseDPS * triangleBonus * 10) / 10;
}

// --- 説明文生成 ---

export function buildSquadDescription(
  slots: SquadSlot[],
  squadType: SquadType,
): { description: string; strengths: string[] } {
  const main = slots[0].warrior;
  const sub = slots[1].warrior;
  const gunshi = slots[2].warrior;
  const strengths: string[] = [];

  switch (squadType) {
    case "連鎖武力": {
      strengths.push(`${main.name}の連鎖スキルで高速DPSを実現`);
      if (sub.skills.some((s) => s.skill_type === "連鎖"))
        strengths.push(`${sub.name}も連鎖持ちで2トップ火力`);
      strengths.push(`軍師${gunshi.name}がスキルバフで支援`);
      return { description: "連鎖攻撃を軸にDPSを最大化する攻撃編成", strengths };
    }
    case "怒気武力": {
      strengths.push(`${main.name}の怒気スキルで瞬間火力を発揮`);
      strengths.push(`${sub.name}が通常火力でゲージ溜め中もDPS維持`);
      return { description: "怒気ゲージ満タン時の高倍率スキルで瞬間火力を叩き出す編成", strengths };
    }
    case "能動武力": {
      strengths.push(`${main.name}の能動スキルで爆発的ダメージ`);
      if (sub.skills.some((s) => s.skill_type === "能動"))
        strengths.push(`${sub.name}の能動スキルで二段構え`);
      return { description: "能動スキルの発動率に賭けた爆発力重視の編成", strengths };
    }
    case "耐久型": {
      if (main.roles.includes("盾")) strengths.push(`${main.name}が前衛盾役で被ダメ軽減`);
      if ([...main.roles, ...sub.roles].includes("回復"))
        strengths.push("回復スキルで長期戦に対応");
      strengths.push("1部隊運用時に最も安定する編成");
      return { description: "被ダメ軽減と回復を重視した耐久編成", strengths };
    }
    case "知力型": {
      strengths.push(`${main.name}の知力参照ダメージで武力防御を貫通`);
      if ([...main.roles, ...sub.roles].some((r) => r.includes("知略")))
        strengths.push("知略パッシブでさらに知力ダメージを強化");
      return { description: "知力参照ダメージで武力型とは異なる防御計算を突く編成", strengths };
    }
  }
}

// --- 貪欲法による編成構築 ---

function buildOneSquad(
  warriors: WarriorForSquad[],
  squadType: SquadType,
  weapon: WeaponType,
  costLimit: number | undefined,
  excludeIds: Set<number>,
): SquadSlot[] | null {
  const available = warriors.filter((w) => !excludeIds.has(w.id));
  if (available.length < 3) {
    // 3人未満でも結果を返す（手持ちが少ない場合）
    if (available.length === 0) return null;
  }

  // Step 1: 主将選定
  const mainCandidates = available
    .map((w) => ({ w, score: mainScore(w, squadType, weapon) }))
    .filter((c) => c.score > -Infinity)
    .sort((a, b) => b.score - a.score);

  if (mainCandidates.length === 0) return null;

  // コスト制約を考慮して主将候補を試す
  for (const mainC of mainCandidates) {
    const mainWarrior = mainC.w;
    const remaining1 = available.filter((w) => w.id !== mainWarrior.id);

    // Step 2: 副将選定
    const subCandidates = remaining1
      .map((w) => ({ w, score: subScore(w, squadType, weapon) }))
      .sort((a, b) => b.score - a.score);

    for (const subC of subCandidates) {
      const subWarrior = subC.w;
      const remaining2 = remaining1.filter((w) => w.id !== subWarrior.id);

      // Step 3: 軍師選定
      const gunshiCandidates = remaining2
        .map((w) => ({ w, score: gunshiEvaluation(w) }))
        .sort((a, b) => b.score - a.score);

      if (gunshiCandidates.length === 0) {
        // 軍師候補なし → 2人でも編成を返せるが仕様上3スロット必須
        continue;
      }

      const gunshiWarrior = gunshiCandidates[0].w;

      // コスト制約チェック
      const totalCost = mainWarrior.cost + subWarrior.cost + gunshiWarrior.cost;
      if (costLimit !== undefined && totalCost > costLimit) continue;

      return [
        { role: "主将", warrior: mainWarrior, roleLabel: `${squadType}主将` },
        { role: "副将", warrior: subWarrior, roleLabel: `${squadType}副将` },
        { role: "軍師", warrior: gunshiWarrior, roleLabel: "軍師" },
      ];
    }
  }

  return null;
}

// --- スコア算出 ---

function calcScoreBreakdown(
  slots: SquadSlot[],
  squadType: SquadType,
  weapon: WeaponType,
): SquadResult["scoreBreakdown"] {
  const main = slots[0].warrior;
  const sub = slots[1].warrior;
  const gunshi = slots[2].warrior;

  // typeScore: 主将+副将のタイプ適合度
  const typeScore = mainScore(main, squadType, weapon) + subScore(sub, squadType, weapon);

  // weaponScore: 兵種適性（主将+副将。軍師は除外）
  const weaponScore = calcAptitudeScore(main, weapon) + calcAptitudeScore(sub, weapon);

  // statusScore: 主将+副将のステータス合計（軍師は除外）
  let statusScore: number;
  switch (squadType) {
    case "連鎖武力":
    case "怒気武力":
    case "能動武力":
      statusScore = main.atk + sub.atk;
      break;
    case "耐久型":
      statusScore = main.guts + sub.guts;
      break;
    case "知力型":
      statusScore = main.intelligence + sub.intelligence;
      break;
  }

  // costScore: コスト効率（低コスト高スコアが良い）
  const totalCost = main.cost + sub.cost + gunshi.cost;
  const costScore = Math.max(0, 100 - totalCost * 5);

  // synergyScore: 軍師評価 + スキル相性
  const synergyScore = gunshiEvaluation(gunshi);

  return {
    typeScore: Math.round(typeScore * 10) / 10,
    weaponScore: Math.round(weaponScore * 10) / 10,
    statusScore: Math.round(statusScore * 10) / 10,
    costScore: Math.round(costScore * 10) / 10,
    synergyScore: Math.round(synergyScore * 10) / 10,
  };
}

// --- メイン関数 ---

export function scoreSquad(
  warriors: WarriorForSquad[],
  squadType: SquadType,
  weapon?: WeaponType,
  costLimit?: number,
): SquadRecommendation {
  const weaponArg = weapon ?? null;
  const results: SquadResult[] = [];
  const excludeIds = new Set<number>();

  for (let rank = 1; rank <= 3; rank++) {
    const slots = buildOneSquad(warriors, squadType, weaponArg, costLimit, excludeIds);
    if (!slots) break;

    const breakdown = calcScoreBreakdown(slots, squadType, weaponArg);
    const totalScore =
      breakdown.typeScore * 0.35 +
      breakdown.weaponScore * 0.25 +
      breakdown.statusScore * 0.2 +
      breakdown.costScore * 0.1 +
      breakdown.synergyScore * 0.1;

    const dpsEstimate = estimateDPS(squadType, slots[0].warrior, slots[1].warrior, null, weaponArg);
    const { description, strengths } = buildSquadDescription(slots, squadType);

    results.push({
      rank,
      slots,
      totalScore: Math.round(totalScore * 10) / 10,
      scoreBreakdown: breakdown,
      dpsEstimate,
      description,
      strengths,
    });

    // TOP1の主将を除外してTOP2を構築
    excludeIds.add(slots[0].warrior.id);
  }

  // missingWarriors: 怒気武力で怒気スキル持ちがいない場合など
  const missingWarriors: { name: string; reason: string }[] = [];
  if (squadType === "怒気武力") {
    const hasRageWarrior = warriors.some((w) =>
      w.skills.some((s) => s.skill_type === "怒気技"),
    );
    if (!hasRageWarrior) {
      missingWarriors.push({
        name: "怒気スキル持ち武将",
        reason: "怒気武力編成には怒気技スキルを持つ主将が必須です",
      });
    }
  }

  return { top3: results, missingWarriors };
}
