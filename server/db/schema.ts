import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 1. 武将マスタ
export const warriors = sqliteTable("warriors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  reading: text("reading").notNull(),        // 読み仮名
  rarity: integer("rarity").notNull(),        // 3-5 (星数)
  cost: integer("cost").notNull(),            // 1-7 (部隊コスト)
  atk: integer("atk").notNull(),             // 武力
  int: integer("int").notNull(),             // 知略
  guts: integer("guts").notNull(),           // 胆力
  pol: integer("pol").notNull(),             // 政治
  atk_growth: real("atk_growth").notNull(),  // 武力成長率
  int_growth: real("int_growth").notNull(),
  guts_growth: real("guts_growth").notNull(),
  pol_growth: real("pol_growth").notNull(),
  era: text("era"),                          // 時代（秦末/楚漢/三国等）
  biography: text("biography"),              // 列伝テキスト
  img: text("img"),                          // R2画像URL
  sort_order: integer("sort_order").default(0),
  is_delete: integer("is_delete", { mode: "boolean" }).default(false),
});

// 2. 武将の兵種適性
export const weaponAptitudes = sqliteTable("weapon_aptitudes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  warrior_id: integer("warrior_id").notNull().references(() => warriors.id),
  weapon_type: text("weapon_type").notNull(), // 刀/馬/弓/槍
  aptitude: text("aptitude").notNull(),        // 極/優/良/凡
});

// 3. スキルマスタ
export const skills = sqliteTable("skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color"),                       // スキル色（赤/青/緑等）
  weapon_restriction: text("weapon_restriction"), // 兵種制限
  skill_type: text("skill_type").notNull(),   // パッシブ/能動/連鎖/怒気
  description: text("description").notNull(), // スキル説明
  rarity: integer("rarity"),
  sort_order: integer("sort_order").default(0),
  is_delete: integer("is_delete", { mode: "boolean" }).default(false),
});

// 4. 武将-スキル中間テーブル
export const warriorSkills = sqliteTable("warrior_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  warrior_id: integer("warrior_id").notNull().references(() => warriors.id),
  skill_id: integer("skill_id").notNull().references(() => skills.id),
  slot: integer("slot").notNull(),            // 1 or 2
  is_unique: integer("is_unique", { mode: "boolean" }).default(false),
});

// 5. スキル効果の構造化データ
export const skillEffects = sqliteTable("skill_effects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  skill_id: integer("skill_id").notNull().references(() => skills.id),
  effect_type: text("effect_type"),          // damage/buff/debuff/heal
  target: text("target"),                    // 自身/味方/敵
  target_scope: text("target_scope"),        // 単体/範囲/全体/隣接/円形範囲
  damage_type: text("damage_type"),          // 武攻/知攻/固定
  damage_value: real("damage_value"),
  damage_max: real("damage_max"),
  buff_type: text("buff_type"),
  debuff_type: text("debuff_type"),
  duration: real("duration"),
  probability: real("probability"),
  condition: text("condition"),              // 通常攻撃後/毎秒/移動中等
  cooldown: real("cooldown"),
  reference_stat: text("reference_stat"),   // 武力/知略/胆力
  max_stacks: integer("max_stacks"),
  description_raw: text("description_raw"), // 元の説明文（段階的構造化用）
});

// 6. 武将の役割分類
export const warriorRoles = sqliteTable("warrior_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  warrior_id: integer("warrior_id").notNull().references(() => warriors.id),
  role: text("role").notNull(),              // 盾/回復/攻城/怒気/etc.
}, (table) => ({
  uniqWarriorRole: uniqueIndex("warrior_roles_warrior_id_role_unique").on(table.warrior_id, table.role),
}));

// 7. 共有編成
export const sharedFormations = sqliteTable("shared_formations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uuid: text("uuid").notNull().unique(),
  name: text("name"),
  purpose: text("purpose"),
  slots: text("slots").notNull(),       // JSON: [{warrior_id, role_label}×5]
  total_score: integer("total_score"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 8. 共有コレクション
export const sharedCollections = sqliteTable("shared_collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uuid: text("uuid").notNull().unique(),
  warrior_ids: text("warrior_ids").notNull(), // JSON: [1,3,7,...]
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 10. 共有プロフィール（手持ち武将 + 保存編成の一括共有）
export const sharedProfiles = sqliteTable("shared_profiles", {
  uuid: text("uuid").primaryKey(),
  warriorIds: text("warrior_ids"),   // JSON配列 or null
  formations: text("formations"),    // JSON配列（最大5個）
  skillIds: text("skill_ids"),       // JSON配列 or null
  createdAt: text("created_at").notNull(),
});

// 9. ゲーム仕様テキスト
export const gameMechanics = sqliteTable("game_mechanics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  content: text("content").notNull(),
  sort_order: integer("sort_order").default(0),
});
