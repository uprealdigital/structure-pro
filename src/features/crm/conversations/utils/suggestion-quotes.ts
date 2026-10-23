export type SuggestionQuoteOption = {
  id: string;
  name: string;
  number: number;
  title: string;
  sharedAt: string | null;
};

const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];

export function latestShareAt(stamps: Array<string | null | undefined>): string | null {
  let latest = "";
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const stamp of stamps) {
    if (!stamp) continue;
    const ms = Date.parse(stamp);
    if (Number.isNaN(ms) || ms < latestMs) continue;
    latest = stamp;
    latestMs = ms;
  }
  return latest || null;
}

export function suggestionQuoteTargets(
  quotes: SuggestionQuoteOption[],
  messages: string[],
  activeQuoteId: string | null,
): { quotes: SuggestionQuoteOption[]; selectedId: string | null } {
  if (quotes.length === 0) return { quotes: [], selectedId: null };
  if (quotes.length === 1) return { quotes, selectedId: quotes[0].id };

  const mentioned = quotesMentioned(quotes, messages.join("\n"));
  const selected =
    mentioned.length > 0 ? preferredQuote(mentioned, activeQuoteId) : preferredQuote(quotes, activeQuoteId);
  return { quotes, selectedId: selected.id };
}

function preferredQuote(quotes: SuggestionQuoteOption[], activeQuoteId: string | null): SuggestionQuoteOption {
  let latest: SuggestionQuoteOption | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const quote of quotes) {
    if (!quote.sharedAt) continue;
    const ms = Date.parse(quote.sharedAt);
    if (Number.isNaN(ms) || ms < latestMs) continue;
    latest = quote;
    latestMs = ms;
  }
  if (latest) return latest;
  return quotes.find((quote) => quote.id === activeQuoteId) ?? quotes[0];
}

function quotesMentioned(quotes: SuggestionQuoteOption[], text: string): SuggestionQuoteOption[] {
  const normalized = text.toLowerCase().replace(/×/g, "x");
  const found = new Set<number>();

  for (const match of normalized.matchAll(/\bquotes?\b([^.\n]{0,80})/g)) {
    const window = match[1] ?? "";
    for (let index = 0; index < quotes.length; index += 1) {
      const number = quotes[index]?.number ?? index + 1;
      const word = NUMBER_WORDS[number - 1];
      if (number > 0 && new RegExp(`(?<![\\dx])(?:#|no\\.?|number)?\\s*${number}\\b(?!\\s*x\\s*\\d)`).test(window)) {
        found.add(index);
      }
      if (word && new RegExp(`\\b${word}\\b`).test(window)) found.add(index);
    }
  }

  for (let index = 0; index < Math.min(quotes.length, ORDINALS.length); index += 1) {
    const number = index + 1;
    if (new RegExp(`\\b${ORDINALS[index]}\\s+quotes?\\b`).test(normalized)) found.add(index);
    if (new RegExp(`\\b${number}(?:st|nd|rd|th)\\s+quotes?\\b`).test(normalized)) found.add(index);
  }

  let remaining = normalized;
  const titles = quotes
    .map((quote, index) => ({ index, title: quote.title.trim().toLowerCase().replace(/×/g, "x") }))
    .filter((item) => item.title.length >= 3)
    .sort((a, b) => b.title.length - a.title.length);
  for (const item of titles) {
    if (!remaining.includes(item.title)) continue;
    found.add(item.index);
    remaining = remaining.replaceAll(item.title, " ");
  }

  const styles = quotes.map((quote) => styleName(quote.title));
  for (let index = 0; index < quotes.length; index += 1) {
    const style = styles[index];
    if (style.length < 3) continue;
    if (styles.filter((item) => item === style).length !== 1) continue;
    if (remaining.includes(style)) found.add(index);
  }

  const compact = normalized.replace(/(\d+)\s*x\s*(\d+)/g, "$1x$2");
  const sizes = quotes.map((quote) => sizeToken(quote.title));
  for (let index = 0; index < quotes.length; index += 1) {
    const size = sizes[index];
    if (!size) continue;
    if (sizes.filter((item) => item === size).length !== 1) continue;
    if (compact.includes(size)) found.add(index);
  }

  return quotes.filter((_, index) => found.has(index));
}

function styleName(title: string): string {
  return title.toLowerCase().replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function sizeToken(title: string): string {
  const match = title.toLowerCase().match(/\(([^)]+)\)/);
  if (!match) return "";
  return match[1].replace(/\s+/g, "").replace(/×/g, "x");
}
