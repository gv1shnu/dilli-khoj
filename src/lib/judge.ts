import { PRACTICE_VERSION, practiceQuestion } from "../questions/practice";
import { supabase } from "./supabase";
import { pendingSubmission, finishSubmission } from "./submission-request";

export interface JudgeVerdict {
  correct: boolean;
  message: string;
  casesPassed: number;
  casesTotal: number;
  xp: number;
}

export async function submitToJudge(
  sql: string,
  ruinId: number = 1,
): Promise<JudgeVerdict> {
  practiceQuestion(ruinId);
  if (!supabase) {
    throw new Error(
      "The server judge is not configured in this browser. Practice is still available.",
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session)
    throw new Error("Sign in before submitting for progression.");

  const player = sessionData.session.user.id;
  const pending = pendingSubmission(player, ruinId, PRACTICE_VERSION, sql);
  const { data, error } = await supabase.functions.invoke<JudgeVerdict>(
    "judge-query",
    {
      body: {
        submission_id: pending.id,
        ruin: ruinId,
        variant: "first-pass",
        dataset_version: PRACTICE_VERSION,
        sql,
      },
    },
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error("The judge returned no verdict.");
  finishSubmission(player, ruinId, pending.id);
  return data;
}
