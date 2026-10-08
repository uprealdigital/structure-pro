export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export type AgentSession = {
  fullName: string;
  phone: string;
  email: string;
  chatId?: string;
  invoiceId: string;
  cpqQuoteId: string;
  crmDealId: string;
  crmContactId: string;
  specLines: string;
  total: number;
  brandName: string;
  messages: ChatMessage[];
  contractSent: boolean;
};

export type YardPreviewEvent = {
  at: string;
  step: string;
  detail?: string;
};

export type YardPreviewStatus = "accepted" | "emailed" | "failed";

export type YardPreview = {
  id: string;
  crmContactId: string;
  crmDealId: string;
  status: YardPreviewStatus;
  error: string | null;
};
