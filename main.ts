// Hand-in program: copies game/ and screenshots/ to the output directory
// and writes dossier.json with buildDossier from vendor/makefun-game.ts.
// Standard library only. Runs twice and writes identical bytes.
import { buildDossier } from "./vendor/makefun-game.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

function copyTree(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyTree(source, target);
    } else if (entry.isFile()) {
      fs.copyFileSync(source, target);
    }
  }
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
copyTree(path.join(repoRoot, "game"), path.join(outputDir, "game"));
copyTree(path.join(repoRoot, "screenshots"), path.join(outputDir, "screenshots"));

const dossier = await buildDossier(repoRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
});
const dossierPath = path.join(outputDir, "dossier.json");
if (typeof dossier === "string") {
  fs.writeFileSync(dossierPath, dossier, "utf8");
} else {
  fs.writeFileSync(dossierPath, Buffer.from(dossier));
}
console.log("Wrote " + dossierPath);
