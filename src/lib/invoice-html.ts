import { formatUsd } from "@/src/config/shed-config";
import { describeSelections } from "@/src/lib/selections";
import type { QuoteContact, QuoteSelections } from "@/src/lib/quote-types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function env(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function buildInvoiceHtml(input: {
  contact: QuoteContact;
  selections: QuoteSelections;
  invoiceId: string;
  issuedAt?: Date;
}): string {
  const issuedAt = input.issuedAt ?? new Date();
  const due = new Date(issuedAt);
  due.setDate(due.getDate() + 7);

  const described = describeSelections(input.selections);
  const companyName = env("COMPANY_NAME", described.brand.name);
  const slogan = env("COMPANY_SLOGAN", described.brand.region);
  const companyAddress = env("COMPANY_ADDRESS", "");
  const companyCity = env("COMPANY_CITY", "");
  const companyEmail = env("COMPANY_EMAIL", env("SMTP_FROM", env("SMTP_USER", "")));
  const companyPhone = env("COMPANY_PHONE", "");
  const companyWebsite = env("COMPANY_WEBSITE", "");
  const accountName = env("COMPANY_ACCOUNT_NAME", companyName);
  const accountNumber = env("COMPANY_ACCOUNT_NUMBER", "—");

  const pricedRows = described.estimate.lines
    .map(
      (line) => `
        <tr>
          <td style="padding:12px 10px;border-bottom:1px solid #eeeeee;color:#333333;">${escapeHtml(line.label)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #eeeeee;text-align:center;color:#333333;">1</td>
          <td style="padding:12px 10px;border-bottom:1px solid #eeeeee;text-align:right;color:#333333;">${formatUsd(line.amount)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #eeeeee;text-align:right;background:#f4a261;color:#ffffff;font-weight:700;">${formatUsd(line.amount)}</td>
        </tr>`,
    )
    .join("");

  const specRows = described.specs
    .map(
      (spec) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eeeeee;color:#555555;">${escapeHtml(spec.label)}: ${escapeHtml(spec.value)}</td>
          <td style="padding:10px;border-bottom:1px solid #eeeeee;"></td>
          <td style="padding:10px;border-bottom:1px solid #eeeeee;"></td>
          <td style="padding:10px;border-bottom:1px solid #eeeeee;background:#f4a261;"></td>
        </tr>`,
    )
    .join("");

  const tax = 0;
  const total = described.estimate.total;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${escapeHtml(input.invoiceId)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:36px 40px 28px;">
            <tr>
              <td valign="top">
                <div style="font-size:42px;letter-spacing:4px;font-weight:700;color:#222222;">INVOICE</div>
              </td>
              <td valign="top" align="right" style="color:#333333;">
                <div style="font-size:18px;font-weight:700;">${escapeHtml(companyName)}</div>
                <div style="font-size:12px;color:#888888;margin-top:4px;">${escapeHtml(slogan)}</div>
                ${companyAddress ? `<div style="font-size:12px;color:#666666;margin-top:10px;">${escapeHtml(companyAddress)}</div>` : ""}
                ${companyCity ? `<div style="font-size:12px;color:#666666;">${escapeHtml(companyCity)}</div>` : ""}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" width="55%">
                      <div style="font-size:11px;letter-spacing:1px;color:#888888;font-weight:700;">INVOICE TO</div>
                      <div style="margin-top:8px;font-size:15px;font-weight:700;color:#222222;">${escapeHtml(input.contact.fullName)}</div>
                      <div style="font-size:13px;color:#555555;margin-top:4px;">${escapeHtml(input.contact.email)}</div>
                      <div style="font-size:13px;color:#555555;">${escapeHtml(input.contact.phone)}</div>
                      <div style="font-size:13px;color:#555555;">Delivery ZIP ${escapeHtml(input.selections.zip)}</div>
                    </td>
                    <td valign="top" align="right">
                      <div style="font-size:12px;color:#555555;"><span style="color:#888888;">INVOICE NO.</span> &nbsp; ${escapeHtml(input.invoiceId)}</div>
                      <div style="font-size:12px;color:#555555;margin-top:6px;"><span style="color:#888888;">DATE</span> &nbsp; ${formatDate(issuedAt)}</div>
                      <div style="font-size:12px;color:#555555;margin-top:6px;"><span style="color:#888888;">DUE DATE</span> &nbsp; ${formatDate(due)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <th align="left" style="background:#2b2b2b;color:#ffffff;padding:12px 10px;font-size:12px;letter-spacing:1px;">DESCRIPTION</th>
                    <th align="center" style="background:#2b2b2b;color:#ffffff;padding:12px 10px;font-size:12px;letter-spacing:1px;">QTY</th>
                    <th align="right" style="background:#2b2b2b;color:#ffffff;padding:12px 10px;font-size:12px;letter-spacing:1px;">UNIT PRICE</th>
                    <th align="right" style="background:#e67e22;color:#ffffff;padding:12px 10px;font-size:12px;letter-spacing:1px;">TOTAL</th>
                  </tr>
                  ${pricedRows}
                  ${specRows}
                </table>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="top" width="55%">
                      <div style="font-size:13px;font-weight:700;color:#222222;">THANKS FOR YOUR BUSINESS.</div>
                      <div style="margin-top:18px;font-size:11px;letter-spacing:1px;color:#888888;font-weight:700;">PAYMENT INFORMATION</div>
                      <div style="margin-top:8px;font-size:13px;color:#555555;">Account name: ${escapeHtml(accountName)}</div>
                      <div style="font-size:13px;color:#555555;">Account number: ${escapeHtml(accountNumber)}</div>
                      <div style="font-size:13px;color:#555555;">Payment: Due within 7 days of invoice date.</div>
                    </td>
                    <td valign="top" align="right">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:6px 12px;font-size:13px;color:#888888;">Sub Total</td>
                          <td style="padding:6px 0 6px 24px;font-size:13px;color:#222222;text-align:right;">${formatUsd(total)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 12px;font-size:13px;color:#888888;">Tax</td>
                          <td style="padding:6px 0 6px 24px;font-size:13px;color:#222222;text-align:right;">${formatUsd(tax)}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 12px;font-size:16px;font-weight:700;color:#e67e22;">Total</td>
                          <td style="padding:10px 0 10px 24px;font-size:16px;font-weight:700;color:#e67e22;text-align:right;">${formatUsd(total)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:36px;border-top:1px solid #eeeeee;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="font-size:12px;color:#888888;">${escapeHtml(companyEmail)}</td>
                    <td align="center" style="font-size:12px;color:#888888;">${escapeHtml(companyWebsite)}</td>
                    <td align="right" style="font-size:12px;color:#888888;">${escapeHtml(companyPhone)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
