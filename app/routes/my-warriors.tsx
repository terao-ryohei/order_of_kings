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
  chakra,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useMyWarriors } from "../hooks/useMyWarriors";
import { warriors } from "../../server/db/schema";

export const meta: MetaFunction = () => [
  { title: "手持ち武将 - 王の算盤" },
  { name: "description", content: "手持ち武将の登録ページ" },
];

export async function loader({ context }: LoaderFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const result = await db
    .select()
    .from(warriors)
    .where(eq(warriors.is_delete, false))
    .orderBy(asc(warriors.sort_order));

  return { warriors: result };
}

function RarityStars({ rarity }: { rarity: number }) {
  const color = rarity >= 5 ? "orange.400" : rarity >= 4 ? "purple.400" : "blue.400";
  return (
    <Text color={color} fontWeight="bold" fontSize="sm">
      {"★".repeat(rarity)}
    </Text>
  );
}

export default function MyWarriorsPage() {
  const { warriors: data } = useLoaderData<typeof loader>();
  const {
    count,
    totalCount,
    has,
    getCount,
    isHydrated,
    toggle,
    increment,
    decrement,
    clear,
  } = useMyWarriors();

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch" maxW="1200px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="xl" color="white">
              手持ち武将管理
            </Heading>
            <Text fontSize="sm" color="gray.400">
              {isHydrated ? `${count}種 / ${totalCount}枚` : "0種 / 0枚"} 選択中
            </Text>
          </VStack>
          <Link to="/" style={{ color: "#ECC94B", fontSize: "14px" }}>
            ← 武将一覧へ戻る
          </Link>
        </Flex>

        <Flex gap={3} flexWrap="wrap">
          <Button variant="ghost" onClick={clear}>
            全解除
          </Button>
        </Flex>

        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={4}>
          {data.map((warrior) => {
            const selected = isHydrated && has(warrior.id);
            const copyCount = isHydrated ? getCount(warrior.id) : 0;

            return (
              <chakra.button
                key={warrior.id}
                type="button"
                onClick={() => toggle(warrior.id)}
                textAlign="left"
                bg="whiteAlpha.100"
                borderRadius="xl"
                borderWidth="2px"
                borderColor={selected ? "blue.400" : "whiteAlpha.200"}
                p={4}
                w="100%"
                border="2px solid"
                _hover={{ shadow: "lg", transform: "translateY(-2px)", borderColor: "blue.400" }}
                transition="all 0.2s"
                cursor="pointer"
                position="relative"
              >
                {copyCount > 1 && (
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
                  <Flex justify="space-between" w="100%" align="center">
                    <RarityStars rarity={warrior.rarity} />
                    <Badge colorPalette={selected ? "blue" : "gray"} size="sm" variant="outline">
                      {selected ? "選択中" : "未選択"}
                    </Badge>
                  </Flex>
                  <Text fontWeight="bold" fontSize="sm" lineClamp={1}>
                    {warrior.name}
                  </Text>
                  <Text fontSize="xs" color="gray.400">
                    {warrior.reading}
                  </Text>
                  {warrior.era && <Badge colorPalette="blue" size="sm">{warrior.era}</Badge>}
                  <Flex gap={2} wrap="wrap">
                    <Text fontSize="xs" color="gray.300">武{warrior.atk}</Text>
                    <Text fontSize="xs" color="gray.300">知{warrior.int}</Text>
                    <Text fontSize="xs" color="gray.300">胆{warrior.guts}</Text>
                    <Text fontSize="xs" color="gray.300">政{warrior.pol}</Text>
                  </Flex>
                  {selected && (
                    <Flex
                      gap={2}
                      align="center"
                      justify="center"
                      w="100%"
                      pt={1}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        aria-label="1枚減らす"
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        borderRadius="full"
                        onClick={() => decrement(warrior.id)}
                      >
                        −
                      </IconButton>
                      <Text fontSize="sm" fontWeight="bold" color="white" minW="24px" textAlign="center">
                        {copyCount}
                      </Text>
                      <IconButton
                        aria-label="1枚追加"
                        size="xs"
                        variant="outline"
                        colorPalette="green"
                        borderRadius="full"
                        onClick={() => increment(warrior.id)}
                      >
                        +
                      </IconButton>
                    </Flex>
                  )}
                </VStack>
              </chakra.button>
            );
          })}
        </SimpleGrid>

        <Flex justify="center" pt={2}>
          <Link
            to="/formation"
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              background: "#3182ce",
              color: "white",
              fontWeight: "bold",
            }}
          >
            → 編成相談へ
          </Link>
        </Flex>
      </VStack>
    </Box>
  );
}
