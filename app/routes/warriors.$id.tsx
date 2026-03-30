import {
  Badge,
  Box,
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
  { title: `${data?.warrior.name ?? "武将"} - 王の碁盤` },
];

export async function loader({ params, context }: LoaderFunctionArgs) {
  const id = Number(params.id);
  if (isNaN(id) || id <= 0) throw new Response("Not Found", { status: 404 });
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
  "下": "gray",
};

const TROOP_MAP: Record<string, string> = {
  刀: "刀兵", 弓: "弓兵", 騎: "騎兵", 槍: "槍兵", 盾: "盾兵",
};

const SKILL_COLOR_PALETTE: Record<string, string> = {
  "赤": "red",
  "紫": "purple",
  "青": "blue",
};

function StatBox({ label, value, growth }: { label: string; value: number; growth: number }) {
  const lv40 = Math.round(value + growth * 39);
  return (
    <Box
      bg="whiteAlpha.100"
      borderRadius="lg"
      p={{ base: 2, md: 3 }}
      textAlign="center"
      minW={{ base: "70px", md: "80px" }}
      flex="1"
    >
      <Text fontSize="xs" color="gray.400" mb={1}>{label}</Text>
      <Text fontWeight="bold" fontSize="xl">{value}</Text>
      <Text fontSize="xs" color="green.500">+{growth.toFixed(2)}/Lv</Text>
      <Text fontSize="xs" color="gray.400">Lv40: {lv40}</Text>
    </Box>
  );
}

export default function WarriorDetail() {
  const { warrior, aptitudes, skills: skillLinks, roles } = useLoaderData<typeof loader>();

  return (
    <Box minH="100vh" bg="gray.950" p={{ base: 3, md: 4 }}>
      <VStack gap={{ base: 4, md: 6 }} align="stretch" maxW="800px" mx="auto">
        {/* ナビ */}
        <Link to="/" style={{ color: "#ECC94B", fontSize: "14px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}>← 武将一覧</Link>

        {/* ヘッダー */}
        <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 6 }} border="1px solid" borderColor="whiteAlpha.200">
          <Flex gap={4} align="start" flexWrap="wrap">
            <VStack align="start" gap={2} flex={1}>
              <Text color="gray.400" fontSize="sm">{warrior.reading}</Text>
              <Heading size="2xl">{warrior.name}</Heading>
              <HStack gap={2} flexWrap="wrap">
                <Text color="yellow.400" fontWeight="bold">{"★".repeat(warrior.rarity)}</Text>
                <Badge colorPalette="gray" variant="outline">C{warrior.cost}</Badge>
                {warrior.era && <Badge colorPalette="blue">{warrior.era}</Badge>}
                {roles.map((r) => (
                  <Badge key={r.id} colorPalette="purple">{r.role}</Badge>
                ))}
              </HStack>
            </VStack>
          </Flex>
        </Box>

        {/* ステータス */}
        <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 6 }} border="1px solid" borderColor="whiteAlpha.200">
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
          <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 6 }} border="1px solid" borderColor="whiteAlpha.200">
            <Heading size="md" mb={4}>兵種適性</Heading>
            <Flex gap={3} flexWrap="wrap">
              {aptitudes.map((apt) => (
                <Box key={apt.id} textAlign="center" minW="60px">
                  <Text fontSize="sm" color="gray.400" mb={1}>{TROOP_MAP[apt.weapon_type] ?? apt.weapon_type}</Text>
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
          <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 6 }} border="1px solid" borderColor="whiteAlpha.200">
            <Heading size="md" mb={4}>スキル</Heading>
            <VStack gap={4} align="stretch">
              {skillLinks
                .sort((a, b) => a.slot - b.slot)
                .map((s) => (
                  <Box key={s.skill.id} p={4} bg="whiteAlpha.100" borderRadius="lg">
                    <VStack align="start" gap={1} mb={2}>
                      <HStack gap={2} flexWrap="wrap">
                        <Badge colorPalette="gray">
                          {s.slot === 1 ? "統率スキル" : s.slot === 2 ? "軍師スキル" : `スキル${s.slot}`}
                        </Badge>
                        <Badge colorPalette="green">{s.skill.skill_type}</Badge>
                        {s.skill.weapon_restriction && (
                          <Badge colorPalette="blue">{s.skill.weapon_restriction}</Badge>
                        )}
                        {s.skill.color && SKILL_COLOR_PALETTE[s.skill.color] && (
                          <Badge colorPalette={SKILL_COLOR_PALETTE[s.skill.color]}>{s.skill.color}</Badge>
                        )}
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        {s.slot === 1 ? "主将・副将時に第一スキル固定" : s.slot === 2 ? "軍師時に第一スキル固定" : ""}
                      </Text>
                    </VStack>
                    <Link to={`/skills/${s.skill.id}`}>
                      <Text fontWeight="bold" color="blue.400" _hover={{ textDecoration: "underline" }}>
                        {s.skill.name}
                      </Text>
                    </Link>
                    <Text fontSize="sm" color="gray.300" mt={1}>
                      {s.skill.description}
                    </Text>
                  </Box>
                ))}
            </VStack>
          </Box>
        )}

        {/* 列伝 */}
        {warrior.biography && (
          <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 6 }} border="1px solid" borderColor="whiteAlpha.200">
            <Heading size="md" mb={4}>列伝</Heading>
            <Text color="gray.300" lineHeight="tall" whiteSpace="pre-wrap">
              {warrior.biography}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
