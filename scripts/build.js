const path = require("path");
const fs = require("fs").promises;
const { build } = require("esbuild");

async function copy(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function run() {
  const root = path.resolve(__dirname, "..");
  const outDir = path.join(root, "dist");

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  await build({
    entryPoints: [path.join(root, "src", "main.ts")],
    bundle: true,
    platform: "browser",
    format: "esm",
    sourcemap: true,
    target: ["es2022"],
    outfile: path.join(outDir, "main.js"),
    tsconfig: path.join(root, "tsconfig.json"),
  });

  await copy(path.join(root, "index.html"), path.join(outDir, "index.html"));
  await copy(path.join(root, "index.css"), path.join(outDir, "index.css"));
  await copy(path.join(root, "help.html"), path.join(outDir, "help.html"));

}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
