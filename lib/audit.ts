import { prisma } from "@/lib/prisma";

export const AuditAction = {
  REGISTER: "REGISTER",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  REPORT_CREATE: "REPORT_CREATE",
  REPORT_VIEW: "REPORT_VIEW",
  REPORT_DOWNLOAD: "REPORT_DOWNLOAD",
  AI_SUMMARY_REQUEST: "AI_SUMMARY_REQUEST",
  RECORD_CREATE: "RECORD_CREATE",
  RECORD_FILE_UPLOAD: "RECORD_FILE_UPLOAD",
  REMINDER_CREATE: "REMINDER_CREATE",
  REMINDER_UPDATE: "REMINDER_UPDATE",
  REMINDER_DELETE: "REMINDER_DELETE",
  NOTIFICATION_MARK_READ: "NOTIFICATION_MARK_READ",
  AI_ASSISTANT_MESSAGE: "AI_ASSISTANT_MESSAGE",
  ADMIN_USER_CREATE: "ADMIN_USER_CREATE",
  ADMIN_USER_UPDATE: "ADMIN_USER_UPDATE",
  ADMIN_USER_PASSWORD_RESET: "ADMIN_USER_PASSWORD_RESET",
  ADMIN_REMINDER_CREATE: "ADMIN_REMINDER_CREATE",
  ADMIN_REMINDER_UPDATE: "ADMIN_REMINDER_UPDATE",
  ADMIN_REMINDER_DELETE: "ADMIN_REMINDER_DELETE",
  ADMIN_FILE_DOWNLOAD: "ADMIN_FILE_DOWNLOAD",
} as const;

type AuditMeta = Record<string, string | number | boolean | null>;

export async function logAudit(
  userId: string,
  action: string,
  opts: {
    resourceType?: string;
    resourceId?: string;
    metadata?: AuditMeta;
  } = {}
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType: opts.resourceType,
        resourceId: opts.resourceId,
        metadata: (opts.metadata ?? null) as object | undefined,
      },
    });
  } catch {
    // Never break request flow; never log PHI
  }
}
