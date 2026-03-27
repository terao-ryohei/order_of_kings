import {
  Badge,
  Box,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { eq, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { skills } from "../../server/db/schema";

export const meta: MetaFunction = () => [
  { title: "スキル一覧 - 王の勅命" },
  { name: "description", content: "スキル一覧ページ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const skill_type = url.searchParams.get("skill_type");
  const weapon_restriction = url.searchParams.get("weapon_restriction");

  const db = drizzle((context.cloudflare as any).env.DB);

  let result;
  if (skill_type) {
    result = await db.select().from(skills).where(eq(skills.skill_type, skill_type)).orderBy(asc(skills.sort_order));
  } else if (weapon_restriction) {
    result = await db.select().from(skills).where(eq(skills.weapon_restriction, weapon_restriction)).orderBy(asc(skills.sort_order));
  } else {
    result = await db.select().from(skills).where(eq(skills.is_delete, false)).orderBy(asc(skills.sort_order));
  }

  return { skills: result, filters: { skill_type, weapon_restriction } };
}

const SKILL_TYPE_COLOR: Record<string, string> = {
  "パッシブ": "blue",
  "能動": "red",
  "連鎖": "green",
  "怒気": "orange",
};

export default function SkillsIndex() {
  const { skills: data, filters } = useLoaderData<typeof loader>();

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={2}>
          <Heading size="xl" color="white">スキル一覧</Heading>
          <Link to="/" style={{ color: "#ECC94B", fontSize: "14px" }}>← 武将一覧</Link>
        </Flex>

        {/* フィルタ */}
        <Form method="get">
          <Flex gap={3} flexWrap="wrap" align="center">
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">スキルタイプ</Text>
              <select
                name="skill_type"
                defaultValue={filters.skill_type ?? ""}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "white" }}
              >
                <option value="">全て</option>
                <option value="パッシブ">パッシブ</option>
                <option value="能動">能動</option>
                <option value="連鎖">連鎖</option>
                <option value="怒気">怒気</option>
              </select>
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">兵種制限</Text>
              <select
                name="weapon_restriction"
                defaultValue={filters.weapon_restriction ?? ""}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "white" }}
              >
                <option value="">全て</option>
                <option value="刀">刀</option>
                <option value="馬">馬</option>
                <option value="弓">弓</option>
                <option value="槍">槍</option>
              </select>
            </Box>
            <Box alignSelf="flex-end">
              <button
                type="submit"
                style={{ padding: "8px 20px", background: "#3182ce", color: "white", borderRadius: "6px", border: "none", cursor: "pointer" }}
              >
                絞り込み
              </button>
            </Box>
            {(filters.skill_type || filters.weapon_restriction) && (
              <Box alignSelf="flex-end">
                <Link to="/skills" style={{ padding: "8px 16px", color: "#ECC94B", textDecoration: "underline", fontSize: "14px" }}>
                  クリア
                </Link>
              </Box>
            )}
          </Flex>
        </Form>

        <Text fontSize="sm" color="gray.400">{data.length}件</Text>

        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
          {data.map((skill) => (
            <Link key={skill.id} to={`/skills/${skill.id}`}>
              <Box
                bg="whiteAlpha.100"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                p={4}
                h="full"
                _hover={{ shadow: "lg", transform: "translateY(-2px)", borderColor: "blue.400" }}
                transition="all 0.2s"
                cursor="pointer"
              >
                <VStack gap={2} align="start">
                  <Flex gap={2} flexWrap="wrap">
                    <Badge colorPalette={SKILL_TYPE_COLOR[skill.skill_type] ?? "gray"}>
                      {skill.skill_type}
                    </Badge>
                    {skill.weapon_restriction && (
                      <Badge colorPalette="blue" variant="outline">{skill.weapon_restriction}</Badge>
                    )}
                    {skill.color && (
                      <Badge colorPalette="purple" variant="subtle">{skill.color}</Badge>
                    )}
                  </Flex>
                  <Text fontWeight="bold" fontSize="md">{skill.name}</Text>
                  <Text
                    fontSize="xs"
                    color="gray.400"
                    lineClamp={3}
                  >
                    {skill.description}
                  </Text>
                </VStack>
              </Box>
            </Link>
          ))}
        </SimpleGrid>

        {data.length === 0 && (
          <Box textAlign="center" py={12} color="gray.400">
            <Text>スキルが見つかりません</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
