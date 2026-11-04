import { z } from "zod";

export const customerListItemSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string(),
  created_at: z.string(),
});

export type CustomerListItem = z.infer<typeof customerListItemSchema>;
