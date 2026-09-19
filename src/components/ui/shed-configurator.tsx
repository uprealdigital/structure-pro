"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Expand,
  Heart,
  Home,
  Mic,
  Send,
  Share,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { ShedControls } from "@/src/components/ui/shed-controls";
import { copy } from "@/src/i18n/en";
import {
  applyAssistantPrompt,
  CATALOG,
  DEFAULT_SHED_CONFIG,
  estimateShed,
  formatUsd,
  getStyle,
  type ShedConfig,
} from "@/src/config/shed-config";

const ShedScene = dynamic(() => import("@/src/components/canvas/shed-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      {copy.loadingScene}
    </div>
  ),
});

export function ShedConfigurator() {
  const [config, setConfig] = useState<ShedConfig>(DEFAULT_SHED_CONFIG);
  const [assistantNote, setAssistantNote] = useState("");
  const [yardOpen, setYardOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [zip, setZip] = useState(CATALOG.defaultZip);

  const style = getStyle(config.styleId);
  const estimate = useMemo(() => estimateShed(config), [config]);

  function submitPrompt(prompt: string) {
    const result = applyAssistantPrompt(config, prompt);
    setConfig(result.config);
    setAssistantNote(result.message);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <section className="studio-viewport relative flex min-h-[50vh] flex-1 flex-col overflow-hidden lg:min-h-0">
        <div className="pointer-events-none absolute inset-0 opacity-60 floor-grid" />
        <div className="relative min-h-0 flex-1">
          <ShedScene config={config} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5">
          <div className="pointer-events-auto flex items-center space-x-3">
            <div className="rounded-sm bg-black p-2 font-serif text-base leading-none font-bold tracking-widest text-white shadow-md">
              {CATALOG.brand.mark}
            </div>
            <div>
              <span className="block font-serif text-sm leading-snug font-bold tracking-wide text-gray-900">
                {CATALOG.brand.name}
              </span>
              <span className="block text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                {CATALOG.brand.region}
              </span>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center space-x-2.5">
            <IconButton
              label="Fullscreen"
              onClick={() => void document.documentElement.requestFullscreen()}
            >
              <Expand className="h-4 w-4" />
            </IconButton>
            <IconButton label={copy.viewInSpace}>
              <Box className="h-4 w-4" />
            </IconButton>
            <button
              type="button"
              onClick={() => setYardOpen(true)}
              className="relative flex h-10 items-center space-x-2 rounded-full border border-gray-300 bg-white/90 px-4 text-xs font-medium text-gray-800 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)]"
            >
              <Home className="h-4 w-4" />
              <span>{copy.viewInYard}</span>
              <span className="absolute -top-1.5 -right-1.5 rounded-full bg-black px-1.5 py-0.5 text-[10px] leading-none font-bold text-white uppercase">
                {copy.newBadge}
              </span>
            </button>
            <IconButton
              label="Share"
              onClick={() => void navigator.clipboard.writeText(window.location.href)}
            >
              <Share className="h-4 w-4" />
            </IconButton>
            <IconButton label="Save">
              <Heart className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <AssistantPromptForm note={assistantNote} onSubmitPrompt={submitPrompt} />
      </section>

      <aside className="z-30 flex h-[46vh] w-full shrink-0 flex-col overflow-hidden border-t border-[#E5E7EB] bg-white shadow-xl md:h-auto lg:h-full lg:w-[420px] lg:border-t-0 lg:border-l">
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl leading-tight font-bold tracking-tight text-gray-950">
                {style.productTitle}
              </h1>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-sm text-gray-500">{copy.estPrice}</span>
                <span className="text-xl font-semibold text-gray-900">
                  {formatUsd(estimate.total)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                <span className="text-gray-500">{copy.payAsLowAs}</span>
                <span className="rounded-sm border border-amber-800/80 bg-amber-100/30 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-amber-800/80">
                  {formatUsd(estimate.monthly)}/mo
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              className="rounded-full bg-[#1A1A1A] px-8 py-3.5 text-sm leading-none font-medium whitespace-nowrap text-white hover:bg-black"
            >
              {copy.submitQuote}
            </button>
          </div>
        </header>

        <ShedControls
          config={config}
          onChange={setConfig}
          onSubmit={() => setQuoteOpen(true)}
        />

        <details className="group z-20 border-t border-[#E5E7EB] bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-6 hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                $
              </div>
              <div>
                <span className="block text-base leading-tight font-semibold text-gray-900">
                  {copy.estimateBreakdown}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {copy.tapItemized}
                </span>
              </div>
            </div>
            <span className="font-mono text-xl font-bold text-gray-900">
              {formatUsd(estimate.total)}
            </span>
          </summary>
          <div className="space-y-2.5 border-t border-gray-100 bg-gray-50/50 px-5 pt-1 pb-4">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200/70 py-2.5 text-xs text-gray-600">
              <span>{copy.paymentOptions}</span>
              <span>{copy.fromAsLowAs}</span>
              <span className="rounded-sm border border-amber-800/80 bg-amber-100/30 px-2 py-0.5 text-[11px] font-semibold text-amber-800/80">
                {formatUsd(estimate.financeMonthly)}/mo
              </span>
              <span>{copy.forMonths}</span>
            </div>
            <div className="divide-y divide-gray-200/70 text-xs">
              {estimate.lines.map((line) => (
                <div key={line.label} className="flex items-center justify-between py-1.5">
                  <span className="font-medium text-gray-700">{line.label}</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {formatUsd(line.amount)}
                  </span>
                </div>
              ))}
              <div className="flex items-baseline justify-between pt-2.5 font-bold text-gray-950">
                <span className="text-xs tracking-wide uppercase">
                  {copy.totalEstimate}
                </span>
                <span className="font-mono text-sm">{formatUsd(estimate.total)}</span>
              </div>
            </div>
            <p className="pt-3 text-[11px] leading-relaxed text-gray-500">
              {copy.quoteDisclaimer}
            </p>
            <p className="text-[11px] leading-relaxed text-gray-500">
              {copy.satisfaction}
            </p>
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              className="mt-2 block w-full rounded-full bg-black py-3 text-center text-sm font-medium text-white"
            >
              {copy.submitQuote}
            </button>
            <div className="flex items-center space-x-2 pt-3 text-xs text-gray-600">
              <span>
                {copy.deliveryTo}{" "}
                <button type="button" className="font-medium underline">
                  {zip}
                </button>
              </span>
            </div>
            <button type="button" className="text-left text-xs font-medium text-gray-800 underline">
              {copy.installation}
            </button>
          </div>
        </details>
      </aside>

      {yardOpen ? (
        <Modal title={copy.yardTitle} onClose={() => setYardOpen(false)}>
          <p className="text-xs leading-relaxed text-gray-500">{copy.yardBody}</p>
          <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center">
            <p className="text-xs font-semibold text-gray-800">{copy.dropPhoto}</p>
            <p className="mt-1 text-[11px] text-gray-400">{copy.photoHint}</p>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-full bg-black py-3 text-xs font-semibold text-white"
            onClick={() => setYardOpen(false)}
          >
            {copy.generateYard}
          </button>
        </Modal>
      ) : null}

      {quoteOpen ? <QuoteModal onClose={() => setQuoteOpen(false)} /> : null}
    </div>
  );
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  abort: () => void;
  stop: () => void;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function AssistantPromptForm({
  note,
  onSubmitPrompt,
}: {
  note: string;
  onSubmitPrompt: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const promptRef = useRef("");
  const basePromptRef = useRef("");
  const ignoreSendUntilRef = useRef(0);
  const revealSendTimeoutRef = useRef<number | null>(null);
  const hasText = prompt.trim().length > 0;
  const showSend = hasText && !listening;
  const statusNote = voiceNote || note;

  function setPromptValue(next: string) {
    promptRef.current = next;
    setPrompt(next);
  }

  function sendCurrentPrompt() {
    if (listeningRef.current) return;
    if (Date.now() < ignoreSendUntilRef.current) return;
    const nextPrompt = promptRef.current.trim();
    if (!nextPrompt) return;
    onSubmitPrompt(nextPrompt);
    setPromptValue("");
    setVoiceNote("");
  }

  function stopListening() {
    listeningRef.current = false;
    ignoreSendUntilRef.current = Date.now() + 500;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (revealSendTimeoutRef.current !== null) {
      window.clearTimeout(revealSendTimeoutRef.current);
    }
    revealSendTimeoutRef.current = window.setTimeout(() => {
      revealSendTimeoutRef.current = null;
      setListening(false);
    }, 0);
  }

  function startRecognitionSession() {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition || !listeningRef.current || recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let spoken = "";
      for (let index = 0; index < event.results.length; index += 1) {
        spoken += event.results[index][0]?.transcript ?? "";
      }
      const next = [basePromptRef.current, spoken.trim()].filter(Boolean).join(" ");
      setPromptValue(next);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        listeningRef.current = false;
        setListening(false);
        setVoiceNote(copy.voiceDenied);
        recognitionRef.current = null;
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      if (!listeningRef.current) return;
      window.setTimeout(() => {
        if (!listeningRef.current || recognitionRef.current) return;
        basePromptRef.current = promptRef.current.trim();
        startRecognitionSession();
      }, 200);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }

  async function startListening() {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setVoiceNote(copy.voiceUnsupported);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceNote(copy.voiceDenied);
      return;
    }

    listeningRef.current = true;
    basePromptRef.current = promptRef.current.trim();
    setVoiceNote("");
    setListening(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      listeningRef.current = false;
      setListening(false);
      setVoiceNote(copy.voiceDenied);
      return;
    }

    if (!listeningRef.current) return;
    startRecognitionSession();
  }

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (revealSendTimeoutRef.current !== null) {
        window.clearTimeout(revealSendTimeoutRef.current);
      }
    };
  }, []);

  function toggleVoice() {
    if (listeningRef.current) {
      stopListening();
      return;
    }
    void startListening();
  }

  return (
    <div className="absolute bottom-8 left-1/2 z-30 w-[min(90%,calc(100%-2.75rem))] max-w-md -translate-x-1/2">
      <form
        className={`transition-[width] duration-200 ease-out ${
          listening ? "w-[calc(100%+2.75rem)]" : "w-full"
        }`}
        onSubmit={(event) => {
          event.preventDefault();
          sendCurrentPrompt();
        }}
      >
        <div className="flex items-center gap-3 rounded-full border border-gray-200/80 bg-white/95 px-4 py-2 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-700">
            <Sparkles className="h-4 w-4" />
          </div>
          <input
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            placeholder={listening ? copy.aiListeningPlaceholder : copy.aiPlaceholder}
            value={prompt}
            onChange={(event) => setPromptValue(event.target.value)}
          />
          <div className="flex shrink-0 items-center">
            {listening ? (
              <button
                aria-label={copy.stopVoiceInput}
                aria-pressed="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleVoice();
                }}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : showSend ? (
              <button
                aria-label={copy.sendPrompt}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white"
                type="button"
                onClick={sendCurrentPrompt}
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                aria-label={copy.voiceInput}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white"
                type="button"
                onClick={toggleVoice}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
            <div
              className={`grid overflow-hidden transition-[grid-template-columns] duration-200 ease-out ${
                listening ? "grid-cols-[0.5rem_2.25rem]" : "grid-cols-[0rem_0rem]"
              }`}
            >
              <span aria-hidden="true" />
              <button
                aria-hidden={!listening}
                aria-label={listening ? copy.sendPrompt : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                disabled
                tabIndex={-1}
                type="button"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </form>
      {statusNote ? (
        <p className="mt-2 text-center text-xs text-gray-600">{statusNote}</p>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

const quoteFieldClassName =
  "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none transition-colors focus:border-black focus:bg-white";

function QuoteModal({ onClose }: { onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function requiredPlaceholder(label: string) {
    return `${label}*`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label={copy.close}
        onClick={onClose}
      />
      <div className="relative z-10 my-auto w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="font-serif text-xl font-bold tracking-tight text-gray-950">
              {copy.quoteTitle}
            </h2>
            <p className="text-xs text-gray-500">
              {copy.quoteRequiredHint}{" "}
              <span className="font-medium text-stone-800">*</span>
            </p>
          </div>
          <button
            type="button"
            aria-label={copy.close}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
          }}
        >
          <div className="space-y-3">
            <input
              type="text"
              required
              autoComplete="name"
              placeholder={requiredPlaceholder(copy.fullName)}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={quoteFieldClassName}
            />
            <input
              type="tel"
              required
              autoComplete="tel"
              placeholder={requiredPlaceholder(copy.phone)}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={quoteFieldClassName}
            />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={requiredPlaceholder(copy.email)}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={quoteFieldClassName}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-full bg-black px-6 py-3.5 text-center text-sm font-medium text-white shadow-md transition-all hover:bg-stone-900 active:scale-95"
            >
              {copy.submitQuote}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label={copy.close}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50/70 p-6">
          <h3 className="font-serif text-lg font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200/60 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
