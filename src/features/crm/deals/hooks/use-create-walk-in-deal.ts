"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ToastTone } from "@/src/common/components/toast";
import { toE164 } from "@/src/common/utils/phone";
import { copy } from "@/src/features/crm/deals/locales/en";
import { createWalkInDeal } from "@/src/features/crm/deals/server/actions";

type Field = "fullName" | "phone" | "email";

function fieldErrors(input: { fullName: string; phone: string; email: string }): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!input.fullName.trim()) errors.fullName = copy.fullNameRequired;
  if (!input.phone.trim()) errors.phone = copy.phoneRequired;
  else if (!toE164(input.phone)) errors.phone = copy.phoneInvalid;
  const email = input.email.trim();
  if (!email) errors.email = copy.emailRequired;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = copy.emailInvalid;
  return errors;
}

export function useCreateWalkInDeal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string; tone: ToastTone } | null>(null);

  function reset() {
    setFullName("");
    setPhone("");
    setEmail("");
    setErrors({});
  }

  function close() {
    if (pending) return;
    setOpen(false);
    reset();
  }

  function toggle() {
    if (open) close();
    else setOpen(true);
  }

  function change(field: Field, value: string) {
    if (field === "fullName") setFullName(value);
    if (field === "phone") setPhone(value);
    if (field === "email") setEmail(value);
    setErrors((current) => {
      if (!current[field] && !current.form) return current;
      const next = { ...current };
      delete next[field];
      delete next.form;
      return next;
    });
  }

  async function submit() {
    if (pending) return;
    const next = fieldErrors({ fullName, phone, email });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    const result = await createWalkInDeal({ fullName, phone, email });
    setPending(false);
    if ("error" in result) {
      setErrors({ form: result.error });
      return;
    }
    const message = copy.dealCreated(result.data.name);
    setOpen(false);
    reset();
    setToast({ id: Date.now(), message, tone: "success" });
    router.refresh();
  }

  return {
    open,
    toggle,
    close,
    fullName,
    phone,
    email,
    errors,
    pending,
    toast,
    dismissToast: () => setToast(null),
    change,
    submit,
  };
}
