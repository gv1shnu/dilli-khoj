import content from "./practice.generated.json";
import type { RuinQuestion } from "./catalog";
import type { TabularResult } from "../sql/result-policy";

export type PracticeQuestion = Omit<
  RuinQuestion,
  "canonicalSolution" | "acceptedVariants" | "hints"
> & {
  hintCount: number;
  fixtureSql: string;
  expected: TabularResult;
};

export const PRACTICE_QUESTIONS: readonly PracticeQuestion[] = content.map(
  (entry) => ({
    ...entry,
    status: entry.status === "live" ? "live" : "drafted",
  }),
);
export const PRACTICE_VERSION = "2026-09-04.1";

export function practiceQuestion(id: number): PracticeQuestion {
  const question = PRACTICE_QUESTIONS.find((entry) => entry.id === id);
  if (!question) throw new Error("Unknown archive.");
  return question;
}
