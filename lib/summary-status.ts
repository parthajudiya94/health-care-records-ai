/** File summary lifecycle (aligns with Prisma `SummaryStatus` when client is generated). */
export const SUMMARY_STATUSES = [
  "NOT_REQUESTED",
  "PROCESSING",
  "READY",
  "ERROR",
] as const;

export type SummaryStatus = (typeof SUMMARY_STATUSES)[number];

export const STATUS_LABEL: Record<SummaryStatus, string> = {
  NOT_REQUESTED: "Not summarized",
  PROCESSING: "Processing",
  READY: "Ready",
  ERROR: "Error",
};
