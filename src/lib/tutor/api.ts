import { supabase } from "@/integrations/supabase/client";
import type {
  MicroChallenge,
  FinalEvaluation,
  ConnectionGroup,
  UploadedFiles,
  ReasoningEvaluation,
} from "./types";

interface AttachmentPayload {
  url: string;
  mime: string;
  label: string;
}

interface TutorPayload {
  mode: "hint" | "evaluate_final" | "connection_game" | "evaluate_reasoning";
  problemSummary?: string;
  sourceSummary?: string;
  extraSummary?: string;
  totalHints?: number;
  hintIndex?: number;
  previousHints?: string[];
  finalAnswer?: string;
  attachments?: AttachmentPayload[];
  // evaluate_reasoning
  hintText?: string;
  microChallenge?: string;
  choices?: string[];
  correctIndex?: number;
  selectedIndex?: number;
  studentReasoning?: string;
}

export function buildAttachments(files: UploadedFiles): AttachmentPayload[] {
  const out: AttachmentPayload[] = [];
  if (files.problemPdf)
    out.push({ url: files.problemPdf.url, mime: files.problemPdf.mime, label: "PROBLEM" });
  if (files.sourceMaterial)
    out.push({ url: files.sourceMaterial.url, mime: files.sourceMaterial.mime, label: "SOURCE" });
  if (files.extraFile)
    out.push({ url: files.extraFile.url, mime: files.extraFile.mime, label: "EXTRA" });
  return out;
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

export const evaluateReasoning = (p: Omit<TutorPayload, "mode">) =>
  callTutor<ReasoningEvaluation>({ ...p, mode: "evaluate_reasoning" });
