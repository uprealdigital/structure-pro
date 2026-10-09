export function specValue(specs: { label: string; value: string }[], label: string): string {
  return specs.find((spec) => spec.label === label)?.value ?? "";
}

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}
