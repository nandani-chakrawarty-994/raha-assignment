import { z } from "zod";

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(100000).nullable().optional(),
  capturedAt: z.string().datetime().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const startDaySchema = z.object({
  location: locationSchema,
  timezoneOffsetMinutes: z.number().int().min(-720).max(840),
});

export const endDaySchema = z.object({
  location: locationSchema,
});

export const addActivitySchema = z.object({
  leadId: z.string().min(1),
  notes: z.string().trim().min(1).max(2000),
  location: locationSchema,
});

export const monthExportSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
