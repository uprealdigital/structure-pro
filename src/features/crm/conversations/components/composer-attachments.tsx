import { FileText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { attachmentDetail } from "@/src/features/crm/conversations/utils/attachments";

export type ComposerAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
  phase: "uploading" | "ready" | "failed";
  progress: number;
  quoteId?: string;
  revisionId?: string;
  suggestionId?: string;
};

export function UploadProgress({
  progress,
  label = copy.attachmentUploading,
  onFilled,
  idle = false,
  speed = 1,
}: {
  progress: number;
  label?: (progress: number) => string;
  onFilled: () => void;
  idle?: boolean;
  speed?: number;
}) {
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const targetRef = useRef(progress);
  const shownRef = useRef(0);
  const filledRef = useRef(onFilled);
  const settledRef = useRef(false);
  const speedRef = useRef(speed);
  const [shown, setShown] = useState(0);
  targetRef.current = progress;
  filledRef.current = onFilled;
  speedRef.current = speed;

  useEffect(() => {
    if (idle) return;
    let frame = 0;
    let creep = 0;
    const tick = () => {
      const reported = Math.min(100, Math.max(0, targetRef.current));
      if (reported < 100) creep = Math.min(86, creep + Math.max(0.22, (86 - creep) * 0.028));
      const target = reported >= 100 ? 100 : Math.max(reported, creep);
      const current = shownRef.current;
      const delta = target - current;
      const next = Math.abs(delta) < 0.4 ? target : current + Math.sign(delta) * Math.min(Math.abs(delta), 1.6 * speedRef.current);
      if (next !== current) {
        shownRef.current = next;
        setShown(next);
      }
      if (reported >= 100 && next >= 99.6) {
        if (!settledRef.current) {
          settledRef.current = true;
          filledRef.current();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [idle]);

  const offset = circumference - (Math.min(100, Math.max(0, shown)) / 100) * circumference;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-transparent">
      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="#121314" strokeOpacity="0.16" strokeWidth="3.25" />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="#121314"
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="sr-only">{label(Math.round(shown))}</span>
    </div>
  );
}

function AttachmentMark({ attachment, onUploadShown }: { attachment: ComposerAttachment; onUploadShown: (id: string) => void }) {
  const image = attachment.file.type.startsWith("image/");
  const pdf = attachment.file.type === "application/pdf" || attachment.file.name.toLowerCase().endsWith(".pdf");

  const uploading = attachment.phase === "uploading";

  return (
    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md">
      <span className={`block h-full w-full ${uploading ? "opacity-50" : ""}`}>
        {image && attachment.previewUrl ? (
          <img src={attachment.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center ${pdf ? "bg-[#e11d2e] text-white" : "bg-gray-100 text-gray-500"}`}
          >
            <FileText className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
        )}
      </span>
      {uploading ? <UploadProgress progress={attachment.progress} onFilled={() => onUploadShown(attachment.id)} /> : null}
    </span>
  );
}

export function ComposerAttachments({
  attachments,
  onRemove,
  onUploadShown,
  disabled = false,
}: {
  attachments: ComposerAttachment[];
  onRemove: (id: string) => void;
  onUploadShown: (id: string) => void;
  disabled?: boolean;
}) {
  if (attachments.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2 px-3 pb-2">
      {attachments.map((attachment) => {
        const name = attachment.file.name || copy.attachment;
        const uploading = attachment.phase === "uploading";
        return (
          <li
            key={attachment.id}
            className={`flex w-[220px] max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white py-1.5 pr-1.5 pl-1.5 ${disabled ? "opacity-50" : ""}`}
          >
            <AttachmentMark attachment={attachment} onUploadShown={onUploadShown} />
            <span className={`min-w-0 flex-1 ${uploading ? "opacity-50" : ""}`}>
              <span className="block truncate text-xs font-medium text-gray-900">{name}</span>
              <span className="block truncate text-[10px] text-gray-500">
                {attachmentDetail(name, attachment.file.size)}
              </span>
            </span>
            <button
              type="button"
              aria-label={copy.removeAttachment(name)}
              disabled={disabled}
              onClick={() => onRemove(attachment.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            >
              <X className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
