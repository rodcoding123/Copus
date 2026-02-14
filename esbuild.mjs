import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

// ── Vendor copy: Chart.js UMD bundle → media/vendor/ ──
function copyVendorAssets() {
  const src = resolve(__dirname, "node_modules/chart.js/dist/chart.umd.js");
  const destDir = resolve(__dirname, "media/vendor");
  const dest = resolve(destDir, "chart.min.js");

  if (!existsSync(src)) {
    console.warn("Warning: chart.js UMD bundle not found at", src);
    return;
  }
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  console.log("Vendor: chart.js → media/vendor/chart.min.js");
}

copyVendorAssets();

// ── esbuild: bundle extension host code ──
/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
  minify: false,
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  console.log("Build complete: dist/extension.js");
}
