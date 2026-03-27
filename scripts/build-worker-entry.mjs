import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildServerDir = resolve(rootDir, "build/server");
const serverEntryPath = resolve(buildServerDir, "index.js");
const remixEntryPath = resolve(buildServerDir, "remix.js");

const workerEntry = `import handle from "hono-remix-adapter/cloudflare-workers";
import * as build from "./remix.js";
import app from "../../server/index.ts";
import { getLoadContext } from "../../load-context.ts";

export default handle(build, app, { getLoadContext });
`;

await mkdir(buildServerDir, { recursive: true });
await rename(serverEntryPath, remixEntryPath);
await writeFile(serverEntryPath, workerEntry);
