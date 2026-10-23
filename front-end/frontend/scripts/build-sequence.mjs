#!/usr/bin/env node
/**
 * Builds the home page "From bean to cup" scroll sequence.
 *
 * Input:  sequence-src/scenes.json + the clips it lists (16:9, required)
 *           — without scenes.json, every scene-*.mp4 is used in name order
 *         sequence-src/mobile/…                    (9:16, optional, same layout)
 * Output: public/sequence/desktop/0001.webp …      (1600×900)
 *         public/sequence/mobile/0001.webp …       (720×960, 3:4 — matches the
 *                                                  mobile picture box in CoffeeStory)
 *         public/sequence/manifest.json            (read by CoffeeStory.tsx)
 *
 * Each clip is trimmed (start/end), cleaned of the AI watermark (see
 * scenes.json), scaled to cover the target size and centre-cropped; then all
 * clips are joined and sampled evenly into --frames images (default 240).
 * Without a mobile set, mobile frames are a centre crop of the 16:9 clips.
 *
 * Needs ffmpeg, found in this order:
 *   1. FFMPEG_PATH env var
 *   2. the `ffmpeg-static` dev dependency (already in package.json)
 *   3. `ffmpeg` on PATH
 *
 * Usage: npm run sequence [-- --frames 240 --quality 72]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "sequence-src");
const OUT_DIR = path.join(ROOT, "public", "sequence");

const SETS = {
  desktop: { width: 1600, height: 900, srcDir: SRC_DIR },
  mobile: { width: 720, height: 960, srcDir: path.join(SRC_DIR, "mobile") },
};

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};
const TARGET_FRAMES = argValue("frames", 240);
const QUALITY = argValue("quality", 72);

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

async function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const mod = await import("ffmpeg-static");
    if (mod.default) return mod.default;
  } catch {
    // not installed — fall through to PATH
  }
  return "ffmpeg";
}

const run = (ffmpeg, ffArgs) =>
  spawnSync(ffmpeg, ffArgs, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** Returns { scenes: [{ file, start?, end? }], watermark? } with absolute paths, or null. */
function loadScenes(dir) {
  if (!existsSync(dir)) return null;
  const configPath = path.join(dir, "scenes.json");
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const scenes = config.scenes.map((scene) => {
      const file = path.join(dir, scene.file);
      if (!existsSync(file)) fail(`${path.relative(ROOT, configPath)} lists ${scene.file}, which does not exist`);
      return { ...scene, file };
    });
    return { scenes, watermark: config.watermark };
  }
  const files = readdirSync(dir)
    .filter((f) => /^scene-.*\.(mp4|mov|webm|mkv)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files.length ? { scenes: files.map((f) => ({ file: path.join(dir, f) })) } : null;
}

/** ffmpeg prints "Duration: 00:00:05.04" for each input on stderr. */
function durationOf(ffmpeg, file) {
  const result = run(ffmpeg, ["-hide_banner", "-i", file]);
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(result.stderr || "");
  if (!match) fail(`Could not read the duration of ${path.relative(ROOT, file)}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

/** Covers the watermark with a feathered copy of the texture beside it. */
const watermarkFilter = (i, wm) =>
  `split[b${i}][s${i}];` +
  `[s${i}]crop=${wm.w}:${wm.h}:${wm.patchFromX}:${wm.patchFromY},format=yuva420p,` +
  `geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='255*min(1,min(min(X,W-X),min(Y,H-Y))/${wm.feather ?? 24})'[p${i}];` +
  `[b${i}][p${i}]overlay=${wm.x}:${wm.y}`;

function buildSet(ffmpeg, name, { scenes, watermark }, { width, height }) {
  const outDir = path.join(OUT_DIR, name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const lengths = scenes.map((scene) => {
    const end = scene.end ?? durationOf(ffmpeg, scene.file);
    return end - (scene.start ?? 0);
  });
  const total = lengths.reduce((sum, len) => sum + len, 0);
  const fps = TARGET_FRAMES / total;

  const perInput = scenes
    .map((scene, i) => {
      const trim =
        scene.start !== undefined || scene.end !== undefined
          ? `trim=start=${scene.start ?? 0}${scene.end !== undefined ? `:end=${scene.end}` : ""},setpts=PTS-STARTPTS,`
          : "";
      const cleaned = watermark ? `${watermarkFilter(i, watermark)},` : "";
      return (
        `[${i}:v]${trim}${cleaned}` +
        `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
        `crop=${width}:${height},setsar=1,fps=30[v${i}]`
      );
    })
    .join(";");
  const joined = scenes.map((_, i) => `[v${i}]`).join("");
  const filter = `${perInput};${joined}concat=n=${scenes.length}:v=1:a=0[c];[c]fps=${fps.toFixed(5)}[out]`;

  console.log(`→ ${name}: ${scenes.length} scene(s), ${total.toFixed(1)}s → ~${TARGET_FRAMES} frames @ ${width}×${height}`);

  const result = run(ffmpeg, [
    "-hide_banner",
    "-loglevel", "error",
    ...scenes.flatMap((scene) => ["-i", scene.file]),
    "-filter_complex", filter,
    "-map", "[out]",
    "-c:v", "libwebp",
    "-quality", String(QUALITY),
    "-compression_level", "5",
    "-start_number", "1",
    path.join(outDir, "%04d.webp"),
  ]);
  if (result.error) fail(`Could not run ffmpeg (${result.error.message}). See the header of this script for setup.`);
  if (result.status !== 0) fail(`ffmpeg failed for ${name}:\n${result.stderr}`);

  const frames = readdirSync(outDir).filter((f) => f.endsWith(".webp"));
  const bytes = frames.reduce((sum, f) => sum + statSync(path.join(outDir, f)).size, 0);
  console.log(`  ✓ ${frames.length} frames, ${(bytes / 1024 / 1024).toFixed(1)} MB → public/sequence/${name}/`);

  // Scene boundaries as 0–1 scroll progress, for lining up captions.
  let acc = 0;
  const sceneStarts = lengths.map((len) => {
    const at = acc / total;
    acc += len;
    return Number(at.toFixed(4));
  });

  return { path: `/sequence/${name}/`, width, height, frameCount: frames.length, sceneStarts };
}

const ffmpeg = await resolveFfmpeg();
const desktop = loadScenes(SETS.desktop.srcDir);
if (!desktop) {
  fail(`No scenes found in ${path.relative(ROOT, SRC_DIR)}/ (add scenes.json or scene-1.mp4, scene-2.mp4, …)`);
}
const mobile = loadScenes(SETS.mobile.srcDir);

const manifest = {
  version: Date.now(),
  ext: "webp",
  desktop: buildSet(ffmpeg, "desktop", desktop, SETS.desktop),
  mobile: buildSet(ffmpeg, "mobile", mobile ?? desktop, SETS.mobile),
};

writeFileSync(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("✓ public/sequence/manifest.json — reload the home page to see the sequence.");
