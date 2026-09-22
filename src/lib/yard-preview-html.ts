import { formatUsd } from "@/src/config/shed-config";
import { describeSelections } from "@/src/lib/selections";
import type { QuoteContact, QuoteSelections } from "@/src/lib/quote-types";

export const YARD_PREVIEW_CID = "yard-preview";

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

function companyLines(selections: QuoteSelections) {
  const described = describeSelections(selections);
  return {
    described,
    companyName: env("COMPANY_NAME", described.brand.name),
    slogan: env("COMPANY_SLOGAN", described.brand.region),
    companyAddress: env("COMPANY_ADDRESS", ""),
    companyCity: env("COMPANY_CITY", ""),
    companyEmail: env("COMPANY_EMAIL", env("SMTP_FROM", env("SMTP_USER", ""))),
    companyPhone: env("COMPANY_PHONE", ""),
    companyWebsite: env("COMPANY_WEBSITE", ""),
    mark: described.brand.mark,
  };
}

export function buildYardPreviewHtml(input: {
  contact: QuoteContact;
  selections: QuoteSelections;
}): string {
  const company = companyLines(input.selections);
  const price = formatUsd(company.described.estimate.total);
  const specRows = company.described.specs
    .map(
      (spec) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#666666;font-size:13px;">${escapeHtml(spec.label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#222222;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(spec.value)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Your backyard preview</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;">
            <tr>
              <td style="background:#1a1a1a;padding:28px 40px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:4px;font-weight:700;">${escapeHtml(company.mark)}</div>
                <div style="margin-top:8px;font-size:22px;font-weight:700;">${escapeHtml(company.companyName)}</div>
                <div style="margin-top:4px;font-size:12px;letter-spacing:2px;color:#d6d3d1;">${escapeHtml(company.slogan)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 8px;color:#222222;">
                <div style="font-size:18px;font-weight:700;">Hello ${escapeHtml(input.contact.fullName)},</div>
                <p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:#444444;">
                  Your backyard preview is ready. We placed the shed you configured into the photo of your yard.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;">
                <img src="cid:${YARD_PREVIEW_CID}" alt="Your backyard preview" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:8px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 8px;font-size:13px;line-height:1.5;color:#666666;">
                This is a visualization to help you picture the shed in your yard. Scale, color, and placement are approximate and may differ from the finished building.
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <th align="left" style="background:#2b2b2b;color:#ffffff;padding:12px;font-size:12px;letter-spacing:1px;">SHED</th>
                    <th align="right" style="background:#e67e22;color:#ffffff;padding:12px;font-size:12px;letter-spacing:1px;">DETAILS</th>
                  </tr>
                  ${specRows}
                  <tr>
                    <td style="padding:14px 12px;font-size:16px;font-weight:700;color:#e67e22;">Estimated price</td>
                    <td style="padding:14px 12px;font-size:16px;font-weight:700;color:#e67e22;text-align:right;">${price}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 32px;border-top:1px solid #eeeeee;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="font-size:12px;color:#888888;">${escapeHtml(company.companyEmail)}</td>
                    <td align="center" style="font-size:12px;color:#888888;">${escapeHtml(company.companyWebsite)}</td>
                    <td align="right" style="font-size:12px;color:#888888;">${escapeHtml(company.companyPhone)}</td>
                  </tr>
                  ${
                    company.companyAddress || company.companyCity
                      ? `<tr>
                    <td colspan="3" style="padding-top:8px;font-size:12px;color:#888888;">${escapeHtml([company.companyAddress, company.companyCity].filter(Boolean).join(", "))}</td>
                  </tr>`
                      : ""
                  }
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

export function buildYardPreviewText(input: {
  contact: QuoteContact;
  selections: QuoteSelections;
}): string {
  const company = companyLines(input.selections);
  const price = formatUsd(company.described.estimate.total);
  const specs = company.described.specs
    .map((spec) => `${spec.label}: ${spec.value}`)
    .join("\n");
  const footer = [
    company.companyName,
    company.companyEmail,
    company.companyPhone,
    company.companyWebsite,
    [company.companyAddress, company.companyCity].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return `Hello ${input.contact.fullName},

Your backyard preview is ready. We placed the shed you configured into the photo of your yard. The image is included in this email.

${specs}

Estimated price: ${price}

This is a visualization to help you picture the shed in your yard. Scale, color, and placement are approximate and may differ from the finished building.

${footer}`;
}
