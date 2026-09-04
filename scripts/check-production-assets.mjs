import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { loadAuthoringCatalog } from "./practice-content.mjs";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(join(directory, entry.name))
          : [join(directory, entry.name)],
      ),
    )
  ).flat();
}
const paths = await files("dist");
const source = (
  await Promise.all(
    paths
      .filter((path) => /\.(js|json|html|map)$/.test(path))
      .map((path) => readFile(path, "utf8")),
  )
).join("\n");
const catalog = await loadAuthoringCatalog();
for (const question of catalog) {
  for (const value of [
    question.canonicalSolution,
    ...question.acceptedVariants,
    ...question.hints,
  ]) {
    assert.ok(
      !source.includes(value) &&
        !source.includes(JSON.stringify(value).slice(1, -1)),
      `Private authoring text leaked for ruin ${question.id}`,
    );
  }
}
for (const marker of [
  "canonicalSolution",
  "acceptedVariants",
  "fixture_r01_v20260904_1_hidden",
  "question_help",
  "Continue for local development",
  "WORLD LAYOUT STUDIO",
  "Walk route to archive",
]) {
  assert.ok(
    !source.includes(marker),
    `Private or DEV marker leaked: ${marker}`,
  );
}
assert.ok(
  (await stat("dist/models/soldier.glb")).size > 0,
  "Soldier asset is missing",
);
console.log(
  "Production assets passed: no authoring answers/hints or DEV bypass, Soldier present.",
);
