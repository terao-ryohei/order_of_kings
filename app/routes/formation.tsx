import {
  Badge,
  Box,
  Button,
  Collapsible,
  Flex,
  Heading,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useRef, useState } from "react";
import { useMyWarriors } from "../hooks/useMyWarriors";
import { useSavedFormations } from "../hooks/useSavedFormations";
import type {
  BonusAlloc,
  SavedFormation,
  SavedFormationSlot,
} from "../hooks/useSavedFormations";
import {
  warriors,
  weaponAptitudes,
  warriorSkills,
  skills,
} from "../../server/db/schema";

const SQUAD_SLOTS = [
  {
    role: "主将" as const,
    label: "主将",
    description: "怒気スキル発動・部隊の核",
  },
  {
    role: "副将" as const,
    label: "副将",
    description: "ステータス加算・サブアタッカー",
  },
  {
    role: "軍師" as const,
    label: "軍師",
    description: "スキル効果のみ（ステータス加算なし）",
  },
];

type WarriorData = {
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

type SkillData = {
  id: number;
  name: string;
  skill_type: string;
  color: string | null;
  description: string;
};

interface FormationSlot {
  index: number;
  role: "主将" | "副将" | "軍師";
  roleLabel: string;
  description: string;
  warrior: WarriorData | null;
  skillIds: number[];
  warriorLevel: number;
  skillLevels: number[];
  bonusPoints: BonusAlloc;
}

const WEAPON_TYPES = ["刀", "槍", "騎", "弓", "衝", "投"] as const;
type WeaponType = (typeof WEAPON_TYPES)[number];

const BASE_MOVE_SPEED: Record<WeaponType, number> = {
  刀: 300,
  槍: 350,
  騎: 420,
  弓: 290,
  衝: 260,
  投: 240,
};

const APTITUDE_BONUS: Record<string, { statMult: number; speedMult: number }> = {
  "極": { statMult: 1.2, speedMult: 0 },
  "優": { statMult: 1.05, speedMult: 0 },
  "良": { statMult: 1.0, speedMult: -0.1 },
  "凡": { statMult: 0.9, speedMult: -0.2 },
  "下": { statMult: 0.8, speedMult: -0.2 },
};

const WEAPON_TYPE_ALIASES: Record<WeaponType, string[]> = {
  刀: ["刀"],
  槍: ["槍"],
  騎: ["騎", "馬"],
  弓: ["弓"],
  衝: ["衝"],
  投: ["投"],
};

function normalizeAptitudeEntry(aptitude: string): string {
  return aptitude.replace(/\s+/g, "").trim();
}

function getAptitude(aptitudes: string[], weaponType: WeaponType): string {
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

  const matchedPrefix = candidates.find((candidate) => found.startsWith(candidate));
  return matchedPrefix ? found.slice(matchedPrefix.length) : "凡";
}

function getAptitudeBonus(aptitudes: string[], weaponType: WeaponType) {
  const aptitude = getAptitude(aptitudes, weaponType);
  return {
    aptitude,
    bonus: APTITUDE_BONUS[aptitude] ?? APTITUDE_BONUS["凡"],
  };
}

function calcStatAtk(base: number, growth: number, level: number, mult: number): number {
  return Math.round(base * mult + growth * (level - 1));
}

function calcStat(base: number, growth: number, level: number, mult: number): number {
  return Math.round((base + growth * (level - 1)) * mult);
}

const BONUS_STATS = [
  { key: "atk" as const, label: "武力" },
  { key: "int" as const, label: "知略" },
  { key: "guts" as const, label: "胆力" },
  { key: "pol" as const, label: "政治" },
];

function createEmptyBonusAlloc(): BonusAlloc {
  return { atk: 0, int: 0, guts: 0, pol: 0 };
}

function getTotalBonusMax(level: number): number {
  return Math.floor(level / 10) * 10;
}

function getBonusUsed(alloc: BonusAlloc) {
  return alloc.atk + alloc.int + alloc.guts + alloc.pol;
}

function clampBonusToMax(alloc: BonusAlloc, max: number): BonusAlloc {
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

function parseSavedBonusAlloc(
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

export const meta: MetaFunction = () => [
  { title: "編成ビルダー - 王の算盤" },
  {
    name: "description",
    content: "手持ち武将から3枠編成（主将/副将/軍師）を組むページ",
  },
];

export async function loader({ context }: LoaderFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const warriorRows = await db
    .select()
    .from(warriors)
    .where(eq(warriors.is_delete, false))
    .orderBy(asc(warriors.sort_order));

  const ids = warriorRows.map((warrior) => warrior.id);
  const aptitudeRows = ids.length
    ? await db
        .select()
        .from(weaponAptitudes)
        .where(inArray(weaponAptitudes.warrior_id, ids))
    : [];

  const aptitudeMap = new Map<number, string[]>();
  for (const aptitude of aptitudeRows) {
    const current = aptitudeMap.get(aptitude.warrior_id) ?? [];
    current.push(`${aptitude.weapon_type}${aptitude.aptitude}`);
    aptitudeMap.set(aptitude.warrior_id, current);
  }

  const skillRows = ids.length
    ? await db
        .select({
          warrior_id: warriorSkills.warrior_id,
          slot: warriorSkills.slot,
          skill_name: skills.name,
          skill_description: skills.description,
          is_unique: warriorSkills.is_unique,
        })
        .from(warriorSkills)
        .innerJoin(skills, eq(warriorSkills.skill_id, skills.id))
        .where(inArray(warriorSkills.warrior_id, ids))
    : [];

  const skillMap = new Map<
    number,
    {
      skill1: string | null;
      skill2: string | null;
      skill1_desc: string | null;
      skill2_desc: string | null;
    }
  >();
  for (const row of skillRows) {
    if (!row.is_unique) continue;
    const current = skillMap.get(row.warrior_id) ?? {
      skill1: null,
      skill2: null,
      skill1_desc: null,
      skill2_desc: null,
    };
    if (row.slot === 1) {
      current.skill1 = row.skill_name;
      current.skill1_desc = row.skill_description;
    }
    if (row.slot === 2) {
      current.skill2 = row.skill_name;
      current.skill2_desc = row.skill_description;
    }
    skillMap.set(row.warrior_id, current);
  }

  // 固有スキル除外: LEFT JOIN + IS NULL (warrior_skillsに紐づくスキルを除外)
  const allSkills = await db
    .select({
      id: skills.id,
      name: skills.name,
      skill_type: skills.skill_type,
      color: skills.color,
      description: skills.description,
    })
    .from(skills)
    .leftJoin(warriorSkills, eq(skills.id, warriorSkills.skill_id))
    .where(and(eq(skills.is_delete, false), isNull(warriorSkills.skill_id)))
    .orderBy(asc(skills.sort_order));

  return {
    warriors: warriorRows.map((warrior) => {
      const uniqueSkills = skillMap.get(warrior.id);
      return {
        id: warrior.id,
        name: warrior.name,
        reading: warrior.reading,
        rarity: warrior.rarity,
        atk: warrior.atk,
        int: warrior.int,
        guts: warrior.guts,
        atk_growth: warrior.atk_growth,
        int_growth: warrior.int_growth,
        guts_growth: warrior.guts_growth,
        era: warrior.era,
        aptitudes: aptitudeMap.get(warrior.id) ?? [],
        skill1_name: uniqueSkills?.skill1 ?? null,
        skill2_name: uniqueSkills?.skill2 ?? null,
        skill1_desc: uniqueSkills?.skill1_desc ?? null,
        skill2_desc: uniqueSkills?.skill2_desc ?? null,
      };
    }),
    allSkills,
  };
}

function RarityStars({ rarity }: { rarity: number }) {
  const color =
    rarity >= 5 ? "orange.400" : rarity >= 4 ? "purple.400" : "blue.400";
  return (
    <Text color={color} fontWeight="bold" fontSize="sm">
      {"★".repeat(rarity)}
    </Text>
  );
}

function createEmptySlots(): FormationSlot[] {
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
  }));
}

function maxSkillSlots(role: "主将" | "副将" | "軍師"): number {
  return role === "主将" || role === "副将" ? 2 : 1;
}

export default function FormationBuilderPage() {
  const { warriors: allWarriors, allSkills } = useLoaderData<typeof loader>();
  const { myWarriorIds, isHydrated } = useMyWarriors();
  const [slots, setSlots] = useState<FormationSlot[]>(() => createEmptySlots());

  const navigate = useNavigate();
  const {
    savedFormations,
    isFull,
    saveFormation,
    saveFormationForce,
    deleteFormation,
  } = useSavedFormations();

  const [weaponType, setWeaponType] = useState<WeaponType | null>(null);
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [overflowConfirm, setOverflowConfirm] = useState<string | null>(null);
  const [loadConfirm, setLoadConfirm] = useState<SavedFormation | null>(null);

  const myWarriors = allWarriors.filter((warrior) =>
    myWarriorIds.includes(warrior.id)
  );
  const assignedIds = new Set(
    slots
      .map((slot) => slot.warrior?.id)
      .filter((id): id is number => typeof id === "number")
  );

  // 軍師はステータス合計から除外
  const totals = slots.reduce(
    (sum, slot) => {
      if (!slot.warrior || slot.role === "軍師") {
        return sum;
      }

      const statMult = weaponType
        ? getAptitudeBonus(slot.warrior.aptitudes, weaponType).bonus.statMult
        : 1.0;
      const intGutsMult = (statMult - 1) * 0.5 + 1;

      return {
        atk: sum.atk + calcStatAtk(slot.warrior.atk, slot.warrior.atk_growth, slot.warriorLevel, statMult) + slot.bonusPoints.atk,
        int: sum.int + calcStat(slot.warrior.int, slot.warrior.int_growth, slot.warriorLevel, intGutsMult) + slot.bonusPoints.int,
        guts: sum.guts + calcStat(slot.warrior.guts, slot.warrior.guts_growth, slot.warriorLevel, intGutsMult) + slot.bonusPoints.guts,
      };
    },
    { atk: 0, int: 0, guts: 0 }
  );

  const slotsWithWarrior = slots.filter(s => s.warrior && s.role !== "軍師");
  const squadSpeed = weaponType && slotsWithWarrior.length > 0
    ? Math.round(
        slotsWithWarrior.reduce((total, slot) => {
          const speedMult = getAptitudeBonus(slot.warrior!.aptitudes, weaponType).bonus.speedMult;
          return total + BASE_MOVE_SPEED[weaponType] * speedMult;
        }, BASE_MOVE_SPEED[weaponType])
      )
    : null;

  const assignWarrior = (warrior: WarriorData) => {
    if (assignedIds.has(warrior.id)) {
      return;
    }

    setSlots((current) => {
      const emptyIndex = current.findIndex((slot) => slot.warrior === null);
      if (emptyIndex === -1) {
        return current;
      }

      return current.map((slot, index) =>
        index === emptyIndex
          ? {
              ...slot,
              warrior,
              skillIds: [],
              warriorLevel: 1,
              skillLevels: [],
              bonusPoints: createEmptyBonusAlloc(),
            }
          : slot
      );
    });
  };

  const clearSlot = (slotIndex: number) => {
    setSlots((current) =>
      current.map((slot) =>
        slot.index === slotIndex
          ? {
              ...slot,
              warrior: null,
              skillIds: [],
              warriorLevel: 1,
              skillLevels: [],
              bonusPoints: createEmptyBonusAlloc(),
            }
          : slot
      )
    );
  };

  const updateWarriorLevel = (slotIndex: number, level: number) => {
    const clamped = Math.max(1, Math.min(40, level));
    setSlots((current) =>
      current.map((slot) => {
        if (slot.index !== slotIndex) return slot;
        const maxBonus = getTotalBonusMax(clamped);
        const clampedBonus = clampBonusToMax(slot.bonusPoints, maxBonus);
        return { ...slot, warriorLevel: clamped, bonusPoints: clampedBonus };
      })
    );
  };

  const updateBonusPoint = (
    slotIndex: number,
    stat: keyof BonusAlloc,
    delta: 1 | -1
  ) => {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.index !== slotIndex) return slot;

        const currentAlloc = slot.bonusPoints;
        const currentValue = currentAlloc[stat];
        const nextValue = currentValue + delta;
        const currentTotal = getBonusUsed(currentAlloc);

        if (nextValue < 0) return slot;
        if (delta > 0 && currentTotal >= getTotalBonusMax(slot.warriorLevel))
          return slot;

        return {
          ...slot,
          bonusPoints: { ...currentAlloc, [stat]: nextValue },
        };
      })
    );
  };

  const updateSkillId = (
    slotIndex: number,
    skillSlot: number,
    skillId: number | null
  ) => {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.index !== slotIndex) return slot;
        const newSkillIds = [...slot.skillIds];
        const newSkillLevels = [...slot.skillLevels];
        if (skillId === null) {
          newSkillIds.splice(skillSlot, 1);
          newSkillLevels.splice(skillSlot, 1);
        } else {
          newSkillIds[skillSlot] = skillId;
          if (newSkillLevels[skillSlot] === undefined)
            newSkillLevels[skillSlot] = 1;
        }
        return { ...slot, skillIds: newSkillIds, skillLevels: newSkillLevels };
      })
    );
  };

  const updateSkillLevel = (
    slotIndex: number,
    skillSlot: number,
    level: number
  ) => {
    const clamped = Math.max(1, Math.min(10, level));
    setSlots((current) =>
      current.map((slot) => {
        if (slot.index !== slotIndex) return slot;
        const newSkillLevels = [...slot.skillLevels];
        newSkillLevels[skillSlot] = clamped;
        return { ...slot, skillLevels: newSkillLevels };
      })
    );
  };

  const clearAll = () => {
    setSlots(createEmptySlots());
  };

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = (
    slotIndex: number,
    stat: keyof BonusAlloc,
    delta: 1 | -1
  ) => {
    updateBonusPoint(slotIndex, stat, delta);
    intervalRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        updateBonusPoint(slotIndex, stat, delta);
      }, 100);
    }, 300);
  };

  const stopLongPress = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const buildSlotData = (): SavedFormationSlot[] => {
    return slots
      .filter((s) => s.warrior !== null)
      .map((s) => ({
        warrior_id: s.warrior!.id,
        role_label: s.roleLabel,
        skill_ids: s.skillIds,
        warrior_level: s.warriorLevel,
        skill_levels: s.skillLevels,
        bonus_points: s.bonusPoints,
      }));
  };

  const handleSave = () => {
    const slotData = buildSlotData();
    if (slotData.length === 0) return;

    const result = saveFormation(saveName || "無名の編成", slotData, totals, weaponType);
    if (!result.ok && result.overflowId) {
      setOverflowConfirm(result.overflowId);
      return;
    }
    setSaveMode(false);
    setSaveName("");
  };

  const handleSaveForce = () => {
    if (!overflowConfirm) return;
    const slotData = buildSlotData();
    saveFormationForce(
      saveName || "無名の編成",
      slotData,
      totals,
      overflowConfirm,
      weaponType
    );
    setOverflowConfirm(null);
    setSaveMode(false);
    setSaveName("");
  };

  const handleLoad = (formation: SavedFormation) => {
    const newSlots = createEmptySlots();
    for (const saved of formation.slots) {
      const warrior = allWarriors.find((w) => w.id === saved.warrior_id);
      if (!warrior) continue;
      const slotIdx = newSlots.findIndex(
        (s) => s.roleLabel === saved.role_label && s.warrior === null
      );
      if (slotIdx !== -1) {
        newSlots[slotIdx] = {
          ...newSlots[slotIdx],
          warrior,
          skillIds: saved.skill_ids ?? [],
          warriorLevel: saved.warrior_level ?? 1,
          skillLevels: saved.skill_levels ?? [],
          bonusPoints: clampBonusToMax(
            parseSavedBonusAlloc(saved.bonus_points),
            getTotalBonusMax(saved.warrior_level ?? 1)
          ),
        };
      }
    }
    setSlots(newSlots);
    setWeaponType((formation.weapon_type as WeaponType) ?? null);
    setLoadConfirm(null);
  };

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch" maxW="1200px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="xl" color="white">
              編成ビルダー
            </Heading>
            <Text fontSize="sm" color="gray.400">
              主将・副将・軍師の3スロット編成を組み、合計能力を即時確認できるでござる
            </Text>
          </VStack>
          <HStack gap={4} wrap="wrap">
            <Link
              to="/my-warriors"
              style={{ color: "#ECC94B", fontSize: "14px", fontWeight: 700 }}
            >
              手持ち武将管理へ
            </Link>
            <Link to="/" style={{ color: "#A0AEC0", fontSize: "14px" }}>
              ← 武将一覧へ戻る
            </Link>
          </HStack>
        </Flex>

        {/* 改善3: 合計ステータスを最上部に表示 */}
        <SimpleGrid columns={{ base: squadSpeed !== null ? 4 : 3 }} gap={3}>
          <Box
            bg="whiteAlpha.100"
            borderRadius="xl"
            p={4}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
          >
            <Text fontSize="sm" color="gray.400">
              武力合計
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {totals.atk}
            </Text>
            <Text fontSize="xs" color="gray.500">
              主将+副将
            </Text>
          </Box>
          <Box
            bg="whiteAlpha.100"
            borderRadius="xl"
            p={4}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
          >
            <Text fontSize="sm" color="gray.400">
              知略合計
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {totals.int}
            </Text>
            <Text fontSize="xs" color="gray.500">
              主将+副将
            </Text>
          </Box>
          <Box
            bg="whiteAlpha.100"
            borderRadius="xl"
            p={4}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
          >
            <Text fontSize="sm" color="gray.400">
              胆力合計
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {totals.guts}
            </Text>
            <Text fontSize="xs" color="gray.500">
              主将+副将
            </Text>
          </Box>
          {squadSpeed !== null && (
            <Box
              bg="whiteAlpha.100"
              borderRadius="xl"
              p={4}
              borderWidth="1px"
              borderColor="orange.700"
            >
              <Text fontSize="sm" color="gray.400">
                移動速度
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {squadSpeed}
              </Text>
              <Text fontSize="xs" color="gray.500">
                兵種基礎値込み
              </Text>
            </Box>
          )}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} alignItems="start">
          <VStack gap={4} align="stretch">
            <Box
              bg="whiteAlpha.100"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              p={5}
            >
              <Flex
                justify="space-between"
                align={{ base: "start", md: "center" }}
                flexWrap="wrap"
                gap={3}
              >
                <VStack align="start" gap={1}>
                  <Heading size="md">編成スロット</Heading>
                  <Text fontSize="sm" color="gray.400">
                    配置済み {assignedIds.size}/3人
                  </Text>
                </VStack>
                <Flex gap={3} wrap="wrap">
                  <Button variant="outline" onClick={clearAll}>
                    全解除
                  </Button>
                  {/*<Link to="/formation/consult">
                    <Button colorPalette="blue">おまかせ相談</Button>
                  </Link>*/}
                  <Button
                    colorPalette="yellow"
                    variant="outline"
                    onClick={() => setSaveMode(!saveMode)}
                    disabled={!slots.some((s) => s.warrior)}
                  >
                    {saveMode ? "キャンセル" : "保存"}
                  </Button>
                  <Button
                    variant="subtle"
                    disabled={!slots.some((s) => s.warrior)}
                    onClick={() => navigate("/share")}
                  >
                    共有する
                  </Button>
                </Flex>
              </Flex>

              <Box mt={3} mb={2}>
                <Text fontSize="xs" color="gray.400" mb={1}>兵種</Text>
                <HStack gap={2} flexWrap="wrap">
                  {WEAPON_TYPES.map(wt => (
                    <Button
                      key={wt}
                      size="xs"
                      variant={weaponType === wt ? "solid" : "outline"}
                      colorPalette={weaponType === wt ? "orange" : "gray"}
                      onClick={() => setWeaponType(prev => prev === wt ? null : wt)}
                    >
                      {wt}
                    </Button>
                  ))}
                  {weaponType && (
                    <Button size="xs" variant="ghost" onClick={() => setWeaponType(null)}>
                      解除
                    </Button>
                  )}
                </HStack>
              </Box>

              {saveMode && (
                <Box
                  mt={4}
                  p={4}
                  bg="yellow.950"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="yellow.700"
                >
                  {overflowConfirm ? (
                    <VStack align="stretch" gap={3}>
                      <Text fontSize="sm" color="yellow.200">
                        保存上限（10件）に達しています。最も古い保存を削除して保存しますか？
                      </Text>
                      <Flex gap={2}>
                        <Button
                          size="sm"
                          colorPalette="yellow"
                          onClick={handleSaveForce}
                        >
                          削除して保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOverflowConfirm(null)}
                        >
                          やめる
                        </Button>
                      </Flex>
                    </VStack>
                  ) : (
                    <VStack align="stretch" gap={3}>
                      <Text fontSize="sm" color="yellow.200">
                        編成に名前をつけて保存（{savedFormations.length}/10件）
                      </Text>
                      <Flex gap={2}>
                        <Input
                          placeholder="編成名を入力"
                          value={saveName}
                          onChange={(e) => setSaveName(e.target.value)}
                          size="sm"
                          bg="gray.900"
                          borderColor="yellow.700"
                          _focus={{ borderColor: "yellow.400" }}
                          onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        />
                        <Button
                          size="sm"
                          colorPalette="yellow"
                          onClick={handleSave}
                        >
                          保存
                        </Button>
                      </Flex>
                    </VStack>
                  )}
                </Box>
              )}

              {loadConfirm && (
                <Box
                  mt={4}
                  p={4}
                  bg="blue.950"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="blue.700"
                >
                  <VStack align="stretch" gap={3}>
                    <Text fontSize="sm" color="blue.200">
                      「{loadConfirm.name}
                      」を読み込みますか？現在の編成は上書きされます。
                    </Text>
                    <Flex gap={2}>
                      <Button
                        size="sm"
                        colorPalette="blue"
                        onClick={() => handleLoad(loadConfirm)}
                      >
                        読み込む
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLoadConfirm(null)}
                      >
                        やめる
                      </Button>
                    </Flex>
                  </VStack>
                </Box>
              )}

              <VStack gap={3} mt={5} align="stretch">
                {slots.map((slot) => (
                  <Collapsible.Root key={slot.index} defaultOpen>
                    <Box
                      textAlign="left"
                      bg={slot.warrior ? "blue.950" : "gray.900"}
                      borderRadius="xl"
                      borderWidth="1px"
                      borderColor={slot.warrior ? "blue.300" : "whiteAlpha.200"}
                      p={4}
                      transition="all 0.2s"
                    >
                      <Collapsible.Trigger asChild>
                        <Flex
                          as="button"
                          type="button"
                          justify="space-between"
                          w="100%"
                          align="center"
                          cursor="pointer"
                          _hover={{ opacity: 0.8 }}
                        >
                          <Flex align="center" gap={2}>
                            <Badge
                              colorPalette={slot.warrior ? "blue" : "gray"}
                            >
                              {slot.roleLabel}
                            </Badge>
                            {slot.warrior ? (
                              <>
                                <Text fontWeight="bold" fontSize="sm">
                                  {slot.warrior.name}
                                </Text>
                                <RarityStars rarity={slot.warrior.rarity} />
                                <Text fontSize="xs" color="gray.400">
                                  Lv.{slot.warriorLevel}
                                </Text>
                              </>
                            ) : (
                              <Text fontSize="sm" color="gray.400">
                                未配置
                              </Text>
                            )}
                          </Flex>
                          <Text fontSize="xs" color="gray.500">
                            ▼
                          </Text>
                        </Flex>
                      </Collapsible.Trigger>
                      <Collapsible.Content>
                        <VStack align="start" gap={1} mt={3}>
                          <Text fontSize="xs" color="gray.400">
                            {slot.description}
                          </Text>
                          {slot.warrior ? (
                            <>
                              <Flex
                                justify="space-between"
                                w="100%"
                                align="center"
                              >
                                <Flex align="center" gap={2}>
                                  <Text
                                    fontSize="xs"
                                    color="gray.400"
                                    flexShrink={0}
                                  >
                                    Lv.
                                  </Text>
                                  <NativeSelect.Root size="xs" w="80px">
                                    <NativeSelect.Field
                                      value={String(slot.warriorLevel)}
                                      onChange={(e) =>
                                        updateWarriorLevel(
                                          slot.index,
                                          Number(e.target.value)
                                        )
                                      }
                                      bg="gray.900"
                                      borderColor="whiteAlpha.300"
                                    >
                                      {Array.from(
                                        { length: 40 },
                                        (_, i) => i + 1
                                      ).map((lv) => (
                                        <option key={lv} value={String(lv)}>
                                          Lv.{lv}
                                        </option>
                                      ))}
                                    </NativeSelect.Field>
                                  </NativeSelect.Root>
                                </Flex>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  colorPalette="red"
                                  onClick={() => clearSlot(slot.index)}
                                >
                                  解除
                                </Button>
                              </Flex>
                              <Flex gap={2} align="center" flexWrap="wrap">
                                <Text fontSize="xs" color="gray.300">
                                  兵種:{" "}
                                  {slot.warrior.aptitudes.length > 0
                                    ? slot.warrior.aptitudes.join(" / ")
                                    : "未登録"}
                                </Text>
                                {weaponType && slot.warrior && (() => {
                                  const { aptitude, bonus } = getAptitudeBonus(slot.warrior.aptitudes, weaponType);
                                  return (
                                    <Badge
                                      colorPalette={aptitude === "極" ? "orange" : aptitude === "優" ? "yellow" : aptitude === "良" ? "green" : "gray"}
                                      variant="subtle"
                                      fontSize="xs"
                                    >
                                      {weaponType}{aptitude} ({bonus.statMult >= 1 ? "+" : ""}{Math.round((bonus.statMult - 1) * 100)}%)
                                    </Badge>
                                  );
                                })()}
                              </Flex>
                              {getTotalBonusMax(slot.warriorLevel) > 0 && (
                                <VStack
                                  w="100%"
                                  align="stretch"
                                  gap={2}
                                  mt={2}
                                  p={3}
                                  bg="whiteAlpha.50"
                                  borderRadius="lg"
                                  borderWidth="1px"
                                  borderColor="whiteAlpha.200"
                                >
                                  {(() => {
                                    const maxBonus = getTotalBonusMax(
                                      slot.warriorLevel
                                    );
                                    const usedPoints = getBonusUsed(
                                      slot.bonusPoints
                                    );
                                    const remainingPoints =
                                      maxBonus - usedPoints;

                                    return (
                                      <>
                                        <Text
                                          fontSize="xs"
                                          color="yellow.200"
                                          fontWeight="bold"
                                        >
                                          ボーナス {maxBonus}p（残:{" "}
                                          {remainingPoints}p）
                                        </Text>
                                        <SimpleGrid
                                          columns={{ base: 2, md: 4 }}
                                          gap={1}
                                        >
                                          {BONUS_STATS.map((stat) => (
                                            <Flex
                                              key={stat.key}
                                              align="center"
                                              justify="space-between"
                                              gap={1}
                                              p={1}
                                              bg="blackAlpha.300"
                                              borderRadius="md"
                                            >
                                              <Text
                                                fontSize="xs"
                                                color="gray.300"
                                                minW="28px"
                                              >
                                                {stat.label}
                                              </Text>
                                              <HStack gap={1}>
                                                <Button
                                                  size="2xs"
                                                  variant="outline"
                                                  onPointerDown={() =>
                                                    startLongPress(
                                                      slot.index,
                                                      stat.key,
                                                      -1
                                                    )
                                                  }
                                                  onPointerUp={stopLongPress}
                                                  onPointerLeave={stopLongPress}
                                                  disabled={
                                                    slot.bonusPoints[
                                                      stat.key
                                                    ] <= 0
                                                  }
                                                >
                                                  -
                                                </Button>
                                                <Text
                                                  fontSize="xs"
                                                  minW="20px"
                                                  textAlign="center"
                                                >
                                                  {slot.bonusPoints[stat.key]}
                                                </Text>
                                                <Button
                                                  size="2xs"
                                                  variant="outline"
                                                  onPointerDown={() =>
                                                    startLongPress(
                                                      slot.index,
                                                      stat.key,
                                                      1
                                                    )
                                                  }
                                                  onPointerUp={stopLongPress}
                                                  onPointerLeave={stopLongPress}
                                                  disabled={
                                                    remainingPoints <= 0
                                                  }
                                                >
                                                  +
                                                </Button>
                                              </HStack>
                                            </Flex>
                                          ))}
                                        </SimpleGrid>
                                      </>
                                    );
                                  })()}
                                </VStack>
                              )}
                              {(() => {
                                const skillName =
                                  slot.role === "軍師"
                                    ? slot.warrior.skill2_name
                                    : slot.warrior.skill1_name;
                                const skillDesc =
                                  slot.role === "軍師"
                                    ? slot.warrior.skill2_desc
                                    : slot.warrior.skill1_desc;
                                const skillLabel =
                                  slot.role === "軍師"
                                    ? "軍師スキル"
                                    : "統率スキル";
                                if (!skillName) return null;
                                return skillDesc ? (
                                  <Collapsible.Root>
                                    <Collapsible.Trigger asChild>
                                      <Badge
                                        colorPalette={
                                          slot.role === "軍師"
                                            ? "purple"
                                            : "teal"
                                        }
                                        variant="subtle"
                                        fontSize="xs"
                                        mt={1}
                                        cursor="pointer"
                                        _hover={{ opacity: 0.8 }}
                                      >
                                        {skillLabel}: {skillName} ▾
                                      </Badge>
                                    </Collapsible.Trigger>
                                    <Collapsible.Content>
                                      <Text
                                        fontSize="xs"
                                        color="gray.400"
                                        mt={1}
                                        pl={2}
                                      >
                                        {skillDesc}
                                      </Text>
                                    </Collapsible.Content>
                                  </Collapsible.Root>
                                ) : (
                                  <Badge
                                    colorPalette={
                                      slot.role === "軍師" ? "purple" : "teal"
                                    }
                                    variant="subtle"
                                    fontSize="xs"
                                    mt={1}
                                  >
                                    {skillLabel}: {skillName}
                                  </Badge>
                                );
                              })()}
                              <Box w="100%" mt={2}>
                                <Text fontSize="xs" color="gray.400" mb={1}>
                                  装備スキル（{slot.skillIds.length}/
                                  {maxSkillSlots(slot.role)}枠）
                                </Text>
                                {slot.skillIds.map((skId, i) => {
                                  const selectedSkill = allSkills.find(
                                    (sk) => sk.id === skId
                                  );
                                  return (
                                    <Box key={i} mb={2}>
                                      <Flex gap={1} align="center">
                                        <select
                                          value={skId}
                                          onChange={(e) => {
                                            const v = Number(e.target.value);
                                            updateSkillId(
                                              slot.index,
                                              i,
                                              v || null
                                            );
                                          }}
                                          style={{
                                            flex: 1,
                                            fontSize: "12px",
                                            background: "#1a1a2e",
                                            color: "white",
                                            border:
                                              "1px solid rgba(255,255,255,0.2)",
                                            borderRadius: "6px",
                                            padding: "4px 6px",
                                          }}
                                        >
                                          <option value={0}>-- 選択 --</option>
                                          {allSkills.map((sk) => (
                                            <option key={sk.id} value={sk.id}>
                                              {sk.name}
                                            </option>
                                          ))}
                                        </select>
                                        <NativeSelect.Root size="xs" w="70px">
                                          <NativeSelect.Field
                                            value={String(
                                              slot.skillLevels[i] ?? 1
                                            )}
                                            onChange={(e) =>
                                              updateSkillLevel(
                                                slot.index,
                                                i,
                                                Number(e.target.value)
                                              )
                                            }
                                            bg="gray.900"
                                            borderColor="whiteAlpha.300"
                                          >
                                            {Array.from(
                                              { length: 10 },
                                              (_, j) => j + 1
                                            ).map((lv) => (
                                              <option
                                                key={lv}
                                                value={String(lv)}
                                              >
                                                Lv.{lv}
                                              </option>
                                            ))}
                                          </NativeSelect.Field>
                                        </NativeSelect.Root>
                                        <Button
                                          size="xs"
                                          variant="ghost"
                                          colorPalette="red"
                                          onClick={() =>
                                            updateSkillId(slot.index, i, null)
                                          }
                                        >
                                          ×
                                        </Button>
                                      </Flex>
                                      {selectedSkill && skId !== 0 && (
                                        <Text
                                          fontSize="xs"
                                          color="gray.500"
                                          mt={1}
                                          pl={1}
                                        >
                                          {selectedSkill.description}
                                        </Text>
                                      )}
                                    </Box>
                                  );
                                })}
                                {slot.skillIds.length <
                                  maxSkillSlots(slot.role) && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    colorPalette="teal"
                                    onClick={() =>
                                      updateSkillId(
                                        slot.index,
                                        slot.skillIds.length,
                                        0
                                      )
                                    }
                                    mt={1}
                                  >
                                    ＋スキルを追加
                                  </Button>
                                )}
                              </Box>
                              {slot.role !== "軍師" && (() => {
                                const slotStatMult = weaponType && slot.warrior
                                  ? getAptitudeBonus(slot.warrior.aptitudes, weaponType).bonus.statMult
                                  : 1.0;
                                const slotIntGutsMult = (slotStatMult - 1) * 0.5 + 1;
                                return (
                                <VStack align="start" gap={0} mt={1}>
                                  <Text fontSize="xs" color="gray.400">
                                    武{calcStatAtk(slot.warrior.atk, slot.warrior.atk_growth, slot.warriorLevel, slotStatMult) + slot.bonusPoints.atk}
                                  </Text>
                                  <Text fontSize="xs" color="gray.400">
                                    知{calcStat(slot.warrior.int, slot.warrior.int_growth, slot.warriorLevel, slotIntGutsMult) + slot.bonusPoints.int}
                                  </Text>
                                  <Text fontSize="xs" color="gray.400">
                                    胆
                                    {calcStat(slot.warrior.guts, slot.warrior.guts_growth, slot.warriorLevel, slotIntGutsMult) + slot.bonusPoints.guts}
                                  </Text>
                                </VStack>
                                );
                              })()}
                            </>
                          ) : (
                            <Text fontSize="sm" color="gray.400" mt={1}>
                              武将を選ぶとここに配置される
                            </Text>
                          )}
                        </VStack>
                      </Collapsible.Content>
                    </Box>
                  </Collapsible.Root>
                ))}
              </VStack>
            </Box>

            {savedFormations.length > 0 && (
              <Collapsible.Root>
                <Box
                  bg="whiteAlpha.100"
                  borderRadius="2xl"
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  p={5}
                >
                  <Collapsible.Trigger asChild>
                    <Button
                      variant="ghost"
                      w="100%"
                      justifyContent="space-between"
                      px={0}
                    >
                      <Heading size="md">
                        保存済み編成（{savedFormations.length}件）
                      </Heading>
                      <Text fontSize="sm" color="gray.400">
                        ▼ 開く
                      </Text>
                    </Button>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <VStack align="stretch" gap={3} mt={4}>
                      {savedFormations.map((f) => (
                        <Box
                          key={f.id}
                          bg="gray.900"
                          borderRadius="xl"
                          borderWidth="1px"
                          borderColor="whiteAlpha.200"
                          p={4}
                        >
                          <Flex justify="space-between" align="start" gap={3}>
                            <VStack align="start" gap={1} flex="1">
                              <Text fontWeight="bold" fontSize="sm">
                                {f.name}
                              </Text>
                              <Text fontSize="xs" color="gray.400">
                                {new Date(f.created_at).toLocaleDateString(
                                  "ja-JP"
                                )}{" "}
                                ・ 武{f.total_score.atk} 知{f.total_score.int}{" "}
                                胆{f.total_score.guts}
                              </Text>
                              <Flex gap={1} wrap="wrap">
                                {f.slots.map((s, i) => (
                                  <Badge
                                    key={i}
                                    colorPalette="blue"
                                    variant="outline"
                                    fontSize="xs"
                                  >
                                    {s.role_label}:{" "}
                                    {allWarriors.find(
                                      (w) => w.id === s.warrior_id
                                    )?.name ?? "不明"}
                                  </Badge>
                                ))}
                              </Flex>
                            </VStack>
                            <VStack gap={1}>
                              <Button
                                size="xs"
                                colorPalette="blue"
                                variant="outline"
                                onClick={() => setLoadConfirm(f)}
                              >
                                読込
                              </Button>
                              <Button
                                size="xs"
                                colorPalette="red"
                                variant="ghost"
                                onClick={() => deleteFormation(f.id)}
                              >
                                削除
                              </Button>
                            </VStack>
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  </Collapsible.Content>
                </Box>
              </Collapsible.Root>
            )}
          </VStack>

          <Box
            bg="whiteAlpha.100"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            p={5}
          >
            <VStack align="stretch" gap={4}>
              <VStack align="start" gap={1}>
                <Heading size="md">手持ち武将</Heading>
                <Text fontSize="sm" color="gray.400">
                  空きスロットへ自動配置。配置済み武将は再選択不可。
                </Text>
              </VStack>

              {!isHydrated ? (
                <Box py={10} textAlign="center">
                  <Text color="gray.400">手持ち武将を読み込み中...</Text>
                </Box>
              ) : myWarriors.length === 0 ? (
                <Box py={10} textAlign="center">
                  <Text fontWeight="bold" mb={3}>
                    まず手持ち武将を登録してください
                  </Text>
                  <Link
                    to="/my-warriors"
                    style={{ color: "#ECC94B", fontWeight: 700 }}
                  >
                    /my-warriors へ移動
                  </Link>
                </Box>
              ) : (
                <VStack
                  align="stretch"
                  gap={3}
                  maxH={{ base: "none", lg: "900px" }}
                  overflowY="auto"
                  pr={1}
                >
                  {myWarriors.map((warrior) => {
                    const isAssigned = assignedIds.has(warrior.id);
                    return (
                      <Box
                        key={warrior.id}
                        as="button"
                        type="button"
                        onClick={() => assignWarrior(warrior)}
                        disabled={isAssigned || assignedIds.size >= 3}
                        textAlign="left"
                        bg={isAssigned ? "gray.700" : "gray.900"}
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor={isAssigned ? "gray.600" : "whiteAlpha.200"}
                        opacity={isAssigned ? 0.55 : 1}
                        p={4}
                        _hover={
                          isAssigned
                            ? undefined
                            : {
                                borderColor: "blue.400",
                                transform: "translateY(-1px)",
                              }
                        }
                        transition="all 0.2s"
                      >
                        <Flex justify="space-between" align="start" gap={3}>
                          <VStack align="start" gap={1} flex="1">
                            <Flex gap={2} wrap="wrap" align="center">
                              <Text fontWeight="bold">{warrior.name}</Text>
                              <RarityStars rarity={warrior.rarity} />
                              <Badge
                                colorPalette={isAssigned ? "gray" : "green"}
                                variant="outline"
                              >
                                {isAssigned ? "配置済み" : "配置可能"}
                              </Badge>
                            </Flex>
                            <Text fontSize="sm" color="gray.400">
                              {warrior.reading}
                            </Text>
                            <Flex gap={2} wrap="wrap">
                              {warrior.era && (
                                <Badge colorPalette="blue">{warrior.era}</Badge>
                              )}
                              <Badge colorPalette="purple" variant="subtle">
                                {warrior.aptitudes.length > 0
                                  ? warrior.aptitudes.join(" / ")
                                  : "適性未登録"}
                              </Badge>
                            </Flex>
                          </VStack>
                          <VStack align="end" gap={1}>
                            <Text fontSize="xs" color="gray.400">
                              武{warrior.atk}
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                              知{warrior.int}
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                              胆{warrior.guts}
                            </Text>
                          </VStack>
                        </Flex>
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </VStack>
          </Box>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
