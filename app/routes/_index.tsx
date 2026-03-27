import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "order-of-kings" },
  { name: "description", content: "英傑・技能・編成をひとまとめに見られる戦略ツール。" },
];

const features = [
  {
    icon: "⚔",
    title: "英傑図鑑",
    description: "武将と技能を一覧で確認し、必要な情報をすばやく探せます。",
    href: "/warriors",
  },
  {
    icon: "🏯",
    title: "軍略編成",
    description: "部隊を組み合わせながら、編成スコアと相乗効果を確認できます。",
    href: "/formation",
  },
  {
    icon: "📜",
    title: "技能書庫",
    description: "技能の検索と比較をまとめて行えます。",
    href: "/skills",
  },
  {
    icon: "🛡",
    title: "所持武将",
    description: "手持ちの武将を登録して、現在の戦力を管理できます。",
    href: "/my-warriors",
  },
] as const;

export default function Index() {
  return (
    <Box minH="100vh" bg="gray.50" color="gray.900">
      <Container maxW="7xl" px={{ base: 5, md: 8 }} py={{ base: 12, md: 16 }}>
        <VStack align="stretch" gap={{ base: 10, md: 14 }}>
          <Flex
            direction={{ base: "column", lg: "row" }}
            justify="space-between"
            align={{ base: "flex-start", lg: "stretch" }}
            gap={{ base: 8, lg: 12 }}
          >
            <VStack align="flex-start" gap={5} maxW="3xl">
              <HStack
                px={3}
                py={1.5}
                rounded="md"
                borderWidth="1px"
                borderColor="gray.200"
                bg="white"
                color="gray.600"
                fontSize="sm"
                letterSpacing="0.12em"
                textTransform="uppercase"
              >
                <Text>Imperial Command</Text>
              </HStack>
              <Box>
                <Text
                  color="gray.500"
                  fontSize={{ base: "sm", md: "md" }}
                  letterSpacing="0.18em"
                  textTransform="uppercase"
                  mb={2}
                >
                  Strategy workspace
                </Text>
                <Heading
                  as="h1"
                  fontWeight="bold"
                  lineHeight="1.05"
                  fontSize={{ base: "4xl", md: "5xl", xl: "6xl" }}
                >
                  order-of-kings
                </Heading>
              </Box>
              <Text fontSize={{ base: "lg", md: "xl" }} color="gray.700" fontWeight="medium">
                英傑・技能・編成をひとつの画面で扱える戦略ツールです。
              </Text>
              <Text maxW="2xl" color="gray.600" lineHeight="1.8">
                武将データの確認、編成の検討、技能の比較、手持ち管理までをまとめています。
                まずは一覧を見て、必要な画面へそのまま移動できます。
              </Text>
              <Flex gap={4} wrap="wrap">
                <Link to="/warriors" style={{ textDecoration: "none" }}>
                  <Button
                    size="lg"
                    colorPalette="gray"
                    bg="gray.900"
                    color="white"
                    px={8}
                    rounded="md"
                    _hover={{ bg: "gray.700" }}
                  >
                    武将を見る
                  </Button>
                </Link>
                <Link to="/formation" style={{ textDecoration: "none" }}>
                  <Button
                    size="lg"
                    variant="outline"
                    borderColor="gray.300"
                    color="gray.800"
                    px={8}
                    rounded="md"
                    _hover={{ bg: "white" }}
                  >
                    軍略編成へ
                  </Button>
                </Link>
              </Flex>
            </VStack>

            <Box
              w={{ base: "full", lg: "24rem" }}
              rounded="xl"
              borderWidth="1px"
              borderColor="gray.200"
              bg="white"
              p={{ base: 6, md: 8 }}
            >
              <VStack align="stretch" gap={6}>
                <Text color="gray.500" fontSize="sm" letterSpacing="0.12em" textTransform="uppercase">
                  Latest updates
                </Text>
                <VStack align="stretch" gap={4}>
                  <Box pb={4} borderBottomWidth="1px" borderColor="gray.100">
                    <Text color="gray.500" fontSize="sm">
                      収録データ
                    </Text>
                    <Text fontSize="2xl" fontWeight="semibold">
                      Warriors: 86名 / Skills: 261件
                    </Text>
                  </Box>
                  <Box pb={4} borderBottomWidth="1px" borderColor="gray.100">
                    <Text color="gray.500" fontSize="sm">
                      最近の機能
                    </Text>
                    <Text fontSize="lg" fontWeight="semibold">
                      所持武将管理と編成ビルダーを追加
                    </Text>
                  </Box>
                  <Box>
                    <Text color="gray.500" fontSize="sm">
                      使い方
                    </Text>
                    <Text color="gray.600" lineHeight="1.8">
                      武将一覧で確認を始めて、必要に応じて編成や技能比較に進む構成です。
                    </Text>
                  </Box>
                </VStack>
              </VStack>
            </Box>
          </Flex>

          <Box
            rounded="xl"
            borderWidth="1px"
            borderColor="gray.200"
            bg="white"
            p={{ base: 6, md: 8 }}
          >
            <VStack align="stretch" gap={8}>
              <Box>
                <Text color="gray.500" fontSize="sm" letterSpacing="0.12em" textTransform="uppercase" mb={3}>
                  Main sections
                </Text>
                <Heading size="2xl" fontWeight="bold" color="gray.900">
                  よく使う画面へすぐ移動できます
                </Heading>
              </Box>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                {features.map((feature) => (
                  <Link key={feature.href} to={feature.href} style={{ textDecoration: "none" }}>
                    <Box
                      h="full"
                      rounded="lg"
                      borderWidth="1px"
                      borderColor="gray.200"
                      bg="gray.50"
                      p={6}
                      transition="border-color 0.2s ease, background-color 0.2s ease"
                      _hover={{
                        borderColor: "gray.400",
                        bg: "white",
                      }}
                    >
                      <VStack align="flex-start" gap={4}>
                        <Flex
                          align="center"
                          justify="center"
                          w={12}
                          h={12}
                          rounded="md"
                          bg="white"
                          color="gray.700"
                          fontSize="2xl"
                        >
                          {feature.icon}
                        </Flex>
                        <Box>
                          <Heading size="lg" mb={2}>
                            {feature.title}
                          </Heading>
                          <Text color="gray.600" lineHeight="1.8">
                            {feature.description}
                          </Text>
                        </Box>
                        <Text color="gray.700" fontWeight="semibold" fontSize="sm">
                          進む
                        </Text>
                      </VStack>
                    </Box>
                  </Link>
                ))}
              </SimpleGrid>
            </VStack>
          </Box>

          <Text textAlign="center" color="gray.500" fontSize="sm">
            © order-of-kings
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
