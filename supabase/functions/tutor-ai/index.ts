// Tutor AI edge function: returns hints, micro-challenges, final-answer evaluation,
// and a connection-game payload. Uses Lovable AI Gateway with structured tool-calling.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type Mode = "hint" | "evaluate_final" | "connection_game";

interface Body {
  mode: Mode;
  problemSummary?: string;
  sourceSummary?: string;
  extraSummary?: string;
  totalHints?: number;
  hintIndex?: number;
  previousHints?: string[];
  // For evaluate_final
  finalAnswer?: string;
  // For micro-challenge feedback / extra hint
  studentAnswer?: string;
  studentReasoning?: string;
  context?: string;
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
        correct: { type: "boolean" },
        feedback: { type: "string", description: "Encouraging, specific feedback" },
        whereWentWrong: {
          type: "string",
          description: "If incorrect, gentle explanation of the misstep, otherwise empty",
        },
      },
      required: ["correct", "feedback", "whereWentWrong"],
      additionalProperties: false,
    },
  },
};

const CONN_TOOL = {
  type: "function",
  function: {
    name: "connection_game",
    description: "Generate a 4x4 connection grid of related concepts from the session",
    parameters: {
      type: "object",
      properties: {
        groups: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              theme: { type: "string" },
              terms: {
                type: "array",
                items: { type: "string" },
                minItems: 4,
                maxItems: 4,
              },
              explanation: { type: "string" },
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

function buildMessages(b: Body) {
  const system =
    "You are a Socratic tutor. Never reveal the final answer to the original problem. " +
    "Break problems into conceptual steps. Generate clear, age-appropriate hints. " +
    "Always cite uploaded source material when present. Avoid emojis.";

  const ctx = [
    b.problemSummary ? `PROBLEM:\n${b.problemSummary}` : "",
    b.sourceSummary ? `SOURCE MATERIAL:\n${b.sourceSummary}` : "",
    b.extraSummary ? `EXTRA CONTEXT:\n${b.extraSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (b.mode === "hint") {
    const prev = (b.previousHints ?? []).map((h, i) => `Hint ${i + 1}: ${h}`).join("\n");
    const user =
      `${ctx}\n\n` +
      `Total hints planned: ${b.totalHints ?? 5}. Current hint index (0-based): ${b.hintIndex ?? 0}.\n` +
      `Previous hints already given:\n${prev || "(none)"}\n\n` +
      `Generate the next hint plus a multiple-choice micro-challenge. Do not repeat earlier hints.`;
    return [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
  }

  if (b.mode === "evaluate_final") {
    const user = `${ctx}\n\nSTUDENT FINAL ANSWER:\n${b.finalAnswer ?? ""}\n\nEvaluate it.`;
    return [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
  }

  // connection_game
  const user =
    `${ctx}\n\nHints from this session:\n${(b.previousHints ?? []).join("\n")}\n\n` +
    `Generate 4 themed groups of 4 related terms each, drawn from the concepts in this session. ` +
    `Mix the terms when shown to the student.`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function toolFor(mode: Mode) {
  if (mode === "hint") return HINT_TOOL;
  if (mode === "evaluate_final") return EVAL_TOOL;
  return CONN_TOOL;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const tool = toolFor(body.mode);
    const payload = {
      model: MODEL,
      messages: buildMessages(body),
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
