import { useLoaderData } from "@remix-run/react";
import { Text, Box } from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { asc, eq, and, isNull, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  warriors,
  weaponAptitudes,
  warriorSkills,
  skills,
} from "../../server/db/schema";

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

  const ids = warriorRows.map((w) => w.id);

  const allSkills = ids.length
    ? await db
        .select({
          id: skills.id,
          name: skills.name,
          skill_type: skills.skill_type,
          color: skills.color,
          description: skills.description,
        })
        .from(skills)
        .leftJoin(warriorSkills, eq(skills.id, warriorSkills.skill_id))
        .where(and(eq(skills.is_delete, false), isNull(warriorSkills.skill_id)))
        .orderBy(asc(skills.sort_order))
    : [];

  return {
    warriors: warriorRows.map((w) => ({
      id: w.id,
      name: w.name,
      rarity: w.rarity,
    })),
    allSkills,
  };
}

export default function TiersCreatePage() {
  return (
    <Box p={8} textAlign="center">
      <Text fontSize="xl" fontWeight="bold">
        Coming Soon — ティア表作成（実装中）
      </Text>
    </Box>
  );
}
