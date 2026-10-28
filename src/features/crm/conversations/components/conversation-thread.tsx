"use client";

import { ArrowRight, Calculator, Download, Eye, FileText, Handshake, Phone } from "lucide-react";
import { useRef, useState } from "react";
import { UploadProgress } from "@/src/features/crm/conversations/components/composer-attachments";
import { EmailCard } from "@/src/features/crm/conversations/components/email-message";
import { downloadImage, ImageViewerModal } from "@/src/features/crm/conversations/components/image-viewer-modal";
import { MessageText } from "@/src/features/crm/conversations/components/message-text";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { DealStatusBadge } from "@/src/features/crm/deals/components/deal-status-badge";
import { dealStatuses } from "@/src/features/crm/deals/config/status";
import type { DealStatus } from "@/src/features/crm/deals/types";
import { QuoteStatusBadge } from "@/src/features/crm/quotes/components/quote-status-badge";
import { quoteStatuses } from "@/src/features/crm/quotes/config/status";
import type { QuoteStatus } from "@/src/features/crm/quotes/types";
import type { Activity, ActivityChannel } from "@/src/features/crm/conversations/types";
import { attachmentPreviewPath, fileAttachment, imageAttachment } from "@/src/features/crm/conversations/utils/attachments";
import { parseEmailActivity, type EmailMessage } from "@/src/features/crm/conversations/utils/email-message";
import { formatCallDuration, formatMessageClock, formatMessageDay, systemEventText, type SystemEventKind } from "@/src/features/crm/conversations/utils/formatting";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

export type OutgoingMessage = {
  id: string;
  kind: "text" | "image" | "file";
  channel: ActivityChannel;
  text: string;
  name: string;
  previewUrl?: string;
  frameHeight?: number;
  sentAt?: string;
  afterPosition?: number;
  status: "queued" | "sending" | "sent" | "failed";
  error: string;
  quoteId?: string;
  revisionId?: string;
  suggestionId?: string;
};

function AiStar() {
  return (
    <svg className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function activityChannelLabel(channel: ActivityChannel): string {
  switch (channel) {
    case "call":
      return copy.channelCall;
    case "sms":
      return copy.channelSms;
    case "facebook":
      return copy.channelFacebook;
    case "email":
      return copy.channelEmail;
    case "telegram":
      return copy.channelTelegram;
    case "system":
      return copy.channelSystem;
  }
}

function isCall(channel: ActivityChannel): boolean {
  return channel === "call";
}

function callDirectionLabel(activity: Activity): string {
  if (activity.call?.direction === "outbound") return copy.outboundCall;
  if (activity.call?.direction === "inbound") return copy.inboundCall;
  return copy.channelCall;
}

function statusByLabel<T extends string>(
  statuses: Record<T, { label: string }>,
  label: string,
): T | undefined {
  return (Object.keys(statuses) as T[]).find((status) => statuses[status].label === label);
}

function StatusChangePill({ kind, label }: { kind: "dealStatus" | "quoteStatus"; label: string }) {
  if (kind === "quoteStatus") {
    const status = statusByLabel<QuoteStatus>(quoteStatuses, label);
    if (status) return <QuoteStatusBadge status={status} />;
  } else {
    const status = statusByLabel<DealStatus>(dealStatuses, label);
    if (status) return <DealStatusBadge status={status} />;
  }
  return <strong className="font-bold text-gray-900">{label}</strong>;
}

function logSubjectIcon(kind: SystemEventKind) {
  const quote =
    kind === "quote" ||
    kind === "quoteStatus" ||
    kind === "savedRevision" ||
    kind === "duplicatedQuote" ||
    kind === "movedQuote" ||
    kind === "activeQuote";
  const Icon = quote ? Calculator : Handshake;
  return <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />;
}

function NamedChange({ name, badge }: { name: string; badge: string }) {
  return (
    <>
      <span className="font-normal text-gray-900">{name}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.8} aria-hidden="true" />
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-gray-900">
        {badge}
      </span>
    </>
  );
}

function SystemActivity({ activity }: { activity: Activity }) {
  const clock = activity.createdAt ? formatMessageClock(activity.createdAt) : "";
  const event = systemEventText(activity.text);
  const statusChange = (event.kind === "dealStatus" || event.kind === "quoteStatus") && event.status;

  return (
    <div className="my-2 flex flex-col items-center justify-center">
      <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-full border border-gray-200/80 bg-transparent px-3 py-1 text-center text-xs text-gray-600 shadow-xs transition-colors hover:bg-gray-50">
        {logSubjectIcon(event.kind)}
        {event.kind === "renamed" && event.previousName ? (
          <span>
            {copy.dealWasRenamedFrom} <strong className="font-bold text-gray-900">{event.previousName}</strong>{" "}
            {copy.dealWasRenamedTo} <strong className="font-bold text-gray-900">{event.name}</strong>
          </span>
        ) : event.kind === "savedRevision" && event.previousName ? (
          <NamedChange name={event.previousName} badge={event.name} />
        ) : event.kind === "movedQuote" && event.previousName ? (
          <NamedChange name={event.previousName} badge={event.name} />
        ) : event.kind === "created" || event.kind === "duplicatedQuote" ? (
          <NamedChange name={event.name} badge={copy.duplicatedQuoteBadge} />
        ) : statusChange ? (
          <>
            <span className="font-normal text-gray-900">{event.name}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.8} aria-hidden="true" />
            <StatusChangePill kind={event.kind as "dealStatus" | "quoteStatus"} label={event.status ?? ""} />
          </>
        ) : event.kind === "quote" && event.previousName ? (
          <span>
            <strong className="font-bold text-gray-900">{event.previousName}</strong> {copy.revisionSwitchedTo}{" "}
            <strong className="font-bold text-gray-900">{event.name}</strong>
          </span>
        ) : (
          <span>
            {event.label} <strong className="font-bold text-gray-900">{event.name}</strong>
          </span>
        )}
      </div>
      {clock ? (
        <span className="mt-1 text-[10px] text-gray-400">
          {clock} • {copy.systemEvent}
        </span>
      ) : null}
    </div>
  );
}

function CallActivity({ activity }: { activity: Activity }) {
  const duration = formatCallDuration(activity.call?.durationSeconds);
  const directionLabel = callDirectionLabel(activity);
  const label = duration ? `${directionLabel} (${duration})` : directionLabel;
  const clock = activity.createdAt ? formatMessageClock(activity.createdAt) : "";
  const highMatch = (activity.call?.scriptMatch ?? 0) >= 70;
  const matchClass = highMatch ? "text-emerald-700" : "text-red-600";
  const dotClass = highMatch ? "bg-emerald-500" : "bg-red-500";

  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-700 shadow-xs">
        <Phone className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
        <span className="font-medium text-gray-800">{label}</span>
        {activity.call?.scriptMatch != null ? (
          <span className={`inline-flex items-center gap-1 font-medium ${matchClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
            {activity.call.scriptMatch}% {copy.scriptMatch}
          </span>
        ) : null}
        <button type="button" className="font-medium text-gray-500">
          {copy.details}
          <span aria-hidden="true"> ›</span>
        </button>
      </div>
      {clock ? (
        <span className="text-[10px] text-gray-400">
          {clock} • {callDirectionLabel(activity)}
        </span>
      ) : null}
    </div>
  );
}

function PendingProgress({ status }: { status?: OutgoingMessage["status"] }) {
  if (status !== "queued" && status !== "sending") return null;
  return <UploadProgress progress={0} idle={status === "queued"} onFilled={() => undefined} />;
}

function RetryButton({ onRetry }: { onRetry?: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm"
    >
      {copy.retry}
    </button>
  );
}

export const previewFrameWidth = 224;
const previewFrameMaxHeight = 256;

export function previewFrameHeight(width: number, height: number): number {
  if (width <= 0 || height <= 0) return previewFrameMaxHeight;
  return Math.round(Math.min(previewFrameMaxHeight, (previewFrameWidth * height) / width));
}

function ImagePreview({
  src,
  name,
  status,
  error,
  onRetry,
  frameHeight,
  onView,
}: {
  src: string;
  name: string;
  status?: OutgoingMessage["status"];
  error?: string;
  onRetry?: () => void;
  frameHeight?: number;
  onView: () => void;
}) {
  const pending = status === "queued" || status === "sending";
  const ready = !status;
  const height = frameHeight ?? (status ? previewFrameMaxHeight : undefined);
  const [downloadError, setDownloadError] = useState(false);
  const saving = useRef(false);
  const frame = height ? "absolute inset-0 h-full w-full" : "block max-h-64 w-56";

  async function save(event: { preventDefault: () => void; stopPropagation: () => void }) {
    event.preventDefault();
    event.stopPropagation();
    if (saving.current) return;
    saving.current = true;
    setDownloadError(false);
    try {
      await downloadImage(src, name);
    } catch {
      setDownloadError(true);
    } finally {
      saving.current = false;
    }
  }

  return (
    <div className="shrink-0 text-right">
      <div
        className={`group relative shrink-0 overflow-hidden rounded-2xl rounded-tr-sm bg-gray-100 ${ready ? "focus-within:ring-2 focus-within:ring-gray-900 focus-within:ring-offset-2" : ""}`}
        style={height ? { width: previewFrameWidth, height } : undefined}
      >
        {ready ? (
          <button
            type="button"
            onClick={onView}
            aria-label={copy.viewImage(name)}
            className="relative block h-full w-full cursor-pointer"
          >
            <img src={src} alt="" className={`${frame} object-cover`} />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              <Eye className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </button>
        ) : (
          <img
            src={src}
            alt={name}
            className={`${frame} object-cover ${pending ? "opacity-50" : ""}`}
          />
        )}
        {ready ? (
          <button
            type="button"
            aria-label={copy.downloadImage}
            onClick={(event) => void save(event)}
            className="absolute top-2 right-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-white/70 bg-white text-gray-800 shadow-sm opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-gray-100"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
        {status ? <PendingProgress status={status} /> : null}
        {status === "failed" ? <RetryButton onRetry={onRetry} /> : null}
      </div>
      {downloadError ? <p className="mt-1 text-xs text-red-600">{copy.downloadImageFailed}</p> : null}
      {status === "failed" && error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function FilePreview({
  name,
  status,
  error,
  onRetry,
}: {
  name: string;
  status?: OutgoingMessage["status"];
  error?: string;
  onRetry?: () => void;
}) {
  const pending = status === "queued" || status === "sending";
  const pdf = name.toLowerCase().endsWith(".pdf");
  return (
    <div className="min-w-0 text-right">
      <div className="relative inline-flex max-w-xs items-center gap-2 rounded-2xl rounded-tr-sm bg-[#121314] p-2 pr-3.5 text-left text-xs text-white">
        <span className="relative h-9 w-9 shrink-0">
          <span className={`flex h-full w-full items-center justify-center rounded-md ${pdf ? "bg-[#e11d2e]" : "bg-white/15"} ${pending ? "opacity-50" : ""}`}>
            <FileText className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <PendingProgress status={status} />
          {status === "failed" ? <RetryButton onRetry={onRetry} /> : null}
        </span>
        <p className={`min-w-0 truncate leading-relaxed ${pending ? "opacity-50" : ""}`}>{name}</p>
      </div>
      {status === "failed" && error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function messageStamp(sentAt: string | undefined, channel: ActivityChannel, received = false): string {
  const clock = sentAt ? formatMessageClock(sentAt) : "";
  if (!clock) return "";
  const via = received ? copy.receivedVia : copy.viaChannel;
  return `${clock} • ${via} ${activityChannelLabel(channel)}`;
}

function EmailActivity({
  message,
  sent,
  clock,
  stamp,
  initials,
  ai = false,
  error,
  onRetry,
}: {
  message: EmailMessage;
  sent: boolean;
  clock: string;
  stamp: string;
  initials: string;
  ai?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <div className={sent ? "ml-auto flex max-w-xl items-start justify-end" : "flex max-w-xl items-start"}>
      {sent ? null : (
        <span className="mr-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 font-serif text-[10px] font-bold text-gray-700">
          {initials}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <EmailCard message={message} clock={clock} sent={sent} />
        {stamp ? (
          <span className={`mt-1 block text-[10px] text-gray-400 ${sent ? "pr-1 text-right" : "pl-1"}`}>{stamp}</span>
        ) : null}
        {error ? <p className={`mt-1 text-xs text-red-600 ${sent ? "text-right" : ""}`}>{error}</p> : null}
        {error && onRetry ? (
          <button type="button" onClick={onRetry} className={`mt-1 text-xs font-medium text-gray-900 ${sent ? "ml-auto block" : ""}`}>
            {copy.retry}
          </button>
        ) : null}
      </div>
      {sent ? (
        <div className="ml-2.5 flex shrink-0 flex-col items-center">
          <div className="relative">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 font-serif text-[10px] font-bold text-white">
              {initials}
            </div>
            {ai ? (
              <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-white bg-purple-50 text-purple-700">
                <AiStar />
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StaffText({
  text,
  stamp,
  initials,
  ai = false,
  error,
  onRetry,
}: {
  text: string;
  stamp: string;
  initials: string;
  ai?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="ml-auto flex max-w-xl items-start justify-end">
      <div className="min-w-0 text-right">
        <div className="rounded-2xl rounded-tr-sm bg-[#121314] p-3.5 text-left text-xs text-white shadow-xs">
          <MessageText text={text} className="leading-relaxed break-words whitespace-pre-wrap" />
        </div>
        {stamp ? (
          <div className="mt-1 flex items-center justify-end gap-2 pr-1">
            <span className="text-[10px] text-gray-400">{stamp}</span>
          </div>
        ) : null}
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        {error && onRetry ? (
          <button type="button" onClick={onRetry} className="mt-1 text-xs font-medium text-gray-900">
            {copy.retry}
          </button>
        ) : null}
      </div>
      <div className="ml-2.5 flex shrink-0 flex-col items-center">
        <div className="relative">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 font-serif text-[10px] font-bold text-white">
            {initials}
          </div>
          {ai ? (
            <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-white bg-purple-50 text-purple-700">
              <AiStar />
            </span>
          ) : null}
        </div>
        {ai ? (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap text-purple-700">
            <AiStar />
            {copy.ai}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StaffAvatar() {
  return (
    <div className="ml-2.5 flex shrink-0 flex-col items-center">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 font-serif text-[10px] font-bold text-white">
        {contactInitials(copy.operatorName)}
      </div>
    </div>
  );
}

export function ConversationThread({
  activities,
  contactName,
  outgoing = [],
  onRetry,
  imageHeights,
  previewUrls,
}: {
  activities: Activity[];
  contactName: string;
  outgoing?: OutgoingMessage[];
  onRetry?: (id: string) => void;
  imageHeights?: ReadonlyMap<string, number>;
  previewUrls?: ReadonlyMap<string, string>;
}) {
  const [viewing, setViewing] = useState<{ src: string; name: string } | null>(null);

  if (activities.length === 0 && outgoing.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-xs text-gray-500">
        {copy.noMessages}
      </div>
    );
  }

  const operatorInitials = contactInitials(copy.operatorName);
  const rows = activities.reduce<
    Array<{
      key: string;
      activity: Activity;
      fromCustomer: boolean;
      showDay: boolean;
      day: string;
      stamp: string;
    }>
  >((items, activity, index) => {
    const fromCustomer = activity.role === "user";
    const day = activity.createdAt ? formatMessageDay(activity.createdAt) : "";
    const previousDay = items.findLast((item) => item.day)?.day ?? "";
    const clock = activity.createdAt ? formatMessageClock(activity.createdAt) : "";
    const channelLabel = activityChannelLabel(activity.channel);
    const stamp = !clock
      ? ""
      : activity.generatedBy === "ai" && activity.channel === "sms"
        ? `${clock} • ${copy.sentViaAi}`
        : `${clock} • ${copy.viaChannel} ${channelLabel}`;
    items.push({
      key: `${index}-${activity.channel}-${activity.role}`,
      activity,
      fromCustomer,
      showDay: Boolean(day) && day !== previousDay,
      day,
      stamp,
    });
    return items;
  }, []);

  const pieces: Array<
    | { key: string; at: number; seq: number; row: (typeof rows)[number]; item?: undefined }
    | { key: string; at: number; seq: number; item: OutgoingMessage; row?: undefined }
  > = [];
  for (const row of rows) {
    const image = imageAttachment(row.activity.text);
    const file = fileAttachment(row.activity.text);
    const held =
      (image && outgoing.some((item) => item.id === image.id && item.status !== "failed")) ||
      (file && outgoing.some((item) => item.kind === "file" && item.id === file.id && item.status !== "failed")) ||
      outgoing.some(
        (item) =>
          item.kind === "text" &&
          item.status !== "failed" &&
          item.text === row.activity.text &&
          item.channel === row.activity.channel &&
          row.activity.role === "model" &&
          row.activity.generatedBy === "manual" &&
          row.activity.position > (item.afterPosition ?? -1),
      );
    if (held) continue;
    const at = row.activity.createdAt ? Date.parse(row.activity.createdAt) : 0;
    pieces.push({
      key: `activity-${row.activity.position}`,
      at: Number.isNaN(at) ? 0 : at,
      seq: row.activity.position,
      row,
    });
  }
  outgoing.forEach((item, index) => {
    const at = item.sentAt ? Date.parse(item.sentAt) : Number.POSITIVE_INFINITY;
    pieces.push({
      key: item.id,
      at: Number.isNaN(at) ? Number.POSITIVE_INFINITY : at,
      seq: (item.afterPosition ?? -1) + (index + 1) / 1000,
      item,
    });
  });
  pieces.sort((left, right) => left.at - right.at || left.seq - right.seq);

  return (
    <>
    <ol className="flex flex-col gap-4 px-6 py-5" aria-label={copy.messages}>
      {pieces.map((piece) => {
        if (piece.item) {
          const item = piece.item;
          return (
            <li key={piece.key} className="flex flex-col gap-4">
              {item.channel === "email" ? (
                <EmailActivity
                  message={parseEmailActivity(item.text)}
                  sent
                  clock={item.sentAt ? formatMessageClock(item.sentAt) : ""}
                  stamp={messageStamp(item.sentAt, "email")}
                  initials={operatorInitials}
                  error={item.status === "failed" ? item.error : ""}
                  onRetry={() => onRetry?.(item.id)}
                />
              ) : item.kind === "text" ? (
                <StaffText
                  text={item.text}
                  stamp={messageStamp(item.sentAt, item.channel)}
                  initials={operatorInitials}
                  error={item.status === "failed" ? item.error : ""}
                  onRetry={() => onRetry?.(item.id)}
                />
              ) : (
                <div className="ml-auto flex max-w-xl items-start justify-end">
                  {item.kind === "image" && item.previewUrl ? (
                    <div>
                      <ImagePreview
                        src={item.previewUrl}
                        name={item.name}
                        status={item.status === "sent" ? undefined : item.status}
                        error={item.error}
                        frameHeight={item.frameHeight}
                        onRetry={() => onRetry?.(item.id)}
                        onView={() => item.previewUrl && setViewing({ src: item.previewUrl, name: item.name })}
                      />
                      <span className="mt-1 block pr-1 text-right text-[10px] text-gray-400">{messageStamp(item.sentAt, item.channel)}</span>
                    </div>
                  ) : (
                    <FilePreview
                      name={item.name}
                      status={item.status === "sent" ? undefined : item.status}
                      error={item.error}
                      onRetry={() => onRetry?.(item.id)}
                    />
                  )}
                  <StaffAvatar />
                </div>
              )}
            </li>
          );
        }

        const { activity, fromCustomer, showDay, day, stamp } = piece.row;
        const image = imageAttachment(activity.text);
        const file = fileAttachment(activity.text);

        return (
          <li key={piece.key} data-activity-position={activity.position} className="flex flex-col gap-4">
            {showDay ? (
              <div className="my-2 flex items-center justify-center">
                <span className="rounded-full bg-gray-200/60 px-3 py-1 text-[11px] font-medium text-gray-400">
                  {day}
                </span>
              </div>
            ) : null}
            {activity.channel === "system" ? (
              <SystemActivity activity={activity} />
            ) : isCall(activity.channel) ? (
              <CallActivity activity={activity} />
            ) : activity.channel === "email" ? (
              <EmailActivity
                message={parseEmailActivity(activity.text)}
                sent={!fromCustomer}
                clock={activity.createdAt ? formatMessageClock(activity.createdAt) : ""}
                stamp={messageStamp(activity.createdAt, "email", fromCustomer)}
                initials={fromCustomer ? contactInitials(contactName) : operatorInitials}
                ai={!fromCustomer && activity.generatedBy === "ai"}
              />
            ) : fromCustomer ? (
              <div className="flex max-w-xl items-start">
                <span className="mr-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 font-serif text-[10px] font-bold text-gray-700">
                  {contactInitials(contactName)}
                </span>
                <div>
                  <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-3.5 text-xs text-gray-800 shadow-xs">
                    <MessageText text={activity.text} className="leading-relaxed break-words whitespace-pre-wrap" />
                  </div>
                  {stamp ? <span className="mt-1 block pl-1 text-[10px] text-gray-400">{stamp}</span> : null}
                </div>
              </div>
            ) : file ? (
              <div className="ml-auto flex max-w-xl items-start justify-end">
                <FilePreview name={file.name} />
                <StaffAvatar />
              </div>
            ) : image ? (
              <div className="ml-auto flex max-w-xl items-start justify-end">
                <div>
                  <ImagePreview
                    src={previewUrls?.get(image.id) ?? attachmentPreviewPath(image.id)}
                    name={image.name}
                    frameHeight={imageHeights?.get(image.id)}
                    onView={() =>
                      setViewing({
                        src: previewUrls?.get(image.id) ?? attachmentPreviewPath(image.id),
                        name: image.name,
                      })
                    }
                  />
                  {stamp ? <span className="mt-1 block pr-1 text-right text-[10px] text-gray-400">{stamp}</span> : null}
                </div>
                <StaffAvatar />
              </div>
            ) : (
              <StaffText
                text={activity.text}
                stamp={stamp}
                initials={operatorInitials}
                ai={activity.generatedBy === "ai"}
              />
            )}
          </li>
        );
      })}
    </ol>
    {viewing ? <ImageViewerModal src={viewing.src} name={viewing.name} onClose={() => setViewing(null)} /> : null}
    </>
  );
}
