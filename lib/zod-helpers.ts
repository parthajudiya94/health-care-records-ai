import type { ZodError } from "zod";

export function firstZodMessage(error: ZodError) {
  return error.issues[0]?.message ?? "Invalid data";
}
