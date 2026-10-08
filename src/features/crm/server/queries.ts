import "server-only";

import { readContact } from "@/src/features/crm/db/contact";
import { readConversation } from "@/src/features/crm/db/conversation";
import { readDeal } from "@/src/features/crm/db/deal";

export async function getContact(id: string) {
  return readContact(id);
}

export async function getDeal(id: string) {
  return readDeal(id);
}

export async function getConversation(key: string) {
  return readConversation(key);
}
