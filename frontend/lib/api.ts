const DEFAULT_API_BASE_URL = "http://localhost:8000";

export interface TemplateDetail {
  name: string;
  description: string;
  filename: string;
  content: string;
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = raw ? raw : DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/, "");
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
