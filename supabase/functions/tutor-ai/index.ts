// Tutor AI edge function: returns hints, micro-challenges, final-answer evaluation,
// and a connection-game payload. Uses Lovable AI Gateway with structured tool-calling.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type Mode = "hint" | "evaluate_final" | "connection_game" | "evaluate_reasoning" | "extract_problem" | "match_game" | "strands_game" | "wordly_game";

interface Attachment {
  url: string;
  mime: string;
  label: string;
}

interface Body {
  mode: Mode;
  problemSummary?: string;
  sourceSummary?: string;
  extraSummary?: string;
  totalHints?: number;
  hintIndex?: number;
  previousHints?: string[];
  finalAnswer?: string;
  studentAnswer?: string;
  studentReasoning?: string;
  context?: string;
  attachments?: Attachment[];
  // For evaluate_reasoning
  hintText?: string;
  microChallenge?: string;
  choices?: string[];
  correctIndex?: number;
  selectedIndex?: number;
  // For connection_game
  groupCount?: number;
  // Number of source/paper attachments uploaded by the user (for wording)
  paperCount?: number;
  // 0-100 prior mastery on this topic (used to ease evaluation when familiar)
  priorMastery?: number;
}

// Fetch each attachment and convert to a data URL the AI gateway can consume.
async function loadAttachments(atts: Attachment[] = []): Promise<Array<{ label: string; mime: string; dataUrl: string }>> {
  const out: Array<{ label: string; mime: string; dataUrl: string }> = [];
  for (const a of atts) {
    try {
      const r = await fetch(a.url);
      if (!r.ok) {
        console.error("Attachment fetch failed", a.url, r.status);
        continue;
      }
      const buf = new Uint8Array(await r.arrayBuffer());
      // Chunked base64 to avoid call-stack issues on large files
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        bin += String.fromCharCode(...buf.subarray(i, i + chunk));
      }
      const b64 = btoa(bin);
      const mime = a.mime || r.headers.get("content-type") || "application/octet-stream";
      out.push({ label: a.label, mime, dataUrl: `data:${mime};base64,${b64}` });
    } catch (e) {
      console.error("Attachment load error", a.url, e);
    }
  }
  return out;
}

const HINT_TOOL = {
  type: "function",
  function: {
    name: "return_hint",
    description: "Return a single guided hint with a micro-challenge",
    parameters: {
      type: "object",
      properties: {
        hint: { type: "string", description: "Conceptual hint, do not give the answer" },
        sourceReference: {
          type: "string",
          description:
            "Short citation referencing the uploaded source material if provided, otherwise empty string",
        },
        microChallenge: {
          type: "string",
          description: "A simpler related problem testing the concept",
        },
        choices: {
          type: "array",
          items: { type: "string" },
          minItems: 4,
          maxItems: 4,
        },
        correctIndex: { type: "integer", minimum: 0, maximum: 3 },
        correctExplanation: {
          type: "string",
          description: "Why the correct choice is correct, explained clearly",
        },
      },
      required: [
        "hint",
        "sourceReference",
        "microChallenge",
        "choices",
        "correctIndex",
        "correctExplanation",
      ],
      additionalProperties: false,
    },
  },
};

const EVAL_TOOL = {
  type: "function",
  function: {
    name: "evaluate_final",
    description: "Evaluate the student's final answer to the original problem",
    parameters: {
      type: "object",
      properties: {
        correct: {
          type: "boolean",
          description:
            "Whether the answer is good enough to complete the session. If priorMastery is HIGH (the student already knows this topic) and the topic is relatively easy, accept partial-but-mostly-correct answers as 'correct: true' so the session can end and the student earns at least a partial skill. If priorMastery is LOW or the topic is hard, require accurate answers.",
        },
        masteryQuality: {
          type: "string",
          enum: ["strong", "partial"],
          description:
            "Only meaningful when correct=true. 'strong' = the student fully understood and answered accurately. 'partial' = the answer was acceptable but had gaps, vagueness, or small errors — they should earn a partial skill, not a strong one.",
        },
        feedback: { type: "string", description: "Encouraging, specific feedback" },
        whereWentWrong: {
          type: "string",
          description: "If incorrect, gentle explanation of the misstep, otherwise empty",
        },
      },
      required: ["correct", "masteryQuality", "feedback", "whereWentWrong"],
      additionalProperties: false,
    },
  },
};

const REASONING_TOOL = {
  type: "function",
  function: {
    name: "evaluate_reasoning",
    description:
      "Evaluate the student's written reasoning for their multiple-choice answer. Comment on what is correct, what is missing, and any misconceptions.",
    parameters: {
      type: "object",
      properties: {
        choiceCorrect: {
          type: "boolean",
          description: "Whether the multiple-choice selection itself was correct",
        },
        reasoningQuality: {
          type: "string",
          enum: ["strong", "partial", "weak"],
          description: "How well the student's written reasoning supports their answer",
        },
        feedback: {
          type: "string",
          description:
            "2-4 sentences of specific, encouraging feedback DIRECTLY ABOUT the student's reasoning text. Quote a short phrase from their reasoning when possible. Do not just restate the correct explanation.",
        },
        suggestion: {
          type: "string",
          description: "One concrete suggestion to improve their thinking, or empty string",
        },
      },
      required: ["choiceCorrect", "reasoningQuality", "feedback", "suggestion"],
      additionalProperties: false,
    },
  },
};

const EXTRACT_TOOL = {
  type: "function",
  function: {
    name: "extract_problem",
    description:
      "Extract the full problem statement from the attached files (and short notes if any). Preserve every sub-question, every equation, and structure with markdown + LaTeX math.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "A concise 3-8 word title for this problem, suitable for a session list.",
        },
        fullProblemText: {
          type: "string",
          description:
            "The COMPLETE problem statement, in GitHub-flavored markdown. Use $...$ for inline math and $$...$$ for display math. Use \\begin{pmatrix}...\\end{pmatrix} for matrices. Use **(a)**, **(b)** style labels for sub-questions. Preserve every detail — do not summarize.",
        },
      },
      required: ["title", "fullProblemText"],
      additionalProperties: false,
    },
  },
};

const MATCH_TOOL = {
  type: "function",
  function: {
    name: "match_game",
    description:
      "Generate 6 pairs to match. Each pair is either a term and its definition/description, or two synonyms. All pairs should come from the concepts in this learning session.",
    parameters: {
      type: "object",
      properties: {
        pairs: {
          type: "array",
          minItems: 6,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              left: { type: "string", description: "The term, word, or concept (short, 1-4 words)" },
              right: {
                type: "string",
                description:
                  "The matching definition, description, or synonym (concise, max ~12 words)",
              },
              kind: {
                type: "string",
                enum: ["synonym", "definition"],
                description: "Whether the pair is a synonym pair or term-definition pair",
              },
            },
            required: ["left", "right", "kind"],
            additionalProperties: false,
          },
        },
      },
      required: ["pairs"],
      additionalProperties: false,
    },
  },
};

const CONN_TOOL = {
  type: "function",
  function: {
    name: "connection_game",
    description:
      "Generate a Connections-style grid. Each group is a category (a topic the user has learned) with 4 items belonging to that topic.",
    parameters: {
      type: "object",
      properties: {
        groups: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              theme: {
                type: "string",
                description: "The category name — must be one of the learned topics provided",
              },
              terms: {
                type: "array",
                items: { type: "string" },
                minItems: 4,
                maxItems: 4,
                description: "4 recognizable concepts/subtopics/examples from this topic",
              },
              explanation: {
                type: "string",
                description: "Short explanation of what ties these 4 items together",
              },
            },
            required: ["theme", "terms", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["groups"],
      additionalProperties: false,
    },
  },
};

const STRANDS_TOOL = {
  type: "function",
  function: {
    name: "strands_game",
    description:
      "Generate a Strands-style puzzle: pick ONE theme from the user's learned topics and 6-10 single-word concepts from that topic. Words must be UPPERCASE letters only (A-Z), 3-9 letters each, no spaces, no punctuation, no numbers.",
    parameters: {
      type: "object",
      properties: {
        theme: { type: "string", description: "The topic name used as the puzzle theme — must be one of the learned topics provided." },
        words: {
          type: "array",
          minItems: 6,
          maxItems: 10,
          items: { type: "string", description: "UPPERCASE single word, 3-9 letters, A-Z only." },
        },
      },
      required: ["theme", "words"],
      additionalProperties: false,
    },
  },
};

const WORDLY_TOOL = {
  type: "function",
  function: {
    name: "wordly_game",
    description:
      "Generate a single Wordle-style secret word from the user's learned topics. Word must be a real concept the student studied, 4-7 letters, UPPERCASE A-Z only, no spaces, no punctuation.",
    parameters: {
      type: "object",
      properties: {
        word: { type: "string", description: "UPPERCASE secret word, 4-7 letters, A-Z only." },
        topic: { type: "string", description: "Which learned topic the word comes from." },
        hint: { type: "string", description: "One short clue (max 12 words) that hints at the word without spelling it." },
      },
      required: ["word", "topic", "hint"],
      additionalProperties: false,
    },
  },
};
  const hasFiles = loaded.length > 0;
  const paperCount = b.paperCount ?? loaded.length;
  const sourceTermSingular = paperCount <= 1 ? "section" : "paper";
  const sourceTermPlural = paperCount <= 1 ? "sections" : "papers";

  const system =
    "You are a Socratic tutor. Never reveal the final answer to the original problem. " +
    "Break problems into conceptual steps. Generate clear, age-appropriate hints. " +
    (hasFiles
      ? "The student has attached files (PDFs or images). READ them carefully and ground every hint, citation, and micro-challenge in their actual content. Quote short phrases when citing. "
      : "") +
    "Always cite uploaded source material when present. Avoid emojis. " +
    "FORMATTING: Write in GitHub-flavored markdown. " +
    "MATH RULES (strict): " +
    "Write SIMPLE expressions as plain text — NO dollar signs, NO LaTeX. " +
    "Simple means: basic arithmetic, single-variable equations, simple fractions like 3/4, linear forms, function notation. " +
    "Examples that MUST be plain text: x + 2 = 5, 3/4, a(b + c), 2x - 7, y = mx + b, f(x) = x + 1. " +
    "ONLY use LaTeX inside $...$ (inline) or $$...$$ (display) for genuinely complex math: exponents like x^2, roots, integrals, summations, matrices, fractions with complex numerators/denominators, Greek letters, or anything that does not render cleanly as plain text. " +
    "Never write complex math as ascii like x^2 or sqrt(x) — use $x^2$ or $\\sqrt{x}$. " +
    "For code, use fenced blocks with the language name, e.g. ```python or ```bash. " +
    `SOURCE WORDING (strict): The student uploaded ${paperCount} paper(s)/source file(s). ` +
    (paperCount <= 1
      ? `NEVER ask which "paper" something is from — there is at most one. Use "${sourceTermSingular}", "part", "passage", "page", or another precise word that fits the single source. `
      : `When asking which source something belongs to, you may say "paper". `) +
    "QUESTION-ANSWER ALIGNMENT (strict): The four MCQ choices MUST match the GRAMMATICAL TYPE the question asks for. " +
    "If the question asks 'how many / how much / what value / what number / what amount' — all 4 choices must be NUMBERS or numeric expressions, NOT explanations. " +
    "If the question asks 'what is the purpose / role / meaning of X' — all 4 choices must be short purpose/role descriptions. " +
    "If it asks 'which step comes next' — choices are steps. If it asks 'which formula' — choices are formulas. " +
    "Never mix categories (e.g. one number plus three explanations). If you cannot make 4 same-type choices, REPHRASE the question so you can.";

  const ctx = [
    b.problemSummary ? `PROBLEM:\n${b.problemSummary}` : "",
    b.sourceSummary ? `SOURCE MATERIAL NOTES:\n${b.sourceSummary}` : "",
    b.extraSummary ? `EXTRA CONTEXT:\n${b.extraSummary}` : "",
    hasFiles
      ? `ATTACHED FILES (${paperCount} ${sourceTermPlural}, read them):\n${loaded.map((f) => `- ${f.label} (${f.mime})`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let userText = "";
  if (b.mode === "hint") {
    const prev = (b.previousHints ?? []).map((h, i) => `Hint ${i + 1}: ${h}`).join("\n");
    userText =
      `${ctx}\n\n` +
      `Total hints planned: ${b.totalHints ?? 5}. Current hint index (0-based): ${b.hintIndex ?? 0}.\n` +
      `Previous hints already given:\n${prev || "(none)"}\n\n` +
      `Generate the next hint plus a multiple-choice micro-challenge. Do not repeat earlier hints. ` +
      `Remember: the 4 choices must all match the type the question asks for (numbers for "how many", purposes for "what is the role of", etc.).` +
      (hasFiles ? " Reference the attached files explicitly when relevant." : "");
  } else if (b.mode === "evaluate_final") {
    const mastery = b.priorMastery ?? 0;
    const leniency =
      mastery >= 60
        ? `The student has prior mastery on this topic (~${mastery}%). Be LENIENT: if their answer captures the main idea and core reasoning, accept it as correct=true even with small gaps or imprecision. Then set masteryQuality="partial" unless the answer is fully accurate (then "strong").`
        : mastery >= 30
          ? `The student has some prior practice (~${mastery}%). Use moderate strictness. masteryQuality="strong" only when the answer is fully accurate; otherwise "partial" if mostly right.`
          : `The student is new to this topic (mastery ~${mastery}%). Be appropriately strict — require a substantively correct answer for correct=true, masteryQuality="strong" when the explanation is solid.`;
    userText =
      `${ctx}\n\nSTUDENT FINAL ANSWER:\n${b.finalAnswer ?? ""}\n\n` +
      `${leniency}\n\nEvaluate it.` +
      (hasFiles ? " Use the attached files as ground truth." : "");
  } else if (b.mode === "evaluate_reasoning") {
    const choicesList = (b.choices ?? []).map((c, i) => `${String.fromCharCode(65 + i)}. ${c}`).join("\n");
    const picked =
      b.selectedIndex !== undefined && b.choices ? b.choices[b.selectedIndex] : "(none)";
    const correct =
      b.correctIndex !== undefined && b.choices ? b.choices[b.correctIndex] : "(unknown)";
    userText =
      `${ctx}\n\n` +
      `HINT GIVEN TO STUDENT:\n${b.hintText ?? ""}\n\n` +
      `MICRO-CHALLENGE:\n${b.microChallenge ?? ""}\n\n` +
      `CHOICES:\n${choicesList}\n\n` +
      `STUDENT PICKED: ${picked}\n` +
      `CORRECT ANSWER: ${correct}\n\n` +
      `STUDENT'S WRITTEN REASONING:\n"""${b.studentReasoning ?? ""}"""\n\n` +
      `Evaluate the student's WRITTEN REASONING above. Be specific: comment on what they got right, where their thinking went off, ` +
      `and any misconception you can spot in their words. Quote a short phrase from their reasoning when you can. ` +
      `Do not just restate the textbook explanation.`;
  } else if (b.mode === "extract_problem") {
    userText =
      `${ctx}\n\n` +
      `Extract the COMPLETE problem statement from the attached file(s). ` +
      `Include every sub-question, every formula, every matrix, every constraint. ` +
      `Format with markdown and LaTeX (use $...$ inline and $$...$$ for display, \\begin{pmatrix} for matrices). ` +
      `Do not solve anything, do not summarize — extract the problem text faithfully.`;
  } else if (b.mode === "match_game") {
    userText =
      `${ctx}\n\n` +
      `Generate 6 matching pairs grounded ONLY in the user's previously learned topics listed above. Do NOT invent topics outside that list. Spread the pairs across several of the listed topics when possible. ` +
      `Each pair is either (a) a term and its concise definition/description, or (b) two synonyms. ` +
      `Mix both kinds. Keep left items short (1-4 words) and right items concise (max ~12 words). ` +
      `Make pairs unambiguous so each left has exactly one correct right.`;
  } else {
    const groupCount = b.groupCount ?? 4;
    userText =
      `${ctx}\n\n` +
      `Generate EXACTLY ${groupCount} themed groups, each with 4 related items. ` +
      `Each group's theme MUST be one of the learned topics provided above (use the topic name verbatim as the theme). ` +
      `For each group, the 4 terms must be recognizable concepts, subtopics, or example problems from that topic — things a learner of that topic would have seen. ` +
      `Do NOT invent unrelated subjects. Do NOT mix items across topics. ` +
      `Keep each term short (1-3 words). Make item-to-category assignment unambiguous.`;
  }

  // Build multimodal user content: text + each file as image_url (data URL).
  // The Lovable AI Gateway accepts data URLs for both images and PDFs in image_url parts.
  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: userText }];
  for (const f of loaded) {
    userContent.push({ type: "image_url", image_url: { url: f.dataUrl } });
  }

  return [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
}

function toolFor(mode: Mode) {
  if (mode === "hint") return HINT_TOOL;
  if (mode === "evaluate_final") return EVAL_TOOL;
  if (mode === "evaluate_reasoning") return REASONING_TOOL;
  if (mode === "extract_problem") return EXTRACT_TOOL;
  if (mode === "match_game") return MATCH_TOOL;
  return CONN_TOOL;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const tool = toolFor(body.mode);
    const loaded = await loadAttachments(body.attachments);
    const payload = {
      model: MODEL,
      messages: buildMessages(body, loaded),
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    };

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded, please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({
          error: "AI credits exhausted. Add credits in Settings > Workspace > Usage.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify({ result: args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tutor-ai error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
