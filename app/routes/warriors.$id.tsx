import {
  Badge,
  Box,
  Divider,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { warriors, weaponAptitudes, skills, warriorSkills, warriorRoles } from "../../server/db/schema";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.warrior.name ?? "武将"} - 王の勅命` },
];

export async function loader({ params, context }: LoaderFunctionArgs) {
  const id = Number(params.id);
  const db = drizzle((context.cloudflare as any).env.DB);

  const [warrior] = await db.select().from(warriors).where(eq(warriors.id, id));
  if (!warrior) throw new Response("Not Found", { status: 404 });

  const aptitudes = await db
    .select()
    .from(weaponAptitudes)
    .where(eq(weaponAptitudes.warrior_id, id));

  const skillLinks = await db
    .select({ slot: warriorSkills.slot, is_unique: warriorSkills.is_unique, skill: skills })
    .from(warriorSkills)
    .innerJoin(skills, eq(warriorSkills.skill_id, skills.id))
    .where(eq(warriorSkills.warrior_id, id));

  const roles = await db
    .select()
    .from(warriorRoles)
    .where(eq(warriorRoles.warrior_id, id));

  return { warrior, aptitudes, skills: skillLinks, roles };
}

const APTITUDE_COLOR: Record<string, string> = {
  "極": "red",
  "優": "orange",
  "良": "blue",
  "凡": "gray",
};

function StatBox({ label, value, growth }: { label: string; value: number; growth: number }) {
  return (
    <Box
      bg={{ base: "gray.50", _dark: "gray.700" }}
      borderRadius="lg"
      p={3}
      textAlign="center"
      minW="70px"
    >
      <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }} mb={1}>{label}</Text>
      <Text fontWeight="bold" fontSize="xl">{value}</Text>
      <Text fontSize="xs" color="green.500">+{growth.toFixed(1)}%</Text>
    </Box>
  );
}

export default function WarriorDetail() {
  const { warrior, aptitudes, skills: skillLinks, roles } = useLoaderData<typeof loader>();

  return (
    <Box minH="100vh" bg={{ base: "gray.50", _dark: "gray.900" }} p={4}>
      <VStack gap={6} align="stretch" maxW="800px" mx="auto">
        {/* ナビ */}
        <Link to="/" style={{ color: "#3182ce", fontSize: "14px" }}>← 武将一覧</Link>

        {/* ヘッダー */}
        <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="xl" p={6} borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }}>
          <Flex gap={4} align="start" flexWrap="wrap">
            <VStack align="start" gap={2} flex={1}>
              <Text color={{ base: "gray.500", _dark: "gray.400" }} fontSize="sm">{warrior.reading}</Text>
              <Heading size="2xl">{warrior.name}</Heading>
              <HStack gap={2} flexWrap="wrap">
                <Text color="yellow.400" fontWeight="bold">{"★".repeat(warrior.rarity)}</Text>
                {warrior.era && <Badge colorPalette="blue">{warrior.era}</Badge>}
                {roles.map((r) => (
                  <Badge key={r.id} colorPalette="purple">{r.role}</Badge>
                ))}
              </HStack>
            </VStack>
          </Flex>
        </Box>

        {/* ステータス */}
        <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="xl" p={6} borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }}>
          <Heading size="md" mb={4}>ステータス</Heading>
          <Flex gap={3} flexWrap="wrap">
            <StatBox label="武力" value={warrior.atk} growth={warrior.atk_growth} />
            <StatBox label="知略" value={warrior.int} growth={warrior.int_growth} />
            <StatBox label="胆力" value={warrior.guts} growth={warrior.guts_growth} />
            <StatBox label="政治" value={warrior.pol} growth={warrior.pol_growth} />
          </Flex>
        </Box>

        {/* 兵種適性 */}
        {aptitudes.length > 0 && (
          <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="xl" p={6} borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }}>
            <Heading size="md" mb={4}>兵種適性</Heading>
            <Flex gap={3} flexWrap="wrap">
              {aptitudes.map((apt) => (
                <Box key={apt.id} textAlign="center" minW="60px">
                  <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.400" }} mb={1}>{apt.weapon_type}</Text>
                  <Badge colorPalette={APTITUDE_COLOR[apt.aptitude] ?? "gray"} size="lg">
                    {apt.aptitude}
                  </Badge>
                </Box>
              ))}
            </Flex>
          </Box>
        )}

        {/* スキル */}
        {skillLinks.length > 0 && (
          <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="xl" p={6} borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }}>
            <Heading size="md" mb={4}>スキル</Heading>
            <VStack gap={4} align="stretch">
              {skillLinks
                .sort((a, b) => a.slot - b.slot)
                .map((s) => (
                  <Box key={s.skill.id} p={4} bg={{ base: "gray.50", _dark: "gray.700" }} borderRadius="lg">
                    <HStack gap={2} mb={2}>
                      <Badge colorPalette="gray">スキル{s.slot}</Badge>
                      {s.is_unique && <Badge colorPalette="orange">固有</Badge>}
                      <Badge colorPalette="green">{s.skill.skill_type}</Badge>
                      {s.skill.weapon_restriction && (
                        <Badge colorPalette="blue">{s.skill.weapon_restriction}</Badge>
                      )}
                    </HStack>
                    <Link to={`/skills/${s.skill.id}`}>
                      <Text fontWeight="bold" color="blue.400" _hover={{ textDecoration: "underline" }}>
                        {s.skill.name}
                      </Text>
                    </Link>
                    <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.300" }} mt={1}>
                      {s.skill.description}
                    </Text>
                  </Box>
                ))}
            </VStack>
          </Box>
        )}

        {/* 列伝 */}
        {warrior.biography && (
          <Box bg={{ base: "white", _dark: "gray.800" }} borderRadius="xl" p={6} borderWidth="1px" borderColor={{ base: "gray.200", _dark: "gray.700" }}>
            <Heading size="md" mb={4}>列伝</Heading>
            <Text color={{ base: "gray.700", _dark: "gray.300" }} lineHeight="tall" whiteSpace="pre-wrap">
              {warrior.biography}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
