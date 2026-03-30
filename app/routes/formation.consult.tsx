import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  Text,
  VStack,
  chakra,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useState } from "react";
import {
  type SquadRecommendation,
  type SquadType,
  type WarriorForSquad,
  type WeaponType,
  scoreSquad,
} from "../lib/squadScorer";
import { useMyWarriors } from "../hooks/useMyWarriors";
import { warriors, warriorRoles, weaponAptitudes, warriorSkills, skills } from "../../server/db/schema";

export const meta: MetaFunction = () => [
  { title: "編成相談 - 王の算盤" },
  { name: "description", content: "手持ち武将から最適な3スロット編成を提案します" },
];

export async function loader({ context }: LoaderFunctionArgs) {
  const db = drizzle((context.cloudflare as any).env.DB);

  const allWarriors = await db
    .select()
    .from(warriors)
    .where(eq(warriors.is_delete, false))
    .orderBy(asc(warriors.sort_order));

  const allRoles = await db.select().from(warriorRoles);
  const allAptitudes = await db.select().from(weaponAptitudes);
  const allWarriorSkills = await db.select().from(warriorSkills);
  const allSkills = await db.select().from(skills).where(eq(skills.is_delete, false));

  const skillMap = new Map(allSkills.map((s) => [s.id, s]));

  const warriorsForSquad = allWarriors.map((w) => ({
    id: w.id,
    name: w.name,
    rarity: w.rarity,
    cost: w.cost,
    atk: w.atk,
    intelligence: w.int,
    guts: w.guts,
    pol: w.pol,
    roles: allRoles.filter((r) => r.warrior_id === w.id).map((r) => r.role),
    aptitudes: allAptitudes
      .filter((a) => a.warrior_id === w.id)
      .map((a) => ({ weapon: a.weapon_type, level: a.aptitude })),
    skills: allWarriorSkills
      .filter((ws) => ws.warrior_id === w.id)
      .flatMap((ws) => {
        const skill = skillMap.get(ws.skill_id);
        if (!skill) return [];
        return [{ skill_type: skill.skill_type, name: skill.name }];
      }),
  }));

  return { warriors: warriorsForSquad };
}

const SQUAD_TYPES: { type: SquadType; desc: string; icon: string }[] = [
  { type: "連鎖武力", desc: "通常攻撃から連鎖スキルで安定DPS", icon: "⚔️" },
  { type: "怒気武力", desc: "怒気ゲージ溜まり次第、高倍率で爆発", icon: "🔥" },
  { type: "能動武力", desc: "アクティブスキルの瞬間火力", icon: "💥" },
  { type: "耐久型",   desc: "被ダメ軽減・回復で兵損を最小化", icon: "🛡️" },
  { type: "知力型",   desc: "知力参照ダメージで胆力高い敵にも有効", icon: "🧠" },
];

const WEAPON_OPTIONS: { value: WeaponType; label: string }[] = [
  { value: null, label: "制限なし" },
  { value: "刀", label: "刀" },
  { value: "馬", label: "馬" },
  { value: "弓", label: "弓" },
  { value: "槍", label: "槍" },
];

function ScoreBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <Flex align="center" gap={2} fontSize="xs">
      <Text w="60px" color="gray.400">
        {label}
      </Text>
      <Box flex={1} bg="gray.700" borderRadius="full" h="8px">
        <Box
          bg={clamped >= 70 ? "green.400" : clamped >= 40 ? "yellow.400" : "red.400"}
          h="100%"
          borderRadius="full"
          w={`${clamped}%`}
          transition="width 0.3s"
        />
      </Box>
      <Text w="35px" textAlign="right" fontWeight="bold">
        {value}
      </Text>
    </Flex>
  );
}

export default function FormationConsultPage() {
  const { warriors: allWarriors } = useLoaderData<typeof loader>();
  const { myWarriorIds, isHydrated, count } = useMyWarriors();

  const [squadType, setSquadType] = useState<SquadType | null>(null);
  const [enemyWeapon, setEnemyWeapon] = useState<WeaponType>(null);
  const [costLimit, setCostLimit] = useState<string>("");
  const [result, setResult] = useState<SquadRecommendation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleConsult = () => {
    if (!squadType) return;
    setIsCalculating(true);

    const myWarriors = allWarriors.filter((w) => myWarriorIds.includes(w.id));
    const costLimitNum = costLimit ? parseInt(costLimit, 10) : undefined;
    const recommendation = scoreSquad(
      myWarriors as WarriorForSquad[],
      squadType,
      enemyWeapon ?? undefined,
      costLimitNum,
    );
    setResult(recommendation);
    setIsCalculating(false);
  };

  const buildAdoptUrl = (slots: { role: string; warrior: { id: number } }[]) => {
    const params = new URLSearchParams();
    params.set("slots", JSON.stringify(slots.map((s) => ({ id: s.warrior.id, role: s.role }))));
    if (squadType) params.set("squadType", squadType);
    return `/formation?${params.toString()}`;
  };

  const canConsult = isHydrated && count > 0 && squadType !== null;

  return (
    <Box minH="100vh" bg="gray.950" p={4}>
      <VStack gap={6} align="stretch" maxW="900px" mx="auto">
        {/* ヘッダー */}
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <Heading size="xl" color="white">
            編成相談
          </Heading>
          <Link to="/my-warriors" style={{ color: "#ECC94B", fontSize: "14px" }}>
            ← 手持ち武将管理へ
          </Link>
        </Flex>

        {/* Step1: 部隊タイプ選択 */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="xl"
          p={5}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Text fontWeight="bold" mb={3}>
            Step 1: 部隊タイプを選択
          </Text>
          <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} gap={3}>
            {SQUAD_TYPES.map((opt) => (
              <chakra.button
                key={opt.type}
                type="button"
                onClick={() => {
                  setSquadType(opt.type);
                  setResult(null);
                }}
                textAlign="center"
                bg={
                  squadType === opt.type
                    ? "blue.900"
                    : "gray.700"
                }
                borderRadius="lg"
                borderWidth="2px"
                borderColor={
                  squadType === opt.type ? "blue.400" : "gray.600"
                }
                p={3}
                _hover={{ borderColor: "blue.400" }}
                transition="all 0.2s"
                cursor="pointer"
              >
                <Text fontSize="xl" mb={1}>{opt.icon}</Text>
                <Text fontWeight="bold" fontSize="sm">
                  {opt.type}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {opt.desc}
                </Text>
              </chakra.button>
            ))}
          </SimpleGrid>
        </Box>

        {/* Step2: 想定敵兵種 */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="xl"
          p={5}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Text fontWeight="bold" mb={3}>
            Step 2: 想定敵兵種（任意）
          </Text>
          <Flex gap={2} flexWrap="wrap">
            {WEAPON_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                size="sm"
                variant={enemyWeapon === opt.value ? "solid" : "outline"}
                colorPalette={enemyWeapon === opt.value ? "blue" : "gray"}
                onClick={() => {
                  setEnemyWeapon(opt.value);
                  setResult(null);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </Flex>
        </Box>

        {/* Step3: コスト上限 */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="xl"
          p={5}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Text fontWeight="bold" mb={3}>
            Step 3: コスト上限（任意）
          </Text>
          <Input
            type="number"
            placeholder="例: 15（未入力で制限なし）"
            value={costLimit}
            onChange={(e) => {
              setCostLimit(e.target.value);
              setResult(null);
            }}
            maxW="240px"
          />
        </Box>

        {/* Step4: 手持ち武将確認 */}
        <Box
          bg="whiteAlpha.100"
          borderRadius="xl"
          p={5}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <Text fontWeight="bold" mb={2}>
            Step 4: 手持ち武将
          </Text>
          {!isHydrated ? (
            <Text fontSize="sm" color="gray.400">
              読み込み中...
            </Text>
          ) : count === 0 ? (
            <VStack gap={2} align="start">
              <Text fontSize="sm" color="red.500">
                手持ち武将が登録されていません
              </Text>
              <Link
                to="/my-warriors"
                style={{ color: "#ECC94B", fontSize: "14px", fontWeight: "bold" }}
              >
                先に手持ち武将を登録してください →
              </Link>
            </VStack>
          ) : (
            <Text fontSize="sm" color="gray.300">
              手持ち {count}人 から相談します
            </Text>
          )}
        </Box>

        {/* 相談ボタン */}
        <Button
          colorPalette="blue"
          size="lg"
          disabled={!canConsult}
          loading={isCalculating}
          onClick={handleConsult}
        >
          相談する
        </Button>

        {/* 推薦結果TOP3 */}
        {result && (
          <VStack gap={4} align="stretch">
            <Heading size="lg" color="white">
              推薦部隊 TOP3
            </Heading>

            {result.top3.length === 0 ? (
              <Text color="gray.400">
                手持ち武将が少なく、編成を構築できませんでした
              </Text>
            ) : (
              result.top3.map((squad) => (
                <Box
                  key={squad.rank}
                  bg="whiteAlpha.100"
                  borderRadius="xl"
                  p={5}
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                >
                  <Flex justify="space-between" align="center" mb={3}>
                    <Flex align="center" gap={2}>
                      <Badge
                        colorPalette={squad.rank === 1 ? "yellow" : squad.rank === 2 ? "gray" : "orange"}
                        size="lg"
                        variant="solid"
                      >
                        #{squad.rank}
                      </Badge>
                      <Text fontWeight="bold" fontSize="lg">
                        総合スコア: {squad.totalScore}点
                      </Text>
                    </Flex>
                    <Flex align="center" gap={2}>
                      <Badge colorPalette="blue" variant="outline">
                        {squadType}
                      </Badge>
                      <Text fontSize="sm" color="gray.300">
                        DPS指標: {squad.dpsEstimate}
                      </Text>
                    </Flex>
                  </Flex>

                  {/* 3スロット表示 */}
                  <VStack gap={2} align="stretch" mb={4}>
                    {squad.slots.map((slot, i) => (
                      <Flex
                        key={i}
                        align="center"
                        gap={3}
                        bg="whiteAlpha.100"
                        borderRadius="md"
                        px={3}
                        py={2}
                      >
                        <Badge colorPalette="purple" size="sm" variant="outline" w="50px" textAlign="center">
                          {slot.role}
                        </Badge>
                        <Text fontWeight="bold" fontSize="sm">
                          {slot.warrior.name}
                        </Text>
                        <Text
                          fontSize="xs"
                          color={slot.warrior.rarity >= 5 ? "orange.400" : slot.warrior.rarity >= 4 ? "purple.400" : "blue.400"}
                          fontWeight="bold"
                        >
                          {"★".repeat(slot.warrior.rarity)}
                        </Text>
                        {slot.role === "軍師" && (
                          <Badge colorPalette="gray" variant="subtle" fontSize="xs">
                            スキル効果のみ（ステータス加算なし）
                          </Badge>
                        )}
                      </Flex>
                    ))}
                  </VStack>

                  {/* 説明文 */}
                  <Text fontSize="sm" color="gray.300" mb={3}>
                    {squad.description}
                  </Text>

                  {/* スコア内訳 */}
                  <VStack gap={1} align="stretch" mb={4}>
                    <ScoreBar label="タイプ" value={squad.scoreBreakdown.typeScore} />
                    <ScoreBar label="兵種" value={squad.scoreBreakdown.weaponScore} />
                    <ScoreBar label="ステータス" value={squad.scoreBreakdown.statusScore} />
                    <ScoreBar label="コスト" value={squad.scoreBreakdown.costScore} />
                    <ScoreBar label="相性" value={squad.scoreBreakdown.synergyScore} />
                  </VStack>

                  {/* 採用ボタン */}
                  <Link
                    to={buildAdoptUrl(squad.slots)}
                    style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "#3182ce",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    この編成を採用
                  </Link>
                </Box>
              ))
            )}

            {/* 未所持おすすめ武将 */}
            {result.missingWarriors.length > 0 && (
              <Box
                bg="whiteAlpha.100"
                borderRadius="xl"
                p={5}
                borderWidth="1px"
                borderColor="yellow.600"
              >
                <Text fontWeight="bold" mb={3}>
                  この武将がいると更に強くなります
                </Text>
                <VStack gap={2} align="stretch">
                  {result.missingWarriors.map((mw) => (
                    <Flex key={mw.name} align="center" gap={2}>
                      <Text fontWeight="bold" fontSize="sm">
                        {mw.name}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        — {mw.reason}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
