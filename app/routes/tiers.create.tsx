import { redirect } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader(_: LoaderFunctionArgs) {
  return redirect("/formations/create");
}
