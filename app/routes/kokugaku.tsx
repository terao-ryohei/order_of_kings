import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";
import { useKokugakuLevels } from "../hooks/useKokugakuLevels";
import {
  clampKokugakuLevel,
  KOKUGAKU_ENTRIES,
  KOKUGAKU_STAT_LABELS,
} from "../lib/kokugaku";

export const meta: MetaFunction = () => [
  { title: "所持国学 | 王の碁盤" },
  {
    name: "description",
    content: "国学の研究進捗を保存し、編成全体にかかる補正を管理する",
  },
];

export default function KokugakuPage() {
  const { levels, bonuses, setLevel } = useKokugakuLevels();

  return (
    <Box minH="100vh" bg="gray.950" color="white">
      <Container maxW="6xl" px={{ base: 4, md: 6 }} py={{ base: 8, md: 10 }}>
        <VStack align="stretch" gap={8}>
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "flex-start", md: "center" }}
            gap={4}
          >
            <Box>
              <Text
                color="yellow.300"
                fontSize="sm"
                letterSpacing="0.22em"
                textTransform="uppercase"
              >
                Kokugaku Command
              </Text>
              <Heading size="2xl" mt={2}>
                所持国学
              </Heading>
              <Text color="gray.400" mt={3}>
                国学の研究進捗を保存し、編成全体にかかる補正を管理する
              </Text>
            </Box>
          </Flex>

          <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6}>
            <Box
              gridColumn={{ base: "auto", xl: "span 2" }}
              bg="whiteAlpha.100"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              p={{ base: 5, md: 6 }}
            >
              <VStack align="stretch" gap={5}>
                <Box>
                  <Text
                    color="yellow.300"
                    fontSize="sm"
                    letterSpacing="0.18em"
                    textTransform="uppercase"
                  >
                    Research Levels
                  </Text>
                  <Heading size="lg" mt={2}>
                    国学ごとの研究段階
                  </Heading>
                </Box>

                <VStack align="stretch" gap={4}>
                  {KOKUGAKU_ENTRIES.map((entry) => {
                    const level = levels[entry.id] ?? 0;
                    const bonusValue = level * entry.bonusPerLevel;

                    return (
                      <Box
                        key={entry.id}
                        bg="blackAlpha.400"
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor="whiteAlpha.200"
                        p={4}
                      >
                        <Flex
                          direction={{ base: "column", md: "row" }}
                          justify="space-between"
                          align={{ base: "flex-start", md: "center" }}
                          gap={4}
                        >
                          <Box>
                            <HStack gap={3} wrap="wrap">
                              <Heading size="md">{entry.name}</Heading>
                              <Badge colorPalette="yellow" variant="subtle">
                                {KOKUGAKU_STAT_LABELS[entry.stat]}補正
                              </Badge>
                            </HStack>
                            <Text color="gray.400" mt={2}>
                              1Lvごとに{KOKUGAKU_STAT_LABELS[entry.stat]}+
                              {entry.bonusPerLevel}。 現在は全武将へ +
                              {bonusValue}。
                            </Text>
                          </Box>

                          <HStack gap={3}>
                            <Button
                              size="sm"
                              variant="outline"
                              minH="44px"
                              minW="44px"
                              onClick={() =>
                                setLevel(
                                  entry.id,
                                  clampKokugakuLevel(level - 1, entry.maxLevel)
                                )
                              }
                            >
                              -
                            </Button>
                            <VStack gap={0} minW={{ base: "3rem", md: "5rem" }}>
                              <Text fontSize="2xl" fontWeight="bold">
                                {level}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                / {entry.maxLevel} Lv
                              </Text>
                            </VStack>
                            <Button
                              size="sm"
                              colorPalette="yellow"
                              minH="44px"
                              minW="44px"
                              onClick={() =>
                                setLevel(
                                  entry.id,
                                  clampKokugakuLevel(level + 1, entry.maxLevel)
                                )
                              }
                            >
                              +
                            </Button>
                          </HStack>
                        </Flex>
                      </Box>
                    );
                  })}
                </VStack>
              </VStack>
            </Box>

            <Box
              bg="linear-gradient(180deg, rgba(236,201,75,0.14), rgba(255,255,255,0.04))"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="yellow.700"
              p={{ base: 5, md: 6 }}
            >
              <VStack align="stretch" gap={5}>
                <Box>
                  <Text
                    color="yellow.200"
                    fontSize="sm"
                    letterSpacing="0.18em"
                    textTransform="uppercase"
                  >
                    Active Bonus
                  </Text>
                  <Heading size="lg" mt={2}>
                    現在の補正効果
                  </Heading>
                </Box>

                <VStack align="stretch" gap={3}>
                  {Object.entries(bonuses).map(([stat, value]) => (
                    <Box key={stat} bg="blackAlpha.300" borderRadius="xl" p={4}>
                      <Text color="gray.400" fontSize="sm">
                        {KOKUGAKU_STAT_LABELS[stat as keyof typeof bonuses]}
                      </Text>
                      <Text fontSize="2xl" fontWeight="bold" textAlign="right">
                        +{value}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            </Box>
          </SimpleGrid>
        </VStack>
      </Container>
    </Box>
  );
}
