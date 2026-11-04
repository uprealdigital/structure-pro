import { z } from "zod";
import { dealStatusSchema } from "@/src/features/crm/deals/types";
import { quoteSummaryWireSchema } from "@/src/features/crm/quotes/types";

export const customerListItemSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export type CustomerListItem = z.infer<typeof customerListItemSchema>;

export const customerListWireSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string(),
  created_at: z.string(),
});

export type CustomerListWire = z.infer<typeof customerListWireSchema>;

export const customerListResponseSchema = z.object({
  customers: z.array(customerListWireSchema),
});

export const customerDealWireSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  status: dealStatusSchema,
  quote: quoteSummaryWireSchema.nullable(),
});

export type CustomerDealWire = z.infer<typeof customerDealWireSchema>;

export const customerConversationWireSchema = z.object({
  id: z.string(),
  updated_at: z.string(),
});

export const customerDetailWireSchema = customerListWireSchema.extend({
  deals: z.array(customerDealWireSchema),
  conversation: customerConversationWireSchema.nullable(),
});

export type CustomerDetailWire = z.infer<typeof customerDetailWireSchema>;
