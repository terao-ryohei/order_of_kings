import { useState, useMemo } from "react";
import { useLoaderData, Link as RemixLink, useFetcher } from "@remix-run/react";
import { Box, Heading, Text, SimpleGrid, Button } from "@chakra-ui/react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { formations, skills, tierRankings, warriors, warriorSkills } from "../../server/db/schema";
import { TierGenreFilter } from "../components/tier/TierGenreFilter";
import { TierEntryCard } from "../components/tier/TierEntryCard";
import { TierEntryForm } from "../components/tier/TierEntryForm";
import {
  TIER_RANKS,
  type Formation,
  type FormationWithRanking,
  type TierGenre,
  type TierRank,
  type TierWarriorSlot,
} from "../lib/tier-types";

export const meta: MetaFunction = () => [
  { title: "ティア表一覧 - 王の碁盤" },
  {
    name: "description",
    content: "編成ティア表の一覧ページ",
  },
];

type WarriorData = {
  id: number;
  name: string;
  rarity: number;
};

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
    .where(eq(skills.is_delete, false))
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

  const uniqueSkillIds = new Set(uniqueSkillRows.map((r) => r.skill_id));
  const uniqueSkillMap = new Map<number, { skillId: number; skillName: string }>();
  const gunshiSkillMap = new Map<number, { skillId: number; skillName: string }>();
  for (const r of uniqueSkillRows) {
    if (r.slot === 1) {
      uniqueSkillMap.set(r.warrior_id, { skillId: r.skill_id, skillName: r.skill_name });
    } else if (r.slot === 2) {
      gunshiSkillMap.set(r.warrior_id, { skillId: r.skill_id, skillName: r.skill_name });
    }
  }

  const filteredSkills = allSkillRows.filter((s) => !uniqueSkillIds.has(s.id));

  const tierEntryRows = await db
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

  const entries: FormationWithRanking[] = tierEntryRows.map((row) => ({
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
    allSkills: filteredSkills,
    entries,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const id = formData.get("id") as string;

  if (intent === "delete" && id) {
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

export default function TiersIndexPage() {
  const { warriors: allWarriors, allSkills, entries } =
    useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher<typeof action>();
  const saveFetcher = useFetcher<typeof action>();
  const [selectedGenre, setSelectedGenre] = useState<TierGenre | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const warriorMap = useMemo(() => {
    const map = new Map<number, WarriorData>();
    for (const w of allWarriors) {
      map.set(w.id, w);
    }
    return map;
  }, [allWarriors]);

  const skillsMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    for (const s of allSkills) {
      map.set(s.id, { id: s.id, name: s.name });
    }
    return map;
  }, [allSkills]);

  const deletingId =
    deleteFetcher.state !== "idle" &&
    deleteFetcher.formData?.get("intent") === "delete"
      ? (deleteFetcher.formData.get("id") as string)
      : null;

  const filteredEntries = useMemo(() => {
    const visible = deletingId
      ? entries.filter((e) => e.id !== deletingId)
      : entries;
    const filtered = selectedGenre
      ? visible.filter((e) => e.genres.includes(selectedGenre))
      : visible;
    const rankOrder = new Map(TIER_RANKS.map((r, i) => [r, i]));
    return [...filtered].sort((a, b) => {
      const aRank = a.ranking?.rank;
      const bRank = b.ranking?.rank;
      return (
        (rankOrder.get(aRank as TierRank) ?? 99) -
        (rankOrder.get(bRank as TierRank) ?? 99)
      );
    });
  }, [entries, selectedGenre, deletingId]);

  const handleDelete = (id: string) => {
    deleteFetcher.submit({ intent: "delete", id }, { method: "post" });
  };

  const handleCreate = (
    entry: Omit<Formation, "id" | "created_at" | "updated_at">,
  ) => {
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

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1200px" mx="auto">
      <Box
        mb={6}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Heading size="lg">編成一覧</Heading>
        <Box display="flex" gap={2}>
          <Button asChild colorPalette="blue" size="sm" variant="outline">
            <RemixLink to="/tiers">ティア表で確認</RemixLink>
          </Button>
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
      </Box>

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

      <TierGenreFilter selected={selectedGenre} onChange={setSelectedGenre} />

      {filteredEntries.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text color="gray.400">
            {selectedGenre
              ? `「${selectedGenre}」のエントリはありません`
              : "ティア表エントリがありません"}
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} mt={4}>
          {filteredEntries.map((entry) =>
            editingId === entry.id ? (
              <Box
                key={entry.id}
                bg="gray.800"
                borderWidth="1px"
                borderColor="yellow.500"
                borderRadius="lg"
                p={4}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                >
                  <Text fontWeight="bold" fontSize="sm">
                    編集中
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    キャンセル
                  </Button>
                </Box>
                <TierEntryForm
                  allWarriors={allWarriors}
                  allSkills={allSkills}
                  onSave={handleUpdate(entry.id)}
                  initialEntry={entry}
                />
              </Box>
            ) : (
              <TierEntryCard
                key={entry.id}
                entry={entry}
                warriors={warriorMap}
                skills={skillsMap}
                onDelete={handleDelete}
                onEdit={(id) => {
                  setEditingId(id);
                  setShowCreateForm(false);
                }}
              />
            ),
          )}
        </SimpleGrid>
      )}
    </Box>
  );
}
