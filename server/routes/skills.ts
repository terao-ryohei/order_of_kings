import { eq, asc } from "drizzle-orm";
import { createFactory } from "hono/factory";
import { skills } from "../db/schema";
import { AppError, dbClient } from "../index";

const factory = createFactory<Env>();

// GET /api/skills - 一覧（フィルタ: skill_type/weapon_restriction）
export const getSkills = factory.createHandlers(async (c) => {
  const db = dbClient(c.env.DB);
  const { skill_type, weapon_restriction } = c.req.query();

  let query = db.select().from(skills).where(eq(skills.is_delete, false));

  if (skill_type) {
    query = db.select().from(skills).where(eq(skills.skill_type, skill_type));
  } else if (weapon_restriction) {
    query = db.select().from(skills).where(eq(skills.weapon_restriction, weapon_restriction));
  }

  const result = await query.orderBy(asc(skills.sort_order));
  return c.json(result);
});

// GET /api/skills/:id - 詳細
export const getSkill = factory.createHandlers(async (c) => {
  const id = Number(c.req.param("id"));

  if (Number.isNaN(id)) {
    throw new AppError(400, "無効なIDです", "INVALID_ID");
  }

  const db = dbClient(c.env.DB);

  const [skill] = await db
    .select()
    .from(skills)
    .where(eq(skills.id, id));

  if (!skill || skill.is_delete) {
    throw new AppError(404, "スキルが見つかりません", "SKILL_NOT_FOUND");
  }

  return c.json(skill);
});
