import { z } from "zod";

export const registerBody = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
});

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const reminderType = z.enum(["APPOINTMENT", "MEDICATION", "TEST", "OTHER"]);
const reminderRecurring = z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]);

export const createReminderBody = z.object({
  title: z.string().min(1).max(500),
  datetime: z.string().datetime(), // ISO
  type: reminderType,
  recurring: reminderRecurring.optional(),
});

export const updateReminderBody = createReminderBody.partial();

export const createRecordBody = z.object({
  title: z.string().min(1, "Title is required").max(200),
  note: z.string().max(2000).optional(),
});
