import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fullPathFromStored } from "@/lib/storage";
import { AuditAction, logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ fileId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_req: Request, { params }: Ctx) {
  const { fileId } = await params;
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const file = await prisma.recordFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      fileName: true,
      filePath: true,
      mimeType: true,
      userId: true,
      recordId: true,
    },
  });
  if (!file) return jsonError("Not found", 404);
  if (!file.filePath || file.filePath === "pending") {
    return jsonError("File not available yet", 409);
  }

  const full = fullPathFromStored(file.filePath);
  let buf: Buffer;
  try {
    buf = await readFile(full);
  } catch {
    return jsonError("File missing on server", 404);
  }
  const u8 = new Uint8Array(buf);

  await logAudit(admin.id, AuditAction.ADMIN_FILE_DOWNLOAD, {
    resourceType: "RecordFile",
    resourceId: file.id,
    metadata: { ok: true },
  });

  return new Response(u8, {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        file.fileName || "file"
      )}"`,
    },
  });
}

