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
  chakra,
} from "@chakra-ui/react";
import { useNavigate } from "@remix-run/react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useKokugakuLevels } from "../hooks/useKokugakuLevels";
import { useSavedFormations } from "../hooks/useSavedFormations";
import type {
  BonusAlloc,
  Equipment,
  EquipmentSlot,
  SavedFormation,
  SavedFormationSlot,
} from "../hooks/useSavedFormations";
import { KOKUGAKU_STAT_LABELS } from "../lib/kokugaku";
import {
  BONUS_STATS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_STATS,
  SQUAD_SLOTS,
  WEAPON_TYPES,
  BASE_MOVE_SPEED,
  calcTotalStat,
  clampBonusToMax,
  createEmptyBonusAlloc,
  createEmptyEquipment,
  createEmptySlots,
  getAptitudeBonus,
  getBonusUsed,
  getEquipmentStatTotal,
  getTotalBonusMax,
  maxSkillSlots,
  normalizeEquipmentInput,
  parseSavedBonusAlloc,
  parseSavedEquipment,
  type FormationSlot,
  type SkillData,
  type WarriorData,
  type WeaponType,
} from "../lib/formation-shared";

interface FormationBuilderProps {
  allWarriors: WarriorData[];
  selectableWarriors: WarriorData[];
  allSkills: SkillData[];
  isReady: boolean;
  emptyContent: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  warriorSectionTitle?: string;
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

export default function FormationBuilder({
  allWarriors,
  selectableWarriors,
  allSkills,
  isReady,
  emptyContent,
  pageTitle = "編成ビルダー",
  pageSubtitle = "主将・副将・軍師の3スロット編成を組み、合計能力を即時確認できる",
  warriorSectionTitle = "手持ち武将",
}: FormationBuilderProps) {
  const { bonuses: kokugakuBonus } = useKokugakuLevels();
  const [slots, setSlots] = useState<FormationSlot[]>(() => createEmptySlots());

  const navigate = useNavigate();
  const {
    savedFormations,
    saveFormation,
    saveFormationForce,
    deleteFormation,
  } = useSavedFormations();

  const [weaponType, setWeaponType] = useState<WeaponType | null>(null);
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [overflowConfirm, setOverflowConfirm] = useState<string | null>(null);
  const [loadConfirm, setLoadConfirm] = useState<SavedFormation | null>(null);
  const [selectedFormationId, setSelectedFormationId] = useState("");

  const hasAssignedWarrior = slots.some((slot) => slot.warrior);
  const assignedIds = new Set(
    slots
      .map((slot) => slot.warrior?.id)
      .filter((id): id is number => typeof id === "number")
  );

  const totals = slots.reduce(
    (sum, slot) => {
      if (!slot.warrior || slot.role === "軍師") {
        return sum;
      }

      const statMult = weaponType
        ? getAptitudeBonus(slot.warrior.aptitudes, weaponType).bonus.statMult
        : 1.0;
      const intGutsMult = (statMult - 1) * 0.5 + 1;
      const equipmentAtk = getEquipmentStatTotal(slot.equipment, "atk");
      const equipmentInt = getEquipmentStatTotal(slot.equipment, "int");
      const equipmentGuts = getEquipmentStatTotal(slot.equipment, "guts");

      return {
        atk:
          sum.atk +
          calcTotalStat(
            slot.warrior.atk,
            slot.warrior.atk_growth,
            slot.warriorLevel,
            slot.bonusPoints.atk,
            intGutsMult,
            equipmentAtk,
            kokugakuBonus.atk
          ),
        int:
          sum.int +
          calcTotalStat(
            slot.warrior.int,
            slot.warrior.int_growth,
            slot.warriorLevel,
            slot.bonusPoints.int,
            intGutsMult,
            equipmentInt,
            kokugakuBonus.int
          ),
        guts:
          sum.guts +
          calcTotalStat(
            slot.warrior.guts,
            slot.warrior.guts_growth,
            slot.warriorLevel,
            slot.bonusPoints.guts,
            intGutsMult,
            equipmentGuts,
            kokugakuBonus.guts
          ),
      };
    },
    { atk: 0, int: 0, guts: 0 }
  );
  const displayedTotals = {
    atk: Math.floor(totals.atk),
    int: Math.floor(totals.int),
    guts: Math.floor(totals.guts),
  };
  const kokugakuSummary = (["atk", "int", "guts", "pol"] as const)
    .filter((stat) => kokugakuBonus[stat] > 0)
    .map((stat) => `${KOKUGAKU_STAT_LABELS[stat]}+${kokugakuBonus[stat]}`)
    .join(", ");
  const selectedFormation =
    savedFormations.find((formation) => formation.id === selectedFormationId) ??
    null;
  const nextEmptySlot = slots.find((slot) => slot.warrior === null) ?? null;

  const slotsWithWarrior = slots.filter((s) => s.warrior && s.role !== "軍師");
  const squadSpeed =
    weaponType && slotsWithWarrior.length > 0
      ? Math.round(
          slotsWithWarrior.reduce((total, slot) => {
            const speedMult = getAptitudeBonus(
              slot.warrior!.aptitudes,
              weaponType
            ).bonus.speedMult;
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
              equipment: createEmptyEquipment(),
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
              equipment: createEmptyEquipment(),
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

  const updateEquipmentStat = (
    slotIndex: number,
    equipmentKey: keyof Equipment,
    stat: keyof EquipmentSlot,
    value: number
  ) => {
    setSlots((current) =>
      current.map((slot) =>
        slot.index === slotIndex
          ? {
              ...slot,
              equipment: {
                ...slot.equipment,
                [equipmentKey]: {
                  ...slot.equipment[equipmentKey],
                  [stat]: value,
                },
              },
            }
          : slot
      )
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
        equipment: s.equipment,
      }));
  };

  const handleSave = () => {
    const slotData = buildSlotData();
    if (slotData.length === 0) return;

    const result = saveFormation(
      saveName || "無名の編成",
      slotData,
      displayedTotals,
      weaponType
    );
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
      displayedTotals,
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
          equipment: parseSavedEquipment(saved.equipment),
        };
      }
    }
    setSlots(newSlots);
    setWeaponType((formation.weapon_type as WeaponType) ?? null);
    setLoadConfirm(null);
  };

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={5} align="stretch" maxW="1200px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="xl" color="white">
              {pageTitle}
            </Heading>
            <Text fontSize="sm" color="gray.400">
              {pageSubtitle}
            </Text>
          </VStack>
        </Flex>

        <Box
          position={{ base: "static", lg: "sticky" }}
          top={{ lg: 3 }}
          zIndex={2}
          bg="linear-gradient(135deg, rgba(21,28,40,0.96), rgba(56,35,8,0.92))"
          borderRadius="2xl"
          p={{ base: 4, md: 5 }}
          borderWidth="1px"
          borderColor="yellow.800"
          boxShadow="0 12px 40px rgba(0,0,0,0.28)"
          backdropFilter="blur(12px)"
        >
          <VStack align="stretch" gap={4}>
            <SimpleGrid columns={{ base: 1, xl: 5 }} gap={3}>
              <Box
                gridColumn={{ base: "auto", xl: "span 2" }}
                bg="blackAlpha.400"
                borderRadius="xl"
                p={3}
                borderWidth="1px"
                borderColor="whiteAlpha.200"
              >
                <Text fontSize="xs" color="gray.400" mb={1}>
                  編成読込
                </Text>
                <Flex
                  gap={2}
                  align={{ base: "stretch", sm: "end" }}
                  direction={{ base: "column", sm: "row" }}
                >
                  <NativeSelect.Root size="sm" flex="1">
                    <NativeSelect.Field
                      value={selectedFormationId}
                      onChange={(e) => setSelectedFormationId(e.target.value)}
                      bg="gray.900"
                      borderColor="whiteAlpha.300"
                    >
                      <option value="">保存済み編成を選ぶ</option>
                      {savedFormations.map((formation) => (
                        <option key={formation.id} value={formation.id}>
                          {formation.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                  <Button
                    colorPalette="blue"
                    variant="outline"
                    onClick={() =>
                      selectedFormation && setLoadConfirm(selectedFormation)
                    }
                    disabled={!selectedFormation}
                  >
                    読み込む
                  </Button>
                </Flex>
                <Text fontSize="xs" color="gray.500" mt={2}>
                  {selectedFormation
                    ? `武${selectedFormation.total_score.atk} / 知${selectedFormation.total_score.int} / 胆${selectedFormation.total_score.guts}`
                    : savedFormations.length === 0 && "保存済み編成無し"}
                </Text>
              </Box>

              <SimpleGrid
                gridColumn={{ base: "auto", xl: "span 2" }}
                columns={{
                  base: squadSpeed !== null ? 2 : 3,
                  md: squadSpeed !== null ? 4 : 3,
                }}
                gap={3}
              >
                <Box
                  bg="whiteAlpha.100"
                  borderRadius="xl"
                  p={3}
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                >
                  <Text fontSize="xs" color="gray.400">
                    武力合計
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" textAlign="right">
                    {displayedTotals.atk}
                  </Text>
                </Box>
                <Box
                  bg="whiteAlpha.100"
                  borderRadius="xl"
                  p={3}
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                >
                  <Text fontSize="xs" color="gray.400">
                    知略合計
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" textAlign="right">
                    {displayedTotals.int}
                  </Text>
                </Box>
                <Box
                  bg="whiteAlpha.100"
                  borderRadius="xl"
                  p={3}
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                >
                  <Text fontSize="xs" color="gray.400">
                    胆力合計
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" textAlign="right">
                    {displayedTotals.guts}
                  </Text>
                </Box>
                {squadSpeed !== null && (
                  <Box
                    bg="whiteAlpha.100"
                    borderRadius="xl"
                    p={3}
                    borderWidth="1px"
                    borderColor="orange.700"
                  >
                    <Text fontSize="xs" color="gray.400">
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
            </SimpleGrid>

            <Flex
              align={{ base: "start", md: "center" }}
              justify="space-between"
              gap={3}
              wrap="wrap"
              bg="rgba(255,255,255,0.04)"
              borderRadius="xl"
              px={3}
              py={2}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
            >
              <Text fontSize="11px" color="yellow.200">
                国学補正:{" "}
                <Text as="span" color="gray.200">
                  {kokugakuSummary || "未設定"}
                </Text>
              </Text>
            </Flex>

            <Box
              gridColumn={{ base: "auto", xl: "span 1" }}
              bg="blackAlpha.400"
              borderRadius="xl"
              p={3}
              borderWidth="1px"
              borderColor="whiteAlpha.200"
            >
              <Text fontSize="xs" color="gray.400" mb={1}>
                現在の編成を保存
              </Text>
              {overflowConfirm ? (
                <VStack align="stretch" gap={2}>
                  <Text fontSize="xs" color="yellow.200">
                    保存上限です。最古の編成を上書きしますか？
                  </Text>
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
                </VStack>
              ) : saveMode ? (
                <VStack align="stretch" gap={2}>
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
                  <Flex gap={2}>
                    <Button
                      size="sm"
                      colorPalette="yellow"
                      onClick={handleSave}
                      flex="1"
                    >
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSaveMode(false);
                        setSaveName("");
                      }}
                    >
                      閉じる
                    </Button>
                  </Flex>
                </VStack>
              ) : (
                <VStack align="stretch" gap={2}>
                  <Button
                    colorPalette="yellow"
                    onClick={() => setSaveMode(true)}
                    disabled={!hasAssignedWarrior}
                  >
                    現在の編成を保存
                  </Button>
                  <Text fontSize="xs" color="gray.500">
                    {hasAssignedWarrior &&
                      `保存数 ${savedFormations.length}/10`}
                  </Text>
                </VStack>
              )}
            </Box>
          </VStack>
        </Box>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} alignItems="start">
          <VStack gap={4} align="stretch">
            <Box
              bg="whiteAlpha.100"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              p={{ base: 3, md: 4 }}
            >
              <Flex
                justify="space-between"
                align={{ base: "start", md: "center" }}
                flexWrap="wrap"
                gap={3}
              >
                <VStack align="start" gap={1}>
                  <Text
                    fontSize="xs"
                    color="yellow.300"
                    letterSpacing="0.08em"
                    textTransform="uppercase"
                  >
                    Formation Setup
                  </Text>
                  <Heading size="md">編成スロット</Heading>
                </VStack>
                <Flex
                  justify="space-between"
                  align={{ base: "start", lg: "center" }}
                  flexWrap="wrap"
                  gap={3}
                >
                  <Flex gap={2} wrap="wrap">
                    <Button
                      variant="outline"
                      onClick={clearAll}
                      disabled={!hasAssignedWarrior}
                    >
                      全解除
                    </Button>
                    <Button
                      variant="subtle"
                      disabled={!hasAssignedWarrior}
                      onClick={() => navigate("/share")}
                    >
                      共有する
                    </Button>
                  </Flex>
                </Flex>
              </Flex>

              <Box mt={3} mb={2}>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  兵種
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  {WEAPON_TYPES.map((wt) => (
                    <Button
                      key={wt}
                      size="xs"
                      variant={weaponType === wt ? "solid" : "outline"}
                      colorPalette={weaponType === wt ? "orange" : "gray"}
                      onClick={() =>
                        setWeaponType((prev) => (prev === wt ? null : wt))
                      }
                    >
                      {wt}
                    </Button>
                  ))}
                  {weaponType && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setWeaponType(null)}
                    >
                      解除
                    </Button>
                  )}
                </HStack>
              </Box>

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

              {!hasAssignedWarrior && (
                <Box
                  mt={4}
                  p={4}
                  bg="linear-gradient(135deg, rgba(236, 201, 75, 0.16), rgba(44, 29, 0, 0.5))"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderStyle="dashed"
                  borderColor="yellow.600"
                >
                  <Badge colorPalette="yellow" alignSelf="start" mb={2}>
                    HINT
                  </Badge>
                  <Text fontSize="sm" fontWeight="bold" color="yellow.200">
                    まず下の{warriorSectionTitle}から1人選び、
                    {nextEmptySlot?.roleLabel ?? "主将"}から編成を始める
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    配置後に
                    Lv・兵種・ボーナス・装備・スキルを順に整えると迷いにくい
                  </Text>
                </Box>
              )}

              <VStack gap={3} mt={4} align="stretch">
                {slots.map((slot) => (
                  <Collapsible.Root key={slot.index} defaultOpen>
                    <Box
                      textAlign="left"
                      bg={slot.warrior ? "blue.950" : "gray.900"}
                      borderRadius="xl"
                      borderWidth="1px"
                      borderColor={slot.warrior ? "blue.300" : "whiteAlpha.200"}
                      p={3}
                      transition="all 0.2s"
                    >
                      <Collapsible.Trigger asChild>
                        <chakra.button
                          type="button"
                          display="flex"
                          justifyContent="space-between"
                          w="100%"
                          alignItems="center"
                          cursor="pointer"
                          _hover={{ opacity: 0.8 }}
                          background="none"
                          border="none"
                          p={0}
                          color="inherit"
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
                              <VStack align="start" gap={0}>
                                <Text
                                  fontSize="sm"
                                  color="gray.300"
                                  fontWeight="bold"
                                >
                                  武将を選んでください
                                </Text>
                              </VStack>
                            )}
                          </Flex>
                          <Text fontSize="xs" color="gray.500">
                            ▼
                          </Text>
                        </chakra.button>
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
                                {weaponType &&
                                  slot.warrior &&
                                  (() => {
                                    const { aptitude, bonus } =
                                      getAptitudeBonus(
                                        slot.warrior.aptitudes,
                                        weaponType
                                      );
                                    return (
                                      <Badge
                                        colorPalette={
                                          aptitude === "極"
                                            ? "orange"
                                            : aptitude === "優"
                                            ? "yellow"
                                            : aptitude === "良"
                                            ? "green"
                                            : "gray"
                                        }
                                        variant="subtle"
                                        fontSize="xs"
                                      >
                                        {weaponType}
                                        {aptitude} (
                                        {bonus.statMult >= 1 ? "+" : ""}
                                        {Math.round((bonus.statMult - 1) * 100)}
                                        %)
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
                              {slot.role !== "軍師" && (
                                <Collapsible.Root>
                                  <Collapsible.Trigger asChild>
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      px={0}
                                      mt={2}
                                    >
                                      装備 ▼
                                    </Button>
                                  </Collapsible.Trigger>
                                  <Collapsible.Content>
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
                                      {EQUIPMENT_SLOTS.map((equipmentSlot) => (
                                        <Box
                                          key={equipmentSlot.key}
                                          pb={2}
                                          borderBottomWidth={
                                            equipmentSlot.key === "mount"
                                              ? "0"
                                              : "1px"
                                          }
                                          borderColor="whiteAlpha.200"
                                        >
                                          <HStack
                                            align="center"
                                            gap={2}
                                            wrap="wrap"
                                          >
                                            <Text
                                              fontSize="xs"
                                              color="gray.300"
                                              minW="4rem"
                                            >
                                              {equipmentSlot.label}
                                            </Text>
                                            {EQUIPMENT_STATS.map((stat) => (
                                              <HStack key={stat.key} gap={1}>
                                                <Text
                                                  fontSize="xs"
                                                  color="gray.400"
                                                >
                                                  {stat.label}
                                                </Text>
                                                <Input
                                                  type="number"
                                                  step={0.1}
                                                  size="xs"
                                                  w="52px"
                                                  value={
                                                    slot.equipment[
                                                      equipmentSlot.key
                                                    ][stat.key] === 0
                                                      ? ""
                                                      : slot.equipment[
                                                          equipmentSlot.key
                                                        ][stat.key]
                                                  }
                                                  onChange={(e) => {
                                                    const nextValue =
                                                      normalizeEquipmentInput(
                                                        e.target.value
                                                      );
                                                    updateEquipmentStat(
                                                      slot.index,
                                                      equipmentSlot.key,
                                                      stat.key,
                                                      nextValue
                                                    );
                                                  }}
                                                  bg="gray.900"
                                                  borderColor="whiteAlpha.300"
                                                />
                                              </HStack>
                                            ))}
                                          </HStack>
                                        </Box>
                                      ))}
                                    </VStack>
                                  </Collapsible.Content>
                                </Collapsible.Root>
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
                              {slot.role !== "軍師" &&
                                (() => {
                                  const slotStatMult =
                                    weaponType && slot.warrior
                                      ? getAptitudeBonus(
                                          slot.warrior.aptitudes,
                                          weaponType
                                        ).bonus.statMult
                                      : 1.0;
                                  const slotIntGutsMult =
                                    (slotStatMult - 1) * 0.5 + 1;
                                  const equipmentAtk = getEquipmentStatTotal(
                                    slot.equipment,
                                    "atk"
                                  );
                                  const equipmentInt = getEquipmentStatTotal(
                                    slot.equipment,
                                    "int"
                                  );
                                  const equipmentGuts = getEquipmentStatTotal(
                                    slot.equipment,
                                    "guts"
                                  );
                                  return (
                                    <VStack align="start" gap={0} mt={1}>
                                      <Text fontSize="xs" color="gray.400">
                                        武
                                        {Math.floor(
                                          calcTotalStat(
                                            slot.warrior.atk,
                                            slot.warrior.atk_growth,
                                            slot.warriorLevel,
                                            slot.bonusPoints.atk,
                                            slotIntGutsMult,
                                            equipmentAtk,
                                            kokugakuBonus.atk
                                          )
                                        )}
                                      </Text>
                                      <Text fontSize="xs" color="gray.400">
                                        知
                                        {Math.floor(
                                          calcTotalStat(
                                            slot.warrior.int,
                                            slot.warrior.int_growth,
                                            slot.warriorLevel,
                                            slot.bonusPoints.int,
                                            slotIntGutsMult,
                                            equipmentInt,
                                            kokugakuBonus.int
                                          )
                                        )}
                                      </Text>
                                      <Text fontSize="xs" color="gray.400">
                                        胆
                                        {Math.floor(
                                          calcTotalStat(
                                            slot.warrior.guts,
                                            slot.warrior.guts_growth,
                                            slot.warriorLevel,
                                            slot.bonusPoints.guts,
                                            slotIntGutsMult,
                                            equipmentGuts,
                                            kokugakuBonus.guts
                                          )
                                        )}
                                      </Text>
                                    </VStack>
                                  );
                                })()}
                            </>
                          ) : (
                            <Text fontSize="sm" color="gray.400" mt={1}>
                              下の一覧から武将を選んで、この枠へ配置されたし
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
            p={4}
          >
            <VStack align="stretch" gap={4}>
              <VStack align="start" gap={1}>
                <Text
                  fontSize="xs"
                  color="yellow.300"
                  letterSpacing="0.08em"
                  textTransform="uppercase"
                >
                  Warrior Select
                </Text>
                <Heading size="md">{warriorSectionTitle}</Heading>
                <Text fontSize="sm" color="gray.400">
                  空きスロットへ自動配置。配置済み武将は再選択不可。
                </Text>
              </VStack>

              {!isReady ? (
                <Box py={10} textAlign="center">
                  <Text color="gray.400">読み込み中...</Text>
                </Box>
              ) : selectableWarriors.length === 0 ? (
                <Box py={10} textAlign="center">
                  {emptyContent}
                </Box>
              ) : (
                <VStack
                  align="stretch"
                  gap={3}
                  maxH={{ base: "none", lg: "900px" }}
                  overflowY="auto"
                  pr={1}
                >
                  {selectableWarriors.map((warrior) => {
                    const isAssigned = assignedIds.has(warrior.id);
                    return (
                      <chakra.button
                        key={warrior.id}
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
                        w="100%"
                        border="1px solid"
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
                      </chakra.button>
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
