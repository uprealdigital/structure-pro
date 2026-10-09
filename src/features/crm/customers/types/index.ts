import { z } from "zod";

export const customerListItemSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export type CustomerListItem = z.infer<typeof customerListItemSchema>;
