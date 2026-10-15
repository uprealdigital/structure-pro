import { z } from "zod";

export const customerSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  optedOut: z.boolean(),
  activeDealId: z.string().optional(),
  createdAt: z.string().optional(),
});

export type Customer = z.infer<typeof customerSchema>;

export const customerWriteSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  optedOut: z.boolean().optional(),
});

export const dealCustomerSchema = z.object({
  customerId: z.string(),
  dealId: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.string().optional(),
});

export type DealCustomer = z.infer<typeof dealCustomerSchema>;

export const dealCustomerWriteSchema = z.object({
  customerId: z.string(),
  dealId: z.string(),
  isPrimary: z.boolean(),
});

export const customerPatchSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  optedOut: z.boolean().optional(),
  activeDealId: z.string().optional(),
});
