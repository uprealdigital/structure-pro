"use client";

import { useRef, useState } from "react";
import { Camera, Home, ImageIcon, Send, Sparkles, Trash2, X } from "lucide-react";
import { copy } from "@/src/i18n/en";

type YardModalProps = {
  onClose: () => void;
};

type YardStep = "upload" | "send" | "sent";

const fieldClassName =
  "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none transition-colors focus:border-black focus:bg-white";

export function YardModal({ onClose }: YardModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<YardStep>("upload");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function acceptFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".heic")) {
      return;
    }
    setPhotoError(false);
    setPhoto(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function clearPhoto() {
    setPhoto(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function requiredPlaceholder(label: string) {
    return `${label}*`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="yard-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={copy.close}
        onClick={onClose}
      />
      {step === "upload" ? (
        <UploadPanel
          dragging={dragging}
          fileInputRef={fileInputRef}
          photo={photo}
          photoError={photoError}
          previewUrl={previewUrl}
          onAcceptFile={acceptFile}
          onClearPhoto={clearPhoto}
          onClose={onClose}
          onDragChange={setDragging}
          onGenerate={() => {
            if (!photo) {
              setPhotoError(true);
              return;
            }
            setStep("send");
          }}
        />
      ) : (
        <SendPanel
          email={email}
          fullName={fullName}
          phone={phone}
          sent={step === "sent"}
          onClose={onClose}
          onEmailChange={setEmail}
          onFullNameChange={setFullName}
          onPhoneChange={setPhone}
          onSubmit={() => setStep("sent")}
          requiredPlaceholder={requiredPlaceholder}
        />
      )}
    </div>
  );
}

function UploadPanel({
  dragging,
  fileInputRef,
  photo,
  photoError,
  previewUrl,
  onAcceptFile,
  onClearPhoto,
  onClose,
  onDragChange,
  onGenerate,
}: {
  dragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  photo: File | null;
  photoError: boolean;
  previewUrl: string | null;
  onAcceptFile: (file: File | undefined) => void;
  onClearPhoto: () => void;
  onClose: () => void;
  onDragChange: (dragging: boolean) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="relative z-10 my-auto w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-2xl">
      <div className="flex items-start justify-between border-b border-gray-100 p-6 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="font-serif text-2xl font-bold tracking-tight text-gray-950"
              id="yard-modal-title"
            >
              {copy.yardTitle}
            </h2>
            <span className="rounded-full border border-amber-300 bg-amber-100/70 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase">
              {copy.aiPowered}
            </span>
          </div>
          <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-gray-500">
            {copy.yardBody}
          </p>
        </div>
        <button
          type="button"
          aria-label={copy.close}
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5 p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/heic,.heic"
          className="hidden"
          onChange={(event) => onAcceptFile(event.target.files?.[0])}
        />

        <div className="space-y-2">
          {photo ? (
            <div className="flex min-h-[144px] items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-300 bg-stone-200">
                  {previewUrl ? (
                    <img alt="" src={previewUrl} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-500" />
                  )}
                  <span className="absolute right-1 bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-emerald-800 shadow">
                    <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{photo.name}</h3>
                    <span className="rounded border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-emerald-800">
                      {copy.photoUploaded}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{formatFileSize(photo.size)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-xs transition-all hover:border-black hover:text-black"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {copy.replacePhoto}
                </button>
                <button
                  type="button"
                  aria-label={copy.removePhoto}
                  title={copy.removePhoto}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-400 hover:text-black"
                  onClick={onClearPhoto}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                onDragChange(true);
              }}
              onDragLeave={() => onDragChange(false)}
              onDrop={(event) => {
                event.preventDefault();
                onDragChange(false);
                onAcceptFile(event.dataTransfer.files[0]);
              }}
              className={`w-full cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                dragging
                  ? "border-black bg-stone-100"
                  : photoError
                    ? "border-red-400 bg-red-50/40 hover:border-red-500"
                    : "border-stone-300 bg-stone-50/70 hover:border-black"
              }`}
            >
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm">
                <Camera className="h-5 w-5" />
              </span>
              <span className="block text-xs font-semibold text-gray-900">
                {copy.dropPhoto}{" "}
                <span className="font-bold text-black underline">{copy.browseFiles}</span>
              </span>
              <span className="mt-1 block text-[11px] text-gray-500">{copy.photoHint}</span>
            </button>
          )}
          {photoError ? (
            <p className="text-xs text-red-600" role="alert">
              {copy.yardPhotoRequired}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-stone-900 active:scale-95"
            onClick={onGenerate}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            {copy.generateYard}
          </button>
          <p className="pt-1 text-[11px] leading-tight text-gray-500">{copy.yardPrivacy}</p>
        </div>
      </div>
    </div>
  );
}

function SendPanel({
  email,
  fullName,
  phone,
  sent,
  onClose,
  onEmailChange,
  onFullNameChange,
  onPhoneChange,
  onSubmit,
  requiredPlaceholder,
}: {
  email: string;
  fullName: string;
  phone: string;
  sent: boolean;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: () => void;
  requiredPlaceholder: (label: string) => string;
}) {
  return (
    <div className="relative z-10 my-auto w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl sm:p-8">
      <div className="relative border-b border-gray-100 pb-4">
        <button
          type="button"
          aria-label={copy.close}
          onClick={onClose}
          className="absolute top-0 right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center px-4 pt-1 text-center">
          <h2
            className="font-serif text-2xl leading-snug font-bold tracking-tight text-gray-950"
            id="yard-modal-title"
          >
            {sent ? copy.yardPreviewSentTitle : copy.yardPreviewInProgress}
          </h2>
          <div className="relative my-4 flex items-center justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-800/20 bg-amber-100/40 shadow-sm">
              <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
                <Sparkles className="h-3.5 w-3.5 fill-current" />
              </span>
              <Home className="h-10 w-10 text-gray-800" strokeWidth={1.75} />
            </div>
          </div>
          {sent ? (
            <p className="text-sm leading-relaxed text-gray-600">
              {copy.yardPreviewSentBody.replace("{email}", email)}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900">{copy.sendPreviewWhere}</p>
              <p className="mt-0.5 text-xs text-gray-500">{copy.sendPreviewNotify}</p>
              <p className="mt-1 text-[11px] text-gray-400">
                {copy.quoteRequiredHint}{" "}
                <span className="font-semibold text-stone-800">*</span>
              </p>
            </>
          )}
        </div>
      </div>

      {sent ? (
        <div className="pt-6">
          <button
            type="button"
            className="w-full rounded-full bg-black px-6 py-3.5 text-center text-sm font-medium text-white shadow-md transition-all hover:bg-stone-900 active:scale-95"
            onClick={onClose}
          >
            {copy.yardPreviewDone}
          </button>
        </div>
      ) : (
        <form
          className="space-y-4 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="space-y-3">
            <input
              type="text"
              required
              autoComplete="name"
              placeholder={requiredPlaceholder(copy.fullName)}
              value={fullName}
              onChange={(event) => onFullNameChange(event.target.value)}
              className={fieldClassName}
            />
            <input
              type="tel"
              required
              autoComplete="tel"
              placeholder={requiredPlaceholder(copy.phone)}
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              className={fieldClassName}
            />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={requiredPlaceholder(copy.email)}
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-3.5 text-sm font-medium text-white shadow-md transition-all hover:bg-stone-900 active:scale-95"
            >
              <Send className="h-4 w-4" />
              {copy.sendPreviewCta}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
