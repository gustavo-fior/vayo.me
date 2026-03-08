await Bun.build({
  entrypoints: ["src/background.ts", "src/popup/popup.ts"],
  outdir: "dist",
  format: "esm",
  target: "browser",
  minify: true,
});

console.log("✅ Build complete.");
