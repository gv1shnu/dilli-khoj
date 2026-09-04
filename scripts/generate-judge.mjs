import { writeFile } from "node:fs/promises";
import { loadAuthoringCatalog } from "./practice-content.mjs";
import { generateJudgeContent } from "./judge-content.mjs";
await writeFile(
  new URL(
    "../supabase/migrations/20260904120000_all_ruin_fixtures.sql",
    import.meta.url,
  ),
  await generateJudgeContent(await loadAuthoringCatalog()),
);
console.log(
  "Generated 60 versioned server fixtures, private help and computed expected results.",
);
