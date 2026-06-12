import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullPathFromStored } from "@/lib/storage";
import { extractText } from "@/lib/extract-text";
import { generateHealthSummary } from "@/lib/ai";
import { AuditAction, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ fileId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(_req: Request, { params }: Ctx) {
  const { fileId } = await params;
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  const file = await prisma.recordFile.findFirst({
    where: { id: fileId, userId: user.id },
  });
  if (!file) return jsonError("Not found", 404);
  if (!file.filePath || file.filePath === "pending") {
    return jsonError("File not available yet", 409);
  }

  await prisma.recordFile.update({
    where: { id: file.id },
    data: { summaryStatus: "PROCESSING", summaryError: null },
  });

  const full = fullPathFromStored(file.filePath);
  let buf: Buffer;
  try {
    buf = await readFile(full);
  } catch {
    await prisma.recordFile.update({
      where: { id: file.id },
      data: {
        summaryStatus: "ERROR",
        summaryError: "File missing on server. Please re-upload.",
      },
    });
    return jsonError("File missing on server. Please re-upload.", 404);
  }

  const { text, error: extractErr } = await extractText(
    buf,
    file.mimeType,
    file.fileName
  );
  if (extractErr) {
    await prisma.recordFile.update({
      where: { id: file.id },
      data: { summaryStatus: "ERROR", summaryError: extractErr },
    });
    return NextResponse.json({ ok: false, error: extractErr }, { status: 200 });
  }

  await logAudit(user.id, AuditAction.AI_SUMMARY_REQUEST, {
    resourceType: "RecordFile",
    resourceId: file.id,
    metadata: { ok: true },
  });

  const summary = await generateHealthSummary(text);
  const isError = !!summary.error;

  const updated = await prisma.recordFile.update({
    where: { id: file.id },
    data: {
      summary: summary as object,
      summaryStatus: isError ? "ERROR" : "READY",
      summaryError: isError ? summary.error : null,
      summarizedAt: isError ? null : new Date(),
      ...(summary.reportType ? { reportType: summary.reportType } : {}),
      ...(summary.riskLevel ? { riskLevel: summary.riskLevel as any } : {}),
    },
  });

  return NextResponse.json({ file: updated });
}

