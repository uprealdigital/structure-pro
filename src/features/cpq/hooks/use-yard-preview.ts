"use client";

import { useRef, useState } from "react";
import type { BuildingCapture } from "@/src/features/cpq/components/building-scene";
import { copy } from "@/src/features/cpq/locales/en";
import type { QuoteSelections } from "@/src/features/cpq/types";

type YardStep = "upload" | "send" | "sent";

export function useYardPreview(selections: QuoteSelections, captureBuilding: BuildingCapture) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<YardStep>("upload");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  async function handleSend() {
    if (submitting) return;
    if (!photo) {
      setSubmitError(copy.yardPreviewError);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const render = await captureBuilding();
      if (!render || render.size === 0) {
        setSubmitError(copy.yardPreviewError);
        return;
      }

      const body = new FormData();
      body.append("yardPhoto", photo);
      body.append("buildingRender", render, "building.jpg");
      body.append("fullName", fullName.trim());
      body.append("phone", phone);
      body.append("email", email.trim());
      body.append("selections", JSON.stringify(selections));

      const response = await fetch("/api/ai/yard-preview", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setSubmitError(payload?.error || copy.yardPreviewError);
        return;
      }
      setStep("sent");
    } catch {
      setSubmitError(copy.yardPreviewError);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    acceptFile,
    clearPhoto,
    dragging,
    email,
    fileInputRef,
    fullName,
    handleSend,
    phone,
    photo,
    photoError,
    previewUrl,
    requiredPlaceholder,
    setDragging,
    setEmail,
    setFullName,
    setPhone,
    setPhotoError,
    setStep,
    setSubmitError,
    step,
    submitError,
    submitting,
  };
}
