import { z } from "zod";
import { DURATION_OPTIONS } from "./types";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const durationValues = DURATION_OPTIONS as readonly number[];
export const durationSchema = z.coerce
  .number()
  .refine((v) => durationValues.includes(v), {
    message: `Duration must be one of ${DURATION_OPTIONS.join(", ")}`,
  });

export const phoneSchema = z.string().min(9).max(20);
export const nameSchema = z.string().min(1).max(100);
