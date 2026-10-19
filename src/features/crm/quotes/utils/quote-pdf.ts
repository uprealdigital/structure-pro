import { portalCopy } from "@/src/features/crm/quotes/locales/en";
import type { QuotePortal } from "@/src/features/crm/quotes/types";

function pdfText(value: string): string {
  return value
    .replaceAll("×", "x")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replace(/[^\x20-\x7E]/g, "");
}

function pdfLiteral(value: string): string {
  return `(${pdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")})`;
}

function wrap(value: string, width: number): string[] {
  const words = pdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function quoteLines(quote: QuotePortal): string[] {
  const lines = [
    quote.dealName,
    "",
    `${quote.versionLabel}    ${quote.dateLabel}`,
    "",
    portalCopy.paymentOptions,
    `${portalCopy.fromAsLowAs} ${quote.monthlyLabel} ${quote.monthsLabel}`,
    "",
  ];
  for (const line of quote.lines) lines.push(`${line.label}    ${line.amountLabel}`);
  lines.push("", `${portalCopy.total}    ${quote.totalLabel}`, "");
  lines.push(...wrap(portalCopy.disclaimer, 88), "");
  lines.push(...wrap(portalCopy.satisfaction, 88));
  if (quote.zip) lines.push("", `${portalCopy.deliveryTo} ${quote.zip}`);
  return lines;
}

function chunk(lines: string[], size: number): string[][] {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += size) pages.push(lines.slice(index, index + size));
  return pages.length > 0 ? pages : [[""]];
}

export function quotePdfFilename(quote: QuotePortal): string {
  const name = pdfText(quote.dealName)
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name || quote.invoiceId}.pdf`;
}

export function quotePdfBytes(quote: QuotePortal): Uint8Array {
  const pages = chunk(quoteLines(quote), 42);
  const encoder = new TextEncoder();
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  ];
  const fontId = 3 + pages.length * 2;

  pages.forEach((page, index) => {
    const commands = page
      .map((line, lineIndex) => `${lineIndex === 0 ? "72 750 Td" : "0 -16 Td"} ${pdfLiteral(line)} Tj`)
      .join("\n");
    const stream = `BT\n/F1 11 Tf\n${commands}\nET`;
    const contentId = 3 + index * 2;
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    );
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const encoded = encoder.encode(`${index + 1} 0 obj\n${object}\nendobj\n`);
    chunks.push(encoded);
    length += encoded.length;
  });

  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`;
  chunks.push(encoder.encode(xref));

  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export function quotePdfBlob(quote: QuotePortal): Blob {
  const bytes = quotePdfBytes(quote);
  return new Blob([bytes], { type: "application/pdf" });
}

export function downloadQuotePdf(quote: QuotePortal) {
  const url = URL.createObjectURL(quotePdfBlob(quote));
  const link = document.createElement("a");
  link.href = url;
  link.download = quotePdfFilename(quote);
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareQuotePdf(quote: QuotePortal) {
  const file = new File([quotePdfBlob(quote)], quotePdfFilename(quote), { type: "application/pdf" });
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: quote.dealName });
    return;
  }
  downloadQuotePdf(quote);
}
