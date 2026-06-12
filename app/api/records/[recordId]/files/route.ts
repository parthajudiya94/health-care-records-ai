import { NextResponse } from "next/server";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAllowedFile } from "@/lib/extract-text";
import { saveRecordFile } from "@/lib/storage";
import { AuditAction, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const MAX = 10 * 1024 * 1024;

type Ctx = { params: Promise<{ recordId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: Ctx) {
  const { recordId } = await params;
  const user = await getSessionUserFromCookies();
  if (!user) return jsonError("Unauthorized", 401);

  const record = await prisma.record.findFirst({
    where: { id: recordId, userId: user.id },
    select: { id: true },
  });
  if (!record) return jsonError("Record not found", 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("file is required", 400);
  }
  if (file.size > MAX) {
    return jsonError("File must be 10MB or smaller", 400);
  }
  const mime = file.type || "application/octet-stream";
  const name = file.name || "upload";
  if (!isAllowedFile(mime, name)) {
    return jsonError("Only PDF, text, and image files are allowed", 400);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return jsonError("Could not read the uploaded file", 400);
  }

  const recordFile = await prisma.recordFile.create({
    data: {
      userId: user.id,
      recordId: record.id,
      fileName: name,
      filePath: "pending",
      mimeType: mime,
      summaryStatus: "NOT_REQUESTED",
      summaryError: null,
      summarizedAt: null,
    },
  });

  let rel = "pending";
  try {
    rel = await saveRecordFile(user.id, recordFile.id, name, buffer);
  } catch {
    await prisma.recordFile.update({
      where: { id: recordFile.id },
      data: {
        summaryStatus: "ERROR",
        summaryError: "Could not store this file. Please try again.",
      },
    });
    return jsonError("Could not store this file. Please try again.", 500);
  }

  const updated = await prisma.recordFile.update({
    where: { id: recordFile.id },
    data: { filePath: rel },
  });

  await logAudit(user.id, AuditAction.RECORD_FILE_UPLOAD, {
    resourceType: "RecordFile",
    resourceId: recordFile.id,
    metadata: { ok: true },
  });

  return NextResponse.json({ file: updated }, { status: 201 });
}

