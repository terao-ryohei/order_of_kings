import {
  Badge,
  Box,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { and, asc, eq, isNull, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useEffect, useRef, useState, useTransition } from "react";
import { skills, warriorSkills } from "../../server/db/schema";

function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

export const meta: MetaFunction = () => [
  { title: "スキル一覧 - 王の碁盤" },
  { name: "description", content: "スキル一覧ページ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const skill_type = url.searchParams.get("skill_type");
  const weapon_restriction = url.searchParams.get("weapon_restriction");
  const name = url.searchParams.get("name") ?? "";
  const showUnique = url.searchParams.get("showUnique") === "1";

  const db = drizzle((context.cloudflare as any).env.DB);

  const nameFilter = name ? like(skills.name, `%${name}%`) : undefined;

  let whereClause;
  if (skill_type && nameFilter) {
    whereClause = and(eq(skills.skill_type, skill_type), nameFilter);
  } else if (skill_type) {
    whereClause = eq(skills.skill_type, skill_type);
  } else if (weapon_restriction && nameFilter) {
    whereClause = and(eq(skills.weapon_restriction, weapon_restriction), nameFilter);
  } else if (weapon_restriction) {
    whereClause = eq(skills.weapon_restriction, weapon_restriction);
  } else if (nameFilter) {
    whereClause = and(eq(skills.is_delete, false), nameFilter);
  } else {
    whereClause = eq(skills.is_delete, false);
  }

  let result;
  if (!showUnique) {
    // 共通スキルのみ表示: warrior_skills に紐付きがないか is_unique=0
    result = await db
      .selectDistinct({
        id: skills.id,
        name: skills.name,
        color: skills.color,
        weapon_restriction: skills.weapon_restriction,
        skill_type: skills.skill_type,
        description: skills.description,
        rarity: skills.rarity,
        sort_order: skills.sort_order,
        is_delete: skills.is_delete,
      })
      .from(skills)
      .leftJoin(warriorSkills, eq(skills.id, warriorSkills.skill_id))
      .where(
        whereClause
          ? and(whereClause, or(isNull(warriorSkills.is_unique), eq(warriorSkills.is_unique, false)))
          : or(isNull(warriorSkills.is_unique), eq(warriorSkills.is_unique, false))
      )
      .orderBy(asc(skills.sort_order));
  } else {
    // 固有スキルのみ表示: warrior_skills.is_unique=1
    result = await db
      .selectDistinct({
        id: skills.id,
        name: skills.name,
        color: skills.color,
        weapon_restriction: skills.weapon_restriction,
        skill_type: skills.skill_type,
        description: skills.description,
        rarity: skills.rarity,
        sort_order: skills.sort_order,
        is_delete: skills.is_delete,
      })
      .from(skills)
      .leftJoin(warriorSkills, eq(skills.id, warriorSkills.skill_id))
      .where(
        whereClause
          ? and(whereClause, eq(warriorSkills.is_unique, true))
          : eq(warriorSkills.is_unique, true)
      )
      .orderBy(asc(skills.sort_order));
  }

  return { skills: result, filters: { skill_type, weapon_restriction, name, showUnique } };
}

const SKILL_TYPE_COLOR: Record<string, string> = {
  "パッシブ": "blue",
  "能動": "red",
  "連鎖": "green",
  "怒気": "orange",
};

const SKILL_COLOR_PALETTE: Record<string, string> = {
  "赤": "red",
  "紫": "purple",
  "青": "blue",
};

export default function SkillsIndex() {
  const { skills: data, filters } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nameValue, setNameValue] = useState(searchParams.get("name") ?? "");

  const handleToggleUnique = () => {
    const params = new URLSearchParams(searchParams);
    if (filters.showUnique) {
      params.delete("showUnique");
    } else {
      params.set("showUnique", "1");
    }
    navigate(params.toString() ? `?${params.toString()}` : "?", { replace: true });
  };

  useEffect(() => {
    setNameValue(searchParams.get("name") ?? "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleNameChange = (value: string) => {
    setNameValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set("name", value);
        } else {
          params.delete("name");
        }
        navigate(params.toString() ? `?${params.toString()}` : "?", { replace: true });
      });
    }, 300);
  };

  return (
    <Box minH="100vh" bg="gray.950" p={{ base: 3, md: 4 }}>
      <VStack gap={{ base: 4, md: 6 }} align="stretch">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={2}>
          <Heading size={{ base: "lg", md: "xl" }} color="white">スキル一覧</Heading>
          <Link to="/" style={{ color: "#ECC94B", fontSize: "14px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}>← 武将一覧</Link>
        </Flex>

        {/* フィルタ */}
        <Form method="get">
          <Flex gap={3} flexWrap="wrap" align="center">
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">スキルタイプ</Text>
              <select
                name="skill_type"
                defaultValue={filters.skill_type ?? ""}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "white", minHeight: "44px", fontSize: "16px" }}
              >
                <option value="">全て</option>
                <option value="パッシブ">パッシブ</option>
                <option value="能動">能動</option>
                <option value="連鎖">連鎖</option>
                <option value="怒気">怒気</option>
              </select>
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">兵種制限</Text>
              <select
                name="weapon_restriction"
                defaultValue={filters.weapon_restriction ?? ""}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "white", minHeight: "44px", fontSize: "16px" }}
              >
                <option value="">全て</option>
                <option value="刀">刀</option>
                <option value="馬">馬</option>
                <option value="弓">弓</option>
                <option value="槍">槍</option>
              </select>
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">スキル名</Text>
              <input
                name="name"
                value={nameValue}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="キーワード検索"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "white",
                  width: "100%",
                  minHeight: "44px",
                  fontSize: "16px",
                }}
              />
            </Box>
            <Box alignSelf="flex-end">
              <button
                type="submit"
                style={{ padding: "8px 20px", background: "#3182ce", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", minHeight: "44px" }}
              >
                絞り込み
              </button>
            </Box>
            {(filters.skill_type || filters.weapon_restriction || filters.name) && (
              <Box alignSelf="flex-end">
                <Link to="/skills" style={{ padding: "8px 16px", color: "#ECC94B", textDecoration: "underline", fontSize: "14px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}>
                  クリア
                </Link>
              </Box>
            )}
            <Box alignSelf="flex-end">
              <button
                type="button"
                onClick={handleToggleUnique}
                style={{
                  padding: "8px 16px",
                  background: filters.showUnique ? "#805AD5" : "rgba(255,255,255,0.1)",
                  color: "white",
                  borderRadius: "6px",
                  border: `1px solid ${filters.showUnique ? "#805AD5" : "rgba(255,255,255,0.2)"}`,
                  cursor: "pointer",
                  fontSize: "14px",
                  minHeight: "44px",
                }}
              >
                {filters.showUnique ? "固有スキルを非表示" : "固有スキルを表示"}
              </button>
            </Box>
          </Flex>
        </Form>

        <Text fontSize="sm" color="gray.400">{data.length}件</Text>

        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
          {data.map((skill) => (
            <Link key={skill.id} to={`/skills/${skill.id}`}>
              <Box
                bg="whiteAlpha.100"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                p={4}
                h="full"
                _hover={{ shadow: "lg", transform: "translateY(-2px)", borderColor: "blue.400" }}
                transition="all 0.2s"
                cursor="pointer"
              >
                <VStack gap={2} align="start">
                  <Flex gap={2} flexWrap="wrap">
                    <Badge colorPalette={SKILL_TYPE_COLOR[skill.skill_type] ?? "gray"}>
                      {skill.skill_type}
                    </Badge>
                    {skill.weapon_restriction && (
                      <Badge colorPalette="blue" variant="outline">{skill.weapon_restriction}</Badge>
                    )}
                    {skill.color && SKILL_COLOR_PALETTE[skill.color] && (
                      <Badge colorPalette={SKILL_COLOR_PALETTE[skill.color]} variant="subtle">{skill.color}</Badge>
                    )}
                  </Flex>
                  <Text fontWeight="bold" fontSize="md">{skill.name}</Text>
                  <Text
                    fontSize="xs"
                    color="gray.400"
                    lineClamp={3}
                  >
                    {skill.description}
                  </Text>
                </VStack>
              </Box>
            </Link>
          ))}
        </SimpleGrid>

        {data.length === 0 && (
          <Box textAlign="center" py={12} color="gray.400">
            <Text>スキルが見つかりません</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
