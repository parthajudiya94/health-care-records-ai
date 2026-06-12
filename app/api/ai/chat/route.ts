import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { firstZodMessage } from "@/lib/zod-helpers";
import { AuditAction, logAudit } from "@/lib/audit";
import { generateAIResponse, type ChatHistoryMessage } from "@/lib/ai";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const postBody = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
});

export async function GET(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  const db = prisma as any;
  const { searchParams } = new URL(request.url);
  const sessionId = (searchParams.get("sessionId") ?? "").trim();
  if (!sessionId) return jsonError("sessionId required", 400);

  const session = await db.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
    select: { id: true },
  });
  if (!session) return jsonError("Not found", 404);

  const messages = await db.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ sessionId: session.id, messages });
}

export async function POST(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  const db = prisma as any;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = postBody.safeParse(body);
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

  const message = parsed.data.message.trim();
  let sessionId = parsed.data.sessionId?.trim();

  let session = sessionId
    ? await db.chatSession.findFirst({
        where: { id: sessionId, userId: user.id },
        select: { id: true },
      })
    : null;

  if (!session) {
    session = await db.chatSession.create({
      data: { userId: user.id },
      select: { id: true },
    });
    sessionId = session.id;
  }

  await db.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: message,
    },
  });

  const historyRows = (await db.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 15,
    select: { role: true, content: true },
  })) as Array<{ role: string; content: string }>;
  const history: ChatHistoryMessage[] = historyRows
    .map<ChatHistoryMessage>((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }))
    .slice(-15);

  const recentReports = (await db.recordFile.findMany({
    where: { userId: user.id, summaryStatus: "READY" as any, summary: { not: null } },
    orderBy: { summarizedAt: "desc" },
    take: 3,
    select: {
      fileName: true,
      summary: true,
      record: { select: { title: true } },
    },
  })) as Array<{
    fileName: string;
    summary: unknown;
    record: { title: string };
  }>;

  const reports = recentReports.map((r) => {
    const s = (r.summary ?? {}) as any;
    return {
      title: r.record.title,
      fileName: r.fileName,
      summary: String(s.plainLanguageSummary ?? "").slice(0, 1200),
    };
  });

  const ai = await generateAIResponse({ history, reports, userMessage: message });
  if (ai.error) return jsonError(ai.error, 502);

  await db.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: ai.reply,
    },
  });

  await logAudit(user.id, AuditAction.AI_ASSISTANT_MESSAGE, {
    resourceType: "ChatSession",
    resourceId: session.id,
    metadata: { ok: true },
  });

  return NextResponse.json({ reply: ai.reply, sessionId: session.id });
}

