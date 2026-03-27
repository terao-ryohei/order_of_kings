import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
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

  return (
    <Box minH="100vh" bg={{ base: "gray.50", _dark: "gray.900" }} p={4}>
      <VStack gap={6} align="stretch" maxW="1200px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="xl" color={{ base: "gray.800", _dark: "white" }}>
              編成ビルダー
            </Heading>
            <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>
              主将・副将・軍師の3スロット編成を組み、合計能力を即時確認できるでござる
            </Text>
          </VStack>
          <HStack gap={4} wrap="wrap">
            <Link to="/my-warriors" style={{ color: "#3182ce", fontSize: "14px", fontWeight: 700 }}>
              手持ち武将管理へ
            </Link>
            <Link to="/" style={{ color: "#718096", fontSize: "14px" }}>
              ← 武将一覧へ戻る
            </Link>
          </HStack>
        </Flex>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} alignItems="start">
          <VStack gap={4} align="stretch">
            <Box
              bg={{ base: "white", _dark: "gray.800" }}
              borderRadius="2xl"
              borderWidth="1px"
              borderColor={{ base: "gray.200", _dark: "gray.700" }}
              p={5}
            >
              <Flex justify="space-between" align={{ base: "start", md: "center" }} flexWrap="wrap" gap={3}>
                <VStack align="start" gap={1}>
                  <Heading size="md">編成スロット</Heading>
                  <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>
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
                  <Button variant="subtle" disabled>
                    共有する
                  </Button>
                </Flex>
              </Flex>

              <SimpleGrid columns={3} gap={3} mt={5}>
                {slots.map((slot) => (
                  <Box
                    key={slot.index}
                    as="button"
                    type="button"
                    onClick={() => clearSlot(slot.index)}
                    textAlign="left"
                    bg={slot.warrior ? { base: "blue.50", _dark: "blue.950" } : { base: "gray.50", _dark: "gray.900" }}
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor={slot.warrior ? "blue.300" : { base: "gray.200", _dark: "gray.700" }}
                    p={4}
                    _hover={{ borderColor: "blue.400", transform: "translateY(-1px)" }}
                    transition="all 0.2s"
                  >
                    <VStack align="start" gap={1}>
                      <Badge colorPalette={slot.warrior ? "blue" : "gray"}>{slot.roleLabel}</Badge>
                      <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>
                        {slot.description}
                      </Text>
                      {slot.warrior ? (
                        <>
                          <Text fontWeight="bold" fontSize="sm">{slot.warrior.name}</Text>
                          <RarityStars rarity={slot.warrior.rarity} />
                          <Text fontSize="xs" color={{ base: "gray.600", _dark: "gray.300" }}>
                            兵種: {slot.warrior.aptitudes.length > 0 ? slot.warrior.aptitudes.join(" / ") : "未登録"}
                          </Text>
                          {slot.role !== "軍師" && (
                            <VStack align="start" gap={0} mt={1}>
                              <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>武{slot.warrior.atk}</Text>
                              <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>知{slot.warrior.int}</Text>
                              <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>胆{slot.warrior.guts}</Text>
                            </VStack>
                          )}
                        </>
                      ) : (
                        <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }} mt={1}>
                          武将を選ぶとここに配置される
                        </Text>
                      )}
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="xl" p={4} borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }}>
                <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }}>武力合計</Text>
                <Text fontSize="2xl" fontWeight="bold">{totals.atk}</Text>
                <Text fontSize="xs" color={{ base: "gray.400", _dark: "gray.500" }}>主将+副将</Text>
              </Box>
              <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="xl" p={4} borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }}>
                <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }}>知略合計</Text>
                <Text fontSize="2xl" fontWeight="bold">{totals.int}</Text>
                <Text fontSize="xs" color={{ base: "gray.400", _dark: "gray.500" }}>主将+副将</Text>
              </Box>
              <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="xl" p={4} borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }}>
                <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }}>胆力合計</Text>
                <Text fontSize="2xl" fontWeight="bold">{totals.guts}</Text>
                <Text fontSize="xs" color={{ base: "gray.400", _dark: "gray.500" }}>主将+副将</Text>
              </Box>
            </SimpleGrid>
          </VStack>

          <Box
            bg={{ base: "white", _dark: "gray.800" }}
            borderRadius="2xl"
            borderWidth="1px"
            borderColor={{ base: "gray.200", _dark: "gray.700" }}
            p={5}
          >
            <VStack align="stretch" gap={4}>
              <VStack align="start" gap={1}>
                <Heading size="md">手持ち武将</Heading>
                <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }}>
                  空きスロットへ自動配置。配置済み武将は再選択不可。
                </Text>
              </VStack>

              {!isHydrated ? (
                <Box py={10} textAlign="center">
                  <Text color={{ base: "gray.500", _dark: "gray.400" }}>手持ち武将を読み込み中...</Text>
                </Box>
              ) : myWarriors.length === 0 ? (
                <Box py={10} textAlign="center">
                  <Text fontWeight="bold" mb={3}>
                    まず手持ち武将を登録してください
                  </Text>
                  <Link to="/my-warriors" style={{ color: "#3182ce", fontWeight: 700 }}>
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
                        bg={isAssigned ? { base: "gray.100", _dark: "gray.700" } : { base: "gray.50", _dark: "gray.900" }}
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor={isAssigned ? { base: "gray.200", _dark: "gray.600" } : { base: "gray.200", _dark: "gray.700" }}
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
                            <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }}>
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
                            <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>武{warrior.atk}</Text>
                            <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>知{warrior.int}</Text>
                            <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>胆{warrior.guts}</Text>
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
