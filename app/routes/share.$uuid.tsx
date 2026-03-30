import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData, useParams } from "@remix-run/react";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { safeGetItem, safeJsonParse, safeSetItem } from "../lib/storage";
import { sharedProfiles, skills, warriors } from "../../server/db/schema";

type WarriorRow = {
  id: number;
  name: string;
  reading: string;
  rarity: number;
  cost: number;
  atk: number;
  int: number;
  guts: number;
  pol: number;
  era: string | null;
};

type SavedFormation = {
  id: string;
  name: string;
  slots: Array<{ warrior_id: number; role_label: string }>;
  total_score: { atk: number; int: number; guts: number };
  created_at: string;
};

type SkillDetail = {
  id: number;
  name: string;
  skill_type: string;
  color: string | null;
};

export const meta: MetaFunction = () => [
  { title: "共有プロフィール - 王の碁盤" },
  { name: "description", content: "共有された手持ち武将と編成の閲覧ページ" },
];

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { uuid } = params;
  const db = drizzle((context.cloudflare as any).env.DB);

  const [profile] = await db
    .select()
    .from(sharedProfiles)
    .where(eq(sharedProfiles.uuid, uuid!));

  if (!profile) throw new Response("Not Found", { status: 404 });

  const formations: SavedFormation[] = safeJsonParse(profile.formations, []);

  const rawWarriorIds: number[] = safeJsonParse(profile.warriorIds, []);

  // 出現回数を集計してユニークIDを取得
  const warriorCountMap: Record<number, number> = {};
  for (const id of rawWarriorIds) {
    warriorCountMap[id] = (warriorCountMap[id] ?? 0) + 1;
  }
  const uniqueWarriorIds = Object.keys(warriorCountMap).map(Number);

  // 保有武将のみ取得（ユニークIDでDB検索）
  const ownedWarriorRows: WarriorRow[] =
    uniqueWarriorIds.length > 0
      ? await db
          .select({
            id: warriors.id,
            name: warriors.name,
            reading: warriors.reading,
            rarity: warriors.rarity,
            cost: warriors.cost,
            atk: warriors.atk,
            int: warriors.int,
            guts: warriors.guts,
            pol: warriors.pol,
            era: warriors.era,
          })
          .from(warriors)
          .where(inArray(warriors.id, uniqueWarriorIds))
      : [];

  const skillIds: number[] = safeJsonParse(profile.skillIds, []);
  const sharedSkills: SkillDetail[] =
    skillIds.length > 0
      ? await db
          .select({
            id: skills.id,
            name: skills.name,
            skill_type: skills.skill_type,
            color: skills.color,
          })
          .from(skills)
          .where(inArray(skills.id, skillIds))
      : [];

  // Date formatting on server to avoid hydration mismatch (toLocaleString differs server vs client)
  const createdAtFormatted = (() => {
    const d = new Date(profile.createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(
      d.getUTCDate()
    )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  })();

  return {
    ownedWarriorRows,
    warriorCountMap,
    hasWarriorShare: !!profile.warriorIds,
    formations,
    sharedSkills,
    createdAtFormatted,
  };
}

function RarityStars({ rarity }: { rarity: number }) {
  const color =
    rarity >= 5 ? "yellow.400" : rarity >= 4 ? "purple.400" : "blue.400";
  return (
    <Text color={color} fontWeight="bold" fontSize="sm">
      {"★".repeat(rarity)}
    </Text>
  );
}

export default function ShareViewPage() {
  const { uuid } = useParams();
  const {
    ownedWarriorRows,
    warriorCountMap,
    hasWarriorShare,
    formations,
    sharedSkills,
    createdAtFormatted,
  } = useLoaderData<typeof loader>();

  const totalWarriorCount = Object.values(warriorCountMap).reduce(
    (a, b) => a + b,
    0
  );

  const handleCopyFormation = (formation: SavedFormation) => {
    try {
      const existing: SavedFormation[] = (() => {
        const raw = safeGetItem("saved_formations");
        if (!raw) return [];
        return JSON.parse(raw);
      })();

      if (existing.length >= 10) {
        alert("保存上限（10件）に達しています。不要な編成を削除してください。");
        return;
      }

      const newEntry: SavedFormation = {
        ...formation,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        name: `${formation.name}（コピー）`,
      };
      safeSetItem(
        "saved_formations",
        JSON.stringify([newEntry, ...existing])
      );
      alert(`「${formation.name}」を編成に取り込みました`);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  return (
    <Box minH="100vh" bg="gray.950" p={{ base: 3, md: 4 }}>
      <VStack gap={{ base: 4, md: 6 }} align="stretch" maxW="1100px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="xl" color="white">
              共有プロフィール
            </Heading>
            <Text fontSize="xs" color="gray.500">
              発行日時: {createdAtFormatted}
            </Text>
          </VStack>
          <Flex gap={3} align="center">
            <Link
              to={`/formation/shared/${uuid}`}
              style={{ textDecoration: "none" }}
            >
              <Button colorPalette="yellow" size="sm">
                この手持ちで編成する
              </Button>
            </Link>
            <Link to="/" style={{ color: "#A0AEC0", fontSize: "14px" }}>
              ← トップへ
            </Link>
          </Flex>
        </Flex>

        {/* 手持ち武将 */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="2xl"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          p={5}
        >
          <VStack align="stretch" gap={4}>
            <Heading size="md" color="yellow.300">
              {hasWarriorShare
                ? `手持ち武将 (${totalWarriorCount}体)`
                : "武将一覧"}
            </Heading>

            {ownedWarriorRows.length === 0 ? (
              <Text color="gray.400" fontSize="sm">
                武将データなし
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={3}>
                {ownedWarriorRows.map((warrior) => (
                  <Box
                    key={warrior.id}
                    bg="whiteAlpha.150"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="green.700"
                    p={3}
                  >
                    <VStack gap={1} align="start">
                      <RarityStars rarity={warrior.rarity} />
                      <Flex align="center" gap={1} wrap="wrap">
                        <Text fontWeight="bold" fontSize="sm" lineClamp={1}>
                          {warrior.name}
                        </Text>
                        {warriorCountMap[warrior.id] > 1 && (
                          <Badge colorPalette="orange" size="sm">
                            ×{warriorCountMap[warrior.id]}
                          </Badge>
                        )}
                      </Flex>
                      <Text fontSize="xs" color="gray.400">
                        {warrior.reading}
                      </Text>
                      {warrior.era && (
                        <Badge colorPalette="blue" size="sm">
                          {warrior.era}
                        </Badge>
                      )}
                      <Flex gap={2} wrap="wrap">
                        <Text fontSize="xs" color="gray.300">
                          武{warrior.atk}
                        </Text>
                        <Text fontSize="xs" color="gray.300">
                          知{warrior.int}
                        </Text>
                        <Text fontSize="xs" color="gray.300">
                          胆{warrior.guts}
                        </Text>
                      </Flex>
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </VStack>
        </Box>

        {/* 手持ちスキル */}
        {sharedSkills.length > 0 && (
          <Box
            bg="whiteAlpha.100"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            p={5}
          >
            <VStack align="stretch" gap={4}>
              <Heading size="md" color="yellow.300">
                手持ちスキル ({sharedSkills.length}個)
              </Heading>
              <Flex gap={2} flexWrap="wrap">
                {sharedSkills.map((skill) => (
                  <Box
                    key={skill.id}
                    bg="gray.900"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="whiteAlpha.200"
                    px={3}
                    py={2}
                  >
                    <Flex align="center" gap={2}>
                      <Text fontWeight="bold" fontSize="sm" color="white">
                        {skill.name}
                      </Text>
                      <Badge
                        colorPalette={
                          skill.skill_type === "パッシブ"
                            ? "green"
                            : skill.skill_type === "能動"
                            ? "blue"
                            : skill.skill_type === "連鎖"
                            ? "orange"
                            : "red"
                        }
                        size="sm"
                      >
                        {skill.skill_type}
                      </Badge>
                    </Flex>
                  </Box>
                ))}
              </Flex>
            </VStack>
          </Box>
        )}

        {/* 共有編成 */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="2xl"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          p={5}
        >
          <VStack align="stretch" gap={4}>
            <Heading size="md" color="yellow.300">
              共有編成 ({formations.length}個)
            </Heading>
            {formations.length === 0 ? (
              <Text color="gray.400" fontSize="sm">
                編成の共有なし
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {formations.map((formation) => (
                  <Box
                    key={formation.id}
                    bg="gray.900"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="whiteAlpha.200"
                    p={4}
                  >
                    <VStack align="stretch" gap={3}>
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold" color="white">
                          {formation.name}
                        </Text>
                        <Button
                          size="xs"
                          colorPalette="yellow"
                          variant="outline"
                          onClick={() => handleCopyFormation(formation)}
                        >
                          この編成をコピー
                        </Button>
                      </Flex>

                      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={2}>
                        {formation.slots.map((slot, i) => (
                          <Box
                            key={i}
                            bg="gray.800"
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor="whiteAlpha.200"
                            p={2}
                          >
                            <VStack gap={1} align="start">
                              <Badge colorPalette="blue" size="sm">
                                {slot.role_label}
                              </Badge>
                              <Text fontSize="xs" color="gray.300">
                                武将ID: {slot.warrior_id}
                              </Text>
                            </VStack>
                          </Box>
                        ))}
                      </SimpleGrid>

                      <Flex gap={3} wrap="wrap">
                        <Text fontSize="xs" color="gray.400">
                          武{formation.total_score.atk}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          知{formation.total_score.int}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          胆{formation.total_score.guts}
                        </Text>
                      </Flex>
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
