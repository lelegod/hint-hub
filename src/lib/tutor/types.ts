export type SessionStatus =
  | "setup"
  | "active_hint"
  | "awaiting_final"
  | "evaluating"
  | "completed"
  | "connection_game";

export interface UploadedFileMeta {
  name: string;
  url: string;
  mime: string;
  size: number;
}

export interface UploadedFiles {
  problemPdf: UploadedFileMeta | null;
  sourceMaterial: UploadedFileMeta | null;
  extraFile: UploadedFileMeta | null;
}

export interface MicroChallenge {
  hint: string;
  sourceReference: string;
  microChallenge: string;
  choices: string[];
  correctIndex: number;
  correctExplanation: string;
}

export interface ReasoningEvaluation {
  choiceCorrect: boolean;
  reasoningQuality: "strong" | "partial" | "weak";
  feedback: string;
  suggestion: string;
}

export interface HintEntry {
  id: string;
  challenge: MicroChallenge;
  selectedIndex: number | null;
  reasoning: string;
  submitted: boolean;
  wasCorrect: boolean | null;
  reasoningEval: ReasoningEvaluation | null;
  evaluatingReasoning: boolean;
}

export interface FinalEvaluation {
  correct: boolean;
  feedback: string;
  whereWentWrong: string;
}

export interface ConnectionGroup {
  theme: string;
  terms: string[];
  explanation: string;
}
