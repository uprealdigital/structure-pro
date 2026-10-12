import { assertInternal } from "@/src/common/utils/internal-call";
import { createDealCustomer, readDealCustomer, readDealCustomersForDeal } from "@/src/features/crm/common/db/deal-customer";
import { createCustomer, readCustomerByPhone } from "@/src/features/crm/common/db/customer";

export const runtime = "nodejs";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function payloadOf(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;

  const payload = await payloadOf(request);
  const dealId = text(payload?.dealId);
  const fullName = text(payload?.fullName);
  const phone = text(payload?.phone);
  const email = text(payload?.email);
  const optedOut = typeof payload?.optedOut === "boolean" ? payload.optedOut : undefined;
  if (!dealId || !fullName || !phone || !email) {
    return Response.json(
      { error: "dealId, fullName, phone, and email are required" },
      { status: 400 },
    );
  }

  try {
    const existing = await readCustomerByPhone(phone);
    const customer = existing ?? (await createCustomer({ fullName, phone, email, optedOut }));
    const linked = await readDealCustomer(customer.id, dealId);
    if (!linked) {
      const onDeal = await readDealCustomersForDeal(dealId);
      await createDealCustomer({
        customerId: customer.id,
        dealId,
        isPrimary: !onDeal.some((link) => link.isPrimary),
      });
    }
    return Response.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save customer";
    return Response.json({ error: message }, { status: 500 });
  }
}
