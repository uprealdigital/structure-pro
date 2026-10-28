"use client";

import { useMemo, useRef, useState } from "react";
import type { Customer } from "@/src/features/crm/common/types";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { listCustomers, setDealPerson } from "@/src/features/crm/conversations/server/actions";
import type { ConversationParticipant } from "@/src/features/crm/conversations/types";
import { dealPeople } from "@/src/features/crm/conversations/utils/people";

function personKey(dealId: string, customerId: string): string {
  return `${dealId}:${customerId}`;
}

export function useDealPeople({
  dealId,
  participants,
  lockedCustomerId,
}: {
  dealId: string;
  participants: ConversationParticipant[];
  lockedCustomerId: string;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<ConversationParticipant[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const loaded = useRef(false);
  const loadingRequest = useRef(false);
  const inflight = useRef(new Set<string>());
  const removedKeys = useMemo(() => new Set(removed), [removed]);
  const members = useMemo(
    () => dealPeople(participants, added, removedKeys),
    [participants, added, removedKeys],
  );

  async function load() {
    if (loaded.current || loadingRequest.current) return;
    loadingRequest.current = true;
    setLoading(true);
    setError("");
    const result = await listCustomers();
    loadingRequest.current = false;
    setLoading(false);
    if ("error" in result) {
      setError(copy.addPersonError);
      return;
    }
    loaded.current = true;
    setCustomers(result.data);
  }

  async function toggle(customerId: string) {
    const key = personKey(dealId, customerId);
    if (inflight.current.has(key)) return;
    const current = members.find(
      (person) => person.dealId === dealId && person.customer.id === customerId,
    );
    const included = Boolean(current);
    const onDeal = members.filter((person) => person.dealId === dealId);
    if (included && (current?.isPrimary || customerId === lockedCustomerId || onDeal.length <= 1)) return;
    const customer = customers.find((person) => person.id === customerId);
    if (!included && !customer) return;

    const fromServer = participants.some(
      (person) => person.dealId === dealId && person.customer.id === customerId,
    );
    inflight.current.add(key);
    setPendingId(customerId);
    setError("");
    if (included) {
      setRemoved((prev) => (prev.includes(key) ? prev : [...prev, key]));
      setAdded((prev) => prev.filter((person) => personKey(person.dealId, person.customer.id) !== key));
    } else if (customer) {
      setRemoved((prev) => prev.filter((item) => item !== key));
      setAdded((prev) => [
        ...prev.filter((person) => personKey(person.dealId, person.customer.id) !== key),
        { dealId, isPrimary: false, customer },
      ]);
    }

    const result = await setDealPerson({ dealId, customerId, included: !included });
    inflight.current.delete(key);
    setPendingId((value) => (value === customerId ? "" : value));
    if ("error" in result) {
      if (included) {
        setRemoved((prev) => prev.filter((item) => item !== key));
        if (!fromServer && current) {
          setAdded((prev) =>
            prev.some((person) => personKey(person.dealId, person.customer.id) === key)
              ? prev
              : [...prev, current],
          );
        }
      } else {
        setAdded((prev) => prev.filter((person) => personKey(person.dealId, person.customer.id) !== key));
      }
      setError(copy.addPersonError);
      return;
    }
    if (!included && result.data) {
      const saved = result.data;
      setAdded((prev) =>
        prev.map((person) => (personKey(person.dealId, person.customer.id) === key ? saved : person)),
      );
    }
  }

  return { customers, loading, error, pendingId, members, load, toggle };
}
