import { redirect } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";

export async function loader(_: LoaderFunctionArgs) {
  return redirect("/tiers");
}

export async function action(_: ActionFunctionArgs) {
  return redirect("/tiers");
}
