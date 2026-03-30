import { Link, useLoaderData } from "@remix-run/react";
import { Text } from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useMyWarriors } from "../hooks/useMyWarriors";
import {
  warriors,
  weaponAptitudes,
  warriorSkills,
  skills,
} from "../../server/db/schema";
import FormationBuilder from "../components/FormationBuilder";

export const meta: MetaFunction = () => [
  { title: "編成ビルダー - 王の算盤" },
  {
    name: "description",
    content: "手持ち武将から3枠編成（主将/副将/軍師）を組むページ",
  },
];

export async function loader({ context }: LoaderFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const warriorRows = await db
    .select()
    .from(warriors)
    .where(eq(warriors.is_delete, false))
    .orderBy(asc(warriors.sort_order));

  const ids = warriorRows.map((warrior) => warrior.id);
  const aptitudeRows = ids.length
    ? await db
        .select()
        .from(weaponAptitudes)
        .where(inArray(weaponAptitudes.warrior_id, ids))
    : [];

  const aptitudeMap = new Map<number, string[]>();
  for (const aptitude of aptitudeRows) {
    const current = aptitudeMap.get(aptitude.warrior_id) ?? [];
    current.push(`${aptitude.weapon_type}${aptitude.aptitude}`);
    aptitudeMap.set(aptitude.warrior_id, current);
  }

  const skillRows = ids.length
    ? await db
        .select({
          warrior_id: warriorSkills.warrior_id,
          slot: warriorSkills.slot,
          skill_name: skills.name,
          skill_description: skills.description,
          is_unique: warriorSkills.is_unique,
        })
        .from(warriorSkills)
        .innerJoin(skills, eq(warriorSkills.skill_id, skills.id))
        .where(inArray(warriorSkills.warrior_id, ids))
    : [];

  const skillMap = new Map<
    number,
    {
      skill1: string | null;
      skill2: string | null;
      skill1_desc: string | null;
      skill2_desc: string | null;
    }
  >();
  for (const row of skillRows) {
    if (!row.is_unique) continue;
    const current = skillMap.get(row.warrior_id) ?? {
      skill1: null,
      skill2: null,
      skill1_desc: null,
      skill2_desc: null,
    };
    if (row.slot === 1) {
      current.skill1 = row.skill_name;
      current.skill1_desc = row.skill_description;
    }
    if (row.slot === 2) {
      current.skill2 = row.skill_name;
      current.skill2_desc = row.skill_description;
    }
    skillMap.set(row.warrior_id, current);
  }

  const allSkills = await db
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
    .orderBy(asc(skills.sort_order));

  return {
    warriors: warriorRows.map((warrior) => {
      const uniqueSkills = skillMap.get(warrior.id);
      return {
        id: warrior.id,
        name: warrior.name,
        reading: warrior.reading,
        rarity: warrior.rarity,
        atk: warrior.atk,
        int: warrior.int,
        guts: warrior.guts,
        atk_growth: warrior.atk_growth,
        int_growth: warrior.int_growth,
        guts_growth: warrior.guts_growth,
        era: warrior.era,
        aptitudes: aptitudeMap.get(warrior.id) ?? [],
        skill1_name: uniqueSkills?.skill1 ?? null,
        skill2_name: uniqueSkills?.skill2 ?? null,
        skill1_desc: uniqueSkills?.skill1_desc ?? null,
        skill2_desc: uniqueSkills?.skill2_desc ?? null,
      };
    }),
    allSkills,
  };
}

export default function FormationBuilderPage() {
  const { warriors: allWarriors, allSkills } = useLoaderData<typeof loader>();
  const { myWarriorIds, isHydrated } = useMyWarriors();

  const myWarriors = allWarriors.filter((warrior) =>
    myWarriorIds.includes(warrior.id)
  );

  return (
    <FormationBuilder
      allWarriors={allWarriors}
      selectableWarriors={myWarriors}
      allSkills={allSkills}
      isReady={isHydrated}
      emptyContent={
        <>
          <Text fontWeight="bold" mb={3}>
            まず手持ち武将を登録してください
          </Text>
          <Link
            to="/my-warriors"
            style={{ color: "#ECC94B", fontWeight: 700 }}
          >
            /my-warriors へ移動
          </Link>
        </>
      }
    />
  );
}
