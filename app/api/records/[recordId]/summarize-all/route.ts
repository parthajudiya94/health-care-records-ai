import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullPathFromStored } from "@/lib/storage";
import { extractText } from "@/lib/extract-text";
import { generateHealthSummary } from "@/lib/ai";
import { AuditAction, logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ recordId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(_req: Request, { params }: Ctx) {
  const { recordId } = await params;
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  const record = await prisma.record.findFirst({
    where: { id: recordId, userId: user.id },
    select: { id: true },
  });
  if (!record) return jsonError("Record not found", 404);

  const files = await prisma.recordFile.findMany({
    where: {
      recordId: record.id,
      userId: user.id,
      summaryStatus: { in: ["NOT_REQUESTED", "ERROR"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const results: {
    id: string;
    ok: boolean;
    status?: string;
    error?: string;
  }[] = [];

  for (const f of files) {
    // eslint-disable-next-line no-await-in-loop
    const file = await prisma.recordFile.findFirst({
      where: { id: f.id, userId: user.id },
    });
    if (!file || !file.filePath || file.filePath === "pending") {
      results.push({ id: f.id, ok: false, error: "File not available" });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await prisma.recordFile.update({
      where: { id: file.id },
      data: { summaryStatus: "PROCESSING", summaryError: null },
    });

    const full = fullPathFromStored(file.filePath);
    let buf: Buffer;
    try {
      // eslint-disable-next-line no-await-in-loop
      buf = await readFile(full);
    } catch {
      // eslint-disable-next-line no-await-in-loop
      await prisma.recordFile.update({
        where: { id: file.id },
        data: {
          summaryStatus: "ERROR",
          summaryError: "File missing on server. Please re-upload.",
        },
      });
      results.push({
        id: file.id,
        ok: false,
        status: "ERROR",
        error: "File missing on server. Please re-upload.",
      });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const { text, error: extractErr } = await extractText(
      buf,
      file.mimeType,
      file.fileName
    );
    if (extractErr) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.recordFile.update({
        where: { id: file.id },
        data: { summaryStatus: "ERROR", summaryError: extractErr },
      });
      results.push({ id: file.id, ok: false, status: "ERROR", error: extractErr });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await logAudit(user.id, AuditAction.AI_SUMMARY_REQUEST, {
      resourceType: "RecordFile",
      resourceId: file.id,
      metadata: { ok: true, batch: true },
    });

    // eslint-disable-next-line no-await-in-loop
    const summary = await generateHealthSummary(text);
    const isError = !!summary.error;

    // eslint-disable-next-line no-await-in-loop
    await prisma.recordFile.update({
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

    results.push({ id: file.id, ok: !isError, status: isError ? "ERROR" : "READY", error: summary.error });
  }

  return NextResponse.json({ count: results.length, results });
}

