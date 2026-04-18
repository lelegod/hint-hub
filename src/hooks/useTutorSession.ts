import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ConnectionGroup,
  FinalEvaluation,
  HintEntry,
  MicroChallenge,
  SessionStatus,
  UploadedFileMeta,
  UploadedFiles,
} from "@/lib/tutor/types";
import { buildAttachments, evaluateFinal, evaluateReasoning, fetchConnectionGame, requestHint } from "@/lib/tutor/api";
import { initialFriends, initialHistory, type FriendUpdate, type HistoryItem } from "@/lib/tutor/mockData";
import { useGamification } from "@/hooks/useGamification";

const emptyFiles: UploadedFiles = {
  problemPdf: null,
  sourceMaterial: null,
  extraFile: null,
};

function newEntry(c: MicroChallenge): HintEntry {
  return {
    id: crypto.randomUUID(),
    challenge: c,
    selectedIndex: null,
    reasoning: "",
    submitted: false,
    wasCorrect: null,
    reasoningEval: null,
    evaluatingReasoning: false,
  };
}

export function useTutorSession() {
  const game = useGamification();

  // Setup
  const [files, setFiles] = useState<UploadedFiles>(emptyFiles);
  const [totalHints, setTotalHints] = useState(3);
  const [problemSummary, setProblemSummary] = useState("");
  const [sourceSummary, setSourceSummary] = useState("");
  const [extraSummary, setExtraSummary] = useState("");

  // Session
  const [status, setStatus] = useState<SessionStatus>("setup");
  const [hints, setHints] = useState<HintEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingHint, setLoadingHint] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Final
  const [finalAnswer, setFinalAnswer] = useState("");
  const [finalEval, setFinalEval] = useState<FinalEvaluation | null>(null);

  // Connection game
  const [connection, setConnection] = useState<{ groups: ConnectionGroup[] } | null>(null);

  // Sidebar mock
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [friends] = useState<FriendUpdate[]>(initialFriends);

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
    // Spend a hint token (only if signed in & has tokens)
    if (game.authed && game.state) {
      const ok = await game.spendHintToken();
      if (!ok) {
        setErrorMsg("You're out of hint tokens. They regenerate over time — come back soon!");
        return;
      }
    }
    // Touch streak on the first session of the day
    void game.touchStreak();
    // Plant a skill node from the problem topic (first ~40 chars)
    void game.practiceTopic(problemSummary.slice(0, 40));

    setStatus("active_hint");
    setHints([]);
    setCurrentIndex(0);
    setFinalEval(null);
    setFinalAnswer("");
    setConnection(null);
    setLoadingHint(true);
    try {
      const c = await requestHint({
        problemSummary,
        sourceSummary,
        extraSummary,
        totalHints,
        hintIndex: 0,
        previousHints: [],
        attachments: buildAttachments(files),
      });
      setHints([newEntry(c)]);
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

      // Mark submitted + start evaluating
      setHints((hs) =>
        hs.map((h) =>
          h.id === entryId
            ? { ...h, submitted: true, wasCorrect, evaluatingReasoning: true, reasoningEval: null }
            : h,
        ),
      );

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
    [hints, problemSummary, sourceSummary, extraSummary, files],
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
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to fetch next hint");
    } finally {
      setLoadingHint(false);
    }
  }, [currentIndex, totalHints, problemSummary, sourceSummary, extraSummary, hints]);

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
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to fetch extra hint");
    } finally {
      setLoadingHint(false);
    }
  }, [hints, problemSummary, sourceSummary, extraSummary]);

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
        // append to history
        setHistory((h) => [
          {
            id: crypto.randomUUID(),
            title: problemSummary.slice(0, 60) || "Untitled session",
            hintsUsed: hints.length,
            completedAt: "Just now",
          },
          ...h,
        ]);
      } else {
        // incorrect: auto add another hint and return to active loop
        await requestExtraHint();
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to evaluate answer");
      setStatus("awaiting_final");
    }
  }, [finalAnswer, problemSummary, sourceSummary, extraSummary, hints.length, requestExtraHint]);

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
  }, [problemSummary, sourceSummary, extraSummary, hints]);

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
    setErrorMsg(null);
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
    // sidebar
    history,
    friends,
    resetSession,
  };
}

export type TutorSession = ReturnType<typeof useTutorSession>;
