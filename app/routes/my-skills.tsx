import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useState } from "react";
import { useMySkills } from "../hooks/useMySkills";
import { skills } from "../../server/db/schema";

export const meta: MetaFunction = () => [
  { title: "手持ちスキル - 王の勅命" },
  { name: "description", content: "手持ちスキル管理ページ" },
];

export async function loader({ context }: LoaderFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const result = await db
    .select()
    .from(skills)
    .where(eq(skills.is_delete, false))
    .orderBy(asc(skills.sort_order));

  return { skills: result };
}

const SKILL_TYPE_COLOR: Record<string, string> = {
  "パッシブ": "blue",
  "能動": "red",
  "連鎖": "green",
  "怒気": "orange",
};

export default function MySkillsPage() {
  const { skills: data } = useLoaderData<typeof loader>();
  const {
    count,
    totalCount,
    has,
    getCount,
    isHydrated,
    increment,
    decrement,
    clear,
  } = useMySkills();

  const [search, setSearch] = useState("");

  const filtered = search
    ? data.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : data;

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch" maxW="1200px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="xl" color="white">
              手持ちスキル管理
            </Heading>
            <Text fontSize="sm" color="gray.400">
              {isHydrated ? `${count}種 / ${totalCount}個` : "0種 / 0個"} 選択中
            </Text>
          </VStack>
          <Button variant="ghost" color="gray.400" onClick={clear}>
            全解除
          </Button>
        </Flex>

        <Box>
          <input
            type="text"
            placeholder="スキル名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </Box>

        <Text fontSize="sm" color="gray.400">{filtered.length}件</Text>

        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
          {filtered.map((skill) => {
            const selected = isHydrated && has(skill.id);
            const copyCount = isHydrated ? getCount(skill.id) : 0;

            return (
              <Box
                key={skill.id}
                bg="whiteAlpha.100"
                borderRadius="xl"
                borderWidth="2px"
                borderColor={selected ? "yellow.500" : "whiteAlpha.200"}
                p={4}
                position="relative"
                transition="all 0.2s"
                _hover={{ shadow: "lg", transform: "translateY(-2px)", borderColor: "yellow.500" }}
              >
                {copyCount > 0 && (
                  <Badge
                    position="absolute"
                    top="-8px"
                    right="-8px"
                    colorPalette="yellow"
                    variant="solid"
                    fontSize="xs"
                    borderRadius="full"
                    px={2}
                  >
                    ×{copyCount}
                  </Badge>
                )}
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
                  <Text fontWeight="bold" fontSize="md" color="white">
                    {skill.name}
                  </Text>
                  <Text fontSize="xs" color="gray.400" lineClamp={2}>
                    {skill.description}
                  </Text>
                  <Flex gap={2} align="center" justify="center" w="100%" pt={1}>
                    {selected ? (
                      <>
                        <IconButton
                          aria-label="1個減らす"
                          size="xs"
                          variant="outline"
                          colorPalette="red"
                          borderRadius="full"
                          onClick={() => decrement(skill.id)}
                        >
                          −
                        </IconButton>
                        <Text fontSize="sm" fontWeight="bold" color="white" minW="24px" textAlign="center">
                          {copyCount}
                        </Text>
                        <IconButton
                          aria-label="1個追加"
                          size="xs"
                          variant="outline"
                          colorPalette="green"
                          borderRadius="full"
                          onClick={() => increment(skill.id)}
                        >
                          +
                        </IconButton>
                      </>
                    ) : (
                      <Button
                        size="xs"
                        colorPalette="yellow"
                        variant="outline"
                        onClick={() => increment(skill.id)}
                      >
                        ＋追加
                      </Button>
                    )}
                  </Flex>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>

        {filtered.length === 0 && (
          <Box textAlign="center" py={12} color="gray.400">
            <Text>スキルが見つかりません</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
