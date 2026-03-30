import { Text } from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  sharedProfiles,
  warriors,
  weaponAptitudes,
  warriorSkills,
  skills,
} from "../../server/db/schema";
import FormationBuilder from "../components/FormationBuilder";
import type { WarriorData, SkillData } from "../lib/formation-shared";

export const meta: MetaFunction = () => [
  { title: "共有手持ち編成ビルダー - 王の算盤" },
  {
    name: "description",
    content: "共有された手持ち武将・スキルで編成を組むページ",
  },
];

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { uuid } = params;
  const db = drizzle((context.cloudflare as any).env.DB);

  const [profile] = await db
    .select()
    .from(sharedProfiles)
    .where(eq(sharedProfiles.uuid, uuid!));

  if (!profile) throw new Response("Not Found", { status: 404 });

  // Parse shared warrior IDs (with duplicates for count)
  const rawWarriorIds: number[] = profile.warriorIds
    ? JSON.parse(profile.warriorIds)
    : [];
  const uniqueWarriorIds = [...new Set(rawWarriorIds)];

  // Fetch full warrior data for the formation builder
  const warriorRows =
    uniqueWarriorIds.length > 0
      ? await db
          .select()
          .from(warriors)
          .where(inArray(warriors.id, uniqueWarriorIds))
          .orderBy(asc(warriors.sort_order))
      : [];

  const ids = warriorRows.map((w) => w.id);

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

  const sharedWarriors: WarriorData[] = warriorRows.map((warrior) => {
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
  });

  // Fetch shared skills (equipment skills, not unique warrior skills)
  const sharedSkillIds: number[] = profile.skillIds
    ? JSON.parse(profile.skillIds)
    : [];

  const sharedSkills: SkillData[] =
    sharedSkillIds.length > 0
      ? await db
          .select({
            id: skills.id,
            name: skills.name,
            skill_type: skills.skill_type,
            color: skills.color,
            description: skills.description,
          })
          .from(skills)
          .where(inArray(skills.id, sharedSkillIds))
          .orderBy(asc(skills.sort_order))
      : [];

  return {
    warriors: sharedWarriors,
    skills: sharedSkills,
  };
}

export default function SharedFormationPage() {
  const { warriors: sharedWarriors, skills: sharedSkills } =
    useLoaderData<typeof loader>();

  return (
    <FormationBuilder
      allWarriors={sharedWarriors}
      selectableWarriors={sharedWarriors}
      allSkills={sharedSkills}
      isReady={true}
      pageTitle="共有手持ち編成ビルダー"
      pageSubtitle="共有された手持ち武将・スキルで編成を組む"
      warriorSectionTitle="共有手持ち武将"
      emptyContent={
        <Text color="gray.400">共有された武将がありません</Text>
      }
    />
  );
}
