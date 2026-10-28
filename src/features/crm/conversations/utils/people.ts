import type { ConversationParticipant } from "@/src/features/crm/conversations/types";

function byName<T extends { fullName: string }>(left: T, right: T): number {
  return left.fullName.localeCompare(right.fullName, undefined, { sensitivity: "base" });
}

export function peopleMatchingName<T extends { id: string; fullName: string }>(
  people: T[],
  query: string,
  linkedIds: ReadonlySet<string>,
  primaryId: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase();
  const matching = needle
    ? people.filter((person) => person.fullName.toLocaleLowerCase().includes(needle))
    : people;
  const primary = matching.filter((person) => person.id === primaryId);
  const assigned = matching
    .filter((person) => person.id !== primaryId && linkedIds.has(person.id))
    .sort(byName);
  const others = matching
    .filter((person) => person.id !== primaryId && !linkedIds.has(person.id))
    .sort(byName);
  return [...primary, ...assigned, ...others];
}

export function dealPeople(
  participants: ConversationParticipant[],
  added: ConversationParticipant[],
  removedKeys: ReadonlySet<string>,
): ConversationParticipant[] {
  const kept = participants.filter(
    (person) => !removedKeys.has(`${person.dealId}:${person.customer.id}`),
  );
  const seen = new Set(kept.map((person) => `${person.dealId}:${person.customer.id}`));
  const extras = added.filter((person) => {
    const key = `${person.dealId}:${person.customer.id}`;
    if (removedKeys.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...kept, ...extras];
}
