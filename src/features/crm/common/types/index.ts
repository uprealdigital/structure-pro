import { z } from "zod";

export const customerSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  optedOut: z.boolean(),
  createdAt: z.string().optional(),
});

export type Customer = z.infer<typeof customerSchema>;

export const customerWriteSchema = z.object({
  dealId: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  optedOut: z.boolean().optional(),
});

export const customerPatchSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  optedOut: z.boolean().optional(),
});
