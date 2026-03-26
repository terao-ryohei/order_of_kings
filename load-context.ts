import type { AppLoadContext } from "@remix-run/cloudflare";
import type { Context } from "hono";
import type { PlatformProxy } from "wrangler";

type Cloudflare = Omit<PlatformProxy<Env["Bindings"]>, "dispose">;

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: Cloudflare;
    extra: string;
    hono: {
      context: Context<Env>;
    };
  }
}

type GetLoadContext = (args: {
  request: Request;
  context: {
    cloudflare: Cloudflare;
    hono: { context: Context<Env> };
  };
}) => AppLoadContext;

export const getLoadContext: GetLoadContext = ({ context }) => {
  return {
    ...context,
    extra: "stuff",
  };
};
