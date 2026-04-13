import { asc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { createFactory } from "hono/factory";
import { tierEntries } from "../db/schema";
import { AppError, dbClient } from "../index";
import type { TierEntry } from "../../app/lib/tier-types";

const factory = createFactory<Env>();

type TierEntryInput = {
  rank: TierEntry["rank"];
  genres: TierEntry["genres"];
  slots: TierEntry["slots"];
  description: string;
};

const serialize = (row: typeof tierEntries.$inferSelect) => ({
  id: row.id,
  rank: row.rank,
  genres: JSON.parse(row.genres),
  slots: JSON.parse(row.slots),
  description: row.description,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
});

export const listTierEntries = factory.createHandlers(async (c) => {
  const db = dbClient(c.env.DB);
  const rows = await db.select().from(tierEntries).orderBy(asc(tierEntries.rank));
  return c.json(rows.map(serialize));
});

export const createTierEntry = factory.createHandlers(async (c) => {
  const db = dbClient(c.env.DB);
  const body = await c.req.json<TierEntryInput>();

  if (!body.rank) {
    throw new AppError(400, "rank is required", "INVALID_INPUT");
  }

  const id = crypto.randomUUID();
  await db.insert(tierEntries).values({
    id,
    rank: body.rank,
    genres: JSON.stringify(body.genres ?? []),
    slots: JSON.stringify(body.slots ?? []),
    description: body.description ?? "",
  });

  const [row] = await db.select().from(tierEntries).where(eq(tierEntries.id, id));
  return c.json(serialize(row), 201);
});

export const updateTierEntry = factory.createHandlers(async (c) => {
  const db = dbClient(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json<TierEntryInput>();

  const [existing] = await db.select().from(tierEntries).where(eq(tierEntries.id, id));
  if (!existing) {
    throw new AppError(404, "tier entry not found", "TIER_NOT_FOUND");
  }

  await db
    .update(tierEntries)
    .set({
      rank: body.rank ?? existing.rank,
      genres: body.genres ? JSON.stringify(body.genres) : existing.genres,
      slots: body.slots ? JSON.stringify(body.slots) : existing.slots,
      description: body.description ?? existing.description,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(tierEntries.id, id));

  const [row] = await db.select().from(tierEntries).where(eq(tierEntries.id, id));
  return c.json(serialize(row));
});

export const deleteTierEntry = factory.createHandlers(async (c) => {
  const db = dbClient(c.env.DB);
  const id = c.req.param("id");

  const [existing] = await db.select().from(tierEntries).where(eq(tierEntries.id, id));
  if (!existing) {
    throw new AppError(404, "tier entry not found", "TIER_NOT_FOUND");
  }

  await db.delete(tierEntries).where(eq(tierEntries.id, id));
  return c.json({ ok: true });
});
