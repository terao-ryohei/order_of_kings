import { useState, useMemo } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
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
import { asc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  formations,
  skills,
  tierRankings,
  warriors,
  warriorSkills,
} from "../../server/db/schema";
import { TierEntryForm } from "../components/tier/TierEntryForm";
import {
  TIER_RANKS,
  RANK_COLORS,
  type Formation,
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

  const allSkillRows = await db
    .select({
      id: skills.id,
      name: skills.name,
      skill_type: skills.skill_type,
      color: skills.color,
      description: skills.description,
    })
    .from(skills)
    .where(gte(skills.id, 1001))
    .orderBy(asc(skills.sort_order));

  const uniqueSkillRows = await db
    .select({
      warrior_id: warriorSkills.warrior_id,
      skill_id: warriorSkills.skill_id,
      skill_name: skills.name,
      slot: warriorSkills.slot,
    })
    .from(warriorSkills)
    .innerJoin(skills, eq(warriorSkills.skill_id, skills.id))
    .where(eq(warriorSkills.is_unique, true));

  const uniqueSkillMap = new Map<number, { skillId: number; skillName: string }>();
  const gunshiSkillMap = new Map<number, { skillId: number; skillName: string }>();
  for (const r of uniqueSkillRows) {
    if (r.slot === 1) {
      uniqueSkillMap.set(r.warrior_id, { skillId: r.skill_id, skillName: r.skill_name });
    } else if (r.slot === 2) {
      gunshiSkillMap.set(r.warrior_id, { skillId: r.skill_id, skillName: r.skill_name });
    }
  }

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
    warriors: warriorRows.map((w) => ({
      id: w.id,
      name: w.name,
      cost: w.cost,
      rarity: w.rarity,
      uniqueSkillName: uniqueSkillMap.get(w.id)?.skillName ?? null,
      uniqueSkillId: uniqueSkillMap.get(w.id)?.skillId ?? null,
      gunshiSkillName: gunshiSkillMap.get(w.id)?.skillName ?? null,
      gunshiSkillId: gunshiSkillMap.get(w.id)?.skillId ?? null,
    })),
    allSkills: allSkillRows,
    entries,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const formationId = formData.get("formation_id") as string;
  const id = formData.get("id") as string;

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
  } else if (intent === "delete" && id) {
    await db.delete(tierRankings).where(eq(tierRankings.formationId, id));
    await db.delete(formations).where(eq(formations.id, id));
  } else if (intent === "create") {
    const entry = JSON.parse(formData.get("entry") as string) as Omit<
      Formation,
      "id" | "created_at" | "updated_at"
    >;
    const newId = crypto.randomUUID();
    await db.insert(formations).values({
      id: newId,
      genres: JSON.stringify(entry.genres),
      slots: JSON.stringify(entry.slots),
      description: entry.description,
    });
  } else if (intent === "update" && id) {
    const entry = JSON.parse(formData.get("entry") as string) as Omit<
      Formation,
      "id" | "created_at" | "updated_at"
    >;
    await db
      .update(formations)
      .set({
        genres: JSON.stringify(entry.genres),
        slots: JSON.stringify(entry.slots),
        description: entry.description,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(formations.id, id));
  }

  return null;
}

// ── Inline card component ────────────────────────────────────────────
function FormationCard({
  entry,
  warriorMap,
  onEdit,
}: {
  entry: FormationWithRanking;
  warriorMap: Map<number, WarriorData>;
  onEdit: (id: string) => void;
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
      {/* Header: rank badge + genres + edit button */}
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
        <HStack gap={1}>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="yellow"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry.id);
            }}
          >
            編集
          </Button>
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
        </HStack>
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
  const { warriors: allWarriors, allSkills, entries } = useLoaderData<typeof loader>();
  const saveFetcher = useFetcher();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const warriorMap = useMemo(() => {
    const map = new Map<number, WarriorData>();
    for (const w of allWarriors) map.set(w.id, { id: w.id, name: w.name, rarity: w.rarity });
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

  const handleCreate = (entry: Omit<Formation, "id" | "created_at" | "updated_at">) => {
    saveFetcher.submit(
      { intent: "create", entry: JSON.stringify(entry) },
      { method: "post" },
    );
    setShowCreateForm(false);
  };

  const handleUpdate =
    (id: string) =>
    (entry: Omit<Formation, "id" | "created_at" | "updated_at">) => {
      saveFetcher.submit(
        { intent: "update", id, entry: JSON.stringify(entry) },
        { method: "post" },
      );
      setEditingId(null);
    };

  const editingEntry = editingId ? entries.find((e) => e.id === editingId) : null;

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1400px" mx="auto">
      {/* Header */}
      <Box mb={6} display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="lg">ティア表</Heading>
        <Button
          colorPalette="yellow"
          size="sm"
          onClick={() => {
            setShowCreateForm((prev) => !prev);
            setEditingId(null);
          }}
        >
          {showCreateForm ? "閉じる" : "新規作成"}
        </Button>
      </Box>

      {/* Inline create form */}
      {showCreateForm && (
        <Box
          bg="gray.800"
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          borderRadius="lg"
          p={6}
          mb={6}
        >
          <Heading size="md" mb={4}>
            新規作成
          </Heading>
          <TierEntryForm
            allWarriors={allWarriors}
            allSkills={allSkills}
            onSave={handleCreate}
          />
        </Box>
      )}

      {/* Inline edit form */}
      {editingEntry && (
        <Box
          bg="gray.800"
          borderWidth="1px"
          borderColor="yellow.500"
          borderRadius="lg"
          p={6}
          mb={6}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">編集中</Heading>
            <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>
              キャンセル
            </Button>
          </Box>
          <TierEntryForm
            allWarriors={allWarriors}
            allSkills={allSkills}
            onSave={handleUpdate(editingEntry.id)}
            initialEntry={editingEntry}
          />
        </Box>
      )}

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
                      onEdit={(id) => {
                        setEditingId(id);
                        setShowCreateForm(false);
                      }}
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
                  onEdit={(id) => {
                    setEditingId(id);
                    setShowCreateForm(false);
                  }}
                />
              ))
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}
