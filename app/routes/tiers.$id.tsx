import { useLoaderData } from "@remix-run/react";
import { Link as RemixLink } from "@remix-run/react";
import { Box, Text, Badge, HStack, Button } from "@chakra-ui/react";
import { useRef } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { eq, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { warriors, skills, tierEntries } from "../../server/db/schema";
import type { TierEntry, TierWarriorSlot, TierRank } from "../lib/tier-types";
import { RANK_COLORS } from "../lib/tier-types";
import { TierCompositionDisplay } from "../components/tier/TierCompositionDisplay";
import { TierDownloadButton } from "../components/tier/TierDownloadButton";

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
    .select({ id: skills.id, name: skills.name, color: skills.color, description: skills.description })
    .from(skills)
    .where(eq(skills.is_delete, false));

  return { entry, warriors: warriorRows, allSkills: skillRows };
}

export default function TierDetailPage() {
  const { entry, warriors: allWarriors, allSkills } = useLoaderData<typeof loader>();
  const captureRef = useRef<HTMLDivElement>(null);

  const warriorMap = new Map(
    allWarriors.map((w) => [w.id, { id: w.id, name: w.name, cost: w.cost }])
  );
  const skillMap = new Map(allSkills.map((s) => [s.id, s]));

  return (
    <Box p={{ base: 4, md: 8 }} maxW="800px" mx="auto">
      <HStack mb={4} justify="space-between">
        <Button asChild variant="ghost" size="sm">
          <RemixLink to="/tiers">← 一覧に戻る</RemixLink>
        </Button>
        <HStack gap={2}>
          <TierDownloadButton captureRef={captureRef} rank={entry.rank} entryId={entry.id} />
          <Button asChild colorPalette="yellow" size="sm">
            <RemixLink to={`/tiers/${entry.id}/edit`}>編集</RemixLink>
          </Button>
        </HStack>
      </HStack>

      <Box ref={captureRef} p={4} bg="#1a0505" borderRadius="lg">
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

        <TierCompositionDisplay
          slots={entry.slots as [TierWarriorSlot, TierWarriorSlot, TierWarriorSlot]}
          warriorMap={warriorMap}
          skillMap={skillMap}
        />
      </Box>
    </Box>
  );
}
