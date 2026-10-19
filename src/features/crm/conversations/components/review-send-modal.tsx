"use client";

import { Eye, Mail, MessageSquare, Plus, Send, X } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationParticipant } from "@/src/features/crm/conversations/types";
import type { QuoteCommunication } from "@/src/features/crm/quotes/types";
import {
  reviewEmailBody,
  reviewMessageToken,
  reviewQuoteSubject,
  reviewSmsBody,
} from "@/src/features/crm/conversations/utils/formatting";
import { orderedDealParticipants } from "@/src/features/crm/conversations/utils/participants";

function dealRecipients(participants: ConversationParticipant[]): ConversationParticipant[] {
  const seen = new Set<string>();
  return orderedDealParticipants(participants).filter((participant) => {
    if (seen.has(participant.customer.id)) return false;
    seen.add(participant.customer.id);
    return true;
  });
}

function RecipientChip({
  name,
  primary,
  onRemove,
}: {
  name: string;
  primary?: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-0.5 pr-1.5 pl-1 text-xs text-gray-900 shadow-xs">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#121314] font-serif text-[9px] font-bold text-white">
        {contactInitials(name)}
      </span>
      <span className="text-xs font-medium text-gray-900">{name}</span>
      {primary ? (
        <span className="rounded-full border border-gray-200 bg-gray-100 px-1 py-0.5 text-[9px] leading-none font-semibold text-gray-700">
          {copy.primary}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`${copy.removeRecipient} ${name}`}
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-black"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

function MenuPanel({
  anchorRef,
  align,
  className,
  children,
  onClose,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  align: "start" | "end";
  className: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 80,
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    function place() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const box = anchor.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const margin = 8;
      let top = box.bottom + 4;
      if (top + height > window.innerHeight - margin && box.top > height + margin) {
        top = box.top - height - 4;
      }
      let left = align === "end" ? box.right - width : box.left;
      left = Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin));
      setStyle((current) => {
        if (current.top === top && current.left === left && current.visibility === "visible") return current;
        return { position: "fixed", top, left, zIndex: 80, visibility: "visible" };
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [align, anchorRef]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onCloseRef.current();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCloseRef.current();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [anchorRef]);

  return createPortal(
    <div ref={panelRef} style={style} className={className}>
      {children}
    </div>,
    document.body,
  );
}

function RecipientField({
  people,
  selectedIds,
  onChange,
}: {
  people: ConversationParticipant[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = new Set(selectedIds);
  const chosen = people.filter((person) => selected.has(person.customer.id));
  const available = people.filter((person) => !selected.has(person.customer.id));

  return (
    <div className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 p-1.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {chosen.map((person) => (
          <RecipientChip
            key={person.customer.id}
            name={person.customer.fullName}
            primary={person.isPrimary}
            onRemove={() => {
              onChange(selectedIds.filter((id) => id !== person.customer.id));
              setOpen(false);
            }}
          />
        ))}
      </div>
      {available.length > 0 ? (
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
          className={variableButtonClass}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          <span>{copy.addRecipient}</span>
        </button>
      ) : null}
      {open && available.length > 0 ? (
        <MenuPanel
          anchorRef={buttonRef}
          align="end"
          onClose={() => setOpen(false)}
          className="max-h-60 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <ul role="listbox" aria-label={copy.addRecipient}>
            {available.map((person) => (
              <li key={person.customer.id}>
                <button
                  type="button"
                  role="option"
                  onClick={() => {
                    onChange(
                      selectedIds.includes(person.customer.id) ? selectedIds : [...selectedIds, person.customer.id],
                    );
                    setOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left hover:bg-gray-50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#121314] font-serif text-[9px] font-bold text-white">
                    {contactInitials(person.customer.fullName)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-900">{person.customer.fullName}</span>
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] leading-none font-semibold whitespace-nowrap ${
                      person.isPrimary ? "border-gray-200 bg-gray-100 text-gray-700" : "border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    {person.isPrimary ? copy.primary : copy.notPrimary}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </MenuPanel>
      ) : null}
    </div>
  );
}

const messageTokens = [
  { id: "firstName", token: reviewMessageToken.firstName, label: copy.firstNameToken, group: "customer" },
  { id: "lastName", token: reviewMessageToken.lastName, label: copy.lastNameToken, group: "customer" },
  { id: "dealName", token: reviewMessageToken.dealName, label: copy.dealNameToken, group: "deal" },
  { id: "dealPrice", token: reviewMessageToken.dealPrice, label: copy.dealPriceToken, group: "deal" },
] as const;

type MessageTokenId = (typeof messageTokens)[number]["id"];

const messageTokenPattern = new RegExp(
  `(${messageTokens.map((item) => item.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
);

function tokenChip(id: MessageTokenId): HTMLSpanElement {
  const token = messageTokens.find((item) => item.id === id);
  const chip = document.createElement("span");
  chip.contentEditable = "false";
  chip.dataset.token = id;
  chip.className =
    "mx-0.5 inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 align-middle text-xs font-semibold text-blue-700 select-none";
  chip.textContent = token?.label ?? "";
  return chip;
}

function appendText(parent: Node, chunk: string) {
  const lines = chunk.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) parent.appendChild(document.createElement("br"));
    if (line) parent.appendChild(document.createTextNode(line));
  });
}

const smsCharacterLimit = 1600;

function readMessage(root: HTMLElement): string {
  let text = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tokenId = node.dataset.token;
    if (tokenId) {
      text += messageTokens.find((item) => item.id === tokenId)?.token ?? "";
      return;
    }
    if (node instanceof HTMLBRElement) {
      text += "\n";
      return;
    }
    node.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return text;
}

function visibleLength(root: HTMLElement): number {
  let count = 0;
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) count += node.textContent?.length ?? 0;
    else if (node instanceof HTMLBRElement) count += 1;
    else if (node instanceof HTMLElement) count += visibleLength(node);
  });
  return count;
}

function seededLength(value: string): number {
  return value.split(messageTokenPattern).reduce((total, part) => {
    const token = messageTokens.find((item) => item.token === part);
    return total + (token ? token.label.length : part.length);
  }, 0);
}

function paintMessage(root: HTMLElement, value: string) {
  const fragment = document.createDocumentFragment();
  value.split(messageTokenPattern).forEach((part) => {
    const token = messageTokens.find((item) => item.token === part);
    if (token) fragment.appendChild(tokenChip(token.id));
    else appendText(fragment, part);
  });
  root.replaceChildren(fragment);
}

function containsRange(root: HTMLElement, range: Range): boolean {
  try {
    const start = range.startContainer;
    return start === root || root.contains(start);
  } catch {
    return false;
  }
}

function placeCaretAfter(node: Node) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertNodes(root: HTMLElement, fill: (fragment: DocumentFragment) => void) {
  const fragment = document.createDocumentFragment();
  fill(fragment);
  const last = fragment.lastChild;
  if (!last) return;
  root.focus();
  const selection = window.getSelection();
  const range =
    selection && selection.rangeCount > 0 && containsRange(root, selection.getRangeAt(0))
      ? selection.getRangeAt(0)
      : null;
  if (!range) {
    root.appendChild(fragment);
    placeCaretAfter(last);
    return;
  }
  range.deleteContents();
  range.insertNode(fragment);
  placeCaretAfter(last);
}

const MessageSurface = memo(function MessageSurface({
  editorRef,
  label,
  multiline,
  className,
  onInput,
  onPaste,
  onKeyDown,
  onRemember,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  label: string;
  multiline: boolean;
  className: string;
  onInput: () => void;
  onPaste: (event: ClipboardEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onRemember: () => void;
}) {
  return (
    <div
      ref={editorRef}
      role="textbox"
      aria-multiline={multiline}
      aria-label={label}
      contentEditable
      suppressContentEditableWarning
      onInput={onInput}
      onPaste={onPaste}
      onKeyDown={onKeyDown}
      onKeyUp={onRemember}
      onMouseUp={onRemember}
      className={className}
    />
  );
});

const variableButtonClass =
  "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900";

const RichMessageEditor = memo(function RichMessageEditor({
  label,
  initialValue,
  variant,
  maxLength,
  onChange,
}: {
  label: string;
  initialValue: string;
  variant: "subject" | "message";
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const variableRef = useRef<HTMLButtonElement>(null);
  const seeded = useRef(false);
  const caret = useRef<Range | null>(null);
  const [variableOpen, setVariableOpen] = useState(false);
  const [length, setLength] = useState(() => (maxLength == null ? 0 : seededLength(initialValue)));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const publish = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;
    onChangeRef.current(readMessage(root));
  }, []);

  const syncLength = useCallback(() => {
    const root = editorRef.current;
    if (!root || maxLength == null) return;
    setLength(visibleLength(root));
  }, [maxLength]);

  useLayoutEffect(() => {
    const root = editorRef.current;
    if (!root || seeded.current) return;
    paintMessage(root, initialValue);
    seeded.current = true;
    if (maxLength != null) setLength(visibleLength(root));
  }, [initialValue, maxLength]);

  const rememberCaret = useCallback(() => {
    const root = editorRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!containsRange(root, range)) return;
    caret.current = range.cloneRange();
  }, []);

  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const root = editorRef.current;
      if (!root) return;
      insertNodes(root, (fragment) => {
        appendText(fragment, event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n"));
      });
      rememberCaret();
      syncLength();
      publish();
    },
    [publish, rememberCaret, syncLength],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (variant === "subject") return;
      const root = editorRef.current;
      if (!root) return;
      insertNodes(root, (fragment) => appendText(fragment, "\n"));
      rememberCaret();
      syncLength();
      publish();
    },
    [publish, rememberCaret, syncLength, variant],
  );

  function insertToken(id: MessageTokenId) {
    const root = editorRef.current;
    if (!root) return;
    const selection = window.getSelection();
    const saved = caret.current;
    if (saved && containsRange(root, saved) && selection) {
      selection.removeAllRanges();
      selection.addRange(saved);
    }
    insertNodes(root, (fragment) => fragment.appendChild(tokenChip(id)));
    rememberCaret();
    syncLength();
    publish();
    setVariableOpen(false);
  }

  const variableButton = (
    <button
      ref={variableRef}
      type="button"
      aria-expanded={variableOpen}
      aria-haspopup="menu"
      onMouseDown={(event) => {
        event.preventDefault();
        rememberCaret();
      }}
      onClick={() => setVariableOpen((open) => !open)}
      className={variableButtonClass}
    >
      <Plus className="h-3 w-3" aria-hidden="true" />
      <span>{copy.addVariable}</span>
    </button>
  );

  return (
    <div
      className={
        variant === "subject"
          ? "flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 pr-1.5 pl-3 transition-colors focus-within:border-black focus-within:bg-white focus-within:ring-1 focus-within:ring-black"
          : "w-full rounded-lg border border-gray-200 bg-white transition-colors focus-within:border-black focus-within:ring-1 focus-within:ring-black"
      }
    >
      <MessageSurface
        editorRef={editorRef}
        label={label}
        multiline={variant === "message"}
        onInput={() => {
          rememberCaret();
          syncLength();
          publish();
        }}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        onRemember={rememberCaret}
        className={
          variant === "subject"
            ? "min-w-0 flex-1 cursor-text py-1.5 text-xs font-medium whitespace-pre-wrap text-gray-900 focus:outline-none"
            : "min-h-[72px] w-full cursor-text px-3 pt-3 text-xs leading-relaxed whitespace-pre-wrap text-gray-700 focus:outline-none"
        }
      />
      {variant === "subject" ? (
        variableButton
      ) : (
        <div className={`flex items-center px-3 pt-1 pb-2 ${maxLength == null ? "justify-end" : "justify-between"}`}>
          {maxLength == null ? null : (
            <span className={`text-[11px] tabular-nums ${length > maxLength ? "text-red-600" : "text-gray-400"}`}>
              {length}/{maxLength}
            </span>
          )}
          {variableButton}
        </div>
      )}
      {variableOpen ? (
        <MenuPanel
          anchorRef={variableRef}
          align="end"
          onClose={() => setVariableOpen(false)}
          className="w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {(
            [
              { label: copy.variableCustomer, group: "customer" },
              { label: copy.variableDeal, group: "deal" },
            ] as const
          ).map((section) => (
            <div key={section.group}>
              <p className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {section.label}
              </p>
              {messageTokens
                .filter((item) => item.group === section.group)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertToken(item.id)}
                    className="flex w-full cursor-pointer px-2.5 py-1.5 text-left text-xs font-normal text-gray-900 hover:bg-gray-50"
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          ))}
        </MenuPanel>
      ) : null}
    </div>
  );
});

function defaultCommunication(
  people: ConversationParticipant[],
  invoiceId: string,
  title: string,
  priceLabel: string,
): QuoteCommunication {
  const ids = people.map((person) => person.customer.id);
  return {
    subject: reviewQuoteSubject(invoiceId, title),
    emailBody: reviewEmailBody(title, priceLabel),
    smsBody: reviewSmsBody(copy.operatorName.split(" ")[0] || copy.operatorName, title, priceLabel),
    emailRecipientIds: ids,
    smsRecipientIds: ids,
  };
}

function savedCommunication(
  communication: QuoteCommunication | null,
  people: ConversationParticipant[],
  fallback: QuoteCommunication,
): QuoteCommunication {
  if (!communication) return fallback;
  const known = new Set(people.map((person) => person.customer.id));
  const keep = (ids: string[]) => ids.filter((id, index) => known.has(id) && ids.indexOf(id) === index);
  return {
    subject: communication.subject,
    emailBody: communication.emailBody,
    smsBody: communication.smsBody,
    emailRecipientIds: keep(communication.emailRecipientIds),
    smsRecipientIds: keep(communication.smsRecipientIds),
  };
}

export function ReviewSendModal({
  participants,
  title,
  priceLabel,
  invoiceId,
  quoteId,
  imageUrl,
  statusLabel,
  communication,
  onSave,
  onSend,
  onClose,
}: {
  participants: ConversationParticipant[];
  title: string;
  priceLabel: string;
  invoiceId: string;
  quoteId: string;
  imageUrl: string;
  statusLabel: string;
  communication: QuoteCommunication | null;
  onSave: (communication: QuoteCommunication) => Promise<void>;
  onSend: () => Promise<void>;
  onClose: () => void;
}) {
  const people = dealRecipients(participants);
  const [draft, setDraft] = useState(() =>
    savedCommunication(communication, people, defaultCommunication(people, invoiceId, title, priceLabel)),
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const draftRef = useRef(draft);
  const savedKey = useRef(communication ? JSON.stringify(draft) : "");
  const defaultKey = useRef(JSON.stringify(defaultCommunication(people, invoiceId, title, priceLabel)));
  const saveChain = useRef(Promise.resolve());
  const onSaveRef = useRef(onSave);
  const onCloseRef = useRef(onClose);
  draftRef.current = draft;
  onSaveRef.current = onSave;
  onCloseRef.current = onClose;

  const flush = useCallback(() => {
    const run = saveChain.current.then(async () => {
      const next = draftRef.current;
      const key = JSON.stringify(next);
      if (key === savedKey.current) return;
      if (!savedKey.current && key === defaultKey.current) return;
      await onSaveRef.current(next);
      savedKey.current = key;
    });
    saveChain.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void flush().catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [flush]);

  const dismiss = useCallback(() => {
    void flush()
      .then(() => onCloseRef.current())
      .catch(() => setSendError(copy.saveQuoteError));
  }, [flush]);

  async function submit() {
    if (sending) return;
    setSending(true);
    setSendError("");
    try {
      await flush();
    } catch {
      setSendError(copy.saveQuoteError);
      setSending(false);
      return;
    }
    try {
      await onSend();
      onClose();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : copy.sendQuoteError);
      setSending(false);
    }
  }

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss]);

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label={copy.close} onClick={dismiss} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-send-title"
        className="relative z-10 my-auto flex max-h-[90vh] min-h-0 w-full max-w-xl flex-col overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 font-sans shadow-2xl"
      >
        <div className="flex items-start justify-between pb-4">
          <h3 id="review-send-title" className="font-serif text-xl leading-tight font-bold text-gray-950">
            {copy.reviewAndSendQuote}
          </h3>
          <button
            type="button"
            aria-label={copy.close}
            onClick={dismiss}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4 py-2">
            <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg">
              <img alt={title} src={imageUrl} className="h-full w-full object-contain" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-xs font-bold text-gray-950">{title}</h4>
                  <span className="inline-flex shrink-0 items-center rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                    {statusLabel}
                  </span>
                </div>
                <span className="mt-1 block text-base leading-none font-semibold text-gray-900">{priceLabel}</span>
              </div>
              <a
                href={`/quote/${quoteId}?mode=internal`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50"
              >
                <Eye className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
                <span>{copy.seeQuoteDetails}</span>
              </a>
            </div>
          </div>

          <section className="pt-2 pb-3">
            <div className="mb-3 inline-flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-xs font-bold tracking-wider text-gray-900 uppercase">{copy.channelEmail}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-600">{copy.to}</label>
                <RecipientField
                  people={people}
                  selectedIds={draft.emailRecipientIds}
                  onChange={(emailRecipientIds) => setDraft((current) => ({ ...current, emailRecipientIds }))}
                />
              </div>
              <div>
                <span className="mb-1 block text-[11px] font-medium text-gray-600">{copy.subject}</span>
                <RichMessageEditor
                  label={copy.subject}
                  initialValue={draft.subject}
                  variant="subject"
                  onChange={(subject) => setDraft((current) => ({ ...current, subject }))}
                />
              </div>
              <div>
                <span className="mb-1 block text-[11px] font-medium text-gray-600">{copy.body}</span>
                <RichMessageEditor
                  label={copy.body}
                  initialValue={draft.emailBody}
                  variant="message"
                  onChange={(emailBody) => setDraft((current) => ({ ...current, emailBody }))}
                />
              </div>
            </div>
          </section>

          <section className="pt-2 pb-1">
            <div className="mb-3 inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-xs font-bold tracking-wider text-gray-900 uppercase">{copy.channelSms}</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-600">{copy.to}</label>
                <RecipientField
                  people={people}
                  selectedIds={draft.smsRecipientIds}
                  onChange={(smsRecipientIds) => setDraft((current) => ({ ...current, smsRecipientIds }))}
                />
              </div>
              <RichMessageEditor
                label={copy.channelSms}
                initialValue={draft.smsBody}
                variant="message"
                maxLength={smsCharacterLimit}
                onChange={(smsBody) => setDraft((current) => ({ ...current, smsBody }))}
              />
            </div>
          </section>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 pt-5">
          <button
            type="button"
            onClick={dismiss}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-100"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => void submit()}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-800 disabled:opacity-60"
          >
            <span>{copy.sendNow}</span>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        {sendError ? <p className="mt-3 text-xs text-red-600">{sendError}</p> : null}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
