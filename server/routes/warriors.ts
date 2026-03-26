import { eq, like, or, asc } from "drizzle-orm";
import { createFactory } from "hono/factory";
import { warriors, weaponAptitudes, skills, warriorSkills, warriorRoles } from "../db/schema";
import { AppError, dbClient } from "../index";

const factory = createFactory<Env>();

// GET /api/warriors - 一覧（フィルタ: rarity/era/role/weapon_type）
export const getWarriors = factory.createHandlers(async (c) => {
  const db = dbClient(c.env.DB);
  const { rarity, era, role, weapon_type } = c.req.query();

  if (role) {
    const result = await db
      .selectDistinct({ warrior: warriors })
      .from(warriors)
      .innerJoin(warriorRoles, eq(warriorRoles.warrior_id, warriors.id))
      .where(eq(warriorRoles.role, role))
      .then((rows) => rows.map((r) => r.warrior));
    return c.json(result);
  }

  if (weapon_type) {
    const result = await db
      .selectDistinct({ warrior: warriors })
      .from(warriors)
      .innerJoin(weaponAptitudes, eq(weaponAptitudes.warrior_id, warriors.id))
      .where(eq(weaponAptitudes.weapon_type, weapon_type))
      .then((rows) => rows.map((r) => r.warrior));
    return c.json(result);
  }

  // rarity / era フィルタ（シンプルなwhere条件）
  let query = db.select().from(warriors).where(eq(warriors.is_delete, false));

  if (rarity) {
    const rarityNum = Number(rarity);
    if (!Number.isNaN(rarityNum)) {
      query = db.select().from(warriors).where(eq(warriors.rarity, rarityNum));
    }
  } else if (era) {
    query = db.select().from(warriors).where(eq(warriors.era, era));
  }

  const result = await query.orderBy(asc(warriors.sort_order));
  return c.json(result);
});

// GET /api/warriors/search?q= - 名前・読み検索（/:id より先に登録すること）
export const searchWarriors = factory.createHandlers(async (c) => {
  const q = c.req.query("q") ?? "";
  if (!q) return c.json([]);

  const db = dbClient(c.env.DB);
  const result = await db
    .select()
    .from(warriors)
    .where(
      or(
        like(warriors.name, `%${q}%`),
        like(warriors.reading, `%${q}%`)
      )
    )
    .limit(20);

  return c.json(result);
});

// GET /api/warriors/:id - 詳細（weapon_aptitudes/skills/roles含む）
export const getWarrior = factory.createHandlers(async (c) => {
  const id = Number(c.req.param("id"));

  if (Number.isNaN(id)) {
    throw new AppError(400, "無効なIDです", "INVALID_ID");
  }

  const db = dbClient(c.env.DB);

  const [warrior] = await db
    .select()
    .from(warriors)
    .where(eq(warriors.id, id));

  if (!warrior || warrior.is_delete) {
    throw new AppError(404, "武将が見つかりません", "WARRIOR_NOT_FOUND");
  }

  const aptitudes = await db
    .select()
    .from(weaponAptitudes)
    .where(eq(weaponAptitudes.warrior_id, id));

  const skillLinks = await db
    .select({
      slot: warriorSkills.slot,
      is_unique: warriorSkills.is_unique,
      skill: skills,
    })
    .from(warriorSkills)
    .innerJoin(skills, eq(warriorSkills.skill_id, skills.id))
    .where(eq(warriorSkills.warrior_id, id));

  const roles = await db
    .select()
    .from(warriorRoles)
    .where(eq(warriorRoles.warrior_id, id));

  return c.json({ ...warrior, aptitudes, skills: skillLinks, roles });
});
