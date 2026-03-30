import { eq } from "drizzle-orm";
import { createFactory } from "hono/factory";
import { warriors, sharedFormations } from "../db/schema";
import { AppError, dbClient } from "../index";

const factory = createFactory<Env>();

// POST /api/share-formation
export const shareFormation = factory.createHandlers(async (c) => {
  const body = await c.req.json<{
    name?: string;
    purpose?: string;
    slots: { warrior_id: number; role_label: string }[];
    total_score?: number;
  }>();

  if (!body.slots || !Array.isArray(body.slots)) {
    throw new AppError(400, "slotsは必須です", "INVALID_SLOTS");
  }

  const uuid = crypto.randomUUID();
  const db = dbClient(c.env.DB);

  await db.insert(sharedFormations).values({
    uuid,
    name: body.name ?? null,
    purpose: body.purpose ?? null,
    slots: JSON.stringify(body.slots),
    total_score: body.total_score ?? null,
  });

  const url = `${new URL(c.req.url).origin}/formation/${uuid}`;
  return c.json({ uuid, url }, 201);
});

// GET /api/formation/:uuid
export const getFormation = factory.createHandlers(async (c) => {
  const uuid = c.req.param("uuid");
  if (!uuid) {
    throw new AppError(400, "UUIDは必須です", "MISSING_UUID");
  }
  const db = dbClient(c.env.DB);

  const [formation] = await db
    .select()
    .from(sharedFormations)
    .where(eq(sharedFormations.uuid, uuid));

  if (!formation) {
    throw new AppError(404, "編成が見つかりません", "FORMATION_NOT_FOUND");
  }

  const slots: { warrior_id: number; role_label: string }[] = JSON.parse(formation.slots);

  // warriors を一括取得してスロットにマージ
  const warriorIds = [...new Set(slots.map((s) => s.warrior_id))];
  const warriorRows = await Promise.all(
    warriorIds.map((id) =>
      db.select().from(warriors).where(eq(warriors.id, id)).then((r) => r[0])
    )
  );
  const warriorMap = new Map(warriorRows.filter(Boolean).map((w) => [w!.id, w!]));

  const enrichedSlots = slots.map((slot) => ({
    ...slot,
    warrior_name: warriorMap.get(slot.warrior_id)?.name ?? null,
  }));

  return c.json({ ...formation, slots: enrichedSlots });
});
