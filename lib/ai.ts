export type HealthSummary = {
  keyFindings: string[];
  plainLanguageSummary: string;
  suggestedNextSteps: string[];
  disclaimer: string;
  /** AI-derived categorization for filtering (best-effort). */
  reportType?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  error?: string;
  /** Set when `AI_PROCESSING_ENABLED=false` — heuristics from your text, not a model. */
  mock?: boolean;
};

const EMPTY_SUMMARY: HealthSummary = {
  keyFindings: [],
  plainLanguageSummary: "",
  suggestedNextSteps: [],
  disclaimer:
    "This summary is for informational use only. It is not a diagnosis or medical advice. Consult a qualified clinician for health decisions.",
};

const SYSTEM_PROMPT = `You are assisting with patient education. You MUST NOT state or imply a definitive medical diagnosis. Use cautious, non-alarming language. Output a single JSON object with keys: keyFindings (array of short strings, max 5), plainLanguageSummary (2-4 sentences), suggestedNextSteps (2-4 bullet points as one sentence each, general wellness / follow-up themes only, not prescriptions), reportType (short category string, e.g. "Labs", "Imaging", "Visit notes", "Prescription", "Discharge", "Other"), riskLevel ("LOW"|"MEDIUM"|"HIGH" based on urgency implied by the text; default LOW if unsure). Include disclaimer: "This summary is for informational use only and is not medical advice. Consult a qualified clinician for decisions about your health."
Return ONLY valid JSON, no markdown code fences or extra text.`;

function aiEnabled() {
  return process.env.AI_PROCESSING_ENABLED !== "false";
}

/** When text is too thin to derive phrases (still no API call in mock mode). */
const MOCK_FALLBACK_FINDINGS = [
  "The file yielded only a short run of text; a fuller report usually gives clearer takeaways.",
  "Re-save or re-scan the document for better extraction if the preview above looks empty.",
] as const;

const MOCK_FALLBACK_STEPS: string[] = [
  "Re-upload a clearer file or try another format and generate a new summary (enable AI for model-quality output).",
];

const MOCK_NEXT_STEPS = [
  "If anything is unclear, make a list of terms or results to ask your clinician about at a visit.",
  "Save a copy of the report in your own records and keep notes on any symptoms or dates you want to discuss.",
  "Follow any instructions already printed in your full report, and do not start or stop care based only on a summary view.",
] as const;

function shuffled<T>(a: readonly T[] | T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function clipPhrase(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

/**
 * Splits the document into readable phrases for mock bullets (punctuation, else word groups).
 * Not a medical model — only shapes what was extracted so the UI looks reviewed.
 */
function extractPhrasesForMock(raw: string): string[] {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length < 8) return [];
  const byPunct = t
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  if (byPunct.length >= 2) return byPunct;

  const words = t.split(/\s+/);
  const out: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.join(" ").length >= 45) {
      out.push(cur.join(" ").trim());
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(" ").trim());
  return out.filter((s) => s.length > 12);
}

/**
 * Produces a summary shaped like the real JSON path, using only your extracted text.
 * Still sets `mock: true` (and the UI shows a small demo label).
 */
function mockHealthSummaryFromText(extractedText: string): HealthSummary {
  const t = extractedText.replace(/\s+/g, " ").trim();
  const words = t.length ? t.split(/\s+/) : [];
  const nWords = words.length;

  const phrases = extractPhrasesForMock(extractedText);
  let nPick = 0;
  if (phrases.length >= 2) {
    const upper = Math.min(5, phrases.length);
    nPick = 2 + Math.floor(Math.random() * (upper - 2 + 1));
  } else if (phrases.length === 1) {
    nPick = 1;
  }
  const picked = nPick > 0 ? shuffled(phrases).slice(0, nPick) : [];
  const keyFindings: string[] =
    picked.length > 0
      ? picked.map((p) => clipPhrase(p, 150))
      : nWords
        ? [clipPhrase(t, 180)]
        : [...MOCK_FALLBACK_FINDINGS];

  let plainLanguageSummary: string;
  if (phrases.length >= 2) {
    const a = clipPhrase(phrases[0] ?? t, 220);
    const restPool = phrases.slice(1);
    const b = clipPhrase(
      restPool[Math.floor(Math.random() * restPool.length)]!,
      200
    );
    const more =
      phrases.length > 2
        ? ` A further passage says: “${clipPhrase(
            phrases[2 + Math.floor(Math.random() * (phrases.length - 2))]!,
            150
          )}”`
        : "";
    plainLanguageSummary = `In plain terms, the extracted report (roughly ${nWords} words) seems to start with: “${a}” A later part adds: “${b}”${more} The bullets above list other sentence-sized slices from the same file. This overview is generated locally from the text; it is not a substitute for a clinician or for enabling full AI.`;
  } else if (phrases.length === 1) {
    const only = clipPhrase(phrases[0]!, 320);
    plainLanguageSummary = `The readable portion of the file is largely captured in a single block: “${only}” The list above repeats that line for quick scanning; turn AI back on to synthesize longer reports end-to-end.`;
  } else if (nWords) {
    plainLanguageSummary = `The layout was hard to break into clean sentences, but a representative cut from your file is: “${clipPhrase(
      t,
      400
    )}” Wider line breaks in the source usually produce clearer “key points” in this view. Turn on AI to get a more natural, paragraph-style read of the same content.`;
  } else {
    plainLanguageSummary = `We could not read any lines from the upload. Try a text or PDF with selectable text, or check that the file is not only images without OCR.`;
  }

  const nSteps = 2 + (Math.random() > 0.4 ? 1 : 0);
  let suggestedNextSteps: string[] = shuffled([...MOCK_NEXT_STEPS]).map(String);
  suggestedNextSteps = suggestedNextSteps.slice(0, nSteps);
  if (picked.length === 0 && nWords === 0) {
    suggestedNextSteps = [...MOCK_FALLBACK_STEPS];
  }

  return {
    keyFindings,
    plainLanguageSummary,
    suggestedNextSteps: [...suggestedNextSteps],
    disclaimer: EMPTY_SUMMARY.disclaimer,
    reportType: "Other",
    riskLevel: "LOW",
    mock: true,
  };
}

function getMessagesUrl() {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(
    /\/$/,
    ""
  );
  return `${base}/v1/chat/completions`;
}

function getModel() {
  return process.env.AI_MODEL || "gpt-4o-mini";
}

function getMaxTokens() {
  const raw = process.env.OPENAI_MAX_TOKENS;
  const n = raw ? parseInt(raw, 10) : 1200;
  return Number.isFinite(n) && n > 0 ? n : 1200;
}

type OpenAIChatResponse = {
  choices?: Array<{
    message?: { role?: string; content?: string | null };
  }>;
};

/** If the model wraps JSON in markdown fences, strip them before JSON.parse. */
function extractJsonFromModelText(raw: string): string {
  const t = raw.trim();
  const fullFence = t.match(/^```(?:json)?\r?\n?([\s\S]*?)\r?\n?```$/);
  if (fullFence) return fullFence[1].trim();
  if (t.startsWith("```")) {
    const unopened = t.replace(/^```(?:json)?\s*/i, "");
    const end = unopened.lastIndexOf("```");
    if (end >= 0) return unopened.slice(0, end).trim();
  }
  return t;
}

export async function generateHealthSummary(
  extractedText: string
): Promise<HealthSummary> {
  if (!aiEnabled()) {
    return mockHealthSummaryFromText(extractedText);
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      ...EMPTY_SUMMARY,
      error:
        "OpenAI API key not configured. Set OPENAI_API_KEY (and BAA where required for real PHI).",
    };
  }
  const trimmed = extractedText.trim();
  if (trimmed.length < 20) {
    return {
      ...EMPTY_SUMMARY,
      error: "Not enough text extracted from the file. Try a clearer text or PDF.",
    };
  }

  const body = {
    model: getModel(),
    temperature: 0.2,
    max_tokens: getMaxTokens(),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT,
      },
      {
        role: "user" as const,
        content: `Summarize the following health record excerpt for a lay reader:\n\n${trimmed.slice(0, 20000)}`,
      },
    ],
  };

  const res = await fetch(getMessagesUrl(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return {
      ...EMPTY_SUMMARY,
      error: "The AI service could not complete this request. Try again later.",
    };
  }

  const data = (await res.json()) as OpenAIChatResponse;
  const text = data.choices?.[0]?.message?.content ?? null;
  if (!text) {
    return {
      ...EMPTY_SUMMARY,
      error: "No summary was returned. Try a different file.",
    };
  }

  const jsonString = extractJsonFromModelText(text);
  try {
    const parsed = JSON.parse(jsonString) as {
      keyFindings?: string[];
      plainLanguageSummary?: string;
      suggestedNextSteps?: string[];
      reportType?: string;
      riskLevel?: string;
    };
    return {
      keyFindings: Array.isArray(parsed.keyFindings)
        ? parsed.keyFindings.map(String).slice(0, 5)
        : [],
      plainLanguageSummary: String(parsed.plainLanguageSummary ?? ""),
      suggestedNextSteps: Array.isArray(parsed.suggestedNextSteps)
        ? parsed.suggestedNextSteps.map(String)
        : [],
      reportType: parsed.reportType ? String(parsed.reportType).slice(0, 80) : undefined,
      riskLevel:
        parsed.riskLevel === "LOW" || parsed.riskLevel === "MEDIUM" || parsed.riskLevel === "HIGH"
          ? (parsed.riskLevel as "LOW" | "MEDIUM" | "HIGH")
          : undefined,
      disclaimer: EMPTY_SUMMARY.disclaimer,
    };
  } catch {
    return {
      ...EMPTY_SUMMARY,
      error: "The summary could not be parsed. Please try again.",
    };
  }
}

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantReportContext = {
  title: string;
  fileName: string;
  summary: string;
};

export async function generateAIResponse(input: {
  history: ChatHistoryMessage[];
  reports: AssistantReportContext[];
  userMessage: string;
}): Promise<{ reply: string; error?: string }> {
  if (!aiEnabled()) {
    return {
      reply:
        "AI is currently disabled in this environment. You can enable it by setting AI_PROCESSING_ENABLED=true.",
    };
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return { reply: "", error: "OPENAI_API_KEY not configured" };

  const model = getModel();
  const reportsBlock = input.reports.length
    ? input.reports
        .slice(0, 3)
        .map(
          (r, i) =>
            `- (${i + 1}) ${r.title} — ${r.fileName}: ${r.summary.slice(0, 700)}`
        )
        .join("\n")
    : "- (none available)";

  const convo = input.history
    .slice(-15)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const system =
    "You are a Personal Health AI Assistant inside a patient portal.\n" +
    "Safety rules:\n" +
    "- Do NOT provide a definitive diagnosis.\n" +
    '- Use cautious language: \"may indicate\", \"could be consistent with\", \"it may be helpful to ask your clinician\".\n' +
    "- Do NOT prescribe medications or dosages.\n" +
    "- If emergency symptoms are mentioned, advise seeking urgent care.\n" +
    "Output format (plain text, short):\n" +
    "Summary:\\n...\n\n" +
    "Explanation:\\n...\n\n" +
    "Possible meaning (non-diagnostic):\\n...\n\n" +
    "Suggested next steps:\\n- ...\\n- ...\n\n" +
    "Safety note:\\n...";

  const user =
    `User recent reports (summaries only):\n${reportsBlock}\n\n` +
    `Conversation:\n${convo || "(new session)"}\n\n` +
    `User question:\n${input.userMessage}`;

  const res = await fetch(getMessagesUrl(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return { reply: "", error: "AI service unavailable" };

  const data = (await res.json()) as OpenAIChatResponse;
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) return { reply: "", error: "No reply" };
  return { reply: text };
}
