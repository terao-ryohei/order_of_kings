import { Box, Container, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { Link, useLocation } from "@remix-run/react";

const navItems = [
  { label: "編成", shortLabel: "編成", to: "/formation" },
  { label: "武将一覧", shortLabel: "武将", to: "/warriors" },
  { label: "スキル", shortLabel: "技能", to: "/skills" },
  { label: "国学", shortLabel: "国学", to: "/kokugaku" },
  { label: "手持ち武将", shortLabel: "手持武将", to: "/my-warriors" },
  { label: "手持ちスキル", shortLabel: "手持技能", to: "/my-skills" },
  { label: "共有", shortLabel: "共有", to: "/share" },
] as const;

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function Header() {
  const { pathname } = useLocation();

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={100}
      bg="rgba(0, 0, 0, 0.85)"
      style={{ backdropFilter: "blur(12px)" }}
      borderBottomWidth="1px"
      borderBottomColor="yellow.700"
      boxShadow="0 10px 30px rgba(0, 0, 0, 0.25)"
    >
      <Container maxW="7xl" px={{ base: 4, md: 6 }} py={{ base: 3, md: 2 }}>
        <VStack align="stretch" gap={{ base: 3, md: 2 }}>
          <Flex align="center" justify="space-between" gap={4}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <Text
                color="yellow.400"
                fontWeight="black"
                fontSize="xl"
                letterSpacing="0.2em"
                textTransform="uppercase"
                whiteSpace="nowrap"
              >
                王の算盤
              </Text>
            </Link>

            <Text
              display={{ base: "none", md: "block" }}
              color="gray.400"
              fontSize="sm"
              letterSpacing="0.12em"
              textTransform="uppercase"
            >
              Formation First Command Desk
            </Text>
          </Flex>

          <Box overflowX="auto" pb={1} css={{ scrollbarWidth: "none" }}>
            <HStack
              gap={{ base: 1.5, md: 2 }}
              flexWrap="nowrap"
              minW="max-content"
            >
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{ textDecoration: "none" }}
                  >
                    <Box
                      as="span"
                      display="inline-flex"
                      alignItems="center"
                      px={{ base: 3, md: 3.5 }}
                      py={2}
                      borderRadius="full"
                      borderWidth="1px"
                      borderColor={active ? "yellow.500" : "whiteAlpha.300"}
                      color={active ? "gray.950" : "gray.100"}
                      bg={
                        active
                          ? "linear-gradient(135deg, rgba(236, 201, 75, 1), rgba(244, 114, 36, 0.92))"
                          : "rgba(255, 255, 255, 0.04)"
                      }
                      fontWeight={active ? "bold" : "medium"}
                      fontSize={{ base: "xs", md: "sm" }}
                      whiteSpace="nowrap"
                      transition="all 0.2s ease"
                      _hover={{
                        color: active ? "gray.950" : "yellow.100",
                        borderColor: "yellow.500",
                        bg: active
                          ? "linear-gradient(135deg, rgba(236, 201, 75, 1), rgba(244, 114, 36, 0.92))"
                          : "rgba(236, 201, 75, 0.12)",
                      }}
                    >
                      <Text display={{ base: "inline", sm: "none" }}>
                        {item.shortLabel}
                      </Text>
                      <Text display={{ base: "none", sm: "inline" }}>
                        {item.label}
                      </Text>
                    </Box>
                  </Link>
                );
              })}
            </HStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
