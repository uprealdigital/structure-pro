import {
  configChangesSchema,
  quoteCommunicationSchema,
  quoteChangeEventSchema,
  quoteRevisionRendersSchema,
  quoteRevisionSchema,
  quoteStatusSchema,
  type QuoteChangeEvent,
  type QuoteChangeKind,
  type QuoteCommunication,
  type QuoteRevision,
  type QuoteStatus,
} from "@/src/features/crm/quotes/types";

export type QuoteRevisionRow = {
  id: string;
  quote_id: string;
  revision_number: number;
  status: string;
  config?: unknown;
  selections?: unknown;
  config_changes?: unknown;
  communication?: unknown;
  renders?: unknown;
  shared_photos_at?: string | null;
  shared_quote_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function savedAt(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function toQuoteRevision(row: QuoteRevisionRow): QuoteRevision | undefined {
  const communication = quoteCommunicationSchema.safeParse(row.communication);
  const changes = configChangesSchema.safeParse(row.config_changes ?? {});
  const renders = quoteRevisionRendersSchema.safeParse(row.renders);
  const revision = quoteRevisionSchema.safeParse({
    id: row.id,
    quoteId: row.quote_id,
    revisionNumber: row.revision_number,
    status: row.status,
    selections: row.config ?? row.selections,
    configChanges: changes.success ? changes.data : {},
    communication: communication.success ? communication.data : null,
    renders: renders.success ? renders.data : null,
    sharedPhotosAt: savedAt(row.shared_photos_at),
    sharedQuoteAt: savedAt(row.shared_quote_at),
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
  });
  return revision.success ? revision.data : undefined;
}

export function toQuoteChangeEvent(
  kind: QuoteChangeKind,
  row: {
    id?: unknown;
    status?: unknown;
    active_revision_id?: unknown;
    updated_at?: unknown;
  },
): QuoteChangeEvent | undefined {
  if (typeof row.id !== "string" || row.id.trim().length === 0) return undefined;
  const status = quoteStatusSchema.safeParse(row.status === "declined" ? "changes_requested" : row.status);
  const activeRevisionId =
    typeof row.active_revision_id === "string"
      ? row.active_revision_id
      : row.active_revision_id === null
        ? null
        : undefined;
  const event = quoteChangeEventSchema.safeParse({
    id: row.id,
    kind,
    status: status.success ? status.data : undefined,
    activeRevisionId,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
  });
  return event.success ? event.data : undefined;
}
