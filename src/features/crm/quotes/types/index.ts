import { z } from "zod";

export const quoteStatusSchema = z.enum(["draft", "sent", "contract"]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type QuoteCustomer = z.infer<typeof quoteCustomerSchema>;

export const quoteListItemSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  createdAt: z.string(),
  dealLabel: z.string(),
  zip: z.string(),
  customers: z.array(quoteCustomerSchema),
  priceLabel: z.string(),
  monthlyLabel: z.string(),
  status: quoteStatusSchema,
});

export type QuoteListItem = z.infer<typeof quoteListItemSchema>;
