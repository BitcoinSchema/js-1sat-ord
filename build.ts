#!/usr/bin/env bun
import { $ } from "bun";

// Clean dist directory
await $`rimraf dist`;

// Generate TypeScript declarations
console.log("Generating TypeScript declarations...");
await $`tsc --emitDeclarationOnly --outDir dist`;

// External dependencies - keep these external in all builds
const external = [
  "@bsv/sdk",
  "image-meta",
  "satoshi-token",
  "sigma-protocol"
];

// Build CommonJS
console.log("Building CommonJS...");
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "cjs",
  naming: "index.cjs",
  external,
  sourcemap: "external",
  minify: true,
});

// Build ESM (module)
console.log("Building ESM module...");
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  naming: "index.module.js",
  external,
  sourcemap: "external",
  minify: true,
});

// Build Modern ESM
console.log("Building Modern ESM...");
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser",
  format: "esm",
  naming: "index.modern.js",
  external,
  sourcemap: "external",
  minify: true,
});

// Build UMD (IIFE for browsers)
console.log("Building UMD...");
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser",
  format: "iife",
  naming: "index.umd.js",
  external,
  sourcemap: "external",
  minify: true,
  globalName: "js1satOrd",
});

console.log("\nBuild complete!");
console.log("Output files:");
await $`ls -lh dist/*.js dist/*.cjs`;
