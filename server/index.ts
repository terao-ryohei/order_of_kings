import { drizzle } from "drizzle-orm/d1";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { cors } from "hono/cors";
import { poweredBy } from "hono/powered-by";
import { prettyJSON } from "hono/pretty-json";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { getWarriors, searchWarriors, getWarrior } from "./routes/warriors";
import { getSkills, getSkill } from "./routes/skills";
import { shareFormation, getFormation } from "./routes/formations";

export const dbClient = (db?: D1Database) => {
  if (!db) {
    throw new Error("Database not found");
  }
  return drizzle(db);
};

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const handleError = (err: Error, c: Context<Env>): Response => {
  console.error("Error handling:", err);

  if (err instanceof HTTPException) {
    return c.text(err.message, err.status);
  }

  if (err instanceof AppError) {
    return c.text(err.message, err.status as ContentfulStatusCode);
  }

  if (err instanceof ZodError) {
    return c.json({ message: "バリデーションエラー", errors: err.issues }, 400);
  }

  return c.text("予期せぬサーバーエラーが発生しました", 500);
};

const app = new Hono<Env>()
  .basePath("/")
  .onError((err, c) => handleError(err, c))
  .use(cors())
  .use(poweredBy())
  .use(prettyJSON())
  // API routes
  .get("/api/warriors/search", ...searchWarriors)
  .get("/api/warriors", ...getWarriors)
  .get("/api/warriors/:id", ...getWarrior)
  .get("/api/skills", ...getSkills)
  .get("/api/skills/:id", ...getSkill)
  .post("/api/share-formation", ...shareFormation)
  .get("/api/formation/:uuid", ...getFormation)
  .get("/api/health", (c) => c.json({ status: "ok" }));

export type AppType = typeof app;

export default app;
