import openpyxl
import os

# スキルALL シート構造:
# row1: ヘッダーなし（空）
# 色マーカー行: row[0]が1文字(赤/青等), row[2]がNone
# スキルデータ行: (name, weapon_restriction, skill_type, description)

def esc(s):
    if s is None:
        return None
    return str(s).replace("'", "''")

script_dir = os.path.dirname(os.path.abspath(__file__))
xlsx_path = os.path.join(script_dir, '..', '武将データ.xlsx')
out_path = os.path.join(script_dir, '..', 'server', 'drizzle', 'seed_skills_all.sql')

wb = openpyxl.load_workbook(xlsx_path, read_only=False)
ws = wb['スキルALL']

# スキルIDは既存武将スキル（1-60から始まり、batch2で続く）と衝突しないよう1001から
# warrior専用スキルと重複するかもしれないがINSERT OR IGNOREで冪等性保証
skill_id = 1001
current_color = None
skills_sql = []

for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
    if row[0] is None:
        continue

    name = str(row[0]).strip()
    weapon_restriction = row[1]
    skill_type = row[2]
    description = row[3]

    # 色マーカー行の判定: skill_typeがNoneかつdescriptionがNone
    if skill_type is None and description is None:
        current_color = name
        continue

    # 実データ行
    name_esc = esc(name)
    weapon_val = f"'{esc(weapon_restriction)}'" if weapon_restriction else 'NULL'
    skill_type_esc = esc(skill_type) if skill_type else 'パッシブ'
    desc_esc = esc(description) if description else ''
    color_val = f"'{esc(current_color)}'" if current_color else 'NULL'

    skills_sql.append(
        f"INSERT OR IGNORE INTO skills "
        f"(id, name, color, weapon_restriction, skill_type, description, sort_order) "
        f"VALUES ({skill_id}, '{name_esc}', {color_val}, {weapon_val}, '{skill_type_esc}', '{desc_esc}', {skill_id});"
    )
    skill_id += 1

wb.close()

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('-- スキルALL シート全スキル\n')
    f.write('-- GENERATED_AT: 2026-03-26\n\n')
    for sql in skills_sql:
        f.write(sql + '\n')

print(f"Generated {len(skills_sql)} skills from スキルALL (id 1001-{1000 + len(skills_sql)})")
