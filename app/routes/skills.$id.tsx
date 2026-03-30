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
import { skills, warriors, warriorSkills } from "../../server/db/schema";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.skill.name ?? "スキル"} - 王の碁盤` },
];

export async function loader({ params, context }: LoaderFunctionArgs) {
  const id = Number(params.id);
  const db = drizzle((context.cloudflare as any).env.DB);

  const [skill] = await db.select().from(skills).where(eq(skills.id, id));
  if (!skill) throw new Response("Not Found", { status: 404 });

  const warriorList = await db
    .selectDistinct({ warrior: warriors, slot: warriorSkills.slot, is_unique: warriorSkills.is_unique })
    .from(warriorSkills)
    .innerJoin(warriors, eq(warriorSkills.warrior_id, warriors.id))
    .where(eq(warriorSkills.skill_id, id));

  return { skill, warriors: warriorList };
}

const SKILL_TYPE_COLOR: Record<string, string> = {
  "パッシブ": "blue",
  "能動": "red",
  "連鎖": "green",
  "怒気": "orange",
};

export default function SkillDetail() {
  const { skill, warriors: warriorList } = useLoaderData<typeof loader>();

  return (
    <Box minH="100vh" bg="gray.950" p={{ base: 3, md: 4 }}>
      <VStack gap={{ base: 4, md: 6 }} align="stretch" maxW="800px" mx="auto">
        <Link to="/skills" style={{ color: "#ECC94B", fontSize: "14px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}>← スキル一覧</Link>

        {/* スキル詳細 */}
        <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 6 }} borderWidth="1px" borderColor="whiteAlpha.200">
          <VStack gap={4} align="start">
            <HStack gap={2} flexWrap="wrap">
              <Badge colorPalette={SKILL_TYPE_COLOR[skill.skill_type] ?? "gray"} size="lg">
                {skill.skill_type}
              </Badge>
              {skill.weapon_restriction && (
                <Badge colorPalette="blue" size="lg">{skill.weapon_restriction}</Badge>
              )}
              {skill.color && (
                <Badge colorPalette="purple" size="lg">{skill.color}</Badge>
              )}
              {skill.rarity != null && (
                <Badge colorPalette="yellow" size="lg">★{skill.rarity}</Badge>
              )}
            </HStack>
            <Heading size="2xl">{skill.name}</Heading>
            <Box bg="whiteAlpha.100" borderRadius="lg" p={4} w="full">
              <Text color="gray.200" lineHeight="tall" whiteSpace="pre-wrap">
                {skill.description}
              </Text>
            </Box>
          </VStack>
        </Box>

        {/* このスキルを持つ武将 */}
        {warriorList.length > 0 && (
          <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 6 }} borderWidth="1px" borderColor="whiteAlpha.200">
            <Heading size="md" mb={4}>このスキルを持つ武将</Heading>
            <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap={3}>
              {warriorList.map((w) => (
                <Link key={w.warrior.id} to={`/warriors/${w.warrior.id}`}>
                  <Box
                    bg="whiteAlpha.100"
                    borderRadius="lg"
                    p={3}
                    _hover={{ bg: "whiteAlpha.200", transform: "translateY(-1px)" }}
                    transition="all 0.2s"
                    cursor="pointer"
                  >
                    <Text fontSize="xs" color="yellow.400" fontWeight="bold">{"★".repeat(w.warrior.rarity)}</Text>
                    <Text fontWeight="bold" fontSize="sm" mt={1}>{w.warrior.name}</Text>
                    <Flex gap={1} mt={1} flexWrap="wrap">
                      <Badge colorPalette="gray" size="sm">スキル{w.slot}</Badge>
                      {w.is_unique && <Badge colorPalette="orange" size="sm">固有</Badge>}
                    </Flex>
                  </Box>
                </Link>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
