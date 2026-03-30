import csv
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = Path("/mnt/c/Users/Ryohei/Downloads/武将データ のコピー - 武将ALL.csv")
OUTPUT_PATH = ROOT / "server" / "drizzle" / "seed_warriors_csv_refresh.sql"
SEED_GLOB = "seed_warriors_batch*.sql"

NAME_ALIASES = {
    "後羿": "后羿",
}

WEAPON_COLUMNS = [("刀", 3), ("馬", 4), ("弓", 5), ("槍", 6)]

WARRIOR_RE = re.compile(
    r"VALUES \((\d+), '((?:''|[^'])*)', '((?:''|[^'])*)', (\d+), (\d+),"
)
WARRIOR_SKILL_RE = re.compile(
    r"INSERT OR IGNORE INTO warrior_skills \(warrior_id, skill_id, slot, is_unique\) "
    r"VALUES \((\d+), (\d+), (\d+), 1\);"
)


def esc(value: str | None) -> str | None:
    if value is None:
        return None
    return str(value).replace("'", "''")


def sql_string(value: str | None) -> str:
    if value is None or value == "":
        return "NULL"
    return f"'{esc(value)}'"


def to_int(value: str | None, default: int = 0) -> int:
    if value is None or value == "":
        return default
    return int(float(value))


def to_float(value: str | None, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    normalized = str(value).strip()
    if normalized.count(".") > 1:
        head, *tail = normalized.split(".")
        normalized = head + "." + "".join(tail)
    return float(normalized)


def normalize_name(name: str) -> str:
    return NAME_ALIASES.get(name, name)


def load_existing_warriors() -> dict[str, dict[str, int]]:
    warriors: dict[str, dict[str, int]] = {}
    for seed_path in sorted((ROOT / "server" / "drizzle").glob(SEED_GLOB)):
        for line in seed_path.read_text(encoding="utf-8").splitlines():
            match = WARRIOR_RE.search(line)
            if not match:
                continue
            name = match.group(2).replace("''", "'")
            warriors[name] = {
                "id": int(match.group(1)),
                "rarity": int(match.group(4)),
                "cost": int(match.group(5)),
            }
    return warriors


def load_existing_skill_ids() -> dict[tuple[int, int], int]:
    skill_ids: dict[tuple[int, int], int] = {}
    for seed_path in sorted((ROOT / "server" / "drizzle").glob(SEED_GLOB)):
        for line in seed_path.read_text(encoding="utf-8").splitlines():
            match = WARRIOR_SKILL_RE.search(line)
            if not match:
                continue
            warrior_id = int(match.group(1))
            skill_id = int(match.group(2))
            slot = int(match.group(3))
            skill_ids[(warrior_id, slot)] = skill_id
    return skill_ids


def allocate_skill_id(used_ids: set[int], next_id: int) -> tuple[int, int]:
    while next_id in used_ids:
        next_id += 1
    used_ids.add(next_id)
    return next_id, next_id + 1


def main() -> None:
    existing_warriors = load_existing_warriors()
    existing_skill_ids = load_existing_skill_ids()
    used_skill_ids = set(existing_skill_ids.values())
    next_skill_id = (max(used_skill_ids) if used_skill_ids else 0) + 1

    warrior_rows: list[dict[str, object]] = []
    weapon_rows: list[tuple[int, str, str]] = []
    skill_rows: list[tuple[int, str, str | None, str | None, str, str]] = []
    warrior_skill_rows: list[tuple[int, int, int]] = []
    unmatched_names: list[str] = []

    with CSV_PATH.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        next(reader, None)

        for sort_order, row in enumerate(reader, start=1):
            if not row or not row[0].strip():
                continue

            name = row[0].strip()
            normalized_name = normalize_name(name)
            reading = row[1].strip()
            cost = to_int(row[2])
            atk = to_int(row[7])
            int_ = to_int(row[8])
            guts = to_int(row[9])
            pol = to_int(row[10])
            atk_growth = to_float(row[11])
            int_growth = to_float(row[12])
            guts_growth = to_float(row[13])
            pol_growth = to_float(row[14])
            era = row[22].strip()
            biography = row[23].strip()

            existing = existing_warriors.get(normalized_name)
            if existing is None:
                unmatched_names.append(name)
                warrior_id = sort_order
                rarity = 5 if cost >= 5 else 4 if cost == 4 else 3
            else:
                warrior_id = existing["id"]
                rarity = existing["rarity"]

            warrior_rows.append(
                {
                    "id": warrior_id,
                    "name": name,
                    "reading": reading,
                    "rarity": rarity,
                    "cost": cost,
                    "atk": atk,
                    "int": int_,
                    "guts": guts,
                    "pol": pol,
                    "atk_growth": atk_growth,
                    "int_growth": int_growth,
                    "guts_growth": guts_growth,
                    "pol_growth": pol_growth,
                    "era": era or None,
                    "biography": biography or None,
                    "sort_order": sort_order,
                }
            )

            for weapon_type, index in WEAPON_COLUMNS:
                aptitude = row[index].strip() or "凡"
                weapon_rows.append((warrior_id, weapon_type, aptitude))

            for slot, base_index in ((1, 15), (2, 19)):
                skill_name = row[base_index].strip()
                skill_desc = row[base_index + 3].strip() if slot == 1 else row[base_index + 2].strip()
                if not skill_name:
                    continue

                existing_skill_id = existing_skill_ids.get((warrior_id, slot))
                if existing_skill_id is None:
                    existing_skill_id, next_skill_id = allocate_skill_id(used_skill_ids, next_skill_id)

                if slot == 1:
                    skill_color = row[16].strip() or None
                    skill_type = row[17].strip() or "パッシブ"
                    weapon_restriction = None
                else:
                    skill_color = None
                    skill_type = "パッシブ"
                    weapon_restriction = row[20].strip() or None

                skill_rows.append(
                    (
                        existing_skill_id,
                        skill_name,
                        skill_color,
                        weapon_restriction,
                        skill_type,
                        skill_desc,
                    )
                )
                warrior_skill_rows.append((warrior_id, existing_skill_id, slot))

    warrior_rows.sort(key=lambda row: int(row["id"]))
    weapon_rows.sort()
    skill_rows.sort(key=lambda row: row[0])
    warrior_skill_rows.sort()

    lines = [
        "-- GENERATED BY scripts/import_warriors_csv.py",
        f"-- SOURCE: {CSV_PATH}",
        f"-- WARRIORS: {len(warrior_rows)}",
        f"-- WEAPON_APTITUDES: {len(weapon_rows)}",
        f"-- SKILLS: {len(skill_rows)}",
        f"-- WARRIOR_SKILLS: {len(warrior_skill_rows)}",
        "",
        "DELETE FROM weapon_aptitudes;",
        "DELETE FROM warrior_skills;",
        "DELETE FROM skill_effects;",
        "DELETE FROM skills;",
        "",
    ]

    for row in warrior_rows:
        lines.append(
            "INSERT INTO warriors "
            "(id, name, reading, rarity, cost, atk, int, guts, pol, atk_growth, int_growth, guts_growth, pol_growth, era, biography, sort_order, is_delete) "
            f"VALUES ({row['id']}, {sql_string(str(row['name']))}, {sql_string(str(row['reading']))}, {row['rarity']}, {row['cost']}, "
            f"{row['atk']}, {row['int']}, {row['guts']}, {row['pol']}, "
            f"{row['atk_growth']}, {row['int_growth']}, {row['guts_growth']}, {row['pol_growth']}, "
            f"{sql_string(row['era'])}, {sql_string(row['biography'])}, {row['sort_order']}, 0) "
            "ON CONFLICT(id) DO UPDATE SET "
            "name = excluded.name, "
            "reading = excluded.reading, "
            "rarity = excluded.rarity, "
            "cost = excluded.cost, "
            "atk = excluded.atk, "
            "int = excluded.int, "
            "guts = excluded.guts, "
            "pol = excluded.pol, "
            "atk_growth = excluded.atk_growth, "
            "int_growth = excluded.int_growth, "
            "guts_growth = excluded.guts_growth, "
            "pol_growth = excluded.pol_growth, "
            "era = excluded.era, "
            "biography = excluded.biography, "
            "sort_order = excluded.sort_order, "
            "is_delete = excluded.is_delete;"
        )

    lines.append("")

    for warrior_id, weapon_type, aptitude in weapon_rows:
        lines.append(
            "INSERT INTO weapon_aptitudes (warrior_id, weapon_type, aptitude) "
            f"VALUES ({warrior_id}, {sql_string(weapon_type)}, {sql_string(aptitude)});"
        )

    lines.append("")

    for skill_id, name, color, weapon_restriction, skill_type, description in skill_rows:
        lines.append(
            "INSERT INTO skills "
            "(id, name, color, weapon_restriction, skill_type, description, sort_order, is_delete) "
            f"VALUES ({skill_id}, {sql_string(name)}, {sql_string(color)}, {sql_string(weapon_restriction)}, "
            f"{sql_string(skill_type)}, {sql_string(description)}, {skill_id}, 0);"
        )

    lines.append("")

    for warrior_id, skill_id, slot in warrior_skill_rows:
        lines.append(
            "INSERT INTO warrior_skills (warrior_id, skill_id, slot, is_unique) "
            f"VALUES ({warrior_id}, {skill_id}, {slot}, 1);"
        )

    lines.append("")
    OUTPUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Generated SQL: {OUTPUT_PATH}")
    print(f"warriors={len(warrior_rows)} weapon_aptitudes={len(weapon_rows)} skills={len(skill_rows)} warrior_skills={len(warrior_skill_rows)}")
    if unmatched_names:
        print("unmatched_names=" + ", ".join(unmatched_names))


if __name__ == "__main__":
    main()
