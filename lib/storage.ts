import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SAFE = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "file";

export const UPLOADS_ROOT = join(process.cwd(), "storage", "uploads");

export function relativeStoredPath(
  userId: string,
  reportId: string,
  fileName: string
) {
  return ["storage", "uploads", userId, reportId, SAFE(fileName)].join("/");
}

export function fullPathFromStored(stored: string) {
  return join(process.cwd(), ...stored.split("/").filter(Boolean));
}

export async function saveReportFile(
  userId: string,
  reportId: string,
  fileName: string,
  buffer: Buffer
) {
  const name = SAFE(fileName);
  const rel = ["storage", "uploads", userId, reportId, name].join("/");
  const target = fullPathFromStored(rel);
  await mkdir(join(UPLOADS_ROOT, userId, reportId), { recursive: true });
  await writeFile(target, buffer);
  return rel;
}

export async function saveRecordFile(
  userId: string,
  recordFileId: string,
  fileName: string,
  buffer: Buffer
) {
  return saveReportFile(userId, recordFileId, fileName, buffer);
}
