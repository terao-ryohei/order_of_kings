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
  { title: "王の勅命" },
  { name: "description", content: "天下の英傑を、汝の手で導く戦略絵巻。" },
];

const features = [
  {
    icon: "⚔",
    title: "英傑図鑑",
    description: "全武将・技能を閲覧し、戦場に立つ英傑たちの素性を見極める。",
    href: "/warriors",
  },
  {
    icon: "🏯",
    title: "軍略編成",
    description: "部隊を組み合わせ、編成スコアと相乗効果を見ながら陣形を練る。",
    href: "/formation",
  },
  {
    icon: "📜",
    title: "技能書庫",
    description: "技能を検索・比較し、采配に必要な知見を静かに積み上げる。",
    href: "/skills",
  },
  {
    icon: "🛡",
    title: "所持武将",
    description: "手持ちの武将を登録・管理し、現有戦力を即座に把握する。",
    href: "/my-warriors",
  },
] as const;

export default function Index() {
  return (
    <Box
      minH="100vh"
      color="white"
      bg="gray.950"
      backgroundImage="
        radial-gradient(circle at top, rgba(236, 201, 75, 0.18), transparent 32%),
        linear-gradient(135deg, rgba(10, 10, 10, 1) 0%, rgba(23, 23, 23, 1) 48%, rgba(38, 21, 21, 1) 100%)
      "
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        insetX="0"
        top="0"
        h="1px"
        bgGradient="linear(to-r, transparent, yellow.400, red.400, transparent)"
        opacity={0.9}
      />
      <Box
        position="absolute"
        top="-10rem"
        right="-6rem"
        w="24rem"
        h="24rem"
        rounded="full"
        bg="yellow.400"
        opacity={0.08}
        filter="blur(72px)"
      />
      <Box
        position="absolute"
        bottom="-8rem"
        left="-4rem"
        w="20rem"
        h="20rem"
        rounded="full"
        bg="red.400"
        opacity={0.08}
        filter="blur(80px)"
      />

      <Container maxW="7xl" px={{ base: 5, md: 8 }} py={{ base: 12, md: 20 }}>
        <VStack align="stretch" gap={{ base: 14, md: 20 }}>
          <Flex
            direction={{ base: "column", lg: "row" }}
            justify="space-between"
            align={{ base: "flex-start", lg: "center" }}
            gap={{ base: 10, lg: 16 }}
          >
            <VStack align="flex-start" gap={6} maxW="3xl">
              <HStack
                px={4}
                py={2}
                rounded="full"
                borderWidth="1px"
                borderColor="whiteAlpha.300"
                bg="whiteAlpha.100"
                color="yellow.200"
                fontSize="sm"
                letterSpacing="0.24em"
                textTransform="uppercase"
              >
                <Text>Imperial Command</Text>
              </HStack>
              <Box>
                <Text
                  color="yellow.300"
                  fontSize={{ base: "sm", md: "md" }}
                  letterSpacing="0.4em"
                  textTransform="uppercase"
                  mb={3}
                >
                  Royal Edict
                </Text>
                <Heading
                  as="h1"
                  fontWeight="black"
                  letterSpacing="0.18em"
                  lineHeight="0.95"
                  fontSize={{ base: "4xl", md: "6xl", xl: "7xl" }}
                  textTransform="uppercase"
                >
                  王の勅命
                </Heading>
              </Box>
              <Text fontSize={{ base: "xl", md: "2xl" }} color="gray.200" fontWeight="medium">
                天下の英傑を、汝の手で導け。
              </Text>
              <Text maxW="2xl" color="gray.400" lineHeight="1.9">
                墨色の戦場に金の采配を走らせ、英傑・技能・編成を一望する戦略書。
                静かに構え、一手で戦局を変えるための御前会議がここにある。
              </Text>
              <Flex gap={4} wrap="wrap">
                <Link to="/warriors" style={{ textDecoration: "none" }}>
                  <Button
                    size="lg"
                    colorPalette="yellow"
                    bg="yellow.400"
                    color="gray.950"
                    px={8}
                    rounded="full"
                    _hover={{ bg: "yellow.300", transform: "translateY(-1px)" }}
                  >
                    武将を見る
                  </Button>
                </Link>
                <Link to="/formation" style={{ textDecoration: "none" }}>
                  <Button
                    size="lg"
                    variant="outline"
                    colorPalette="red"
                    borderColor="whiteAlpha.400"
                    color="white"
                    px={8}
                    rounded="full"
                    _hover={{ bg: "whiteAlpha.100" }}
                  >
                    軍略編成へ
                  </Button>
                </Link>
              </Flex>
            </VStack>

            <Box
              w={{ base: "full", lg: "24rem" }}
              rounded="3xl"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              bg="linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))"
              boxShadow="0 30px 80px rgba(0,0,0,0.35)"
              p={{ base: 6, md: 8 }}
            >
              <VStack align="stretch" gap={6}>
                <Text color="yellow.200" fontSize="sm" letterSpacing="0.28em" textTransform="uppercase">
                  Campaign Ledger
                </Text>
                <VStack align="stretch" gap={4}>
                  <Box pb={4} borderBottomWidth="1px" borderColor="whiteAlpha.200">
                    <Text color="gray.400" fontSize="sm">
                      主戦場
                    </Text>
                    <Text fontSize="2xl" fontWeight="bold">
                      英傑図鑑 / 編成 / 書庫
                    </Text>
                  </Box>
                  <Box pb={4} borderBottomWidth="1px" borderColor="whiteAlpha.200">
                    <Text color="gray.400" fontSize="sm">
                      推奨の初手
                    </Text>
                    <Text fontSize="lg" fontWeight="semibold">
                      武将確認から部隊設計へ
                    </Text>
                  </Box>
                  <Box>
                    <Text color="gray.400" fontSize="sm">
                      戦略信条
                    </Text>
                    <Text color="gray.200" lineHeight="1.8">
                      情報を集め、相性を読み、静かに勝つ。王の勅命は、その一連の判断を磨くための戦略盤である。
                    </Text>
                  </Box>
                </VStack>
              </VStack>
            </Box>
          </Flex>

          <Box
            rounded="3xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.50"
            backdropFilter="blur(18px)"
            p={{ base: 6, md: 8 }}
          >
            <VStack align="stretch" gap={8}>
              <Box>
                <Text color="yellow.300" fontSize="sm" letterSpacing="0.28em" textTransform="uppercase" mb={3}>
                  Strategic Gateways
                </Text>
                <Heading size="2xl" fontWeight="extrabold">
                  四つの導線で、戦場の判断を研ぎ澄ます
                </Heading>
              </Box>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                {features.map((feature) => (
                  <Link key={feature.href} to={feature.href} style={{ textDecoration: "none" }}>
                    <Box
                      h="full"
                      rounded="2xl"
                      borderWidth="1px"
                      borderColor="whiteAlpha.200"
                      bg="linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))"
                      p={6}
                      transition="transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease"
                      _hover={{
                        transform: "translateY(-4px)",
                        borderColor: "yellow.400",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
                      }}
                    >
                      <VStack align="flex-start" gap={4}>
                        <Flex
                          align="center"
                          justify="center"
                          w={12}
                          h={12}
                          rounded="xl"
                          bg="rgba(236, 201, 75, 0.14)"
                          color="yellow.200"
                          fontSize="2xl"
                        >
                          {feature.icon}
                        </Flex>
                        <Box>
                          <Heading size="lg" mb={2}>
                            {feature.title}
                          </Heading>
                          <Text color="gray.300" lineHeight="1.8">
                            {feature.description}
                          </Text>
                        </Box>
                        <Text color="red.300" fontWeight="bold" fontSize="sm" letterSpacing="0.08em">
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
            © 王の勅命
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
