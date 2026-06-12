import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullPathFromStored } from "@/lib/storage";
import { AuditAction, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ fileId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { fileId } = await params;
  const user = await getSessionUserFromCookies();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const disposition = (searchParams.get("disposition") ?? "").toLowerCase();
  const isInline = disposition === "inline";

  const file = await prisma.recordFile.findFirst({
    where: { id: fileId, userId: user.id },
  });
  if (!file || !file.filePath || file.filePath === "pending") {
    return new NextResponse("Not found", { status: 404 });
  }

  const full = fullPathFromStored(file.filePath);
  let data: Buffer;
  try {
    data = await readFile(full);
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }

  await logAudit(user.id, isInline ? AuditAction.REPORT_VIEW : AuditAction.REPORT_DOWNLOAD, {
    resourceType: "RecordFile",
    resourceId: fileId,
    metadata: { ok: true },
  });

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename=\"${encodeURIComponent(file.fileName)}\"`,
    },
  });
}

