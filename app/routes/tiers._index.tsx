import { Box, Heading, Text } from "@chakra-ui/react";
import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [
  { title: "ティア表 - 王の碁盤" },
  { name: "description", content: "編成ランク表（準備中）" },
];

export default function TierBoardPage() {
  return (
    <Box p={{ base: 4, md: 8 }} maxW="1200px" mx="auto">
      <Heading size="lg" mb={4}>ティア表</Heading>
      <Text color="gray.400">ランク表画面は準備中です。</Text>
    </Box>
  );
}
