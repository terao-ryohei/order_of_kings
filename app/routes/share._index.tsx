import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useState } from "react";
import { skills, warriors } from "../../server/db/schema";
import { useMySkills } from "../hooks/useMySkills";
import { useMyWarriors } from "../hooks/useMyWarriors";
import { useSavedFormations } from "../hooks/useSavedFormations";

export async function loader({ context }: LoaderFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);
  const result = await db
    .select({ id: warriors.id, name: warriors.name })
    .from(warriors)
    .where(eq(warriors.is_delete, false))
    .orderBy(asc(warriors.sort_order));
  const allSkills = await db
    .select({ id: skills.id, name: skills.name, skill_type: skills.skill_type })
    .from(skills)
    .where(eq(skills.is_delete, false))
    .orderBy(asc(skills.sort_order));
  return { warriors: result, allSkills };
}

export const meta: MetaFunction = () => [
  { title: "共有 - 王の勅命" },
  { name: "description", content: "手持ち武将と保存編成を共有するページ" },
];

export default function ShareIndexPage() {
  const { warriors: allWarriors, allSkills } = useLoaderData<typeof loader>();
  const { myWarriorIds, warriorCounts, isHydrated, getCount } = useMyWarriors();
  const { mySkillIds, isHydrated: skillsHydrated } = useMySkills();
  const { savedFormations } = useSavedFormations();

  const [includeWarriors, setIncludeWarriors] = useState(true);
  const [includeSkills, setIncludeSkills] = useState(true);
  const [selectedFormationIds, setSelectedFormationIds] = useState<Set<string>>(
    new Set()
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleFormation = (id: string) => {
    setSelectedFormationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  };

  const handleShare = async () => {
    setIsLoading(true);
    setError(null);
    setShareUrl(null);
    setCopied(false);

    try {
      const selectedFormations = savedFormations.filter((f) =>
        selectedFormationIds.has(f.id)
      );

      const warriorIdsWithCounts = Object.entries(warriorCounts).flatMap(
        ([id, count]) => Array(count).fill(Number(id))
      );

      const res = await fetch("/api/share-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrior_ids:
            includeWarriors && warriorIdsWithCounts.length > 0
              ? warriorIdsWithCounts
              : null,
          formations: selectedFormations,
          skill_ids:
            includeSkills && mySkillIds.length > 0 ? mySkillIds : null,
        }),
      });

      if (!res.ok) {
        throw new Error("共有URLの発行に失敗しました");
      }

      const data = await res.json<{ url: string }>();
      setShareUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch" maxW="800px" mx="auto">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <VStack align="start" gap={1}>
            <Heading size="xl" color="white">
              共有設定
            </Heading>
            <Text fontSize="sm" color="gray.400">
              手持ち武将と保存編成をまとめて共有できる
            </Text>
          </VStack>
          <Link to="/" style={{ color: "#A0AEC0", fontSize: "14px" }}>
            ← トップへ戻る
          </Link>
        </Flex>

        {/* 手持ち武将 */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="2xl"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          p={5}
        >
          <VStack align="stretch" gap={3}>
            <Heading size="md" color="yellow.300">
              手持ち武将
            </Heading>
            {!isHydrated ? (
              <Text color="gray.400" fontSize="sm">
                読み込み中...
              </Text>
            ) : myWarriorIds.length === 0 ? (
              <Text color="gray.400" fontSize="sm">
                手持ち武将が登録されていません。
                <Link
                  to="/my-warriors"
                  style={{ color: "#ECC94B", marginLeft: "4px" }}
                >
                  手持ち武将を登録
                </Link>
              </Text>
            ) : (
              <VStack align="stretch" gap={3}>
                <Flex align="center" gap={3}>
                  <Checkbox.Root
                    checked={includeWarriors}
                    onCheckedChange={(e) => setIncludeWarriors(!!e.checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>
                      <Text color="white" fontSize="sm">
                        手持ち武将を含める（{myWarriorIds.length}種）
                      </Text>
                    </Checkbox.Label>
                  </Checkbox.Root>
                </Flex>
                {includeWarriors && (
                  <Box
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="whiteAlpha.100"
                    p={3}
                  >
                    <Text fontSize="xs" color="gray.400" mb={2}>
                      共有される手持ち武将 ({myWarriorIds.length}種)
                    </Text>
                    <Flex gap={2} flexWrap="wrap">
                      {allWarriors
                        .filter((w) => myWarriorIds.includes(w.id))
                        .map((w) => (
                          <Badge
                            key={w.id}
                            colorPalette="yellow"
                            variant="subtle"
                            fontSize="xs"
                          >
                            {getCount(w.id) > 1
                              ? `${w.name}×${getCount(w.id)}`
                              : w.name}
                          </Badge>
                        ))}
                    </Flex>
                  </Box>
                )}
              </VStack>
            )}
          </VStack>
        </Box>

        {/* 手持ちスキル */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="2xl"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          p={5}
        >
          <VStack align="stretch" gap={3}>
            <Heading size="md" color="yellow.300">
              手持ちスキル
            </Heading>
            {!skillsHydrated ? (
              <Text color="gray.400" fontSize="sm">
                読み込み中...
              </Text>
            ) : mySkillIds.length === 0 ? (
              <Text color="gray.400" fontSize="sm">
                手持ちスキルが登録されていません。
                <Link
                  to="/my-skills"
                  style={{ color: "#ECC94B", marginLeft: "4px" }}
                >
                  手持ちスキルを登録
                </Link>
              </Text>
            ) : (
              <VStack align="stretch" gap={3}>
                <Flex align="center" gap={3}>
                  <Checkbox.Root
                    checked={includeSkills}
                    onCheckedChange={(e) => setIncludeSkills(!!e.checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>
                      <Text color="white" fontSize="sm">
                        手持ちスキルを含める（{mySkillIds.length}個）
                      </Text>
                    </Checkbox.Label>
                  </Checkbox.Root>
                </Flex>
                {includeSkills && (
                  <Box
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="whiteAlpha.100"
                    p={3}
                  >
                    <Text fontSize="xs" color="gray.400" mb={2}>
                      共有されるスキル ({mySkillIds.length}個)
                    </Text>
                    <Flex gap={2} flexWrap="wrap">
                      {allSkills
                        .filter((s) => mySkillIds.includes(s.id))
                        .map((s) => (
                          <Badge
                            key={s.id}
                            colorPalette="purple"
                            variant="subtle"
                            fontSize="xs"
                          >
                            {s.name}
                          </Badge>
                        ))}
                    </Flex>
                  </Box>
                )}
              </VStack>
            )}
          </VStack>
        </Box>

        {/* 保存編成 */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="2xl"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          p={5}
        >
          <VStack align="stretch" gap={3}>
            <Flex justify="space-between" align="center">
              <Heading size="md" color="yellow.300">
                保存編成
              </Heading>
              <Text fontSize="xs" color="gray.400">
                最大5個まで選択可
              </Text>
            </Flex>
            {savedFormations.length === 0 ? (
              <Text color="gray.400" fontSize="sm">
                保存済み編成がありません。
                <Link
                  to="/formation"
                  style={{ color: "#ECC94B", marginLeft: "4px" }}
                >
                  編成作成
                </Link>
              </Text>
            ) : (
              <VStack align="stretch" gap={2}>
                {savedFormations.map((f) => {
                  const checked = selectedFormationIds.has(f.id);
                  const disabled = !checked && selectedFormationIds.size >= 5;
                  return (
                    <Box
                      key={f.id}
                      bg={checked ? "rgba(236, 201, 75, 0.08)" : "transparent"}
                      borderRadius="xl"
                      borderWidth="1px"
                      borderColor={checked ? "yellow.600" : "whiteAlpha.200"}
                      p={3}
                      opacity={disabled ? 0.4 : 1}
                    >
                      <Checkbox.Root
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() => toggleFormation(f.id)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>
                          <VStack align="start" gap={0} ml={1}>
                            <Text color="white" fontSize="sm" fontWeight="bold">
                              {f.name}
                            </Text>
                            <Text color="gray.400" fontSize="xs">
                              武{f.total_score.atk} 知{f.total_score.int} 胆
                              {f.total_score.guts}
                            </Text>
                          </VStack>
                        </Checkbox.Label>
                      </Checkbox.Root>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </VStack>
        </Box>

        {/* 発行ボタン */}
        <Button
          colorPalette="yellow"
          size="lg"
          onClick={handleShare}
          loading={isLoading}
          disabled={!includeWarriors && !includeSkills && selectedFormationIds.size === 0}
        >
          共有URLを発行
        </Button>

        {error && (
          <Text color="red.400" fontSize="sm" textAlign="center">
            {error}
          </Text>
        )}

        {/* 発行済みURL */}
        {shareUrl && (
          <Box
            bg="rgba(236, 201, 75, 0.08)"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="yellow.700"
            p={5}
          >
            <VStack align="stretch" gap={3}>
              <Text color="yellow.300" fontWeight="bold" fontSize="sm">
                共有URLが発行されました
              </Text>
              <Input
                value={shareUrl}
                readOnly
                bg="gray.900"
                color="white"
                borderColor="whiteAlpha.300"
                fontSize="sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                colorPalette={copied ? "green" : "yellow"}
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? "コピー済み ✓" : "URLをコピー"}
              </Button>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
