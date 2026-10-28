import {
  crmLogSchema,
  customerSchema,
  dealCustomerSchema,
  type CrmLog,
  type Customer,
  type DealCustomer,
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

export type CrmLogRow = {
  id: string;
  feature: string;
  raw_response: string | null;
  parsed_response: unknown;
  status: string;
  error_message: string | null;
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
    errorMessage: row.error_message,
    createdAt: row.created_at,
  });
  return log.success ? log.data : undefined;
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
