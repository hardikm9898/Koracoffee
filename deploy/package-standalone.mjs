#!/usr/bin/env node
// Packages a Next.js `output: "standalone"` build into a committable sibling
// folder, so the server only needs to `git pull` + `pm2 restart` — no
// `npm install` / `npm run build` on the target machine.
//
// Usage (run from the app directory, e.g. front-end/frontend):
//   node ../../deploy/package-standalone.mjs <outDirName>
//
// Requires `next build` (with output: "standalone" in next.config.ts) to
// have already run in the current directory.

import { cpSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const outDirName = process.argv[2];
if (!outDirName) {
  console.error("Usage: node deploy/package-standalone.mjs <outDirName>");
  process.exit(1);
}

const appPath = process.cwd();
const standaloneDir = path.join(appPath, ".next", "standalone");
const staticDir = path.join(appPath, ".next", "static");
const publicDir = path.join(appPath, "public");
const outPath = path.resolve(appPath, "..", outDirName);

if (!existsSync(standaloneDir)) {
  console.error(
    `No standalone build at ${standaloneDir} — run "next build" first (and make sure next.config.ts has output: "standalone").`
  );
  process.exit(1);
}

rmSync(outPath, { recursive: true, force: true });
cpSync(standaloneDir, outPath, { recursive: true });
cpSync(staticDir, path.join(outPath, ".next", "static"), { recursive: true });
if (existsSync(publicDir)) {
  cpSync(publicDir, path.join(outPath, "public"), { recursive: true });
}

console.log(`Packaged standalone build -> ${outPath}`);
console.log(`Run it with: node ${path.join(outDirName, "server.js")}`);
