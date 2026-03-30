import {
  Badge,
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
import updatesData from "~/data/updates.json";

const updates = updatesData.updates;

export const meta: MetaFunction = () => [
  { title: "王の算盤" },
  { name: "description", content: "天下の英傑を、汝の手で導く戦略絵巻。" },
];

const features = [
  {
    icon: "🏯",
    title: "軍略編成",
    description: "部隊を組み合わせ、編成スコアと相乗効果を見ながら陣形を練る。",
    href: "/formation",
    spotlight: true,
  },
  {
    icon: "⚔",
    title: "英傑図鑑",
    description: "全武将・技能を閲覧し、戦場に立つ英傑たちの素性を見極める。",
    href: "/warriors",
  },
  {
    icon: "📜",
    title: "技能書庫",
    description: "技能を検索・比較し、采配に必要な知見を静かに積み上げる。",
    href: "/skills",
  },
  {
    icon: "🎓",
    title: "所持国学",
    description: "研究段階を管理し、編成全体へかかる人材補正を整える。",
    href: "/kokugaku",
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
              <Box>
                <Text
                  color="yellow.300"
                  fontSize={{ base: "sm", md: "md" }}
                  letterSpacing="0.4em"
                  textTransform="uppercase"
                  mb={3}
                >
                  Formation First
                </Text>
                <Heading
                  as="h1"
                  fontWeight="black"
                  letterSpacing={{ base: "0.08em", md: "0.12em" }}
                  lineHeight="1.02"
                  fontSize={{ base: "4xl", md: "5xl", xl: "6xl" }}
                >
                  編成を起点に、
                  <br />
                  天下の采配を組み上げる
                </Heading>
              </Box>
              <Text maxW="2xl" color="gray.300" lineHeight="1.9" fontSize={{ md: "lg" }}>
                主役は軍略編成。武将、技能、国学、所持戦力の情報を一か所へ束ね、
                まず部隊を組み、その後に細部を詰めるための司令卓として再構成した。
              </Text>
              <Link to="/formation" style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  colorPalette="yellow"
                  bg="linear-gradient(135deg, #f6e05e 0%, #f97316 100%)"
                  color="gray.950"
                  px={{ base: 8, md: 10 }}
                  py={7}
                  rounded="full"
                  fontSize={{ base: "md", md: "lg" }}
                  fontWeight="bold"
                  boxShadow="0 16px 40px rgba(249, 115, 22, 0.3)"
                  _hover={{ transform: "translateY(-2px)", boxShadow: "0 20px 48px rgba(249, 115, 22, 0.38)" }}
                >
                  編成ビルダーへ
                </Button>
              </Link>
              <VStack align="flex-start" gap={3}>
                <Text color="gray.500" fontSize="sm" letterSpacing="0.16em" textTransform="uppercase">
                  関連導線
                </Text>
                <HStack gap={4} wrap="wrap">
                  <Link to="/warriors" style={{ textDecoration: "none" }}>
                    <Text color="yellow.200" fontSize="sm" fontWeight="semibold">
                      武将一覧
                    </Text>
                  </Link>
                  <Link to="/skills" style={{ textDecoration: "none" }}>
                    <Text color="yellow.200" fontSize="sm" fontWeight="semibold">
                      技能書庫
                    </Text>
                  </Link>
                  <Link to="/kokugaku" style={{ textDecoration: "none" }}>
                    <Text color="yellow.200" fontSize="sm" fontWeight="semibold">
                      所持国学
                    </Text>
                  </Link>
                </HStack>
              </VStack>
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
                <Text
                  color="yellow.200"
                  fontSize="sm"
                  letterSpacing="0.28em"
                  textTransform="uppercase"
                >
                  更新一覧
                </Text>
                <VStack align="stretch" gap={4}>
                  {updates.slice(0, 3).map((entry, i) => (
                    <Box
                      key={i}
                      pb={4}
                      borderBottomWidth={i < 2 ? "1px" : "0"}
                      borderColor="whiteAlpha.200"
                    >
                      <Text color="gray.400" fontSize="sm">
                        {entry.date}
                      </Text>
                      <Text fontSize="lg" fontWeight="semibold">
                        {entry.title}
                      </Text>
                      <Text color="gray.200" lineHeight="1.8" fontSize="sm">
                        {entry.description}
                      </Text>
                    </Box>
                  ))}
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
                <Text
                  color="yellow.300"
                  fontSize="sm"
                  letterSpacing="0.28em"
                  textTransform="uppercase"
                  mb={3}
                >
                  Strategic Gateways
                </Text>
                <Heading size="2xl" fontWeight="extrabold">
                  編成を核に、必要な情報へ素早く遷移する
                </Heading>
              </Box>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
                {features.map((feature) => (
                  <Link
                    key={feature.href}
                    to={feature.href}
                    style={{
                      textDecoration: "none",
                      display: "block",
                      gridColumn: feature.spotlight ? "span 2 / span 2" : undefined,
                    }}
                  >
                    <Box
                      h="full"
                      rounded="2xl"
                      borderWidth="1px"
                      borderColor={feature.spotlight ? "orange.300" : "whiteAlpha.200"}
                      bg={
                        feature.spotlight
                          ? "linear-gradient(135deg, rgba(236, 201, 75, 0.18), rgba(249, 115, 22, 0.16), rgba(255,255,255,0.06))"
                          : "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))"
                      }
                      p={6}
                      transition="transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease"
                      _hover={{
                        transform: "translateY(-4px)",
                        borderColor: feature.spotlight ? "orange.200" : "yellow.400",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
                      }}
                    >
                      <VStack align="flex-start" gap={4}>
                        {feature.spotlight ? (
                          <Badge
                            colorPalette="orange"
                            px={3}
                            py={1}
                            borderRadius="full"
                            letterSpacing="0.12em"
                          >
                            Main Route
                          </Badge>
                        ) : null}
                        <Flex
                          align="center"
                          justify="center"
                          w={feature.spotlight ? 14 : 12}
                          h={feature.spotlight ? 14 : 12}
                          rounded="xl"
                          bg={
                            feature.spotlight
                              ? "rgba(249, 115, 22, 0.18)"
                              : "rgba(236, 201, 75, 0.14)"
                          }
                          color={feature.spotlight ? "orange.100" : "yellow.200"}
                          fontSize={feature.spotlight ? "3xl" : "2xl"}
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
                        <Text
                          color={feature.spotlight ? "orange.200" : "red.300"}
                          fontWeight="bold"
                          fontSize="sm"
                          letterSpacing="0.08em"
                        >
                          {feature.spotlight ? "主導線へ進む" : "進む"}
                        </Text>
                      </VStack>
                    </Box>
                  </Link>
                ))}
              </SimpleGrid>
            </VStack>
          </Box>

          <Text textAlign="center" color="gray.500" fontSize="sm">
            © 王の算盤
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
