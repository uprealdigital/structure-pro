import {
  crmLogSchema,
  customerSchema,
  dealCustomerSchema,
  dealershipSchema,
  organizationSchema,
  type CrmLog,
  type Customer,
  type DealCustomer,
  type Dealership,
  type Organization,
} from "@/src/features/crm/common/types";

export type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  opted_out: boolean;
  active_deal_id?: string | null;
  created_at?: string | null;
};

export type DealCustomerRow = {
  customer_id: string;
  deal_id: string;
  is_primary: boolean;
  created_at?: string | null;
};

export type OrganizationRow = {
  id: string;
  name: string;
  icon: string;
  description: string;
  position: number;
};

export type DealershipRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  has_physical_location: boolean;
  position: number;
};

export type CrmLogRow = {
  id: string;
  feature: string;
  raw_response: string | null;
  parsed_response: unknown;
  status: string;
  log_level: string;
  error_message: string | null;
  read_at: string | null;
  created_at: string;
};

function jsonField(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function toCrmLog(row: CrmLogRow): CrmLog | undefined {
  const log = crmLogSchema.safeParse({
    id: row.id,
    feature: row.feature,
    rawResponse: row.raw_response,
    parsedResponse: jsonField(row.parsed_response),
    status: row.status,
    logLevel: row.log_level,
    errorMessage: row.error_message,
    readAt: row.read_at,
    createdAt: row.created_at,
  });
  return log.success ? log.data : undefined;
}

export function toOrganization(row: OrganizationRow): Organization | undefined {
  const organization = organizationSchema.safeParse({
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    position: row.position,
  });
  return organization.success ? organization.data : undefined;
}

export function toDealership(row: DealershipRow): Dealership | undefined {
  const dealership = dealershipSchema.safeParse({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    hasPhysicalLocation: row.has_physical_location,
    position: row.position,
  });
  return dealership.success ? dealership.data : undefined;
}

export function toCustomer(row: CustomerRow): Customer | undefined {
  const customer = customerSchema.safeParse({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    optedOut: row.opted_out,
    activeDealId: row.active_deal_id ?? undefined,
    createdAt: row.created_at ?? undefined,
  });
  return customer.success ? customer.data : undefined;
}

export function toDealCustomer(row: DealCustomerRow): DealCustomer | undefined {
  const link = dealCustomerSchema.safeParse({
    customerId: row.customer_id,
    dealId: row.deal_id,
    isPrimary: row.is_primary,
    createdAt: row.created_at ?? undefined,
  });
  return link.success ? link.data : undefined;
}
