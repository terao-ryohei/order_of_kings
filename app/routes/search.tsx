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
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import { like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { warriors } from "../../server/db/schema";

export const meta: MetaFunction = () => [
  { title: "検索 - 王の碁盤" },
  { name: "description", content: "武将検索ページ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  if (!q) return { results: [], q };

  const db = drizzle((context.cloudflare as any).env.DB);
  const results = await db
    .select()
    .from(warriors)
    .where(
      or(
        like(warriors.name, `%${q}%`),
        like(warriors.reading, `%${q}%`)
      )
    )
    .limit(20);

  return { results, q };
}

export default function Search() {
  const { results, q } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSearching = navigation.state === "loading";

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch" maxW="900px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={2}>
          <Heading size="xl" color="white">武将検索</Heading>
          <Link to="/" style={{ color: "#ECC94B", fontSize: "14px" }}>← 武将一覧</Link>
        </Flex>

        <Form method="get">
          <Flex gap={3} align="center">
            <input
              name="q"
              defaultValue={q}
              placeholder="名前・読み仮名で検索..."
              autoFocus
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "transparent",
                color: "white",
                fontSize: "16px",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 24px",
                background: "#D69E2E",
                color: "black",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: 700,
              }}
            >
              検索
            </button>
          </Flex>
        </Form>

        {q && (
          <Text fontSize="sm" color="gray.400">
            「{q}」の検索結果: {results.length}件
          </Text>
        )}

        {isSearching && (
          <Box textAlign="center" py={8} color="gray.400">
            <Text>検索中...</Text>
          </Box>
        )}

        {!isSearching && results.length > 0 && (
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={4}>
            {results.map((warrior) => (
              <Link key={warrior.id} to={`/warriors/${warrior.id}`}>
                <Box
                  bg="whiteAlpha.100"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  p={4}
                  _hover={{ shadow: "lg", transform: "translateY(-2px)", borderColor: "yellow.400" }}
                  transition="all 0.2s"
                  cursor="pointer"
                >
                  <VStack gap={2} align="start">
                    <Text color="yellow.400" fontWeight="bold" fontSize="sm">
                      {"★".repeat(warrior.rarity)}
                    </Text>
                    <Text fontWeight="bold" fontSize="sm">{warrior.name}</Text>
                    <Text fontSize="xs" color="gray.400">
                      {warrior.reading}
                    </Text>
                    {warrior.era && (
                      <Badge colorPalette="blue" size="sm">{warrior.era}</Badge>
                    )}
                    <Flex gap={2} wrap="wrap">
                      <Text fontSize="xs" color="gray.300">武{warrior.atk}</Text>
                      <Text fontSize="xs" color="gray.300">知{warrior.int}</Text>
                      <Text fontSize="xs" color="gray.300">胆{warrior.guts}</Text>
                      <Text fontSize="xs" color="gray.300">政{warrior.pol}</Text>
                    </Flex>
                  </VStack>
                </Box>
              </Link>
            ))}
          </SimpleGrid>
        )}

        {!isSearching && q && results.length === 0 && (
          <Box textAlign="center" py={12} color="gray.400">
            <Text>「{q}」に一致する武将は見つかりませんでした</Text>
          </Box>
        )}

        {!q && (
          <Box textAlign="center" py={12} color="gray.400">
            <Text>武将名または読み仮名を入力して検索してください</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
