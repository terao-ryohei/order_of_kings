import {
  Badge,
  Box,
  Button,
  Collapsible,
  Flex,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useState } from "react";
import { useMyWarriors } from "../hooks/useMyWarriors";
import { useSavedFormations } from "../hooks/useSavedFormations";
import type { SavedFormation } from "../hooks/useSavedFormations";
import { warriors, weaponAptitudes } from "../../server/db/schema";

const SQUAD_SLOTS = [
  { role: "主将" as const, label: "主将", description: "怒気スキル発動・部隊の核" },
  { role: "副将" as const, label: "副将", description: "ステータス加算・サブアタッカー" },
  { role: "軍師" as const, label: "軍師", description: "スキル効果のみ（ステータス加算なし）" },
];

type WarriorData = {
  id: number;
  name: string;
  reading: string;
  rarity: number;
  atk: number;
  int: number;
  guts: number;
  era: string | null;
  aptitudes: string[];
};

interface FormationSlot {
  index: number;
  role: "主将" | "副将" | "軍師";
  roleLabel: string;
  description: string;
  warrior: WarriorData | null;
}

export const meta: MetaFunction = () => [
  { title: "編成ビルダー - 王の勅命" },
  { name: "description", content: "手持ち武将から3枠編成（主将/副将/軍師）を組むページ" },
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

  return {
    warriors: warriorRows.map((warrior) => ({
      id: warrior.id,
      name: warrior.name,
      reading: warrior.reading,
      rarity: warrior.rarity,
      atk: warrior.atk,
      int: warrior.int,
      guts: warrior.guts,
      era: warrior.era,
      aptitudes: aptitudeMap.get(warrior.id) ?? [],
    })),
  };
}

function RarityStars({ rarity }: { rarity: number }) {
  const color = rarity >= 5 ? "orange.400" : rarity >= 4 ? "purple.400" : "blue.400";
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
  }));
}

export default function FormationBuilderPage() {
  const { warriors: allWarriors } = useLoaderData<typeof loader>();
  const { myWarriorIds, isHydrated } = useMyWarriors();
  const [slots, setSlots] = useState<FormationSlot[]>(() => createEmptySlots());

  const {
    savedFormations,
    isFull,
    saveFormation,
    saveFormationForce,
    deleteFormation,
  } = useSavedFormations();

  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [overflowConfirm, setOverflowConfirm] = useState<string | null>(null);
  const [loadConfirm, setLoadConfirm] = useState<SavedFormation | null>(null);

  const myWarriors = allWarriors.filter((warrior) => myWarriorIds.includes(warrior.id));
  const assignedIds = new Set(
    slots.map((slot) => slot.warrior?.id).filter((id): id is number => typeof id === "number"),
  );

  // 軍師はステータス合計から除外
  const totals = slots.reduce(
    (sum, slot) => {
      if (!slot.warrior || slot.role === "軍師") {
        return sum;
      }

      return {
        atk: sum.atk + slot.warrior.atk,
        int: sum.int + slot.warrior.int,
        guts: sum.guts + slot.warrior.guts,
      };
    },
    { atk: 0, int: 0, guts: 0 },
  );

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
        index === emptyIndex ? { ...slot, warrior } : slot,
      );
    });
  };

  const clearSlot = (slotIndex: number) => {
    setSlots((current) =>
      current.map((slot) =>
        slot.index === slotIndex ? { ...slot, warrior: null } : slot,
      ),
    );
  };

  const clearAll = () => {
    setSlots(createEmptySlots());
  };

  const handleSave = () => {
    const filledSlots = slots.filter((s) => s.warrior !== null);
    if (filledSlots.length === 0) return;

    const slotData = filledSlots.map((s) => ({
      warrior_id: s.warrior!.id,
      role_label: s.roleLabel,
    }));

    const result = saveFormation(saveName || "無名の編成", slotData, totals);
    if (!result.ok && result.overflowId) {
      setOverflowConfirm(result.overflowId);
      return;
    }
    setSaveMode(false);
    setSaveName("");
  };

  const handleSaveForce = () => {
    if (!overflowConfirm) return;
    const filledSlots = slots.filter((s) => s.warrior !== null);
    const slotData = filledSlots.map((s) => ({
      warrior_id: s.warrior!.id,
      role_label: s.roleLabel,
    }));
    saveFormationForce(saveName || "無名の編成", slotData, totals, overflowConfirm);
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
        (s) => s.roleLabel === saved.role_label && s.warrior === null,
      );
      if (slotIdx !== -1) {
        newSlots[slotIdx] = { ...newSlots[slotIdx], warrior };
      }
    }
    setSlots(newSlots);
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
            <Link to="/my-warriors" style={{ color: "#ECC94B", fontSize: "14px", fontWeight: 700 }}>
              手持ち武将管理へ
            </Link>
            <Link to="/" style={{ color: "#A0AEC0", fontSize: "14px" }}>
              ← 武将一覧へ戻る
            </Link>
          </HStack>
        </Flex>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} alignItems="start">
          <VStack gap={4} align="stretch">
            <Box
              bg="whiteAlpha.100"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              p={5}
            >
              <Flex justify="space-between" align={{ base: "start", md: "center" }} flexWrap="wrap" gap={3}>
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
                  <Link to="/formation/consult">
                    <Button colorPalette="blue">おまかせ相談</Button>
                  </Link>
                  <Button
                    colorPalette="yellow"
                    variant="outline"
                    onClick={() => setSaveMode(!saveMode)}
                    disabled={!slots.some((s) => s.warrior)}
                  >
                    {saveMode ? "キャンセル" : "保存"}
                  </Button>
                  <Button variant="subtle" disabled>
                    共有する
                  </Button>
                </Flex>
              </Flex>

              {saveMode && (
                <Box mt={4} p={4} bg="yellow.950" borderRadius="xl" borderWidth="1px" borderColor="yellow.700">
                  {overflowConfirm ? (
                    <VStack align="stretch" gap={3}>
                      <Text fontSize="sm" color="yellow.200">
                        保存上限（10件）に達しています。最も古い保存を削除して保存しますか？
                      </Text>
                      <Flex gap={2}>
                        <Button size="sm" colorPalette="yellow" onClick={handleSaveForce}>
                          削除して保存
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setOverflowConfirm(null)}>
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
                        <Button size="sm" colorPalette="yellow" onClick={handleSave}>
                          保存
                        </Button>
                      </Flex>
                    </VStack>
                  )}
                </Box>
              )}

              {loadConfirm && (
                <Box mt={4} p={4} bg="blue.950" borderRadius="xl" borderWidth="1px" borderColor="blue.700">
                  <VStack align="stretch" gap={3}>
                    <Text fontSize="sm" color="blue.200">
                      「{loadConfirm.name}」を読み込みますか？現在の編成は上書きされます。
                    </Text>
                    <Flex gap={2}>
                      <Button size="sm" colorPalette="blue" onClick={() => handleLoad(loadConfirm)}>
                        読み込む
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setLoadConfirm(null)}>
                        やめる
                      </Button>
                    </Flex>
                  </VStack>
                </Box>
              )}

              <SimpleGrid columns={3} gap={3} mt={5}>
                {slots.map((slot) => (
                  <Box
                    key={slot.index}
                    as="button"
                    type="button"
                    onClick={() => clearSlot(slot.index)}
                    textAlign="left"
                    bg={slot.warrior ? "blue.950" : "gray.900"}
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor={slot.warrior ? "blue.300" : "whiteAlpha.200"}
                    p={4}
                    _hover={{ borderColor: "blue.400", transform: "translateY(-1px)" }}
                    transition="all 0.2s"
                  >
                    <VStack align="start" gap={1}>
                      <Badge colorPalette={slot.warrior ? "blue" : "gray"}>{slot.roleLabel}</Badge>
                      <Text fontSize="xs" color="gray.400">
                        {slot.description}
                      </Text>
                      {slot.warrior ? (
                        <>
                          <Text fontWeight="bold" fontSize="sm">{slot.warrior.name}</Text>
                          <RarityStars rarity={slot.warrior.rarity} />
                          <Text fontSize="xs" color="gray.300">
                            兵種: {slot.warrior.aptitudes.length > 0 ? slot.warrior.aptitudes.join(" / ") : "未登録"}
                          </Text>
                          {slot.role !== "軍師" && (
                            <VStack align="start" gap={0} mt={1}>
                              <Text fontSize="xs" color="gray.400">武{slot.warrior.atk}</Text>
                              <Text fontSize="xs" color="gray.400">知{slot.warrior.int}</Text>
                              <Text fontSize="xs" color="gray.400">胆{slot.warrior.guts}</Text>
                            </VStack>
                          )}
                        </>
                      ) : (
                        <Text fontSize="sm" color="gray.400" mt={1}>
                          武将を選ぶとここに配置される
                        </Text>
                      )}
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <Box bg="whiteAlpha.100" borderRadius="xl" p={4} borderWidth="1px" borderColor="whiteAlpha.200">
                <Text fontSize="sm" color="gray.400">武力合計</Text>
                <Text fontSize="2xl" fontWeight="bold">{totals.atk}</Text>
                <Text fontSize="xs" color="gray.500">主将+副将</Text>
              </Box>
              <Box bg="whiteAlpha.100" borderRadius="xl" p={4} borderWidth="1px" borderColor="whiteAlpha.200">
                <Text fontSize="sm" color="gray.400">知略合計</Text>
                <Text fontSize="2xl" fontWeight="bold">{totals.int}</Text>
                <Text fontSize="xs" color="gray.500">主将+副将</Text>
              </Box>
              <Box bg="whiteAlpha.100" borderRadius="xl" p={4} borderWidth="1px" borderColor="whiteAlpha.200">
                <Text fontSize="sm" color="gray.400">胆力合計</Text>
                <Text fontSize="2xl" fontWeight="bold">{totals.guts}</Text>
                <Text fontSize="xs" color="gray.500">主将+副将</Text>
              </Box>
            </SimpleGrid>

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
                    <Button variant="ghost" w="100%" justifyContent="space-between" px={0}>
                      <Heading size="md">保存済み編成（{savedFormations.length}件）</Heading>
                      <Text fontSize="sm" color="gray.400">▼ 開く</Text>
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
                              <Text fontWeight="bold" fontSize="sm">{f.name}</Text>
                              <Text fontSize="xs" color="gray.400">
                                {new Date(f.created_at).toLocaleDateString("ja-JP")} ・ 武{f.total_score.atk} 知{f.total_score.int} 胆{f.total_score.guts}
                              </Text>
                              <Flex gap={1} wrap="wrap">
                                {f.slots.map((s, i) => (
                                  <Badge key={i} colorPalette="blue" variant="outline" fontSize="xs">
                                    {s.role_label}: {allWarriors.find((w) => w.id === s.warrior_id)?.name ?? "不明"}
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
                  <Link to="/my-warriors" style={{ color: "#ECC94B", fontWeight: 700 }}>
                    /my-warriors へ移動
                  </Link>
                </Box>
              ) : (
                <VStack align="stretch" gap={3} maxH={{ base: "none", lg: "900px" }} overflowY="auto" pr={1}>
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
                        _hover={isAssigned ? undefined : { borderColor: "blue.400", transform: "translateY(-1px)" }}
                        transition="all 0.2s"
                      >
                        <Flex justify="space-between" align="start" gap={3}>
                          <VStack align="start" gap={1} flex="1">
                            <Flex gap={2} wrap="wrap" align="center">
                              <Text fontWeight="bold">{warrior.name}</Text>
                              <RarityStars rarity={warrior.rarity} />
                              <Badge colorPalette={isAssigned ? "gray" : "green"} variant="outline">
                                {isAssigned ? "配置済み" : "配置可能"}
                              </Badge>
                            </Flex>
                            <Text fontSize="sm" color="gray.400">
                              {warrior.reading}
                            </Text>
                            <Flex gap={2} wrap="wrap">
                              {warrior.era && <Badge colorPalette="blue">{warrior.era}</Badge>}
                              <Badge colorPalette="purple" variant="subtle">
                                {warrior.aptitudes.length > 0 ? warrior.aptitudes.join(" / ") : "適性未登録"}
                              </Badge>
                            </Flex>
                          </VStack>
                          <VStack align="end" gap={1}>
                            <Text fontSize="xs" color="gray.400">武{warrior.atk}</Text>
                            <Text fontSize="xs" color="gray.400">知{warrior.int}</Text>
                            <Text fontSize="xs" color="gray.400">胆{warrior.guts}</Text>
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
