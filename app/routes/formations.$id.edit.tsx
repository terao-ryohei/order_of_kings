import { redirect } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ params }: LoaderFunctionArgs) {
  return redirect(`/formations`);
}

export async function action({ params }: ActionFunctionArgs) {
  return redirect(`/formations`);
}
