import type {
  BonusAlloc,
  Equipment,
  EquipmentSlot,
  SavedFormationSlot,
} from "../hooks/useSavedFormations";

export type WarriorData = {
  id: number;
  name: string;
  reading: string;
  rarity: number;
  atk: number;
  int: number;
  guts: number;
  atk_growth: number;
  int_growth: number;
  guts_growth: number;
  era: string | null;
  aptitudes: string[];
  skill1_name: string | null;
  skill2_name: string | null;
  skill1_desc: string | null;
  skill2_desc: string | null;
};

export type SkillData = {
  id: number;
  name: string;
  skill_type: string;
  color: string | null;
  description: string;
};

export interface FormationSlot {
  index: number;
  role: "主将" | "副将" | "軍師";
  roleLabel: string;
  description: string;
  warrior: WarriorData | null;
  skillIds: number[];
  warriorLevel: number;
  skillLevels: number[];
  bonusPoints: BonusAlloc;
  equipment: Equipment;
}

export const SQUAD_SLOTS = [
  { role: "主将" as const, label: "主将", description: "" },
  { role: "副将" as const, label: "副将", description: "" },
  {
    role: "軍師" as const,
    label: "軍師",
    description: "スキル効果のみ（ステータス加算なし）",
  },
];

export const WEAPON_TYPES = ["刀", "槍", "騎", "弓", "衝", "投"] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

export const BASE_MOVE_SPEED: Record<WeaponType, number> = {
  刀: 300,
  槍: 350,
  騎: 420,
  弓: 290,
  衝: 260,
  投: 240,
};

export const APTITUDE_BONUS: Record<
  string,
  { statMult: number; speedMult: number }
> = {
  極: { statMult: 1.2, speedMult: 0 },
  優: { statMult: 1.05, speedMult: 0 },
  良: { statMult: 1.0, speedMult: -0.1 },
  凡: { statMult: 0.9, speedMult: -0.2 },
  下: { statMult: 0.8, speedMult: -0.2 },
};

export const WEAPON_TYPE_ALIASES: Record<WeaponType, string[]> = {
  刀: ["刀"],
  槍: ["槍"],
  騎: ["騎", "馬"],
  弓: ["弓"],
  衝: ["衝"],
  投: ["投"],
};

export const BONUS_STATS = [
  { key: "atk" as const, label: "武力" },
  { key: "int" as const, label: "知略" },
  { key: "guts" as const, label: "胆力" },
  { key: "pol" as const, label: "政治" },
];

export const EQUIPMENT_SLOTS = [
  { key: "weapon" as const, label: "武器" },
  { key: "armor" as const, label: "防具" },
  { key: "accessory" as const, label: "装飾品" },
  { key: "mount" as const, label: "騎乗動物" },
];

export const EQUIPMENT_STATS = [
  { key: "atk" as const, label: "武力" },
  { key: "int" as const, label: "知略" },
  { key: "guts" as const, label: "胆力" },
];

function normalizeAptitudeEntry(aptitude: string): string {
  return aptitude.replace(/\s+/g, "").trim();
}

export function getAptitude(
  aptitudes: string[],
  weaponType: WeaponType
): string {
  if (weaponType === "衝" || weaponType === "投") {
    return "優";
  }

  const candidates = WEAPON_TYPE_ALIASES[weaponType];
  const normalizedAptitudes = aptitudes.map(normalizeAptitudeEntry);
  const found = normalizedAptitudes.find((aptitude) =>
    candidates.some((candidate) => aptitude.startsWith(candidate))
  );
  if (!found) {
    return "凡";
  }

  const matchedPrefix = candidates.find((candidate) =>
    found.startsWith(candidate)
  );
  return matchedPrefix ? found.slice(matchedPrefix.length) : "凡";
}

export function getAptitudeBonus(
  aptitudes: string[],
  weaponType: WeaponType
) {
  const aptitude = getAptitude(aptitudes, weaponType);
  return {
    aptitude,
    bonus: APTITUDE_BONUS[aptitude] ?? APTITUDE_BONUS["凡"],
  };
}

export function calcStat(
  base: number,
  growth: number,
  level: number,
  bonus: number,
  mult: number
): number {
  return (base + growth * (level - 1) + bonus) * mult;
}

export function calcTotalStat(
  base: number,
  growth: number,
  level: number,
  bonus: number,
  mult: number,
  equipment: number,
  kokugaku: number
): number {
  return calcStat(base, growth, level, bonus, mult) + equipment + kokugaku;
}

export function createEmptyBonusAlloc(): BonusAlloc {
  return { atk: 0, int: 0, guts: 0, pol: 0 };
}

export function createEmptyEquipmentSlot(): EquipmentSlot {
  return { atk: 0, int: 0, guts: 0 };
}

export function createEmptyEquipment(): Equipment {
  return {
    weapon: createEmptyEquipmentSlot(),
    armor: createEmptyEquipmentSlot(),
    accessory: createEmptyEquipmentSlot(),
    mount: createEmptyEquipmentSlot(),
  };
}

export function getTotalBonusMax(level: number): number {
  return Math.floor(level / 10) * 10;
}

export function getBonusUsed(alloc: BonusAlloc) {
  return alloc.atk + alloc.int + alloc.guts + alloc.pol;
}

export function clampBonusToMax(alloc: BonusAlloc, max: number): BonusAlloc {
  let remaining = max;
  const atk = Math.min(alloc.atk, remaining);
  remaining -= atk;
  const int = Math.min(alloc.int, remaining);
  remaining -= int;
  const guts = Math.min(alloc.guts, remaining);
  remaining -= guts;
  const pol = Math.min(alloc.pol, remaining);

  return { atk, int, guts, pol };
}

export function parseSavedBonusAlloc(
  bonusPoints?: SavedFormationSlot["bonus_points"] | null
): BonusAlloc {
  if (!bonusPoints || typeof bonusPoints !== "object") {
    return createEmptyBonusAlloc();
  }

  if (
    "atk" in bonusPoints ||
    "int" in bonusPoints ||
    "guts" in bonusPoints ||
    "pol" in bonusPoints
  ) {
    return {
      atk: typeof bonusPoints.atk === "number" ? bonusPoints.atk : 0,
      int: typeof bonusPoints.int === "number" ? bonusPoints.int : 0,
      guts: typeof bonusPoints.guts === "number" ? bonusPoints.guts : 0,
      pol: typeof bonusPoints.pol === "number" ? bonusPoints.pol : 0,
    };
  }

  return createEmptyBonusAlloc();
}

export function parseSavedEquipment(
  equipment?: SavedFormationSlot["equipment"] | null
): Equipment {
  const empty = createEmptyEquipment();
  if (!equipment || typeof equipment !== "object") {
    return empty;
  }

  const readSlot = (key: keyof Equipment): EquipmentSlot => {
    const value = equipment[key];
    if (!value || typeof value !== "object") {
      return createEmptyEquipmentSlot();
    }

    return {
      atk: typeof value.atk === "number" ? value.atk : 0,
      int: typeof value.int === "number" ? value.int : 0,
      guts: typeof value.guts === "number" ? value.guts : 0,
    };
  };

  return {
    weapon: readSlot("weapon"),
    armor: readSlot("armor"),
    accessory: readSlot("accessory"),
    mount: readSlot("mount"),
  };
}

export function getEquipmentStatTotal(
  equipment: Equipment,
  stat: keyof EquipmentSlot
): number {
  return EQUIPMENT_SLOTS.reduce(
    (sum, slot) => sum + equipment[slot.key][stat],
    0
  );
}

export function normalizeEquipmentInput(raw: string): number {
  if (raw === "") {
    return 0;
  }

  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function createEmptySlots(): FormationSlot[] {
  return SQUAD_SLOTS.map((slot, index) => ({
    index,
    role: slot.role,
    roleLabel: slot.label,
    description: slot.description,
    warrior: null,
    skillIds: [],
    warriorLevel: 1,
    skillLevels: [],
    bonusPoints: createEmptyBonusAlloc(),
    equipment: createEmptyEquipment(),
  }));
}

export function maxSkillSlots(role: "主将" | "副将" | "軍師"): number {
  return role === "主将" || role === "副将" ? 2 : 1;
}
