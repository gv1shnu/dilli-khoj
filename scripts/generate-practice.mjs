import { writeFile } from "node:fs/promises";
import { generatePracticeContent, loadAuthoringCatalog } from "./practice-content.mjs";

const content = await generatePracticeContent(await loadAuthoringCatalog());
await writeFile(new URL("../src/questions/practice.generated.json", import.meta.url), content);
console.log("Generated 20 public practice archives; expected rows computed by PostgreSQL.");
