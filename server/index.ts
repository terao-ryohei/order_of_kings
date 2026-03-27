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

const BAD_UA_PATTERNS = [/^$/, /python-requests/i, /Go-http-client/i, /curl\//i, /wget\//i, /scrapy/i, /libwww-perl/i];
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

const app = new Hono<Env>();

app.basePath("/");
app.onError((err, c) => handleError(err, c));
app.use(cors());
app.use(poweredBy());
app.use(prettyJSON());

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
});

app.use("/api/*", async (c, next) => {
  const ua = c.req.header("User-Agent") ?? "";
  if (BAD_UA_PATTERNS.some((pattern) => pattern.test(ua))) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});

app.use("/api/*", async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
    if (entry.count > RATE_LIMIT) {
      return c.json({ error: "Too Many Requests" }, 429);
    }
  }

  await next();
});

app.use("/api/*", async (c, next) => {
  if (c.req.method === "POST") {
    const origin = c.req.header("Origin");
    const host = c.req.header("Host");

    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return c.json({ error: "CSRF check failed" }, 403);
        }
      } catch {
        return c.json({ error: "CSRF check failed" }, 403);
      }
    }
  }

  await next();
});

// API routes
app.get("/api/warriors/search", ...searchWarriors);
app.get("/api/warriors", ...getWarriors);
app.get("/api/warriors/:id", ...getWarrior);
app.get("/api/skills", ...getSkills);
app.get("/api/skills/:id", ...getSkill);
app.post("/api/share-formation", ...shareFormation);
app.get("/api/formation/:uuid", ...getFormation);
app.get("/api/health", (c) => c.json({ status: "ok" }));

export type AppType = typeof app;

export default app;
