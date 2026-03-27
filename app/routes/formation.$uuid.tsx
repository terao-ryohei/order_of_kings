import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { sharedFormations, warriors } from "../../server/db/schema";

type Slot = {
  warrior_id: number;
  role_label: string;
  warrior_name: string | null;
};

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.formation.name ?? "共有編成"} - 王の算盤` },
];

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { uuid } = params;
  const db = drizzle((context.cloudflare as any).env.DB);

  const [formation] = await db
    .select()
    .from(sharedFormations)
    .where(eq(sharedFormations.uuid, uuid!));

  if (!formation) throw new Response("Not Found", { status: 404 });

  const slots: { warrior_id: number; role_label: string }[] = JSON.parse(formation.slots);
  const warriorIds = [...new Set(slots.map((s) => s.warrior_id))];

  const warriorRows = await Promise.all(
    warriorIds.map((id) =>
      db.select().from(warriors).where(eq(warriors.id, id)).then((r) => r[0])
    )
  );
  const warriorMap = new Map(warriorRows.filter(Boolean).map((w) => [w!.id, w!]));

  const enrichedSlots: Slot[] = slots.map((slot) => ({
    ...slot,
    warrior_name: warriorMap.get(slot.warrior_id)?.name ?? null,
  }));

  return { formation: { ...formation, slots: enrichedSlots } };
}

export default function FormationPage() {
  const { formation } = useLoaderData<typeof loader>();

  function handleCopy() {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sharedFormationCopied") ?? "[]";
    const list: string[] = JSON.parse(saved);
    if (!list.includes(formation.uuid)) {
      list.push(formation.uuid);
    }
    localStorage.setItem("sharedFormationCopied", JSON.stringify(list));
    localStorage.setItem(`formation_${formation.uuid}`, JSON.stringify(formation));
    alert("編成をコピーしました（LocalStorageに保存）");
  }

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch" maxW="600px" mx="auto">
        <Heading size="xl" color="white">
          {formation.name ?? "共有編成"}
        </Heading>

        {formation.purpose && (
          <Text color="gray.300">
            目的: {formation.purpose}
          </Text>
        )}

        {formation.total_score != null && (
          <Text fontWeight="bold" color="gray.200">
            総合スコア: {formation.total_score}
          </Text>
        )}

        <VStack gap={3} align="stretch">
          {(formation.slots as Slot[]).map((slot, i) => (
            <Box
              key={i}
              bg="whiteAlpha.100"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              p={4}
            >
              <Flex justify="space-between" align="center">
                <Text fontWeight="bold">
                  {slot.warrior_name ?? `武将ID: ${slot.warrior_id}`}
                </Text>
                <Badge colorPalette="blue">{slot.role_label}</Badge>
              </Flex>
            </Box>
          ))}
        </VStack>

        {(formation.slots as Slot[]).length === 0 && (
          <Text color="gray.500" textAlign="center">
            スロットが空です
          </Text>
        )}

        <Button colorPalette="green" onClick={handleCopy}>
          この編成をコピー
        </Button>

        <Text fontSize="xs" color="gray.500">
          作成日時: {formation.created_at ?? "—"}
        </Text>
      </VStack>
    </Box>
  );
}
