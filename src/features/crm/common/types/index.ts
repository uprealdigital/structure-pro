import { z } from "zod";
import { logLevelSchema } from "@/src/common/utils/log-level";

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

export const featureLogStatusSchema = z.enum(["detected", "none", "error"]);

export type FeatureLogStatus = z.infer<typeof featureLogStatusSchema>;

export const crmLogSchema = z.object({
  id: z.string(),
  feature: z.string(),
  rawResponse: z.string().nullable(),
  parsedResponse: z.unknown(),
  status: featureLogStatusSchema,
  logLevel: logLevelSchema,
  errorMessage: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export type CrmLog = z.infer<typeof crmLogSchema>;

export const crmLogWriteSchema = z.object({
  feature: z.string().trim().min(1),
  rawResponse: z.string().nullable(),
  parsedResponse: z.unknown(),
  status: featureLogStatusSchema,
  logLevel: logLevelSchema,
  errorMessage: z.string().nullable(),
});

export type CrmLogWrite = z.infer<typeof crmLogWriteSchema>;

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  position: z.number(),
});

export type Organization = z.infer<typeof organizationSchema>;

export const organizationWriteSchema = z.object({
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1).max(2),
  description: z.string(),
  position: z.number().int().nonnegative(),
});

export const organizationPatchSchema = organizationWriteSchema.partial();

export const dealershipSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  hasPhysicalLocation: z.boolean(),
  position: z.number(),
});

export type Dealership = z.infer<typeof dealershipSchema>;

const dealershipWriteObject = z.object({
  organizationId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string(),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  hasPhysicalLocation: z.boolean(),
  position: z.number().int().nonnegative(),
});

export const dealershipWriteSchema = dealershipWriteObject.refine(
  (dealership) => dealership.name === `${dealership.city}, ${dealership.state}`,
  { path: ["name"] },
);

export const dealershipPatchSchema = dealershipWriteObject.partial();

export const organizationDirectorySchema = organizationSchema.extend({
  dealerships: z.array(dealershipSchema),
});

export type OrganizationDirectoryEntry = z.infer<typeof organizationDirectorySchema>;

export const customerPatchSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  optedOut: z.boolean().optional(),
  activeDealId: z.string().optional(),
});
