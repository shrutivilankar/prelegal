import type { NdaFormData } from "@/lib/mnda";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

export interface TemplateSummary {
  name: string;
  description: string;
  filename: string;
}

export interface TemplateDetail extends TemplateSummary {
  content: string;
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = raw ? raw : DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/, "");
}

export async function fetchTemplates(): Promise<TemplateSummary[]> {
  const url = `${getApiBaseUrl()}/api/templates`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Template list request failed with status ${response.status}`);
  }
  const body = (await response.json()) as { templates: TemplateSummary[] };
  return body.templates;
}

export async function fetchTemplate(
  filename: string,
): Promise<TemplateDetail> {
  const url = `${getApiBaseUrl()}/api/templates/${encodeURIComponent(filename)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Template request failed with status ${response.status}: ${filename}`,
    );
  }
  return (await response.json()) as TemplateDetail;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatApiResponse {
  reply: string;
  nda_fields: Partial<NdaFormData>;
}

export class ChatRequestError extends Error {
  constructor(readonly status: number) {
    super(`Chat request failed with status ${status}`);
    this.name = "ChatRequestError";
  }
}

export async function sendChatMessage(
  messages: ChatMessage[],
): Promise<ChatApiResponse> {
  const url = `${getApiBaseUrl()}/api/chat`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    throw new ChatRequestError(response.status);
  }
  return (await response.json()) as ChatApiResponse;
}
