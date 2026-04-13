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
  warriors,
  skills,
  warriorSkills,
  tierEntries,
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
    .select()
    .from(tierEntries)
    .where(eq(tierEntries.id, id));

  if (!entryRow) {
    throw new Response("Not Found", { status: 404 });
  }

  const entry: TierEntry = {
    id: entryRow.id,
    rank: entryRow.rank as TierRank,
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

  const uniqueSkillRows = await db
    .select({
      warrior_id: warriorSkills.warrior_id,
      skill_name: skills.name,
    })
    .from(warriorSkills)
    .innerJoin(skills, eq(warriorSkills.skill_id, skills.id))
    .where(eq(warriorSkills.is_unique, true));

  const uniqueSkillMap = new Map(
    uniqueSkillRows.map((r) => [r.warrior_id, r.skill_name]),
  );

  return {
    entry,
    warriors: warriorRows.map((w) => ({
      id: w.id,
      name: w.name,
      cost: w.cost,
      rarity: w.rarity,
      uniqueSkillName: uniqueSkillMap.get(w.id) ?? null,
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
    .from(tierEntries)
    .where(eq(tierEntries.id, id));

  if (!existing) {
    throw new Response("Not Found", { status: 404 });
  }

  await db
    .update(tierEntries)
    .set({
      rank: entry.rank,
      genres: JSON.stringify(entry.genres),
      slots: JSON.stringify(entry.slots),
      description: entry.description,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(tierEntries.id, id));

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
