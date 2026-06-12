import { NextResponse } from "next/server";
import { z } from "zod";
import { firstZodMessage } from "@/lib/zod-helpers";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction, logAudit } from "@/lib/audit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
});

function safeText(s: unknown) {
  return typeof s === "string" ? s : "";
}

function buildSystemPrompt() {
  return (
    "You are a personal health records assistant inside a patient portal. " +
    "You MUST NOT provide medical diagnosis, prescriptions, or certainty. " +
    "Use cautious language like “may indicate” and advise consulting a clinician. " +
    "If asked for emergency advice, advise contacting local emergency services. " +
    "Be concise and practical."
  );
}

export async function POST(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

  const trimmed = parsed.data.message.trim();

  const recentFiles = await prisma.recordFile.findMany({
    where: { userId: user.id, summaryStatus: "READY" as any },
    orderBy: { summarizedAt: "desc" },
    take: 5,
    select: {
      id: true,
      fileName: true,
      summarizedAt: true,
      summary: true,
      record: { select: { id: true, title: true } },
    },
  });

  const context = recentFiles
    .map((f) => {
      const summary = (f.summary ?? {}) as any;
      const plain = safeText(summary.plainLanguageSummary);
      const keyFindings = Array.isArray(summary.keyFindings)
        ? summary.keyFindings.map(String).slice(0, 5)
        : [];
      return [
        `Record: ${f.record.title}`,
        `File: ${f.fileName}`,
        plain ? `Summary: ${plain}` : "",
        keyFindings.length ? `Key findings: ${keyFindings.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  // Use OpenAI directly (same envs as lib/ai.ts)
  const key = process.env.OPENAI_API_KEY;
  if (!key) return jsonError("OPENAI_API_KEY not configured", 500);

  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/$/, "");
  const url = `${base}/v1/chat/completions`;
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content:
            `User question:\n${trimmed}\n\n` +
            `User context (recent summaries):\n${context || "(none available)"}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    return jsonError("AI service unavailable", 502);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) return jsonError("No reply", 502);

  await logAudit(user.id, AuditAction.AI_ASSISTANT_MESSAGE, {
    resourceType: "Assistant",
    metadata: { ok: true },
  });

  return NextResponse.json({ reply });
}

