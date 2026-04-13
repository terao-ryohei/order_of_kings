import { useLoaderData } from "@remix-run/react";
import { Link as RemixLink } from "@remix-run/react";
import { Box, Heading, Text, Badge, VStack, HStack, Flex, Image, Divider, Button } from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { eq, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { warriors, skills, tierEntries } from "../../server/db/schema";
import type { TierEntry, TierWarriorSlot, TierRank } from "../lib/tier-types";
import { RANK_COLORS } from "../lib/tier-types";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `ティア表詳細 - ${data?.entry.rank}ランク - 王の碁盤` },
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
    genres: JSON.parse(entryRow.genres),
    slots: JSON.parse(entryRow.slots),
    description: entryRow.description,
    created_at: entryRow.createdAt,
    updated_at: entryRow.updatedAt,
  };

  const warriorRows = await db
    .select()
    .from(warriors)
    .where(eq(warriors.is_delete, false))
    .orderBy(asc(warriors.sort_order));

  const skillRows = await db
    .select({ id: skills.id, name: skills.name })
    .from(skills)
    .where(eq(skills.is_delete, false));

  return { entry, warriors: warriorRows, allSkills: skillRows };
}

export default function TierDetailPage() {
  const { entry, warriors: allWarriors, allSkills } = useLoaderData<typeof loader>();

  const warriorMap = new Map(allWarriors.map((w) => [w.id, w]));
  const skillMap = new Map(allSkills.map((s) => [s.id, s]));

  return (
    <Box p={{ base: 4, md: 8 }} maxW="800px" mx="auto">
      <HStack mb={4} justify="space-between">
        <Button asChild variant="ghost" size="sm">
          <RemixLink to="/tiers">← 一覧に戻る</RemixLink>
        </Button>
        <Button asChild colorPalette="yellow" size="sm">
          <RemixLink to={`/tiers/${entry.id}/edit`}>編集</RemixLink>
        </Button>
      </HStack>

      <HStack gap={3} mb={4}>
        <Badge
          bg={RANK_COLORS[entry.rank].bg}
          color="white"
          fontSize="xl"
          fontWeight="bold"
          px={4}
          py={2}
          borderRadius="md"
        >
          {entry.rank}
        </Badge>
        <HStack gap={2}>
          {entry.genres.map((genre) => (
            <Badge key={genre} variant="outline" colorPalette="blue">
              {genre}
            </Badge>
          ))}
        </HStack>
      </HStack>

      {entry.description && (
        <Text color="gray.300" mb={6} fontSize="sm" whiteSpace="pre-wrap">
          {entry.description}
        </Text>
      )}

      <VStack align="stretch" gap={6}>
        {entry.slots.map((slot) => {
          const warrior = warriorMap.get(slot.warrior_id);
          const altWarriors = slot.alt_warrior_ids.map((id) => warriorMap.get(id)).filter(Boolean);

          return (
            <Box key={slot.role} bg="gray.900" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.200">
              <HStack gap={3} mb={3}>
                {warrior && (
                  <Image
                    src={`/hero/${encodeURIComponent(warrior.name)}.png`}
                    alt={warrior.name}
                    boxSize="48px"
                    borderRadius="md"
                    objectFit="cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <VStack align="start" gap={0}>
                  <Text fontWeight="bold" color="white">
                    {slot.role}: {warrior?.name ?? "未設定"}
                  </Text>
                  {altWarriors.length > 0 && (
                    <Text fontSize="xs" color="gray.400">
                      代用武将: {altWarriors.map((w) => w!.name).join(", ")}
                    </Text>
                  )}
                </VStack>
              </HStack>

              <VStack align="start" gap={1} pl={4}>
                {slot.skills.map((skillSlot, i) => {
                  const skillName = skillMap.get(skillSlot.skill_id)?.name ?? `スキル#${skillSlot.skill_id}`;
                  const altSkillNames = skillSlot.alt_skill_ids
                    .map((id) => skillMap.get(id)?.name ?? `#${id}`)
                    .join(", ");
                  return (
                    <Text key={i} fontSize="sm" color="gray.300">
                      {skillName}
                      {skillSlot.alt_skill_ids.length > 0 && (
                        <Text as="span" color="gray.500"> / 代用: {altSkillNames}</Text>
                      )}
                    </Text>
                  );
                })}
              </VStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
