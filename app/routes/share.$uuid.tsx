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
import { Link, useLoaderData } from "@remix-run/react";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { sharedProfiles, warriors } from "../../server/db/schema";

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

export const meta: MetaFunction = () => [
  { title: "共有プロフィール - 王の勅命" },
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

  const formations: SavedFormation[] = profile.formations
    ? JSON.parse(profile.formations)
    : [];

  const warriorIds: number[] | null = profile.warriorIds
    ? JSON.parse(profile.warriorIds)
    : null;

  let warriorRows: WarriorRow[] = [];
  if (warriorIds && warriorIds.length > 0) {
    warriorRows = await db
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
      .where(inArray(warriors.id, warriorIds));
  }

  return { warriorRows, formations, createdAt: profile.createdAt };
}

function RarityStars({ rarity }: { rarity: number }) {
  const color = rarity >= 5 ? "yellow.400" : rarity >= 4 ? "purple.400" : "blue.400";
  return (
    <Text color={color} fontWeight="bold" fontSize="sm">
      {"★".repeat(rarity)}
    </Text>
  );
}

export default function ShareViewPage() {
  const { warriorRows, formations, createdAt } = useLoaderData<typeof loader>();

  const handleCopyFormation = (formation: SavedFormation) => {
    try {
      const existing: SavedFormation[] = (() => {
        const raw = localStorage.getItem("saved_formations");
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
      localStorage.setItem("saved_formations", JSON.stringify([newEntry, ...existing]));
      alert(`「${formation.name}」を編成に取り込みました`);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch" maxW="1100px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="xl" color="white">
              共有プロフィール
            </Heading>
            <Text fontSize="xs" color="gray.500">
              発行日時: {new Date(createdAt).toLocaleString("ja-JP")}
            </Text>
          </VStack>
          <Link to="/" style={{ color: "#A0AEC0", fontSize: "14px" }}>
            ← トップへ
          </Link>
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
              手持ち武将 ({warriorRows.length}種)
            </Heading>
            {warriorRows.length === 0 ? (
              <Text color="gray.400" fontSize="sm">
                手持ち武将の共有なし
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={3}>
                {warriorRows.map((warrior) => (
                  <Box
                    key={warrior.id}
                    bg="whiteAlpha.100"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="whiteAlpha.200"
                    p={3}
                  >
                    <VStack gap={1} align="start">
                      <RarityStars rarity={warrior.rarity} />
                      <Text fontWeight="bold" fontSize="sm" lineClamp={1}>
                        {warrior.name}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {warrior.reading}
                      </Text>
                      {warrior.era && (
                        <Badge colorPalette="blue" size="sm">
                          {warrior.era}
                        </Badge>
                      )}
                      <Flex gap={2} wrap="wrap">
                        <Text fontSize="xs" color="gray.300">武{warrior.atk}</Text>
                        <Text fontSize="xs" color="gray.300">知{warrior.int}</Text>
                        <Text fontSize="xs" color="gray.300">胆{warrior.guts}</Text>
                      </Flex>
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </VStack>
        </Box>

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

                      <SimpleGrid columns={3} gap={2}>
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
