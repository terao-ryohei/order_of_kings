import {
  Box,
  Flex,
  Heading,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { and, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { warriorRoles, warriors } from "../../server/db/schema";

export const meta: MetaFunction = () => [
  { title: "武将一覧 - 王の碁盤" },
  { name: "description", content: "武将一覧ページ" },
];

function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const era = url.searchParams.get("era");
  const role = url.searchParams.get("role");
  const name = url.searchParams.get("name") ?? "";
  const nameKana = toKatakana(name);

  const db = drizzle((context.cloudflare as any).env.DB);

  const nameFilter = name
    ? or(
        like(warriors.name, `%${name}%`),
        like(warriors.reading, `%${name}%`),
        like(warriors.reading, `%${nameKana}%`),
      )
    : undefined;

  let result;

  if (role) {
    result = await db
      .selectDistinct({ warrior: warriors })
      .from(warriors)
      .innerJoin(warriorRoles, eq(warriorRoles.warrior_id, warriors.id))
      .where(nameFilter ? and(eq(warriorRoles.role, role), nameFilter) : eq(warriorRoles.role, role))
      .then((rows) => rows.map((r) => r.warrior));
  } else if (era) {
    result = await db
      .select()
      .from(warriors)
      .where(nameFilter ? and(eq(warriors.era, era), nameFilter) : eq(warriors.era, era));
  } else {
    result = await db
      .select()
      .from(warriors)
      .where(nameFilter ? and(eq(warriors.is_delete, false), nameFilter) : eq(warriors.is_delete, false));
  }

  return { warriors: result, filters: { era, role, name } };
}

type SortKey =
  | "name" | "rarity" | "cost"
  | "atk" | "int" | "guts" | "pol"
  | "lv40_atk" | "lv40_int" | "lv40_guts" | "lv40_pol"
  | "lv50_atk" | "lv50_int" | "lv50_guts" | "lv50_pol"
  | "sort_order";

type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  sortKeyValue,
  currentKey,
  currentDir,
  onSort,
  align = "center",
  borderRight,
}: {
  label: string;
  sortKeyValue: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "center" | "right";
  borderRight?: string;
}) {
  const isActive = currentKey === sortKeyValue;
  return (
    <Table.ColumnHeader
      cursor="pointer"
      color={isActive ? "yellow.300" : "gray.400"}
      onClick={() => onSort(sortKeyValue)}
      aria-sort={isActive ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
      whiteSpace="nowrap"
      px={2}
      py={2}
      fontSize="xs"
      textAlign={align}
      borderRight={borderRight}
    >
      <button
        type="button"
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          padding: 0,
          font: "inherit",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSort(sortKeyValue);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSort(sortKeyValue);
          }
        }}
      >
        {label}
        {isActive ? (currentDir === "asc" ? " ▲" : " ▼") : ""}
      </button>
    </Table.ColumnHeader>
  );
}

export default function Index() {
  const { warriors: data, filters } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nameValue, setNameValue] = useState(searchParams.get("name") ?? "");

  const sortKey = (searchParams.get("sort") ?? "rarity") as SortKey;
  const sortDir = (searchParams.get("dir") ?? "desc") as SortDir;

  useEffect(() => {
    setNameValue(searchParams.get("name") ?? "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleNameChange = (value: string) => {
    setNameValue(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

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

  function handleSort(key: SortKey) {
    const newDir: SortDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("sort", key);
        next.set("dir", newDir);
        return next;
      },
      { replace: true },
    );
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const getValue = (w: typeof a): number | string => {
        switch (sortKey) {
          case "lv40_atk": return Math.round(w.atk + w.atk_growth * 39);
          case "lv40_int": return Math.round(w.int + w.int_growth * 39);
          case "lv40_guts": return Math.round(w.guts + w.guts_growth * 39);
          case "lv40_pol": return Math.round(w.pol + w.pol_growth * 39);
          case "lv50_atk": return Math.round(w.atk + w.atk_growth * 49);
          case "lv50_int": return Math.round(w.int + w.int_growth * 49);
          case "lv50_guts": return Math.round(w.guts + w.guts_growth * 49);
          case "lv50_pol": return Math.round(w.pol + w.pol_growth * 49);
          case "name": return w.name;
          default: return (w as any)[sortKey] ?? 0;
        }
      };
      const av = getValue(a);
      const bv = getValue(b);
      const cmp =
        typeof av === "string"
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return (
    <Box minH="100vh" bg="gray.950" p={{ base: 3, md: 4 }}>
      <VStack gap={{ base: 4, md: 6 }} align="stretch">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <Heading size={{ base: "lg", md: "xl" }} color="white">
            武将一覧
          </Heading>
          <Flex gap={4} wrap="wrap">
            <Link to="/my-warriors" style={{ color: "#ECC94B", fontSize: "14px", fontWeight: 700, minHeight: "44px", display: "inline-flex", alignItems: "center" }}>
              手持ち武将を登録
            </Link>
            <Link to="/formation" style={{ color: "#ECC94B", fontSize: "14px", fontWeight: 700, minHeight: "44px", display: "inline-flex", alignItems: "center" }}>
              編成ビルダーへ
            </Link>
          </Flex>
        </Flex>

        <Form method="get">
          <Flex gap={3} flexWrap="wrap" align="center">
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">
                時代
              </Text>
              <input
                name="era"
                defaultValue={filters.era ?? ""}
                placeholder="例: 秦末"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: "white",
                  width: "100%",
                  maxWidth: "120px",
                  minHeight: "44px",
                  fontSize: "16px",
                }}
              />
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="gray.400">
                役割
              </Text>
              <input
                name="role"
                defaultValue={filters.role ?? ""}
                placeholder="例: 盾"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: "white",
                  width: "100%",
                  maxWidth: "100px",
                  minHeight: "44px",
                  fontSize: "16px",
                }}
              />
            </Box>
            <Box flex={1} minW="100px">
              <Text fontSize="sm" mb={1} color="gray.400">
                武将名
              </Text>
              <input
                name="name"
                value={nameValue}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="武将名で検索..."
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.16)",
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
                style={{
                  padding: "8px 20px",
                  background: "#D69E2E",
                  color: "black",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  minHeight: "44px",
                }}
              >
                絞り込み
              </button>
            </Box>
            {(filters.era || filters.role || filters.name) && (
              <Box alignSelf="flex-end">
                <Link
                  to="/warriors"
                  style={{
                    padding: "8px 16px",
                    color: "#ECC94B",
                    textDecoration: "underline",
                    fontSize: "14px",
                    minHeight: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  クリア
                </Link>
              </Box>
            )}
          </Flex>
        </Form>

        <Text fontSize="sm" color="gray.400">
          {sorted.length}件
        </Text>

        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row bg="gray.900">
                <Table.ColumnHeader px={2} py={2} fontSize="xs" color="gray.400" textAlign="center">画像</Table.ColumnHeader>
                <SortableHeader label="名前" sortKeyValue="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="レア度" sortKeyValue="rarity" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="コスト" sortKeyValue="cost" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="武力" sortKeyValue="atk" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="Lv40武力" sortKeyValue="lv40_atk" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="Lv50武力" sortKeyValue="lv50_atk" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" borderRight="1px solid rgba(255,255,255,0.24)" />
                <SortableHeader label="知力" sortKeyValue="int" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="Lv40知力" sortKeyValue="lv40_int" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="Lv50知力" sortKeyValue="lv50_int" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" borderRight="1px solid rgba(255,255,255,0.24)" />
                <SortableHeader label="胆力" sortKeyValue="guts" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="Lv40胆力" sortKeyValue="lv40_guts" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="Lv50胆力" sortKeyValue="lv50_guts" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" borderRight="1px solid rgba(255,255,255,0.24)" />
                <SortableHeader label="政治" sortKeyValue="pol" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="Lv40政治" sortKeyValue="lv40_pol" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="Lv50政治" sortKeyValue="lv50_pol" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sorted.map((warrior) => {
                const lv40atk = Math.round(warrior.atk + warrior.atk_growth * 39);
                const lv40int = Math.round(warrior.int + warrior.int_growth * 39);
                const lv40guts = Math.round(warrior.guts + warrior.guts_growth * 39);
                const lv40pol = Math.round(warrior.pol + warrior.pol_growth * 39);
                const lv50atk = Math.round(warrior.atk + warrior.atk_growth * 49);
                const lv50int = Math.round(warrior.int + warrior.int_growth * 49);
                const lv50guts = Math.round(warrior.guts + warrior.guts_growth * 49);
                const lv50pol = Math.round(warrior.pol + warrior.pol_growth * 49);
                return (
                  <Table.Row
                    key={warrior.id}
                    _hover={{ bg: "whiteAlpha.100" }}
                    cursor="pointer"
                    onClick={() => navigate(`/warriors/${warrior.id}`)}
                  >
                    <Table.Cell px={2} py={1} textAlign="center">
                      <img
                        src={`/hero/${encodeURIComponent(warrior.name)}.png`}
                        alt={warrior.name}
                        width={48}
                        height={48}
                        style={{ objectFit: "cover", borderRadius: "4px", display: "inline-block" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </Table.Cell>
                    <Table.Cell px={2} py={1} whiteSpace="nowrap" textAlign="center">
                      <Link
                        to={`/warriors/${warrior.id}`}
                        style={{ color: "#ECC94B" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {warrior.name}
                      </Link>
                    </Table.Cell>
                    <Table.Cell px={2} py={1} whiteSpace="nowrap" textAlign="center">{"★".repeat(warrior.rarity)}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{warrior.cost}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{warrior.atk}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{lv40atk}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right" borderRight="1px solid rgba(255,255,255,0.24)">{lv50atk}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{warrior.int}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{lv40int}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right" borderRight="1px solid rgba(255,255,255,0.24)">{lv50int}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{warrior.guts}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{lv40guts}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right" borderRight="1px solid rgba(255,255,255,0.24)">{lv50guts}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{warrior.pol}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{lv40pol}</Table.Cell>
                    <Table.Cell px={2} py={1} textAlign="right">{lv50pol}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Box>

        {sorted.length === 0 && (
          <Box textAlign="center" py={12} color="gray.400">
            <Text>武将が見つかりません</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
