import { Box, Container, Flex, HStack, Text } from "@chakra-ui/react";
import { Link, useLocation } from "@remix-run/react";

const navItems = [
  { label: "武将一覧", shortLabel: "武将", to: "/warriors" },
  { label: "編成", shortLabel: "編成", to: "/formation" },
  { label: "スキル", shortLabel: "技能", to: "/skills" },
  { label: "手持ち", shortLabel: "手持ち", to: "/my-warriors" },
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
      <Container maxW="7xl" px={{ base: 4, md: 6 }}>
        <Flex
          minH="64px"
          align="center"
          justify="space-between"
          gap={4}
          wrap="wrap"
          py={{ base: 3, md: 2 }}
        >
          <Link to="/" style={{ textDecoration: "none" }}>
            <Text
              color="yellow.400"
              fontWeight="black"
              fontSize="xl"
              letterSpacing="0.2em"
              textTransform="uppercase"
              whiteSpace="nowrap"
            >
              王の勅命
            </Text>
          </Link>

          <HStack gap={{ base: 1, md: 2 }} flexWrap="wrap" justify="flex-end">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.to);

              return (
                <Link key={item.to} to={item.to} style={{ textDecoration: "none" }}>
                  <Box
                    as="span"
                    display="inline-flex"
                    alignItems="center"
                    px={{ base: 2.5, md: 3 }}
                    py={2}
                    borderRadius="full"
                    borderWidth="1px"
                    borderColor={active ? "yellow.500" : "whiteAlpha.300"}
                    color={active ? "yellow.300" : "gray.200"}
                    bg={active ? "rgba(236, 201, 75, 0.14)" : "transparent"}
                    fontWeight={active ? "bold" : "medium"}
                    fontSize={{ base: "xs", md: "sm" }}
                    transition="all 0.2s ease"
                    _hover={{
                      color: "yellow.200",
                      borderColor: "yellow.500",
                      bg: "rgba(236, 201, 75, 0.1)",
                    }}
                  >
                    <Text display={{ base: "none", sm: "inline" }}>{item.label}</Text>
                    <Text display={{ base: "inline", sm: "none" }}>{item.shortLabel}</Text>
                  </Box>
                </Link>
              );
            })}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
