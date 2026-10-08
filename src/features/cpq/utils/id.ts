import { randomBytes } from "node:crypto";

export function newConfigurationId(): string {
  return randomBytes(16).toString("hex");
}

export function newInvoiceId(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `INV-${stamp}${rand}`;
}
