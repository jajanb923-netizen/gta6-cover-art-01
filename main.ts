// Neon Sunset Cover Studio — the hand-in program for make.fun
// bounty gta6-cover-art-01 (Node 22, standard library only).
//
// The app itself is plain static files under app/ (index.html plus its
// modules, styles, the Anton font and sample photos) that any static
// server can host and desktop Chrome opens offline. This program's only
// job is to hand those files, plus screenshots/, to the grader: it copies
// both trees beside this file into the output directory and writes the
// dossier.json the judge reads, built with the vendored make.fun library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output, twice, and check both runs agree byte for byte:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally while building with `node serve.ts`, then open
// http://localhost:8080 in desktop Chrome.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('app');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyTree('screenshots');

// The scorer's caps for this bounty: the dossier text is capped at
// 160 KiB, at most 4 screenshots of 256 KiB each, and app/ stays under
// 993 files and 48 MiB. An entry over any of those is refused outright,
// so the dossier builder is told the same limits the scorer enforces.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
