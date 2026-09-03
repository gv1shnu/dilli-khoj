import { DATASET_VERSION, ruinSix } from "../questions/ruin-six";
import { supabase } from "./supabase";

export interface JudgeVerdict {
  correct: boolean;
  message: string;
  casesPassed: number;
  casesTotal: number;
  xp: number;
}

export async function submitToJudge(sql: string): Promise<JudgeVerdict> {
  if (!supabase) {
    throw new Error("The server judge is not configured in this browser. Practice is still available.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Sign in before submitting for progression.");

  const { data, error } = await supabase.functions.invoke<JudgeVerdict>("judge-query", {
    body: {
      submission_id: crypto.randomUUID(),
      ruin: ruinSix.id,
      variant: "first-pass",
      dataset_version: DATASET_VERSION,
      sql,
    },
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("The judge returned no verdict.");
  return data;
}
