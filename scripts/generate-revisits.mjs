import { writeFile } from "node:fs/promises";
import { loadAuthoringCatalog } from "./practice-content.mjs";
import { generateRevisits } from "./revisit-content.mjs";
await writeFile(
  new URL("../src/questions/revisits.generated.json", import.meta.url),
  await generateRevisits(await loadAuthoringCatalog()),
);
console.log(
  "Generated 40 visible revisit objectives; no solution SQL included.",
);
