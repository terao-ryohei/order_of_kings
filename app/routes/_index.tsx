import {
  Badge,
  Box,
  Flex,
  Heading,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { eq, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { warriors, warriorRoles } from "../../server/db/schema";

export const meta: MetaFunction = () => [
  { title: "武将一覧 - 王の勅命" },
  { name: "description", content: "武将一覧ページ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const rarity = url.searchParams.get("rarity");
  const era = url.searchParams.get("era");
  const role = url.searchParams.get("role");

  const db = drizzle((context.cloudflare as any).env.DB);

  let result;

  if (role) {
    result = await db
      .selectDistinct({ warrior: warriors })
      .from(warriors)
      .innerJoin(warriorRoles, eq(warriorRoles.warrior_id, warriors.id))
      .where(eq(warriorRoles.role, role))
      .then((rows) => rows.map((r) => r.warrior));
  } else if (rarity) {
    const rarityNum = Number(rarity);
    result = await db
      .select()
      .from(warriors)
      .where(eq(warriors.rarity, rarityNum))
      .orderBy(asc(warriors.sort_order));
  } else if (era) {
    result = await db
      .select()
      .from(warriors)
      .where(eq(warriors.era, era))
      .orderBy(asc(warriors.sort_order));
  } else {
    result = await db
      .select()
      .from(warriors)
      .where(eq(warriors.is_delete, false))
      .orderBy(asc(warriors.sort_order));
  }

  return { warriors: result, filters: { rarity, era, role } };
}

function RarityStars({ rarity }: { rarity: number }) {
  const color = rarity >= 5 ? "orange.400" : rarity >= 4 ? "purple.400" : "blue.400";
  return (
    <Text color={color} fontWeight="bold" fontSize="sm">
      {"★".repeat(rarity)}
    </Text>
  );
}

export default function Index() {
  const { warriors: data, filters } = useLoaderData<typeof loader>();

  return (
    <Box minH="100vh" bg={{ base: "gray.50", _dark: "gray.900" }} p={4}>
      <VStack gap={6} align="stretch">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <Heading size="xl" color={{ base: "gray.800", _dark: "white" }}>
            武将一覧
          </Heading>
          <Flex gap={4} wrap="wrap">
            <Link to="/my-warriors" style={{ color: "#3182ce", fontSize: "14px", fontWeight: 700 }}>
              手持ち武将を登録
            </Link>
            <Link to="/formation" style={{ color: "#2f855a", fontSize: "14px", fontWeight: 700 }}>
              編成ビルダーへ
            </Link>
          </Flex>
        </Flex>

        {/* フィルタ */}
        <Form method="get">
          <Flex gap={3} flexWrap="wrap" align="center">
            <Box>
              <Text fontSize="sm" mb={1} color={{ base: "gray.600", _dark: "gray.400" }}>レアリティ</Text>
              <select
                name="rarity"
                defaultValue={filters.rarity ?? ""}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", background: "transparent" }}
              >
                <option value="">全て</option>
                {[5, 4, 3].map((r) => (
                  <option key={r} value={r}>{"★".repeat(r)}</option>
                ))}
              </select>
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color={{ base: "gray.600", _dark: "gray.400" }}>時代</Text>
              <input
                name="era"
                defaultValue={filters.era ?? ""}
                placeholder="例: 秦末"
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", background: "transparent", width: "120px" }}
              />
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color={{ base: "gray.600", _dark: "gray.400" }}>役割</Text>
              <input
                name="role"
                defaultValue={filters.role ?? ""}
                placeholder="例: 盾"
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", background: "transparent", width: "100px" }}
              />
            </Box>
            <Box alignSelf="flex-end">
              <button
                type="submit"
                style={{ padding: "8px 20px", background: "#3182ce", color: "white", borderRadius: "6px", border: "none", cursor: "pointer" }}
              >
                絞り込み
              </button>
            </Box>
            {(filters.rarity || filters.era || filters.role) && (
              <Box alignSelf="flex-end">
                <Link to="/" style={{ padding: "8px 16px", color: "#3182ce", textDecoration: "underline", fontSize: "14px" }}>
                  クリア
                </Link>
              </Box>
            )}
          </Flex>
        </Form>

        <Text fontSize="sm" color={{ base: "gray.500", _dark: "gray.400" }}>
          {data.length}件
        </Text>

        {/* カードグリッド */}
        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={4}>
          {data.map((warrior) => (
            <Link key={warrior.id} to={`/warriors/${warrior.id}`}>
              <Box
                bg={{ base: "white", _dark: "gray.800" }}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={{ base: "gray.200", _dark: "gray.700" }}
                p={4}
                _hover={{ shadow: "lg", transform: "translateY(-2px)", borderColor: "blue.400" }}
                transition="all 0.2s"
                cursor="pointer"
              >
                <VStack gap={2} align="start">
                  <Flex justify="space-between" w="100%" align="center">
                    <RarityStars rarity={warrior.rarity} />
                    <Badge colorPalette="gray" size="sm" variant="outline">C{warrior.cost}</Badge>
                  </Flex>
                  <Text fontWeight="bold" fontSize="sm" lineClamp={1}>
                    {warrior.name}
                  </Text>
                  <Text fontSize="xs" color={{ base: "gray.500", _dark: "gray.400" }}>
                    {warrior.reading}
                  </Text>
                  {warrior.era && (
                    <Badge colorPalette="blue" size="sm">{warrior.era}</Badge>
                  )}
                  <Flex gap={2} wrap="wrap">
                    <Text fontSize="xs" color={{ base: "gray.600", _dark: "gray.300" }}>武{warrior.atk}</Text>
                    <Text fontSize="xs" color={{ base: "gray.600", _dark: "gray.300" }}>知{warrior.int}</Text>
                    <Text fontSize="xs" color={{ base: "gray.600", _dark: "gray.300" }}>胆{warrior.guts}</Text>
                    <Text fontSize="xs" color={{ base: "gray.600", _dark: "gray.300" }}>政{warrior.pol}</Text>
                  </Flex>
                </VStack>
              </Box>
            </Link>
          ))}
        </SimpleGrid>

        {data.length === 0 && (
          <Box textAlign="center" py={12} color={{ base: "gray.500", _dark: "gray.400" }}>
            <Text>武将が見つかりません</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
