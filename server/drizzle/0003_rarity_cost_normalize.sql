-- 0003: Normalize rarity/cost columns
-- rarity カラムにはコスト値(1-7)が入っている。本来のレアリティ(3-5)に修正し、costカラムを追加する。

-- Step1: 新costカラム追加（旧rarityの値=コスト値を移す）
ALTER TABLE warriors ADD COLUMN cost INTEGER NOT NULL DEFAULT 0;
UPDATE warriors SET cost = rarity;

-- Step2: rarityをsort_orderベースの正しいレアリティ(3-5)に更新
-- ダミーレコード: 紫(sort_order=55)と青(sort_order=81)が区切り
UPDATE warriors SET rarity = 5 WHERE sort_order < 55;
UPDATE warriors SET rarity = 4 WHERE sort_order > 55 AND sort_order < 81;
UPDATE warriors SET rarity = 3 WHERE sort_order > 81;

-- Step3: ダミーレコードの関連データ削除（FK制約対策）
DELETE FROM weapon_aptitudes WHERE warrior_id IN (SELECT id FROM warriors WHERE sort_order IN (55, 81));
DELETE FROM warrior_skills WHERE warrior_id IN (SELECT id FROM warriors WHERE sort_order IN (55, 81));
DELETE FROM warrior_roles WHERE warrior_id IN (SELECT id FROM warriors WHERE sort_order IN (55, 81));

-- Step4: ダミーレコード削除
DELETE FROM warriors WHERE sort_order = 55;
DELETE FROM warriors WHERE sort_order = 81;
