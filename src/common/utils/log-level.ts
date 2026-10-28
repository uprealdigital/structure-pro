import { z } from "zod";

export const logLevelSchema = z.enum(["error", "warning", "info"]);

export type LogLevel = z.infer<typeof logLevelSchema>;

export const logLevels: LogLevel[] = ["error", "warning", "info"];

export type LogLevelCounts = Record<LogLevel, number>;

export function emptyLogLevelCounts(): LogLevelCounts {
  return { error: 0, warning: 0, info: 0 };
}

export function logLevelFor(
  status: "detected" | "none" | "error",
  errorMessage?: string | null,
): LogLevel {
  if (status !== "error") return "info";
  if (errorMessage && /timed out/i.test(errorMessage)) return "warning";
  return "error";
}
