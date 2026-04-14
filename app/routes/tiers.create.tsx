import { useLoaderData, useFetcher } from "@remix-run/react";
import { Box, Heading, Text } from "@chakra-ui/react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  warriors,
  skills,
  warriorSkills,
  tierEntries,
} from "../../server/db/schema";
import { TierEntryForm } from "../components/tier/TierEntryForm";
import type { TierEntry } from "../lib/tier-types";

export const meta: MetaFunction = () => [
  { title: "ティア表作成 - 王の碁盤" },
  {
    name: "description",
    content: "編成ティア表の作成ページ",
  },
];

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
    allSkills,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const formData = await request.formData();
  const entry = JSON.parse(formData.get("entry") as string) as Omit<
    TierEntry,
    "id" | "created_at" | "updated_at"
  >;

  await db.insert(tierEntries).values({
    id: crypto.randomUUID(),
    rank: entry.rank,
    genres: JSON.stringify(entry.genres),
    slots: JSON.stringify(entry.slots),
    description: entry.description,
  });

  return redirect("/tiers");
}

export default function TiersCreatePage() {
  const { warriors: allWarriors, allSkills } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  function handleSave(
    entry: Omit<TierEntry, "id" | "created_at" | "updated_at">,
  ) {
    fetcher.submit(
      { entry: JSON.stringify(entry) },
      { method: "post" },
    );
  }

  return (
    <Box p={{ base: 4, md: 8 }} maxW="800px" mx="auto">
      <Heading size="lg" mb={2}>
        ティア表作成
      </Heading>
      <Text color="gray.400" mb={6}>
        編成をランク付けしてティア表に追加する
      </Text>
      <TierEntryForm
        allWarriors={allWarriors}
        allSkills={allSkills}
        onSave={handleSave}
      />
    </Box>
  );
}
