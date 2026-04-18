import { supabase } from "@/integrations/supabase/client";
import type { MicroChallenge, FinalEvaluation, ConnectionGroup } from "./types";

interface TutorPayload {
  mode: "hint" | "evaluate_final" | "connection_game";
  problemSummary?: string;
  sourceSummary?: string;
  extraSummary?: string;
  totalHints?: number;
  hintIndex?: number;
  previousHints?: string[];
  finalAnswer?: string;
}

export async function callTutor<T>(payload: TutorPayload): Promise<T> {
  const { data, error } = await supabase.functions.invoke("tutor-ai", { body: payload });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { result: T }).result;
}

export const requestHint = (p: Omit<TutorPayload, "mode">) =>
  callTutor<MicroChallenge>({ ...p, mode: "hint" });

export const evaluateFinal = (p: Omit<TutorPayload, "mode">) =>
  callTutor<FinalEvaluation>({ ...p, mode: "evaluate_final" });

export const fetchConnectionGame = (p: Omit<TutorPayload, "mode">) =>
  callTutor<{ groups: ConnectionGroup[] }>({ ...p, mode: "connection_game" });
