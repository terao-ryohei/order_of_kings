import { useState, useMemo } from "react";
import { useLoaderData, Link as RemixLink, useFetcher } from "@remix-run/react";
import { Box, Heading, Text, SimpleGrid, Button } from "@chakra-ui/react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { warriors, skills, tierEntries } from "../../server/db/schema";
import { TierGenreFilter } from "../components/tier/TierGenreFilter";
import { TierEntryCard } from "../components/tier/TierEntryCard";
import {
  TIER_RANKS,
  type TierEntry,
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

  const allSkills = await db
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

  const tierEntryRows = await db
    .select()
    .from(tierEntries);

  const entries: TierEntry[] = tierEntryRows.map((row) => ({
    id: row.id,
    rank: row.rank as TierRank,
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
      rarity: w.rarity,
    })),
    allSkills,
    entries,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const id = formData.get("id") as string;

  if (intent === "delete" && id) {
    await db.delete(tierEntries).where(eq(tierEntries.id, id));
  }
  return null;
}

export default function TiersIndexPage() {
  const { warriors: allWarriors, allSkills, entries } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedGenre, setSelectedGenre] = useState<TierGenre | null>(null);

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
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "delete"
      ? (fetcher.formData.get("id") as string)
      : null;

  const filteredEntries = useMemo(() => {
    const visible = deletingId
      ? entries.filter((e) => e.id !== deletingId)
      : entries;
    const filtered = selectedGenre
      ? visible.filter((e) => e.genres.includes(selectedGenre))
      : visible;
    const rankOrder = new Map(TIER_RANKS.map((r, i) => [r, i]));
    return [...filtered].sort(
      (a, b) => (rankOrder.get(a.rank) ?? 99) - (rankOrder.get(b.rank) ?? 99),
    );
  }, [entries, selectedGenre, deletingId]);

  const handleDelete = (id: string) => {
    fetcher.submit({ intent: "delete", id }, { method: "post" });
  };

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1200px" mx="auto">
      <Box mb={6} display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="lg">ティア表一覧</Heading>
        <Button asChild colorPalette="yellow" size="sm">
          <RemixLink to="/tiers/create">新規作成</RemixLink>
        </Button>
      </Box>

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
          {filteredEntries.map((entry) => (
            <TierEntryCard
              key={entry.id}
              entry={entry}
              warriors={warriorMap}
              skills={skillsMap}
              onDelete={handleDelete}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
