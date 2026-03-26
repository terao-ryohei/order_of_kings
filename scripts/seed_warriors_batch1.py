import openpyxl
import os

# カラムインデックス（ヘッダー確認済み）
# col[0]: name, col[1]: reading, col[2]: rarity(float→int)
# col[3]: 刀apt, col[4]: 馬apt, col[5]: 弓apt, col[6]: 槍apt
# col[7]: atk, col[8]: int, col[9]: guts, col[10]: pol
# col[11]: atk_growth, col[12]: int_growth, col[13]: guts_growth, col[14]: pol_growth
# col[15]: skill1_name, col[16]: skill1_color, col[17]: skill1_type, col[18]: skill1_desc
# col[19]: skill2_name, col[20]: skill2_weapon_restriction, col[21]: skill2_desc
# col[22]: era, col[23]: biography

def esc(s):
    """シングルクォートエスケープ"""
    if s is None:
        return None
    return str(s).replace("'", "''")

def to_int(v, default=0):
    if v is None:
        return default
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return default

def to_float(v, default=0.0):
    if v is None:
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default

script_dir = os.path.dirname(os.path.abspath(__file__))
xlsx_path = os.path.join(script_dir, '..', '武将データ.xlsx')
out_path = os.path.join(script_dir, '..', 'server', 'drizzle', 'seed_warriors_batch1.sql')

wb = openpyxl.load_workbook(xlsx_path, read_only=True)
ws = wb.active

warriors_sql = []
weapon_aptitudes_sql = []
skills_sql = []
warrior_skills_sql = []

weapon_types = [('刀', 3), ('馬', 4), ('弓', 5), ('槍', 6)]
skill_id = 1

for i, row in enumerate(ws.iter_rows(min_row=2, max_row=31, values_only=True)):
    if row[0] is None:
        continue

    warrior_id = i + 1
    name = esc(row[0])
    reading = esc(row[1])
    rarity = to_int(row[2], 1)
    atk = to_int(row[7])
    int_ = to_int(row[8])
    guts = to_int(row[9])
    pol = to_int(row[10])
    atk_growth = to_float(row[11])
    int_growth = to_float(row[12])
    guts_growth = to_float(row[13])
    pol_growth = to_float(row[14])
    era = esc(row[22]) if row[22] else None
    biography = esc(row[23]) if row[23] else None
    sort_order = warrior_id

    era_val = f"'{era}'" if era else 'NULL'
    bio_val = f"'{biography}'" if biography else 'NULL'

    warriors_sql.append(
        f"INSERT OR IGNORE INTO warriors "
        f"(id, name, reading, rarity, atk, int, guts, pol, "
        f"atk_growth, int_growth, guts_growth, pol_growth, era, biography, sort_order) "
        f"VALUES ({warrior_id}, '{name}', '{reading}', {rarity}, "
        f"{atk}, {int_}, {guts}, {pol}, "
        f"{atk_growth}, {int_growth}, {guts_growth}, {pol_growth}, "
        f"{era_val}, {bio_val}, {sort_order});"
    )

    # 兵種適性
    for wtype, col_idx in weapon_types:
        apt = esc(row[col_idx]) if row[col_idx] else '凡'
        weapon_aptitudes_sql.append(
            f"INSERT OR IGNORE INTO weapon_aptitudes "
            f"(warrior_id, weapon_type, aptitude) "
            f"VALUES ({warrior_id}, '{wtype}', '{apt}');"
        )

    # スキル1
    skill1_name = row[15]
    if skill1_name:
        skill1_color = esc(row[16]) if row[16] else None
        skill1_type = esc(row[17]) if row[17] else 'パッシブ'
        skill1_desc = esc(row[18]) if row[18] else ''
        color_val = f"'{skill1_color}'" if skill1_color else 'NULL'
        skills_sql.append(
            f"INSERT OR IGNORE INTO skills "
            f"(id, name, color, weapon_restriction, skill_type, description, sort_order) "
            f"VALUES ({skill_id}, '{esc(skill1_name)}', {color_val}, NULL, '{skill1_type}', '{skill1_desc}', {skill_id});"
        )
        warrior_skills_sql.append(
            f"INSERT OR IGNORE INTO warrior_skills "
            f"(warrior_id, skill_id, slot, is_unique) "
            f"VALUES ({warrior_id}, {skill_id}, 1, 1);"
        )
        skill_id += 1

    # スキル2
    skill2_name = row[19]
    if skill2_name:
        skill2_weapon = esc(row[20]) if row[20] else None
        skill2_desc = esc(row[21]) if row[21] else ''
        weapon_val = f"'{skill2_weapon}'" if skill2_weapon else 'NULL'
        skills_sql.append(
            f"INSERT OR IGNORE INTO skills "
            f"(id, name, color, weapon_restriction, skill_type, description, sort_order) "
            f"VALUES ({skill_id}, '{esc(skill2_name)}', NULL, {weapon_val}, 'パッシブ', '{skill2_desc}', {skill_id});"
        )
        warrior_skills_sql.append(
            f"INSERT OR IGNORE INTO warrior_skills "
            f"(warrior_id, skill_id, slot, is_unique) "
            f"VALUES ({warrior_id}, {skill_id}, 2, 1);"
        )
        skill_id += 1

wb.close()

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('-- BATCH: 1\n')
    f.write('-- RANGE: warriors 1-30\n')
    f.write('-- GENERATED_AT: 2026-03-26\n\n')

    f.write('-- Warriors Batch1 (先頭30件)\n')
    for sql in warriors_sql:
        f.write(sql + '\n')

    f.write('\n-- Weapon Aptitudes (30×4=120件)\n')
    for sql in weapon_aptitudes_sql:
        f.write(sql + '\n')

    f.write('\n-- Skills\n')
    for sql in skills_sql:
        f.write(sql + '\n')

    f.write('\n-- Warrior Skills\n')
    for sql in warrior_skills_sql:
        f.write(sql + '\n')

print(f"Generated {len(warriors_sql)} warriors")
print(f"Generated {len(weapon_aptitudes_sql)} weapon_aptitudes")
print(f"Generated {len(skills_sql)} skills")
print(f"Generated {len(warrior_skills_sql)} warrior_skills")
