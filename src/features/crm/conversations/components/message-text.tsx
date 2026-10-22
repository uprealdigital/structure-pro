import { messageParts } from "@/src/features/crm/conversations/utils/message-links";

export function MessageText({ text, className }: { text: string; className?: string }) {
  const parts = messageParts(text);
  return (
    <p className={className}>
      {parts.map((part, index) =>
        part.kind === "link" ? (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {part.label}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  );
}
