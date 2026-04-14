import { useMemo } from "react";
import { useLoaderData, Link as RemixLink, useFetcher } from "@remix-run/react";
import {
  Box,
  Heading,
  Text,
  Button,
  Badge,
  Flex,
  HStack,
  VStack,
} from "@chakra-ui/react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  formations,
  skills,
  tierRankings,
  warriors,
} from "../../server/db/schema";
import {
  TIER_RANKS,
  RANK_COLORS,
  type FormationWithRanking,
  type TierGenre,
  type TierRank,
  type TierWarriorSlot,
} from "../lib/tier-types";

export const meta: MetaFunction = () => [
  { title: "ティア表 - 王の碁盤" },
  { name: "description", content: "編成ランク表" },
];

type WarriorData = { id: number; name: string; rarity: number };

export async function loader({ context }: LoaderFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);

  const warriorRows = await db
    .select()
    .from(warriors)
    .where(eq(warriors.is_delete, false))
    .orderBy(asc(warriors.sort_order));

  const allSkills = await db
    .select({ id: skills.id, name: skills.name })
    .from(skills)
    .where(eq(skills.is_delete, false));

  const rows = await db
    .select({
      id: formations.id,
      genres: formations.genres,
      slots: formations.slots,
      description: formations.description,
      createdAt: formations.createdAt,
      updatedAt: formations.updatedAt,
      rankingId: tierRankings.id,
      rank: tierRankings.rank,
      note: tierRankings.note,
      sortOrder: tierRankings.sortOrder,
    })
    .from(formations)
    .leftJoin(tierRankings, eq(tierRankings.formationId, formations.id));

  const entries: FormationWithRanking[] = rows.map((row) => ({
    id: row.id,
    name: null,
    ranking: row.rankingId
      ? {
          id: row.rankingId,
          formationId: row.id,
          rank: row.rank as TierRank,
          note: row.note,
          sortOrder: row.sortOrder ?? 0,
        }
      : undefined,
    genres: JSON.parse(row.genres) as TierGenre[],
    slots: JSON.parse(row.slots) as [
      TierWarriorSlot,
      TierWarriorSlot,
      TierWarriorSlot,
    ],
    description: row.description,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }));

  return {
    warriors: warriorRows.map((w) => ({ id: w.id, name: w.name, rarity: w.rarity })),
    allSkills,
    entries,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const formationId = formData.get("formation_id") as string;

  if (intent === "upsert" && formationId) {
    const rank = formData.get("rank") as string;
    if (!rank) return null;
    await db
      .insert(tierRankings)
      .values({ formationId, rank, sortOrder: 0 })
      .onConflictDoUpdate({
        target: tierRankings.formationId,
        set: { rank, updatedAt: sql`CURRENT_TIMESTAMP` },
      });
  } else if (intent === "delete_rank" && formationId) {
    await db.delete(tierRankings).where(eq(tierRankings.formationId, formationId));
  }

  return null;
}

// ── Inline card component ────────────────────────────────────────────
function FormationCard({
  entry,
  warriorMap,
}: {
  entry: FormationWithRanking;
  warriorMap: Map<number, WarriorData>;
}) {
  const fetcher = useFetcher();

  const isPending = fetcher.state !== "idle";
  const optimisticRank =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "upsert"
      ? (fetcher.formData.get("rank") as TierRank)
      : null;
  const isDeleting =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "delete_rank";

  const displayRank = isDeleting ? undefined : (optimisticRank ?? entry.ranking?.rank);
  const hasRank = !!displayRank;
  const rankColors = displayRank ? RANK_COLORS[displayRank] : null;

  return (
    <Box
      bg="gray.900"
      borderWidth="1px"
      borderColor={rankColors ? rankColors.bg : "whiteAlpha.200"}
      borderRadius="lg"
      p={3}
      mb={3}
    >
      {/* Header: rank badge + genres */}
      <Flex justify="space-between" align="center" mb={2}>
        <HStack gap={1} flexWrap="wrap">
          {hasRank && rankColors ? (
            <Badge
              bg={rankColors.bg}
              color={rankColors.badge}
              fontSize="md"
              fontWeight="bold"
              px={2}
              py={0.5}
              borderRadius="md"
            >
              {displayRank}
            </Badge>
          ) : (
            <Badge bg="gray.700" color="gray.400" fontSize="xs" px={2} borderRadius="md">
              未評価
            </Badge>
          )}
          {entry.genres.map((g) => (
            <Badge key={g} variant="outline" colorPalette="blue" fontSize="xs">
              {g}
            </Badge>
          ))}
        </HStack>
        {hasRank && (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="delete_rank" />
            <input type="hidden" name="formation_id" value={entry.id} />
            <Button
              type="submit"
              size="xs"
              variant="ghost"
              colorPalette="red"
              disabled={isPending}
              onClick={(e) => e.stopPropagation()}
            >
              ×
            </Button>
          </fetcher.Form>
        )}
      </Flex>

      {/* Warriors (compact) */}
      <VStack align="stretch" gap={1} mb={3}>
        {entry.slots.map((slot) => {
          const w = warriorMap.get(slot.warrior_id);
          return (
            <Text key={slot.role} fontSize="xs" color="gray.300">
              {slot.role}: {w ? w.name : "未設定"}
            </Text>
          );
        })}
      </VStack>

      {/* Rank assign form */}
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="upsert" />
        <input type="hidden" name="formation_id" value={entry.id} />
        <Flex gap={2} align="center">
          <select
            name="rank"
            defaultValue=""
            style={{
              flex: 1,
              background: "#1a202c",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "0.875rem",
            }}
          >
            <option value="" disabled>
              ランク選択
            </option>
            {TIER_RANKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            size="xs"
            colorPalette="blue"
            disabled={isPending}
          >
            割当
          </Button>
        </Flex>
      </fetcher.Form>
    </Box>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function TierBoardPage() {
  const { warriors: allWarriors, entries } = useLoaderData<typeof loader>();

  const warriorMap = useMemo(() => {
    const map = new Map<number, WarriorData>();
    for (const w of allWarriors) map.set(w.id, w);
    return map;
  }, [allWarriors]);

  const columns = useMemo(() => {
    const ranked: Record<TierRank, FormationWithRanking[]> = {
      S: [], A: [], B: [], C: [], D: [],
    };
    const stock: FormationWithRanking[] = [];
    for (const e of entries) {
      if (e.ranking?.rank) {
        ranked[e.ranking.rank].push(e);
      } else {
        stock.push(e);
      }
    }
    return { ranked, stock };
  }, [entries]);

  const allRanks: TierRank[] = ["S", "A", "B", "C", "D"];

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1400px" mx="auto">
      {/* Header */}
      <Box mb={6} display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="lg">ティア表</Heading>
        <Button asChild colorPalette="gray" size="sm" variant="outline">
          <RemixLink to="/formations">← 編成一覧</RemixLink>
        </Button>
      </Box>

      {/* Rank columns */}
      <Box overflowX="auto">
        <Flex gap={4} minW="900px" align="flex-start">
          {allRanks.map((rank) => {
            const color = RANK_COLORS[rank];
            return (
              <Box key={rank} flex="1" minW="160px">
                {/* Column header */}
                <Box
                  bg={color.bg}
                  borderRadius="md"
                  px={3}
                  py={1}
                  mb={3}
                  textAlign="center"
                >
                  <Text fontWeight="bold" fontSize="lg" color={color.badge}>
                    {rank}
                  </Text>
                </Box>

                {columns.ranked[rank].length === 0 ? (
                  <Box
                    borderWidth="1px"
                    borderColor="whiteAlpha.100"
                    borderRadius="md"
                    borderStyle="dashed"
                    p={4}
                    textAlign="center"
                  >
                    <Text fontSize="xs" color="gray.600">
                      なし
                    </Text>
                  </Box>
                ) : (
                  columns.ranked[rank].map((entry) => (
                    <FormationCard
                      key={entry.id}
                      entry={entry}
                      warriorMap={warriorMap}
                    />
                  ))
                )}
              </Box>
            );
          })}

          {/* Stock column */}
          <Box flex="1" minW="160px">
            <Box
              bg="gray.700"
              borderRadius="md"
              px={3}
              py={1}
              mb={3}
              textAlign="center"
            >
              <Text fontWeight="bold" fontSize="lg" color="gray.300">
                ストック
              </Text>
            </Box>

            {columns.stock.length === 0 ? (
              <Box
                borderWidth="1px"
                borderColor="whiteAlpha.100"
                borderRadius="md"
                borderStyle="dashed"
                p={4}
                textAlign="center"
              >
                <Text fontSize="xs" color="gray.600">
                  なし
                </Text>
              </Box>
            ) : (
              columns.stock.map((entry) => (
                <FormationCard
                  key={entry.id}
                  entry={entry}
                  warriorMap={warriorMap}
                />
              ))
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}
