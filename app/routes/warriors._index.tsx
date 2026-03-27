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
import { Form, Link, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useEffect, useRef, useState, useTransition } from "react";
import { warriorRoles, warriors } from "../../server/db/schema";

export const meta: MetaFunction = () => [
  { title: "武将一覧 - 王の算盤" },
  { name: "description", content: "武将一覧ページ" },
];

function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const era = url.searchParams.get("era");
  const role = url.searchParams.get("role");
  const name = url.searchParams.get("name") ?? "";
  const nameKana = toKatakana(name);

  const db = drizzle((context.cloudflare as any).env.DB);

  const nameFilter = name
    ? or(
        like(warriors.name, `%${name}%`),
        like(warriors.reading, `%${name}%`),
        like(warriors.reading, `%${nameKana}%`),
      )
    : undefined;

  let result;

  if (role) {
    result = await db
      .selectDistinct({ warrior: warriors })
      .from(warriors)
      .innerJoin(warriorRoles, eq(warriorRoles.warrior_id, warriors.id))
      .where(nameFilter ? and(eq(warriorRoles.role, role), nameFilter) : eq(warriorRoles.role, role))
      .then((rows) => rows.map((r) => r.warrior));
  } else if (era) {
    result = await db
      .select()
      .from(warriors)
      .where(nameFilter ? and(eq(warriors.era, era), nameFilter) : eq(warriors.era, era))
      .orderBy(desc(warriors.rarity), desc(warriors.cost), asc(warriors.sort_order));
  } else {
    result = await db
      .select()
      .from(warriors)
      .where(nameFilter ? and(eq(warriors.is_delete, false), nameFilter) : eq(warriors.is_delete, false))
      .orderBy(desc(warriors.rarity), desc(warriors.cost), asc(warriors.sort_order));
  }

  return { warriors: result, filters: { era, role, name } };
}

function RarityStars({ rarity }: { rarity: number }) {
  const color = rarity >= 5 ? "yellow.400" : rarity >= 4 ? "purple.400" : "blue.400";
  return (
    <Text color={color} fontWeight="bold" fontSize="sm">
      {"★".repeat(rarity)}
    </Text>
  );
}

export default function Index() {
  const { warriors: data, filters } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nameValue, setNameValue] = useState(searchParams.get("name") ?? "");

  useEffect(() => {
    setNameValue(searchParams.get("name") ?? "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleNameChange = (value: string) => {
    setNameValue(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set("name", value);
        } else {
          params.delete("name");
        }
        navigate(params.toString() ? `?${params.toString()}` : "?", { replace: true });
      });
    }, 300);
  };

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <Heading size="xl" color="white">
            武将一覧
          </Heading>
          <Flex gap={4} wrap="wrap">
            <Link to="/my-warriors" style={{ color: "#ECC94B", fontSize: "14px", fontWeight: 700 }}>
              手持ち武将を登録
            </Link>
            <Link to="/formation" style={{ color: "#ECC94B", fontSize: "14px", fontWeight: 700 }}>
              編成ビルダーへ
            </Link>
          </Flex>
        </Flex>

        <Form method="get">
          <Flex gap={3} flexWrap="wrap" align="center">
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">
                時代
              </Text>
              <input
                name="era"
                defaultValue={filters.era ?? ""}
                placeholder="例: 秦末"
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: "white",
                  width: "120px",
                }}
              />
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">
                役割
              </Text>
              <input
                name="role"
                defaultValue={filters.role ?? ""}
                placeholder="例: 盾"
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: "white",
                  width: "100px",
                }}
              />
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">
                武将名
              </Text>
              <input
                name="name"
                value={nameValue}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="武将名で検索..."
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: "white",
                  width: "140px",
                }}
              />
            </Box>
            <Box alignSelf="flex-end">
              <button
                type="submit"
                style={{
                  padding: "8px 20px",
                  background: "#D69E2E",
                  color: "black",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                絞り込み
              </button>
            </Box>
            {(filters.era || filters.role || filters.name) && (
              <Box alignSelf="flex-end">
                <Link
                  to="/warriors"
                  style={{
                    padding: "8px 16px",
                    color: "#ECC94B",
                    textDecoration: "underline",
                    fontSize: "14px",
                  }}
                >
                  クリア
                </Link>
              </Box>
            )}
          </Flex>
        </Form>

        <Text fontSize="sm" color="gray.400">
          {data.length}件
        </Text>

        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={4}>
          {data.map((warrior) => (
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
                  <Flex justify="space-between" w="100%" align="center">
                    <RarityStars rarity={warrior.rarity} />
                    <Badge colorPalette="gray" size="sm" variant="outline">
                      コスト{warrior.cost}
                    </Badge>
                  </Flex>
                  <Text fontWeight="bold" fontSize="sm" lineClamp={1}>
                    {warrior.name}
                  </Text>
                  <Text fontSize="xs" color="gray.400">
                    {warrior.reading}
                  </Text>
                  {warrior.era && (
                    <Badge colorPalette="blue" size="sm">
                      {warrior.era}
                    </Badge>
                  )}
                  <Flex gap={2} wrap="wrap">
                    <Text fontSize="xs" color="gray.300">
                      武{warrior.atk}
                    </Text>
                    <Text fontSize="xs" color="gray.300">
                      知{warrior.int}
                    </Text>
                    <Text fontSize="xs" color="gray.300">
                      胆{warrior.guts}
                    </Text>
                    <Text fontSize="xs" color="gray.300">
                      政{warrior.pol}
                    </Text>
                  </Flex>
                </VStack>
              </Box>
            </Link>
          ))}
        </SimpleGrid>

        {data.length === 0 && (
          <Box textAlign="center" py={12} color="gray.400">
            <Text>武将が見つかりません</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
