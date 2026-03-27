import { eq } from "drizzle-orm";
import { createFactory } from "hono/factory";
import { warriors, sharedProfiles } from "../db/schema";
import { AppError, dbClient } from "../index";

const factory = createFactory<Env>();

// POST /api/share-profile
export const shareProfile = factory.createHandlers(async (c) => {
  const body = await c.req.json<{
    warrior_ids: number[] | null;
    formations: unknown[];
  }>();

  if (!Array.isArray(body.formations)) {
    throw new AppError(400, "formationsは配列必須です", "INVALID_FORMATIONS");
  }

  const uuid = crypto.randomUUID();
  const db = dbClient(c.env.DB);
  const now = new Date().toISOString();

  await db.insert(sharedProfiles).values({
    uuid,
    warriorIds: body.warrior_ids ? JSON.stringify(body.warrior_ids) : null,
    formations: JSON.stringify(body.formations.slice(0, 5)),
    createdAt: now,
  });

  const url = `${new URL(c.req.url).origin}/share/${uuid}`;
  return c.json({ uuid, url }, 201);
});

// GET /api/share-profile/:uuid
export const getShareProfile = factory.createHandlers(async (c) => {
  const uuid = c.req.param("uuid");
  const db = dbClient(c.env.DB);

  const [profile] = await db
    .select()
    .from(sharedProfiles)
    .where(eq(sharedProfiles.uuid, uuid));

  if (!profile) {
    throw new AppError(404, "共有プロフィールが見つかりません", "PROFILE_NOT_FOUND");
  }

  const formations = profile.formations ? JSON.parse(profile.formations) : [];
  const warriorIds: number[] | null = profile.warriorIds
    ? JSON.parse(profile.warriorIds)
    : null;

  let warriorDetails: object[] = [];
  if (warriorIds && warriorIds.length > 0) {
    const rows = await Promise.all(
      warriorIds.map((id) =>
        db.select().from(warriors).where(eq(warriors.id, id)).then((r) => r[0])
      )
    );
    warriorDetails = rows.filter(Boolean) as object[];
  }

  return c.json({ warriors: warriorDetails, formations });
});
