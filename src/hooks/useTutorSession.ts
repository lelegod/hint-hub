import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  ConnectionGroup,
  FinalEvaluation,
  HintEntry,
  MatchPair,
  MicroChallenge,
  SessionStatus,
  UploadedFileMeta,
  UploadedFiles,
} from "@/lib/tutor/types";
import {
  buildAttachments,
  evaluateFinal,
  evaluateReasoning,
  extractProblemFromFiles,
  fetchConnectionGame,
  fetchMatchGame,
  requestHint,
} from "@/lib/tutor/api";
import { useGamification } from "@/hooks/useGamification";
import { useSessionsAndFriends } from "@/hooks/useSessionsAndFriends";

const emptyFiles: UploadedFiles = {
  problemPdf: null,
  sourceMaterial: null,
  extraFile: null,
};

function newEntry(c: MicroChallenge, dbId?: string): HintEntry {
  return {
    id: dbId ?? crypto.randomUUID(),
    challenge: c,
    selectedIndex: null,
    reasoning: "",
    submitted: false,
    wasCorrect: null,
    reasoningEval: null,
    evaluatingReasoning: false,
  };
}

// Persist a newly created hint entry to the DB. Returns the DB row id (or null on failure).
async function persistNewHint(
  sessionId: string | null,
  hintIndex: number,
  challenge: MicroChallenge,
): Promise<string | null> {
  if (!sessionId) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("hint_entries")
      .insert([
        {
          session_id: sessionId,
          user_id: user.id,
          hint_index: hintIndex,
          challenge: challenge as unknown as Json,
        },
      ])
      .select("id")
      .single();
    if (error) {
      console.error("persistNewHint failed", error);
      return null;
    }
    return data.id;
  } catch (e) {
    console.error("persistNewHint error", e);
    return null;
  }
}

type HintUpdatePatch = Partial<{
  selected_index: number | null;
  reasoning: string;
  submitted: boolean;
  was_correct: boolean | null;
  reasoning_eval: Json;
}>;

async function persistHintUpdate(entryId: string, patch: HintUpdatePatch) {
  try {
    await supabase.from("hint_entries").update(patch).eq("id", entryId);
  } catch (e) {
    console.error("persistHintUpdate error", e);
  }
}

export function useTutorSession() {
  const game = useGamification();
  const sessionsHook = useSessionsAndFriends();

  // Setup
  const [files, setFiles] = useState<UploadedFiles>(emptyFiles);
  const [totalHints, setTotalHints] = useState(3);
  const [problemSummary, setProblemSummary] = useState("");
  const [sourceSummary, setSourceSummary] = useState("");
  const [extraSummary, setExtraSummary] = useState("");
  // The full extracted problem text (from uploaded file, AI-extracted at session start)
  const [fullExtractedProblemText, setFullExtractedProblemText] = useState<string>("");

  // Session
  const [status, setStatus] = useState<SessionStatus>("setup");
  const [hints, setHints] = useState<HintEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingHint, setLoadingHint] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Persistent session row id
  const [sessionRowId, setSessionRowId] = useState<string | null>(null);

  // Final
  const [finalAnswer, setFinalAnswer] = useState("");
  const [finalEval, setFinalEval] = useState<FinalEvaluation | null>(null);

  // Connection game
  const [connection, setConnection] = useState<{ groups: ConnectionGroup[] } | null>(null);

  // Match mini-game
  const [match, setMatch] = useState<{ pairs: MatchPair[] } | null>(null);
  const [previousStatus, setPreviousStatus] = useState<SessionStatus>("setup");

  // Re-fetch sessions list when this session completes
  useEffect(() => {
    if (status === "completed") void sessionsHook.refresh();
  }, [status, sessionsHook]);

  // ----- File upload -----
  const uploadFile = useCallback(
    async (key: keyof UploadedFiles, file: File): Promise<UploadedFileMeta> => {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("session-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("session-files").getPublicUrl(path);
      const meta: UploadedFileMeta = {
        name: file.name,
        url: data.publicUrl,
        mime: file.type,
        size: file.size,
      };
      setFiles((f) => ({ ...f, [key]: meta }));
      return meta;
    },
    [],
  );

  const setSummary = useCallback(
    (key: keyof UploadedFiles, text: string) => {
      if (key === "problemPdf") setProblemSummary(text);
      if (key === "sourceMaterial") setSourceSummary(text);
      if (key === "extraFile") setExtraSummary(text);
    },
    [],
  );

  // ----- Session start -----
  const startSession = useCallback(async () => {
    setErrorMsg(null);
    if (!problemSummary.trim()) {
      setErrorMsg("Please describe the problem briefly so the tutor knows what to work on.");
      return;
    }
    void game.touchStreak();
    void game.practiceTopic(problemSummary.slice(0, 40));

    setStatus("active_hint");
    setHints([]);
    setCurrentIndex(0);
    setFinalEval(null);
    setFinalAnswer("");
    setConnection(null);
    setLoadingHint(true);
    setFullExtractedProblemText("");

    // 1. Create session row in DB (only if authed)
    let dbRowId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: row, error: insertErr } = await supabase
          .from("tutor_sessions")
          .insert({
            user_id: user.id,
            title: problemSummary.slice(0, 80) || "Untitled session",
            problem_summary: problemSummary,
            source_summary: sourceSummary || null,
            extra_summary: extraSummary || null,
            total_hints_planned: totalHints,
            status: "active",
            problem_file_url: files.problemPdf?.url ?? null,
            problem_file_name: files.problemPdf?.name ?? null,
            source_file_url: files.sourceMaterial?.url ?? null,
            source_file_name: files.sourceMaterial?.name ?? null,
            extra_file_url: files.extraFile?.url ?? null,
            extra_file_name: files.extraFile?.name ?? null,
          })
          .select("id")
          .single();
        if (!insertErr && row) {
          dbRowId = row.id;
          setSessionRowId(row.id);
          // Log start activity
          await supabase.from("activity_events").insert({
            user_id: user.id,
            type: "session_started",
            message: `started "${problemSummary.slice(0, 60) || "a new session"}"`,
            session_id: row.id,
          });
          // Update presence activity
          await supabase.rpc("set_my_activity", {
            _activity: problemSummary.slice(0, 80) || "Solving a problem",
          });
          // Immediately refresh sidebar so the new session appears now
          void sessionsHook.refresh();
        }
      }
    } catch (e) {
      console.error("Failed to persist session start", e);
    }

    // 2. If a problem file was uploaded, AI-extract the full problem text in parallel with first hint
    const attachments = buildAttachments(files);
    const extractPromise = files.problemPdf
      ? extractProblemFromFiles({
          problemSummary,
          sourceSummary,
          extraSummary,
          attachments,
        }).catch((e) => {
          console.error("extract_problem failed", e);
          return null;
        })
      : Promise.resolve(null);

    try {
      const [c, extracted] = await Promise.all([
        requestHint({
          problemSummary,
          sourceSummary,
          extraSummary,
          totalHints,
          hintIndex: 0,
          previousHints: [],
          attachments,
        }),
        extractPromise,
      ]);

      setHints([newEntry(c)]);

      // Use extracted text if available, otherwise fall back to the typed summary
      const problemText = extracted?.fullProblemText || problemSummary;
      setFullExtractedProblemText(problemText);

      // Persist extracted text + AI title
      if (dbRowId) {
        await supabase
          .from("tutor_sessions")
          .update({
            full_problem_text: problemText,
            ...(extracted?.title ? { title: extracted.title } : {}),
          })
          .eq("id", dbRowId);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to start session");
      setStatus("setup");
    } finally {
      setLoadingHint(false);
    }
  }, [problemSummary, sourceSummary, extraSummary, totalHints, files, game]);

  // ----- Action box mutations -----
  const selectChoice = useCallback((entryId: string, idx: number) => {
    setHints((hs) => hs.map((h) => (h.id === entryId ? { ...h, selectedIndex: idx } : h)));
  }, []);

  const setReasoning = useCallback((entryId: string, text: string) => {
    setHints((hs) => hs.map((h) => (h.id === entryId ? { ...h, reasoning: text } : h)));
  }, []);

  const submitChoice = useCallback(
    async (entryId: string) => {
      const entry = hints.find((h) => h.id === entryId);
      if (!entry || entry.selectedIndex === null) return;
      const wasCorrect = entry.selectedIndex === entry.challenge.correctIndex;

      setHints((hs) =>
        hs.map((h) =>
          h.id === entryId
            ? { ...h, submitted: true, wasCorrect, evaluatingReasoning: true, reasoningEval: null }
            : h,
        ),
      );

      void game.awardHintXp(wasCorrect);
      game.bumpHeat();

      try {
        const evalResult = await evaluateReasoning({
          problemSummary,
          sourceSummary,
          extraSummary,
          attachments: buildAttachments(files),
          hintText: entry.challenge.hint,
          microChallenge: entry.challenge.microChallenge,
          choices: entry.challenge.choices,
          correctIndex: entry.challenge.correctIndex,
          selectedIndex: entry.selectedIndex,
          studentReasoning: entry.reasoning,
        });
        setHints((hs) =>
          hs.map((h) =>
            h.id === entryId
              ? { ...h, evaluatingReasoning: false, reasoningEval: evalResult }
              : h,
          ),
        );
      } catch (e) {
        console.error("evaluateReasoning failed", e);
        setHints((hs) =>
          hs.map((h) => (h.id === entryId ? { ...h, evaluatingReasoning: false } : h)),
        );
      }
    },
    [hints, problemSummary, sourceSummary, extraSummary, files, game],
  );

  // ----- Continue to next hint or move to final -----
  const continueNext = useCallback(async () => {
    setErrorMsg(null);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalHints) {
      setStatus("awaiting_final");
      return;
    }
    setLoadingHint(true);
    try {
      const c = await requestHint({
        problemSummary,
        sourceSummary,
        extraSummary,
        totalHints,
        hintIndex: nextIndex,
        previousHints: hints.map((h) => h.challenge.hint),
        attachments: buildAttachments(files),
      });
      setHints((hs) => [...hs, newEntry(c)]);
      setCurrentIndex(nextIndex);
      if (sessionRowId) {
        await supabase
          .from("tutor_sessions")
          .update({ hints_used: hints.length + 1 })
          .eq("id", sessionRowId);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to fetch next hint");
    } finally {
      setLoadingHint(false);
    }
  }, [currentIndex, totalHints, problemSummary, sourceSummary, extraSummary, hints, files, sessionRowId]);

  // ----- Extra hint (when stuck on final) -----
  const requestExtraHint = useCallback(async () => {
    setErrorMsg(null);
    setStatus("active_hint");
    setLoadingHint(true);
    try {
      const c = await requestHint({
        problemSummary,
        sourceSummary,
        extraSummary,
        totalHints: hints.length + 1,
        hintIndex: hints.length,
        previousHints: hints.map((h) => h.challenge.hint),
        attachments: buildAttachments(files),
      });
      setHints((hs) => [...hs, newEntry(c)]);
      setCurrentIndex(hints.length);
      if (sessionRowId) {
        await supabase
          .from("tutor_sessions")
          .update({ hints_used: hints.length + 1 })
          .eq("id", sessionRowId);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to fetch extra hint");
    } finally {
      setLoadingHint(false);
    }
  }, [hints, problemSummary, sourceSummary, extraSummary, files, sessionRowId]);

  // ----- Final submission -----
  const submitFinal = useCallback(async () => {
    if (!finalAnswer.trim()) return;
    setErrorMsg(null);
    setStatus("evaluating");
    try {
      const result = await evaluateFinal({
        problemSummary,
        sourceSummary,
        extraSummary,
        finalAnswer,
        attachments: buildAttachments(files),
      });
      setFinalEval(result);
      if (result.correct) {
        setStatus("completed");
        void game.awardSessionComplete();
        game.bumpHeat();

        if (sessionRowId) {
          await supabase
            .from("tutor_sessions")
            .update({
              status: "completed",
              final_answer: finalAnswer,
              final_correct: true,
              final_feedback: result.feedback,
              hints_used: hints.length,
              completed_at: new Date().toISOString(),
            })
            .eq("id", sessionRowId);
        }
        // Clear current activity on completion
        void supabase.rpc("set_my_activity", { _activity: "" });
      } else {
        if (sessionRowId) {
          await supabase
            .from("tutor_sessions")
            .update({
              final_answer: finalAnswer,
              final_correct: false,
              final_feedback: result.feedback,
            })
            .eq("id", sessionRowId);
        }
        await requestExtraHint();
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to evaluate answer");
      setStatus("awaiting_final");
    }
  }, [finalAnswer, problemSummary, sourceSummary, extraSummary, hints.length, requestExtraHint, files, game, sessionRowId]);

  // ----- Connection game -----
  const startConnectionGame = useCallback(async () => {
    setErrorMsg(null);
    setStatus("connection_game");
    try {
      const result = await fetchConnectionGame({
        problemSummary,
        sourceSummary,
        extraSummary,
        previousHints: hints.map((h) => h.challenge.hint),
        attachments: buildAttachments(files),
      });
      setConnection(result);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load connection game");
      setStatus("completed");
    }
  }, [problemSummary, sourceSummary, extraSummary, hints, files]);

  // ----- Match mini-game (sidebar tab) -----
  const startMatchGame = useCallback(async () => {
    setErrorMsg(null);
    setPreviousStatus(status);
    setStatus("match_game");
    setMatch(null);
    try {
      const result = await fetchMatchGame({
        problemSummary,
        sourceSummary,
        extraSummary,
        previousHints: hints.map((h) => h.challenge.hint),
        attachments: buildAttachments(files),
      });
      setMatch(result);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load match game");
      setStatus(previousStatus);
    }
  }, [problemSummary, sourceSummary, extraSummary, hints, files, status, previousStatus]);

  const closeMatchGame = useCallback(() => {
    setMatch(null);
    setStatus(previousStatus === "match_game" ? "setup" : previousStatus);
  }, [previousStatus]);

  // ----- Load an existing session from DB (resume or view) -----
  const loadSession = useCallback(async (id: string) => {
    setErrorMsg(null);
    setLoadingHint(true);
    try {
      const { data: row, error } = await supabase
        .from("tutor_sessions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !row) {
        setErrorMsg("Could not load that session.");
        setLoadingHint(false);
        return;
      }

      // Restore setup
      setProblemSummary(row.problem_summary ?? "");
      setSourceSummary(row.source_summary ?? "");
      setExtraSummary(row.extra_summary ?? "");
      setTotalHints(row.total_hints_planned ?? 3);
      setFullExtractedProblemText(row.full_problem_text ?? "");
      setSessionRowId(row.id);
      setFiles({
        problemPdf: row.problem_file_url
          ? { name: row.problem_file_name ?? "problem", url: row.problem_file_url, mime: "", size: 0 }
          : null,
        sourceMaterial: row.source_file_url
          ? { name: row.source_file_name ?? "source", url: row.source_file_url, mime: "", size: 0 }
          : null,
        extraFile: row.extra_file_url
          ? { name: row.extra_file_name ?? "extra", url: row.extra_file_url, mime: "", size: 0 }
          : null,
      });
      setHints([]);
      setCurrentIndex(0);
      setConnection(null);

      if (row.status === "completed") {
        // Show the completed final-answer screen
        setFinalAnswer(row.final_answer ?? "");
        setFinalEval(
          row.final_feedback
            ? {
                correct: !!row.final_correct,
                feedback: row.final_feedback,
                whereWentWrong: "",
              }
            : null,
        );
        setStatus("completed");
        setLoadingHint(false);
        return;
      }

      // Active session: re-fetch a fresh hint at the right position so the user can continue
      setFinalAnswer(row.final_answer ?? "");
      setFinalEval(null);
      const hintIndex = Math.min(row.hints_used ?? 0, (row.total_hints_planned ?? 3) - 1);
      const attachments = buildAttachments({
        problemPdf: row.problem_file_url
          ? { name: row.problem_file_name ?? "problem", url: row.problem_file_url, mime: "", size: 0 }
          : null,
        sourceMaterial: row.source_file_url
          ? { name: row.source_file_name ?? "source", url: row.source_file_url, mime: "", size: 0 }
          : null,
        extraFile: row.extra_file_url
          ? { name: row.extra_file_name ?? "extra", url: row.extra_file_url, mime: "", size: 0 }
          : null,
      });

      if ((row.hints_used ?? 0) >= (row.total_hints_planned ?? 3)) {
        setStatus("awaiting_final");
        setLoadingHint(false);
        return;
      }

      setStatus("active_hint");
      try {
        const c = await requestHint({
          problemSummary: row.problem_summary ?? "",
          sourceSummary: row.source_summary ?? "",
          extraSummary: row.extra_summary ?? "",
          totalHints: row.total_hints_planned ?? 3,
          hintIndex,
          previousHints: [],
          attachments,
        });
        setHints([newEntry(c)]);
        setCurrentIndex(0);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Failed to load hint");
      }
    } finally {
      setLoadingHint(false);
    }
  }, []);

  const resetSession = useCallback(() => {
    setFiles(emptyFiles);
    setProblemSummary("");
    setSourceSummary("");
    setExtraSummary("");
    setStatus("setup");
    setHints([]);
    setCurrentIndex(0);
    setFinalAnswer("");
    setFinalEval(null);
    setConnection(null);
    setMatch(null);
    setErrorMsg(null);
    setSessionRowId(null);
    setFullExtractedProblemText("");
    void supabase.rpc("set_my_activity", { _activity: "" });
  }, []);

  return {
    // setup
    files,
    setFiles,
    uploadFile,
    totalHints,
    setTotalHints,
    problemSummary,
    setProblemSummary,
    sourceSummary,
    setSourceSummary,
    extraSummary,
    setExtraSummary,
    setSummary,
    fullExtractedProblemText,
    setFullExtractedProblemText,
    // session
    status,
    hints,
    currentIndex,
    loadingHint,
    errorMsg,
    startSession,
    selectChoice,
    setReasoning,
    submitChoice,
    continueNext,
    // final
    finalAnswer,
    setFinalAnswer,
    submitFinal,
    finalEval,
    requestExtraHint,
    // connection game
    connection,
    startConnectionGame,
    // match mini-game
    match,
    startMatchGame,
    closeMatchGame,
    // sidebar — now from real DB
    history: sessionsHook.history,
    friends: sessionsHook.friends,
    resetSession,
    loadSession,
  };
}

export type TutorSession = ReturnType<typeof useTutorSession>;
