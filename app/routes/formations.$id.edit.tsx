import { useLoaderData, useFetcher } from "@remix-run/react";
import { Link as RemixLink } from "@remix-run/react";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  formations,
  warriors,
  skills,
  warriorSkills,
  tierRankings,
} from "../../server/db/schema";
import { TierEntryForm } from "../components/tier/TierEntryForm";
import type { TierEntry, TierRank, TierGenre, TierWarriorSlot } from "../lib/tier-types";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `ティア表編集 - ${data?.entry.rank}ランク - 王の碁盤` },
];

export async function loader({ params, context }: LoaderFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const id = params.id!;

  const [entryRow] = await db
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
    .innerJoin(tierRankings, eq(tierRankings.formationId, formations.id))
    .where(eq(formations.id, id));

  if (!entryRow) {
    throw new Response("Not Found", { status: 404 });
  }

  const entry: TierEntry = {
    id: entryRow.id,
    name: null,
    rank: entryRow.rank as TierRank,
    ranking: {
      id: entryRow.rankingId,
      formationId: entryRow.id,
      rank: entryRow.rank as TierRank,
      note: entryRow.note,
      sortOrder: entryRow.sortOrder ?? 0,
    },
    genres: JSON.parse(entryRow.genres) as TierGenre[],
    slots: JSON.parse(entryRow.slots) as [TierWarriorSlot, TierWarriorSlot, TierWarriorSlot],
    description: entryRow.description,
    created_at: entryRow.createdAt,
    updated_at: entryRow.updatedAt,
  };

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

  const allSkills = allSkillRows.filter((s) => !uniqueSkillIds.has(s.id));

  return {
    entry,
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
    allSkills,
  };
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const id = params.id!;

  const formData = await request.formData();
  const entry = JSON.parse(formData.get("entry") as string) as Omit<
    TierEntry,
    "id" | "created_at" | "updated_at"
  >;

  const [existing] = await db
    .select()
    .from(formations)
    .where(eq(formations.id, id));

  if (!existing) {
    throw new Response("Not Found", { status: 404 });
  }

  await db
    .update(formations)
    .set({
      genres: JSON.stringify(entry.genres),
      slots: JSON.stringify(entry.slots),
      description: entry.description,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(formations.id, id));

  await db
    .update(tierRankings)
    .set({
      rank: entry.rank,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(tierRankings.formationId, id));

  return redirect(`/tiers/${id}`);
}

export default function TierEditPage() {
  const { entry, warriors: allWarriors, allSkills } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  function handleSave(updated: Omit<TierEntry, "id" | "created_at" | "updated_at">) {
    fetcher.submit(
      { entry: JSON.stringify(updated) },
      { method: "post" },
    );
  }

  return (
    <Box p={{ base: 4, md: 8 }} maxW="800px" mx="auto">
      <Button asChild variant="ghost" size="sm" mb={6}>
        <RemixLink to={`/tiers/${entry.id}`}>← 詳細に戻る</RemixLink>
      </Button>

      <Heading size="lg" mb={2}>
        ティア表編集
      </Heading>
      <Text color="gray.400" mb={6}>
        編成情報を変更して保存する
      </Text>

      <TierEntryForm
        allWarriors={allWarriors}
        allSkills={allSkills}
        onSave={handleSave}
        initialEntry={entry}
      />
    </Box>
  );
}
