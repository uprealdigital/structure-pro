export function throwIfError(
  error: { message: string; code?: string; details?: string; hint?: string } | null,
): void {
  if (!error) return;
  const extra = [error.code, error.details, error.hint].filter(Boolean).join(" — ");
  throw new Error(extra ? `${error.message} (${extra})` : error.message);
}
