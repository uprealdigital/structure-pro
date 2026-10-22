import { FileText, ImageIcon } from "lucide-react";
import { MessageText } from "@/src/features/crm/conversations/components/message-text";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { attachmentPreviewPath, formatAttachmentTotal, formatFileSize } from "@/src/features/crm/conversations/utils/attachments";
import type { EmailAttachment, EmailMessage } from "@/src/features/crm/conversations/utils/email-message";

function AttachmentChip({ attachment, sent }: { attachment: EmailAttachment; sent: boolean }) {
  const pdf = attachment.name.toLowerCase().endsWith(".pdf");
  const image = attachment.kind === "image";
  const iconClass = pdf ? "bg-[#e11d2e] text-white" : image ? "bg-[#3b82f6] text-white" : sent ? "bg-white/15 text-white" : "bg-gray-200 text-gray-700";
  const size = attachment.bytes > 0 ? formatFileSize(attachment.bytes) : "";
  const chip = sent ? "bg-white/10 text-white" : "border border-gray-200 bg-gray-50 text-gray-900";
  const sizeClass = sent ? "text-white/55" : "text-gray-500";
  const body = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
        {image && !pdf ? (
          <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <FileText className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium">{attachment.name}</span>
        {size ? <span className={`block truncate text-[10px] ${sizeClass}`}>{size}</span> : null}
      </span>
    </>
  );

  if (!attachment.id) {
    return <div className={`flex w-36 max-w-full items-center gap-2 rounded-lg px-2 py-1.5 ${chip}`}>{body}</div>;
  }

  return (
    <a
      href={attachmentPreviewPath(attachment.id)}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-36 max-w-full items-center gap-2 rounded-lg px-2 py-1.5 ${chip}`}
    >
      {body}
    </a>
  );
}

export function EmailCard({
  message,
  clock,
  sent,
}: {
  message: EmailMessage;
  clock: string;
  sent: boolean;
}) {
  const total = message.attachments.reduce((sum, item) => sum + item.bytes, 0);
  const summary =
    message.attachments.length > 0
      ? copy.attachmentsLabel(message.attachments.length, formatAttachmentTotal(total))
      : "";
  const card = sent
    ? "rounded-2xl rounded-tr-sm bg-[#121314] text-white"
    : "rounded-2xl rounded-tl-sm border border-gray-200 bg-white text-gray-900";
  const timeClass = sent ? "text-white/50" : "text-gray-400";
  const bodyClass = sent ? "text-white" : "text-gray-800";
  const summaryClass = sent ? "text-white/50" : "text-gray-400";

  return (
    <div className={`px-4 py-3.5 text-left text-xs shadow-xs ${card}`}>
      {message.subject ? (
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 font-bold leading-snug">{copy.emailSubjectLine(message.subject)}</p>
          {clock ? <span className={`shrink-0 text-[10px] ${timeClass}`}>{clock}</span> : null}
        </div>
      ) : null}
      {message.body ? (
        <MessageText
          text={message.body}
          className={`leading-relaxed whitespace-pre-wrap break-words ${message.subject || clock ? "mt-3" : ""} ${bodyClass}`}
        />
      ) : null}
      {summary ? (
        <div className={message.body || message.subject ? "mt-4" : ""}>
          <p className={`text-[10px] font-semibold tracking-wide ${summaryClass}`}>{summary}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <li key={`${attachment.id}:${attachment.name}`}>
                <AttachmentChip attachment={attachment} sent={sent} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
